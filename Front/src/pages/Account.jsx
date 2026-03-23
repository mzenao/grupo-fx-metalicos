import { useMemo, useState } from "react";
import { Save, UserRound, Building2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockSession } from "@/services/mockSession";
import { getStoredSuppliers } from "@/services/entityData";

const defaultFormData = {
	nomeOuEmpresa: "",
	documento: "",
	email: "",
	telefone: "",
	enderecoUnificado: "",
	senhaAtual: "",
	novaSenha: "",
	confirmarNovaSenha: "",
};

export default function Account() {
	const accountType = mockSession.accountType;
	const isUser = mockSession.role === "user";
	const isPf = accountType === "pf";

	const initialFormData = useMemo(() => {
		const suppliers = getStoredSuppliers();
		const currentSupplier = suppliers.find((supplier) => supplier.id === mockSession.currentSupplierId);

		if (!currentSupplier) {
			return {
				...defaultFormData,
				nomeOuEmpresa: mockSession.currentUserName || "",
				email: mockSession.currentUserEmail || "",
			};
		}

		return {
			...defaultFormData,
			nomeOuEmpresa: isPf ? currentSupplier.name || "" : currentSupplier.companyName || "",
			documento: isPf ? currentSupplier.cpf || "" : currentSupplier.cnpj || "",
			email: currentSupplier.email || mockSession.currentUserEmail || "",
			telefone: currentSupplier.phone || "",
			enderecoUnificado: currentSupplier.referenceAddress || "",
		};
	}, [isPf]);

	const [formData, setFormData] = useState(initialFormData);

	const handleChange = (event) => {
		const { name, value } = event.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleSubmit = (event) => {
		event.preventDefault();

		if (formData.novaSenha || formData.confirmarNovaSenha || formData.senhaAtual) {
			if (!formData.senhaAtual || !formData.novaSenha || !formData.confirmarNovaSenha) {
				window.alert("Para alterar a senha, preencha senha atual, nova senha e confirmacao.");
				return;
			}

			if (formData.novaSenha !== formData.confirmarNovaSenha) {
				window.alert("A confirmacao da nova senha nao confere.");
				return;
			}
		}

		// Enquanto nao houver backend, mantemos o envio como feedback local.
		console.log("Dados atualizados:", formData);
		window.alert("Dados salvos localmente. Integracao com backend pendente.");
	};

	if (!isUser) {
		return (
			<main className="pt-28 pb-14 px-6 max-w-4xl mx-auto w-full">
				<section className="rounded-2xl border border-amber-200 bg-white p-8 shadow-sm">
					<div className="flex items-center gap-3 text-slate-900 mb-3">
						<ShieldCheck className="w-6 h-6 text-[#b8891f]" />
						<h1 className="text-2xl font-bold">Minha Conta</h1>
					</div>
					<p className="text-slate-600">
						Esta area de edicao esta disponivel apenas para contas de cliente.
					</p>
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
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<InputField
								label={isPf ? "Nome" : "Nome da empresa"}
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
							<InputField label="E-mail" name="email" type="email" value={formData.email} onChange={handleChange} />
							<InputField label="Telefone" name="telefone" value={formData.telefone} onChange={handleChange} />
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
						<Button
							type="submit"
							className="rounded-full px-7 bg-gradient-to-r from-[#b8891f] to-[#d6ab4a] hover:from-[#a67917] hover:to-[#c79a39] text-white shadow-[0_8px_18px_rgba(184,137,31,0.35)]"
						>
							<Save className="w-4 h-4 mr-2" />
							Salvar alteracoes
						</Button>
					</div>
				</form>
			</section>
		</main>
	);
}

function InputField({ label, name, value, onChange, type = "text", className = "" }) {
	return (
		<label className={`flex flex-col gap-2 ${className}`}>
			<span className="text-sm font-medium text-slate-700">{label}</span>
			<input
				type={type}
				name={name}
				value={value}
				onChange={onChange}
				className="h-11 rounded-xl border border-amber-100 bg-white px-3 text-slate-800 outline-none focus:border-[#b8891f] focus:ring-2 focus:ring-amber-200"
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
