import { X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

const personTypeBadge = {
	PF: "bg-sky-100 text-sky-800",
	PJ: "bg-amber-100 text-amber-800",
};

export default function ViewSells({ salesSupplier, onClose, onOpenSale }) {
	if (!salesSupplier) return null;

	const formatSaleDate = (isoDate) => {
		if (!isoDate) return "-";
		const [year, month, day] = isoDate.split("-");
		if (!year || !month || !day) return isoDate;
		return `${day}/${month}/${year}`;
	};

	const formatMoney = (value) => {
		if (typeof value !== "number") return "R$ 0,00";
		return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
	};

	const sortedSales = [...(salesSupplier.sales || [])].sort((a, b) => {
		const dateA = new Date(a.date || 0).getTime();
		const dateB = new Date(b.date || 0).getTime();

		if (dateB !== dateA) return dateB - dateA;
		return (Number(b.id) || 0) - (Number(a.id) || 0);
	});

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div className="absolute inset-0 bg-[#1e1608]/60 backdrop-blur-[2px]" onClick={onClose} />

			<div className="relative w-full max-w-xl bg-[#fffdf8] rounded-3xl border border-[#1e1608]/50 shadow-2xl shadow-[#1e1608]/20 overflow-hidden">
				<div className="bg-gradient-to-r from-[#1e1608] to-[#2b2010] border-b border-[#d6ab4a]/30 p-5 flex items-center justify-between">
					<div>
						<p className="text-xs uppercase tracking-wide text-[#f5e7c0]/80">Vendas do Fornecedor</p>
						<div className="mt-1 flex flex-wrap items-center gap-2">
							<h3 className="text-lg font-semibold text-[#f5e7c0]">
								{salesSupplier.personType === "PF" ? salesSupplier.name : salesSupplier.companyName}
							</h3>
							{salesSupplier.supplierCode && (
								<span className={`text-[11px] px-2 py-1 rounded-md font-semibold ${personTypeBadge[salesSupplier.personType]}`}>
									{salesSupplier.supplierCode}
								</span>
							)}
							{salesSupplier.personType && (
								<span className={`text-[11px] px-2 py-1 rounded-md font-semibold ${personTypeBadge[salesSupplier.personType]}`}>
									{salesSupplier.personType}
								</span>
							)}
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-1 rounded-md text-[#f5e7c0]/80 hover:bg-[#d6ab4a]/20 hover:text-[#f5e7c0]"
						aria-label="Fechar modal de vendas"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				<div className="p-5 space-y-3 max-h-[65vh] overflow-y-auto">
					{sortedSales.map((sale) => (
						<div key={sale.id} className="border border-amber-100 bg-white rounded-xl p-4 flex items-center justify-between gap-3">
							<div>
								<p className="text-sm text-gray-500">Venda #{sale.id}</p>
								<p className="font-semibold text-gray-900">{formatMoney(sale.value)}</p>
								<p className="text-xs text-gray-500">Data: {formatSaleDate(sale.date)}</p>
							</div>

							<Button
								type="button"
								onClick={() => onOpenSale(sale.id)}
								className="bg-gradient-to-r from-[#b8891f] to-[#d6ab4a] text-white hover:brightness-105 gap-2"
							>
								<Eye className="w-4 h-4 text-white" /> Visualizar venda
							</Button>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
