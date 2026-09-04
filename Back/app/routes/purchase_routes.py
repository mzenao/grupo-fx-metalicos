import json
import re
from datetime import datetime

from flask import Blueprint, g, request

from app.middlewares.auth_middleware import login_required
from app.middlewares.role_middleware import roles_required
from app.extensions import db
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
	formatted = f"{number:,.2f}".rstrip("0").rstrip(".")
	localized = formatted.replace(",", "X").replace(".", ",").replace("X", ".")
	return f"{localized}KG"


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


def _format_percentage(value) -> str:
	try:
		number = float(value)
	except (TypeError, ValueError):
		number = 0.0
	formatted = f"{number:,.2f}".rstrip("0").rstrip(".")
	return formatted.replace(",", "X").replace(".", ",").replace("X", ".")


def _material_details(name: str, weight, impurity, paid_value, value_per_kg=None) -> dict:
	gross_weight = max(float(weight or 0), 0)
	impurity_percentage = max(0.0, min(float(impurity or 0), 100.0))
	net_weight = gross_weight * (1 - impurity_percentage / 100)
	paid = max(float(paid_value or 0), 0)
	quoted_value_per_kg = float(value_per_kg or 0)
	if quoted_value_per_kg <= 0 and net_weight > 0:
		quoted_value_per_kg = paid / net_weight
	gross_value = gross_weight * quoted_value_per_kg
	discount = max(gross_value - paid, 0)
	return {
		"name": name,
		"gross_weight": gross_weight,
		"impurity": impurity_percentage,
		"net_weight": net_weight,
		"value_per_kg": quoted_value_per_kg,
		"discount": discount,
		"paid_value": paid,
	}


def _format_material_line(details: dict) -> str:
	return (
		f"* {details['name']}:\n"
		f"  - Peso bruto: {_format_weight_kg(details['gross_weight'])}\n"
		f"  - Impureza: {_format_percentage(details['impurity'])}%\n"
		f"  - Peso líquido: {_format_weight_kg(details['net_weight'])}\n"
		f"  - Valor por kg: R$ {_format_brl(details['value_per_kg'])}\n"
		f"  - Valor líquido: R$ {_format_brl(details['paid_value'])}"
	)


def _parse_extra_material(raw_material: str) -> dict | None:
	parts = [part.strip() for part in str(raw_material or "").split(" - ") if part.strip()]
	if not parts:
		return None

	name = parts[0]
	weight = _parse_decimal_from_text(parts[1]) if len(parts) > 1 else None
	impurity = _parse_decimal_from_text(parts[2]) if len(parts) > 2 else 0
	value_per_kg = _parse_decimal_from_text(parts[3]) if len(parts) > 3 else None
	total_value = _parse_decimal_from_text(parts[4]) if len(parts) > 4 else None

	if weight is None:
		return _material_details(name, 0, impurity, total_value or 0, value_per_kg)

	if total_value is None:
		if value_per_kg is None:
			return _material_details(name, weight, impurity, 0, 0)
		net_weight = weight * (1 - max(0, min(impurity or 0, 100)) / 100)
		total_value = net_weight * value_per_kg
	return _material_details(name, weight, impurity, total_value, value_per_kg)


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


def _build_purchase_materials_summary(purchase) -> tuple[str, float]:
	main_material = purchase.material_type.label if purchase.material_type else "Material principal"
	main_details = _material_details(
		main_material,
		purchase.weight,
		getattr(purchase, "impurity_percentage", 0),
		purchase.value,
	)
	details = [main_details]

	for extra_material in _get_extra_materials(getattr(purchase, "material_types_extra", None)):
		extra_details = _parse_extra_material(extra_material)
		if extra_details:
			details.append(extra_details)

	lines = [_format_material_line(item) for item in details]
	total_gross_weight = sum(item["gross_weight"] for item in details)
	total_net_weight = sum(item["net_weight"] for item in details)
	total_paid = sum(item["paid_value"] for item in details)
	weighted_impurity = (
		(1 - total_net_weight / total_gross_weight) * 100
		if total_gross_weight > 0
		else 0
	)
	average_value_per_kg = total_paid / total_net_weight if total_net_weight > 0 else 0
	lines.append(_format_material_line({
		"name": "Totais",
		"gross_weight": total_gross_weight,
		"impurity": weighted_impurity,
		"net_weight": total_net_weight,
		"value_per_kg": average_value_per_kg,
		"paid_value": total_paid,
	}))
	return "Materiais da compra:\n" + "\n\n".join(lines), total_paid


