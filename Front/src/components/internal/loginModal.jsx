import { useState } from "react";
import { X, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { login } from "@/services/authApi";

export default function LoginModal({ onClose, onSuccess, onSwitchToRegister })  {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.email.trim()) {
      setError("Email é obrigatório.");
      return;
    }

    if (!form.password.trim()) {
      setError("Senha é obrigatória.");
      return;
    }

    setLoading(true);
    try {
      const user = await login(form.email.trim(), form.password);
      onSuccess?.(user);
      onClose();
    } catch (err) {
      setError(err?.message || "Erro ao fazer login. Por favor, tente novamente.");
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
          className="relative bg-[#fffdf8] rounded-3xl border border-[#1e1608]/60 shadow-2xl shadow-[#1e1608]/20 w-full max-w-md"
        >
          <div className="bg-gradient-to-r from-[#1e1608] to-[#2b2010] rounded-t-3xl border-b border-[#d6ab4a]/30 flex items-center justify-between p-6">
            <h2 className="text-xl font-bold text-[#f5e7c0]">Entrar</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-[#f5e7c0]/80 hover:bg-[#d6ab4a]/20 hover:text-[#f5e7c0]"
              aria-label="Fechar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-5 bg-[#fffdf8]">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#4a3918] mb-2">Email</label>
              <input
                type="email"
                placeholder="seu@email.com"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#d6ab4a]/35 bg-[#f5e7c0]/20 text-[#1e1608] placeholder-[#1e1608]/40 focus:outline-none focus:ring-2 focus:ring-[#b8891f] transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#4a3918] mb-2">Senha</label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#d6ab4a]/35 bg-[#f5e7c0]/20 text-[#1e1608] placeholder-[#1e1608]/40 focus:outline-none focus:ring-2 focus:ring-[#b8891f] transition"
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
                disabled={loading}
                className="flex-1 rounded-full bg-gradient-to-r from-[#b8891f] to-[#d6ab4a] text-white font-semibold hover:from-[#a67917] hover:to-[#c79a39] transition disabled:opacity-60"
              >
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </div>

            <p className="text-center text-sm text-[#4a3918]">
              Não tem uma conta?{" "}
              <button
                type="button"
                onClick={() => onSwitchToRegister?.()}
                className="font-semibold text-[#b8891f] hover:underline"
              >
                Cadastre-se
              </button>
            </p>
          </form>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
