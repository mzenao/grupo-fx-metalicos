import { useState } from "react";
import { X, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { resetPassword } from "@/services/authApi";

export default function ResetPasswordModal({ token, onClose, onSuccess }) {
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!token) {
      setError("Link de recuperacao invalido ou incompleto.");
      return;
    }

    if (form.password.length < 6) {
      setError("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("A confirmacao da senha nao confere.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, form.password);
      setSuccess("Senha alterada com sucesso. Voce ja pode entrar com a nova senha.");
      setForm({ password: "", confirmPassword: "" });
      onSuccess?.();
    } catch (err) {
      setError(err?.message || "Nao foi possivel alterar a senha.");
    } finally {
      setLoading(false);
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
          className="relative w-full max-w-md max-h-[90vh] overflow-hidden rounded-3xl border border-[#1e1608]/60 bg-[#fffdf8] shadow-2xl shadow-[#1e1608]/20"
        >
          <div className="flex items-center justify-between rounded-t-3xl border-b border-[#d6ab4a]/30 bg-gradient-to-r from-[#1e1608] to-[#2b2010] p-6">
            <h2 className="text-xl font-bold text-[#f5e7c0]">Redefinir senha</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-[#f5e7c0]/80 hover:bg-[#d6ab4a]/20 hover:text-[#f5e7c0]"
              aria-label="Fechar modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="modal-scrollbar max-h-[calc(90vh-88px)] space-y-5 overflow-y-auto rounded-b-3xl bg-[#fffdf8] p-8">
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            {success && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                {success}
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-[#4a3918]">Nova senha</label>
              <input
                type="password"
                value={form.password}
                onChange={(event) => set("password", event.target.value)}
                className="w-full rounded-xl border border-[#d6ab4a]/35 bg-[#f5e7c0]/20 px-4 py-3 text-[#1e1608] placeholder-[#1e1608]/40 transition focus:outline-none focus:ring-2 focus:ring-[#b8891f]"
                placeholder="Digite a nova senha"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#4a3918]">Confirmar senha</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(event) => set("confirmPassword", event.target.value)}
                className="w-full rounded-xl border border-[#d6ab4a]/35 bg-[#f5e7c0]/20 px-4 py-3 text-[#1e1608] placeholder-[#1e1608]/40 transition focus:outline-none focus:ring-2 focus:ring-[#b8891f]"
                placeholder="Repita a nova senha"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" onClick={onClose} variant="cancel" className="flex-1 rounded-full transition">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="flex-1 rounded-full">
                {loading ? "Salvando..." : "Salvar senha"}
              </Button>
            </div>
          </form>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
