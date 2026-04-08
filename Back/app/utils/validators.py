from __future__ import annotations

import re
from decimal import Decimal, InvalidOperation


ALLOWED_ROLES = {"admin", "employee", "supplier"}


def normalize_digits(value: str | None) -> str | None:
	if value is None:
		return None
	digits = re.sub(r"\D", "", value)
	return digits or None


def normalize_string(value: str | None) -> str | None:
	if value is None:
		return None
	cleaned = value.strip()
	return cleaned or None


def is_valid_email(email: str) -> bool:
	return bool(re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email or ""))


def is_valid_phone(phone: str | None) -> bool:
	if not phone:
		return True
	return bool(re.fullmatch(r"^\+?[0-9\s\-()]{8,25}$", phone.strip()))


def is_valid_vehicle_plate(plate: str | None) -> bool:
	if not plate:
		return True
	compact = re.sub(r"\s+", "", plate.upper())
	return bool(re.fullmatch(r"^[A-Z]{3}[0-9][0-9A-Z][0-9]{2}$", compact))


def is_valid_role(role: str) -> bool:
	return role in ALLOWED_ROLES


def to_decimal(value: str | int | float | Decimal) -> Decimal:
	try:
		return Decimal(str(value))
	except (InvalidOperation, ValueError, TypeError) as exc:
		raise ValueError("Invalid decimal value") from exc


def validate_weight(weight: str | int | float | Decimal) -> bool:
	return to_decimal(weight) > 0


def validate_non_negative_value(value: str | int | float | Decimal) -> bool:
	return to_decimal(value) >= 0


def _validate_cpf_digits(cpf: str) -> bool:
	if len(cpf) != 11 or len(set(cpf)) == 1:
		return False

	for length in (9, 10):
		total = sum(int(cpf[i]) * ((length + 1) - i) for i in range(length))
		digit = ((total * 10) % 11) % 10
		if digit != int(cpf[length]):
			return False
	return True


def is_valid_cpf(cpf: str | None) -> bool:
	digits = normalize_digits(cpf)
	if digits is None:
		return False
	return _validate_cpf_digits(digits)


def _validate_cnpj_digits(cnpj: str) -> bool:
	if len(cnpj) != 14 or len(set(cnpj)) == 1:
		return False

	def calc_digit(base: str, factors: list[int]) -> int:
		total = sum(int(n) * f for n, f in zip(base, factors))
		remainder = total % 11
		return 0 if remainder < 2 else 11 - remainder

	d1 = calc_digit(cnpj[:12], [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
	d2 = calc_digit(cnpj[:12] + str(d1), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
	return cnpj.endswith(f"{d1}{d2}")


def is_valid_cnpj(cnpj: str | None) -> bool:
	digits = normalize_digits(cnpj)
	if digits is None:
		return False
	return _validate_cnpj_digits(digits)


def validate_supplier_documents(is_pf: bool, cpf: str | None, cnpj: str | None) -> dict[str, str]:
	errors: dict[str, str] = {}
	normalized_cpf = normalize_digits(cpf)
	normalized_cnpj = normalize_digits(cnpj)

	if normalized_cpf and normalized_cnpj:
		errors["document"] = "CPF and CNPJ cannot be provided together"
		return errors

	if is_pf:
		if not normalized_cpf:
			errors["cpf"] = "CPF is required for PF supplier"
		elif not is_valid_cpf(normalized_cpf):
			errors["cpf"] = "Invalid CPF"
		if normalized_cnpj:
			errors["cnpj"] = "CNPJ must be null for PF supplier"
	else:
		if not normalized_cnpj:
			errors["cnpj"] = "CNPJ is required for PJ supplier"
		elif not is_valid_cnpj(normalized_cnpj):
			errors["cnpj"] = "Invalid CNPJ"
		if normalized_cpf:
			errors["cpf"] = "CPF must be null for PJ supplier"

	return errors

