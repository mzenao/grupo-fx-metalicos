import { createRef, useMemo, useState } from "react";
import { AlertTriangle, Check, Pencil, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { validarCPF, validarCNPJ } from "@/services/validators";
import { checkSupplierAvailability, registerSupplierAccount } from "@/services/authApi";
import AddressFieldsCard from "@/components/internal/addressFieldsCard";
import { emptyAddressFields } from "@/services/addressData";

const fieldLabelClass = "block text-sm font-medium mb-1 text-[#4a3918]";
const fieldInputClass = "w-full h-12 px-3 rounded-xl border border-[#d6ab4a]/35 bg-[#f5e7c0]/20 text-[#1e1608] placeholder-[#1e1608]/40 focus:outline-none focus:ring-2 focus:ring-[#b8891f]";

function formatCpfInput(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function formatCnpjInput(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function formatPixValue(pixKeyType, form) {
  const type = (pixKeyType || "").toLowerCase();
  const digits = (value) => String(value || "").replace(/\D/g, "");

  if (type === "cpf") {
    const cpf = digits(form.cpf).slice(0, 11);
    if (cpf.length !== 11) return "";
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }

  if (type === "cnpj") {
    const cnpj = digits(form.cnpj).slice(0, 14);
    if (cnpj.length !== 14) return "";
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }

  if (type === "phone") return form.pixKeyValue || "";
  if (type === "email") return form.pixKeyValue || "";
  if (type === "random") return form.pixKeyValue || "";
  return "";
}

function normalizePlate(value) {
  return String(value || "").replace(/\s+/g, "").toUpperCase();
}

function fieldForConflict(message) {
  const value = String(message || "").toLowerCase();
  if (value.includes("cpf")) return "cpf";
  if (value.includes("cnpj")) return "cnpj";
  if (value.includes("e-mail") || value.includes("email")) return "email";
  if (value.includes("telefone")) return "phone";
  if (value.includes("placa")) return "vehiclePlate";
  return "email";
}

function parseVehiclePlatesExtra(value) {
  if (Array.isArray(value)) {
    return value.map((plate) => normalizePlate(plate)).filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((plate) => normalizePlate(plate)).filter(Boolean);
        }
      } catch {
        return [];
      }
    }
  }

  return [];
}

