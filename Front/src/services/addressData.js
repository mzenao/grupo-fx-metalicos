export function normalizeCep(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 8);
  if (!digits) return "";
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function emptyAddressFields() {
  return {
    rua: "",
    numero: "",
    bairro: "",
    cidade: "",
    estado: "",
    pais: "Brasil",
    cep: "",
  };
}

export function parseAddressFromUnified(value) {
  const empty = emptyAddressFields();
  const raw = String(value || "").trim();
  if (!raw) return empty;

  const pattern = /^(.*?),\s*([^-]+?)\s*-\s*([^-]+?)\s*-\s*([^-]+?)\s*-\s*([A-Za-z]{2})\s*-\s*([^-]+?)\s*-\s*(\d{5}-?\d{3})$/;
  const match = raw.match(pattern);
  if (!match) {
    return {
      ...empty,
      rua: raw,
    };
  }

  return {
    rua: (match[1] || "").trim(),
    numero: (match[2] || "").trim(),
    bairro: (match[3] || "").trim(),
    cidade: (match[4] || "").trim(),
    estado: (match[5] || "").trim().toUpperCase(),
    pais: (match[6] || "").trim() || "Brasil",
    cep: normalizeCep(match[7] || ""),
  };
}

export function mergeAddressFields(primary, fallbackUnified) {
  const base = {
    ...emptyAddressFields(),
    ...(primary || {}),
  };

  const hasAllStructured = ["rua", "numero", "bairro", "cidade", "estado", "pais", "cep"]
    .every((key) => String(base[key] || "").trim());

  if (hasAllStructured) {
    return {
      ...base,
      cep: normalizeCep(base.cep),
      estado: String(base.estado || "").toUpperCase(),
    };
  }

  const parsed = parseAddressFromUnified(fallbackUnified);
  return {
    ...base,
    rua: base.rua || parsed.rua,
    numero: base.numero || parsed.numero,
    bairro: base.bairro || parsed.bairro,
    cidade: base.cidade || parsed.cidade,
    estado: String(base.estado || parsed.estado || "").toUpperCase(),
    pais: base.pais || parsed.pais || "Brasil",
    cep: normalizeCep(base.cep || parsed.cep),
  };
}
