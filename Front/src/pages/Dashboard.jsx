import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	ArrowRight,
	Calendar,
	CalendarDays,
	Scale,
	DollarSign,
	Clock3,
	Receipt,
	X,
} from "lucide-react";
import { fetchPurchases } from "@/services/ordersData";

const getBrasiliaDate = () => {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: "America/Sao_Paulo",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(new Date());
	const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
	return `${values.year}-${values.month}-${values.day}`;
};

const getPurchaseDate = (purchase) => String(purchase?.datetime || "").slice(0, 10);

const fmtPeriodDate = (value) => {
	if (!value) return "";
	const [year, month, day] = value.split("-");
	return `${day}/${month}/${year}`;
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

export default function Dashboard() {
	const navigate = useNavigate();
	const today = useMemo(() => getBrasiliaDate(), []);
	const [activeCard, setActiveCard] = useState("resumo-dia");
	const [showAllMovements, setShowAllMovements] = useState(false);
	const [purchases, setPurchases] = useState([]);
	const [periodModalOpen, setPeriodModalOpen] = useState(false);
	const [period, setPeriod] = useState({ start: today, end: today });
	const [draftPeriod, setDraftPeriod] = useState({ start: today, end: today });
	const [periodError, setPeriodError] = useState("");

	useEffect(() => {
		let mounted = true;
		fetchPurchases()
			.then((data) => {
				if (mounted) setPurchases(data);
			})
			.catch(() => {
				if (mounted) setPurchases([]);
			});

		return () => {
			mounted = false;
		};
	}, []);

	const openPurchaseInOrders = (purchaseId) => {
		navigate(`/orders#${purchaseId}`);
	};

	const purchasesInPeriod = useMemo(
		() => purchases.filter((purchase) => {
			const purchaseDate = getPurchaseDate(purchase);
			return purchaseDate && purchaseDate >= period.start && purchaseDate <= period.end;
		}),
		[purchases, period],
	);

	const isTodayPeriod = period.start === today && period.end === today;
	const periodLabel = isTodayPeriod
		? "Hoje"
		: period.start === period.end
			? fmtPeriodDate(period.start)
			: `${fmtPeriodDate(period.start)} a ${fmtPeriodDate(period.end)}`;

	const openPeriodModal = () => {
		setDraftPeriod(period);
		setPeriodError("");
		setPeriodModalOpen(true);
	};

	const applyPeriod = () => {
		if (!draftPeriod.start || !draftPeriod.end) {
			setPeriodError("Informe as datas de início e fim.");
			return;
		}
		if (draftPeriod.start > draftPeriod.end) {
			setPeriodError("A data inicial não pode ser posterior à data final.");
			return;
		}
		setPeriod(draftPeriod);
		setPeriodModalOpen(false);
	};

	const summary = useMemo(() => {
		const totalPurchases = purchasesInPeriod.length;
		const totalWeight = purchasesInPeriod.reduce((sum, p) => sum + (Number(p.weight) || 0), 0);
		const totalValue = purchasesInPeriod.reduce((sum, p) => sum + (Number(p.value) || 0), 0);
		const withAttachments = purchasesInPeriod.filter((p) => (p.attachmentNames || []).length > 0).length;
		const pendingAttachments = totalPurchases - withAttachments;

		return {
			totalPurchases,
			totalWeight,
			totalValue,
			pendingAttachments,
			avgTicket: totalPurchases > 0 ? totalValue / totalPurchases : 0,
		};
	}, [purchasesInPeriod]);

	const purchaseGroupCards = [
		{
			id: "compras",
			title: isTodayPeriod ? "Compras do dia" : "Compras no período",
			value: summary.totalPurchases,
			sub: periodLabel,
			icon: Calendar,
			color: "from-[#b8891f] to-[#d6ab4a]",
			bg: "bg-amber-50",
		},
		{
			id: "peso",
			title: isTodayPeriod ? "Peso do dia" : "Peso no período",
			value: `${summary.totalWeight.toLocaleString("pt-BR")} kg`,
			sub: "Entrada total",
			icon: Scale,
			color: "from-emerald-500 to-teal-500",
			bg: "bg-emerald-50",
		},
		{
			id: "valor",
			title: isTodayPeriod ? "Valor do dia" : "Valor no período",
			value: fmtMoney(summary.totalValue),
			sub: `Ticket medio ${fmtMoney(summary.avgTicket)}`,
			icon: DollarSign,
			color: "from-sky-500 to-blue-500",
			bg: "bg-sky-50",
		},
	];

	const pendingCard = {
		id: "comprovantes",
		title: "Comprovantes pendentes",
		value: summary.pendingAttachments,
		sub: "Compras sem anexo",
		icon: Receipt,
		color: "from-rose-500 to-red-500",
		bg: "bg-rose-50",
	};

	const filteredPurchases = useMemo(() => {
		switch (activeCard) {
			case "comprovantes":
				return purchasesInPeriod.filter((p) => (p.attachmentNames || []).length === 0);
			default:
				return purchasesInPeriod;
		}
	}, [activeCard, purchasesInPeriod]);

	useEffect(() => {
		setShowAllMovements(false);
	}, [activeCard]);

	const hasMoreMovements = filteredPurchases.length > 5;
	const visiblePurchases = showAllMovements ? filteredPurchases : filteredPurchases.slice(0, 5);

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
				<div>
					<p className="text-sm text-gray-500">Período das métricas</p>
					<p className="font-semibold text-gray-900">{periodLabel}</p>
				</div>
				<button
					type="button"
					onClick={openPeriodModal}
					className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d6ab4a]/50 bg-white px-4 py-2.5 text-sm font-semibold text-[#6d5315] shadow-sm transition-colors hover:bg-amber-50"
				>
					<CalendarDays className="w-4 h-4" />
					Selecionar Período
					<ArrowRight className="w-4 h-4" />
				</button>
			</div>

			<div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
				<button
					type="button"
					onClick={() => setActiveCard("resumo-dia")}
					className={`text-left rounded-2xl border shadow-sm p-3 sm:col-span-2 xl:col-span-3 transition-all ${
						activeCard === "resumo-dia"
							? "bg-white border-[#d6ab4a] ring-2 ring-[#d6ab4a]/25 shadow-md"
							: "bg-white border-amber-100 hover:border-amber-200"
					}`}
				>
					<div className="grid md:grid-cols-3 gap-3">
						{purchaseGroupCards.map((card) => {
							const Icon = card.icon;
							return (
								<div key={card.id} className="bg-white rounded-xl border border-amber-100 p-4">
									<div className="flex items-start justify-between gap-3">
										<div>
											<p className="text-sm text-gray-500 mb-1">{card.title}</p>
											<p className="text-2xl font-bold text-gray-900">{card.value}</p>
											<p className="text-xs text-gray-400 mt-1">{card.sub}</p>
										</div>

										<div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center`}>
											<div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center`}>
												<Icon className="w-4 h-4 text-white" />
											</div>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</button>

				<button
					type="button"
					onClick={() => setActiveCard(pendingCard.id)}
					className={`text-left bg-white rounded-2xl border shadow-sm p-5 transition-all ${
						activeCard === pendingCard.id
							? "border-[#d6ab4a] ring-2 ring-[#d6ab4a]/25 shadow-md -translate-y-0.5"
							: "border-amber-100 hover:border-amber-200 hover:-translate-y-0.5"
					}`}
				>
					<div className="flex items-start justify-between gap-3">
						<div>
							<p className="text-sm text-gray-500 mb-1">{pendingCard.title}</p>
							<p className="text-2xl font-bold text-gray-900">{pendingCard.value}</p>
							<p className="text-xs text-gray-400 mt-1">{pendingCard.sub}</p>
						</div>

						<div className={`w-12 h-12 rounded-xl ${pendingCard.bg} flex items-center justify-center`}>
							<div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${pendingCard.color} flex items-center justify-center`}>
								<pendingCard.icon className="w-4 h-4 text-white" />
							</div>
						</div>
					</div>
				</button>
			</div>

			<div className="grid lg:grid-cols-1 gap-6">
				<section className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
					<div className="px-5 py-4 border-b border-amber-100 flex items-center justify-between">
						<h3 className="font-semibold text-gray-900">Movimentacao registrada</h3>
						<span className="text-xs text-gray-500">{filteredPurchases.length} itens</span>
					</div>

					{filteredPurchases.length === 0 ? (
						<div className="p-8 text-center text-gray-400">
							<Receipt className="w-10 h-10 mx-auto mb-2 opacity-50" />
							<p>Nada para mostrar neste filtro.</p>
						</div>
					) : (
						<div className="divide-y divide-gray-100">
							{visiblePurchases.map((purchase) => (
								<button
									key={purchase.id}
									type="button"
									onClick={() => openPurchaseInOrders(purchase.id)}
									className="w-full p-4 text-left hover:bg-amber-50/40 transition-colors"
								>
									<div className="flex items-center justify-between gap-2">
										<p className="font-semibold text-gray-900">Compra #{purchase.id}</p>
										<p className="text-xs text-gray-500 flex items-center gap-1">
											<Clock3 className="w-3 h-3" />
											{fmtDateTime(purchase.datetime)}
										</p>
									</div>

									<div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-2 text-sm">
										<p><span className="text-gray-500">Fornecedor:</span> {purchase.SupplierName}</p>
										<p><span className="text-gray-500">Funcionario:</span> {purchase.employeeName}</p>
										<p><span className="text-gray-500">Peso:</span> {purchase.weight} kg</p>
										<p><span className="text-gray-500">Valor:</span> {fmtMoney(purchase.value)}</p>
									</div>
								</button>
							))}

							{hasMoreMovements && (
								<div className="p-4 flex justify-center">
									<button
										type="button"
										onClick={() => setShowAllMovements((prev) => !prev)}
										className="text-sm font-medium text-[#8a6a1a] hover:text-[#6d5315] transition-colors"
									>
										{showAllMovements ? "Exibir menos" : "Exibir mais"}
									</button>
								</div>
							)}
						</div>
					)}
				</section>
			</div>

			{periodModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<button
						type="button"
						aria-label="Fechar seleção de período"
						onClick={() => setPeriodModalOpen(false)}
						className="absolute inset-0 bg-[#1e1608]/55 backdrop-blur-[2px]"
					/>

					<div
						role="dialog"
						aria-modal="true"
						aria-labelledby="period-modal-title"
						className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#d6ab4a]/40 bg-white shadow-2xl"
					>
						<div className="flex items-center justify-between border-b border-amber-100 bg-amber-50/70 px-5 py-4">
							<div className="flex items-center gap-2">
								<CalendarDays className="w-5 h-5 text-[#8a6a1a]" />
								<h2 id="period-modal-title" className="font-bold text-gray-900">Selecionar Período</h2>
							</div>
							<button
								type="button"
								onClick={() => setPeriodModalOpen(false)}
								aria-label="Fechar"
								className="rounded-lg p-1.5 text-gray-500 hover:bg-amber-100 hover:text-gray-800"
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						<div className="space-y-4 p-5">
							<div className="grid sm:grid-cols-2 gap-4">
								<label className="space-y-1.5 text-sm font-medium text-gray-700">
									<span>Data de início</span>
									<input
										type="date"
										value={draftPeriod.start}
										onChange={(event) => {
											setDraftPeriod((current) => ({ ...current, start: event.target.value }));
											setPeriodError("");
										}}
										className="h-11 w-full rounded-lg border border-amber-200 bg-white px-3 outline-none focus:border-[#b8891f] focus:ring-2 focus:ring-[#d6ab4a]/25"
									/>
								</label>

								<label className="space-y-1.5 text-sm font-medium text-gray-700">
									<span>Data de fim</span>
									<input
										type="date"
										value={draftPeriod.end}
										onChange={(event) => {
											setDraftPeriod((current) => ({ ...current, end: event.target.value }));
											setPeriodError("");
										}}
										className="h-11 w-full rounded-lg border border-amber-200 bg-white px-3 outline-none focus:border-[#b8891f] focus:ring-2 focus:ring-[#d6ab4a]/25"
									/>
								</label>
							</div>

							{periodError && <p className="text-sm text-red-600">{periodError}</p>}

							<div className="flex justify-end gap-2 pt-1">
								<button
									type="button"
									onClick={() => setPeriodModalOpen(false)}
									className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
								>
									Cancelar
								</button>
								<button
									type="button"
									onClick={applyPeriod}
									className="rounded-lg bg-gradient-to-r from-[#b8891f] to-[#d6ab4a] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-105"
								>
									Aplicar período
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
