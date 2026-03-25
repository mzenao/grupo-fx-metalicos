import { useMemo, useState } from "react";
import {
	ChevronDown,
	ChevronUp,
	Receipt,
	Paperclip,
	CalendarDays,
	Scale,
	CircleDollarSign,
	ShieldCheck,
} from "lucide-react";
import { mockSession } from "@/services/mockSession";
import { getStoredPurchases } from "@/services/ordersData";
import { getStoredSuppliers } from "@/services/entityData";

const personTypeBadge = {
	PF: "bg-sky-100 text-sky-800",
	PJ: "bg-amber-100 text-amber-800",
};

function formatMoney(value) {
	const parsed = Number(value);
	if (Number.isNaN(parsed)) return "R$ 0,00";
	return parsed.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(dateTime) {
	if (!dateTime) return "-";
	const parsed = new Date(dateTime);
	if (Number.isNaN(parsed.getTime())) return dateTime;
	return parsed.toLocaleString("pt-BR");
}

export default function Sells() {
	const [expandedSaleId, setExpandedSaleId] = useState(null);
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

	const totalValue = useMemo(() => {
		return userPurchases.reduce((sum, purchase) => sum + (Number(purchase.value) || 0), 0);
	}, [userPurchases]);

	if (!isUser) {
		return (
			<main className="pt-28 pb-14 px-6 max-w-4xl mx-auto w-full">
				<section className="rounded-2xl border border-amber-200 bg-white p-8 shadow-sm">
					<div className="flex items-center gap-3 text-slate-900 mb-3">
						<ShieldCheck className="w-6 h-6 text-[#b8891f]" />
						<h1 className="text-2xl font-bold">Minhas Vendas</h1>
					</div>
					<p className="text-slate-600">Esta area esta disponivel apenas para contas de cliente.</p>
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
						Essas vendas sao as mesmas cadastradas em Orders, com exibicao dedicada para o fornecedor.
					</p>
				</header>

				<div className="p-8 space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<SummaryCard label="Total de vendas" value={`${userPurchases.length}`} />
						<SummaryCard label="Valor acumulado" value={formatMoney(totalValue)} />
						<SummaryCard
							label="Comprovantes anexados"
							value={`${userPurchases.reduce((sum, purchase) => sum + (purchase.attachmentNames?.length || 0), 0)}`}
						/>
					</div>

					{userPurchases.length === 0 ? (
						<div className="rounded-2xl border border-amber-100 bg-amber-50/45 p-8 text-center">
							<Receipt className="w-10 h-10 mx-auto text-amber-600 mb-3" />
							<p className="text-slate-700 font-medium">Nenhuma venda encontrada para este fornecedor.</p>
						</div>
					) : (
						<div className="space-y-4">
							{userPurchases.map((purchase) => {
								const expanded = expandedSaleId === purchase.id;
								const saleSupplier = suppliersById.get(purchase.SupplierId);

								return (
									<article
										key={purchase.id}
										className="rounded-2xl border border-amber-100 bg-white shadow-sm overflow-hidden"
									>
										<button
											type="button"
											onClick={() => setExpandedSaleId(expanded ? null : purchase.id)}
											className="w-full px-5 py-4 flex items-center gap-4 hover:bg-amber-50/50 transition-colors text-left"
										>
											<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#b8891f] to-[#d6ab4a] text-white flex items-center justify-center font-semibold">
												#{purchase.id}
											</div>

											<div className="flex-1 min-w-0">
												<p className="font-semibold text-slate-900">Venda #{purchase.id}</p>
												<p className="text-sm text-gray-500">{formatDate(purchase.datetime)}</p>
											</div>

											{expanded ? (
												<ChevronUp className="w-5 h-5 text-amber-700" />
											) : (
												<ChevronDown className="w-5 h-5 text-amber-700" />
											)}
										</button>

										{expanded && (
											<div className="px-5 pb-5 border-t border-amber-100 bg-amber-50/35">
												<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 text-sm">
													<div className="rounded-xl border border-amber-100 bg-white px-3 py-2 lg:col-span-2">
														<p className="text-xs text-gray-500 flex items-center gap-1">
															<Receipt className="w-3.5 h-3.5 text-amber-700" /> Fornecedor
														</p>
														<div className="mt-1 flex flex-wrap items-center gap-2">
															<p className="text-sm font-semibold text-slate-800">
																{saleSupplier
																	? saleSupplier.personType === "PF"
																		? saleSupplier.name
																		: saleSupplier.companyName
																	: purchase.SupplierName || "-"}
															</p>
															{saleSupplier?.supplierCode && (
																<span className={`text-[11px] px-2 py-1 rounded-md font-semibold ${personTypeBadge[saleSupplier.personType]}`}>
																	{saleSupplier.supplierCode}
																</span>
															)}
															{saleSupplier?.personType && (
																<span className={`text-[11px] px-2 py-1 rounded-md font-semibold ${personTypeBadge[saleSupplier.personType]}`}>
																	{saleSupplier.personType}
																</span>
															)}
														</div>
													</div>
													<InfoItem icon={CalendarDays} label="Data e hora" value={formatDate(purchase.datetime)} />
													<InfoItem icon={Scale} label="Peso" value={`${purchase.weight || "0"} kg`} />
													<InfoItem icon={CircleDollarSign} label="Valor" value={formatMoney(purchase.value)} />
												</div>

												<div className="mt-4">
													<p className="text-xs text-gray-500 mb-1">Funcionario responsavel</p>
													<p className="text-sm font-medium text-slate-800">{purchase.employeeName || "-"}</p>
												</div>

												<div className="mt-4">
													<div className="flex items-center gap-2 mb-2">
														<Paperclip className="w-4 h-4 text-amber-700" />
														<p className="text-sm font-semibold text-slate-900">Comprovantes anexados</p>
													</div>

													{purchase.attachmentNames?.length ? (
														<ul className="space-y-2">
															{purchase.attachmentNames.map((fileName) => (
																<li
																	key={`${purchase.id}-${fileName}`}
																	className="text-sm text-slate-700 bg-white border border-amber-100 rounded-lg px-3 py-2"
																>
																	{fileName}
																</li>
															))}
														</ul>
													) : (
														<p className="text-sm text-gray-500">Nao ha comprovantes anexados nesta venda.</p>
													)}
												</div>
											</div>
										)}
									</article>
								);
							})}
						</div>
					)}
				</div>
			</section>
		</main>
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

function InfoItem({ icon: Icon, label, value }) {
	return (
		<div className="rounded-xl border border-amber-100 bg-white px-3 py-2">
			<p className="text-xs text-gray-500 flex items-center gap-1">
				<Icon className="w-3.5 h-3.5 text-amber-700" /> {label}
			</p>
			<p className="text-sm font-semibold text-slate-800 mt-1">{value}</p>
		</div>
	);
}
