import json
import re

from flask import Blueprint, g, request

from app.middlewares.auth_middleware import login_required
from app.middlewares.role_middleware import roles_required
from app.models.advance import Advance
from app.models.supplier import Supplier
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
from app.utils.security import verify_password


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


def _format_weight_kg(value) -> str:
	try:
		number = float(value)
	except (TypeError, ValueError):
		number = 0.0
	formatted = f"{number:,.3f}"
	return formatted.replace(",", "X").replace(".", ",").replace("X", ".")


def _parse_decimal_from_text(value: str) -> float | None:
	cleaned = re.sub(r"[^\d,.-]", "", str(value or "")).strip()
	if not cleaned:
		return None
	if "," in cleaned:
		cleaned = cleaned.replace(".", "").replace(",", ".")
	try:
		return float(cleaned)
	except ValueError:
		return None


def _format_material_line(name: str, weight, paid_value) -> str:
	return f"• {name}: {_format_weight_kg(weight)} kg | Valor pago: R$ {_format_brl(paid_value)}"


def _parse_extra_material_line(raw_material: str) -> str:
	parts = [part.strip() for part in str(raw_material or "").split(" - ") if part.strip()]
	if not parts:
		return ""

	name = parts[0]
	weight = _parse_decimal_from_text(parts[1]) if len(parts) > 1 else None
	impurity = _parse_decimal_from_text(parts[2]) if len(parts) > 2 else 0
	value_per_kg = _parse_decimal_from_text(parts[3]) if len(parts) > 3 else None
	total_value = _parse_decimal_from_text(parts[4]) if len(parts) > 4 else None

	if weight is None:
		return f"• {name}"

	if total_value is None:
		if value_per_kg is None:
			return f"• {name}"
		net_weight = weight * (1 - max(0, min(impurity or 0, 100)) / 100)
		total_value = net_weight * value_per_kg
	return _format_material_line(name, weight, total_value)


def _get_extra_materials(raw_extra: str | None) -> list[str]:
	raw = str(raw_extra or "").strip()
	if not raw.startswith("["):
		return []
	try:
		decoded = json.loads(raw)
	except (TypeError, ValueError, json.JSONDecodeError):
		return []
	if not isinstance(decoded, list):
		return []
	return [str(item).strip() for item in decoded if str(item).strip()]


def _build_purchase_materials_summary(purchase) -> str:
	main_material = purchase.material_type.label if purchase.material_type else "Material principal"
	lines = [_format_material_line(main_material, purchase.weight, purchase.value)]

	for extra_material in _get_extra_materials(getattr(purchase, "material_types_extra", None)):
		line = _parse_extra_material_line(extra_material)
		if line:
			lines.append(line)

	return "Materiais da compra:\n" + "\n".join(lines)


def _build_portal_access_line() -> str:
	return f"Você pode acessar as informacoes da sua venda em nosso site: {PORTAL_URL}"


def _get_supplier_advance_summary(supplier_id: int | None) -> dict:
	if not supplier_id:
		return {
			"total_advanced": 0.0,
			"total_debt": 0.0,
			"positive_balance": 0.0,
			"open_count": 0,
		}

	advances = Advance.query.filter(Advance.supplier_id == supplier_id).all()
	supplier = Supplier.query.get(supplier_id)
	total_advanced = sum(float(advance.value_total or 0) for advance in advances)
	total_debt = sum(float(advance.value_remaining or 0) for advance in advances)
	open_count = sum(
		1
		for advance in advances
		if str(getattr(advance, "status", "")).lower() == "pendente" and float(advance.value_remaining or 0) > 0
	)

	return {
		"total_advanced": total_advanced,
		"total_debt": total_debt,
		"positive_balance": float(getattr(supplier, "advance_credit_balance", 0) or 0),
		"open_count": open_count,
	}


def _build_purchase_notification_message(purchase) -> str:
	supplier = purchase.supplier
	supplier_name = "Fornecedor"
	if supplier:
		supplier_name = supplier.name if supplier.is_pf else (supplier.company_name or supplier.name)

	value_text = _format_brl(purchase.value)
	date_text = _format_purchase_datetime(purchase.purchase_datetime)
	materials_summary = _build_purchase_materials_summary(purchase)
	advance_abatement_value = float(getattr(purchase, "advance_abatement_value", 0) or 0)
	advance_applied_value = float(getattr(purchase, "advance_applied_value", advance_abatement_value) or 0)
	paid_value = max(float(purchase.value or 0) - advance_applied_value, 0)
	generated_value = max(advance_applied_value - advance_abatement_value, 0)
	advance_value_label = "Valor gerado" if generated_value > 0 else "Valor abatido"
	advance_value_for_message = generated_value if generated_value > 0 else advance_abatement_value
	advance_credit_after = float(getattr(purchase, "advance_credit_after", 0) or 0)
	has_advance_balance_change = advance_abatement_value > 0 or advance_credit_after > 0
	advance_summary = _get_supplier_advance_summary(getattr(purchase, "supplier_id", None))
	balance_line = (
		f"- Saldo positivo atual: R$ {_format_brl(advance_summary['positive_balance'])}\n"
		if advance_summary["total_debt"] <= 0 and advance_summary["positive_balance"] > 0
		else f"- Saldo devedor restante: R$ {_format_brl(advance_summary['total_debt'])}\n"
	)
	credit_line = f"- Saldo positivo gerado/atual: R$ {_format_brl(advance_credit_after)}\n" if advance_credit_after > 0 else ""

	if has_advance_balance_change:
		return (
			f"Prezado(a), {supplier_name}.\n\n"
			"Grupo FX Metalicos informa que a operacao foi concluida com sucesso.\n\n"
			f"• Valor da compra: R$ {value_text}\n"
			f"• Valor pago por kg: R$ {_format_brl(purchase.value_per_kg)}\n"
			f"• Peso total (kg): {_format_weight_kg(purchase.weight)}\n"
			f"{materials_summary}\n"
			f"• {advance_value_label} / Valor pago: R$ {_format_brl(advance_value_for_message)} / R$ {_format_brl(paid_value)}\n"
			f"{credit_line}"
			f"• Data: {date_text}\n\n"
			f"• Você possui {advance_summary['open_count']} adiantamento(s) em aberto.\n"
			
			f"{balance_line}\n"
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
		f"• Valor pago por kg: R$ {_format_brl(purchase.value_per_kg)}\n"
		f"• Peso total (kg): {_format_weight_kg(purchase.weight)}\n"
		f"{materials_summary}\n"
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


def _require_current_password_for_delete() -> None:
	payload = request.get_json(silent=True) or {}
	current_password = str(payload.get("current_password") or "").strip()
	current_user = getattr(g, "current_user", None)

	if not current_password:
		raise ValueError("Senha atual obrigatoria para exclusao")

	if not current_user or not verify_password(current_user.password_hash, current_password):
		raise ValueError("Senha atual invalida")


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
		"material_types_extra": request.form.get("material_types_extra"),
		"impurity_percentage": request.form.get("impurity_percentage"),
		"weight": request.form.get("weight"),
		"value": request.form.get("value"),
		"purchase_datetime": request.form.get("purchase_datetime"),
		"apply_advance": request.form.get("apply_advance"),
		"advance_value": request.form.get("advance_value"),
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
	_require_current_password_for_delete()
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
			if not email_attachments:
				raise ValueError("Nenhum comprovante resolvido para envio por e-mail")
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
