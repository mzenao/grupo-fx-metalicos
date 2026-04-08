import { useEffect, useMemo, useState } from "react";
import { Save, UserRound, Building2 } from "lucide-react";
import { fetchMe, getSessionUser, updateMyAccount } from "@/services/authApi";
import SuccessModal from "@/components/internal/successModal";
import ErrorModal from "@/components/internal/errorModal";

const personTypeBadge = {
	PF: "bg-sky-100 text-sky-800",
	PJ: "bg-amber-100 text-amber-800",
};

function formatPixValue(pixKeyType, supplier) {
	if (!supplier) return "";
	const type = (pixKeyType || "").toLowerCase();
	const digits = (value) => String(value || "").replace(/\D/g, "");

	if (type === "cpf") {
		const cpf = digits(supplier.cpf).slice(0, 11);
		if (cpf.length !== 11) return "";
		return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1,$2,$3-$4");
	}

	if (type === "cnpj") {
		const cnpj = digits(supplier.cnpj).slice(0, 14);
		if (cnpj.length !== 14) return "";
		return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1,$2,$3/$4-$5");
	}

	if (type === "phone") return supplier.phone || "";
	if (type === "email") return supplier.email || "";
	return "";
}

export default function Account() {
	const [authUser, setAuthUser] = useState(() => getSessionUser());
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [feedbackModal, setFeedbackModal] = useState({
		open: false,
		title: "",
		message: "",
		type: "info",
	});
	const isSupplierUser = authUser?.role === "supplier";
	const currentSupplier = authUser?.supplier || null;

	useEffect(() => {
		let mounted = true;
		setLoading(true);
		fetchMe()
			.then((user) => {
				if (!mounted) return;
				setAuthUser(user || null);
			})
			.catch(() => {
				if (!mounted) return;
				setAuthUser(null);
			})
			.finally(() => {
				if (mounted) setLoading(false);
			});

		return () => {
			mounted = false;
		};
	}, []);

	const isPf = currentSupplier?.is_pf === true;

	const initialFormData = useMemo(() => {
		if (!currentSupplier) {
			return {
				nomeOuEmpresa: "",
				documento: "",
				email: authUser?.email || "",
				telefone: "",
				enderecoUnificado: "",
				pixKeyType: "cpf",
				senhaAtual: "",
				novaSenha: "",
				confirmarNovaSenha: "",
			};
		}

		return {
			nomeOuEmpresa: isPf ? currentSupplier.name || "" : currentSupplier.company_name || "",
			documento: isPf ? currentSupplier.cpf || "" : currentSupplier.cnpj || "",
			email: authUser?.email || "",
			telefone: currentSupplier.phone || "",
			enderecoUnificado: currentSupplier.reference_address || "",
			pixKeyType: (currentSupplier.pix_key_type || (isPf ? "cpf" : "cnpj")).toLowerCase(),
			senhaAtual: "",
			novaSenha: "",
			confirmarNovaSenha: "",
		};
	}, [authUser?.email, currentSupplier, isPf]);

	const [formData, setFormData] = useState(initialFormData);

	useEffect(() => {
		setFormData(initialFormData);
	}, [initialFormData]);

	const handleChange = (event) => {
		const { name, value } = event.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleSubmit = async (event) => {
		event.preventDefault();

		const allowedPixTypes = isPf ? ["cpf", "phone", "email"] : ["cnpj", "phone", "email"];
		if (!allowedPixTypes.includes(formData.pixKeyType)) {
			setFeedbackModal({
				open: true,
				type: "error",
				title: "Erro de validação",
				message: "Selecione uma opção válida para chave Pix.",
			});
			return;
		}

		if (formData.novaSenha || formData.confirmarNovaSenha || formData.senhaAtual) {
			if (!formData.senhaAtual || !formData.novaSenha || !formData.confirmarNovaSenha) {
				setFeedbackModal({
					open: true,
					type: "error",
					title: "Erro de validação",
					message: "Para alterar a senha, preencha senha atual, nova senha e confirmação.",
				});
				return;
			}

			if (formData.novaSenha !== formData.confirmarNovaSenha) {
				setFeedbackModal({
					open: true,
					type: "error",
					title: "Erro de validação",
					message: "A confirmação da nova senha não confere.",
				});
				return;
			}
		}

		setSaving(true);
		try {
			const updated = await updateMyAccount({
				name_or_company: formData.nomeOuEmpresa,
				document: formData.documento,
				email: formData.email,
				phone: formData.telefone,
				reference_address: formData.enderecoUnificado,
				pix_key_type: formData.pixKeyType,
				current_password: formData.senhaAtual,
				new_password: formData.novaSenha,
			});

			setAuthUser(updated || null);
			setFeedbackModal({
				open: true,
				type: "success",
				title: "Dados atualizados",
				message: "Alterações salvas com sucesso.",
			});
			setFormData((prev) => ({
				...prev,
				senhaAtual: "",
				novaSenha: "",
				confirmarNovaSenha: "",
			}));
		} catch (err) {
			setFeedbackModal({
				open: true,
				type: "error",
				title: "Falha ao salvar",
				message: err?.message || "Não foi possível atualizar a conta.",
			});
		} finally {
			setSaving(false);
		}
	};

	const pixValue = useMemo(() => {
		if (!currentSupplier) return "";
		return formatPixValue(formData.pixKeyType, {
			...currentSupplier,
			email: formData.email,
			phone: formData.telefone,
			cpf: isPf ? formData.documento : currentSupplier.cpf,
			cnpj: !isPf ? formData.documento : currentSupplier.cnpj,
		});
	}, [currentSupplier, formData.documento, formData.email, formData.pixKeyType, formData.telefone, isPf]);

	if (loading) {
		return (
			<main className="pt-28 pb-14 px-6 max-w-4xl mx-auto w-full">
				<section className="rounded-2xl border border-amber-200 bg-white p-8 shadow-sm">
					<p className="text-slate-600">Carregando dados da conta...</p>
				</section>
			</main>
		);
	}

	if (!isSupplierUser) {
		return (
			<main className="pt-28 pb-14 px-6 max-w-4xl mx-auto w-full">
				<section className="rounded-2xl border border-amber-200 bg-white p-8 shadow-sm">
					<h1 className="text-2xl font-bold text-slate-900 mb-2">Minha Conta</h1>
					<p className="text-slate-600">Esta área está disponível apenas para fornecedores.</p>
				</section>
			</main>
		);
	}

	return (
		<main className="pt-28 pb-14 px-6 max-w-6xl mx-auto w-full">
			<section className="rounded-3xl border border-amber-200/80 bg-white/95 shadow-[0_14px_34px_rgba(30,22,8,0.08)] overflow-hidden">
				<header className="px-8 py-7 bg-gradient-to-r from-[#1e1608] to-[#3a2a10] text-amber-50">
					<div className="flex items-center gap-3 mb-2">
						{isPf ? <UserRound className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
						<h1 className="text-2xl md:text-3xl font-bold">Minha Conta</h1>
					</div>
					<p className="text-amber-100/85 text-sm md:text-base">
						Atualize seus dados pessoais e mantenha seu cadastro sempre em dia.
					</p>
				</header>

				<form onSubmit={handleSubmit} className="p-8 space-y-8">
					<div>
						<h2 className="text-xl font-semibold text-slate-900 mb-4">Dados cadastrais</h2>
						{currentSupplier && (
							<div className="mb-4 flex flex-wrap items-center gap-2">
								<p className="text-base font-semibold text-slate-900">
									{isPf ? currentSupplier.name : currentSupplier.company_name}
								</p>
								{currentSupplier.supplier_code && (
									<span className={`text-[11px] px-2 py-1 rounded-md font-semibold ${personTypeBadge[isPf ? "PF" : "PJ"]}`}>
										{currentSupplier.supplier_code}
									</span>
								)}
								<span className={`text-[11px] px-2 py-1 rounded-md font-semibold ${personTypeBadge[isPf ? "PF" : "PJ"]}`}>
									{isPf ? "PF" : "PJ"}
								</span>
							</div>
						)}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<InputField
								label={isPf ? "Nome" : "Razao social"}
								name="nomeOuEmpresa"
								value={formData.nomeOuEmpresa}
								onChange={handleChange}
							/>
							<InputField
								label={isPf ? "CPF" : "CNPJ"}
								name="documento"
								value={formData.documento}
								onChange={handleChange}
							/>
							<InputField 
								label="E-mail" 
								name="email" 
								type="email" 
								value={formData.email} 
								onChange={handleChange} 
							/>
							<InputField 
								label="Telefone" 
								name="telefone" 
								value={formData.telefone} 
								onChange={handleChange} 
							/>
							<label className="flex flex-col gap-2">
								<span className="text-sm font-medium text-slate-700">Tipo da chave Pix</span>
								<select
									name="pixKeyType"
									value={formData.pixKeyType}
									onChange={handleChange}
								>
									{isPf ? (
										<>
											<option value="cpf">CPF</option>
											<option value="phone">Telefone</option>
											<option value="email">Email</option>
										</>
									) : (
										<>
											<option value="cnpj">CNPJ</option>
											<option value="phone">Telefone</option>
											<option value="email">Email</option>
										</>
									)}
								</select>
							</label>
							<InputField
								label="Chave Pix"
								name="pixDisplay"
								value={pixValue || ""}
								onChange={() => {}}
								readOnly
								className="md:col-span-2"
							/>
							<TextAreaField
								label="Endereço"
								name="enderecoUnificado"
								value={formData.enderecoUnificado}
								onChange={handleChange}
								placeholder="Ex.: Rua X, 123, Bairro Y, Cidade/UF, CEP 00000-000"
								className="md:col-span-2"
							/>
						</div>
					</div>

					<div>
						<h2 className="text-xl font-semibold text-slate-900 mb-4">Alterar senha</h2>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<InputField
								label="Senha atual"
								name="senhaAtual"
								type="password"
								value={formData.senhaAtual}
								onChange={handleChange}
							/>
							<InputField
								label="Nova senha"
								name="novaSenha"
								type="password"
								value={formData.novaSenha}
								onChange={handleChange}
							/>
							<InputField
								label="Confirmar nova senha"
								name="confirmarNovaSenha"
								type="password"
								value={formData.confirmarNovaSenha}
								onChange={handleChange}
							/>
						</div>
					</div>

					<div className="border-t border-amber-100 pt-6 flex justify-end">
						<button
							type="submit"
							disabled={saving}
							className="rounded-full px-7 py-2 bg-gradient-to-r from-[#b8891f] to-[#d6ab4a] hover:from-[#a67917] hover:to-[#c79a39] text-white font-semibold shadow-[0_8px_18px_rgba(184,137,31,0.35)] flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
						>
							<Save size={16} />
							{saving ? "Salvando..." : "Salvar alterações"}
						</button>
					</div>
				</form>

				<SuccessModal
					open={feedbackModal.open && feedbackModal.type !== "error"}
					title={feedbackModal.title}
					message={feedbackModal.message}
					onClose={() => setFeedbackModal((prev) => ({ ...prev, open: false }))}
				/>
				<ErrorModal
					open={feedbackModal.open && feedbackModal.type === "error"}
					title={feedbackModal.title}
					message={feedbackModal.message}
					hint="Possíveis causas: senha atual incorreta, CPF/CNPJ inexistente ou inválido, documento já em uso, nova senha igual à atual."
					onClose={() => setFeedbackModal((prev) => ({ ...prev, open: false }))}
				/>
			</section>
		</main>
	);
}

function InputField({ label, name, value, onChange, type = "text", className = "", readOnly = false }) {
	return (
		<label className={`flex flex-col gap-2 ${className}`}>
			<span className="text-sm font-medium text-slate-700">{label}</span>
			<input
				type={type}
				name={name}
				value={value}
				onChange={onChange}
				readOnly={readOnly}
				className={`h-11 rounded-xl border border-amber-100 px-3 text-slate-800 outline-none ${readOnly ? "bg-slate-50" : "bg-white focus:border-[#b8891f] focus:ring-2 focus:ring-amber-200"}`}
			/>
		</label>
	);
}

function TextAreaField({ label, name, value, onChange, placeholder = "", className = "" }) {
	return (
		<label className={`flex flex-col gap-2 ${className}`}>
			<span className="text-sm font-medium text-slate-700">{label}</span>
			<textarea
				name={name}
				value={value}
				onChange={onChange}
				placeholder={placeholder}
				rows={4}
				className="rounded-xl border border-amber-100 bg-white px-3 py-2 text-slate-800 outline-none focus:border-[#b8891f] focus:ring-2 focus:ring-amber-200 resize-y"
			/>
		</label>
	);
}
