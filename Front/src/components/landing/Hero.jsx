import videoHero from "@/assets/videoHero.gif";

export default function Hero() {
	return (
		<section id="hero" className="relative w-full h-[62vh] md:h-[72vh] lg:h-[78vh] overflow-hidden">
			<img
				src={videoHero}
				alt="Apresentacao da Fenix Metalicos"
				className="w-full h-full object-cover object-bottom"
			/>

			<div className="absolute inset-0 bg-gradient-to-l from-black/55 via-black/20 to-transparent" />

			<div className="absolute inset-0 flex items-center justify-begin px-6 md:px-10 lg:px-16">
				<h1 className="hero-title-entrance max-w-[22ch] text-left text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight drop-shadow-[0_3px_10px_rgba(0,0,0,0.65)]">
					Transformamos sucata em oportunidade
					<br />
					Valorizando quem faz acontecer
				</h1>
			</div>
		</section>
	);
}
