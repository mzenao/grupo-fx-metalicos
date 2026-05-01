import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import DatePicker, { registerLocale } from "react-datepicker";
import { ptBR } from "date-fns/locale";
import {
	Search,
	PackagePlus,
	Calendar,
	ChevronDown,
	ChevronUp,
	Paperclip,
	Upload,
	X,
	DollarSign,
	Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SuccessModal from "@/components/internal/successModal";
import ErrorModal from "@/components/internal/errorModal";
import ConfirmDeleteModal from "@/components/internal/confirmDeleteModal";
import {
	createAdvanceWithAttachments,
	deleteAdvance,
	fetchAdvances,
	resolveAdvanceAttachmentPreviewUrl,
	sendAdvanceComprovantes,
	updateAdvance,
} from "@/services/advancesData";
import {
	fetchEmployees,
	fetchSuppliers,
} from "@/services/entityData";
import { fetchMe, getSessionUser } from "@/services/authApi";
import "react-datepicker/dist/react-datepicker.css";

registerLocale("pt-BR", ptBR);

function getNowLocalDateTime() {
	return new Date();
}

function formatMoney(value) {
	return Number(value || 0).toLocaleString("pt-BR", {
		style: "currency",
		currency: "BRL",
		minimumFractionDigits: 2,
	});
}

function parsePositiveNumber(input) {
	const parsed = Number(input);
	if (!Number.isFinite(parsed) || parsed <= 0) return null;
	return parsed;
}

function formatSupplierLabel(supplier) {
	if (!supplier) return "Fornecedor";
	const baseName =
		(supplier.personType === "PF" ? supplier.name : supplier.companyName) ||
		supplier.label?.replace(/\s*\((PF|PJ)\)\s*$/i, "") ||
		"Fornecedor";

	const code = Number(supplier.supplierCode);
	if (!Number.isFinite(code) || code < 200) return baseName;
	return `${baseName} #${code}`;
}

function formatDateTime(iso) {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleString("pt-BR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function getAdvanceStatusLabel(status) {
	return String(status || "pendente").toLowerCase() === "finalizado" ? "Finalizado" : "Pendente";
}

function getAdvanceStatusBadgeClass(status) {
	return String(status || "pendente").toLowerCase() === "finalizado"
		? "bg-emerald-100 text-emerald-800"
		: "bg-amber-100 text-amber-800";
}

function SearchSelect({ label, placeholder, options, selectedId, onSelect }) {
	const [query, setQuery] = useState("");
	const [open, setOpen] = useState(false);

	const selected = options.find((option) => option.id === selectedId);
	const visibleValue = open ? query : selected?.label || query;

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return options;
		return options.filter((option) => option.label.toLowerCase().includes(q));
	}, [options, query]);

	return (
		<div className="relative">
			<label className="block text-sm font-medium mb-1 text-[#4a3918]">{label} *</label>
			<div className="relative">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
				<input
					value={visibleValue}
					onFocus={() => {
						setOpen(true);
						if (selected) setQuery("");
					}}
					onChange={(e) => {
						setQuery(e.target.value);
						onSelect(null);
						setOpen(true);
					}}
					onBlur={() => setTimeout(() => setOpen(false), 120)}
					placeholder={placeholder}
					className="w-full h-11 pl-9 pr-3 border border-[#d6ab4a]/50 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#d6ab4a]/30 focus:border-[#b8891f]"
				/>
			</div>

			{open && (
				<div className="absolute z-20 mt-1 w-full max-h-52 overflow-y-auto bg-white border border-amber-200 rounded-xl shadow-lg">
					{filtered.length === 0 ? (
						<p className="px-3 py-2 text-sm text-gray-500">Nenhum resultado</p>
					) : (
						filtered.map((option) => (
							<button
								key={option.id}
								type="button"
								onMouseDown={(e) => e.preventDefault()}
								onPointerDown={(e) => e.preventDefault()}
								onClick={() => {
									onSelect(option.id);
									setQuery(option.label);
									setOpen(false);
								}}
								className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50"
							>
								{option.label}
							</button>
						))
					)}
				</div>
			)}
		</div>
	);
}

function ProgressBar({ value, max }) {
	const percentage = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
	return (
		<div className="w-full rounded-full bg-gray-200 h-2 overflow-hidden">
			<div
				className="h-full bg-gradient-to-r from-[#b8891f] to-[#d6ab4a]"
				style={{ width: `${percentage}%` }}
			/>
		</div>
	);
}

