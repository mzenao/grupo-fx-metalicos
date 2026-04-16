from __future__ import annotations

import re
import unicodedata

from app.utils.validators import normalize_digits, normalize_string


UF_CODES = {
	"AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
	"PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
}

STATE_NAME_TO_UF = {
	"acre": "AC",
	"alagoas": "AL",
	"amapa": "AP",
	"amazonas": "AM",
	"bahia": "BA",
	"ceara": "CE",
	"distrito federal": "DF",
	"espirito santo": "ES",
	"goias": "GO",
	"maranhao": "MA",
	"mato grosso": "MT",
	"mato grosso do sul": "MS",
	"minas gerais": "MG",
	"para": "PA",
	"paraiba": "PB",
	"parana": "PR",
	"pernambuco": "PE",
	"piaui": "PI",
	"rio de janeiro": "RJ",
	"rio grande do norte": "RN",
	"rio grande do sul": "RS",
	"rondonia": "RO",
	"roraima": "RR",
	"santa catarina": "SC",
	"sao paulo": "SP",
	"sergipe": "SE",
	"tocantins": "TO",
}


def _strip_accents(value: str) -> str:
	return "".join(ch for ch in unicodedata.normalize("NFD", value) if unicodedata.category(ch) != "Mn")


def normalize_state(value: str | None) -> str | None:
	state = normalize_string(value)
	if not state:
		return None
	upper_state = state.upper()
	if len(upper_state) == 2:
		if upper_state not in UF_CODES:
			raise ValueError("Estado inválido")
		return upper_state

	name_key = _strip_accents(state).lower()
	mapped = STATE_NAME_TO_UF.get(name_key)
	if not mapped:
		raise ValueError("Estado inválido: informe UF (ex.: MG) ou nome completo válido")
	return mapped


def normalize_cep(value: str | None) -> str | None:
	digits = normalize_digits(value)
	if not digits:
		return None
	if len(digits) != 8:
		raise ValueError("CEP inválido")
	return f"{digits[:5]}-{digits[5:]}"


def build_unified_address(
	*,
	rua: str | None,
	numero: str | None,
	bairro: str | None,
	cidade: str | None,
	estado: str | None,
	pais: str | None,
	cep: str | None,
) -> str:
	street = normalize_string(rua)
	number = normalize_string(numero)
	neighborhood = normalize_string(bairro)
	city = normalize_string(cidade)
	state = normalize_state(estado)
	country = normalize_string(pais)
	zip_code = normalize_cep(cep)

	missing = [
		("rua", street),
		("numero", number),
		("bairro", neighborhood),
		("cidade", city),
		("estado", state),
		("pais", country),
		("cep", zip_code),
	]
	missing_labels = [label for label, value in missing if not value]
	if missing_labels:
		raise ValueError(f"Campos de endereço obrigatórios ausentes: {', '.join(missing_labels)}")

	city_state = f"{city} - {state.upper()}"
	return f"{street}, {number} - {neighborhood} - {city_state} - {country} - {zip_code}"


def parse_unified_address(value: str | None) -> dict[str, str | None]:
	raw = normalize_string(value)
	if not raw:
		return {
			"rua": None,
			"numero": None,
			"bairro": None,
			"cidade": None,
			"estado": None,
			"pais": None,
			"cep": None,
		}

	pattern = re.compile(
		r"^(?P<rua>[^,]+),\s*(?P<numero>[^-]+)\s*-\s*(?P<bairro>[^-]+)\s*-\s*(?P<cidade>[^-]+)\s*-\s*(?P<estado>[A-Za-z]{2})\s*-\s*(?P<pais>[^-]+)\s*-\s*(?P<cep>\d{5}-?\d{3})$"
	)
	match = pattern.match(raw)
	if not match:
		return {
			"rua": None,
			"numero": None,
			"bairro": None,
			"cidade": None,
			"estado": None,
			"pais": None,
			"cep": None,
		}

	parsed = match.groupdict()
	return {
		"rua": normalize_string(parsed.get("rua")),
		"numero": normalize_string(parsed.get("numero")),
		"bairro": normalize_string(parsed.get("bairro")),
		"cidade": normalize_string(parsed.get("cidade")),
		"estado": normalize_string(parsed.get("estado")),
		"pais": normalize_string(parsed.get("pais")),
		"cep": normalize_cep(parsed.get("cep")),
	}
