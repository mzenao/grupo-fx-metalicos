from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

from app.extensions import db
from app.services.advance_service import apply_pending_advance
from app.models.employee import Employee
from app.models.material_type import MaterialType
from app.models.purchase import Purchase
from app.models.purchase_attachment import PurchaseAttachment
from app.models.supplier import Supplier
from app.services.storage_service import save_attachment_file
from app.utils.datetime_utils import parse_iso_datetime
from app.utils.file_utils import is_allowed_extension
from app.utils.validators import to_decimal, validate_non_negative_value, validate_weight


def _calculate_value_per_kg(value: Decimal, weight: Decimal) -> Decimal:
	if weight <= 0:
		raise ValueError("Weight must be greater than zero")
	return (value / weight).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _parse_int_field(value, field_name: str) -> int:
	try:
		return int(value)
	except (TypeError, ValueError):
		raise ValueError(f"{field_name} is required and must be an integer")


def _resolve_supplier_id(raw_supplier_ref) -> int:
	supplier_ref = _parse_int_field(raw_supplier_ref, "supplier_id")

	# Preferred match: explicit supplier primary key.
	if Supplier.query.get(supplier_ref):
		return supplier_ref

	# Compatibility: allow passing user_id of supplier user.
	by_user = Supplier.query.filter(Supplier.user_id == supplier_ref).first()
	if by_user:
		return by_user.id

	# Compatibility: allow passing supplier_code used in some UIs.
	by_code = Supplier.query.filter(Supplier.supplier_code == supplier_ref).first()
	if by_code:
		return by_code.id

	raise ValueError("Supplier not found")


def list_purchases() -> list[dict]:
	purchases = Purchase.query.order_by(Purchase.id.desc()).all()
	return [purchase.to_dict() for purchase in purchases]


def list_purchases_for_supplier(supplier_id: int) -> list[dict]:
	purchases = (
		Purchase.query.filter(Purchase.supplier_id == supplier_id)
		.order_by(Purchase.id.desc())
		.all()
	)
	return [purchase.to_dict() for purchase in purchases]


def get_purchase(purchase_id: int) -> Purchase:
	purchase = Purchase.query.get(purchase_id)
	if not purchase:
		raise ValueError("Purchase not found")
	return purchase


def _validate_foreign_keys(supplier_id: int, employee_id: int, material_type_id: int) -> None:
	if not Supplier.query.get(supplier_id):
		raise ValueError("Supplier not found")
	if not Employee.query.get(employee_id):
		raise ValueError("Employee not found")
	if not MaterialType.query.get(material_type_id):
		raise ValueError("Material type not found")


def _is_truthy(value) -> bool:
	if isinstance(value, bool):
		return value
	if value is None:
		return False
	return str(value).strip().lower() in {"1", "true", "yes", "on", "sim", "s"}


def create_purchase(payload: dict) -> Purchase:
	weight = to_decimal(payload.get("weight"))
	value = to_decimal(payload.get("value"))
	if not validate_weight(weight):
		raise ValueError("Weight must be greater than zero")
	if not validate_non_negative_value(value):
		raise ValueError("Value must be greater than or equal to zero")

	supplier_id = _resolve_supplier_id(payload.get("supplier_id"))
	employee_id = _parse_int_field(payload.get("employee_id"), "employee_id")
	material_type_id = _parse_int_field(payload.get("material_type_id"), "material_type_id")
	_validate_foreign_keys(supplier_id, employee_id, material_type_id)

	advance_info = None
	if _is_truthy(payload.get("apply_advance")):
		advance_info = apply_pending_advance(
			supplier_id=supplier_id,
			purchase_value=value,
			advance_id=payload.get("advance_id"),
		)
		if not advance_info:
			raise ValueError("No pending advances available to apply for this supplier")

	value_per_kg = _calculate_value_per_kg(value=value, weight=weight)

	purchase = Purchase(
		supplier_id=supplier_id,
		employee_id=employee_id,
		material_type_id=material_type_id,
		advance_id=advance_info["advance_id"] if advance_info else None,
		weight=weight,
		value=value,
		value_per_kg=value_per_kg,
		advance_abatement_value=advance_info["advance_abatement_value"] if advance_info else Decimal("0.00"),
		advance_remaining_after=advance_info["advance_remaining_after"] if advance_info else Decimal("0.00"),
		purchase_datetime=parse_iso_datetime(payload.get("purchase_datetime")),
	)

	db.session.add(purchase)
	db.session.commit()
	return purchase


