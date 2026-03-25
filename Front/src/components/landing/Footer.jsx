import React from 'react';
import { motion } from 'framer-motion';
import {
  Instagram,
  Facebook,
  MessageCircle,
  Youtube,
  ArrowUp
} from 'lucide-react';

const socialLinks = [
  { icon: Instagram, href: '#' },
  { icon: Facebook, href: '#' },
  { icon: Youtube, href: '#' }
];

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#f8f6f1] border-t border-amber-100/70 relative overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <span className="font-bold text-2xl tracking-tight text-slate-900">
              FX<span className="text-[#b8891f]">Metálicos</span>
            </span>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex gap-3">
              {socialLinks.map((social, index) => (
                <motion.a
                  key={index}
                  href={social.href}
                  whileHover={{ scale: 1.1 }}
                  className="w-10 h-10 rounded-xl bg-[#b8891f]/10 flex items-center justify-center text-[#b8891f] hover:bg-[#b8891f]/20 transition-all"
                >
                  <social.icon className="w-5 h-5" />
                </motion.a>
              ))}
            </div>

            <motion.button
              onClick={scrollToTop}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#b8891f] to-[#d6ab4a] flex items-center justify-center text-white shadow-[0_8px_18px_rgba(184,137,31,0.35)] hover:shadow-[0_12px_24px_rgba(184,137,31,0.45)] transition-shadow"
            >
              <ArrowUp className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

        <div className="border-t border-amber-100/70 mt-8 pt-6 text-center">
          <p className="text-slate-600 text-sm">
            © {new Date().getFullYear()} FX Metálicos. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}