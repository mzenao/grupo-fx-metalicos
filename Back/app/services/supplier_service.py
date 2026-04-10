from __future__ import annotations

from sqlalchemy import func

from app.extensions import db
from app.models.supplier import Supplier
from app.models.user import User
from app.services.user_service import create_user
from app.utils.validators import (
	is_valid_email,
	is_valid_phone,
	is_valid_vehicle_plate,
	normalize_digits,
	normalize_string,
	validate_supplier_documents,
)


def _normalize_pix_key_type(is_pf: bool, pix_key_type: str | None) -> str:
	allowed = {"cpf", "phone", "email", "random"} if is_pf else {"cnpj", "phone", "email", "random"}
	normalized = (pix_key_type or "").strip().lower()
	if not normalized:
		return "cpf" if is_pf else "cnpj"
	if normalized not in allowed:
		raise ValueError("Tipo de chave Pix inválido para o tipo de fornecedor")
	return normalized


def _resolve_pix_key_value(
	pix_key_type: str,
	*,
	cpf: str | None,
	cnpj: str | None,
	phone: str | None,
	email: str | None,
	pix_key_value: str | None,
) -> str:
	manual_value = normalize_string(pix_key_value)

	if pix_key_type == "cpf":
		if not cpf:
			raise ValueError("CPF é obrigatório para chave Pix do tipo CPF")
		return cpf
	if pix_key_type == "cnpj":
		if not cnpj:
			raise ValueError("CNPJ é obrigatório para chave Pix do tipo CNPJ")
		return cnpj
	if pix_key_type == "phone":
		value = manual_value or phone
		if not value or not is_valid_phone(value):
			raise ValueError("Telefone válido é obrigatório para chave Pix do tipo telefone")
		return value
	if pix_key_type == "email":
		if not manual_value or not is_valid_email(manual_value):
			raise ValueError("E-mail válido é obrigatório para chave Pix do tipo e-mail")
		return manual_value.lower()
	if pix_key_type == "random":
		if not manual_value:
			raise ValueError("Chave Pix aleatória é obrigatória")
		if len(manual_value) > 150:
			raise ValueError("Chave Pix aleatória muito longa")
		return manual_value
	raise ValueError("Tipo de chave Pix inválido")


def _next_supplier_code() -> int:
	max_code = db.session.query(func.max(Supplier.supplier_code)).scalar() or 0
	return max_code + 1


def _validate_unique_supplier_fields(
	*,
	cpf: str | None,
	cnpj: str | None,
	phone: str | None,
	plate: str | None,
	email: str | None,
	exclude_supplier_id: int | None = None,
	exclude_user_id: int | None = None,
) -> None:
	if cpf:
		query = Supplier.query.filter(Supplier.cpf == cpf)
		if exclude_supplier_id is not None:
			query = query.filter(Supplier.id != exclude_supplier_id)
		if query.first():
			raise ValueError("CPF já cadastrado")

	if cnpj:
		query = Supplier.query.filter(Supplier.cnpj == cnpj)
		if exclude_supplier_id is not None:
			query = query.filter(Supplier.id != exclude_supplier_id)
		if query.first():
			raise ValueError("CNPJ já cadastrado")

	if phone:
		query = Supplier.query.filter(Supplier.phone == phone)
		if exclude_supplier_id is not None:
			query = query.filter(Supplier.id != exclude_supplier_id)
		if query.first():
			raise ValueError("Telefone já cadastrado")

	if plate:
		query = Supplier.query.filter(Supplier.vehicle_plate == plate)
		if exclude_supplier_id is not None:
			query = query.filter(Supplier.id != exclude_supplier_id)
		if query.first():
			raise ValueError("Placa já cadastrada")

	if email:
		query = User.query.filter(User.email == email.lower())
		if exclude_user_id is not None:
			query = query.filter(User.id != exclude_user_id)
		if query.first():
			raise ValueError("E-mail já cadastrado")


def list_suppliers() -> list[dict]:
	suppliers = Supplier.query.order_by(Supplier.id.desc()).all()
	return [supplier.to_dict() for supplier in suppliers]


def get_supplier(supplier_id: int) -> Supplier:
	supplier = Supplier.query.get(supplier_id)
	if not supplier:
		raise ValueError("Fornecedor não encontrado")
	return supplier


