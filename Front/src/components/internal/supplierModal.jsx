import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { validarCPF, validarCNPJ } from "@/services/validators";

function formatCpfInput(value) {
	const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
	return digits
		.replace(/(\d{3})(\d)/, "$1.$2")
		.replace(/(\d{3})(\d)/, "$1.$2")
		.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function formatCnpjInput(value) {
	const digits = String(value || "").replace(/\D/g, "").slice(0, 14);
	return digits
		.replace(/(\d{2})(\d)/, "$1.$2")
		.replace(/(\d{3})(\d)/, "$1.$2")
		.replace(/(\d{3})(\d)/, "$1/$2")
		.replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function formatPixValue(pixKeyType, form) {
	const type = (pixKeyType || "").toLowerCase();
	const digits = (value) => String(value || "").replace(/\D/g, "");

	if (type === "cpf") {
		const cpf = digits(form.cpf).slice(0, 11);
		if (cpf.length !== 11) return "";
		return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
	}

	if (type === "cnpj") {
		const cnpj = digits(form.cnpj).slice(0, 14);
		if (cnpj.length !== 14) return "";
		return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
	}

	if (type === "phone") return form.pixKeyValue || "";
	if (type === "email") return form.pixKeyValue || "";
	if (type === "random") return form.pixKeyValue || "";
	return "";
}

function normalizePlate(value) {
	return String(value || "").replace(/\s+/g, "").toUpperCase();
}

function parseVehiclePlatesExtra(value) {
	if (Array.isArray(value)) {
		return value.map((plate) => normalizePlate(plate)).filter(Boolean);
	}

	if (typeof value === "string") {
		const trimmed = value.trim();
		if (!trimmed) return [];
		if (trimmed.startsWith("[")) {
			try {
				const parsed = JSON.parse(trimmed);
				if (Array.isArray(parsed)) {
					return parsed.map((plate) => normalizePlate(plate)).filter(Boolean);
				}
			} catch {
				return [];
			}
		}
	}

	return [];
}

export default function SupplierModal({ Supplier, onClose, onSave }) {
	const initial = useMemo(() => {
		const base = {
			personType: "PF",
			pixKeyType: "cpf",
			name: "",
			companyName: "",
			cpf: "",
			cnpj: "",
			vehiclePlate: "",
			referenceAddress: "",
			email: "",
			phone: "",
			pixKeyValue: "",
			vehiclePlatesExtra: [],
			extraPlateInput: "",
			password: "",
		};

		if (!Supplier) return base;
		const next = { ...base, ...Supplier, password: "" };
		const allowedPixTypes = next.personType === "PF" ? ["cpf", "phone", "email", "random"] : ["cnpj", "phone", "email", "random"];
		if (!allowedPixTypes.includes((next.pixKeyType || "").toLowerCase())) {
			next.pixKeyType = next.personType === "PF" ? "cpf" : "cnpj";
		}
		next.pixKeyValue = next.pixKeyValue || "";
		next.vehiclePlate = normalizePlate(next.vehiclePlate);
		next.vehiclePlatesExtra = parseVehiclePlatesExtra(next.vehiclePlatesExtra || next.vehicle_plates_extra);
		next.extraPlateInput = "";
		return next;
	}, [Supplier]);

	const [form, setForm] = useState(initial);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const pixValue = formatPixValue(form.pixKeyType, form);
	const extraPlates = Array.isArray(form.vehiclePlatesExtra) ? form.vehiclePlatesExtra : [];
	const canAddExtra = extraPlates.length < 3;

	const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

	const handleAddExtraPlate = () => {
		const nextPlate = normalizePlate(form.extraPlateInput);
		if (!nextPlate) {
			setError("Informe uma placa adicional.");
			return;
		}
		if (!canAddExtra) {
			setError("O limite de 3 placas adicionais foi atingido.");
			return;
		}
		if (nextPlate === normalizePlate(form.vehiclePlate)) {
			setError("A placa adicional não pode ser igual à principal.");
			return;
		}
		if (extraPlates.includes(nextPlate)) {
			setError("Essa placa adicional já foi adicionada.");
			return;
		}
		setError("");
		setForm((prev) => ({
			...prev,
			vehiclePlatesExtra: [...(prev.vehiclePlatesExtra || []), nextPlate],
			extraPlateInput: "",
		}));
	};

	const handleRemoveExtraPlate = (plate) => {
		setForm((prev) => ({
			...prev,
			vehiclePlatesExtra: (prev.vehiclePlatesExtra || []).filter((item) => item !== plate),
		}));
	};

	const handleTypeChange = (nextType) => {
		setForm((prev) => ({
			...prev,
			personType: nextType,
			pixKeyType: nextType === "PF" ? "cpf" : "cnpj",
			pixKeyValue: "",
			name: nextType === "PF" ? prev.name : "",
			cpf: nextType === "PF" ? prev.cpf : "",
			companyName: nextType === "PJ" ? prev.companyName : "",
			cnpj: nextType === "PJ" ? prev.cnpj : "",
		}));
	};

	const handlePixTypeChange = (nextType) => {
		setForm((prev) => ({
			...prev,
			pixKeyType: nextType,
			pixKeyValue:
				nextType === "phone" && !prev.pixKeyValue
					? prev.phone || ""
					: nextType === "cpf"
						? prev.cpf || ""
						: nextType === "cnpj"
							? prev.cnpj || ""
							: prev.pixKeyValue,
		}));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");

		if (form.personType === "PF" && !form.name.trim()) {
			setError("Nome e obrigatorio para pessoa fisica.");
			return;
		}

		if (form.personType === "PJ" && !form.companyName.trim()) {
			setError("Nome da empresa e obrigatorio para pessoa juridica.");
			return;
		}

		if (form.personType === "PF" && !form.cpf.trim()) {
			setError("CPF e obrigatorio para pessoa fisica.");
			return;
		}

		if (form.personType === "PF" && !validarCPF(form.cpf)) {
			setError("CPF invalido.");
			return;
		}

		if (form.personType === "PJ" && !form.cnpj.trim()) {
			setError("CNPJ e obrigatorio para pessoa juridica.");
			return;
		}

		if (form.personType === "PJ" && !validarCNPJ(form.cnpj)) {
			setError("CNPJ invalido.");
			return;
		}

		if (!form.vehiclePlate.trim()) {
			setError("Placa do veiculo e obrigatoria.");
			return;
		}

		const normalizedMainPlate = normalizePlate(form.vehiclePlate);
		const normalizedExtraPlates = (form.vehiclePlatesExtra || []).map((plate) => normalizePlate(plate)).filter(Boolean);
		if (normalizedExtraPlates.length > 3) {
			setError("O limite de 3 placas adicionais foi atingido.");
			return;
		}
		if (normalizedExtraPlates.includes(normalizedMainPlate)) {
			setError("A placa principal não pode se repetir nas adicionais.");
			return;
		}
		if (new Set([normalizedMainPlate, ...normalizedExtraPlates]).size !== 1 + normalizedExtraPlates.length) {
			setError("Não é permitido cadastrar placas duplicadas.");
			return;
		}

		if (!form.referenceAddress.trim()) {
			setError("Endereco de referencia e obrigatorio.");
			return;
		}

		if (!form.email.trim()) {
			setError("Email e obrigatorio.");
			return;
		}

		if (!form.phone.trim()) {
			setError("Telefone e obrigatorio.");
			return;
		}

		if (form.pixKeyType === "phone" && !form.pixKeyValue.trim()) {
			setError("Informe a chave Pix do tipo telefone.");
			return;
		}

		if (!Supplier && (form.password || "").length < 6) {
			setError("A senha precisa ter no minimo 6 caracteres.");
			return;
		}

		const allowedPixTypes = form.personType === "PF" ? ["cpf", "phone", "email", "random"] : ["cnpj", "phone", "email", "random"];
		if (!allowedPixTypes.includes(form.pixKeyType)) {
			setError("Selecione uma opcao valida para chave Pix.");
			return;
		}

		if (["email", "random"].includes(form.pixKeyType) && !form.pixKeyValue.trim()) {
			setError("Informe a chave Pix para o tipo selecionado.");
			return;
		}

		setSaving(true);
		try {
			await onSave({ ...form, vehiclePlate: normalizedMainPlate, vehiclePlatesExtra: normalizedExtraPlates, id: Supplier?.id });
		} catch (err) {
			setError(err?.message || "Erro ao salvar Fornecedor");
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
					<div className="sticky top-0 bg-gradient-to-r from-[#1e1608] to-[#2b2010] rounded-t-3xl border-b border-[#d6ab4a]/30 flex items-center justify-between p-6 z-40">
						<h2 className="text-xl font-bold text-[#f5e7c0]">{Supplier ? "Editar Fornecedor" : "Novo Fornecedor"}</h2>
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

						<div className="space-y-2">
							<p className="text-sm font-medium text-[#4a3918]">Tipo de Fornecedor</p>
							<div className="w-full sm:w-[280px] bg-[#f5e7c0]/45 border border-[#d6ab4a]/35 rounded-xl p-1.5">
								<div className="relative grid grid-cols-2">
									<motion.span
										layout
										transition={{ type: "spring", stiffness: 380, damping: 28 }}
										className="absolute top-0 bottom-0 w-1/2 rounded-lg bg-gradient-to-r from-[#b8891f] to-[#d6ab4a]"
										style={{ left: form.personType === "PF" ? "0%" : "50%" }}
									/>
									<button
										type="button"
										onClick={() => handleTypeChange("PF")}
										className={`relative z-10 h-10 rounded-lg text-sm font-semibold transition-colors ${
											form.personType === "PF" ? "text-white" : "text-[#7b6024]"
										}`}
									>
										Pessoa Fisica
									</button>
									<button
										type="button"
										onClick={() => handleTypeChange("PJ")}
										className={`relative z-10 h-10 rounded-lg text-sm font-semibold transition-colors ${
											form.personType === "PJ" ? "text-white" : "text-[#7b6024]"
										}`}
									>
										Pessoa Juridica
									</button>
								</div>
							</div>
						</div>

						<div className="grid sm:grid-cols-2 gap-x-4 gap-y-4">
							{form.personType === "PF" ? (
								<>
									<div>
										<label className="block text-sm font-medium mb-1 text-[#4a3918]">Nome *</label>
										<input
											required
											placeholder="Nome"
											value={form.name}
											onChange={(e) => set("name", e.target.value)}
											className="w-full h-11 px-3 border border-[#d6ab4a]/50 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#d6ab4a]/30 focus:border-[#b8891f]"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium mb-1 text-[#4a3918]">CPF *</label>
										<input
											required
											placeholder="CPF"
											value={form.cpf}
											onChange={(e) => set("cpf", formatCpfInput(e.target.value))}
											className="w-full h-11 px-3 border border-[#d6ab4a]/50 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#d6ab4a]/30 focus:border-[#b8891f]"
										/>
									</div>
								</>
							) : (
								<>
									<div>
										<label className="block text-sm font-medium mb-1 text-[#4a3918]">Nome da empresa *</label>
										<input
											required
											placeholder="Nome da empresa"
											value={form.companyName}
											onChange={(e) => set("companyName", e.target.value)}
											className="w-full h-11 px-3 border border-[#d6ab4a]/50 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#d6ab4a]/30 focus:border-[#b8891f]"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium mb-1 text-[#4a3918]">CNPJ *</label>
										<input
											required
											placeholder="CNPJ"
											value={form.cnpj}
											onChange={(e) => set("cnpj", formatCnpjInput(e.target.value))}
											className="w-full h-11 px-3 border border-[#d6ab4a]/50 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#d6ab4a]/30 focus:border-[#b8891f]"
										/>
									</div>
								</>
							)}

							<div className="md:col-span-2 space-y-3">
								<div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
									<div className="md:col-span-2">
										<label className="block text-sm font-medium mb-1 text-[#4a3918]">Placa do veiculo *</label>
										<input
											required
											placeholder="ABC1234"
											value={form.vehiclePlate}
											onChange={(e) => set("vehiclePlate", normalizePlate(e.target.value))}
											className="w-full h-11 px-3 border border-[#d6ab4a]/50 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#d6ab4a]/30 focus:border-[#b8891f]"
										/>
									</div>

									<div className="md:col-span-1">
										<label className="block text-sm font-medium mb-1 text-[#4a3918]">Placa adicional</label>
										<input
											type="text"
											placeholder="XYZ9999"
											value={form.extraPlateInput}
											onChange={(e) => set("extraPlateInput", normalizePlate(e.target.value))}
											onKeyDown={(e) => {
											if (e.key === "Enter") {
												e.preventDefault();
												handleAddExtraPlate();
											}
										}}
											className="w-full h-11 px-3 border border-[#d6ab4a]/50 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#d6ab4a]/30 focus:border-[#b8891f]"
										/>
									</div>

									<div className="md:col-span-1">
										<label className="block text-sm font-medium mb-1 text-[#4a3918] opacity-0 select-none">Adicionar</label>
										<Button
											type="button"
											onClick={handleAddExtraPlate}
											disabled={!form.extraPlateInput.trim() || !canAddExtra}
											className="w-full h-11 bg-[#1e1608] text-[#f5e7c0] hover:bg-[#2b2010] disabled:opacity-50"
										>
											Adicionar
										</Button>
									</div>
								</div>

								<div className="sm:col-span-2">
									<div className="mt-3 flex flex-wrap gap-2">
										{extraPlates.map((plate) => (
											<span key={plate} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f5e7c0] text-[#4a3918] text-sm font-semibold border border-[#d6ab4a]/40">
												{plate}
												<button type="button" onClick={() => handleRemoveExtraPlate(plate)} className="text-[#7b6024] hover:text-[#1e1608]" aria-label={`Remover placa ${plate}`}>
													×
												</button>
											</span>
										))}
										{extraPlates.length === 0 && <p className="text-xs text-[#7b6024]">Nenhuma placa adicional adicionada.</p>}
									</div>
									<p className="mt-2 text-xs text-[#7b6024]">Máximo de 3 placas adicionais. A placa principal não entra no total das tags.</p>
								</div>
								<label className="block text-sm font-medium mb-1 text-[#4a3918]">Endereco de referencia *</label>
								<input
									required
									placeholder="Endereco de referencia"
									value={form.referenceAddress}
									onChange={(e) => set("referenceAddress", e.target.value)}
									className="w-full h-11 px-3 border border-[#d6ab4a]/50 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#d6ab4a]/30 focus:border-[#b8891f]"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium mb-1 text-[#4a3918]">Email *</label>
								<input
									type="email"
									required
									placeholder="Email"
									value={form.email}
									onChange={(e) => set("email", e.target.value)}
									className="w-full h-11 px-3 border border-[#d6ab4a]/50 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#d6ab4a]/30 focus:border-[#b8891f]"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium mb-1 text-[#4a3918]">Telefone *</label>
								<input
									required
									placeholder="Telefone"
									value={form.phone}
									onChange={(e) => set("phone", e.target.value)}
									className="w-full h-11 px-3 border border-[#d6ab4a]/50 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#d6ab4a]/30 focus:border-[#b8891f]"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium mb-1 text-[#4a3918]">Tipo da chave Pix *</label>
								<PixTypeSelect
									value={form.pixKeyType}
									onChange={(value) => {
										handlePixTypeChange(value);
									}}
									options={form.personType === "PF"
										? [
											{ value: "cpf", label: "CPF" },
											{ value: "phone", label: "Telefone" },
											{ value: "email", label: "Email" },
											{ value: "random", label: "Aleatoria" },
										]
										: [
											{ value: "cnpj", label: "CNPJ" },
											{ value: "phone", label: "Telefone" },
											{ value: "email", label: "Email" },
											{ value: "random", label: "Aleatoria" },
										]}
								/>
							</div>

							<div>
								<label className="block text-sm font-medium mb-1 text-[#4a3918]">Chave Pix</label>
								<input
									type="text"
									readOnly={form.pixKeyType === "cpf"}
									placeholder={form.pixKeyType === "cpf" ? "Chave Pix" : "Digite a chave Pix"}
									value={pixValue || ""}
									onChange={(e) => set("pixKeyValue", e.target.value)}
									className="w-full h-11 px-3 border border-[#d6ab4a]/50 rounded-lg bg-gray-50 text-[#4a3918]"
								/>
							</div>

							{!Supplier && (
								<div className="sm:col-span-2 sm:max-w-sm sm:mx-auto w-full mt-1">
									<label className="block text-sm font-medium mb-1 text-[#4a3918]">Senha para login *</label>
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

function PixTypeSelect({ value, onChange, options }) {
	const [open, setOpen] = useState(false);
	const selected = options.find((option) => option.value === value) || options[0];

	return (
		<div className="relative" tabIndex={0} onBlur={() => setTimeout(() => setOpen(false), 120)}>
			<button
				type="button"
				onClick={() => setOpen((prev) => !prev)}
				className="w-full h-11 px-3 border border-[#d6ab4a]/50 rounded-lg bg-white text-left outline-none focus:ring-2 focus:ring-[#d6ab4a]/30 focus:border-[#b8891f]"
			>
				{selected?.label || "Selecione"}
			</button>

			{open && (
				<div className="absolute z-20 mt-1 w-full bg-white border border-amber-200 rounded-lg shadow-md overflow-hidden">
					{options.map((option) => (
						<button
							key={option.value}
							type="button"
							onMouseDown={(e) => e.preventDefault()}
							onPointerDown={(e) => e.preventDefault()}
							onClick={() => {
								onChange(option.value);
								setOpen(false);
							}}
							className="w-full text-left px-3 py-2 text-sm text-gray-900 hover:bg-amber-500/25"
						>
							{option.label}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
