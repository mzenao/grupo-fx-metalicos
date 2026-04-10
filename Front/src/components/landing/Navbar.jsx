import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, LogIn, LogOut } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import LoginModal from "@/components/internal/loginModal";
import RegisterModal from "@/components/internal/registerModal";
import logo from "@/assets/fenix.png";
import { fetchMe, getSessionSnapshot, logout } from "@/services/authApi";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const session = getSessionSnapshot();
  const [isLoggedIn, setIsLoggedIn] = useState(session.isLoggedIn);
  const [userRole, setUserRole] = useState(session.role);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  const handleLoginClick = () => {
    setShowLoginModal(true);
    setIsMobileMenuOpen(false);
  };

  const handleRegisterClick = () => {
    setShowRegisterModal(true);
    setIsMobileMenuOpen(false);
  };

  const handleLoginSuccess = (user) => {
    setIsLoggedIn(true);
    setUserRole(user.role);
    window.location.reload();
  };

  const handleRegisterSuccess = (user) => {
    setIsLoggedIn(true);
    setUserRole(user.role);
    window.location.reload();
  };

  const handleLogout = async () => {
    await logout();
    setIsLoggedIn(false);
    setUserRole(null);
    setIsMobileMenuOpen(false);
    window.location.href = "/";
  };

  const goTo = (path) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  const handleBrandClick = () => {
    setIsMobileMenuOpen(false);

    if (location.pathname === "/") {
      scrollToSection("hero");
      return;
    }

    navigate("/#hero");
  };

  const actionButtonClass =
    "rounded-full bg-gradient-to-r from-[#b8891f] to-[#d6ab4a] text-white shadow-[0_8px_18px_rgba(184,137,31,0.35)] hover:from-[#a67917] hover:to-[#c79a39]";

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    fetchMe()
      .then((user) => {
        setIsLoggedIn(!!user);
        setUserRole(user?.role || null);
      })
      .catch(() => {
        setIsLoggedIn(false);
        setUserRole(null);
      });

    const handleStorageChange = () => {
      const updatedSession = getSessionSnapshot();
      setIsLoggedIn(updatedSession.isLoggedIn);
      setUserRole(updatedSession.role || null);
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const navItems = [
    { label: "Início", id: "hero" },
    { label: "Nossa Missão", id: "mission" },
    { label: "Quem Somos", id: "about" },
    { label: "Contato", id: "contact" },
  ];

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsMobileMenuOpen(false);
      return;
    }

    // Se a secao nao existir na pagina atual, voltamos para a home.
    if (location.pathname !== "/") {
      navigate("/");
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

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
            ? "bg-[#f8f6f1]/90 backdrop-blur-xl shadow-[0_10px_28px_rgba(30,22,8,0.14)] border-b border-amber-200/70 py-3"
            : "bg-transparent backdrop-blur-none border-b border-transparent py-5"
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBrandClick}
            className="flex items-center gap-0 scale-105 sm:scale-110 md:scale-125 cursor-pointer"
          >
            <img src={logo} alt="Logo Fenix Metalicos" className="navbar-logo" />
            <div className="font-bold text-xl">
              <span
                className={`font-semibold text-lg ${
                  isScrolled ? "text-slate-900" : "text-slate-900"
                }`}
              >
                <span className={isScrolled ? "text-black" : "text-white"}>FX</span><span className="text-[#b8891f]">Metálicos</span>
              </span>
            </div>
          </button>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`text-sm font-medium transition-colors ${
                  isScrolled
                    ? "text-black hover:text-[#b8891f]"
                    : "text-white hover:text-[#f0d79a]"
                }`}
              >
                {item.label}
              </button>
            ))}

            {!userRole && (
              <button
                type="button"
                onClick={handleRegisterClick}
                className={`text-sm font-medium transition-colors ${
                  isScrolled
                    ? "text-black hover:text-[#b8891f]"
                    : "text-white hover:text-[#f0d79a]"
                }`}
              >
                Quero ser Fornecedor
              </button>
            )}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {userRole === "supplier" && (
              <>
                <Button type="button" onClick={() => goTo("/supplier-portal")} className={`${actionButtonClass} px-6`}>
                  Portal do Fornecedor
                </Button>
                <Button
                  type="button"
                  onClick={handleLogout}
                  className={`${actionButtonClass} px-6`}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </Button>
              </>
            )}

            {(userRole === "employee" || userRole === "admin") && (
              <>
                <Button type="button" onClick={() => goTo("/dashboard")} className={`${actionButtonClass} px-6`}>
                  Dashboard
                </Button>
                <Button
                  type="button"
                  onClick={handleLogout}
                  className={`${actionButtonClass} px-6`}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </Button>
              </>
            )}

            {!userRole && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={handleLoginClick}
                  className={`${actionButtonClass} px-6`}
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Login
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`md:hidden ${
              isScrolled ? "text-black" : "text-white"
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

              {!userRole && (
                <button
                  type="button"
                  onClick={handleRegisterClick}
                  className="text-slate-700 hover:text-[#b8891f] font-medium py-2 text-left"
                >
                  Quero ser Fornecedor
                </button>
              )}

              {userRole === "supplier" && (
                <>
                  <Button
                    type="button"
                    onClick={() => goTo("/supplier-portal")}
                    className={`${actionButtonClass} w-full`}
                  >
                    Portal do Fornecedor
                  </Button>
                  <Button
                    type="button"
                    onClick={handleLogout}
                    className={`${actionButtonClass} w-full`}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </Button>
                </>
              )}

              {(userRole === "employee" || userRole === "admin") && (
                <>
                  <Button
                    type="button"
                    onClick={() => goTo("/dashboard")}
                    className={`${actionButtonClass} w-full`}
                  >
                    Dashboard
                  </Button>
                  <Button
                    type="button"
                    onClick={handleLogout}
                    className={`${actionButtonClass} w-full`}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </Button>
                </>
              )}

              {!userRole && (
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    onClick={handleLoginClick}
                    className={`${actionButtonClass} w-full`}
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Login
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onSuccess={handleLoginSuccess}
          onSwitchToRegister={() => {
            setShowLoginModal(false);
            setShowRegisterModal(true);
          }}
        />
      )}

      {showRegisterModal && (
        <RegisterModal
          onClose={() => setShowRegisterModal(false)}
          onSuccess={handleRegisterSuccess}
        />
      )}
    </>
  );
}