def create_supplier(payload: dict) -> Supplier:
	is_pf = bool(payload.get("is_pf"))
	cpf = normalize_digits(payload.get("cpf"))
	cnpj = normalize_digits(payload.get("cnpj"))

	document_errors = validate_supplier_documents(is_pf=is_pf, cpf=cpf, cnpj=cnpj)
	if document_errors:
		raise ValueError(str(document_errors))

	phone = normalize_string(payload.get("phone"))
	plate = normalize_string(payload.get("vehicle_plate"))
	email_from_payload = normalize_string(payload.get("email"))
	if not is_valid_phone(phone):
		raise ValueError("Telefone inválido")
	if not is_valid_vehicle_plate(plate):
		raise ValueError("Placa do veículo inválida")

	user_id = payload.get("user_id")
	if user_id:
		user = User.query.get(user_id)
		if not user:
			raise ValueError("Usuário não encontrado")
		if user.role != "supplier":
			raise ValueError("O usuário deve ter perfil de fornecedor")
		if user.supplier:
			raise ValueError("Usuário já está vinculado a um fornecedor")
	else:
		_validate_unique_supplier_fields(
			cpf=cpf,
			cnpj=cnpj,
			phone=phone,
			plate=plate,
			email=email_from_payload,
		)
		user = create_user(
			email=payload.get("email", ""),
			password=payload.get("password", ""),
			role="supplier",
			is_active=bool(payload.get("is_active", True)),
		)

	email = normalize_string(payload.get("email")) or user.email
	if user_id:
		_validate_unique_supplier_fields(
			cpf=cpf,
			cnpj=cnpj,
			phone=phone,
			plate=plate,
			email=email,
			exclude_user_id=user.id,
		)
	pix_key_type = _normalize_pix_key_type(is_pf, normalize_string(payload.get("pix_key_type")))
	pix_key_value = _resolve_pix_key_value(
		pix_key_type,
		cpf=cpf,
		cnpj=cnpj,
		phone=phone,
		email=email,
		pix_key_value=payload.get("pix_key_value"),
	)

	name = normalize_string(payload.get("name"))
	if not name:
		raise ValueError("Nome é obrigatório")

	supplier = Supplier(
		user_id=user.id,
		supplier_code=int(payload.get("supplier_code") or _next_supplier_code()),
		is_pf=is_pf,
		name=name,
		company_name=normalize_string(payload.get("company_name")),
		cpf=cpf,
		cnpj=cnpj,
		vehicle_plate=plate,
		reference_address=normalize_string(payload.get("reference_address")),
		phone=phone,
		pix_key_type=pix_key_type,
		pix_key_value=pix_key_value,
	)

	db.session.add(supplier)
	db.session.commit()
	return supplier


def update_supplier(supplier_id: int, payload: dict) -> Supplier:
	supplier = get_supplier(supplier_id)

	is_pf = bool(payload.get("is_pf", supplier.is_pf))
	cpf = normalize_digits(payload.get("cpf", supplier.cpf))
	cnpj = normalize_digits(payload.get("cnpj", supplier.cnpj))
	document_errors = validate_supplier_documents(is_pf=is_pf, cpf=cpf, cnpj=cnpj)
	if document_errors:
		raise ValueError(str(document_errors))

	if "name" in payload:
		name = normalize_string(payload.get("name"))
		if not name:
			raise ValueError("Nome é obrigatório")
		supplier.name = name

	phone = normalize_string(payload.get("phone", supplier.phone))
	plate = normalize_string(payload.get("vehicle_plate", supplier.vehicle_plate))
	if not is_valid_phone(phone):
		raise ValueError("Telefone inválido")
	if not is_valid_vehicle_plate(plate):
		raise ValueError("Placa do veículo inválida")

	next_email = normalize_string(payload.get("email", supplier.user.email)) or supplier.user.email
	_validate_unique_supplier_fields(
		cpf=cpf,
		cnpj=cnpj,
		phone=phone,
		plate=plate,
		email=next_email,
		exclude_supplier_id=supplier.id,
		exclude_user_id=supplier.user_id,
	)

	supplier.is_pf = is_pf
	supplier.cpf = cpf
	supplier.cnpj = cnpj
	supplier.phone = phone
	supplier.vehicle_plate = plate

	if "supplier_code" in payload:
		supplier.supplier_code = int(payload.get("supplier_code"))
	if "company_name" in payload:
		supplier.company_name = normalize_string(payload.get("company_name"))
	if "reference_address" in payload:
		supplier.reference_address = normalize_string(payload.get("reference_address"))

	if "email" in payload:
		email = normalize_string(payload.get("email"))
		if email:
			supplier.user.email = email.lower()

	current_email = supplier.user.email
	pix_key_type = _normalize_pix_key_type(
		is_pf,
		normalize_string(payload.get("pix_key_type", supplier.pix_key_type)),
	)
	supplier.pix_key_type = pix_key_type
	supplier.pix_key_value = _resolve_pix_key_value(
		pix_key_type,
		cpf=supplier.cpf,
		cnpj=supplier.cnpj,
		phone=supplier.phone,
		email=current_email,
		pix_key_value=payload.get("pix_key_value", supplier.pix_key_value),
	)

	if "is_active" in payload:
		supplier.user.is_active = bool(payload.get("is_active"))

	db.session.commit()
	return supplier


def delete_supplier(supplier_id: int) -> None:
	supplier = get_supplier(supplier_id)
	user = supplier.user
	db.session.delete(supplier)
	if user:
		db.session.delete(user)
	db.session.commit()

