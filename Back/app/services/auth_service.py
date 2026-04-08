from __future__ import annotations

from datetime import datetime, timedelta

from flask import current_app

from app.extensions import db
from app.models.auth_token import AuthToken
from app.models.supplier import Supplier
from app.models.user import User
from app.services.supplier_service import (
	_normalize_pix_key_type,
	_resolve_pix_key_value,
	create_supplier,
)
from app.utils.security import hash_password, verify_password
from app.utils.validators import (
	is_valid_email,
	is_valid_phone,
	normalize_digits,
	normalize_string,
	validate_supplier_documents,
)
from app.utils.token import generate_raw_token, hash_token


def login(email: str, password: str) -> dict:
	user = User.query.filter_by(email=(email or "").strip().lower()).first()
	if not user or not verify_password(user.password_hash, password or ""):
		raise ValueError("Invalid email or password")

	if not user.is_active:
		raise ValueError("User is inactive")

	raw_token = generate_raw_token()
	token = AuthToken(
		user_id=user.id,
		token_hash=hash_token(raw_token),
		expires_at=datetime.utcnow() + timedelta(hours=current_app.config["TOKEN_EXPIRES_HOURS"]),
		revoked=False,
	)

	db.session.add(token)
	db.session.commit()

	return {
		"token": raw_token,
		"expires_at": token.expires_at.isoformat(),
		"user": user.to_dict(),
	}


def logout(token_record: AuthToken) -> None:
	token_record.revoked = True
	db.session.commit()


def get_me(user: User) -> dict:
	data = user.to_dict()
	supplier = user.supplier
	if supplier:
		data["supplier"] = {
			"id": supplier.id,
			"supplier_code": supplier.supplier_code,
			"is_pf": supplier.is_pf,
			"name": supplier.name,
			"company_name": supplier.company_name,
			"cpf": supplier.cpf,
			"cnpj": supplier.cnpj,
			"vehicle_plate": supplier.vehicle_plate,
			"reference_address": supplier.reference_address,
			"phone": supplier.phone,
			"pix_key_type": supplier.pix_key_type,
			"pix_key_value": supplier.pix_key_value,
		}
	return data


def register_supplier(payload: dict) -> dict:
	email = (payload.get("email") or "").strip().lower()
	password = payload.get("password") or ""

	create_supplier(payload)
	return login(email=email, password=password)


def update_me(user: User, payload: dict) -> dict:
	if user.role != "supplier" or not user.supplier:
		raise ValueError("Apenas fornecedores podem editar esta conta")

	supplier = user.supplier
	is_pf = bool(supplier.is_pf)

	document = normalize_digits(payload.get("document"))
	cpf = document if is_pf else None
	cnpj = None if is_pf else document
	document_errors = validate_supplier_documents(is_pf=is_pf, cpf=cpf, cnpj=cnpj)
	if document_errors:
		raise ValueError("CPF/CNPJ inexistente ou inválido")

	phone = normalize_string(payload.get("phone"))
	if not is_valid_phone(phone):
		raise ValueError("Telefone inválido")

	name_or_company = normalize_string(payload.get("name_or_company"))
	if not name_or_company:
		raise ValueError("Nome/Razão social é obrigatório")

	email = normalize_string(payload.get("email"))
	if not email or not is_valid_email(email):
		raise ValueError("E-mail inválido")
	email = email.lower()
	if User.query.filter(User.email == email, User.id != user.id).first():
		raise ValueError("E-mail já está em uso")

	pix_key_type = _normalize_pix_key_type(is_pf, normalize_string(payload.get("pix_key_type")))
	pix_key_value = _resolve_pix_key_value(
		pix_key_type,
		cpf=cpf,
		cnpj=cnpj,
		phone=phone,
		email=email,
	)

	new_password = payload.get("new_password") or ""
	if new_password:
		current_password = payload.get("current_password") or ""
		if not current_password:
			raise ValueError("Informe a senha atual para trocar a senha")
		if not verify_password(user.password_hash, current_password):
			raise ValueError("Senha atual incorreta")
		if len(new_password) < 6:
			raise ValueError("Nova senha deve ter ao menos 6 caracteres")
		if verify_password(user.password_hash, new_password):
			raise ValueError("Não pode trocar a senha para a mesma que já usa")

	if is_pf:
		supplier_with_same_doc = Supplier.query.filter(
			Supplier.cpf == cpf,
			Supplier.id != supplier.id,
		).first()
	else:
		supplier_with_same_doc = Supplier.query.filter(
			Supplier.cnpj == cnpj,
			Supplier.id != supplier.id,
		).first()
	if supplier_with_same_doc:
		raise ValueError("CPF/CNPJ já está em uso")

	if is_pf:
		supplier.name = name_or_company
		supplier.company_name = None
		supplier.cpf = cpf
		supplier.cnpj = None
	else:
		supplier.company_name = name_or_company
		supplier.name = name_or_company
		supplier.cnpj = cnpj
		supplier.cpf = None

	supplier.phone = phone
	supplier.reference_address = normalize_string(payload.get("reference_address"))
	supplier.pix_key_type = pix_key_type
	supplier.pix_key_value = pix_key_value
	user.email = email

	if new_password:
		user.password_hash = hash_password(new_password)

	db.session.commit()
	return get_me(user)

