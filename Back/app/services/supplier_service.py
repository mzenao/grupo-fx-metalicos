from __future__ import annotations

import json
from sqlalchemy import func

from app.extensions import db
from app.models.supplier import Supplier
from app.models.user import User
from app.services.user_service import create_user
from app.utils.address_utils import build_unified_address, normalize_cep, normalize_state, parse_unified_address
from app.utils.validators import (
	is_valid_email,
	is_valid_phone,
	is_valid_vehicle_plate,
	normalize_digits,
	normalize_string,
	validate_supplier_documents,
)


MAX_SUPPLIER_PLATES = 4
MAX_EXTRA_SUPPLIER_PLATES = 3
FOB_PLATE_VALUE = "FOB"


def _normalize_plate_value(value: str | None) -> str | None:
	plate = normalize_string(value)
	if not plate:
		return None
	return plate.replace(" ", "").upper()


def _is_truthy(value) -> bool:
	if isinstance(value, bool):
		return value
	if value is None:
		return False
	return str(value).strip().lower() in {"1", "true", "yes", "on", "sim", "s"}


def _is_fob_plate(plate: str | None) -> bool:
	return _normalize_plate_value(plate) == FOB_PLATE_VALUE


def _resolve_vehicle_plate_fields(payload: dict, current_plate: str | None = None, current_extra=None) -> tuple[str | None, list[str]]:
	raw_plate = payload.get("vehicle_plate", current_plate)
	plate = _normalize_plate_value(raw_plate)
	needs_fob = _is_truthy(payload.get("needs_fob")) or _is_truthy(payload.get("preciso_fob")) or _is_fob_plate(plate)
	if needs_fob:
		return FOB_PLATE_VALUE, []

	extra_source = payload.get("vehicle_plates_extra", current_extra)
	return plate, _parse_vehicle_plates_extra(extra_source)


def _parse_vehicle_plates_extra(raw_value) -> list[str]:
	if raw_value is None:
		return []

	if isinstance(raw_value, list):
		values = raw_value
	elif isinstance(raw_value, str):
		cleaned = raw_value.strip()
		if not cleaned:
			return []
		if cleaned.startswith("["):
			try:
				values = json.loads(cleaned)
			except (TypeError, ValueError, json.JSONDecodeError):
				return []
		else:
			return []
	else:
		return []

	parsed: list[str] = []
	for value in values:
		plate = _normalize_plate_value(value)
		if plate:
			parsed.append(plate)
	return parsed


def _normalize_unique_vehicle_plates(main_plate: str | None, extra_plates) -> tuple[str | None, list[str]]:
	normalized_main = _normalize_plate_value(main_plate)
	normalized_extra: list[str] = []
	seen: set[str] = set()

	for plate in _parse_vehicle_plates_extra(extra_plates):
		if plate == normalized_main:
			continue
		if plate in seen:
			continue
		seen.add(plate)
		normalized_extra.append(plate)

	if normalized_main and normalized_main in seen:
		normalized_extra = [plate for plate in normalized_extra if plate != normalized_main]

	if normalized_main and len([normalized_main, *normalized_extra]) > MAX_SUPPLIER_PLATES:
		raise ValueError("Quantidade máxima de placas excedida")

	if len(normalized_extra) > MAX_EXTRA_SUPPLIER_PLATES:
		raise ValueError("Quantidade máxima de placas adicionais excedida")

	return normalized_main, normalized_extra


def _serialize_vehicle_plates_extra(extra_plates: list[str]) -> str:
	return json.dumps(extra_plates, ensure_ascii=False)


def _validate_plate_format(plate: str | None) -> None:
	if _is_fob_plate(plate):
		return
	if not plate:
		raise ValueError("Placa do veículo é obrigatória")
	if not is_valid_vehicle_plate(plate):
		raise ValueError("Placa do veículo inválida")


def _validate_additional_plate_format(plate: str | None) -> None:
	if not plate:
		raise ValueError("Placa adicional inválida")
	if not is_valid_vehicle_plate(plate):
		raise ValueError("Placa adicional inválida")


