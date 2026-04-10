import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { validarCPF, validarCNPJ } from "@/services/validators";
import { registerSupplierAccount } from "@/services/authApi";

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

  if (type === "phone") return form.phone || "";
  if (type === "email") return form.pixKeyValue || "";
  if (type === "random") return form.pixKeyValue || "";
  return "";
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
    referenceAddress: "",
    email: "",
    phone: "",
    pixKeyValue: "",
    password: "",
  }), []);

  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.personType === "PF" && !form.name.trim()) {
      setError("Nome é obrigatório para pessoa física.");
      return;
    }

    if (form.personType === "PJ" && !form.companyName.trim()) {
      setError("Nome da empresa é obrigatório para pessoa jurídica.");
      return;
    }

    if (form.personType === "PF" && !form.cpf.trim()) {
      setError("CPF é obrigatório para pessoa física.");
      return;
    }

    if (form.personType === "PF" && !validarCPF(form.cpf)) {
      setError("CPF inválido.");
      return;
    }

    if (form.personType === "PJ" && !form.cnpj.trim()) {
      setError("CNPJ é obrigatório para pessoa jurídica.");
      return;
    }

    if (form.personType === "PJ" && !validarCNPJ(form.cnpj)) {
      setError("CNPJ inválido.");
      return;
    }

    if (!form.vehiclePlate.trim()) {
      setError("Placa do veículo é obrigatória.");
      return;
    }

    if (!form.referenceAddress.trim()) {
      setError("Endereço de referência é obrigatório.");
      return;
    }

    if (!form.email.trim()) {
      setError("Email é obrigatório.");
      return;
    }

    if (!form.phone.trim()) {
      setError("Telefone é obrigatório.");
      return;
    }

    if (!form.password || form.password.length < 6) {
      setError("A senha precisa ter no mínimo 6 caracteres.");
      return;
    }

    const allowedPixTypes = form.personType === "PF" ? ["cpf", "phone", "email", "random"] : ["cnpj", "phone", "email", "random"];
    if (!allowedPixTypes.includes(form.pixKeyType)) {
      setError("Selecione uma opção válida para chave Pix.");
      return;
    }

    if (["email", "random"].includes(form.pixKeyType) && !form.pixKeyValue.trim()) {
      setError("Informe a chave Pix para o tipo selecionado.");
      return;
    }

    setSaving(true);
    try {
      const user = await registerSupplierAccount({
        is_pf: form.personType === "PF",
        name: form.personType === "PF" ? form.name : form.companyName,
        company_name: form.personType === "PJ" ? form.companyName : null,
        cpf: form.personType === "PF" ? form.cpf : null,
        cnpj: form.personType === "PJ" ? form.cnpj : null,
        vehicle_plate: form.vehiclePlate,
        reference_address: form.referenceAddress,
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
          className="relative bg-[#fffdf8] rounded-3xl border border-[#1e1608]/60 shadow-2xl shadow-[#1e1608]/20 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <div className="sticky top-0 bg-gradient-to-r from-[#1e1608] to-[#2b2010] rounded-t-3xl border-b border-[#d6ab4a]/30 flex items-center justify-between p-6 z-10">
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

          <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-[#fffdf8]">
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
                    type="text"
                    placeholder="Nome Completo"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    className={fieldInputClass}
                  />
                </Field>
              )}

              {form.personType === "PJ" && (
                <Field label="Nome da Empresa *">
                  <input
                    type="text"
                    placeholder="Nome da Empresa"
                    value={form.companyName}
                    onChange={(e) => set("companyName", e.target.value)}
                    className={fieldInputClass}
                  />
                </Field>
              )}

              {form.personType === "PF" && (
                <Field label="CPF *">
                  <input
                    type="text"
                    placeholder="CPF"
                    value={form.cpf}
                    onChange={(e) => set("cpf", formatCpfInput(e.target.value))}
                    className={fieldInputClass}
                  />
                </Field>
              )}

              {form.personType === "PJ" && (
                <Field label="CNPJ *">
                  <input
                    type="text"
                    placeholder="CNPJ"
                    value={form.cnpj}
                    onChange={(e) => set("cnpj", formatCnpjInput(e.target.value))}
                    className={fieldInputClass}
                  />
                </Field>
              )}

              <Field label="Placa do Veículo *">
                <input
                  type="text"
                  placeholder="Placa do Veículo"
                  value={form.vehiclePlate}
                  onChange={(e) => set("vehiclePlate", e.target.value)}
                  className={fieldInputClass}
                />
              </Field>

              <Field label="Email *">
                <input
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  className={fieldInputClass}
                />
              </Field>

              <Field label="Telefone *">
                <input
                  type="tel"
                  placeholder="Telefone"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  className={fieldInputClass}
                />
              </Field>

              <Field label="Tipo da chave Pix *">
                <select
                  required
                  value={form.pixKeyType}
                  onChange={(e) => {
                    const nextType = e.target.value;
                    set("pixKeyType", nextType);
                    if (!["email", "random"].includes(nextType)) {
                      set("pixKeyValue", "");
                    }
                  }}
                  className={fieldInputClass}
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
                <input
                  type="text"
                  readOnly={!(["email", "random"].includes(form.pixKeyType))}
                  placeholder={(["email", "random"].includes(form.pixKeyType)) ? "Digite a chave Pix" : "Chave Pix"}
                  value={pixValue || ""}
                  onChange={(e) => set("pixKeyValue", e.target.value)}
                  className={fieldInputClass}
                />
              </Field>

              <Field label="Senha *">
                <input
                  type="password"
                  placeholder="Senha"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  className={fieldInputClass}
                />
              </Field>

            </div>

            <div className="md:col-span-2">
              <label className={fieldLabelClass}>Endereço de Referência *</label>
              <textarea
                placeholder="Endereço de Referência"
                value={form.referenceAddress}
                onChange={(e) => set("referenceAddress", e.target.value)}
                rows="3"
                className="w-full px-3 py-3 rounded-xl border border-[#d6ab4a]/35 bg-[#f5e7c0]/20 text-[#1e1608] placeholder-[#1e1608]/40 focus:outline-none focus:ring-2 focus:ring-[#b8891f] resize-none"
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
                disabled={saving}
                className="flex-1 rounded-full bg-gradient-to-r from-[#b8891f] to-[#d6ab4a] text-white font-semibold hover:from-[#a67917] hover:to-[#c79a39] transition disabled:opacity-60"
              >
                {saving ? "Criando..." : "Criar Conta"}
              </Button>
            </div>
          </form>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <div className={className}>
      <label className={fieldLabelClass}>{label}</label>
      {children}
    </div>
  );
}