def create_purchase_with_attachments(payload: dict, files: list) -> Purchase:
	if not files:
		raise ValueError("At least one attachment is required")

	for file in files:
		if not file or not file.filename:
			raise ValueError("File is required")
		if not is_allowed_extension(file.filename):
			raise ValueError("File extension not allowed")

	weight = to_decimal(payload.get("weight"))
	value = to_decimal(payload.get("value"))
	if not validate_weight(weight):
		raise ValueError("Weight must be greater than zero")
	if not validate_non_negative_value(value):
		raise ValueError("Value must be greater than or equal to zero")

	supplier_id = _resolve_supplier_id(payload.get("supplier_id"))
	employee_id = _parse_int_field(payload.get("employee_id"), "employee_id")
	material_type_id = _parse_int_field(payload.get("material_type_id"), "material_type_id")
	_validate_foreign_keys(supplier_id, employee_id, material_type_id)

	advance_info = None
	if _is_truthy(payload.get("apply_advance")):
		advance_info = apply_pending_advance(
			supplier_id=supplier_id,
			purchase_value=value,
			advance_id=payload.get("advance_id"),
		)
		if not advance_info:
			raise ValueError("No pending advances available to apply for this supplier")

	purchase = Purchase(
		supplier_id=supplier_id,
		employee_id=employee_id,
		material_type_id=material_type_id,
		advance_id=advance_info["advance_id"] if advance_info else None,
		weight=weight,
		value=value,
		value_per_kg=_calculate_value_per_kg(value=value, weight=weight),
		advance_abatement_value=advance_info["advance_abatement_value"] if advance_info else Decimal("0.00"),
		advance_remaining_after=advance_info["advance_remaining_after"] if advance_info else Decimal("0.00"),
		purchase_datetime=parse_iso_datetime(payload.get("purchase_datetime")),
	)

	saved_paths: list[str] = []
	try:
		db.session.add(purchase)
		db.session.flush()

		for file in files:
			_, file_path = save_attachment_file(file)
			saved_paths.append(file_path)
			attachment = PurchaseAttachment(
				purchase_id=purchase.id,
				file_name=file.filename,
				file_path=file_path,
				file_type=file.mimetype,
			)
			db.session.add(attachment)

		db.session.commit()
		return purchase
	except Exception:
		db.session.rollback()
		for file_path in saved_paths:
			if file_path.startswith("http://") or file_path.startswith("https://"):
				continue
			path = Path(file_path)
			if path.exists():
				path.unlink(missing_ok=True)
		raise


def update_purchase(purchase_id: int, payload: dict) -> Purchase:
	purchase = get_purchase(purchase_id)

	supplier_id = _resolve_supplier_id(payload.get("supplier_id", purchase.supplier_id))
	employee_id = _parse_int_field(payload.get("employee_id", purchase.employee_id), "employee_id")
	material_type_id = _parse_int_field(payload.get("material_type_id", purchase.material_type_id), "material_type_id")
	_validate_foreign_keys(supplier_id, employee_id, material_type_id)

	weight = to_decimal(payload.get("weight", purchase.weight))
	value = to_decimal(payload.get("value", purchase.value))
	if not validate_weight(weight):
		raise ValueError("Weight must be greater than zero")
	if not validate_non_negative_value(value):
		raise ValueError("Value must be greater than or equal to zero")

	purchase.supplier_id = supplier_id
	purchase.employee_id = employee_id
	purchase.material_type_id = material_type_id
	purchase.weight = weight
	purchase.value = value
	purchase.value_per_kg = _calculate_value_per_kg(value=value, weight=weight)

	if "purchase_datetime" in payload:
		purchase.purchase_datetime = parse_iso_datetime(payload.get("purchase_datetime"))

	db.session.commit()
	return purchase


def delete_purchase(purchase_id: int) -> None:
	purchase = get_purchase(purchase_id)
	db.session.delete(purchase)
	db.session.commit()

