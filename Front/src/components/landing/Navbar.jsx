import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLoginClick = (event) => {
    event.preventDefault();
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { label: "Início", id: "hero" },
    { label: "Nossa Missão", id: "mission" },
    { label: "Quem Somos", id: "about" },
    { label: "Contato", id: "contact" },
  ];

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: "smooth" });
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${
          isScrolled
            ? "bg-white/90 backdrop-blur-xl shadow-[0_10px_28px_rgba(30,22,8,0.14)] border-b border-amber-200/70 py-3"
            : "bg-white/80 backdrop-blur-lg border-b border-amber-100/70 py-5"
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-0">
            <div className="font-bold text-xl">
              <span
                className={`font-semibold text-lg ${
                  isScrolled ? "text-slate-900" : "text-slate-900"
                }`}
              >
                Fenix<span className="text-[#b8891f]">Metálicos</span>
              </span>
            </div>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`text-sm font-medium transition-colors ${
                  isScrolled
                    ? "text-slate-600 hover:text-[#b8891f]"
                    : "text-slate-700 hover:text-[#b8891f]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              type="button"
              onClick={handleLoginClick}
              className="rounded-full px-6 bg-gradient-to-r from-[#b8891f] to-[#d6ab4a] text-white shadow-[0_8px_18px_rgba(184,137,31,0.35)] hover:from-[#a67917] hover:to-[#c79a39] disabled:cursor-not-allowed disabled:opacity-90"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Login
            </Button>
          </div>

          {/* Mobile Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`md:hidden ${
              isScrolled ? "text-gray-900" : "text-gray-900"
            }`}
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-x-0 top-16 z-30 bg-white shadow-xl rounded-b-3xl mx-4 p-6 md:hidden"
          >
            <div className="flex flex-col gap-4">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="text-slate-700 hover:text-[#b8891f] font-medium py-2 text-left"
                >
                  {item.label}
                </button>
              ))}

              <Button
                type="button"
                onClick={handleLoginClick}
                className="rounded-full w-full bg-gradient-to-r from-[#b8891f] to-[#d6ab4a] text-white disabled:cursor-not-allowed disabled:opacity-90"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Login
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}