import { useMemo, useState } from "react";
import logo from "@/assets/fenix.png";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getSessionSnapshot } from "@/services/authApi";
import {
	LayoutDashboard,
	Users,
	Menu,
	LogOut,
	ChevronRight,
	ContactRound,
	ShoppingCart,
	HandCoins,
} from "lucide-react";

const navItems = [
	{ name: "Dashboard", icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
	{ name: "Orders", icon: ShoppingCart, label: "Compras", to: "/orders" },
	{ name: "Advances", icon: HandCoins, label: "Adiantamentos", to: "/adiantamentos" },
	{ name: "Suppliers", icon: ContactRound, label: "Fornecedores", to: "/suppliers" },
    { name: "Employees", icon: Users, label: "Funcionarios", to: "/employees" },
];

export default function InternalLayout({ children }) {
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const location = useLocation();
	const navigate = useNavigate();

	const visibleNavItems = navItems;

	const currentItem = useMemo(() => {
		const path = location.pathname;
		const exact = visibleNavItems.find((item) => item.to === path);
		if (exact) return exact;

		const prefix = visibleNavItems.find((item) => path.startsWith(item.to));
		if (prefix) return prefix;

		return visibleNavItems[0];
	}, [location.pathname, visibleNavItems]);

	const handleLogout = () => {
		setSidebarOpen(false);
		navigate("/#hero");
	};

	const handleBrandClick = () => {
		setSidebarOpen(false);
		navigate("/#hero");
	};

	return (
		<div className="flex h-screen bg-white overflow-hidden">
			<aside
				className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#1e1608] text-amber-50 flex flex-col transform transition-transform duration-300 lg:relative lg:translate-x-0 ${
					sidebarOpen ? "translate-x-0" : "-translate-x-full"
				}`}
			>
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
						<p className="text-amber-100/70 text-xs">Sistema Interno</p>
					</div>
				</button>

				<nav className="flex-1 p-4 space-y-1 overflow-y-auto">
					{visibleNavItems.map((item) => {
						const isActive = currentItem?.name === item.name;

						return (
							<Link
								key={item.name}
								to={item.to}
								onClick={() => setSidebarOpen(false)}
								className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
									isActive
										? "bg-gradient-to-r from-[#b8891f] to-[#d6ab4a] text-white shadow-lg shadow-amber-700/30"
										: "text-amber-100/80 hover:bg-amber-200/20 hover:text-white"
								}`}
							>
								<item.icon className="w-5 h-5 flex-shrink-0" />
								<span className="font-medium">{item.label}</span>
								{isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
							</Link>
						);
					})}
				</nav>

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

			<div className="flex-1 flex flex-col overflow-hidden">
				<header className="bg-white border-b border-amber-100 px-6 py-4 flex items-center gap-4">
					<button
						onClick={() => setSidebarOpen(true)}
						className="lg:hidden p-2 rounded-lg hover:bg-amber-50 text-slate-700"
					>
						<Menu className="w-5 h-5" />
					</button>

					<div className="flex-1">
						<h1 className="font-semibold text-gray-900">
							{currentItem?.label || "Sistema Interno"}
						</h1>
					</div>

					<Link to="/" className="text-sm text-[#b8891f] hover:text-[#a67917] font-medium">
						Voltar ao site
					</Link>
				</header>

				<main className="flex-1 overflow-y-auto p-6">{children}</main>
			</div>
		</div>
	);
}
