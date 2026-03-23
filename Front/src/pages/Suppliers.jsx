import { useEffect, useMemo, useState } from "react";
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
import SupplierModal from "@/components/internal/supplierModal.jsx";
import ViewSells from "@/components/internal/viewSells.jsx";
import { getStoredSuppliers, saveSuppliers } from "@/services/entityData";
import { getStoredPurchases } from "@/services/ordersData";

const personTypeBadge = {
	PF: "bg-sky-100 text-sky-800",
	PJ: "bg-amber-100 text-amber-800",
};

export default function Suppliers() {
	const navigate = useNavigate();
	const [suppliers, setSuppliers] = useState(() => getStoredSuppliers());
	const [search, setSearch] = useState("");
	const [showModal, setShowModal] = useState(false);
	const [editingSupplier, setEditingSupplier] = useState(null);
	const [expandedId, setExpandedId] = useState(null);
	const [salesSupplier, setSalesSupplier] = useState(null);

	useEffect(() => {
		saveSuppliers(suppliers);
	}, [suppliers]);

	const purchasesBySupplierId = useMemo(() => {
		const purchases = getStoredPurchases();
		const grouped = new Map();

		purchases.forEach((purchase) => {
			const supplierId = purchase.SupplierId;
			if (!supplierId) return;

			const list = grouped.get(supplierId) || [];
			list.push({
				id: purchase.id,
				value: Number(purchase.value) || 0,
				date: (purchase.datetime || "").split("T")[0] || "",
			});
			grouped.set(supplierId, list);
		});

		return grouped;
	}, []);

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return suppliers;

		return suppliers.filter((supplier) => {
			const primaryName = (supplier.personType === "PF" ? supplier.name : supplier.companyName) || "";
			const normalized = [
				primaryName,
				supplier.personType,
				supplier.phone,
				supplier.email,
				supplier.cpf,
				supplier.cnpj,
				supplier.vehiclePlate,
				supplier.referenceAddress,
			]
				.join(" ")
				.toLowerCase();

			return normalized.includes(q);
		});
	}, [suppliers, search]);

	const handleDelete = (id) => {
		if (!window.confirm("Remover este Fornecedor?")) return;
		setSuppliers((prev) => prev.filter((supplier) => supplier.id !== id));
		setExpandedId((prev) => (prev === id ? null : prev));
	};

	const handleSave = async (SupplierData) => {
		if (SupplierData?.id) {
			setSuppliers((prev) =>
				prev
					.map((supplier) =>
						supplier.id === SupplierData.id ? { ...supplier, ...SupplierData } : supplier
					)
					.sort((a, b) => {
						const aKey = (a.personType === "PF" ? a.name : a.companyName) || "";
						const bKey = (b.personType === "PF" ? b.name : b.companyName) || "";
						return aKey.localeCompare(bKey);
					})
			);
		} else {
			const nextId =
				suppliers.length > 0
					? Math.max(...suppliers.map((supplier) => Number(supplier.id) || 0)) + 1
					: 1;

			const newSupplier = { ...SupplierData, id: nextId };
			setSuppliers((prev) =>
				[...prev, newSupplier].sort((a, b) => {
					const aKey = (a.personType === "PF" ? a.name : a.companyName) || "";
					const bKey = (b.personType === "PF" ? b.name : b.companyName) || "";
					return aKey.localeCompare(bKey);
				})
			);
		}

		setShowModal(false);
		setEditingSupplier(null);
	};

	const toggleExpand = (id) => {
		setExpandedId((prev) => (prev === id ? null : id));
	};

	const openSalesModal = (Supplier) => {
		setSalesSupplier({
			...Supplier,
			sales: purchasesBySupplierId.get(Supplier.id) || [],
		});
	};

	const closeSalesModal = () => {
		setSalesSupplier(null);
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
						placeholder="Buscar Fornecedor..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#d6ab4a]/30 focus:border-[#d6ab4a]"
					/>
				</div>

				<Button
					onClick={() => {
						setEditingSupplier(null);
						setShowModal(true);
					}}
					className="bg-gradient-to-r from-[#b8891f] to-[#d6ab4a] text-white rounded-xl gap-2"
				>
					<Plus className="w-4 h-4" /> Novo Fornecedor
				</Button>
			</div>

			<section className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
				{filtered.length === 0 ? (
					<div className="text-center py-16 text-gray-400">
						<ContactRound className="w-12 h-12 mx-auto mb-3 opacity-40" />
						<p>Nenhum Fornecedor encontrado</p>
					</div>
				) : (
					<div className="divide-y divide-gray-100">
						{filtered.map((supplier) => {
							const expanded = expandedId === supplier.id;
							const displayName =
								supplier.personType === "PF" ? supplier.name || "Sem nome" : supplier.companyName || "Sem empresa";
							const initial = displayName?.[0] || "V";

							return (
								<div key={supplier.id}>
									<div
										className="flex items-center gap-4 p-4 hover:bg-amber-50/40 transition-colors cursor-pointer"
										onClick={() => toggleExpand(supplier.id)}
									>
										<div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#b8891f] to-[#d6ab4a] flex items-center justify-center flex-shrink-0">
											<span className="text-white font-bold">{initial}</span>
										</div>

										<div className="flex-1 min-w-0">
											<div className="flex flex-wrap items-center gap-2">
												<p className="font-semibold text-gray-900 truncate">{displayName}</p>
												<span className={`text-[11px] px-2 py-1 rounded-md font-semibold ${personTypeBadge[supplier.personType]}`}>
													{supplier.personType}
												</span>
											</div>
											<div className="flex flex-wrap gap-3 mt-0.5">
												{supplier.phone && (
													<span className="flex items-center gap-1 text-xs text-gray-500">
														<Phone className="w-3 h-3" />
														{supplier.phone}
													</span>
												)}
												{supplier.email && (
													<span className="flex items-center gap-1 text-xs text-gray-500">
														<Mail className="w-3 h-3" />
														{supplier.email}
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
													setEditingSupplier(supplier);
													setShowModal(true);
												}}
												className="w-8 h-8 text-gray-400 hover:text-[#b8891f]"
											>
												<Edit2 className="w-4 h-4" />
											</Button>

											<Button
												variant="ghost"
												size="icon"
												onClick={() => handleDelete(supplier.id)}
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
													<p className="text-xs text-gray-500">{supplier.personType === "PF" ? "Nome" : "Nome da empresa"}</p>
													<p className="font-medium text-gray-800">{supplier.personType === "PF" ? supplier.name : supplier.companyName}</p>
												</div>

												<div>
													<p className="text-xs text-gray-500">Telefone</p>
													<p className="font-medium text-gray-800">{supplier.phone || "-"}</p>
												</div>

												<div>
													<p className="text-xs text-gray-500">{supplier.personType === "PF" ? "CPF" : "CNPJ"}</p>
													<p className="font-medium text-gray-800">{supplier.personType === "PF" ? supplier.cpf : supplier.cnpj}</p>
												</div>

												<div>
													<p className="text-xs text-gray-500">Vendas vinculadas</p>
													{(purchasesBySupplierId.get(supplier.id) || []).length > 0 ? (
														<Button
															type="button"
															variant="outline"
															onClick={() => openSalesModal(supplier)}
															className="mt-1 h-8 border-[#c7a04a] text-[#6a521f] hover:bg-[#f5e7c0]"
														>
															Ver vendas ({(purchasesBySupplierId.get(supplier.id) || []).length})
														</Button>
													) : (
														<p className="font-medium text-gray-500 mt-1">Este Fornecedor ainda nao realizou uma venda.</p>
													)}
												</div>

												<div>
													<p className="text-xs text-gray-500">Endereco de referencia</p>
													<p className="font-medium text-gray-800">{supplier.referenceAddress || "-"}</p>
												</div>

												<div>
													<p className="text-xs text-gray-500">Email</p>
													<p className="font-medium text-gray-800 break-all">{supplier.email || "-"}</p>
												</div>

												<div>
													<p className="text-xs text-gray-500">Placa do veiculo</p>
													<p className="font-medium text-gray-800">{supplier.vehiclePlate || "-"}</p>
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
				<SupplierModal
					Supplier={editingSupplier}
					onClose={() => {
						setShowModal(false);
						setEditingSupplier(null);
					}}
					onSave={handleSave}
				/>
			)}

			{salesSupplier && (
				<ViewSells
					salesSupplier={salesSupplier}
					onClose={closeSalesModal}
					onOpenSale={openSaleInOrders}
				/>
			)}
		</div>
	);
}
