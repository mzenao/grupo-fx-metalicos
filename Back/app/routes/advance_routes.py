from decimal import Decimal

from flask import Blueprint, g, request
from sqlalchemy import func

from app.extensions import db
from app.middlewares.auth_middleware import login_required
from app.middlewares.role_middleware import roles_required
from app.models.advance import Advance
from app.services.resend_service import ResendService
from app.services.advance_service import (
	apply_pending_advance,
	create_advance,
	create_advance_with_attachments,
	delete_advance,
	get_advance,
	list_advances,
	list_advances_for_supplier,
	list_pending_advances_for_supplier,
	update_advance,
)
from app.services.storage_service import resolve_attachment_source
from app.services.zapi_service import ZapiService
from app.utils.security import verify_password
from app.utils.response import success_response


advance_bp = Blueprint("advances", __name__)
PORTAL_URL = "https://app.grupofxmetalicos.com.br/"


def _format_brl(value) -> str:
	try:
		number = float(value)
	except (TypeError, ValueError):
		number = 0.0
	formatted = f"{number:,.2f}"
	return formatted.replace(",", "X").replace(".", ",").replace("X", ".")


def _format_advance_datetime(dt) -> str:
	if not dt:
		return "Data nao informada"
	return dt.strftime("%d/%m/%Y %H:%M")


def _build_advance_notification_message(advance) -> str:
	supplier = advance.supplier
	supplier_name = "Fornecedor"
	if supplier:
		supplier_name = supplier.name if supplier.is_pf else (supplier.company_name or supplier.name)

	# Calcular total de adiantamentos pendentes para o fornecedor
	total_pending = Decimal("0.00")
	if supplier:
		result = db.session.query(func.sum(Advance.value_remaining)).filter(
			Advance.supplier_id == supplier.id,
			Advance.status == "pendente",
		).scalar()
		total_pending = result or Decimal("0.00")

	return (
		f"Prezado(a), {supplier_name}.\n\n"
		"Grupo FX Metálicos informa que seu adiantamento foi registrado com sucesso.\n\n"
		f"• Valor total do adiantamento: R$ {_format_brl(advance.value_total)}\n"
		f"• Saldo Devedor atual do adiantamento: R$ {_format_brl(advance.value_remaining)}\n"
		f"• Saldo Devedor Total dos adiantamentos pendentes: R$ {_format_brl(total_pending)}\n"
		f"• Status: {str(advance.status or 'pendente').capitalize()}\n"
		f"• Data: {_format_advance_datetime(advance.advance_datetime)}\n\n"
		"Segue abaixo o(s) comprovante(s) referente(s) ao adiantamento.\n\n"
		f"Você pode acessar as informacoes em nosso site: {PORTAL_URL}\n\n"
		"Em caso de duvidas, permanecemos a disposicao.\n\n"
		"Atenciosamente,\n"
		"FX Metálicos"
	)


def _build_advance_receipt_subject(advance) -> str:
	return f"Comprovantes do adiantamento #{advance.id}"


def _require_current_password_for_delete() -> None:
	payload = request.get_json(silent=True) or {}
	current_password = str(payload.get("current_password") or "").strip()
	current_user = getattr(g, "current_user", None)

	if not current_password:
		raise ValueError("Senha atual obrigatoria para exclusao")

	if not current_user or not verify_password(current_user.password_hash, current_password):
		raise ValueError("Senha atual invalida")


def _get_advance_supplier_email(advance) -> str | None:
	supplier = advance.supplier
	if not supplier:
		return None

	return getattr(supplier.user, "email", None) or supplier.to_dict().get("email")


def _build_email_attachments(advance) -> list[dict]:
	attachments = []
	for attachment in advance.attachments:
		resolved_source = resolve_attachment_source(attachment.file_path)
		if not resolved_source:
			continue
		attachments.append(
			{
				"file_name": attachment.file_name,
				"file_path": resolved_source,
				"mime_type": attachment.file_type,
			}
		)
	return attachments


@advance_bp.get("")
@login_required
@roles_required("admin", "employee", "supplier")
def list_advances_route():
	current_user = getattr(g, "current_user", None)
	if current_user and current_user.role == "supplier":
		supplier = getattr(current_user, "supplier", None)
		if not supplier:
			raise ValueError("Supplier profile not found")
		return success_response("Advances fetched successfully", list_advances_for_supplier(supplier.id))
	return success_response("Advances fetched successfully", list_advances())


