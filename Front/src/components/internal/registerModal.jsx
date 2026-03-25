import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { validarCPF, validarCNPJ } from "@/services/validators";
import { MOCK_SUPPLIERS_DETAILED } from "@/services/mockDatabase";

export default function RegisterModal({ onClose, onSuccess }) {
  const initial = useMemo(() => ({
    personType: "PF",
    name: "",
    companyName: "",
    cpf: "",
    cnpj: "",
    vehiclePlate: "",
    referenceAddress: "",
    email: "",
    phone: "",
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
      name: nextType === "PF" ? prev.name : "",
      cpf: nextType === "PF" ? prev.cpf : "",
      companyName: nextType === "PJ" ? prev.companyName : "",
      cnpj: nextType === "PJ" ? prev.cnpj : "",
    }));
  };

  const handleSubmit = (e) => {
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

    // Verificar se email já existe
    const existingUsers = JSON.parse(localStorage.getItem("fx_registered_users") || "[]");
    if (existingUsers.some((u) => u.email === form.email)) {
      setError("Este email já está cadastrado.");
      return;
    }

    setSaving(true);
    try {
      // Criar novo supplier
      const newSupplier = {
        id: Date.now(),
        personType: form.personType,
        name: form.personType === "PF" ? form.name : "",
        companyName: form.personType === "PJ" ? form.companyName : "",
        cpf: form.personType === "PF" ? form.cpf : "",
        cnpj: form.personType === "PJ" ? form.cnpj : "",
        vehiclePlate: form.vehiclePlate,
        referenceAddress: form.referenceAddress,
        email: form.email,
        phone: form.phone,
        password: form.password,
      };

      // Salvar supplier em localStorage
      const existingSuppliers = JSON.parse(localStorage.getItem("fx_suppliers_records") || "[]");
      const updatedSuppliers = [...existingSuppliers, newSupplier];
      localStorage.setItem("fx_suppliers_records", JSON.stringify(updatedSuppliers));

      // Criar novo usuário
      const newUser = {
        id: Date.now(),
        name: form.personType === "PF" ? form.name : form.companyName,
        email: form.email,
        role: "user",
        accountType: form.personType.toLowerCase(),
        supplierId: newSupplier.id,
        password: form.password,
      };

      // Salvar usuário em localStorage
      const updatedUsers = [...existingUsers, newUser];
      localStorage.setItem("fx_registered_users", JSON.stringify(updatedUsers));

      // Fazer login automático
      localStorage.setItem("fx_active_user_id", newUser.id);

      onSuccess?.(newUser);
      onClose();
    } catch (err) {
      setError("Erro ao criar conta. Por favor, tente novamente.");
    } finally {
      setSaving(false);
    }
  };

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
                <input
                  type="text"
                  placeholder="Nome Completo"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  className="px-4 py-3 rounded-xl border border-[#d6ab4a]/35 bg-[#f5e7c0]/20 text-[#1e1608] placeholder-[#1e1608]/40 focus:outline-none focus:ring-2 focus:ring-[#b8891f]"
                />
              )}

              {form.personType === "PJ" && (
                <input
                  type="text"
                  placeholder="Nome da Empresa"
                  value={form.companyName}
                  onChange={(e) => set("companyName", e.target.value)}
                  className="px-4 py-3 rounded-xl border border-[#d6ab4a]/35 bg-[#f5e7c0]/20 text-[#1e1608] placeholder-[#1e1608]/40 focus:outline-none focus:ring-2 focus:ring-[#b8891f]"
                />
              )}

              {form.personType === "PF" && (
                <input
                  type="text"
                  placeholder="CPF"
                  value={form.cpf}
                  onChange={(e) => set("cpf", e.target.value)}
                  className="px-4 py-3 rounded-xl border border-[#d6ab4a]/35 bg-[#f5e7c0]/20 text-[#1e1608] placeholder-[#1e1608]/40 focus:outline-none focus:ring-2 focus:ring-[#b8891f]"
                />
              )}

              {form.personType === "PJ" && (
                <input
                  type="text"
                  placeholder="CNPJ"
                  value={form.cnpj}
                  onChange={(e) => set("cnpj", e.target.value)}
                  className="px-4 py-3 rounded-xl border border-[#d6ab4a]/35 bg-[#f5e7c0]/20 text-[#1e1608] placeholder-[#1e1608]/40 focus:outline-none focus:ring-2 focus:ring-[#b8891f]"
                />
              )}

              <input
                type="text"
                placeholder="Placa do Veículo"
                value={form.vehiclePlate}
                onChange={(e) => set("vehiclePlate", e.target.value)}
                className="px-4 py-3 rounded-xl border border-[#d6ab4a]/35 bg-[#f5e7c0]/20 text-[#1e1608] placeholder-[#1e1608]/40 focus:outline-none focus:ring-2 focus:ring-[#b8891f]"
              />

              <input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className="px-4 py-3 rounded-xl border border-[#d6ab4a]/35 bg-[#f5e7c0]/20 text-[#1e1608] placeholder-[#1e1608]/40 focus:outline-none focus:ring-2 focus:ring-[#b8891f]"
              />

              <input
                type="tel"
                placeholder="Telefone"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className="px-4 py-3 rounded-xl border border-[#d6ab4a]/35 bg-[#f5e7c0]/20 text-[#1e1608] placeholder-[#1e1608]/40 focus:outline-none focus:ring-2 focus:ring-[#b8891f]"
              />

              <input
                type="password"
                placeholder="Senha"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                className="px-4 py-3 rounded-xl border border-[#d6ab4a]/35 bg-[#f5e7c0]/20 text-[#1e1608] placeholder-[#1e1608]/40 focus:outline-none focus:ring-2 focus:ring-[#b8891f]"
              />

            </div>

            <div className="md:col-span-2">
              <textarea
                placeholder="Endereço de Referência"
                value={form.referenceAddress}
                onChange={(e) => set("referenceAddress", e.target.value)}
                rows="3"
                className="w-full px-4 py-3 rounded-xl border border-[#d6ab4a]/35 bg-[#f5e7c0]/20 text-[#1e1608] placeholder-[#1e1608]/40 focus:outline-none focus:ring-2 focus:ring-[#b8891f] resize-none"
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
