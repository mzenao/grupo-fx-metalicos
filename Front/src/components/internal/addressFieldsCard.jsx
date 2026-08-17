import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, MapPin, Loader2 } from "lucide-react";
import { normalizeCep } from "@/services/addressData";

const inputClassName = "w-full h-11 px-3 rounded-lg border border-[#d6ab4a]/50 bg-white outline-none focus:ring-2 focus:ring-[#d6ab4a]/30 focus:border-[#b8891f]";

export default function AddressFieldsCard({
  value,
  onChange,
  title = "Endereco",
  required = true,
  defaultExpanded = false,
  className = "",
  inputClassNameOverride = "",
  labelClassName = "block text-sm font-medium mb-1 text-[#4a3918]",
  inputRefs = {},
  invalidField = "",
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [loadingCep, setLoadingCep] = useState(false);

  const address = useMemo(() => ({
    rua: value?.rua || "",
    numero: value?.numero || "",
    bairro: value?.bairro || "",
    cidade: value?.cidade || "",
    estado: value?.estado || "",
    pais: value?.pais || "Brasil",
    cep: normalizeCep(value?.cep || ""),
  }), [value]);

  const setField = (field, fieldValue) => {
    onChange?.({
      ...address,
      [field]: fieldValue,
    });
  };

  const resolvedInputClassName = inputClassNameOverride || inputClassName;
  const classFor = (field, extra = "") => `${resolvedInputClassName} ${extra} ${
    invalidField === field ? "border-red-400 ring-2 ring-red-200" : ""
  }`;

  const fetchCep = async () => {
    const cepDigits = String(address.cep || "").replace(/\D/g, "");
    if (cepDigits.length !== 8) return;

    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
      const data = await response.json();
      if (data?.erro) return;

      onChange?.({
        ...address,
        rua: address.rua || data.logradouro || "",
        bairro: address.bairro || data.bairro || "",
        cidade: address.cidade || data.localidade || "",
        estado: String(address.estado || data.uf || "").toUpperCase(),
        pais: address.pais || "Brasil",
        cep: normalizeCep(cepDigits),
      });
    } catch {
      // Silencioso para nao interromper preenchimento manual.
    } finally {
      setLoadingCep(false);
    }
  };

  return (
    <div className={`rounded-xl border border-[#d6ab4a]/35 bg-[#f5e7c0]/20 ${className}`}>
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#7b6024]" />
          <span className="text-sm font-semibold text-[#4a3918]">{title}{required ? " *" : ""}</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-[#7b6024]" /> : <ChevronDown className="w-4 h-4 text-[#7b6024]" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-1">
            <label className={labelClassName}>CEP{required ? " *" : ""}</label>
            <div className="relative">
              <input
                ref={inputRefs.cep}
                required={required}
                type="text"
                placeholder="00000-000"
                value={address.cep}
                onChange={(e) => setField("cep", normalizeCep(e.target.value))}
                onBlur={fetchCep}
                className={classFor("cep", "pr-10")}
              />
              {loadingCep && <Loader2 className="w-4 h-4 animate-spin text-[#7b6024] absolute right-3 top-1/2 -translate-y-1/2" />}
            </div>
          </div>

          <div>
            <label className={labelClassName}>Rua{required ? " *" : ""}</label>
            <input
              ref={inputRefs.rua}
              required={required}
              type="text"
              placeholder="Rua"
              value={address.rua}
              onChange={(e) => setField("rua", e.target.value)}
              className={classFor("rua")}
            />
          </div>

          <div>
            <label className={labelClassName}>Numero{required ? " *" : ""}</label>
            <input
              ref={inputRefs.numero}
              required={required}
              type="text"
              placeholder="Numero"
              value={address.numero}
              onChange={(e) => setField("numero", e.target.value)}
              className={classFor("numero")}
            />
          </div>

          <div>
            <label className={labelClassName}>Bairro{required ? " *" : ""}</label>
            <input
              ref={inputRefs.bairro}
              required={required}
              type="text"
              placeholder="Bairro"
              value={address.bairro}
              onChange={(e) => setField("bairro", e.target.value)}
              className={classFor("bairro")}
            />
          </div>

          <div>
            <label className={labelClassName}>Cidade{required ? " *" : ""}</label>
            <input
              ref={inputRefs.cidade}
              required={required}
              type="text"
              placeholder="Cidade"
              value={address.cidade}
              onChange={(e) => setField("cidade", e.target.value)}
              className={classFor("cidade")}
            />
          </div>

          <div>
            <label className={labelClassName}>Estado{required ? " *" : ""}</label>
            <input
              ref={inputRefs.estado}
              required={required}
              type="text"
              maxLength={2}
              placeholder="UF"
              value={address.estado}
              onChange={(e) => setField("estado", String(e.target.value || "").toUpperCase())}
              className={classFor("estado")}
            />
          </div>

          <div>
            <label className={labelClassName}>Pais{required ? " *" : ""}</label>
            <input
              ref={inputRefs.pais}
              required={required}
              type="text"
              placeholder="Pais"
              value={address.pais}
              onChange={(e) => setField("pais", e.target.value)}
              className={classFor("pais")}
            />
          </div>
        </div>
      )}
    </div>
  );
}
