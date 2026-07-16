import { useMemo, useState } from "react";
import { MessageCircle, Scale } from "lucide-react";

const whatsappNumber = "5521990409260";

const formatCurrency = (value) =>
	new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(value);

const formatWeight = (value) =>
	new Intl.NumberFormat("pt-BR", {
		maximumFractionDigits: 2,
	}).format(value);

export default function SellScrap() {
	const [weightInput, setWeightInput] = useState("");
	const [priceInput, setPriceInput] = useState("");

	const parseDecimalInput = (value) => {
		const normalized = value.replace(/\./g, "").replace(",", ".");
		const parsed = Number.parseFloat(normalized);
		return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
	};

	const weightInKg = useMemo(() => parseDecimalInput(weightInput), [weightInput]);
	const pricePerKg = useMemo(() => parseDecimalInput(priceInput), [priceInput]);

	const estimatedTotal = weightInKg * pricePerKg;
	const hasWeight = weightInKg > 0;
	const hasPrice = pricePerKg > 0;
	const hasSimulation = hasWeight && hasPrice;
	const whatsappMessage = hasSimulation
		? `Olá, gostaria de vender ${formatWeight(weightInKg)} kg de sucata mista por ${formatCurrency(pricePerKg)} por kg. A simulação no site ficou em ${formatCurrency(estimatedTotal)}.`
		: "Olá, gostaria de fazer uma simulação para vender sucata mista.";
	const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

	const handleDecimalChange = (setter) => (event) => {
		const nextValue = event.target.value.replace(/[^\d.,]/g, "");
		setter(nextValue);
	};

	return (
		<section id="sell-scrap" className="bg-[#f8f6f1] py-16">
			<div className="mx-auto max-w-6xl px-6">
				<div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
					<div>
						<p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#b8891f]">
							Venda sua sucata
						</p>
						<h2 className="mt-3 max-w-[18ch] text-3xl font-semibold leading-tight text-slate-900 md:text-4xl">
							Simule sua venda de sucata mista.
						</h2>
						<p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
							Digite o peso e o preço aproximados na balança e veja uma estimativa instantânea pelo preço escolhido como referência. A confirmação final acontece no atendimento, após avaliação e pesagem do material.
						</p>

					</div>

					<div className="rounded-[1.75rem] border border-amber-200/70 bg-white/85 p-4 shadow-[0_20px_45px_rgba(30,22,8,0.1)] sm:p-5">
						<div className="rounded-[1.4rem] border border-amber-200 bg-[#f8f6f1] p-4">
							<div className="mb-3 flex items-center justify-between gap-4">
								<div>
									<p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b8891f]">Balança digital</p>
									<p className="mt-1 text-sm text-slate-600">Sucata mista</p>
								</div>
								<div className="flex items-center gap-2">
									<span className="h-2.5 w-2.5 rounded-full bg-[#d6ab4a] shadow-[0_0_14px_rgba(214,171,74,0.7)]" />
									<span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a6417]">Online</span>
								</div>
							</div>

							<div className="grid gap-3 sm:grid-cols-3">
								<label className="flex h-24 min-w-0 flex-col justify-between rounded-2xl border border-amber-200 bg-white p-3 transition focus-within:border-[#b8891f] focus-within:ring-4 focus-within:ring-amber-100">
									<div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.1em] text-[#8a6417]">
										<span>Peso</span>
										<span>kg</span>
									</div>
									<div className="mt-2 flex min-w-0 items-end gap-2">
										<span className="mb-0.5 shrink-0 text-sm font-semibold text-slate-900">kg</span>
										<input
											type="text"
											inputMode="decimal"
											value={weightInput}
											onChange={handleDecimalChange(setWeightInput)}
											placeholder="Ex: 500"
											className="min-w-0 flex-1 bg-transparent text-right text-2xl font-semibold text-slate-900 outline-none placeholder:text-slate-400"
											aria-label="Quantidade de sucata mista em quilos"
										/>
									</div>
								</label>

								<label className="flex h-24 min-w-0 flex-col justify-between rounded-2xl border border-amber-200 bg-white p-3 transition focus-within:border-[#b8891f] focus-within:ring-4 focus-within:ring-amber-100">
									<div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.1em] text-[#8a6417]">
										<span>Preço/kg</span>
										<span>R$</span>
									</div>
									<div className="mt-2 flex min-w-0 items-end gap-2">
										<span className="mb-0.5 shrink-0 text-sm font-semibold text-slate-900">R$</span>
										<input
											type="text"
											inputMode="decimal"
											value={priceInput}
											onChange={handleDecimalChange(setPriceInput)}
											placeholder="Ex: 1,10"
											className="min-w-0 flex-1 bg-transparent text-right text-2xl font-semibold text-slate-900 outline-none placeholder:text-slate-400"
											aria-label="Valor por quilo da sucata mista"
										/>
									</div>
								</label>

								<div className="flex h-24 min-w-0 flex-col justify-between rounded-2xl border border-amber-200 bg-white p-3">
									<p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Valor total</p>
									<p className="mt-2 truncate text-xl font-semibold text-[#8a6417]">
										{hasSimulation ? formatCurrency(estimatedTotal) : "R$ "}
									</p>
								</div>
							</div>

							<div className="mt-3">
								<a
									href={whatsappLink}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#b8891f] to-[#d6ab4a] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(184,137,31,0.24)] transition hover:from-[#a67917] hover:to-[#c79a39]"
								>
									<MessageCircle className="h-5 w-5" />
									<span>Chamar no WhatsApp</span>
								</a>
							</div>

							<p className="mt-3 text-xs leading-relaxed text-slate-500">
								{hasSimulation
									? `${formatWeight(weightInKg)} kg x ${formatCurrency(pricePerKg)} por kg. Estimativa sujeita a confirmação após avaliação, pesagem e condições do material.`
									: "Informe o peso e o preço por kg para calcular a estimativa."}
							</p>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
