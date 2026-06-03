from __future__ import annotations

from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

from app.extensions import db
from app.models.advance import Advance
from app.models.advance_attachment import AdvanceAttachment
from app.models.employee import Employee
from app.models.supplier import Supplier
from app.services.storage_service import save_attachment_file
from app.utils.datetime_utils import parse_iso_datetime
from app.utils.file_utils import is_allowed_extension
from app.utils.validators import to_decimal, validate_non_negative_value


def _parse_int_field(value, field_name: str) -> int:
	try:
		return int(value)
	except (TypeError, ValueError):
		raise ValueError(f"{field_name} is required and must be an integer")


def _resolve_supplier_id(raw_supplier_ref) -> int:
	supplier_ref = _parse_int_field(raw_supplier_ref, "supplier_id")

	if Supplier.query.get(supplier_ref):
		return supplier_ref

	by_user = Supplier.query.filter(Supplier.user_id == supplier_ref).first()
	if by_user:
		return by_user.id

	by_code = Supplier.query.filter(Supplier.supplier_code == supplier_ref).first()
	if by_code:
		return by_code.id

	raise ValueError("Supplier not found")


def _validate_foreign_keys(supplier_id: int, employee_id: int) -> None:
	if not Supplier.query.get(supplier_id):
		raise ValueError("Supplier not found")
	if not Employee.query.get(employee_id):
		raise ValueError("Employee not found")


def _normalize_value(value: Decimal) -> Decimal:
	return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _apply_abatement_to_advance(advance: Advance, amount: Decimal) -> Advance:
	if amount <= 0:
		return advance

	current_remaining = _normalize_value(to_decimal(advance.value_remaining))
	abatement_amount = min(current_remaining, _normalize_value(amount))
	next_remaining = _normalize_value(current_remaining - abatement_amount)

	advance.value_remaining = next_remaining
	advance.status = "finalizado" if next_remaining <= 0 else "pendente"
	return advance


def list_advances() -> list[dict]:
	advances = Advance.query.order_by(Advance.id.desc()).all()
	return [advance.to_dict() for advance in advances]


def list_advances_for_supplier(supplier_id: int) -> list[dict]:
	advances = (
		Advance.query.filter(Advance.supplier_id == supplier_id)
		.order_by(Advance.id.desc())
		.all()
	)
	return [advance.to_dict() for advance in advances]


def list_pending_advances_for_supplier(supplier_id: int) -> list[dict]:
	advances = (
		Advance.query.filter(Advance.supplier_id == supplier_id, Advance.status == "pendente")
		.order_by(Advance.advance_datetime.asc(), Advance.id.asc())
		.all()
	)
	return [advance.to_dict() for advance in advances]


def get_advance(advance_id: int) -> Advance:
	advance = Advance.query.get(advance_id)
	if not advance:
		raise ValueError("Advance not found")
	return advance


def create_advance(payload: dict) -> Advance:
	value_total = to_decimal(payload.get("value_total") or payload.get("value"))
	if not validate_non_negative_value(value_total) or value_total <= 0:
		raise ValueError("Value must be greater than zero")

	supplier_id = _resolve_supplier_id(payload.get("supplier_id"))
	employee_id = _parse_int_field(payload.get("employee_id"), "employee_id")
	_validate_foreign_keys(supplier_id, employee_id)

	advance = Advance(
		supplier_id=supplier_id,
		employee_id=employee_id,
		value_total=_normalize_value(value_total),
		value_remaining=_normalize_value(value_total),
		advance_datetime=parse_iso_datetime(payload.get("advance_datetime") or payload.get("data")),
		status="pendente",
	)

	db.session.add(advance)
	db.session.commit()
	return advance


def create_advance_with_attachments(payload: dict, files: list) -> Advance:
	if not files:
		raise ValueError("At least one attachment is required")

	for file in files:
		if not file or not file.filename:
			raise ValueError("File is required")
		if not is_allowed_extension(file.filename):
			raise ValueError("File extension not allowed")

	value_total = to_decimal(payload.get("value_total") or payload.get("value"))
	if not validate_non_negative_value(value_total) or value_total <= 0:
		raise ValueError("Value must be greater than zero")

	supplier_id = _resolve_supplier_id(payload.get("supplier_id"))
	employee_id = _parse_int_field(payload.get("employee_id"), "employee_id")
	_validate_foreign_keys(supplier_id, employee_id)

	advance = Advance(
		supplier_id=supplier_id,
		employee_id=employee_id,
		value_total=_normalize_value(value_total),
		value_remaining=_normalize_value(value_total),
		advance_datetime=parse_iso_datetime(payload.get("advance_datetime") or payload.get("data")),
		status="pendente",
	)

	saved_paths: list[str] = []
	try:
		db.session.add(advance)
		db.session.flush()

		for file in files:
			_, file_path = save_attachment_file(file)
			saved_paths.append(file_path)
			attachment = AdvanceAttachment(
				advance_id=advance.id,
				file_name=file.filename,
				file_path=file_path,
				file_type=file.mimetype,
			)
			db.session.add(attachment)

		db.session.commit()
		return advance
	except Exception:
		db.session.rollback()
		for file_path in saved_paths:
			if file_path.startswith(("http://", "https://")):
				continue
			path = Path(file_path)
			if path.exists():
				path.unlink(missing_ok=True)
		raise


