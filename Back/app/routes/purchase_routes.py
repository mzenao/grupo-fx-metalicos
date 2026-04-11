from flask import Blueprint, g, request

from app.middlewares.auth_middleware import login_required
from app.middlewares.role_middleware import roles_required
from app.services.purchase_service import (
	create_purchase,
	create_purchase_with_attachments,
	delete_purchase,
	get_purchase,
	list_purchases,
	list_purchases_for_supplier,
	update_purchase,
)
from app.services.resend_service import ResendService
from app.services.storage_service import resolve_attachment_source
from app.services.zapi_service import ZapiService
from app.utils.response import success_response


purchase_bp = Blueprint("purchases", __name__)
PORTAL_URL = "https://app.grupofxmetalicos.com.br/"


def _format_brl(value) -> str:
	try:
		number = float(value)
	except (TypeError, ValueError):
		number = 0.0
	formatted = f"{number:,.2f}"
	return formatted.replace(",", "X").replace(".", ",").replace("X", ".")


def _format_purchase_datetime(dt) -> str:
	if not dt:
		return "Data nao informada"
	return dt.strftime("%d/%m/%Y %H:%M")


def _build_portal_access_line() -> str:
	return f"Você pode acessar as informacoes da sua venda em nosso site: {PORTAL_URL}"


def _build_purchase_notification_message(purchase) -> str:
	supplier = purchase.supplier
	supplier_name = "Fornecedor"
	if supplier:
		supplier_name = supplier.name if supplier.is_pf else (supplier.company_name or supplier.name)

	value_text = _format_brl(purchase.value)
	date_text = _format_purchase_datetime(purchase.purchase_datetime)
	advance_abatement_value = float(getattr(purchase, "advance_abatement_value", 0) or 0)
	advance_remaining_after = float(getattr(purchase, "advance_remaining_after", 0) or 0)
	has_abatement = bool(getattr(purchase, "advance_id", None) and advance_abatement_value > 0)

	if has_abatement:
		return (
			f"Prezado(a), {supplier_name}.\n\n"
			"Grupo FX Metalicos informa que a operacao foi concluida com sucesso.\n\n"
			f"• Valor da venda: R$ {value_text}\n"
			f"• Valor abatido no adiantamento: R$ {_format_brl(advance_abatement_value)}\n"
			f"• Restante do adiantamento: R$ {_format_brl(advance_remaining_after)}\n"
			f"• Data: {date_text}\n\n"
			"Segue abaixo o(s) comprovante(s) referente(s) a transacao realizada:\n"
			"• Comprovante de pagamento\n"
			"• Ticket da balanca\n\n"
			f"{_build_portal_access_line()}\n\n"
			"Em caso de duvidas, permanecemos a disposicao.\n\n"
			"Atenciosamente,\n"
			"FX Metalicos"
		)

	return (
		f"Prezado(a), {supplier_name}.\n\n"
		"Grupo FX Metalicos informa que a operacao foi concluida com sucesso.\n\n"
		f"• Valor pago: R$ {value_text}\n"
		f"• Data: {date_text}\n\n"
		"Segue abaixo o(s) comprovante(s) referente(s) a transacao realizada:\n"
		"• Comprovante de pagamento\n"
		"• Ticket da balanca\n\n"
		f"{_build_portal_access_line()}\n\n"
		"Em caso de duvidas, permanecemos a disposicao.\n\n"
		"Atenciosamente,\n"
		"FX Metálicos"
	)


def _build_purchase_receipt_subject(purchase) -> str:
	return f"Comprovantes da compra #{purchase.id}"


def _get_purchase_supplier_email(purchase) -> str | None:
	supplier = purchase.supplier
	if not supplier:
		return None

	return getattr(supplier.user, "email", None) or supplier.to_dict().get("email")


def _build_email_attachments(purchase) -> list[dict]:
	attachments = []
	for attachment in purchase.attachments:
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


@purchase_bp.get("")
@login_required
@roles_required("admin", "employee", "supplier")
def list_purchases_route():
	current_user = getattr(g, "current_user", None)
	if current_user and current_user.role == "supplier":
		supplier = getattr(current_user, "supplier", None)
		if not supplier:
			raise ValueError("Supplier profile not found")
		return success_response("Purchases fetched successfully", list_purchases_for_supplier(supplier.id))
	return success_response("Purchases fetched successfully", list_purchases())


@purchase_bp.get("/<int:purchase_id>")
@login_required
@roles_required("admin", "employee", "supplier")
def get_purchase_route(purchase_id: int):
	return success_response("Purchase fetched successfully", get_purchase(purchase_id).to_dict())


@purchase_bp.post("")
@login_required
@roles_required("admin", "employee")
def create_purchase_route():
	payload = request.get_json(silent=True) or {}
	purchase = create_purchase(payload)
	return success_response("Purchase created successfully", purchase.to_dict(), 201)


@purchase_bp.post("/with-attachments")
@login_required
@roles_required("admin", "employee")
def create_purchase_with_attachments_route():
	payload = {
		"supplier_id": request.form.get("supplier_id"),
		"employee_id": request.form.get("employee_id"),
		"material_type_id": request.form.get("material_type_id"),
		"weight": request.form.get("weight"),
		"value": request.form.get("value"),
		"purchase_datetime": request.form.get("purchase_datetime"),
		"apply_advance": request.form.get("apply_advance"),
		"advance_id": request.form.get("advance_id"),
	}
	files = request.files.getlist("files")
	purchase = create_purchase_with_attachments(payload, files)
	return success_response("Purchase created successfully", purchase.to_dict(), 201)


@purchase_bp.put("/<int:purchase_id>")
@login_required
@roles_required("admin", "employee")
def update_purchase_route(purchase_id: int):
	payload = request.get_json(silent=True) or {}
	purchase = update_purchase(purchase_id, payload)
	return success_response("Purchase updated successfully", purchase.to_dict())


@purchase_bp.delete("/<int:purchase_id>")
@login_required
@roles_required("admin", "employee")
def delete_purchase_route(purchase_id: int):
	delete_purchase(purchase_id)
	return success_response("Purchase deleted successfully", None)


@purchase_bp.post("/<int:purchase_id>/send-comprovantes")
@login_required
@roles_required("admin", "employee")
def send_purchase_comprovantes_route(purchase_id: int):
	purchase = get_purchase(purchase_id)
	if not purchase.attachments:
		raise ValueError("Purchase has no attachments")

	supplier_phone = purchase.supplier.phone if purchase.supplier else None
	if not supplier_phone:
		raise ValueError("Supplier phone not found")

	zapi = ZapiService()
	resend = ResendService()
	message = _build_purchase_notification_message(purchase)
	supplier_email = _get_purchase_supplier_email(purchase)

	results = []
	
	# Send main notification message first
	results.append(
		zapi.send_text_message(
			phone=supplier_phone,
			message=message,
		)
	)
	
	# Send all attachments without caption
	for attachment in purchase.attachments:
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
			email_attachments = _build_email_attachments(purchase)
			resend.send_email_with_attachments(
				to_email=supplier_email,
				subject=_build_purchase_receipt_subject(purchase),
				body_text=message,
				attachments=email_attachments,
			)
			email_sent = True
		except Exception as exc:
			email_error = str(exc)

	return success_response(
		"Comprovantes enviados com sucesso",
		{
			"sent": len(results),
			"text_sent": True,
			"email_sent": email_sent,
			"email_error": email_error,
		},
		200,
	)