def _build_portal_access_line() -> str:
	return f"Você pode acessar as informações da sua venda em nosso site: {PORTAL_URL}"


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

	date_text = _format_purchase_datetime(purchase.purchase_datetime)
	materials_summary, materials_total = _build_purchase_materials_summary(purchase)
	advance_abatement_value = float(getattr(purchase, "advance_abatement_value", 0) or 0)
	advance_applied_value = float(getattr(purchase, "advance_applied_value", advance_abatement_value) or 0)
	paid_value = max(materials_total - advance_applied_value, 0)
	generated_value = max(advance_applied_value - advance_abatement_value, 0)
	advance_credit_after = float(getattr(purchase, "advance_credit_after", 0) or 0)
	has_advance_balance_change = advance_applied_value > 0 or advance_abatement_value > 0 or generated_value > 0
	advance_summary = _get_supplier_advance_summary(getattr(purchase, "supplier_id", None))
	if advance_summary["total_debt"] > 0:
		balance_line = f"• Saldo devedor restante: R$ {_format_brl(advance_summary['total_debt'])}\n"
	elif advance_credit_after <= 0 and advance_summary["positive_balance"] > 0:
		balance_line = f"• Saldo positivo atual: R$ {_format_brl(advance_summary['positive_balance'])}\n"
	else:
		balance_line = ""
	advance_lines = ""
	if has_advance_balance_change:
		advance_lines = (
			f"• Valor abatido de adiantamentos: R$ {_format_brl(advance_abatement_value)}\n"
			f"• Saldo positivo gerado nesta compra: R$ {_format_brl(generated_value)}\n"
			f"• Valor pago após adiantamentos: R$ {_format_brl(paid_value)}\n"
			f"• Adiantamentos em aberto: {advance_summary['open_count']}\n"
			f"{balance_line}"
		)
		if advance_credit_after > 0:
			advance_lines += f"• Saldo positivo após a compra: R$ {_format_brl(advance_credit_after)}\n"

	attachment_names = [
		str(getattr(attachment, "file_name", "") or "").strip()
		for attachment in getattr(purchase, "attachments", [])
	]
	attachment_names = [name for name in attachment_names if name]
	attachments_summary = "\n".join(f"• {name}" for name in attachment_names) or "• Comprovante anexado"

	return (
		f"Prezado(a), {supplier_name}.\n\n"
		"O Grupo FX Metálicos informa que a operação foi concluída com sucesso.\n\n"
		f"{materials_summary}\n\n"
		f"{advance_lines}"
		f"• Data: {date_text}\n\n"
		"Arquivos referentes à transação:\n"
		f"{attachments_summary}\n\n"
		f"{_build_portal_access_line()}\n\n"
		"Em caso de dúvidas, permanecemos à disposição.\n\n"
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


def _build_email_attachments(source_attachments) -> list[dict]:
	attachments = []
	for attachment in source_attachments:
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
	is_first_send = purchase.receipts_notified_at is None
	whatsapp_pending = [item for item in purchase.attachments if item.whatsapp_sent_at is None]
	email_pending = [item for item in purchase.attachments if item.email_sent_at is None]

	results = []

	# The full purchase message is sent only once. Later sends contain only new files.
	if is_first_send:
		results.append(
			zapi.send_text_message(
				phone=supplier_phone,
				message=message,
			)
		)
		purchase.receipts_notified_at = datetime.utcnow()
		db.session.commit()

	for attachment in whatsapp_pending:
		resolved_source = resolve_attachment_source(attachment.file_path)
		results.append(
			zapi.send_document_message(
				phone=supplier_phone,
				file_path=resolved_source or "",
				file_name=attachment.file_name,
				caption=None,
			)
		)
		attachment.whatsapp_sent_at = datetime.utcnow()
		db.session.commit()

	email_sent = not email_pending
	email_error = None
	if supplier_email and email_pending:
		try:
			email_attachments = _build_email_attachments(email_pending)
			if not email_attachments:
				raise ValueError("Nenhum comprovante resolvido para envio por e-mail")
			resend.send_email_with_attachments(
				to_email=supplier_email,
				subject=_build_purchase_receipt_subject(purchase),
				# Resend rejects an empty body. A zero-width space satisfies validation
				# without showing a new message to the supplier.
				body_text=message if is_first_send else "\u200b",
				attachments=email_attachments,
			)
			for attachment in email_pending:
				attachment.email_sent_at = datetime.utcnow()
			db.session.commit()
			email_sent = True
		except Exception as exc:
			email_error = str(exc)
	elif not supplier_email:
		email_sent = False

	return success_response(
		"Comprovantes enviados com sucesso",
		{
			"sent": len(results),
			"attachments_sent": len(whatsapp_pending),
			"whatsapp_sent": True,
			"text_sent": is_first_send,
			"email_sent": email_sent,
			"email_error": email_error,
		},
		200,
	)
