import { useState } from "react";
import { X, AlertCircle, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { login, requestPasswordReset } from "@/services/authApi";

export default function LoginModal({ onClose, onSuccess, onSwitchToRegister })  {
  const [form, setForm] = useState({ email: "", password: "", rememberMe: true });
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

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
      const user = await login(form.email.trim(), form.password, form.rememberMe);
      onSuccess?.(user);
      onClose();
    } catch (err) {
      setError(err?.message || "Erro ao fazer login. Por favor, tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError("");
    setSuccess("");

    const email = form.email.trim();
    if (!email) {
      setError("Informe seu email para recuperar a senha.");
      return;
    }

    setResetLoading(true);
    try {
      await requestPasswordReset(email);
      setSuccess("Se o email estiver cadastrado, enviaremos as instrucoes de recuperacao.");
    } catch (err) {
      setError(err?.message || "Nao foi possivel solicitar a recuperacao de senha.");
    } finally {
      setResetLoading(false);
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

          <form onSubmit={handleSubmit} className="modal-scrollbar max-h-[calc(90vh-88px)] space-y-5 overflow-y-auto rounded-b-3xl bg-[#fffdf8] p-8">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm">
                {success}
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
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="block text-sm font-medium text-[#4a3918]">Senha</label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetLoading || loading}
                  className="text-xs font-semibold text-[#b8891f] hover:text-[#7b6024] hover:underline disabled:opacity-60 disabled:hover:no-underline"
                >
                  {resetLoading ? "Enviando..." : "Esqueci minha senha"}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-[#d6ab4a]/35 bg-[#f5e7c0]/20 text-[#1e1608] placeholder-[#1e1608]/40 focus:outline-none focus:ring-2 focus:ring-[#b8891f] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7b6024] hover:text-[#1e1608]"
                  aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-medium text-[#5f4a1d]">Salvar login</span>
              <button
                type="button"
                onClick={() => set("rememberMe", !form.rememberMe)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full border transition-colors ${
                  form.rememberMe
                    ? "bg-[#b8891f] border-[#b8891f]"
                    : "bg-[#f2e6c5] border-[#d6ab4a]/45"
                }`}
                aria-pressed={form.rememberMe}
                aria-label="Salvar login"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                    form.rememberMe ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>
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
