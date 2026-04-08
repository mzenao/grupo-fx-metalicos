import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

const ROLES = [
	"Colaborador",
	"Motorista",
	"Gerente",
	"Diretor",
];

export default function EmployeeModal({ employee, onClose, onSave }) {
	const initial = useMemo(() => {
		const base = {
			name: "",
			phone: "",
			email: "",
			password: "",
			ocupance: ROLES[0],
		};

		if (!employee) return base;
		const next = { ...base, ...employee, password: "" };
		if (!ROLES.includes(next.ocupance)) {
			next.ocupance = ROLES[0];
		}
		return next;
	}, [employee]);

	const [form, setForm] = useState(initial);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");

	const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");

		if (!form.name?.trim()) {
			setError("Nome e obrigatorio.");
			return;
		}

		if (!form.phone?.trim()) {
			setError("Telefone e obrigatorio.");
			return;
		}

		if (!employee && (form.password || "").length < 6) {
			setError("A senha precisa ter no minimo 6 caracteres.");
			return;
		}

		setSaving(true);
		try {
			await onSave({ ...form, id: employee?.id });
		} catch (err) {
			setError(err?.message || "Erro ao salvar funcionario");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div className="absolute inset-0 bg-[#1e1608]/60 backdrop-blur-[2px]" onClick={onClose} />

			<AnimatePresence>
				<motion.div
					initial={{ opacity: 0, scale: 0.96 }}
					animate={{ opacity: 1, scale: 1 }}
					exit={{ opacity: 0, scale: 0.96 }}
					className="relative bg-[#fffdf8] rounded-3xl border border-[#1e1608]/60 shadow-2xl shadow-[#1e1608]/20 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
				>
					<div className="sticky top-0 bg-gradient-to-r from-[#1e1608] to-[#2b2010] rounded-t-3xl border-b border-[#d6ab4a]/30 flex items-center justify-between p-6 z-10">
						<h2 className="text-xl font-bold text-[#f5e7c0]">{employee ? "Editar Funcionario" : "Novo Funcionario"}</h2>
						<button
							type="button"
							onClick={onClose}
							className="p-1 rounded-md text-[#f5e7c0]/80 hover:bg-[#d6ab4a]/20 hover:text-[#f5e7c0]"
							aria-label="Fechar modal"
						>
							<X className="w-5 h-5" />
						</button>
					</div>

					<form onSubmit={handleSubmit} className="p-6 space-y-5 bg-[#fffdf8]">
						{error && (
							<div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
								{error}
							</div>
						)}

						<div className="grid sm:grid-cols-2 gap-x-4 gap-y-4">
							<div>
								<label className="block text-sm font-medium mb-1 text-[#4a3918]">Nome *</label>
								<input
									required
									value={form.name}
									onChange={(e) => set("name", e.target.value)}
									className="w-full h-11 px-3 border border-[#d6ab4a]/50 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#d6ab4a]/30 focus:border-[#b8891f]"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium mb-1 text-[#4a3918]">Telefone *</label>
								<input
									required
									value={form.phone}
									onChange={(e) => set("phone", e.target.value)}
									className="w-full h-11 px-3 border border-[#d6ab4a]/50 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#d6ab4a]/30 focus:border-[#b8891f]"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium mb-1 text-[#4a3918]">Email</label>
								<input
									type="email"
									value={form.email}
									onChange={(e) => set("email", e.target.value)}
									className="w-full h-11 px-3 border border-[#d6ab4a]/50 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#d6ab4a]/30 focus:border-[#b8891f]"
								/>
							</div>

							{!employee && (
								<div>
									<label className="block text-sm font-medium mb-1 text-[#4a3918]">Senha para login*</label>
									<input
										type="password"
										required
										minLength={6}
										value={form.password}
										onChange={(e) => set("password", e.target.value)}
										placeholder="Minimo 6 caracteres"
										className="w-full h-11 px-3 border border-[#d6ab4a]/50 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#d6ab4a]/30 focus:border-[#b8891f]"
									/>
								</div>
							)}


							<div className={!employee ? "sm:col-span-2 sm:max-w-sm sm:mx-auto w-full mt-1" : "mt-1"}>
								<label className="block text-sm font-medium mb-1 text-[#4a3918]">Cargo *</label>
								<select
									required
									value={form.ocupance}
									onChange={(e) => set("ocupance", e.target.value)}
									className="w-full h-11 px-3 border border-[#d6ab4a]/50 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#d6ab4a]/30 focus:border-[#b8891f]"
								>
									{ROLES.map((role) => (
										<option key={role} value={role}>
											{role}
										</option>
									))}
								</select>
							</div>
						</div>

						<div className="flex gap-3 justify-end pt-4 border-t border-[#d6ab4a]/25">
							<Button type="button" variant="outline" onClick={onClose} className="border-[#c7a04a] text-[#6a521f] hover:bg-[#f5e7c0]">
								Cancelar
							</Button>
							<Button type="submit" disabled={saving} className="bg-gradient-to-r from-[#b8891f] to-[#d6ab4a] text-white hover:brightness-105">
								{saving ? "Salvando..." : "Salvar"}
							</Button>
						</div>
					</form>
				</motion.div>
			</AnimatePresence>
		</div>
	);
}
