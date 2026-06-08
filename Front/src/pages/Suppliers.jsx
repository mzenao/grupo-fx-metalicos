import { useEffect, useMemo, useState } from "react";
import {
	Plus,
	Search,
	Edit2,
	Trash2,
	ContactRound,
	Phone,
	Mail,
	KeyRound,
	ChevronDown,
	ChevronUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SupplierModal from "@/components/internal/supplierModal.jsx";
import ViewSells from "@/components/internal/viewSells.jsx";
import ErrorModal from "@/components/internal/errorModal";
import ConfirmDeleteModal from "@/components/internal/confirmDeleteModal";
import {
	createSupplier,
	deleteSupplier,
	fetchSuppliers,
	updateSupplier,
} from "@/services/entityData";
import { fetchPurchases } from "@/services/ordersData";
import { fetchAdvances } from "@/services/advancesData";

const personTypeBadge = {
	PF: "bg-sky-100 text-sky-800",
	PJ: "bg-amber-100 text-amber-800",
};

function formatSupplierPix(supplier) {
	if (!supplier) return "";
	const keyType = (supplier.pixKeyType || (supplier.personType === "PF" ? "cpf" : "cnpj")).toLowerCase();
	const pixKeyValue = String(supplier.pixKeyValue || "").trim();
	const digits = (value) => String(value || "").replace(/\D/g, "");

	if (keyType === "cpf") {
		const cpf = digits(supplier.cpf).slice(0, 11);
		if (cpf.length !== 11) return "";
		return `(CPF) ${cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}`;
	}

	if (keyType === "cnpj") {
		const cnpj = digits(supplier.cnpj).slice(0, 14);
		if (cnpj.length !== 14) return "";
		return `(CNPJ) ${cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")}`;
	}

	if (keyType === "phone") return pixKeyValue ? `(PHONE) ${pixKeyValue}` : "";
	if (keyType === "email") return pixKeyValue ? `(EMAIL) ${pixKeyValue}` : "";
	if (keyType === "random") return pixKeyValue ? `(RANDOM) ${pixKeyValue}` : "";
	return "";
}

function getNextSupplierCode(suppliers) {
	const maxCode = (Array.isArray(suppliers) ? suppliers : []).reduce((max, supplier) => {
		const code = Number(supplier?.supplierCode);
		if (!Number.isFinite(code) || code < 200) return max;
		return Math.max(max, code);
	}, 199);

	return maxCode + 1;
}

function formatMoney(value) {
	return Number(value || 0).toLocaleString("pt-BR", {
		style: "currency",
		currency: "BRL",
		minimumFractionDigits: 2,
	});
}

export default function Suppliers() {
	const navigate = useNavigate();
	const [suppliers, setSuppliers] = useState([]);
	const [purchases, setPurchases] = useState([]);
	const [advances, setAdvances] = useState([]);
	const [search, setSearch] = useState("");
	const [showModal, setShowModal] = useState(false);
	const [editingSupplier, setEditingSupplier] = useState(null);
	const [expandedId, setExpandedId] = useState(null);
	const [salesSupplier, setSalesSupplier] = useState(null);
	const [loading, setLoading] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null, itemLabel: "", password: "" });
	const [deleting, setDeleting] = useState(false);
	const [errorModal, setErrorModal] = useState({ open: false, title: "", message: "" });

	useEffect(() => {
		let mounted = true;
		setLoading(true);

		Promise.all([fetchSuppliers(), fetchPurchases(), fetchAdvances()])
			.then(([suppliersData, purchasesData, advancesData]) => {
				if (mounted) {
					setSuppliers(suppliersData);
					setPurchases(purchasesData);
					setAdvances(advancesData);
				}
			})
			.catch((err) => {
				setErrorModal({
					open: true,
					title: "Erro ao carregar",
					message: err?.message || "Erro ao carregar fornecedores",
				});
			})
			.finally(() => {
				if (mounted) setLoading(false);
			});

		return () => {
			mounted = false;
		};
	}, []);

	const purchasesBySupplierId = useMemo(() => {
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
	}, [purchases]);

	const advanceDebtBySupplierId = useMemo(() => {
		const grouped = new Map();
		advances.forEach((advance) => {
			const supplierId = advance.SupplierId;
			if (!supplierId) return;
			grouped.set(supplierId, (grouped.get(supplierId) || 0) + (Number(advance.valueRemaining) || 0));
		});
		return grouped;
	}, [advances]);

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return suppliers;

		return suppliers.filter((supplier) => {
			const primaryName = (supplier.personType === "PF" ? supplier.name : supplier.companyName) || "";
			const extraPlates = Array.isArray(supplier.vehiclePlatesExtra) ? supplier.vehiclePlatesExtra.join(" ") : "";
			const normalized = [
				supplier.supplierCode,
				primaryName,
				supplier.personType,
				supplier.phone,
				supplier.email,
				supplier.cpf,
				supplier.cnpj,
				supplier.vehiclePlate,
				supplier.referenceAddress,
				extraPlates,
			]
				.join(" ")
				.toLowerCase();

			return normalized.includes(q);
		});
	}, [suppliers, search]);

	const handleDeleteConfirm = async () => {
		const id = confirmDelete.id;
		if (!id) return;
		if (!String(confirmDelete.password || "").trim()) return;

		const hasSales = (purchasesBySupplierId.get(id) || []).length > 0;
		if (hasSales) {
			setConfirmDelete({ open: false, id: null, itemLabel: "", password: "" });
			setErrorModal({
				open: true,
				title: "Exclusao nao permitida",
				message: "Nao e possivel excluir fornecedor com vendas registradas.",
			});
			return;
		}

		setDeleting(true);
		try {
			await deleteSupplier(id, confirmDelete.password);
			setSuppliers((prev) => prev.filter((supplier) => supplier.id !== id));
			setExpandedId((prev) => (prev === id ? null : prev));
			setConfirmDelete({ open: false, id: null, itemLabel: "", password: "" });
		} catch (err) {
			const errorMessage = err?.message || "Erro ao remover fornecedor";
			if (/senha atual invalida/i.test(errorMessage)) {
				setConfirmDelete({ open: false, id: null, itemLabel: "", password: "" });
			}

			setErrorModal({
				open: true,
				title: "Erro ao remover",
				message: errorMessage,
			});
		} finally {
			setDeleting(false);
		}
	};

	const handleSave = async (SupplierData) => {
		if (SupplierData?.id) {
			const updated = await updateSupplier(SupplierData.id, SupplierData);
			const updatedWithPix = { ...updated, pixKeyType: SupplierData.pixKeyType || updated.pixKeyType };
			setSuppliers((prev) =>
				prev
					.map((supplier) =>
						supplier.id === updated.id ? updatedWithPix : supplier
					)
					.sort((a, b) => {
						const aKey = (a.personType === "PF" ? a.name : a.companyName) || "";
						const bKey = (b.personType === "PF" ? b.name : b.companyName) || "";
						return aKey.localeCompare(bKey);
					})
			);
		} else {
			const newSupplier = await createSupplier(SupplierData);
			const newSupplierWithPix = { ...newSupplier, pixKeyType: SupplierData.pixKeyType || newSupplier.pixKeyType };
			setSuppliers((prev) =>
				[...prev, newSupplierWithPix].sort((a, b) => {
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
				{loading ? (
					<div className="text-center py-16 text-gray-400">Carregando...</div>
				) : filtered.length === 0 ? (
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
							const debtBalance = advanceDebtBySupplierId.get(supplier.id) || 0;
							const positiveBalance = Number(supplier.advanceCreditBalance || 0);

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
												{supplier.supplierCode && (
													<span className={`text-[11px] px-2 py-1 rounded-md font-semibold ${personTypeBadge[supplier.personType]}`}>
														{supplier.supplierCode + 200}
													</span>
												)}
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
												<span className="text-xs font-semibold text-red-700">
													Devedor: {formatMoney(debtBalance)}
												</span>
												<span className="text-xs font-semibold text-emerald-700">
													Positivo: {formatMoney(positiveBalance)}
												</span>
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
												onClick={() => setConfirmDelete({ open: true, id: supplier.id, itemLabel: `Fornecedor: ${displayName}`, password: "" })}
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
													<div className="mt-1 flex flex-wrap items-center gap-2">
														<p className="font-medium text-gray-800">{displayName}</p>
													</div>
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
													<p className="text-xs text-gray-500">Saldo devedor</p>
													<p className="font-medium text-red-700">{formatMoney(debtBalance)}</p>
												</div>

												<div>
													<p className="text-xs text-gray-500">Saldo positivo</p>
													<p className="font-medium text-emerald-700">{formatMoney(positiveBalance)}</p>
												</div>

												<div>
													<p className="text-xs text-gray-500">Endereco de referencia</p>
													<p className="font-medium text-gray-800">{supplier.referenceAddress || "-"}</p>
												</div>

												<div>
													<p className="text-xs text-gray-500">Email</p>
													<p className="font-medium text-gray-800 break-all">{supplier.email || "-"}</p>
												</div>

												<div className="md:col-span-2 rounded-xl border border-[#d6ab4a]/35 bg-white/75 p-3">
													<div className="flex items-start gap-3">
														<div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#f5e7c0] text-[#7b6024]">
															<KeyRound className="h-4 w-4" />
														</div>
														<div className="min-w-0">
															<p className="text-xs font-semibold uppercase tracking-wide text-[#7b6024]">Chave Pix</p>
															<p className="mt-1 break-all text-base font-semibold text-[#4a3918]">{formatSupplierPix(supplier) || "-"}</p>
														</div>
													</div>
												</div>

												<div>
													<p className="text-xs text-gray-500">Placa do veiculo</p>
													<p className="font-medium text-gray-800">{supplier.vehiclePlate || "-"}</p>
												</div>

												<div className="md:col-span-2">
													<p className="text-xs text-gray-500">Placas adicionais</p>
													<div className="mt-1 flex flex-wrap gap-2">
														{Array.isArray(supplier.vehiclePlatesExtra) && supplier.vehiclePlatesExtra.length > 0 ? (
															supplier.vehiclePlatesExtra.map((plate) => (
																<span key={plate} className="px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold border border-amber-200">
																	{plate}
																</span>
															))
														) : (
															<p className="font-medium text-gray-500">-</p>
														)}
													</div>
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

			<ConfirmDeleteModal
				open={confirmDelete.open}
				title="Excluir fornecedor"
				message="Tem certeza que deseja excluir este fornecedor? Esta acao nao pode ser desfeita."
				itemLabel={confirmDelete.itemLabel}
				password={confirmDelete.password}
				onPasswordChange={(password) => setConfirmDelete((prev) => ({ ...prev, password }))}
				onCancel={() => setConfirmDelete({ open: false, id: null, itemLabel: "", password: "" })}
				onConfirm={handleDeleteConfirm}
				loading={deleting}
			/>

			<ErrorModal
				open={errorModal.open}
				title={errorModal.title}
				message={errorModal.message}
				onClose={() => setErrorModal((prev) => ({ ...prev, open: false }))}
			/>
		</div>
	);
}