def _validate_unique_supplier_plates(
	*,
	main_plate: str | None,
	extra_plates: list[str],
	exclude_supplier_id: int | None = None,
) -> None:
	all_plates = [plate for plate in [main_plate, *extra_plates] if plate and not _is_fob_plate(plate)]
	if not all_plates:
		return

	query = Supplier.query
	if exclude_supplier_id is not None:
		query = query.filter(Supplier.id != exclude_supplier_id)

	for supplier in query.all():
		other_plates: set[str] = set()
		other_main = _normalize_plate_value(supplier.vehicle_plate)
		if other_main and not _is_fob_plate(other_main):
			other_plates.add(other_main)
		for plate in _parse_vehicle_plates_extra(supplier.vehicle_plates_extra):
			other_plates.add(plate)

		for plate in all_plates:
			if plate in other_plates:
				raise ValueError(f"Placa já cadastrada: {plate}")


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


def _resolve_address_fields(payload: dict, supplier: Supplier | None = None) -> dict[str, str | None]:
	base = {
		"rua": normalize_string(getattr(supplier, "rua", None)),
		"numero": normalize_string(getattr(supplier, "numero", None)),
		"bairro": normalize_string(getattr(supplier, "bairro", None)),
		"cidade": normalize_string(getattr(supplier, "cidade", None)),
		"estado": normalize_string(getattr(supplier, "estado", None)),
		"pais": normalize_string(getattr(supplier, "pais", None)),
		"cep": normalize_string(getattr(supplier, "cep", None)),
	}

	legacy_reference = normalize_string(
		payload.get("reference_address")
		or payload.get("endereco_unificado")
		or getattr(supplier, "endereco_unificado", None)
		or getattr(supplier, "reference_address", None)
	)

	for field in ("rua", "numero", "bairro", "cidade", "estado", "pais", "cep"):
		if field in payload:
			base[field] = normalize_string(payload.get(field))

	if not all(base.values()) and legacy_reference:
		parsed = parse_unified_address(legacy_reference)
		for key, value in parsed.items():
			if not base.get(key) and value:
				base[key] = value

	base["estado"] = normalize_state(base.get("estado"))
	base["cep"] = normalize_cep(base.get("cep"))

	base["reference_address"] = build_unified_address(
		rua=base.get("rua"),
		numero=base.get("numero"),
		bairro=base.get("bairro"),
		cidade=base.get("cidade"),
		estado=base.get("estado"),
		pais=base.get("pais"),
		cep=base.get("cep"),
	)
	return base


def _next_supplier_code() -> int:
	max_code = db.session.query(func.max(Supplier.supplier_code)).scalar() or 0
	return max_code + 1