@advance_bp.get("/pending")
@login_required
@roles_required("admin", "employee", "supplier")
def list_pending_advances_route():
	current_user = getattr(g, "current_user", None)
	supplier_id = request.args.get("supplier_id", type=int)

	if current_user and current_user.role == "supplier":
		supplier = getattr(current_user, "supplier", None)
		if not supplier:
			raise ValueError("Supplier profile not found")
		supplier_id = supplier.id

	if not supplier_id:
		raise ValueError("supplier_id is required")

	return success_response("Pending advances fetched successfully", list_pending_advances_for_supplier(supplier_id))


@advance_bp.get("/<int:advance_id>")
@login_required
@roles_required("admin", "employee", "supplier")
def get_advance_route(advance_id: int):
	advance = get_advance(advance_id)
	current_user = getattr(g, "current_user", None)
	if current_user and current_user.role == "supplier":
		supplier = getattr(current_user, "supplier", None)
		if not supplier or supplier.id != advance.supplier_id:
			raise ValueError("Advance not found")
	return success_response("Advance fetched successfully", advance.to_dict())


@advance_bp.post("")
@login_required
@roles_required("admin", "employee")
def create_advance_route():
	payload = request.get_json(silent=True) or {}
	advance = create_advance(payload)
	return success_response("Advance created successfully", advance.to_dict(), 201)


@advance_bp.post("/with-attachments")
@login_required
@roles_required("admin", "employee")
def create_advance_with_attachments_route():
	payload = {
		"supplier_id": request.form.get("supplier_id"),
		"employee_id": request.form.get("employee_id"),
		"value_total": request.form.get("value_total") or request.form.get("value"),
		"advance_datetime": request.form.get("advance_datetime") or request.form.get("data"),
	}
	files = request.files.getlist("files")
	advance = create_advance_with_attachments(payload, files)
	return success_response("Advance created successfully", advance.to_dict(), 201)


@advance_bp.put("/<int:advance_id>")
@login_required
@roles_required("admin", "employee")
def update_advance_route(advance_id: int):
	payload = request.get_json(silent=True) or {}
	advance = update_advance(advance_id, payload)
	return success_response("Advance updated successfully", advance.to_dict())


@advance_bp.delete("/<int:advance_id>")
@login_required
@roles_required("admin", "employee")
def delete_advance_route(advance_id: int):
	_require_current_password_for_delete()
	delete_advance(advance_id)
	return success_response("Advance deleted successfully", None)


@advance_bp.post("/<int:advance_id>/send-comprovantes")
@login_required
@roles_required("admin", "employee")
def send_advance_comprovantes_route(advance_id: int):
	advance = get_advance(advance_id)
	if not advance.attachments:
		raise ValueError("Advance has no attachments")

	supplier_phone = advance.supplier.phone if advance.supplier else None
	if not supplier_phone:
		raise ValueError("Supplier phone not found")

	zapi = ZapiService()
	resend = ResendService()
	message = _build_advance_notification_message(advance)
	supplier_email = _get_advance_supplier_email(advance)

	results = []
	results.append(
		zapi.send_text_message(
			phone=supplier_phone,
			message=message,
		)
	)

	for attachment in advance.attachments:
		resolved_source = resolve_attachment_source(attachment.file_path)
		results.append(
			zapi.send_document_message(
				phone=supplier_phone,
				file_path=resolved_source or "",
				file_name=attachment.file_name,
				caption=None,
			)
		)

	email_sent = False
	email_error = None
	if supplier_email:
		try:
			email_attachments = _build_email_attachments(advance)
			if not email_attachments:
				raise ValueError("Nenhum comprovante resolvido para envio por e-mail")
			resend.send_email_with_attachments(
				to_email=supplier_email,
				subject=_build_advance_receipt_subject(advance),
				body_text=message,
				attachments=email_attachments,
			)
			email_sent = True
		except Exception as exc:
			email_error = str(exc)

	return success_response(
		"Comprovantes de adiantamento enviados com sucesso",
		{
			"sent": len(results),
			"text_sent": True,
			"email_sent": email_sent,
			"email_error": email_error,
		},
		200,
	)
