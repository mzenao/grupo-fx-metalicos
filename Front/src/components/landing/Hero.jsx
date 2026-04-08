import videoHero from "@/assets/videoHero.gif";
import fenixLogo from "@/assets/fenix.png";
import { useEffect, useState } from "react";
import { getSessionSnapshot } from "@/services/authApi";
import { Button } from "@/components/ui/button.jsx";
import RegisterModal from "@/components/internal/registerModal";
import { useNavigate } from "react-router-dom";

export default function Hero() {
	const [userRole, setUserRole] = useState(null);
	const [showRegisterModal, setShowRegisterModal] = useState(false);
	const navigate = useNavigate();

	useEffect(() => {
		const session = getSessionSnapshot();
		setUserRole(session.role || null);

		const handleStorageChange = () => {
			const updatedSession = getSessionSnapshot();
			setUserRole(updatedSession.role || null);
		};

		window.addEventListener("storage", handleStorageChange);
		return () => window.removeEventListener("storage", handleStorageChange);
	}, []);

	const handleRegisterSuccess = () => {
		window.location.reload();
	};

	return (
		<section id="hero" className="relative w-full h-[62vh] md:h-[72vh] lg:h-[78vh] overflow-hidden">
			<img
				src={videoHero}
				alt="Apresentacao da Fenix Metalicos"
				className="w-full h-full object-cover object-bottom"
			/>

			<div className="absolute inset-0 bg-gradient-to-l from-black/55 via-black/20 to-transparent" />

			<div className="absolute inset-0 flex items-center justify-begin px-6 md:px-10 lg:px-16">
				<div className="flex flex-col items-start gap-4 md:gap-5">
					<h1 className="hero-title-entrance max-w-[22ch] text-left text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight drop-shadow-[0_3px_10px_rgba(0,0,0,0.65)]">
						<span className="block font-light">Transformamos sucata em oportunidade</span>
						<span className="block font-semibold">Valorizando quem faz acontecer</span>
					</h1>

					{!userRole && (
						<Button
							type="button"
							onClick={() => setShowRegisterModal(true)}
							className="hero-title-entrance z-20 h-auto items-center gap-3 !rounded-full shadow-[0_10px_24px_rgba(0,0,0,0.22)] active:scale-[0.98] min-w-[10.5rem] px-5 py-2.5 sm:min-w-[12rem] sm:px-6 sm:py-3 sm:text-base md:min-w-[13rem] md:px-6 md:py-3 md:text-lg"
						>
							<img src={fenixLogo} alt="" className="h-11 w-11 shrink-0 object-contain brightness-0 invert sm:h-10 sm:w-10" aria-hidden="true" />
							<span className="flex flex-col leading-tight">
								<span className="block">Quero ser fornecedor</span>
							</span>
						</Button>
					)}

					{userRole === "supplier" && (
						<Button
							type="button"
							onClick={() => navigate("/supplier-portal")}
							className="hero-title-entrance z-20 h-auto items-center gap-3 !rounded-full shadow-[0_10px_24px_rgba(0,0,0,0.22)] active:scale-[0.98] min-w-[10.5rem] px-5 py-2.5 sm:min-w-[12rem] sm:px-6 sm:py-3 sm:text-base md:min-w-[13rem] md:px-6 md:py-3 md:text-lg"
						>
							<img src={fenixLogo} alt="" className="h-11 w-11 shrink-0 object-contain brightness-0 invert sm:h-10 sm:w-10" aria-hidden="true" />
							<span className="flex flex-col leading-tight">
								<span className="block">Portal do Fornecedor</span>
							</span>
						</Button>
					)}

					{(userRole === "employee" || userRole === "admin") && (
						<Button
							type="button"
							onClick={() => navigate("/dashboard")}
							className="hero-title-entrance z-20 h-auto items-center gap-3 !rounded-full shadow-[0_10px_24px_rgba(0,0,0,0.22)] active:scale-[0.98] min-w-[10.5rem] px-5 py-2.5 sm:min-w-[12rem] sm:px-6 sm:py-3 sm:text-base md:min-w-[13rem] md:px-6 md:py-3 md:text-lg"
						>
							<img src={fenixLogo} alt="" className="h-11 w-11 shrink-0 object-contain brightness-0 invert sm:h-10 sm:w-10" aria-hidden="true" />
							<span className="flex flex-col leading-tight">
								<span className="block">Ir para Dashboard</span>
							</span>
						</Button>
					)}
				</div>
			</div>

			{showRegisterModal && (
				<RegisterModal
					onClose={() => setShowRegisterModal(false)}
					onSuccess={handleRegisterSuccess}
				/>
			)}
		</section>
	);
}