def apply_pending_advance(
	*,
	supplier_id: int,
	purchase_value: Decimal,
	advance_id: int | None = None,
	allow_positive_balance: bool = False,
) -> dict | None:
	if purchase_value <= 0:
		return None

	supplier = Supplier.query.get(supplier_id)
	if not supplier:
		raise ValueError("Supplier not found")

	query = Advance.query.filter(Advance.supplier_id == supplier_id, Advance.status == "pendente")
	if advance_id is not None:
		advances = query.filter(Advance.id == advance_id).order_by(Advance.advance_datetime.asc(), Advance.id.asc()).all()
		if not advances:
			raise ValueError("Pending advance not found")
	else:
		advances = query.order_by(Advance.advance_datetime.asc(), Advance.id.asc()).all()

	if not advances and not allow_positive_balance:
		return None

	remaining_to_cover = _normalize_value(purchase_value)
	total_abatement = Decimal("0.00")
	last_advance_id: int | None = None
	last_remaining_after = Decimal("0.00")
	applied_advance_ids: list[int] = []

	for advance in advances:
		if remaining_to_cover <= 0:
			break

		current_remaining = _normalize_value(to_decimal(advance.value_remaining))
		if current_remaining <= 0:
			continue

		abatement_amount = min(current_remaining, remaining_to_cover)
		next_remaining = _normalize_value(current_remaining - abatement_amount)

		advance.value_remaining = next_remaining
		advance.status = "finalizado" if next_remaining <= 0 else "pendente"

		remaining_to_cover = _normalize_value(remaining_to_cover - abatement_amount)
		total_abatement = _normalize_value(total_abatement + abatement_amount)
		last_advance_id = advance.id
		last_remaining_after = next_remaining
		applied_advance_ids.append(advance.id)

	credit_added = Decimal("0.00")
	if allow_positive_balance and remaining_to_cover > 0:
		credit_added = remaining_to_cover
		current_credit = _normalize_value(to_decimal(supplier.advance_credit_balance or 0))
		supplier.advance_credit_balance = _normalize_value(current_credit + credit_added)
		remaining_to_cover = Decimal("0.00")

	if total_abatement <= 0 and credit_added <= 0:
		return None

	db.session.flush()

	return {
		"advance_id": last_advance_id,
		"advance_ids": applied_advance_ids,
		"advance_abatement_value": total_abatement,
		"advance_remaining_after": last_remaining_after,
		"advance_credit_added": credit_added,
		"advance_credit_after": _normalize_value(to_decimal(supplier.advance_credit_balance or 0)),
		"purchase_remaining_after_advance": remaining_to_cover,
	}


def update_advance(advance_id: int, payload: dict) -> Advance:
	advance = get_advance(advance_id)

	supplier_id = _resolve_supplier_id(payload.get("supplier_id", advance.supplier_id))
	employee_id = _parse_int_field(payload.get("employee_id", advance.employee_id), "employee_id")
	_validate_foreign_keys(supplier_id, employee_id)

	value_total = to_decimal(payload.get("value_total", advance.value_total))
	if not validate_non_negative_value(value_total) or value_total <= 0:
		raise ValueError("Value must be greater than zero")

	old_value_total = _normalize_value(to_decimal(advance.value_total))
	new_value_total = _normalize_value(value_total)

	advance.supplier_id = supplier_id
	advance.employee_id = employee_id
	advance.value_total = new_value_total

	if "advance_datetime" in payload or "data" in payload:
		advance.advance_datetime = parse_iso_datetime(payload.get("advance_datetime") or payload.get("data"))

	if "status" in payload:
		status = str(payload.get("status") or "").strip().lower()
		if status not in {"pendente", "finalizado"}:
			raise ValueError("Invalid status")
		advance.status = status

	# Se o adiantamento está pendente (nunca foi usado), ajusta value_remaining junto com value_total
	if advance.status == "pendente":
		value_difference = _normalize_value(new_value_total - old_value_total)
		new_remaining = _normalize_value(to_decimal(advance.value_remaining) + value_difference)
		advance.value_remaining = max(new_remaining, Decimal("0.00"))
	elif advance.status == "finalizado":
		# Se finalizado, garante que value_remaining é 0
		advance.value_remaining = Decimal("0.00")

	db.session.commit()
	return advance


def delete_advance(advance_id: int) -> None:
	advance = get_advance(advance_id)
	db.session.delete(advance)
	db.session.commit()
