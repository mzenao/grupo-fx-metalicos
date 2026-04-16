import { useEffect, useMemo, useState } from "react";
import { Save, UserRound, Building2 } from "lucide-react";
import { fetchMe, getSessionUser, updateMyAccount } from "@/services/authApi";
import SuccessModal from "@/components/internal/successModal";
import ErrorModal from "@/components/internal/errorModal";
import { emptyAddressFields, mergeAddressFields } from "@/services/addressData";

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
		return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
	}

	if (type === "cnpj") {
		const cnpj = digits(supplier.cnpj).slice(0, 14);
		if (cnpj.length !== 14) return "";
		return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
	}

	if (type === "phone") return supplier.phone || "";
	if (type === "email") return supplier.pix_key_value || "";
	if (type === "random") return supplier.pix_key_value || "";
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
				...emptyAddressFields(),
				pixKeyType: "cpf",
				pixKeyValue: "",
				senhaAtual: "",
				novaSenha: "",
				confirmarNovaSenha: "",
			};
		}

		const initialAddress = mergeAddressFields(
			{
				rua: currentSupplier.rua,
				numero: currentSupplier.numero,
				bairro: currentSupplier.bairro,
				cidade: currentSupplier.cidade,
				estado: currentSupplier.estado,
				pais: currentSupplier.pais,
				cep: currentSupplier.cep,
			},
			currentSupplier.reference_address || currentSupplier.endereco_unificado
		);

		return {
			nomeOuEmpresa: isPf ? currentSupplier.name || "" : currentSupplier.company_name || "",
			documento: isPf ? currentSupplier.cpf || "" : currentSupplier.cnpj || "",
			email: authUser?.email || "",
			telefone: currentSupplier.phone || "",
			...initialAddress,
			pixKeyType: (currentSupplier.pix_key_type || (isPf ? "cpf" : "cnpj")).toLowerCase(),
			pixKeyValue: currentSupplier.pix_key_value || "",
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

		const allowedPixTypes = isPf ? ["cpf", "phone", "email", "random"] : ["cnpj", "phone", "email", "random"];
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
			const requiredAddressFields = ["rua", "numero", "bairro", "cidade", "estado", "pais", "cep"];
			const missingAddress = requiredAddressFields.find((field) => !String(formData[field] || "").trim());
			if (missingAddress) {
				setFeedbackModal({
					open: true,
					type: "error",
					title: "Erro de validação",
					message: "Preencha todos os campos obrigatórios do endereço.",
				});
				setSaving(false);
				return;
			}

			const updated = await updateMyAccount({
				name_or_company: formData.nomeOuEmpresa,
				document: formData.documento,
				email: formData.email,
				phone: formData.telefone,
				rua: formData.rua,
				numero: formData.numero,
				bairro: formData.bairro,
				cidade: formData.cidade,
				estado: formData.estado,
				pais: formData.pais,
				cep: formData.cep,
				pix_key_type: formData.pixKeyType,
				pix_key_value: formData.pixKeyValue,
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
				pixKeyValue: updated?.supplier?.pix_key_value || prev.pixKeyValue,
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
			pix_key_value: formData.pixKeyValue,
			phone: formData.telefone,
			cpf: isPf ? formData.documento : currentSupplier.cpf,
			cnpj: !isPf ? formData.documento : currentSupplier.cnpj,
		});
	}, [currentSupplier, formData.documento, formData.pixKeyType, formData.pixKeyValue, formData.telefone, isPf]);

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
									onChange={(event) => {
										handleChange(event);
										const nextType = event.target.value;
										if (!["email", "random"].includes(nextType)) {
											setFormData((prev) => ({ ...prev, pixKeyValue: "" }));
										}
									}}
								>
									{isPf ? (
										<>
											<option value="cpf">CPF</option>
											<option value="phone">Telefone</option>
											<option value="email">Email</option>
											<option value="random">Aleatória</option>
										</>
									) : (
										<>
											<option value="cnpj">CNPJ</option>
											<option value="phone">Telefone</option>
											<option value="email">Email</option>
											<option value="random">Aleatória</option>
										</>
									)}
								</select>
							</label>
							<InputField
								label="Chave Pix"
								name="pixKeyValue"
								value={pixValue || ""}
								onChange={handleChange}
								readOnly={!(["email", "random"].includes(formData.pixKeyType))}
								className="md:col-span-2"
							/>
							<div className="md:col-span-2">
								<div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4">
									<h3 className="text-sm font-semibold text-slate-900">Campos de Endereco</h3>
									<p className="text-xs text-slate-600 mt-1 mb-4">Preencha os dados de endereco abaixo para atualizar seu cadastro.</p>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<InputField label="CEP" name="cep" value={formData.cep} onChange={handleChange} />
										<InputField label="Rua" name="rua" value={formData.rua} onChange={handleChange} />
										<InputField label="Numero" name="numero" value={formData.numero} onChange={handleChange} />
										<InputField label="Bairro" name="bairro" value={formData.bairro} onChange={handleChange} />
										<InputField label="Cidade" name="cidade" value={formData.cidade} onChange={handleChange} />
										<InputField label="Estado" name="estado" value={formData.estado} onChange={handleChange} />
										<InputField label="Pais" name="pais" value={formData.pais} onChange={handleChange} className="md:col-span-2" />
									</div>
								</div>
							</div>
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

