import { Handshake, Recycle, ShieldCheck, Scale, Gauge, Users } from "lucide-react";

const values = [
	{
		icon: Handshake,
		title: "Transparência",
		text: "Preço justo, comunicação clara e negociação sem surpresas.",
	},
	{
		icon: ShieldCheck,
		title: "Confiança",
		text: "Compromisso com prazos, responsabilidade e relação de longo prazo.",
	},
	{
		icon: Recycle,
		title: "Sustentabilidade",
		text: "Destino correto dos materiais e incentivo ao reaproveitamento.",
	},
	{
		icon: Scale,
		title: "Ética Comercial",
		text: "Respeito em cada atendimento, do pequeno ao grande fornecedor.",
	},
	{
		icon: Gauge,
		title: "Agilidade",
		text: "Processos objetivos para receber, avaliar e negociar com rapidez.",
	},
	{
		icon: Users,
		title: "Parceria",
		text: "Crescemos junto com clientes, colaboradores e comunidade local.",
	},
];

export default function WhoWeAre() {
	return (
		<section id="about" className="py-20 bg-[#f8f6f1]">
			<div className="max-w-6xl mx-auto px-6">
				<div className="max-w-3xl">
					<p className="text-sm font-semibold tracking-[0.18em] text-[#b8891f] uppercase">
						Quem Somos
					</p>
					<h2 className="mt-3 text-3xl md:text-4xl font-semibold text-slate-900 leading-tight">
						Um ferro-velho familiar com valores firmes e trabalho serio.
					</h2>
					<p className="mt-5 text-slate-600 leading-relaxed">
						Somos uma empresa familiar, mas nosso maior
						diferencial esta na forma de trabalhar: relações honestas, atendimento direto
						e compromisso real com quem negocia com a gente.
					</p>
				</div>

				<div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
					{values.map((value) => {
						const Icon = value.icon;
						return (
							<article
								key={value.title}
								className="rounded-2xl border border-amber-200/60 bg-[#f8f6f1] p-5"
							>
								<Icon className="w-5 h-5 text-[#b8891f]" />
								<h3 className="mt-3 text-base font-semibold text-slate-900">{value.title}</h3>
								<p className="mt-1 text-sm text-slate-600">{value.text}</p>
							</article>
						);
					})}
				</div>
			</div>
		</section>
	);
}
