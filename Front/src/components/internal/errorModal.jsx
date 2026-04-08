import { AlertTriangle, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export default function ErrorModal({
  open,
  title = "Erro",
  message,
  hint,
  buttonText = "Fechar",
  onClose,
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
            onClick={onClose}
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
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-lg font-bold">{title}</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-md text-[#f5e7c0]/80 hover:bg-[#d6ab4a]/20 hover:text-[#f5e7c0]"
                aria-label="Fechar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-5 space-y-4">
              <p className="text-sm text-gray-700">{message}</p>
              {hint ? <p className="text-xs text-gray-500">{hint}</p> : null}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#b8891f] to-[#d6ab4a] text-white font-semibold hover:brightness-105"
                >
                  {buttonText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
