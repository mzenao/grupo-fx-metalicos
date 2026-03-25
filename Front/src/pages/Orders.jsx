import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import DatePicker, { registerLocale } from "react-datepicker";
import { ptBR } from "date-fns/locale";
import {
	Search,
	PackagePlus,
	Scale,
	Calendar,
	ChevronDown,
	ChevronUp,
	Paperclip,
	Upload,
	X,
	Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	EMPLOYEES,
	getStoredPurchases,
	savePurchases,
} from "@/services/ordersData";
import { getStoredSuppliers } from "@/services/entityData";
import "react-datepicker/dist/react-datepicker.css";

registerLocale("pt-BR", ptBR);

function getNowLocalDateTime() {
	return new Date();
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

export default function Orders() {
	const location = useLocation();
	const fileInputRef = useRef(null);
	const hashId = Number((location.hash || "").replace("#", "")) || null;

	const [SupplierId, setSupplierId] = useState(null);
	const [employeeId, setEmployeeId] = useState(null);
	const [weight, setWeight] = useState("");
	const [value, setValue] = useState("");
	const [datetime, setDatetime] = useState(null);
	const [attachments, setAttachments] = useState([]);
	const [dragActive, setDragActive] = useState(false);
	const [error, setError] = useState("");
	const [purchases, setPurchases] = useState(() => getStoredPurchases());
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [showAllPurchases, setShowAllPurchases] = useState(Boolean(hashId));
	const [editingPurchaseId, setEditingPurchaseId] = useState(null);
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [editSupplierId, setEditSupplierId] = useState(null);
	const [editEmployeeId, setEditEmployeeId] = useState(null);
	const [editWeight, setEditWeight] = useState("");
	const [editValue, setEditValue] = useState("");
	const [editDatetime, setEditDatetime] = useState(null);
	const [editAttachments, setEditAttachments] = useState([]);
	const [editDragActive, setEditDragActive] = useState(false);
	const [editError, setEditError] = useState("");
	const editFileInputRef = useRef(null);

	const supplierOptions = useMemo(() => {
		return getStoredSuppliers().map((supplier) => ({
			id: supplier.id,
			label: formatSupplierLabel(supplier),
		}));
	}, []);

	const supplierLabelById = useMemo(() => {
		const map = new Map();
		supplierOptions.forEach((supplier) => {
			map.set(supplier.id, supplier.label);
		});
		return map;
	}, [supplierOptions]);

	useEffect(() => {
		savePurchases(purchases);
	}, [purchases]);

	const hashPurchase = useMemo(() => {
		if (!hashId) return null;
		return purchases.find((purchase) => purchase.id === hashId) || null;
	}, [hashId, purchases]);

	const visiblePurchases = useMemo(() => {
		if (showAllPurchases) return purchases;
		return purchases.slice(0, 5);
	}, [purchases, showAllPurchases]);

	const handleFiles = (fileList) => {
		const files = Array.from(fileList || []);
		if (files.length === 0) return;

		setAttachments((prev) => {
			const currentKeys = new Set(
				prev.map((file) => `${file.name}-${file.size}-${file.lastModified}`)
			);

			const newOnes = files.filter((file) => {
				const key = `${file.name}-${file.size}-${file.lastModified}`;
				return !currentKeys.has(key);
			});

			return [...prev, ...newOnes];
		});
	};

	const removeAttachment = (index) => {
		setAttachments((prev) => prev.filter((_, i) => i !== index));
	};

	const openEditCard = (purchase) => {
		if (editingPurchaseId === purchase.id) {
			setIsEditOpen((prev) => !prev);
			return;
		}

		const parsedDate = purchase?.datetime ? new Date(purchase.datetime) : null;
		const safeDate = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null;

		setEditingPurchaseId(purchase.id);
		setEditSupplierId(purchase.SupplierId || null);
		setEditEmployeeId(purchase.employeeId || null);
		setEditWeight(purchase.weight || "");
		setEditValue(purchase.value || "");
		setEditDatetime(safeDate);
		setEditAttachments([...(purchase.attachmentNames || [])]);
		setEditError("");
		setIsEditOpen(true);
	};

	const handleEditFiles = (fileList) => {
		const files = Array.from(fileList || []);
		if (files.length === 0) return;

		setEditAttachments((prev) => {
			const existing = new Set(prev);
			const nextNames = files.map((file) => file.name).filter((name) => !existing.has(name));
			return [...prev, ...nextNames];
		});
	};

	const removeEditAttachment = (index) => {
		setEditAttachments((prev) => prev.filter((_, i) => i !== index));
	};

	const handleEditSubmit = (e) => {
		e.preventDefault();
		setEditError("");

		if (!editingPurchaseId) {
			setEditError("Selecione uma compra para editar.");
			return;
		}

		if (!editSupplierId) {
			setEditError("Selecione um Fornecedor.");
			return;
		}

		if (!editEmployeeId) {
			setEditError("Selecione o funcionario responsavel.");
			return;
		}

		if (!editWeight || Number(editWeight) <= 0) {
			setEditError("Informe um peso valido.");
			return;
		}

		if (!editValue || Number(editValue) <= 0) {
			setEditError("Informe um valor valido.");
			return;
		}

		if (!editDatetime) {
			setEditError("Informe dia e hora da compra.");
			return;
		}

		if (editAttachments.length === 0) {
			setEditError("Anexe pelo menos um comprovante (pagamento ou ticket da balanca).");
			return;
		}

		const selectedSupplier = supplierOptions.find((item) => item.id === editSupplierId);
		const selectedEmployee = EMPLOYEES.find((item) => item.id === editEmployeeId);

		setPurchases((prev) =>
			prev.map((purchase) =>
				purchase.id === editingPurchaseId
					? {
						...purchase,
						SupplierId: editSupplierId,
						SupplierName: selectedSupplier?.label || "",
						employeeId: editEmployeeId,
						employeeName: selectedEmployee?.label || "",
						weight: editWeight,
						value: editValue,
						datetime: editDatetime.toISOString(),
						attachmentNames: [...editAttachments],
					}
					: purchase
			)
		);
	};

	const handleSubmit = (e) => {
		e.preventDefault();
		setError("");

		if (!SupplierId) {
			setError("Selecione um Fornecedor.");
			return;
		}

		if (!employeeId) {
			setError("Selecione o funcionario responsavel.");
			return;
		}

		if (!weight || Number(weight) <= 0) {
			setError("Informe um peso valido.");
			return;
		}

		if (!value || Number(value) <= 0) {
			setError("Informe um valor valido.");
			return;
		}

		if (!datetime) {
			setError("Informe dia e hora da compra.");
			return;
		}

		if (attachments.length === 0) {
			setError("Anexe pelo menos um comprovante (pagamento ou ticket da balanca).");
			return;
		}

		const selectedSupplier = supplierOptions.find((item) => item.id === SupplierId);
		const selectedEmployee = EMPLOYEES.find((item) => item.id === employeeId);

		const nextId = purchases.length > 0 ? Math.max(...purchases.map((p) => p.id)) + 1 : 1;

		const newPurchase = {
			id: nextId,
			SupplierId,
			SupplierName: selectedSupplier?.label || "",
			employeeId,
			employeeName: selectedEmployee?.label || "",
			weight,
			value,
			datetime: datetime.toISOString(),
			attachmentNames: attachments.map((file) => file.name),
		};

		setPurchases((prev) => [newPurchase, ...prev]);
		setSupplierId(null);
		setEmployeeId(null);
		setWeight("");
		setValue("");
		setDatetime(null);
		setAttachments([]);
		setIsCreateOpen(false);
	};

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
							<h2 className="text-lg font-semibold text-gray-900">Nova compra de sucata</h2>
							<p className="text-sm text-gray-500">
								{isCreateOpen
									? "Preencha os dados da compra e salve."
									: "Clique para abrir o formulario de criacao de compra."}
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
							placeholder="Pesquisar Fornecedor..."
							options={supplierOptions}
							selectedId={SupplierId}
							onSelect={setSupplierId}
						/>

						<SearchSelect
							label="Funcionario responsavel"
							placeholder="Pesquisar funcionario..."
							options={EMPLOYEES}
							selectedId={employeeId}
							onSelect={setEmployeeId}
						/>

						<div>
							<label className="block text-sm font-medium mb-1 text-[#4a3918]">Peso (kg) *</label>
							<div className="relative">
								<Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
								<input
									type="number"
									step="0.01"
									min="0"
									value={weight}
									onChange={(e) => setWeight(e.target.value)}
									placeholder="Ex.: 820"
									className="w-full h-11 pl-9 pr-3 border border-[#d6ab4a]/50 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#d6ab4a]/30 focus:border-[#b8891f] placeholder:text-gray-400"
								/>
							</div>
						</div>

						<div>
							<label className="block text-sm font-medium mb-1 text-[#4a3918]">Valor (R$) *</label>
							<input
								type="number"
								step="0.01"
								min="0"
								value={value}
								onChange={(e) => setValue(e.target.value)}
								placeholder="Ex.: 1790.00"
								className="w-full h-11 px-3 border border-[#d6ab4a]/50 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#d6ab4a]/30 focus:border-[#b8891f]"
							/>
						</div>

						<div className="md:col-span-2">
							<label className="block text-sm font-medium mb-1 text-[#4a3918]">Dia e hora *</label>
							<div className="relative max-w-sm">
								<Calendar className="absolute z-10 pointer-events-none left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
								<DatePicker
									selected={datetime}
									onChange={(date) => setDatetime(date || new Date())}
									onInputClick={() => {
										if (!datetime) setDatetime(getNowLocalDateTime());
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
							<p className="text-sm text-gray-500">Comprovante de pagamento e ticket da balanca</p>
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
						<Button type="submit" className="bg-gradient-to-r from-[#b8891f] to-[#d6ab4a] text-white hover:brightness-105">
							Salvar compra
						</Button>

						<Button
							type="button"
							variant="outline"
							onClick={() => window.alert("Funcao de envio automatico sera implementada futuramente.")}
							className="border-[#c7a04a] text-[#6a521f] hover:bg-[#f5e7c0] gap-2"
						>
							<Send className="w-4 h-4" /> Enviar comprovantes no WhatsApp/Email
						</Button>
					</div>
						</form>
					</>
				)}
			</div>

			<section className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
				<div className="px-5 py-4 border-b border-amber-100 flex items-center justify-between">
					<h3 className="font-semibold text-gray-900">Compras registradas</h3>
					<span className="text-xs text-gray-500">{purchases.length} compras</span>
				</div>

				{hashId && (
					<div className={`px-5 py-3 text-sm border-b ${hashPurchase ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100"}`}>
						{hashPurchase
							? `Compra #${hashId} destacada na listagem.`
							: `Compra #${hashId} nao encontrada nos registros atuais.`}
					</div>
				)}

				<div className="divide-y divide-gray-100">
					{visiblePurchases.map((purchase) => {
						const isHashTarget = hashId === purchase.id;
						const isEditingThis = editingPurchaseId === purchase.id;
						return (
							<div key={purchase.id}>
								<button
									type="button"
									onClick={() => openEditCard(purchase)}
									className={`w-full p-4 text-left cursor-pointer ${isHashTarget ? "bg-emerald-50/60" : "hover:bg-amber-50/40"}`}
								>
									<div className="flex items-start justify-between gap-3">
										<div className="min-w-0">
											<p className="font-semibold text-gray-900">Compra #{purchase.id}</p>
											<p className="text-xs text-gray-500">{new Date(purchase.datetime).toLocaleString("pt-BR")}</p>
										</div>
										<div className="text-gray-400 flex-shrink-0 mt-0.5">
											{isEditingThis && isEditOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
										</div>
									</div>
									<div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm mt-2">
										<p><span className="text-gray-500">Fornecedor:</span> {supplierLabelById.get(purchase.SupplierId) || purchase.SupplierName}</p>
										<p><span className="text-gray-500">Funcionario:</span> {purchase.employeeName}</p>
										<p><span className="text-gray-500">Peso:</span> {purchase.weight} kg</p>
										<p><span className="text-gray-500">Valor:</span> {Number(purchase.value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
									</div>
									<p className="text-xs text-gray-500 mt-2">
										Comprovantes: {purchase.attachmentNames.join(", ")}
									</p>
								</button>

								{isEditingThis && isEditOpen && (
									<div className="px-4 pb-4 bg-amber-50/35 border-t border-amber-100">
										{editError && (
											<div className="mb-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
												{editError}
											</div>
										)}

										<form onSubmit={handleEditSubmit} className="space-y-5 mt-4" onClick={(e) => e.stopPropagation()}>
											<div className="grid md:grid-cols-2 gap-4">
												<SearchSelect
													label="Fornecedor"
													placeholder="Pesquisar Fornecedor..."
													options={supplierOptions}
													selectedId={editSupplierId}
													onSelect={setEditSupplierId}
												/>

												<SearchSelect
													label="Funcionario responsavel"
													placeholder="Pesquisar funcionario..."
													options={EMPLOYEES}
													selectedId={editEmployeeId}
													onSelect={setEditEmployeeId}
												/>

												<div>
													<label className="block text-sm font-medium mb-1 text-[#4a3918]">Peso (kg) *</label>
													<div className="relative">
														<Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
														<input
															type="number"
															step="0.01"
															min="0"
															value={editWeight}
															onChange={(e) => setEditWeight(e.target.value)}
															placeholder="Ex.: 820"
															className="w-full h-11 pl-9 pr-3 border border-[#d6ab4a]/50 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#d6ab4a]/30 focus:border-[#b8891f] placeholder:text-gray-400"
														/>
													</div>
												</div>

												<div>
													<label className="block text-sm font-medium mb-1 text-[#4a3918]">Valor (R$) *</label>
													<input
														type="number"
														step="0.01"
														min="0"
														value={editValue}
														onChange={(e) => setEditValue(e.target.value)}
														placeholder="Ex.: 1790.00"
														className="w-full h-11 px-3 border border-[#d6ab4a]/50 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#d6ab4a]/30 focus:border-[#b8891f]"
													/>
												</div>

												<div className="md:col-span-2">
													<label className="block text-sm font-medium mb-1 text-[#4a3918]">Dia e hora *</label>
													<div className="relative max-w-sm">
														<Calendar className="absolute z-10 pointer-events-none left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
														<DatePicker
															selected={editDatetime}
															onChange={(date) => setEditDatetime(date || new Date())}
															onInputClick={() => {
																if (!editDatetime) setEditDatetime(getNowLocalDateTime());
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
														setEditDragActive(true);
													}}
													onDragLeave={() => setEditDragActive(false)}
													onDrop={(e) => {
														e.preventDefault();
														setEditDragActive(false);
														handleEditFiles(e.dataTransfer.files);
													}}
													className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
														editDragActive
															? "border-[#b8891f] bg-amber-50"
															: "border-amber-200 bg-amber-50/40"
													}`}
												>
													<Upload className="w-7 h-7 mx-auto text-[#b8891f] mb-2" />
													<p className="font-medium text-gray-800">Arraste aqui os comprovantes</p>
													<p className="text-sm text-gray-500">Comprovante de pagamento e ticket da balanca</p>
													<Button
														type="button"
														variant="outline"
														onClick={() => editFileInputRef.current?.click()}
														className="mt-3 border-[#c7a04a] text-[#6a521f] hover:bg-[#f5e7c0]"
													>
														Selecionar arquivos
													</Button>
													<input
														ref={editFileInputRef}
														type="file"
														multiple
														onChange={(e) => handleEditFiles(e.target.files)}
														className="hidden"
													/>
												</div>

												{editAttachments.length > 0 && (
													<div className="mt-3 flex flex-wrap gap-2">
														{editAttachments.map((fileName, index) => (
															<span
																key={`${fileName}-${index}`}
																className="inline-flex items-center gap-2 bg-white border border-amber-200 rounded-full px-3 py-1.5 text-xs text-gray-700"
															>
																<Paperclip className="w-3 h-3 text-[#b8891f]" />
																{fileName}
																<button
																	type="button"
																	onClick={() => removeEditAttachment(index)}
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
												<Button type="submit" className="bg-gradient-to-r from-[#b8891f] to-[#d6ab4a] text-white hover:brightness-105">
													Salvar compra
												</Button>

												<Button
													type="button"
													variant="outline"
													onClick={() => window.alert("Funcao de envio automatico sera implementada futuramente.")}
													className="border-[#c7a04a] text-[#6a521f] hover:bg-[#f5e7c0] gap-2"
												>
													<Send className="w-4 h-4" /> Enviar comprovantes no WhatsApp/Email
												</Button>
											</div>
										</form>
									</div>
								)}
							</div>
						);
					})}

					{!showAllPurchases && purchases.length > 5 && (
						<div className="p-3 flex justify-center">
							<button
								type="button"
								onClick={() => setShowAllPurchases(true)}
								className="text-xs text-gray-500 hover:text-[#b8891f] underline underline-offset-2"
							>
								Exibir mais compras
							</button>
						</div>
					)}

					{showAllPurchases && purchases.length > 5 && (
						<div className="p-3 flex justify-center">
							<button
								type="button"
								onClick={() => setShowAllPurchases(false)}
								className="text-xs text-gray-400 hover:text-[#b8891f] underline underline-offset-2"
							>
								Exibir menos
							</button>
						</div>
					)}
				</div>
			</section>
		</div>
	);
}
