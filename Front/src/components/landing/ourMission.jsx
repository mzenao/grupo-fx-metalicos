import { Target, Recycle, Users, ShieldCheck } from "lucide-react";

const missionIdeas = [
	{
		icon: Target,
		title: "Propósito",
		text: "Transformar sucata em valor real, conectando quem precisa descartar com quem sabe reaproveitar.",
	},
	{
		icon: Recycle,
		title: "Impacto Sustentável",
		text: "Reduzir desperdícios e incentivar uma cadeia mais limpa, eficiente e responsável para a indústria local.",
	},
	{
		icon: Users,
		title: "Valorização das Pessoas",
		text: "Reconhecer o trabalho de quem movimenta o setor com atendimento próximo, justo e transparente.",
	},
	{
		icon: ShieldCheck,
		title: "Compromisso",
		text: "Atuar com seriedade, segurança e confiança em cada etapa da negociação e do relacionamento com clientes.",
	},
];

export default function OurMission() {
	return (
		<section
			id="mission"
			className="py-20 bg-[#f8f6f1]"
		>
			<div className="max-w-6xl mx-auto px-6">
				<div className="max-w-3xl mb-12">
					<p className="text-sm font-semibold tracking-[0.18em] text-[#b8891f] uppercase">
						Nossa Missão
					</p>
					<h2 className="mt-3 text-3xl md:text-4xl font-semibold text-slate-900 leading-tight">
						Mais do que reciclar metais: gerar oportunidade, renda e impacto positivo.
					</h2>
					<p className="mt-4 text-slate-600 text-base md:text-lg leading-relaxed">
						O Grupo FX Metálicos nasceu para transformar a forma como sucata é vista e negociada, criando um ecossistema onde cada peça descartada se torna uma chance de crescimento, lucro e sustentabilidade para todos os envolvidos.
					</p>
				</div>

				<div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
					{missionIdeas.map((item) => {
						const Icon = item.icon;
						return (
							<article
								key={item.title}
								className="h-full rounded-2xl border border-amber-200/60 bg-[#f8f6f1] p-5 shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
							>
								<div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-[#b8891f]">
									<Icon className="w-5 h-5" />
								</div>
								<h3 className="mt-4 text-lg font-semibold text-slate-900">{item.title}</h3>
								<p className="mt-2 text-sm leading-relaxed text-slate-600">{item.text}</p>
							</article>
						);
					})}
				</div>
			</div>
		</section>
	);
}