def _validate_unique_supplier_fields(
	*,
	cpf: str | None,
	cnpj: str | None,
	phone: str | None,
	plate: str | None,
	extra_plates: list[str] | None,
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

	if plate and not _is_fob_plate(plate):
		query = Supplier.query.filter(Supplier.vehicle_plate == plate)
		if exclude_supplier_id is not None:
			query = query.filter(Supplier.id != exclude_supplier_id)
		if query.first():
			raise ValueError("Placa já cadastrada")

	_validate_unique_supplier_plates(
		main_plate=plate,
		extra_plates=extra_plates or [],
		exclude_supplier_id=exclude_supplier_id,
	)

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
	plate, extra_plates = _resolve_vehicle_plate_fields(payload)
	email_from_payload = normalize_string(payload.get("email"))
	if not is_valid_phone(phone):
		raise ValueError("Telefone inválido")
	_validate_plate_format(plate)
	for extra_plate in extra_plates:
		_validate_additional_plate_format(extra_plate)
	if plate in extra_plates:
		raise ValueError("Placa principal não pode repetir nas adicionais")
	if len(set(extra_plates)) != len(extra_plates):
		raise ValueError("Placas adicionais duplicadas")
	if len(extra_plates) > MAX_EXTRA_SUPPLIER_PLATES:
		raise ValueError("Quantidade máxima de placas adicionais excedida")

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
			extra_plates=extra_plates,
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
			extra_plates=extra_plates,
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
	address_fields = _resolve_address_fields(payload)
	user.reference_address = address_fields["reference_address"]
	user.endereco_unificado = address_fields["reference_address"]
	user.rua = address_fields["rua"]
	user.numero = address_fields["numero"]
	user.bairro = address_fields["bairro"]
	user.cidade = address_fields["cidade"]
	user.estado = address_fields["estado"]
	user.pais = address_fields["pais"]
	user.cep = address_fields["cep"]

	supplier = Supplier(
		user_id=user.id,
		supplier_code=int(payload.get("supplier_code") or _next_supplier_code()),
		is_pf=is_pf,
		name=name,
		company_name=normalize_string(payload.get("company_name")),
		cpf=cpf,
		cnpj=cnpj,
		vehicle_plate=plate,
		vehicle_plates_extra=_serialize_vehicle_plates_extra(extra_plates),
		reference_address=address_fields["reference_address"],
		endereco_unificado=address_fields["reference_address"],
		rua=address_fields["rua"],
		numero=address_fields["numero"],
		bairro=address_fields["bairro"],
		cidade=address_fields["cidade"],
		estado=address_fields["estado"],
		pais=address_fields["pais"],
		cep=address_fields["cep"],
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
	plate, extra_plates = _resolve_vehicle_plate_fields(payload, supplier.vehicle_plate, supplier.vehicle_plates_extra)
	if not is_valid_phone(phone):
		raise ValueError("Telefone inválido")
	_validate_plate_format(plate)
	for extra_plate in extra_plates:
		_validate_additional_plate_format(extra_plate)
	if plate in extra_plates:
		raise ValueError("Placa principal não pode repetir nas adicionais")
	if len(set(extra_plates)) != len(extra_plates):
		raise ValueError("Placas adicionais duplicadas")
	if len(extra_plates) > MAX_EXTRA_SUPPLIER_PLATES:
		raise ValueError("Quantidade máxima de placas adicionais excedida")

	next_email = normalize_string(payload.get("email", supplier.user.email)) or supplier.user.email
	_validate_unique_supplier_fields(
		cpf=cpf,
		cnpj=cnpj,
		phone=phone,
		plate=plate,
		extra_plates=extra_plates,
		email=next_email,
		exclude_supplier_id=supplier.id,
		exclude_user_id=supplier.user_id,
	)

	supplier.is_pf = is_pf
	supplier.cpf = cpf
	supplier.cnpj = cnpj
	address_fields = _resolve_address_fields(payload, supplier)
	supplier.phone = phone
	supplier.vehicle_plate = plate
	supplier.vehicle_plates_extra = _serialize_vehicle_plates_extra(extra_plates)
	supplier.reference_address = address_fields["reference_address"]
	supplier.endereco_unificado = address_fields["reference_address"]
	supplier.user.reference_address = address_fields["reference_address"]
	supplier.user.endereco_unificado = address_fields["reference_address"]
	supplier.user.rua = address_fields["rua"]
	supplier.user.numero = address_fields["numero"]
	supplier.user.bairro = address_fields["bairro"]
	supplier.user.cidade = address_fields["cidade"]
	supplier.user.estado = address_fields["estado"]
	supplier.user.pais = address_fields["pais"]
	supplier.user.cep = address_fields["cep"]
	supplier.rua = address_fields["rua"]
	supplier.numero = address_fields["numero"]
	supplier.bairro = address_fields["bairro"]
	supplier.cidade = address_fields["cidade"]
	supplier.estado = address_fields["estado"]
	supplier.pais = address_fields["pais"]
	supplier.cep = address_fields["cep"]

	if "supplier_code" in payload:
		supplier.supplier_code = int(payload.get("supplier_code"))
	if "company_name" in payload:
		supplier.company_name = normalize_string(payload.get("company_name"))
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
