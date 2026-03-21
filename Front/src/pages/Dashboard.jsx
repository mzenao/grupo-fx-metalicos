import { useEffect, useMemo, useState } from "react";
import {
	Calendar,
	Scale,
	DollarSign,
	Clock3,
	Receipt,
} from "lucide-react";

const TODAY = new Date();
const TODAY_ISO = `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, "0")}-${String(TODAY.getDate()).padStart(2, "0")}`;

const PURCHASES = [
	{
		id: 412,
		sellerName: "Joao Pedro Lima",
		employeeName: "Ana Souza",
		weight: 980,
		value: 2120,
		datetime: `${TODAY_ISO}T08:35`,
		attachments: 2,
	},
	{
		id: 413,
		sellerName: "Distribuidora Vale Sul",
		employeeName: "Carlos Mendes",
		weight: 1350,
		value: 3540,
		datetime: `${TODAY_ISO}T10:05`,
		attachments: 1,
	},
	{
		id: 414,
		sellerName: "Marcos Almeida",
		employeeName: "Juliana Nogueira",
		weight: 760,
		value: 1680,
		datetime: `${TODAY_ISO}T14:20`,
		attachments: 0,
	},
	{
		id: 415,
		sellerName: "Sucatas Norte Ltda",
		employeeName: "Carlos Mendes",
		weight: 1890,
		value: 4725,
		datetime: `${TODAY_ISO}T16:10`,
		attachments: 2,
	},
];

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
	const [activeCard, setActiveCard] = useState("resumo-dia");
	const [showAllMovements, setShowAllMovements] = useState(false);

	const summary = useMemo(() => {
		const totalPurchases = PURCHASES.length;
		const totalWeight = PURCHASES.reduce((sum, p) => sum + (Number(p.weight) || 0), 0);
		const totalValue = PURCHASES.reduce((sum, p) => sum + (Number(p.value) || 0), 0);
		const withAttachments = PURCHASES.filter((p) => p.attachments > 0).length;
		const pendingAttachments = totalPurchases - withAttachments;

		return {
			totalPurchases,
			totalWeight,
			totalValue,
			pendingAttachments,
			avgTicket: totalPurchases > 0 ? totalValue / totalPurchases : 0,
		};
	}, []);

	const purchaseGroupCards = [
		{
			id: "compras",
			title: "Compras de hoje",
			value: summary.totalPurchases,
			sub: "Registros no dia",
			icon: Calendar,
			color: "from-[#b8891f] to-[#d6ab4a]",
			bg: "bg-amber-50",
		},
		{
			id: "peso",
			title: "Peso do dia",
			value: `${summary.totalWeight.toLocaleString("pt-BR")} kg`,
			sub: "Entrada total",
			icon: Scale,
			color: "from-emerald-500 to-teal-500",
			bg: "bg-emerald-50",
		},
		{
			id: "valor",
			title: "Valor do dia",
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
				return PURCHASES.filter((p) => p.attachments === 0);
			default:
				return PURCHASES;
		}
	}, [activeCard]);

	useEffect(() => {
		setShowAllMovements(false);
	}, [activeCard]);

	const hasMoreMovements = filteredPurchases.length > 5;
	const visiblePurchases = showAllMovements ? filteredPurchases : filteredPurchases.slice(0, 5);

	return (
		<div className="space-y-6">
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
						<h3 className="font-semibold text-gray-900">Movimentacao do dia</h3>
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
								<div key={purchase.id} className="p-4 hover:bg-amber-50/40 transition-colors">
									<div className="flex items-center justify-between gap-2">
										<p className="font-semibold text-gray-900">Compra #{purchase.id}</p>
										<p className="text-xs text-gray-500 flex items-center gap-1">
											<Clock3 className="w-3 h-3" />
											{fmtDateTime(purchase.datetime)}
										</p>
									</div>

									<div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-2 text-sm">
										<p><span className="text-gray-500">Vendedor:</span> {purchase.sellerName}</p>
										<p><span className="text-gray-500">Funcionario:</span> {purchase.employeeName}</p>
										<p><span className="text-gray-500">Peso:</span> {purchase.weight} kg</p>
										<p><span className="text-gray-500">Valor:</span> {fmtMoney(purchase.value)}</p>
									</div>
								</div>
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
		</div>
	);
}
