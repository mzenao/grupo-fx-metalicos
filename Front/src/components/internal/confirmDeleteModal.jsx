import { AlertOctagon, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export default function ConfirmDeleteModal({
  open,
  title = "Confirmar exclusao",
  message,
  itemLabel = "",
  password = "",
  onPasswordChange,
  requirePassword = true,
  confirmText = "Excluir",
  cancelText = "Cancelar",
  loading = false,
  onConfirm,
  onCancel,
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.button
            type="button"
            aria-label="Fechar modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-[#1e1608]/60 backdrop-blur-[2px]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="relative w-full max-w-md rounded-3xl border border-[#1e1608]/60 bg-[#fffdf8] shadow-2xl shadow-[#1e1608]/20"
          >
            <div className="rounded-t-3xl border-b border-[#d6ab4a]/30 bg-gradient-to-r from-[#1e1608] to-[#2b2010] px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#f5e7c0]">
                <AlertOctagon className="w-5 h-5" />
                <h3 className="text-lg font-bold">{title}</h3>
              </div>
              <button
                type="button"
                onClick={onCancel}
                className="p-1 rounded-md text-[#f5e7c0]/80 hover:bg-[#d6ab4a]/20 hover:text-[#f5e7c0]"
                aria-label="Fechar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-5 space-y-4">
              <p className="text-sm text-gray-700">{message}</p>
              {itemLabel ? (
                <p className="text-xs text-gray-600">
                  Item: <span className="font-semibold text-gray-800">{itemLabel}</span>
                </p>
              ) : null}
              {requirePassword ? (
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-700">Senha atual *</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => onPasswordChange?.(event.target.value)}
                    placeholder="Digite sua senha"
                    className="w-full h-10 px-3 rounded-lg border border-[#d6ab4a]/50 bg-white outline-none focus:ring-2 focus:ring-[#d6ab4a]/30 focus:border-[#b8891f]"
                  />
                </div>
              ) : null}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg border border-[#d6ab4a]/40 text-[#6a521f] font-semibold hover:bg-[#f5e7c0] disabled:opacity-60"
                >
                  {cancelText}
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={loading || (requirePassword && !String(password || "").trim())}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-600 to-red-500 text-white font-semibold hover:brightness-105 disabled:opacity-60"
                >
                  {loading ? "Excluindo..." : confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
