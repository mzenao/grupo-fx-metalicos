import { useState, useMemo, useEffect } from "react";
import { Calendar, Scale, DollarSign } from "lucide-react";
import InternalSupplierLayout, { useSectionContext } from "@/layouts/InternalSupplierLayout";
import { mockSession } from "@/services/mockSession";
import { getStoredPurchases } from "@/services/ordersData";
import { getStoredSuppliers } from "@/services/entityData";
import { materialTypes } from "@/services/mockDatabase";

// Utilities
const fmtMoney = (value) =>
	Number(value || 0).toLocaleString("pt-BR", {
		style: "currency",
		currency: "BRL",
		minimumFractionDigits: 2,
	});

const fmtDateTime = (iso) => {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return "-";
	return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};

function formatMaterial(purchase) {
	if (purchase?.materialTypeName) return purchase.materialTypeName;
	const found = materialTypes.find((type) => type.id === purchase?.materialTypeId);
	return found?.label || "Não especificado";
}

// Dashboard Section Component
function DashboardSection({ onOpenSale }) {
	const { setActiveSection } = useSectionContext();
	const [showAllMovements, setShowAllMovements] = useState(false);
	const suppliersById = useMemo(() => {
		const map = new Map();
		getStoredSuppliers().forEach((supplier) => {
			map.set(supplier.id, supplier);
		});
		return map;
	}, []);

	const purchases = useMemo(() => {
		const allPurchases = getStoredPurchases();
		return allPurchases
			.filter((purchase) => purchase.SupplierId === mockSession.currentSupplierId)
			.sort((a, b) => {
				const dateA = new Date(a.datetime || 0).getTime();
				const dateB = new Date(b.datetime || 0).getTime();
				if (dateB !== dateA) return dateB - dateA;
				return (Number(b.id) || 0) - (Number(a.id) || 0);
			});
	}, []);

	const summary = useMemo(() => {
		const totalPurchases = purchases.length;
		const totalWeight = purchases.reduce((sum, p) => sum + (Number(p.weight) || 0), 0);
		const totalValue = purchases.reduce((sum, p) => sum + (Number(p.value) || 0), 0);

		return {
			totalPurchases,
			totalWeight,
			totalValue,
			avgTicket: totalPurchases > 0 ? totalValue / totalPurchases : 0,
		};
	}, [purchases]);

	const purchaseGroupCards = [
		{
			id: "compras",
			title: "Compras registradas",
			value: summary.totalPurchases,
			sub: "Total acumulado",
			icon: Calendar,
			color: "from-[#b8891f] to-[#d6ab4a]",
			bg: "bg-amber-50",
		},
		{
			id: "peso",
			title: "Peso vendido",
			value: `${summary.totalWeight.toLocaleString("pt-BR")} kg`,
			sub: "Volume acumulado",
			icon: Scale,
			color: "from-emerald-500 to-teal-500",
			bg: "bg-emerald-50",
		},
		{
			id: "valor",
			title: "Valor total de vendas",
			value: fmtMoney(summary.totalValue),
			sub: `Ticket médio ${fmtMoney(summary.avgTicket)}`,
			icon: DollarSign,
			color: "from-sky-500 to-blue-500",
			bg: "bg-sky-50",
		},
	];

	const displayedPurchases = showAllMovements ? purchases : purchases.slice(0, 5);

	return (
		<section className="space-y-6 w-full">
			<div>
				<h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Dashboard</h2>
				<p className="text-gray-600 mb-6">Resumo acumulado das suas movimentações</p>
			</div>

			{/* Cards Grid */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
				{purchaseGroupCards.map((card) => {
					const Icon = card.icon;
					return (
						<div
							key={card.id}
							className={`p-6 rounded-xl border-2 border-gray-200 bg-white ${card.bg}`}
						>
							<div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${card.color} text-white mb-3`}>
								<Icon size={24} />
							</div>
							<h3 className="text-sm text-gray-600 font-medium mb-2">{card.title}</h3>
							<p className="text-3xl font-bold text-gray-900">{card.value}</p>
							<p className="text-xs text-gray-500 mt-2">{card.sub}</p>
						</div>
					);
				})}
			</div>

			{/* Movements Table */}
			<div className="mt-8">
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-lg font-semibold text-gray-900">Últimas Movimentações</h3>
				</div>

				{displayedPurchases.length === 0 ? (
					<div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-200">
						<p className="text-gray-500">Nenhuma movimentação encontrada</p>
					</div>
				) : (
					<div className="space-y-3">
						{displayedPurchases.map((purchase) => {
							const supplier = suppliersById.get(purchase.SupplierId);
							const supplierName = supplier
								? supplier.personType === "PF"
									? supplier.name
									: supplier.companyName
								: purchase.SupplierName || "-";

							return (
								<button
									type="button"
									key={purchase.id}
									onClick={() => {
										onOpenSale?.(purchase.id);
										setActiveSection("sales");
									}}
									className="w-full p-4 border border-gray-200 rounded-lg bg-white hover:bg-amber-50/40 hover:border-amber-300 transition-all text-left"
								>
									<div className="flex items-center justify-between mb-2">
										<p className="font-bold text-gray-900">Venda #{purchase.id}</p>
										<p className="text-sm font-semibold text-gray-900">{fmtMoney(purchase.value)}</p>
									</div>
									<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
										<p className="text-gray-700 break-words"><span className="text-gray-500">Fornecedor:</span> {supplierName} #{purchase.SupplierId + 200}</p>
										<p className="text-gray-700 break-words"><span className="text-gray-500">Funcionário:</span> {purchase.employeeName || "-"}</p>
										<p className="text-gray-700"><span className="text-gray-500">Peso:</span> {purchase.weight || "0"} kg</p>
										<p className="text-gray-700 break-words"><span className="text-gray-500">Tipo:</span> {formatMaterial(purchase)}</p>
										<p className="text-gray-700"><span className="text-gray-500">Valor total:</span> {fmtMoney(purchase.value)}</p>
										<p className="text-gray-700"><span className="text-gray-500">Valor por kg:</span> {fmtMoney(purchase.valuePerKg)}</p>
										<p className="text-gray-700"><span className="text-gray-500">Data e hora:</span> {fmtDateTime(purchase.datetime)}</p>
									</div>
								</button>
							);
						})}
					</div>
				)}

				{purchases.length > 5 && (
					<button
						onClick={() => setShowAllMovements(!showAllMovements)}
						className="mt-4 w-full py-2 text-amber-700 font-semibold hover:bg-amber-50 rounded-lg transition-colors"
					>
						{showAllMovements ? "Mostrar menos" : "Exibir mais"}
					</button>
				)}
			</div>
		</section>
	);
}

// Main SupplierPortal Component
function SupplierPortalContent() {
	const { activeSection } = useSectionContext();
	const [selectedSaleId, setSelectedSaleId] = useState("");

	return (
		<div className="w-full max-w-6xl mx-auto">
			{activeSection === "dashboard" && <DashboardSection onOpenSale={(saleId) => setSelectedSaleId(String(saleId))} />}
			{activeSection === "sales" && <SalesPortalWrapper initialSearchId={selectedSaleId} />}
			{activeSection === "account" && <AccountPortalWrapper />}
		</div>
	);
}

// Wrapper for Sells when used in portal (removes navbar padding)
function SalesPortalWrapper({ initialSearchId = "" }) {
	const [searchId, setSearchId] = useState(initialSearchId || "");

	useEffect(() => {
		if (initialSearchId !== undefined && initialSearchId !== null) {
			setSearchId(String(initialSearchId));
		}
	}, [initialSearchId]);
	
	const currentSupplier = useMemo(() => {
		const suppliers = getStoredSuppliers();
		return suppliers.find((supplier) => supplier.id === mockSession.currentSupplierId) || null;
	}, []);

	const suppliersById = useMemo(() => {
		const map = new Map();
		getStoredSuppliers().forEach((supplier) => {
			map.set(supplier.id, supplier);
		});
		return map;
	}, []);

	const userPurchases = useMemo(() => {
		const allPurchases = getStoredPurchases();
		return allPurchases
			.filter((purchase) => purchase.SupplierId === mockSession.currentSupplierId)
			.sort((a, b) => {
				const dateA = new Date(a.datetime || 0).getTime();
				const dateB = new Date(b.datetime || 0).getTime();
				if (dateB !== dateA) return dateB - dateA;
				return (Number(b.id) || 0) - (Number(a.id) || 0);
			});
	}, []);

	const filteredPurchases = useMemo(() => {
		if (!searchId || !searchId.trim()) return userPurchases;
		return userPurchases.filter((purchase) => String(purchase.id).includes(searchId.trim()));
	}, [userPurchases, searchId]);

	return (
		<section className="space-y-6 w-full">
			<div>
				<h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Minhas Vendas</h2>
				{currentSupplier && (
					<p className="text-sm text-gray-600 mt-1 break-words">
						{currentSupplier.personType === "PF" ? currentSupplier.name : currentSupplier.companyName}
					</p>
				)}
			</div>

			<div>
				<input
					type="text"
					placeholder="Pesquisar por ID da venda..."
					value={searchId || ""}
					onChange={(e) => setSearchId(e.target.value)}
					className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
				/>
			</div>
			{userPurchases.length === 0 ? (
				<div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-200">
					<p className="text-gray-500">Você ainda não possui vendas registradas</p>
				</div>
			) : filteredPurchases.length === 0 ? (
				<div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-200">
					<p className="text-gray-500">Nenhuma venda encontrada com este ID</p>
				</div>
			) : (
				<div className="space-y-3">
					{filteredPurchases.map((purchase) => {
						const saleSupplier = suppliersById.get(purchase.SupplierId);
						return (
							<div key={purchase.id} className="rounded-lg border border-amber-100 bg-white shadow-sm overflow-hidden">
								<header className="px-4 py-3 bg-gradient-to-r from-amber-50 to-amber-25 border-b border-amber-100">
									<h3 className="text-base font-bold text-slate-900">Venda #{purchase.id}</h3>
								</header>

								<div className="p-4 space-y-4">
									<div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
										<div>
											<p className="text-xs text-gray-500 mb-1">Fornecedor</p>
												<p className="font-semibold text-gray-900">{saleSupplier ? (saleSupplier.personType === "PF" ? saleSupplier.name : saleSupplier.companyName) : purchase.SupplierName || "-"} #{purchase.SupplierId + 200}</p>
										</div>
										<div>
											<p className="text-xs text-gray-500 mb-1">Tipo de Material</p>
											<p className="font-semibold text-gray-900">{formatMaterial(purchase)}</p>
										</div>
										<div>
											<p className="text-xs text-gray-500 mb-1">Peso</p>
											<p className="font-semibold text-gray-900">{purchase.weight || "0"} kg</p>
										</div>
										<div>
											<p className="text-xs text-gray-500 mb-1">Valor por kg</p>
											<p className="font-semibold text-gray-900">{fmtMoney(purchase.valuePerKg)}</p>
										</div>
										<div>
											<p className="text-xs text-gray-500 mb-1">Valor Total</p>
											<p className="font-semibold text-gray-900">{fmtMoney(purchase.value)}</p>
										</div>
										<div>
											<p className="text-xs text-gray-500 mb-1">Data e Hora</p>
											<p className="font-semibold text-gray-900">{fmtDateTime(purchase.datetime)}</p>
										</div>
									</div>

									<div className="pt-3 border-t border-amber-100">
										<p className="text-xs text-gray-500 mb-1">Funcionário Responsável</p>
										<p className="font-semibold text-gray-900">{purchase.employeeName || "-"}</p>
									</div>

										<div className="pt-3 border-t border-amber-100">
											<p className="text-sm font-semibold text-gray-700 mb-3">
												📎 Comprovantes e Tickets ({purchase.attachmentNames?.length || 0})
											</p>
											{purchase.attachmentNames?.length > 0 ? (
												<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
													{purchase.attachmentNames.map((name, idx) => {
														const extension = name.split(".").pop()?.toLowerCase() || "file";
														const getFileEmoji = (ext) => {
															if (["pdf"].includes(ext)) return "📄";
															if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "📄";
															return "📎";
														};
														return (
															<div key={idx} className="group/preview cursor-pointer">
																<div className="border-2 border-dashed border-amber-200 rounded-lg p-3 bg-amber-50/50 hover:bg-amber-100/50 hover:border-amber-300 transition-all flex flex-col items-center justify-center min-h-24">
																	<p className="text-3xl mb-2">{getFileEmoji(extension)}</p>
																	<p className="text-xs text-gray-600 text-center break-all line-clamp-2">{name}</p>
																	<p className="text-xs text-gray-500 mt-1 uppercase">{extension}</p>
																</div>
															</div>
														);
													})}
												</div>
											) : (
												<div className="border-2 border-dashed border-gray-200 rounded-lg p-6 bg-gray-50/50 text-center">
													<p className="text-sm text-gray-500">Nenhum comprovante anexado</p>
												</div>
											)}
										</div>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</section>
	);
}

// Wrapper for Account when used in portal (removes navbar padding)
function AccountPortalWrapper() {
	const accountType = mockSession.accountType;
	const isPf = accountType === "pf";

	const currentSupplier = useMemo(() => {
		const suppliers = getStoredSuppliers();
		return suppliers.find((supplier) => supplier.id === mockSession.currentSupplierId) || null;
	}, []);

	const initialFormData = useMemo(() => {
		if (!currentSupplier) {
			return {
				nomeOuEmpresa: mockSession.currentUserName || "",
				documento: "",
				email: mockSession.currentUserEmail || "",
				telefone: "",
				enderecoUnificado: "",
				senhaAtual: "",
				novaSenha: "",
				confirmarNovaSenha: "",
			};
		}

		return {
			nomeOuEmpresa: isPf ? currentSupplier.name || "" : currentSupplier.companyName || "",
			documento: isPf ? currentSupplier.cpf || "" : currentSupplier.cnpj || "",
			email: currentSupplier.email || mockSession.currentUserEmail || "",
			telefone: currentSupplier.phone || "",
			enderecoUnificado: currentSupplier.referenceAddress || "",
			senhaAtual: "",
			novaSenha: "",
			confirmarNovaSenha: "",
		};
	}, [currentSupplier, isPf]);

	const [formData, setFormData] = useState(initialFormData);

	const handleChange = (event) => {
		const { name, value } = event.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleSubmit = (event) => {
		event.preventDefault();

		if (formData.novaSenha || formData.confirmarNovaSenha || formData.senhaAtual) {
			if (!formData.senhaAtual || !formData.novaSenha || !formData.confirmarNovaSenha) {
				window.alert("Para alterar a senha, preencha senha atual, nova senha e confirmação.");
				return;
			}

			if (formData.novaSenha !== formData.confirmarNovaSenha) {
				window.alert("A confirmação da nova senha não confere.");
				return;
			}
		}

		console.log("Dados atualizados:", formData);
		window.alert("Dados salvos localmente. Integração com backend pendente.");
	};

	const personTypeBadge = {
		PF: "bg-sky-100 text-sky-800",
		PJ: "bg-amber-100 text-amber-800",
	};

	return (
		<section className="space-y-6 w-full">
			<div>
				<h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Minha Conta</h2>
				{currentSupplier && (
					<div className="mb-4 flex flex-wrap items-center gap-2">
						<p className="text-base font-semibold text-slate-900 break-words">
							{isPf ? currentSupplier.name : currentSupplier.companyName}
						</p>
						{currentSupplier.supplierCode && (
							<span className={"text-base font-semibold text-slate-900"}>
								#{currentSupplier.supplierCode}
							</span>
						)}
						<span className={`text-[11px] px-2 py-1 rounded-md font-semibold ${personTypeBadge[currentSupplier.personType] || personTypeBadge[isPf ? "PF" : "PJ"]}`}>
							{currentSupplier.personType || (isPf ? "PF" : "PJ")}
						</span>
					</div>
				)}
			</div>

			<form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
				{/* Personal Info */}
				<div className="space-y-4">
					<h3 className="text-lg font-semibold text-gray-900">Informações Pessoais</h3>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							{isPf ? "Nome" : "Razão Social"}
						</label>
						<input
							type="text"
							name="nomeOuEmpresa"
							value={formData.nomeOuEmpresa}
							onChange={handleChange}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							{isPf ? "CPF" : "CNPJ"}
						</label>
						<input
							type="text"
							name="documento"
							value={formData.documento}
							onChange={handleChange}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
						/>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
							<input
								type="email"
								name="email"
								value={formData.email}
								onChange={handleChange}
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
							<input
								type="tel"
								name="telefone"
								value={formData.telefone}
								onChange={handleChange}
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
							/>
						</div>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
						<input
							type="text"
							name="enderecoUnificado"
							value={formData.enderecoUnificado}
							onChange={handleChange}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
						/>
					</div>
				</div>

				{/* Password Change */}
				<div className="space-y-4">
					<h3 className="text-lg font-semibold text-gray-900">Alterar Senha</h3>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Senha Atual</label>
						<input
							type="password"
							name="senhaAtual"
							value={formData.senhaAtual}
							onChange={handleChange}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
						/>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
							<input
								type="password"
								name="novaSenha"
								value={formData.novaSenha}
								onChange={handleChange}
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nova Senha</label>
							<input
								type="password"
								name="confirmarNovaSenha"
								value={formData.confirmarNovaSenha}
								onChange={handleChange}
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
							/>
						</div>
					</div>
				</div>

				<button
					type="submit"
					className="px-6 py-2 bg-gradient-to-r from-[#b8891f] to-[#d6ab4a] text-white font-semibold rounded-lg hover:shadow-lg transition-shadow"
				>
					Salvar Alterações
				</button>
			</form>
		</section>
	);
}

export default function SupplierPortal() {
	return (
		<InternalSupplierLayout>
			<SupplierPortalContent />
		</InternalSupplierLayout>
	);
}
