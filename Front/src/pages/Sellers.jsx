import { useMemo, useState } from "react";
import {
	Plus,
	Search,
	Edit2,
	Trash2,
	ContactRound,
	Phone,
	Mail,
	ChevronDown,
	ChevronUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SellerModal from "@/components/internal/sellerModal.jsx";
import ViewSells from "@/components/internal/viewSells.jsx";

const INITIAL_SELLERS = [
	{
		id: 1,
		personType: "PF",
		name: "Joao Pedro Lima",
		companyName: "",
		cpf: "123.456.789-00",
		cnpj: "",
		vehiclePlate: "ABC1D23",
		referenceAddress: "Rua das Palmeiras, 120 - Centro",
		email: "joao.lima@fornecedor.com",
		phone: "(32) 98888-1234",
		password: "",
		sales: [
			{ id: 301, value: 4280.5, date: "2026-02-14" },
			{ id: 317, value: 1790, date: "2026-03-03" },
		],
	},
	{
		id: 2,
		personType: "PJ",
		name: "",
		companyName: "Distribuidora Vale Sul",
		cpf: "",
		cnpj: "12.345.678/0001-90",
		vehiclePlate: "QWE4R56",
		referenceAddress: "Avenida Industrial, 455 - Distrito 2",
		email: "contato@valesul.com.br",
		phone: "(32) 3777-9000",
		password: "",
		sales: [],
	},
];

const personTypeBadge = {
	PF: "bg-sky-100 text-sky-800",
	PJ: "bg-amber-100 text-amber-800",
};

export default function Sellers() {
	const navigate = useNavigate();
	const [sellers, setSellers] = useState(INITIAL_SELLERS);
	const [search, setSearch] = useState("");
	const [showModal, setShowModal] = useState(false);
	const [editingSeller, setEditingSeller] = useState(null);
	const [expandedId, setExpandedId] = useState(null);
	const [salesSeller, setSalesSeller] = useState(null);

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return sellers;

		return sellers.filter((seller) => {
			const primaryName = (seller.personType === "PF" ? seller.name : seller.companyName) || "";
			const normalized = [
				primaryName,
				seller.personType,
				seller.phone,
				seller.email,
				seller.cpf,
				seller.cnpj,
				seller.vehiclePlate,
				seller.referenceAddress,
			]
				.join(" ")
				.toLowerCase();

			return normalized.includes(q);
		});
	}, [sellers, search]);

	const handleDelete = (id) => {
		if (!window.confirm("Remover este vendedor?")) return;
		setSellers((prev) => prev.filter((seller) => seller.id !== id));
		setExpandedId((prev) => (prev === id ? null : prev));
	};

	const handleSave = async (sellerData) => {
		if (sellerData?.id) {
			setSellers((prev) =>
				prev
					.map((seller) =>
						seller.id === sellerData.id ? { ...seller, ...sellerData } : seller
					)
					.sort((a, b) => {
						const aKey = (a.personType === "PF" ? a.name : a.companyName) || "";
						const bKey = (b.personType === "PF" ? b.name : b.companyName) || "";
						return aKey.localeCompare(bKey);
					})
			);
		} else {
			const nextId =
				sellers.length > 0
					? Math.max(...sellers.map((seller) => Number(seller.id) || 0)) + 1
					: 1;

			const newSeller = { ...sellerData, id: nextId };
			setSellers((prev) =>
				[...prev, newSeller].sort((a, b) => {
					const aKey = (a.personType === "PF" ? a.name : a.companyName) || "";
					const bKey = (b.personType === "PF" ? b.name : b.companyName) || "";
					return aKey.localeCompare(bKey);
				})
			);
		}

		setShowModal(false);
		setEditingSeller(null);
	};

	const toggleExpand = (id) => {
		setExpandedId((prev) => (prev === id ? null : id));
	};

	const openSalesModal = (seller) => {
		setSalesSeller(seller);
	};

	const closeSalesModal = () => {
		setSalesSeller(null);
	};

	const openSaleInOrders = (saleId) => {
		navigate(`/orders#${saleId}`);
		closeSalesModal();
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
				<div className="relative flex-1 max-w-sm">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
					<input
						placeholder="Buscar vendedor..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#d6ab4a]/30 focus:border-[#d6ab4a]"
					/>
				</div>

				<Button
					onClick={() => {
						setEditingSeller(null);
						setShowModal(true);
					}}
					className="bg-gradient-to-r from-[#b8891f] to-[#d6ab4a] text-white rounded-xl gap-2"
				>
					<Plus className="w-4 h-4" /> Novo Vendedor
				</Button>
			</div>

			<section className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
				{filtered.length === 0 ? (
					<div className="text-center py-16 text-gray-400">
						<ContactRound className="w-12 h-12 mx-auto mb-3 opacity-40" />
						<p>Nenhum vendedor encontrado</p>
					</div>
				) : (
					<div className="divide-y divide-gray-100">
						{filtered.map((seller) => {
							const expanded = expandedId === seller.id;
							const displayName =
								seller.personType === "PF" ? seller.name || "Sem nome" : seller.companyName || "Sem empresa";
							const initial = displayName?.[0] || "V";

							return (
								<div key={seller.id}>
									<div
										className="flex items-center gap-4 p-4 hover:bg-amber-50/40 transition-colors cursor-pointer"
										onClick={() => toggleExpand(seller.id)}
									>
										<div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#b8891f] to-[#d6ab4a] flex items-center justify-center flex-shrink-0">
											<span className="text-white font-bold">{initial}</span>
										</div>

										<div className="flex-1 min-w-0">
											<div className="flex flex-wrap items-center gap-2">
												<p className="font-semibold text-gray-900 truncate">{displayName}</p>
												<span className={`text-[11px] px-2 py-1 rounded-md font-semibold ${personTypeBadge[seller.personType]}`}>
													{seller.personType}
												</span>
											</div>
											<div className="flex flex-wrap gap-3 mt-0.5">
												{seller.phone && (
													<span className="flex items-center gap-1 text-xs text-gray-500">
														<Phone className="w-3 h-3" />
														{seller.phone}
													</span>
												)}
												{seller.email && (
													<span className="flex items-center gap-1 text-xs text-gray-500">
														<Mail className="w-3 h-3" />
														{seller.email}
													</span>
												)}
											</div>
										</div>

										<div className="hidden sm:flex items-center text-xs text-gray-500 gap-1">
											{expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
											<span>Detalhes</span>
										</div>

										<div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
											<Button
												variant="ghost"
												size="icon"
												onClick={() => {
													setEditingSeller(seller);
													setShowModal(true);
												}}
												className="w-8 h-8 text-gray-400 hover:text-[#b8891f]"
											>
												<Edit2 className="w-4 h-4" />
											</Button>

											<Button
												variant="ghost"
												size="icon"
												onClick={() => handleDelete(seller.id)}
												className="w-8 h-8 text-gray-400 hover:text-red-500"
											>
												<Trash2 className="w-4 h-4" />
											</Button>
										</div>
									</div>

									{expanded && (
										<div className="px-4 pb-4 -mt-1">
											<div className="bg-amber-50/45 border border-amber-100 rounded-xl p-4 grid md:grid-cols-4 gap-3 text-sm">
												<div>
													<p className="text-xs text-gray-500">{seller.personType === "PF" ? "Nome" : "Nome da empresa"}</p>
													<p className="font-medium text-gray-800">{seller.personType === "PF" ? seller.name : seller.companyName}</p>
												</div>

												<div>
													<p className="text-xs text-gray-500">Telefone</p>
													<p className="font-medium text-gray-800">{seller.phone || "-"}</p>
												</div>

												<div>
													<p className="text-xs text-gray-500">{seller.personType === "PF" ? "CPF" : "CNPJ"}</p>
													<p className="font-medium text-gray-800">{seller.personType === "PF" ? seller.cpf : seller.cnpj}</p>
												</div>

												<div>
													<p className="text-xs text-gray-500">Vendas vinculadas</p>
													{(seller.sales || []).length > 0 ? (
														<Button
															type="button"
															variant="outline"
															onClick={() => openSalesModal(seller)}
															className="mt-1 h-8 border-[#c7a04a] text-[#6a521f] hover:bg-[#f5e7c0]"
														>
															Ver vendas ({seller.sales.length})
														</Button>
													) : (
														<p className="font-medium text-gray-500 mt-1">Este vendedor ainda nao realizou uma venda.</p>
													)}
												</div>

												<div>
													<p className="text-xs text-gray-500">Endereco de referencia</p>
													<p className="font-medium text-gray-800">{seller.referenceAddress || "-"}</p>
												</div>

												<div>
													<p className="text-xs text-gray-500">Email</p>
													<p className="font-medium text-gray-800 break-all">{seller.email || "-"}</p>
												</div>

												<div>
													<p className="text-xs text-gray-500">Placa do veiculo</p>
													<p className="font-medium text-gray-800">{seller.vehiclePlate || "-"}</p>
												</div>
											</div>
										</div>
									)}
								</div>
							);
						})}
					</div>
				)}
			</section>

			{showModal && (
				<SellerModal
					seller={editingSeller}
					onClose={() => {
						setShowModal(false);
						setEditingSeller(null);
					}}
					onSave={handleSave}
				/>
			)}

			{salesSeller && (
				<ViewSells
					salesSeller={salesSeller}
					onClose={closeSalesModal}
					onOpenSale={openSaleInOrders}
				/>
			)}
		</div>
	);
}
