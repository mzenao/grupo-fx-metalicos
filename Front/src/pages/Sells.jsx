import { useMemo, useState } from "react";
import { Paperclip } from "lucide-react";
import { mockSession } from "@/services/mockSession";
import { getStoredPurchases } from "@/services/ordersData";
import { getStoredSuppliers } from "@/services/entityData";
import { materialTypes } from "@/services/mockDatabase";

const personTypeBadge = {
	PF: "bg-sky-100 text-sky-800",
	PJ: "bg-amber-100 text-amber-800",
};

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

export default function Sells() {
	const [searchId, setSearchId] = useState("");
	const isUser = mockSession.role === "user";
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
		if (!searchId.trim()) return userPurchases;
		return userPurchases.filter((purchase) => String(purchase.id).includes(searchId.trim()));
	}, [userPurchases, searchId]);

	if (!isUser) {
		return (
			<main className="pt-28 pb-14 px-6 max-w-4xl mx-auto w-full">
				<section className="rounded-2xl border border-amber-200 bg-white p-8 shadow-sm">
					<h1 className="text-2xl font-bold text-slate-900 mb-2">Minhas Vendas</h1>
					<p className="text-slate-600">Esta área está disponível apenas para fornecedores.</p>
				</section>
			</main>
		);
	}

	return (
		<main className="pt-28 pb-14 px-6 max-w-6xl mx-auto w-full">
			<section className="rounded-3xl border border-amber-200/80 bg-white/95 shadow-[0_14px_34px_rgba(30,22,8,0.08)] overflow-hidden">
				<header className="px-8 py-7 bg-gradient-to-r from-[#1e1608] to-[#3a2a10] text-amber-50">
					<h1 className="text-2xl md:text-3xl font-bold">Minhas Vendas</h1>
					{currentSupplier && (
						<div className="mt-3 flex flex-wrap items-center gap-2">
							<p className="text-sm md:text-base font-semibold text-amber-50">
								{currentSupplier.personType === "PF" ? currentSupplier.name : currentSupplier.companyName}
							</p>
							{currentSupplier.supplierCode && (
								<span className={`text-[11px] px-2 py-1 rounded-md font-semibold ${personTypeBadge[currentSupplier.personType]}`}>
									{currentSupplier.supplierCode}
								</span>
							)}
							<span className={`text-[11px] px-2 py-1 rounded-md font-semibold ${personTypeBadge[currentSupplier.personType]}`}>
								{currentSupplier.personType}
							</span>
						</div>
					)}
					<p className="text-amber-100/85 text-sm md:text-base mt-2">
						Essas vendas são as mesmas cadastradas em Orders, com exibição dedicada para o fornecedor.
					</p>
				</header>

				<div className="p-8 space-y-6">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<SummaryCard label="Total de vendas" value={`${userPurchases.length}`} />
					<SummaryCard
						label="Comprovantes anexados"
						value={`${userPurchases.reduce((sum, purchase) => sum + (purchase.attachmentNames?.length || 0), 0)}`}
					/>
				</div>

				<div>
					<input
						type="text"
						placeholder="Pesquisar por ID da venda..."
						value={searchId}
						onChange={(e) => setSearchId(e.target.value)}
						className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
					/>
				</div>

				{userPurchases.length === 0 ? (
					<div className="rounded-2xl border border-amber-100 bg-amber-50/45 p-8 text-center">
						<p className="text-slate-700 font-medium">Nenhuma venda encontrada para este fornecedor.</p>
					</div>
				) : filteredPurchases.length === 0 ? (
					<div className="rounded-2xl border border-amber-100 bg-amber-50/45 p-8 text-center">
						<p className="text-slate-700 font-medium">Nenhuma venda encontrada com este ID.</p>
					</div>
				) : (
					<div className="space-y-4">
						{filteredPurchases.map((purchase) => {
							const saleSupplier = suppliersById.get(purchase.SupplierId);
							return (
								<div key={purchase.id} className="rounded-2xl border border-amber-100 bg-white shadow-sm overflow-hidden">
									<header className="px-6 py-4 bg-gradient-to-r from-amber-50 to-amber-25 border-b border-amber-100">
										<h3 className="text-lg font-bold text-slate-900">Venda #{purchase.id}</h3>
									</header>

									<div className="p-6 space-y-6">
										<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
											<InfoSection label="Fornecedor" value={`${saleSupplier ? (saleSupplier.personType === "PF" ? saleSupplier.name : saleSupplier.companyName) : purchase.SupplierName || "-"} #${purchase.SupplierId + 200}`} />
											<InfoSection label="Tipo de Material" value={formatMaterial(purchase)} />
											<InfoSection label="Peso" value={`${purchase.weight || "0"} kg`} />
											<InfoSection label="Valor por kg" value={fmtMoney(purchase.valuePerKg)} />
											<InfoSection label="Valor Total" value={fmtMoney(purchase.value)} />
											<InfoSection label="Data e Hora" value={fmtDateTime(purchase.datetime)} />
										</div>

										<div className="pt-4 border-t border-amber-100">
											<InfoSection label="Funcionário Responsável" value={purchase.employeeName || "-"} />
										</div>

										{purchase.attachmentNames?.length > 0 ? (
											<div className="pt-4 border-t border-amber-100">
												<p className="text-sm font-semibold text-gray-700 mb-3">
													📎 Comprovantes e Tickets ({purchase.attachmentNames.length})
												</p>
												<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
													{purchase.attachmentNames.map((name, idx) => {
														const extension = name.split(".").pop()?.toLowerCase() || "file";
														const getFileEmoji = (ext) => {
															if (["pdf"].includes(ext)) return "📄";
															if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "🖼️";
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
											</div>
										) : (
											<div className="pt-4 border-t border-amber-100">
												<p className="text-sm font-semibold text-gray-700 mb-3">
													📎 Comprovantes e Tickets (0)
												</p>
												<div className="border-2 border-dashed border-gray-200 rounded-lg p-6 bg-gray-50/50 text-center">
													<p className="text-sm text-gray-500">Nenhum comprovante anexado</p>
												</div>
											</div>
										)}
									</div>
								</div>
							);
						})}
					</div>
				)}
				</div>
			</section>
		</main>
	);
}

function InfoSection({ label, value }) {
	return (
		<div>
			<p className="text-xs text-gray-500 mb-1">{label}</p>
			<p className="text-sm font-semibold text-slate-900">{value}</p>
		</div>
	);
}

function SummaryCard({ label, value }) {
	return (
		<div className="rounded-2xl border border-amber-100 bg-amber-50/40 px-4 py-3">
			<p className="text-xs text-gray-500">{label}</p>
			<p className="text-xl font-bold text-slate-900 mt-1">{value}</p>
		</div>
	);
}