export default function RegisterModal({ onClose, onSuccess }) {
  const initial = useMemo(() => ({
    personType: "PF",
    pixKeyType: "cpf",
    name: "",
    companyName: "",
    cpf: "",
    cnpj: "",
    vehiclePlate: "",
    needsFob: false,
    ...emptyAddressFields(),
    email: "",
    phone: "",
    pixKeyValue: "",
    vehiclePlatesExtra: [],
    extraPlateInput: "",
    password: "",
  }), []);

  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [error, setError] = useState("");
  const [isEditingPixKey, setIsEditingPixKey] = useState(false);
  const [pixKeyDraft, setPixKeyDraft] = useState("");
  const [invalidField, setInvalidField] = useState("");
  const [showPixConfirmation, setShowPixConfirmation] = useState(false);
  const fieldRefs = useMemo(() => Object.fromEntries([
    "name", "companyName", "cpf", "cnpj", "vehiclePlate", "email", "phone",
    "pixKeyType", "pixKeyValue", "password", "cep", "rua", "numero", "bairro",
    "cidade", "estado", "pais",
  ].map((field) => [field, createRef()])), []);
  const extraPlates = Array.isArray(form.vehiclePlatesExtra) ? form.vehiclePlatesExtra : [];
  const canAddExtra = extraPlates.length < 3;

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (invalidField === key) {
      setInvalidField("");
      setError("");
    }
  };

  const showFieldError = (field, message) => {
    setError(message);
    setInvalidField(field);
    if (field === "pixKeyValue" && ["phone", "email", "random"].includes(form.pixKeyType)) {
      setPixKeyDraft(form.pixKeyValue || "");
      setIsEditingPixKey(true);
    }
    window.requestAnimationFrame(() => {
      const element = fieldRefs[field]?.current;
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => element?.focus({ preventScroll: true }), 350);
    });
  };

  const invalidClass = (field) => invalidField === field
    ? "border-red-400 ring-2 ring-red-200 animate-[pulse_0.5s_ease-in-out_2]"
    : "";

  const handleAddExtraPlate = () => {
    if (form.needsFob) return;
    const nextPlate = normalizePlate(form.extraPlateInput);
    if (!nextPlate) {
      setError("Informe uma placa adicional.");
      return;
    }
    if (!canAddExtra) {
      setError("O limite de 3 placas adicionais foi atingido.");
      return;
    }
    if (nextPlate === normalizePlate(form.vehiclePlate)) {
      setError("A placa adicional não pode ser igual à principal.");
      return;
    }
    if (extraPlates.includes(nextPlate)) {
      setError("Essa placa adicional já foi adicionada.");
      return;
    }
    setError("");
    setForm((prev) => ({
      ...prev,
      vehiclePlatesExtra: [...(prev.vehiclePlatesExtra || []), nextPlate],
      extraPlateInput: "",
    }));
  };

  const handleRemoveExtraPlate = (plate) => {
    setForm((prev) => ({
      ...prev,
      vehiclePlatesExtra: (prev.vehiclePlatesExtra || []).filter((item) => item !== plate),
    }));
  };

  const handleTypeChange = (nextType) => {
    setForm((prev) => ({
      ...prev,
      personType: nextType,
      pixKeyType: nextType === "PF" ? "cpf" : "cnpj",
      pixKeyValue: "",
      name: nextType === "PF" ? prev.name : "",
      cpf: nextType === "PF" ? prev.cpf : "",
      companyName: nextType === "PJ" ? prev.companyName : "",
      cnpj: nextType === "PJ" ? prev.cnpj : "",
    }));
    setIsEditingPixKey(false);
    setPixKeyDraft("");
  };

  const handlePixTypeChange = (nextType) => {
    setForm((prev) => ({
      ...prev,
      pixKeyType: nextType,
      pixKeyValue:
        nextType === "phone"
          ? prev.phone || ""
          : nextType === "email"
            ? prev.email || ""
            : nextType === "cpf"
            ? prev.cpf || ""
            : nextType === "cnpj"
              ? prev.cnpj || ""
              : "",
    }));
    setIsEditingPixKey(false);
    setPixKeyDraft("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInvalidField("");

    if (form.personType === "PF" && !form.name.trim()) {
      return showFieldError("name", "Nome é obrigatório para pessoa física.");
    }

    if (form.personType === "PJ" && !form.companyName.trim()) {
      return showFieldError("companyName", "Nome da empresa é obrigatório para pessoa jurídica.");
    }

    if (form.personType === "PF" && !form.cpf.trim()) {
      return showFieldError("cpf", "CPF é obrigatório para pessoa física.");
    }

    if (form.personType === "PF" && !validarCPF(form.cpf)) {
      return showFieldError("cpf", "CPF inválido.");
    }

    if (form.personType === "PJ" && !form.cnpj.trim()) {
      return showFieldError("cnpj", "CNPJ é obrigatório para pessoa jurídica.");
    }

    if (form.personType === "PJ" && !validarCNPJ(form.cnpj)) {
      return showFieldError("cnpj", "CNPJ inválido.");
    }

    if (!form.needsFob && !form.vehiclePlate.trim()) {
      return showFieldError("vehiclePlate", "Placa do veículo é obrigatória.");
    }

    const normalizedMainPlate = form.needsFob ? "FOB" : normalizePlate(form.vehiclePlate);
    const normalizedExtraPlates = form.needsFob ? [] : (form.vehiclePlatesExtra || []).map((plate) => normalizePlate(plate)).filter(Boolean);
    if (normalizedExtraPlates.length > 3) {
      setError("O limite de 3 placas adicionais foi atingido.");
      return;
    }
    if (normalizedExtraPlates.includes(normalizedMainPlate)) {
      setError("A placa principal não pode se repetir nas adicionais.");
      return;
    }
    if (new Set([normalizedMainPlate, ...normalizedExtraPlates]).size !== 1 + normalizedExtraPlates.length) {
      setError("Não é permitido cadastrar placas duplicadas.");
      return;
    }

    if (!form.email.trim()) {
      return showFieldError("email", "Email é obrigatório.");
    }

    if (!form.phone.trim()) {
      return showFieldError("phone", "Telefone é obrigatório.");
    }

    if (form.pixKeyType === "phone" && !form.pixKeyValue.trim()) {
      return showFieldError("pixKeyValue", "Informe a chave Pix do tipo telefone.");
    }

    if (!form.password || form.password.length < 6) {
      return showFieldError("password", "A senha precisa ter no mínimo 6 caracteres.");
    }

    const allowedPixTypes = form.personType === "PF" ? ["cpf", "phone", "email", "random"] : ["cnpj", "phone", "email", "random"];
    if (!allowedPixTypes.includes(form.pixKeyType)) {
      return showFieldError("pixKeyType", "Selecione uma opção válida para chave Pix.");
    }

    if (["email", "random"].includes(form.pixKeyType) && !form.pixKeyValue.trim()) {
      return showFieldError("pixKeyValue", "Informe a chave Pix para o tipo selecionado.");
    }

    const requiredAddressFields = ["cep", "rua", "numero", "bairro", "cidade", "estado", "pais"];
    const missingAddress = requiredAddressFields.find((field) => !String(form[field] || "").trim());
    if (missingAddress) {
      return showFieldError(missingAddress, `Preencha o campo ${missingAddress === "cep" ? "CEP" : missingAddress}.`);
    }

    setCheckingAvailability(true);
    try {
      await checkSupplierAvailability({
        is_pf: form.personType === "PF",
        cpf: form.personType === "PF" ? form.cpf : null,
        cnpj: form.personType === "PJ" ? form.cnpj : null,
        email: form.email,
        phone: form.phone,
        vehicle_plate: normalizedMainPlate,
        needs_fob: Boolean(form.needsFob),
        vehicle_plates_extra: JSON.stringify(normalizedExtraPlates),
      });
      setShowPixConfirmation(true);
    } catch (err) {
      showFieldError(fieldForConflict(err?.message), err?.message || "Já existe um usuário com estes dados.");
    } finally {
      setCheckingAvailability(false);
    }
  };

  const createAccount = async () => {
    setShowPixConfirmation(false);
    const normalizedMainPlate = form.needsFob ? "FOB" : normalizePlate(form.vehiclePlate);
    const normalizedExtraPlates = form.needsFob ? [] : (form.vehiclePlatesExtra || []).map((plate) => normalizePlate(plate)).filter(Boolean);

    setSaving(true);
    try {
      const user = await registerSupplierAccount({
        is_pf: form.personType === "PF",
        name: form.personType === "PF" ? form.name : form.companyName,
        company_name: form.personType === "PJ" ? form.companyName : null,
        cpf: form.personType === "PF" ? form.cpf : null,
        cnpj: form.personType === "PJ" ? form.cnpj : null,
        vehicle_plate: normalizedMainPlate,
        needs_fob: Boolean(form.needsFob),
        vehicle_plates_extra: JSON.stringify(normalizedExtraPlates),
        rua: form.rua,
        numero: form.numero,
        bairro: form.bairro,
        cidade: form.cidade,
        estado: form.estado,
        pais: form.pais,
        cep: form.cep,
        email: form.email,
        phone: form.phone,
        pix_key_type: form.pixKeyType,
        pix_key_value: form.pixKeyValue || null,
        password: form.password,
      });
      onSuccess?.(user);
      onClose();
    } catch (err) {
      setError(
        err?.message ||
          "Nao foi possivel concluir cadastro no momento."
      );
    } finally {
      setSaving(false);
    }
  };

  const pixValue = formatPixValue(form.pixKeyType, form);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#1e1608]/60 backdrop-blur-[2px]" onClick={onClose} />

      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl border border-[#1e1608]/60 bg-[#fffdf8] shadow-2xl shadow-[#1e1608]/20"
        >
          <div className="bg-gradient-to-r from-[#1e1608] to-[#2b2010] rounded-t-3xl border-b border-[#d6ab4a]/30 flex items-center justify-between p-6 z-40">
            <h2 className="text-xl font-bold text-[#f5e7c0]">Criar Conta</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-[#f5e7c0]/80 hover:bg-[#d6ab4a]/20 hover:text-[#f5e7c0]"
              aria-label="Fechar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form noValidate onSubmit={handleSubmit} className="modal-scrollbar max-h-[calc(90vh-88px)] space-y-5 overflow-y-auto rounded-b-3xl bg-[#fffdf8] p-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium text-[#4a3918]">Tipo de Conta</p>
              <div className="w-full sm:w-[280px] bg-[#f5e7c0]/45 border border-[#d6ab4a]/35 rounded-xl p-1.5">
                <div className="relative grid grid-cols-2">
                  <motion.span
                    layout
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                    className="absolute top-0 bottom-0 w-1/2 rounded-lg bg-gradient-to-r from-[#b8891f] to-[#d6ab4a]"
                    style={{ left: form.personType === "PF" ? "0%" : "50%" }}
                  />
                  <button
                    type="button"
                    onClick={() => handleTypeChange("PF")}
                    className={`relative z-10 h-10 rounded-lg text-sm font-semibold transition-colors ${
                      form.personType === "PF" ? "text-white" : "text-[#7b6024]"
                    }`}
                  >
                    Pessoa Física
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange("PJ")}
                    className={`relative z-10 h-10 rounded-lg text-sm font-semibold transition-colors ${
                      form.personType === "PJ" ? "text-white" : "text-[#7b6024]"
                    }`}
                  >
                    Pessoa Jurídica
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {form.personType === "PF" && (
                <Field label="Nome Completo *">
                  <input
                    ref={fieldRefs.name}
                    type="text"
                    placeholder="Nome Completo"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    className={`${fieldInputClass} ${invalidClass("name")}`}
                  />
                </Field>
              )}

              {form.personType === "PJ" && (
                <Field label="Nome da Empresa *">
                  <input
                    ref={fieldRefs.companyName}
                    type="text"
                    placeholder="Nome da Empresa"
                    value={form.companyName}
                    onChange={(e) => set("companyName", e.target.value)}
                    className={`${fieldInputClass} ${invalidClass("companyName")}`}
                  />
                </Field>
              )}

              {form.personType === "PF" && (
                <Field label="CPF *">
                  <input
                    ref={fieldRefs.cpf}
                    type="text"
                    placeholder="CPF"
                    value={form.cpf}
                    onChange={(e) => set("cpf", formatCpfInput(e.target.value))}
                    className={`${fieldInputClass} ${invalidClass("cpf")}`}
                  />
                </Field>
              )}

              {form.personType === "PJ" && (
                <Field label="CNPJ *">
                  <input
                    ref={fieldRefs.cnpj}
                    type="text"
                    placeholder="CNPJ"
                    value={form.cnpj}
                    onChange={(e) => set("cnpj", formatCnpjInput(e.target.value))}
                    className={`${fieldInputClass} ${invalidClass("cnpj")}`}
                  />
                </Field>
              )}

              <div className="md:col-span-2 space-y-3">
                <label className="inline-flex items-start gap-2 rounded-xl border border-[#d6ab4a]/35 bg-[#f5e7c0]/25 px-3 py-2 text-sm font-semibold text-[#4a3918]">
                  <input
                    type="checkbox"
                    checked={Boolean(form.needsFob)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setForm((prev) => ({
                        ...prev,
                        needsFob: checked,
                        vehiclePlate: checked ? "FOB" : "",
                        vehiclePlatesExtra: checked ? [] : prev.vehiclePlatesExtra,
                        extraPlateInput: "",
                      }));
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-[#d6ab4a] accent-[#b8891f]"
                  />
                  <span className="leading-tight">
                    <span className="block">Preciso de Caçamba</span>
                    <span className="block text-xs font-medium text-[#7b6024]">
                      Para quem precisa que transporte a sucata.
                    </span>
                  </span>
                </label>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div className="md:col-span-2">
                    <Field label={`Placa do Veículo ${form.needsFob ? "" : "*"}`}>
                      <input
                        ref={fieldRefs.vehiclePlate}
                        type="text"
                        disabled={form.needsFob}
                        placeholder="Placa do Veículo"
                        value={form.vehiclePlate}
                        onChange={(e) => set("vehiclePlate", normalizePlate(e.target.value))}
                        className={`${fieldInputClass} ${invalidClass("vehiclePlate")} disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500`}
                      />
                    </Field>
                  </div>

                  <div className="md:col-span-1">
                    <Field label="Placa adicional">
                      <input
                        type="text"
                        placeholder="Digite a placa adicional"
                        value={form.extraPlateInput}
                        onChange={(e) => set("extraPlateInput", normalizePlate(e.target.value))}
                        disabled={form.needsFob}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddExtraPlate();
                          }
                        }}
                        className={`${fieldInputClass} disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500`}
                      />
                    </Field>
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium mb-1 text-[#4a3918] opacity-0 select-none">Adicionar</label>
                    <Button
                      type="button"
                      onClick={handleAddExtraPlate}
                      disabled={form.needsFob || !form.extraPlateInput.trim() || !canAddExtra}
                      className="w-full h-12 bg-[#b8891f] text-white hover:brightness-105 disabled:opacity-50"
                    >
                      Adicionar
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {extraPlates.map((plate) => (
                    <span key={plate} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f5e7c0] text-[#4a3918] text-sm font-semibold border border-[#d6ab4a]/40">
                      {plate}
                      <button
                        type="button"
                        onClick={() => handleRemoveExtraPlate(plate)}
                        className="text-[#7b6024] hover:text-[#1e1608]"
                        aria-label={`Remover placa ${plate}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <p className="text-xs text-[#7b6024]">Máximo de 3 placas adicionais. A placa principal fica separada.</p>
              </div>

              <Field label="Email *">
                <input
                  ref={fieldRefs.email}
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  className={`${fieldInputClass} ${invalidClass("email")}`}
                />
              </Field>

              <Field label="Telefone *">
                <input
                  ref={fieldRefs.phone}
                  type="tel"
                  placeholder="Telefone"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  className={`${fieldInputClass} ${invalidClass("phone")}`}
                />
              </Field>

              <Field label="Tipo da chave Pix *">
                <select
                  ref={fieldRefs.pixKeyType}
                  required
                  value={form.pixKeyType}
                  onChange={(e) => {
                    handlePixTypeChange(e.target.value);
                  }}
                  className={`${fieldInputClass} ${invalidClass("pixKeyType")}`}
                >
                  {form.personType === "PF" ? (
                    <>
                      <option value="cpf">CPF</option>
                      <option value="phone">Telefone</option>
                      <option value="email">Email</option>
                      <option value="random">Aleatória</option>
                    </>
                  ) : (
                    <>
                      <option value="cnpj">CNPJ</option>
                      <option value="phone">Telefone</option>
                      <option value="email">Email</option>
                      <option value="random">Aleatória</option>
                    </>
                  )}
                </select>
              </Field>

              <Field label="Chave Pix">
                <div className="relative">
                  <input
                    ref={fieldRefs.pixKeyValue}
                    type="text"
                    autoFocus={isEditingPixKey}
                    readOnly={!isEditingPixKey}
                    placeholder={["cpf", "cnpj"].includes(form.pixKeyType) ? "Chave Pix" : "Digite a chave Pix"}
                    value={isEditingPixKey ? pixKeyDraft : pixValue || ""}
                    onChange={(e) => setPixKeyDraft(e.target.value)}
                    className={`${fieldInputClass} ${invalidClass("pixKeyValue")} ${isEditingPixKey ? "pr-20" : ["phone", "email", "random"].includes(form.pixKeyType) ? "pr-12" : ""}`}
                  />
                  {["phone", "email", "random"].includes(form.pixKeyType) && (
                    <div className="absolute inset-y-0 right-2 flex items-center gap-1">
                      {isEditingPixKey ? (
                        <>
                          <RegisterPixIconButton variant="cancel" label="Cancelar edição" onClick={() => { setIsEditingPixKey(false); setPixKeyDraft(""); }}><X className="h-4 w-4" /></RegisterPixIconButton>
                          <RegisterPixIconButton variant="confirm" label="Confirmar chave Pix" onClick={() => { set("pixKeyValue", pixKeyDraft); setIsEditingPixKey(false); }}><Check className="h-4 w-4" /></RegisterPixIconButton>
                        </>
                      ) : (
                        <RegisterPixIconButton label="Editar chave Pix" onClick={() => { setPixKeyDraft(pixValue || ""); setIsEditingPixKey(true); }}><Pencil className="h-4 w-4" /></RegisterPixIconButton>
                      )}
                    </div>
                  )}
                </div>
              </Field>

              <Field label="Senha *">
                <input
                  ref={fieldRefs.password}
                  type="password"
                  placeholder="Senha"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  className={`${fieldInputClass} ${invalidClass("password")}`}
                />
              </Field>

            </div>

            <div className="md:col-span-2">
              <AddressFieldsCard
                title="Endereco"
                required
                defaultExpanded
                inputClassNameOverride={fieldInputClass}
                labelClassName={fieldLabelClass}
                inputRefs={fieldRefs}
                invalidField={invalidField}
                value={{
                  rua: form.rua,
                  numero: form.numero,
                  bairro: form.bairro,
                  cidade: form.cidade,
                  estado: form.estado,
                  pais: form.pais,
                  cep: form.cep,
                }}
                onChange={(nextAddress) => {
                  setForm((prev) => ({
                    ...prev,
                    ...nextAddress,
                  }));
                  if (invalidField && Object.prototype.hasOwnProperty.call(nextAddress, invalidField)) {
                    setInvalidField("");
                    setError("");
                  }
                }}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                onClick={onClose}
                variant="cancel"
                className="flex-1 rounded-full transition"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving || checkingAvailability}
                className="flex-1 rounded-full bg-gradient-to-r from-[#b8891f] to-[#d6ab4a] text-white font-semibold hover:from-[#a67917] hover:to-[#c79a39] transition disabled:opacity-60"
              >
                {checkingAvailability ? "Verificando..." : saving ? "Criando..." : "Criar Conta"}
              </Button>
            </div>
          </form>
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showPixConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center rounded-3xl bg-[#1e1608]/65 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="pix-confirmation-title"
              className="w-full max-w-md rounded-2xl border border-[#d6ab4a]/40 bg-[#fffdf8] p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div>
                  <h3 id="pix-confirmation-title" className="text-lg font-bold text-[#1e1608]">Confirme os dados Pix</h3>
                  <p className="mt-1 text-sm text-[#7b6024]">Confira com atenção. O pagamento será enviado para esta chave.</p>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-[#d6ab4a]/35 bg-[#f5e7c0]/25 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#7b6024]">Tipo da chave</p>
                  <p className="mt-1 font-semibold text-[#1e1608]">{pixTypeLabel(form.pixKeyType)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#7b6024]">Chave Pix</p>
                  <p className="mt-1 break-all text-lg font-bold text-[#1e1608]">{pixValue}</p>
                </div>
              </div>

              <p className="mt-4 text-center text-sm font-semibold text-[#4a3918]">O tipo e a chave Pix estão corretos?</p>
              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="cancel"
                  onClick={() => {
                    setShowPixConfirmation(false);
                    window.setTimeout(() => {
                      fieldRefs.pixKeyType.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                      fieldRefs.pixKeyType.current?.focus();
                    }, 150);
                  }}
                  className="flex-1 rounded-full"
                >
                  <Pencil className="mr-2 h-4 w-4" /> Editar dados Pix
                </Button>
                <Button
                  type="button"
                  onClick={createAccount}
                  className="flex-1 rounded-full bg-gradient-to-r from-[#b8891f] to-[#d6ab4a] text-white"
                >
                  <Check className="mr-2 h-4 w-4" /> Sim, finalizar
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function pixTypeLabel(type) {
  return ({ cpf: "CPF", cnpj: "CNPJ", phone: "Telefone", email: "E-mail", random: "Chave aleatória" })[type] || type;
}

function Field({ label, children, className = "" }) {
  return (
    <div className={className}>
      <label className={fieldLabelClass}>{label}</label>
      {children}
    </div>
  );
}

function RegisterPixIconButton({ label, onClick, children, variant = "edit" }) {
  const palette = variant === "confirm"
    ? "text-emerald-700 hover:bg-emerald-50"
    : variant === "cancel"
      ? "text-red-600 hover:bg-red-50"
      : "text-amber-700 hover:bg-amber-50";

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid h-8 w-8 place-items-center rounded-lg transition ${palette}`}
    >
      {children}
    </button>
  );
}
