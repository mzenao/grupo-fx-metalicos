import { useState, createContext, useContext } from "react";
import { LogOut, LayoutDashboard, ShoppingCart, User, ChevronRight, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/fenix.png";

const SectionContext = createContext();

export function useSectionContext() {
  return useContext(SectionContext);
}

export default function InternalSupplierLayout({ children }) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");

  const sectionLabels = {
    dashboard: "Dashboard",
    sales: "Minhas Vendas",
    account: "Minha Conta",
  };

  const handleLogout = () => {
    setSidebarOpen(false);
    navigate("/#hero");
  };

  const handleBrandClick = () => {
    setSidebarOpen(false);
    navigate("/");
  };

  return (
    <SectionContext.Provider value={{ activeSection, setActiveSection }}>
      <div className="flex h-screen bg-white overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#1e1608] text-amber-50 flex flex-col border-r border-amber-200/20 transform transition-transform duration-300 lg:relative lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
        {/* Logo */}
        <button
          type="button"
          onClick={handleBrandClick}
          className="flex items-center gap-3 p-6 border-b border-amber-900/40 text-left hover:bg-amber-900/20 transition-colors"
        >
          <img src={logo} alt="Logo Fenix Metalicos" className="w-10 h-10 object-contain scale-175" />
          <div>
            <p className="font-bold text-lg">
              FX<span className="text-[#d6ab4a]">Metálicos</span>
            </p>
            <p className="text-amber-100/70 text-xs">Portal do Fornecedor</p>
          </div>
        </button>

          {/* Navigation Items */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <NavItem
              icon={<LayoutDashboard size={20} />}
              label="Dashboard"
              sectionId="dashboard"
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
            />
            <NavItem
              icon={<ShoppingCart size={20} />}
              label="Minhas Vendas"
              sectionId="sales"
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
            />
            <NavItem
              icon={<User size={20} />}
              label="Minha Conta"
              sectionId="account"
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
            />
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t border-amber-200/20">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-2 rounded-lg hover:bg-red-900/30 hover:text-red-300 transition-colors text-amber-100"
            >
              <LogOut size={20} />
              <span>Sair</span>
            </button>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-amber-100 px-4 sm:px-6 py-4 flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-amber-50 text-slate-700"
              type="button"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-gray-900 truncate">
                {sectionLabels[activeSection] || "Portal do Fornecedor"}
              </h1>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto bg-white">
            <div className="p-4 sm:p-6 lg:p-8">{children}</div>
          </main>
        </div>
      </div>
    </SectionContext.Provider>
  );
}

function NavItem({ icon, label, sectionId, sidebarOpen, setSidebarOpen }) {
  const { activeSection, setActiveSection } = useSectionContext();
  const isActive = activeSection === sectionId;

  return (
    <button
      onClick={() => {
        setActiveSection(sectionId);
        setSidebarOpen(false);
      }}
      className={`flex items-center gap-4 w-full px-4 py-3 rounded-lg transition-all group ${
        isActive
          ? "bg-gradient-to-r from-[#b8891f] to-[#d6ab4a] text-white shadow-lg shadow-amber-700/30 font-semibold"
          : "text-amber-100/80 hover:bg-amber-200/20 hover:text-white"
      }`}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span>{label}</span>
      {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
    </button>
  );
}