export default function AdiantamentosPage({ supplierMode = false, embedded = false }) {
	const location = useLocation();
	const fileInputRef = useRef(null);
	const hashId = Number((location.hash || "").replace("#", "")) || null;

	const [authUser, setAuthUser] = useState(() => getSessionUser());
	const [suppliers, setSuppliers] = useState([]);
	const [employees, setEmployees] = useState([]);
	const [advances, setAdvances] = useState([]);
	const [searchId, setSearchId] = useState("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [supplierId, setSupplierId] = useState(null);
	const [employeeId, setEmployeeId] = useState(null);
	const [valueTotal, setValueTotal] = useState("");
	const [advanceDatetime, setAdvanceDatetime] = useState(null);
	const [attachments, setAttachments] = useState([]);
	const [dragActive, setDragActive] = useState(false);
	const [creating, setCreating] = useState(false);
	const [errorModal, setErrorModal] = useState({ open: false, title: "", message: "" });
	const [infoModal, setInfoModal] = useState({ open: false, title: "", message: "" });
	const [expandedAdvanceId, setExpandedAdvanceId] = useState(null);
	const [sendingAdvanceId, setSendingAdvanceId] = useState(null);
	const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null, itemLabel: "", password: "" });
	const [deletingAdvance, setDeletingAdvance] = useState(false);
	const [editingAdvanceId, setEditingAdvanceId] = useState(null);
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [editSupplierId, setEditSupplierId] = useState(null);
	const [editEmployeeId, setEditEmployeeId] = useState(null);
	const [editValueTotal, setEditValueTotal] = useState("");
	const [editAdvanceDatetime, setEditAdvanceDatetime] = useState(null);
	const [editStatus, setEditStatus] = useState("pendente");
	const [editError, setEditError] = useState("");
	const [openingAttachmentId, setOpeningAttachmentId] = useState(null);

	const handleOpenAttachment = async (attachment) => {
		const directHttpUrl = attachment?.file_url || "";
		if (/^https?:\/\//i.test(directHttpUrl)) {
			window.open(directHttpUrl, "_blank", "noopener,noreferrer");
			return;
		}

		const fallbackUrl = attachment?.file_url || attachment?.file_path || "";
		const canAttempt = Boolean(attachment?.id || /^https?:\/\//i.test(fallbackUrl));
		if (!canAttempt) return;

		setOpeningAttachmentId(attachment?.id || attachment?.file_name || "opening");
		try {
			const resolvedUrl = await resolveAdvanceAttachmentPreviewUrl(attachment);
			if (!resolvedUrl) throw new Error("Arquivo indisponivel");
			const opened = window.open(resolvedUrl, "_blank", "noopener,noreferrer");
			if (!opened) {
				throw new Error("Bloqueio de popup");
			}
		} catch {
			setErrorModal({
				open: true,
				title: "Falha ao abrir comprovante",
				message: "Nao foi possivel abrir o comprovante agora.",
			});
		} finally {
			setOpeningAttachmentId(null);
		}
	};

	useEffect(() => {
		let mounted = true;
		setLoading(true);

		Promise.resolve()
			.then(async () => {
				const [user, suppliersData, employeesData, advancesData] = await Promise.all([
					fetchMe().catch(() => null),
					fetchSuppliers().catch(() => []),
					fetchEmployees().catch(() => []),
					fetchAdvances().catch(() => []),
				]);

				if (!mounted) return;
				setAuthUser(user || null);
				setSuppliers(suppliersData);
				setEmployees(employeesData);
				setAdvances(advancesData);
			})
			.catch((err) => {
				if (!mounted) return;
				setError(err?.message || "Erro ao carregar dados");
			})
			.finally(() => {
				if (mounted) setLoading(false);
			});

		return () => {
			mounted = false;
		};
	}, []);

	const isSupplier = authUser?.role === "supplier";
	const currentSupplierId = authUser?.supplier?.id || null;
	const currentSupplier = authUser?.supplier || null;

	const supplierOptions = useMemo(
		() =>
			suppliers.map((supplier) => ({
				id: supplier.id,
				label: formatSupplierLabel(supplier),
			})),
		[suppliers]
	);

	const employeeOptions = useMemo(
		() =>
			employees.map((employee) => ({
				id: employee.id,
				label: employee.name,
			})),
		[employees]
	);

	const suppliersById = useMemo(() => {
		const map = new Map();
		suppliers.forEach((supplier) => {
			map.set(supplier.id, supplier);
		});
		return map;
	}, [suppliers]);

	const visibleAdvances = useMemo(() => {
		const scoped = supplierMode || isSupplier
			? advances.filter((advance) => String(advance.SupplierId) === String(currentSupplierId))
			: advances;

		const filtered = searchId.trim()
			? scoped.filter((advance) => String(advance.id).includes(searchId.trim()))
			: scoped;

		return [...filtered].sort((a, b) => {
			const dateA = new Date(a.advanceDatetime || 0).getTime();
			const dateB = new Date(b.advanceDatetime || 0).getTime();
			if (dateB !== dateA) return dateB - dateA;
			return (Number(b.id) || 0) - (Number(a.id) || 0);
		});
	}, [advances, currentSupplierId, isSupplier, searchId, supplierMode]);

	const summary = useMemo(() => {
		const total = visibleAdvances.length;
		const pending = visibleAdvances.filter((advance) => advance.status === "pendente").length;
		const finalized = visibleAdvances.filter((advance) => advance.status === "finalizado").length;
		const remaining = visibleAdvances.reduce((sum, advance) => sum + (Number(advance.valueRemaining) || 0), 0);
		const totalValue = visibleAdvances.reduce((sum, advance) => sum + (Number(advance.valueTotal) || 0), 0);
		return { total, pending, finalized, remaining, totalValue };
	}, [visibleAdvances]);

	const pendingAdvancesForSupplier = useMemo(() => {
		if (!supplierId) return [];
		return advances.filter((advance) => String(advance.SupplierId) === String(supplierId) && advance.status === "pendente");
	}, [advances, supplierId]);

	const handleFiles = (fileList) => {
		const files = Array.from(fileList || []);
		if (files.length === 0) return;

		setAttachments((prev) => {
			const currentKeys = new Set(prev.map((file) => `${file.name}-${file.size}-${file.lastModified}`));
			const newOnes = files.filter((file) => {
				const key = `${file.name}-${file.size}-${file.lastModified}`;
				return !currentKeys.has(key);
			});
			return [...prev, ...newOnes];
		});
	};

	const removeAttachment = (index) => {
		setAttachments((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
	};

	const handleSubmit = async (event) => {
		event.preventDefault();
		setError("");

		if (!supplierId) {
			setError("Selecione um Fornecedor.");
			return;
		}

		if (!employeeId) {
			setError("Selecione o funcionario responsavel.");
			return;
		}

		if (!valueTotal || Number(valueTotal) <= 0) {
			setError("Informe um valor valido.");
			return;
		}

		if (!advanceDatetime) {
			setError("Informe a data do adiantamento.");
			return;
		}

		if (attachments.length === 0) {
			setError("Anexe pelo menos um comprovante.");
			return;
		}

		setCreating(true);
		try {
			await createAdvanceWithAttachments({
				advancePayload: {
					supplier_id: supplierId,
					employee_id: employeeId,
					value_total: valueTotal,
					advance_datetime: advanceDatetime.toISOString(),
				},
				files: attachments,
			});

			const refreshed = await fetchAdvances();
			setAdvances(refreshed);
			setSupplierId(null);
			setEmployeeId(null);
			setValueTotal("");
			setAdvanceDatetime(null);
			setAttachments([]);
			setIsCreateOpen(false);
			setInfoModal({
				open: true,
				title: "Adiantamento salvo",
				message: "O adiantamento foi criado com sucesso.",
			});
		} catch (err) {
			setError(err?.message || "Erro ao salvar adiantamento.");
		} finally {
			setCreating(false);
		}
	};

	const handleDeleteAdvanceConfirm = async () => {
		const advanceId = confirmDelete.id;
		if (!advanceId) return;
		if (!String(confirmDelete.password || "").trim()) return;

		setDeletingAdvance(true);
		try {
			await deleteAdvance(advanceId, confirmDelete.password);
			const refreshed = await fetchAdvances();
			setAdvances(refreshed);
			setConfirmDelete({ open: false, id: null, itemLabel: "", password: "" });
			if (expandedAdvanceId === advanceId) {
				setExpandedAdvanceId(null);
			}
		} catch (err) {
			const errorMessage = err?.message || "Erro ao remover adiantamento.";
			const isInvalidPassword = /senha atual invalida/i.test(errorMessage);

			if (isInvalidPassword) {
				setConfirmDelete({ open: false, id: null, itemLabel: "", password: "" });
				setInfoModal((prev) => ({ ...prev, open: false }));
			}

			setErrorModal({
				open: true,
				title: "Erro ao remover",
				message: errorMessage,
			});
		} finally {
			setDeletingAdvance(false);
		}
	};

	const openEditAdvanceCard = (advance) => {
		const parsedDate = advance?.advanceDatetime ? new Date(advance.advanceDatetime) : null;
		const safeDate = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null;

		if (editingAdvanceId === advance.id) {
			setIsEditOpen((prev) => !prev);
			return;
		}

		setEditingAdvanceId(advance.id);
		setEditSupplierId(advance.SupplierId || null);
		setEditEmployeeId(advance.employeeId || null);
		setEditValueTotal(advance.valueTotal || "");
		setEditAdvanceDatetime(safeDate);
		setEditStatus(String(advance.status || "pendente").toLowerCase());
		setEditError("");
		setIsEditOpen(true);
		setExpandedAdvanceId(advance.id);
	};

	const handleEditSubmit = async (event) => {
		event.preventDefault();
		setEditError("");

		if (!editingAdvanceId) {
			setEditError("Selecione um adiantamento para editar.");
			return;
		}

		if (!editSupplierId) {
			setEditError("Selecione um fornecedor.");
			return;
		}

		if (!editEmployeeId) {
			setEditError("Selecione o funcionario responsavel.");
			return;
		}

		if (!editValueTotal || Number(editValueTotal) <= 0) {
			setEditError("Informe um valor total valido.");
			return;
		}

		if (!editAdvanceDatetime) {
			setEditError("Informe a data do adiantamento.");
			return;
		}

		if (!["pendente", "finalizado"].includes(String(editStatus || "").toLowerCase())) {
			setEditError("Selecione um status valido.");
			return;
		}

		try {
			await updateAdvance(editingAdvanceId, {
				supplier_id: editSupplierId,
				employee_id: editEmployeeId,
				value_total: editValueTotal,
				advance_datetime: editAdvanceDatetime.toISOString(),
				status: String(editStatus || "pendente").toLowerCase(),
			});

			const refreshed = await fetchAdvances();
			setAdvances(refreshed);
			setIsEditOpen(false);
			setEditingAdvanceId(null);
		} catch (err) {
			setEditError(err?.message || "Erro ao atualizar adiantamento.");
		}
	};

	const handleSendComprovantes = async (advance) => {
		if (!advance?.id) return;

		const supplierName = advance?.SupplierName || "Fornecedor";
		const attachmentCount = advance?.attachments?.length || advance?.attachmentNames?.length || 0;

		if (!attachmentCount) {
			setErrorModal({
				open: true,
				title: "Comprovantes ausentes",
				message: `O adiantamento #${advance.id} do fornecedor ${supplierName} nao possui comprovantes anexados.`,
			});
			return;
		}

		setSendingAdvanceId(advance.id);
		try {
			const sendResult = await sendAdvanceComprovantes(advance.id);
			const sentByWhatsapp = Boolean(sendResult?.text_sent);
			const sentByEmail = Boolean(sendResult?.email_sent);
			const sentByBoth = sentByWhatsapp && sentByEmail;
			const emailError = sendResult?.email_error;

			if (sentByBoth) {
				setInfoModal({
					open: true,
					title: "Comprovantes enviados com sucesso",
					message: `${attachmentCount} comprovante(s) do adiantamento #${advance.id} do fornecedor ${supplierName} enviados com sucesso por WhatsApp e Email.`,
				});
				return;
			}

			if (sentByWhatsapp && !sentByEmail) {
				setErrorModal({
					open: true,
					title: "Envio parcial",
					message:
						emailError ||
						`Comprovantes enviados no WhatsApp, mas o envio por Email falhou para o adiantamento #${advance.id} do fornecedor ${supplierName}.`,
				});
				return;
			}

			setErrorModal({
				open: true,
				title: "Falha no envio",
				message: `Nao foi possivel confirmar o envio completo (WhatsApp + Email) dos comprovantes do adiantamento #${advance.id} do fornecedor ${supplierName}.`,
			});
		} catch (err) {
			setErrorModal({
				open: true,
				title: "Falha no envio",
				message: err?.message || `Nao foi possivel enviar os comprovantes do adiantamento #${advance.id} do fornecedor ${supplierName}.`,
			});
		} finally {
			setSendingAdvanceId(null);
		}
	};

	if (loading) {
		return (
			<main className={embedded ? "space-y-6 w-full" : "pt-28 pb-14 px-6 max-w-6xl mx-auto w-full"}>
				<section className="rounded-2xl border border-amber-200 bg-white p-8 shadow-sm">
					<p className="text-slate-600">Carregando adiantamentos...</p>
				</section>
			</main>
		);
	}

	if (isSupplier && !currentSupplierId) {
		return (
			<main className={embedded ? "space-y-6 w-full" : "pt-28 pb-14 px-6 max-w-6xl mx-auto w-full"}>
				<section className="rounded-2xl border border-amber-200 bg-white p-8 shadow-sm">
					<h1 className="text-2xl font-bold text-slate-900 mb-2">Meus Adiantamentos</h1>
					<p className="text-slate-600">Perfil de fornecedor não encontrado.</p>
				</section>
			</main>
		);
	}

	const containerClass = embedded ? "space-y-6 w-full" : "pt-28 pb-14 px-6 max-w-6xl mx-auto w-full";
	const isExternalView = supplierMode || isSupplier;

	if (!isExternalView) {
		return (
			<div className="space-y-6">
				<div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5 sm:p-6">
					<button
						type="button"
						onClick={() => setIsCreateOpen((prev) => !prev)}
						className="w-full flex items-center justify-between gap-3 text-left"
					>
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#b8891f] to-[#d6ab4a] text-white flex items-center justify-center">
								<PackagePlus className="w-5 h-5" />
							</div>
							<div>
								<h2 className="text-lg font-semibold text-gray-900">Novo adiantamento</h2>
								<p className="text-sm text-gray-500">
									{isCreateOpen ? "Preencha os dados e salve." : "Clique para abrir o formulário de criação."}
								</p>
							</div>
						</div>

						<div className="text-gray-500">
							{isCreateOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
						</div>
					</button>

					{isCreateOpen && (
						<>
							{error && (
								<div className="mb-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
									{error}
								</div>
							)}

							<form onSubmit={handleSubmit} className="space-y-5 mt-4">
								<div className="grid md:grid-cols-2 gap-4">
									<SearchSelect
										label="Fornecedor"
										placeholder="Pesquisar fornecedor..."
										options={supplierOptions}
										selectedId={supplierId}
										onSelect={setSupplierId}
									/>

									<SearchSelect
										label="Funcionario responsavel"
										placeholder="Pesquisar funcionario..."
										options={employeeOptions}
										selectedId={employeeId}
										onSelect={setEmployeeId}
									/>

									<div>
										<label className="block text-sm font-medium mb-1 text-[#4a3918]">Valor total (R$) *</label>
										<div className="relative">
											<DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
											<input
												type="number"
												step="0.01"
												min="0"
												value={valueTotal}
												onChange={(e) => setValueTotal(e.target.value)}
												placeholder="Ex.: 1500"
												className="w-full h-11 pl-9 pr-3 border border-[#d6ab4a]/50 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#d6ab4a]/30 focus:border-[#b8891f] placeholder:text-gray-400"
											/>
										</div>
									</div>

									<div>
										<label className="block text-sm font-medium mb-1 text-[#4a3918]">Data *</label>
										<div className="relative max-w-sm">
											<Calendar className="absolute z-10 pointer-events-none left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
											<DatePicker
												selected={advanceDatetime}
												onChange={(date) => setAdvanceDatetime(date || new Date())}
												onInputClick={() => {
													if (!advanceDatetime) setAdvanceDatetime(getNowLocalDateTime());
												}}
												showTimeSelect
												timeIntervals={5}
												timeFormat="HH:mm"
												dateFormat="dd/MM/yyyy HH:mm"
												locale="pt-BR"
												placeholderText="Data e hora"
												wrapperClassName="w-full"
												className="w-full h-11 pl-9 pr-3 border border-[#d6ab4a]/50 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#d6ab4a]/30 focus:border-[#b8891f]"
												calendarClassName="border-0 shadow-lg"
												popperPlacement="bottom-start"
											/>
										</div>
									</div>
								</div>

								<div>
									<label className="block text-sm font-medium mb-2 text-[#4a3918]">Comprovantes *</label>
									<div
										onDragOver={(e) => {
											e.preventDefault();
											setDragActive(true);
										}}
										onDragLeave={() => setDragActive(false)}
										onDrop={(e) => {
											e.preventDefault();
											setDragActive(false);
											handleFiles(e.dataTransfer.files);
										}}
										className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
											dragActive
												? "border-[#b8891f] bg-amber-50"
												: "border-amber-200 bg-amber-50/40"
										}`}
									>
										<Upload className="w-7 h-7 mx-auto text-[#b8891f] mb-2" />
										<p className="font-medium text-gray-800">Arraste aqui os comprovantes</p>
										<p className="text-sm text-gray-500">Comprovante do adiantamento</p>
										<Button
											type="button"
											variant="outline"
											onClick={() => fileInputRef.current?.click()}
											className="mt-3 border-[#c7a04a] text-[#6a521f] hover:bg-[#f5e7c0]"
										>
											Selecionar arquivos
										</Button>
										<input
											ref={fileInputRef}
											type="file"
											multiple
											onChange={(e) => handleFiles(e.target.files)}
											className="hidden"
										/>
									</div>

									{attachments.length > 0 && (
										<div className="mt-3 flex flex-wrap gap-2">
											{attachments.map((file, index) => (
												<span
													key={`${file.name}-${file.size}-${file.lastModified}`}
													className="inline-flex items-center gap-2 bg-white border border-amber-200 rounded-full px-3 py-1.5 text-xs text-gray-700"
												>
													<Paperclip className="w-3 h-3 text-[#b8891f]" />
													{file.name}
													<button
														type="button"
														onClick={() => removeAttachment(index)}
														className="text-gray-400 hover:text-red-500"
													>
														<X className="w-3 h-3" />
													</button>
												</span>
											))}
										</div>
									)}
								</div>

								<div className="flex flex-wrap gap-3 pt-2">
									<Button type="submit" className="bg-gradient-to-r from-[#b8891f] to-[#d6ab4a] text-white hover:brightness-105" disabled={creating}>
										{creating ? "Salvando..." : "Salvar adiantamento"}
									</Button>
								</div>
							</form>
						</>
					)}
				</div>

				{error && (
					<div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
						{error}
					</div>
				)}

				<section className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
					<div className="px-5 py-4 border-b border-amber-100 flex items-center justify-between">
						<h3 className="font-semibold text-gray-900">Adiantamentos registrados</h3>
						<span className="text-xs text-gray-500">{visibleAdvances.length} adiantamentos</span>
					</div>

					<div className="divide-y divide-gray-100">
						{visibleAdvances.length === 0 ? (
							<div className="p-8 text-center text-slate-700">Nenhum adiantamento encontrado.</div>
						) : (
							visibleAdvances.map((advance) => {
								const isExpanded = expandedAdvanceId === advance.id;
								const total = Number(advance.valueTotal) || 0;
								const remaining = Number(advance.valueRemaining) || 0;
								const applied = Math.max(0, total - remaining);
								const percent = total > 0 ? Math.round((applied / total) * 100) : 0;

								return (
									<div key={advance.id}>
										<button
											type="button"
											onClick={() => setExpandedAdvanceId((prev) => (prev === advance.id ? null : advance.id))}
											className="w-full p-4 text-left cursor-pointer hover:bg-amber-50/40"
										>
											<div className="flex items-start justify-between gap-3">
												<div className="min-w-0">
													<div className="flex flex-wrap items-center gap-2">
														<p className="font-semibold text-gray-900">Adiantamento #{advance.id}</p>
														<span className={`text-[11px] px-2 py-1 rounded-md font-semibold ${getAdvanceStatusBadgeClass(advance.status)}`}>
															{getAdvanceStatusLabel(advance.status)}
														</span>
													</div>
													<p className="text-xs text-gray-500">{formatDateTime(advance.advanceDatetime)}</p>
												</div>
												<div className="text-gray-400 flex-shrink-0 mt-0.5">
													{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
												</div>
											</div>

											<div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm mt-2">
												<p>
													<span className="text-gray-500">Fornecedor:</span> {advance.SupplierName}
												</p>
												<p>
													<span className="text-gray-500">Funcionário:</span> {advance.employeeName}
												</p>
												<p>
													<span className="text-gray-500">Valor total:</span> {formatMoney(advance.valueTotal)}
												</p>
												<p>
													<span className="text-gray-500">Sald0 Devedor:</span> {formatMoney(advance.valueRemaining)}
												</p>
											</div>
										</button>

										{isExpanded && (
											<div className="px-4 pb-4 bg-amber-50/35 border-t border-amber-100">
												<div className="pt-4 space-y-3">
													<p className="text-xs text-gray-500">
														Status: <span className="font-semibold text-gray-800">{advance.status || "pendente"}</span>
													</p>
													<p className="text-xs text-gray-500">Progresso de abatimento: {percent}%</p>
													<ProgressBar value={applied} max={total} />
													<p className="text-xs text-gray-500 mt-2">
														Comprovantes: {advance.attachmentNames.join(", ") || "Nenhum"}
													</p>
													<div className="flex flex-wrap gap-3 pt-2">
														<Button
															type="button"
															variant="outline"
															onClick={() => openEditAdvanceCard(advance)}
														>
															{editingAdvanceId === advance.id && isEditOpen ? "Fechar edicao" : "Editar adiantamento"}
														</Button>
													</div>

													{editingAdvanceId === advance.id && isEditOpen && (
														<form onSubmit={handleEditSubmit} className="space-y-5 mt-4" onClick={(e) => e.stopPropagation()}>
															{editError && (
																<div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
																	{editError}
																</div>
															)}

															<div className="grid md:grid-cols-2 gap-4">
																<SearchSelect
																	label="Fornecedor"
																	placeholder="Pesquisar fornecedor..."
																	options={supplierOptions}
																	selectedId={editSupplierId}
																	onSelect={setEditSupplierId}
																/>

																<SearchSelect
																	label="Funcionario responsavel"
																	placeholder="Pesquisar funcionario..."
																	options={employeeOptions}
																	selectedId={editEmployeeId}
																	onSelect={setEditEmployeeId}
																/>

																<div>
																	<label className="block text-sm font-medium mb-1 text-[#4a3918]">Valor total (R$) *</label>
																	<input
																		type="number"
																		step="0.01"
																		min="0"
																		value={editValueTotal}
																		onChange={(e) => setEditValueTotal(e.target.value)}
																		className="w-full h-11 px-3 border border-[#d6ab4a]/50 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#d6ab4a]/30 focus:border-[#b8891f]"
																	/>
																</div>

																<div>
																	<label className="block text-sm font-medium mb-1 text-[#4a3918]">Status *</label>
																	<select
																		value={editStatus}
																		onChange={(e) => setEditStatus(e.target.value)}
																		className="w-full h-11 px-3 border border-[#d6ab4a]/50 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#d6ab4a]/30 focus:border-[#b8891f]"
																	>
																		<option value="pendente">Pendente</option>
																		<option value="finalizado">Finalizado</option>
																	</select>
																</div>

																<div className="md:col-span-2">
																	<label className="block text-sm font-medium mb-1 text-[#4a3918]">Dia e hora *</label>
																	<div className="relative max-w-sm">
																		<Calendar className="absolute z-10 pointer-events-none left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
																		<DatePicker
																			selected={editAdvanceDatetime}
																			onChange={(date) => setEditAdvanceDatetime(date || new Date())}
																			showTimeSelect
																			timeIntervals={5}
																			timeFormat="HH:mm"
																			dateFormat="dd/MM/yyyy HH:mm"
																			locale="pt-BR"
																			placeholderText="Data e hora"
																			wrapperClassName="w-full"
																			className="w-full h-11 pl-9 pr-3 border border-[#d6ab4a]/50 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#d6ab4a]/30 focus:border-[#b8891f]"
																			calendarClassName="border-0 shadow-lg"
																			popperPlacement="bottom-start"
																		/>
																	</div>
																</div>
															</div>

															<div className="flex flex-wrap gap-3 pt-2">
																<Button type="submit" className="bg-gradient-to-r from-[#b8891f] to-[#d6ab4a] text-white hover:brightness-105">
																	Salvar adiantamento
																</Button>
															</div>
														</form>
													)}
													<div className="flex flex-wrap gap-3 pt-2">
														<Button
															type="button"
															variant="outline"
															onClick={() => handleSendComprovantes(advance)}
															disabled={sendingAdvanceId === advance.id}
														>
															<Send className="w-4 h-4" /> {sendingAdvanceId === advance.id ? "Enviando..." : "Enviar comprovantes no WhatsApp/Email"}
														</Button>

														<Button
															type="button"
															variant="outline"
															onClick={() => setConfirmDelete({ open: true, id: advance.id, itemLabel: `Adiantamento #${advance.id}`, password: "" })}
															className="border-red-300 text-red-700 hover:bg-red-50"
														>
															Excluir adiantamento
														</Button>
													</div>
												</div>
											</div>
										)}
									</div>
								);
							})
						)}
					</div>
				</section>

				<SuccessModal
					open={infoModal.open}
					title={infoModal.title}
					message={infoModal.message}
					onClose={() => setInfoModal((prev) => ({ ...prev, open: false }))}
				/>
				<ErrorModal
					open={errorModal.open}
					title={errorModal.title}
					message={errorModal.message}
					onClose={() => setErrorModal((prev) => ({ ...prev, open: false }))}
				/>
				<ConfirmDeleteModal
					open={confirmDelete.open}
					title="Excluir adiantamento"
					message="Tem certeza que deseja excluir este adiantamento? Esta acao nao pode ser desfeita."
					itemLabel={confirmDelete.itemLabel}
					password={confirmDelete.password}
					onPasswordChange={(password) => setConfirmDelete((prev) => ({ ...prev, password }))}
					onCancel={() => setConfirmDelete({ open: false, id: null, itemLabel: "", password: "" })}
					onConfirm={handleDeleteAdvanceConfirm}
					loading={deletingAdvance}
				/>
			</div>
		);
	}

	return (
		<main className={containerClass}>
			<section className="rounded-3xl border border-amber-200/80 bg-white/95 shadow-[0_14px_34px_rgba(30,22,8,0.08)] overflow-hidden">
				<header className="px-8 py-7 bg-gradient-to-r from-[#1e1608] to-[#3a2a10] text-amber-50">
					<h1 className="text-2xl md:text-3xl font-bold">Meus Adiantamentos</h1>
					{currentSupplier && (
						<div className="mt-3 flex flex-wrap items-center gap-2">
							<p className="text-sm md:text-base font-semibold text-amber-50">
								{currentSupplier.personType === "PF" ? currentSupplier.name : currentSupplier.companyName}
							</p>
							{currentSupplier.supplier_code && (
								<span className="text-[11px] px-2 py-1 rounded-md font-semibold bg-sky-100 text-sky-800">
									{currentSupplier.supplier_code}
								</span>
							)}
						</div>
					)}
					<p className="text-amber-100/85 text-sm md:text-base mt-2">
						Adiantamentos vinculados ao fornecedor logado.
					</p>
				</header>

				<div className="p-8 space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
						<SummaryCard label="Total de adiantamentos" value={`${summary.total}`} />
						<SummaryCard label="Sald0 Devedor" value={formatMoney(summary.remaining)} />
					</div>

					<div>
						<input
							type="text"
							placeholder="Pesquisar por ID do adiantamento..."
							value={searchId}
							onChange={(e) => setSearchId(e.target.value)}
							className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
						/>
					</div>

					{error && (
						<div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
					)}

					{visibleAdvances.length === 0 ? (
						<div className="rounded-2xl border border-amber-100 bg-amber-50/45 p-8 text-center">
							<p className="text-slate-700 font-medium">
								{searchId.trim() ? "Nenhum adiantamento encontrado com este ID." : "Nenhum adiantamento encontrado para este fornecedor."}
							</p>
						</div>
					) : (
						<section className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
							<div className="px-5 py-4 border-b border-amber-100 flex items-center justify-between">
								<h3 className="font-semibold text-gray-900">Adiantamentos registrados</h3>
								<span className="text-xs text-gray-500">{visibleAdvances.length} adiantamentos</span>
							</div>

							<div className="divide-y divide-gray-100">
								{visibleAdvances.map((advance) => {
									const isExpanded = expandedAdvanceId === advance.id;
									const total = Number(advance.valueTotal) || 0;
									const remaining = Number(advance.valueRemaining) || 0;
									const applied = Math.max(0, total - remaining);
									const percent = total > 0 ? Math.round((applied / total) * 100) : 0;

									return (
										<div key={advance.id}>
											<button
												type="button"
												onClick={() => setExpandedAdvanceId((prev) => (prev === advance.id ? null : advance.id))}
												className="w-full p-4 text-left cursor-pointer hover:bg-amber-50/40"
											>
												<div className="flex items-start justify-between gap-3">
													<div className="min-w-0">
														<div className="flex flex-wrap items-center gap-2">
															<p className="font-semibold text-gray-900">Adiantamento #{advance.id}</p>
															<span className={`text-[11px] px-2 py-1 rounded-md font-semibold ${getAdvanceStatusBadgeClass(advance.status)}`}>
																{getAdvanceStatusLabel(advance.status)}
															</span>
														</div>
														<p className="text-xs text-gray-500">{formatDateTime(advance.advanceDatetime)}</p>
													</div>
													<div className="text-gray-400 flex-shrink-0 mt-0.5">
														{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
													</div>
												</div>

												<div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm mt-2">
													<p><span className="text-gray-500">Fornecedor:</span> {advance.SupplierName || "-"}</p>
													<p><span className="text-gray-500">Funcionário:</span> {advance.employeeName || "-"}</p>
													<p><span className="text-gray-500">Valor total:</span> {formatMoney(advance.valueTotal)}</p>
													<p><span className="text-gray-500">Sald0 Devedor:</span> {formatMoney(advance.valueRemaining)}</p>
												</div>
												<p className="text-xs text-gray-500 mt-2">
													Comprovantes: {advance.attachmentNames?.join(", ") || "Nenhum"}
												</p>
											</button>

											{isExpanded && (
												<div className="px-4 pb-4 bg-amber-50/35 border-t border-amber-100">
													<div className="pt-4 space-y-5">
														<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
															<InfoSection label="Fornecedor" value={advance.SupplierName || "-"} />
															<InfoSection label="Funcionário" value={advance.employeeName || "-"} />
															<InfoSection label="Valor total" value={formatMoney(advance.valueTotal)} />
															<InfoSection label="Valor restante" value={formatMoney(advance.valueRemaining)} />
															<InfoSection label="Data e Hora" value={formatDateTime(advance.advanceDatetime)} />
															<InfoSection label="Status" value={advance.status || "pendente"} />
														</div>

														<div>
															<p className="text-xs text-gray-500 mb-2">Progresso do abatimento</p>
															<ProgressBar value={applied} max={total} />
															<p className="text-xs text-gray-500 mt-2">{percent}% abatido</p>
														</div>

														<div className="pt-4 border-t border-amber-100">
															<p className="text-sm font-semibold text-gray-700 mb-3">
																Anexos ({advance.attachmentNames?.length || 0})
															</p>
															{advance.attachmentNames?.length > 0 ? (
																<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
																	{advance.attachments.map((attachment) => {
																		const fallbackUrl = attachment?.file_url || attachment?.file_path || "";
																		const hasLink = Boolean(attachment?.id || /^https?:\/\//i.test(fallbackUrl));
																		const isOpening = openingAttachmentId === (attachment?.id || attachment?.file_name || "opening");

																		return (
																			<button
																				type="button"
																				key={attachment.id}
																				className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
																					hasLink
																						? "border-amber-200 bg-amber-50/40 text-amber-900 hover:bg-amber-100/60"
																						: "border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
																				}`}
																				onClick={() => hasLink && handleOpenAttachment(attachment)}
																				disabled={!hasLink || isOpening}
																			>
																				<p className="font-medium break-all">{attachment.file_name || "Anexo"}</p>
																				<p className="text-xs mt-1 opacity-80">
																					{hasLink ? (isOpening ? "Abrindo..." : "Clique para visualizar") : "Arquivo indisponivel"}
																				</p>
																			</button>
																		);
																	})}
																</div>
															) : (
																<div className="border-2 border-dashed border-gray-200 rounded-lg p-6 bg-gray-50/50 text-center">
																	<p className="text-sm text-gray-500">Nenhum anexo anexado</p>
																</div>
															)}
														</div>
													</div>
												</div>
											)}
										</div>
									);
								})}
							</div>
						</section>
					)}
				</div>
			</section>

			<SuccessModal
				open={infoModal.open}
				title={infoModal.title}
				message={infoModal.message}
				onClose={() => setInfoModal((prev) => ({ ...prev, open: false }))}
			/>
			<ErrorModal
				open={errorModal.open}
				title={errorModal.title}
				message={errorModal.message}
				onClose={() => setErrorModal((prev) => ({ ...prev, open: false }))}
			/>
			<ConfirmDeleteModal
				open={confirmDelete.open}
				title="Excluir adiantamento"
				message="Tem certeza que deseja excluir este adiantamento? Esta acao nao pode ser desfeita."
					itemLabel={confirmDelete.itemLabel}
					password={confirmDelete.password}
					onPasswordChange={(password) => setConfirmDelete((prev) => ({ ...prev, password }))}
					onCancel={() => setConfirmDelete({ open: false, id: null, itemLabel: "", password: "" })}
				onConfirm={handleDeleteAdvanceConfirm}
				loading={deletingAdvance}
			/>
		</main>
	);
}

function InfoSection({ label, value }) {
	return (
		<div>
			<p className="text-xs text-gray-500 mb-1">{label}</p>
			<p className="text-sm font-semibold text-slate-900 break-words">{value}</p>
		</div>
	);
}

function SummaryCard({ label, value }) {
	return (
		<div className="rounded-2xl border border-amber-100 bg-amber-50/40 px-4 py-3">
			<p className="text-xs text-gray-500">{label}</p>
			<p className="text-xl font-bold text-slate-900 mt-1">{value}</p>
		</div>
	);
}
