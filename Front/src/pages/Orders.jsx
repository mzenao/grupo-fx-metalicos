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
	KeyRound,
	Paperclip,
	Upload,
	X,
	Check,
	Pencil,
	Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SuccessModal from "@/components/internal/successModal";
import ErrorModal from "@/components/internal/errorModal";
import ConfirmDeleteModal from "@/components/internal/confirmDeleteModal";
import {
	createPurchaseWithAttachments,
	deletePurchaseAttachment,
	deletePurchase,
	fetchMaterialTypes,
	fetchPurchases,
	sendPurchaseComprovantes,
	updatePurchase,
	uploadAttachment,
} from "@/services/ordersData";
import {
	fetchEmployees,
	fetchSuppliers,
} from "@/services/entityData";
import { fetchPendingAdvancesForSupplier } from "@/services/advancesData";
import "react-datepicker/dist/react-datepicker.css";

registerLocale("pt-BR", ptBR);

function getNowLocalDateTime() {
	return new Date();
}

function formatDateTimeForApi(date) {
	if (!date || Number.isNaN(date.getTime())) return "";
	const pad = (value) => String(value).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}-03:00`;
}

function parsePositiveNumber(input) {
	const parsed = Number(input);
	if (!Number.isFinite(parsed) || parsed <= 0) return null;
	return parsed;
}

function formatComputedNumber(value) {
	if (!Number.isFinite(value) || value <= 0) return "";
	return value.toFixed(2);
}

function getNetWeight(weightValue, impurityValue) {
	const weight = Number(weightValue);
	const impurity = Number(impurityValue || 0);
	if (!Number.isFinite(weight) || weight <= 0) return null;
	if (!Number.isFinite(impurity) || impurity < 0 || impurity > 100) return null;
	return weight * (1 - impurity / 100);
}

function calculateTotalByImpurity(weightValue, valuePerKgValue, impurityValue) {
	const netWeight = getNetWeight(weightValue, impurityValue);
	const valuePerKg = Number(valuePerKgValue);
	if (!netWeight || !Number.isFinite(valuePerKg) || valuePerKg <= 0) return "";
	return formatComputedNumber(netWeight * valuePerKg);
}

function getGrossWeightFromNet(netWeightValue, impurityValue) {
	const netWeight = Number(netWeightValue);
	const impurity = Number(impurityValue || 0);
	const multiplier = 1 - impurity / 100;
	if (!Number.isFinite(netWeight) || netWeight <= 0) return null;
	if (!Number.isFinite(impurity) || impurity < 0 || impurity >= 100 || multiplier <= 0) return null;
	return netWeight / multiplier;
}

function formatExtraMaterial(materialName, weightValue, impurityValue, valuePerKgValue, totalValue) {
	const percentage = Number(impurityValue);
	const formattedPercentage = Number.isFinite(percentage)
		? percentage.toLocaleString("pt-BR", { maximumFractionDigits: 2 })
		: String(impurityValue || "").trim();
	const weight = Number(weightValue);
	const formattedWeight = Number.isFinite(weight)
		? weight.toLocaleString("pt-BR", { maximumFractionDigits: 2 })
		: String(weightValue || "").trim();
	const valuePerKg = Number(valuePerKgValue);
	const formattedValuePerKg = Number.isFinite(valuePerKg)
		? valuePerKg.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
		: String(valuePerKgValue || "").trim();
	const total = Number(totalValue);
	const formattedTotal = Number.isFinite(total)
		? total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
		: String(totalValue || "").trim();
	return `${materialName.trim()} - ${formattedWeight} kg - ${formattedPercentage}% - ${formattedValuePerKg}/kg - ${formattedTotal}`;
}

function getExtraMaterialName(material) {
	return String(material || "").split(" - ")[0].trim();
}

function formatExtraMaterialNames(materials) {
	return materials.map(getExtraMaterialName).filter(Boolean).join(" e ");
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

function formatPurchaseSupplierName(purchase, suppliersById) {
	const supplier = suppliersById.get(purchase?.SupplierId);
	if (supplier) {
		return supplier.personType === "PF" ? supplier.name : supplier.companyName;
	}

	return purchase?.SupplierName || "Fornecedor";
}

function formatMoney(value) {
	return Number(value || 0).toLocaleString("pt-BR", {
		style: "currency",
		currency: "BRL",
		minimumFractionDigits: 2,
	});
}

function formatPixTypeLabel(type) {
	const normalized = String(type || "").toLowerCase();
	const labels = {
		cpf: "CPF",
		cnpj: "CNPJ",
		phone: "Telefone",
		email: "E-mail",
		random: "Chave aleatoria",
	};
	return labels[normalized] || "Chave Pix";
}

function getSupplierPixInfo(supplier) {
	if (!supplier) return { typeLabel: "Chave Pix", value: "Fornecedor nao selecionado" };

	return {
		typeLabel: formatPixTypeLabel(supplier.pixKeyType),
		value: supplier.pixKeyValue || "Nao informado",
	};
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

function MaterialsCard({
	materials,
	materialOptions,
	selectedMaterialId,
	onMaterialSelect,
	weightValue,
	onWeightChange,
	impurityValue,
	onImpurityChange,
	valuePerKgValue,
	onValuePerKgChange,
	totalValue,
	onTotalChange,
	onAdd,
	onRemove,
}) {
	const [expanded, setExpanded] = useState(false);

	return (
		<div className="rounded-xl border border-[#d6ab4a]/35 bg-[#f5e7c0]/20">
			<button
				type="button"
				onClick={() => setExpanded((prev) => !prev)}
				className="w-full px-4 py-3 flex items-center justify-between text-left"
			>
				<div className="flex items-center gap-2">
					<PackagePlus className="w-4 h-4 text-[#7b6024]" />
					<span className="text-sm font-semibold text-[#4a3918]">
						Materiais extras {materials.length > 0 ? `(${materials.length})` : "(opcional)"}
					</span>
				</div>
				{expanded ? <ChevronUp className="w-4 h-4 text-[#7b6024]" /> : <ChevronDown className="w-4 h-4 text-[#7b6024]" />}
			</button>

			{expanded && (
				<div className="px-4 pb-4 space-y-3">
					<div className="grid grid-cols-1 md:grid-cols-[minmax(200px,1.3fr)_minmax(105px,.55fr)_minmax(92px,.42fr)_minmax(110px,.55fr)_minmax(115px,.65fr)_auto] gap-3 items-end">
						<div>
							<SearchSelect
								label="Material"
								placeholder="Pesquisar material..."
								options={materialOptions}
								selectedId={selectedMaterialId}
								onSelect={onMaterialSelect}
							/>
						</div>
						<div>
							<label className="block text-sm font-medium mb-1 text-[#4a3918]">Peso (kg)</label>
							<input
								type="number"
								step="0.01"
								min="0"
								value={weightValue}
								onChange={(event) => onWeightChange(event.target.value)}
								placeholder="Ex.: 120"
								className="w-full h-11 px-3 border border-[#d6ab4a]/50 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#d6ab4a]/30 focus:border-[#b8891f]"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium mb-1 text-[#4a3918]">Imp. (%)</label>
							<input
								type="number"
								step="0.01"
								min="0"
								max="100"
								value={impurityValue}
								onChange={(event) => onImpurityChange(event.target.value)}
								placeholder="Ex.: 5"
								className="w-full h-11 px-3 border border-[#d6ab4a]/50 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#d6ab4a]/30 focus:border-[#b8891f]"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium mb-1 text-[#4a3918]">Valor/kg</label>
							<input
								type="number"
								step="0.01"
								min="0"
								value={valuePerKgValue}
								onChange={(event) => onValuePerKgChange(event.target.value)}
								placeholder="Ex.: 3.50"
								className="w-full h-11 px-3 border border-[#d6ab4a]/50 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#d6ab4a]/30 focus:border-[#b8891f]"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium mb-1 text-[#4a3918]">Valor total</label>
							<input
								type="number"
								step="0.01"
								min="0"
								value={totalValue}
								onChange={(event) => onTotalChange(event.target.value)}
								placeholder="Total"
								className="w-full h-11 px-3 border border-[#d6ab4a]/50 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#d6ab4a]/30 focus:border-[#b8891f]"
							/>
						</div>
						<Button
							type="button"
							onClick={onAdd}
							disabled={!selectedMaterialId || !String(weightValue || "").trim() || !String(impurityValue || "").trim() || !String(valuePerKgValue || "").trim() || !String(totalValue || "").trim() || materials.length >= 3}
							className="h-11 bg-[#b8891f] text-white hover:brightness-105 disabled:opacity-50"
						>
							Adicionar
						</Button>
					</div>

					{materials.length > 0 ? (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
							{materials.map((material) => (
								<div key={material} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-[#4a3918] text-sm font-semibold border border-[#d6ab4a]/40">
									<span className="min-w-0 break-words">{material}</span>
									<button type="button" onClick={() => onRemove(material)} className="text-[#7b6024] hover:text-[#1e1608] flex-shrink-0" aria-label={`Remover material ${material}`}>
										<X className="w-3 h-3" />
									</button>
								</div>
							))}
						</div>
					) : (
						<p className="text-xs text-[#7b6024]">Nenhum material extra informado.</p>
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
	const [materialTypeId, setMaterialTypeId] = useState(null);
	const [materialsExtra, setMaterialsExtra] = useState([]);
	const [extraMaterialTypeId, setExtraMaterialTypeId] = useState(null);
	const [extraMaterialWeight, setExtraMaterialWeight] = useState("");
	const [extraMaterialImpurity, setExtraMaterialImpurity] = useState("");
	const [extraMaterialValuePerKg, setExtraMaterialValuePerKg] = useState("");
	const [extraMaterialTotalValue, setExtraMaterialTotalValue] = useState("");
	const [weight, setWeight] = useState("");
	const [valuePerKg, setValuePerKg] = useState("");
	const [totalValue, setTotalValue] = useState("");
	const [impurityPercentage, setImpurityPercentage] = useState("");
	const [datetime, setDatetime] = useState(null);
	const [attachments, setAttachments] = useState([]);
	const [dragActive, setDragActive] = useState(false);
	const [error, setError] = useState("");
	const [purchases, setPurchases] = useState([]);
	const [suppliers, setSuppliers] = useState([]);
	const [pendingAdvances, setPendingAdvances] = useState([]);
	const [applyAdvance, setApplyAdvance] = useState(false);
	const [advanceValue, setAdvanceValue] = useState("");
	const [advanceValueDraft, setAdvanceValueDraft] = useState("");
	const [isEditingAdvanceValue, setIsEditingAdvanceValue] = useState(false);
	const [isAdvanceValueCustomized, setIsAdvanceValueCustomized] = useState(false);
	const [employeesOptions, setEmployeesOptions] = useState([]);
	const [materialTypeOptions, setMaterialTypeOptions] = useState([]);
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [creatingPurchase, setCreatingPurchase] = useState(false);
	const [showAllPurchases, setShowAllPurchases] = useState(Boolean(hashId));
	const [editingPurchaseId, setEditingPurchaseId] = useState(null);
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [editSupplierId, setEditSupplierId] = useState(null);
	const [editEmployeeId, setEditEmployeeId] = useState(null);
	const [editMaterialTypeId, setEditMaterialTypeId] = useState(null);
	const [editMaterialsExtra, setEditMaterialsExtra] = useState([]);
	const [editExtraMaterialTypeId, setEditExtraMaterialTypeId] = useState(null);
	const [editExtraMaterialWeight, setEditExtraMaterialWeight] = useState("");
	const [editExtraMaterialImpurity, setEditExtraMaterialImpurity] = useState("");
	const [editExtraMaterialValuePerKg, setEditExtraMaterialValuePerKg] = useState("");
	const [editExtraMaterialTotalValue, setEditExtraMaterialTotalValue] = useState("");
	const [editWeight, setEditWeight] = useState("");
	const [editValuePerKg, setEditValuePerKg] = useState("");
	const [editTotalValue, setEditTotalValue] = useState("");
	const [editImpurityPercentage, setEditImpurityPercentage] = useState("");
	const [editDatetime, setEditDatetime] = useState(null);
	const [editAttachments, setEditAttachments] = useState([]);
	const [editNewAttachments, setEditNewAttachments] = useState([]);
	const [editDragActive, setEditDragActive] = useState(false);
	const [editError, setEditError] = useState("");
	const [savingEdit, setSavingEdit] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null, itemLabel: "", password: "" });
	const [deletingPurchase, setDeletingPurchase] = useState(false);
	const [confirmAttachmentDelete, setConfirmAttachmentDelete] = useState({ open: false, attachment: null, password: "" });
	const [deletingAttachment, setDeletingAttachment] = useState(false);
	const [infoModal, setInfoModal] = useState({ open: false, title: "", message: "" });
	const [errorModal, setErrorModal] = useState({ open: false, title: "", message: "" });
	const [sendingPurchaseId, setSendingPurchaseId] = useState(null);
	const editFileInputRef = useRef(null);

	useEffect(() => {
		let mounted = true;

		Promise.resolve()
			.then(async () => {
				const [employeesData, suppliersData, materialTypesData] = await Promise.all([
					fetchEmployees(),
					fetchSuppliers(),
					fetchMaterialTypes(),
				]);
				const purchasesData = await fetchPurchases();

				if (!mounted) return;
				setSuppliers(suppliersData);
				setEmployeesOptions(employeesData.map((item) => ({ id: item.id, label: item.name })));
				setMaterialTypeOptions(materialTypesData);
				setPurchases(purchasesData);
			})
			.catch((err) => {
				setError(err?.message || "Erro ao carregar dados");
			});

		return () => {
			mounted = false;
		};
	}, []);

	useEffect(() => {
		let mounted = true;

		if (!SupplierId) {
			setPendingAdvances([]);
			setApplyAdvance(false);
			setAdvanceValue("");
			setIsEditingAdvanceValue(false);
			setIsAdvanceValueCustomized(false);
			return () => {
				mounted = false;
			};
		}

		setApplyAdvance(false);
		setAdvanceValue("");
		setIsEditingAdvanceValue(false);
		setIsAdvanceValueCustomized(false);

		fetchPendingAdvancesForSupplier(SupplierId)
			.then((data) => {
				if (!mounted) return;
				setPendingAdvances(Array.isArray(data) ? data : []);
				if (!Array.isArray(data) || data.length === 0) {
					setApplyAdvance(false);
				}
			})
			.catch(() => {
				if (!mounted) return;
				setPendingAdvances([]);
				setApplyAdvance(false);
			});

		return () => {
			mounted = false;
		};
	}, [SupplierId]);

	useEffect(() => {
		if (applyAdvance && !isAdvanceValueCustomized) {
			setAdvanceValue(totalValue || "");
		}
	}, [applyAdvance, isAdvanceValueCustomized, totalValue]);

	const supplierOptions = useMemo(() => {
		return suppliers.map((supplier) => ({
			id: supplier.id,
			label: formatSupplierLabel(supplier),
		}));
	}, [suppliers]);

	const supplierLabelById = useMemo(() => {
		const map = new Map();
		supplierOptions.forEach((supplier) => {
			map.set(supplier.id, supplier.label);
		});
		return map;
	}, [supplierOptions]);

	const suppliersById = useMemo(() => {
		const map = new Map();
		suppliers.forEach((supplier) => {
			map.set(supplier.id, supplier);
		});
		return map;
	}, [suppliers]);

	const selectedSupplier = SupplierId ? suppliersById.get(SupplierId) : null;
	const selectedSupplierPix = getSupplierPixInfo(selectedSupplier);
	const hasPendingAdvances = pendingAdvances.length > 0;
	const totalPendingAdvanceValue = useMemo(() => {
		return pendingAdvances.reduce((sum, item) => sum + (Number(item.value_remaining) || 0), 0);
	}, [pendingAdvances]);
	const advancePreview = useMemo(() => {
		if (!applyAdvance) return null;

		const purchaseValue = Number(totalValue) || 0;
		const valueToApply = Number(advanceValue) || 0;
		const currentCredit = Number(selectedSupplier?.advanceCreditBalance || 0);
		const abatementValue = Math.min(totalPendingAdvanceValue, valueToApply);
		const paidValue = Math.max(purchaseValue - valueToApply, 0);
		const debtAfter = Math.max(totalPendingAdvanceValue - valueToApply, 0);
		const creditAfter = debtAfter > 0
			? currentCredit
			: currentCredit + Math.max(valueToApply - totalPendingAdvanceValue, 0);

		return { abatementValue, paidValue, debtAfter, creditAfter };
	}, [advanceValue, applyAdvance, selectedSupplier, totalPendingAdvanceValue, totalValue]);

	const handleApplyAdvanceChange = (checked) => {
		setApplyAdvance(checked);
		setAdvanceValue(checked ? totalValue : "");
		setAdvanceValueDraft("");
		setIsEditingAdvanceValue(false);
		setIsAdvanceValueCustomized(false);
	};

	const handleConfirmAdvanceValue = () => {
		const nextValue = Number(advanceValueDraft);
		const purchaseValue = Number(totalValue);
		if (!Number.isFinite(nextValue) || nextValue <= 0 || nextValue > purchaseValue) {
			setError("O valor aplicado ao adiantamento deve ser maior que zero e não pode superar o valor da compra.");
			return;
		}
		setAdvanceValue(advanceValueDraft);
		setIsEditingAdvanceValue(false);
		setIsAdvanceValueCustomized(true);
		setError("");
	};

	const handleExtraMaterialWeightChange = (nextWeightValue) => {
		setExtraMaterialWeight(nextWeightValue);
		const nextTotal = calculateTotalByImpurity(nextWeightValue, extraMaterialValuePerKg, extraMaterialImpurity);
		if (nextTotal) setExtraMaterialTotalValue(nextTotal);
	};

	const handleExtraMaterialImpurityChange = (nextImpurityValue) => {
		setExtraMaterialImpurity(nextImpurityValue);
		const nextTotal = calculateTotalByImpurity(extraMaterialWeight, extraMaterialValuePerKg, nextImpurityValue);
		if (nextTotal) setExtraMaterialTotalValue(nextTotal);
	};

	const handleExtraMaterialValuePerKgChange = (nextValuePerKgValue) => {
		setExtraMaterialValuePerKg(nextValuePerKgValue);
		const nextTotal = calculateTotalByImpurity(extraMaterialWeight, nextValuePerKgValue, extraMaterialImpurity);
		if (nextTotal) setExtraMaterialTotalValue(nextTotal);
	};

	const handleExtraMaterialTotalChange = (nextTotalValue) => {
		setExtraMaterialTotalValue(nextTotalValue);
		const nextTotalNumber = parsePositiveNumber(nextTotalValue);
		const netWeight = getNetWeight(extraMaterialWeight, extraMaterialImpurity);
		if (nextTotalNumber && netWeight) {
			setExtraMaterialValuePerKg(formatComputedNumber(nextTotalNumber / netWeight));
		}
	};

	const handleEditExtraMaterialWeightChange = (nextWeightValue) => {
		setEditExtraMaterialWeight(nextWeightValue);
		const nextTotal = calculateTotalByImpurity(nextWeightValue, editExtraMaterialValuePerKg, editExtraMaterialImpurity);
		if (nextTotal) setEditExtraMaterialTotalValue(nextTotal);
	};

	const handleEditExtraMaterialImpurityChange = (nextImpurityValue) => {
		setEditExtraMaterialImpurity(nextImpurityValue);
		const nextTotal = calculateTotalByImpurity(editExtraMaterialWeight, editExtraMaterialValuePerKg, nextImpurityValue);
		if (nextTotal) setEditExtraMaterialTotalValue(nextTotal);
	};

	const handleEditExtraMaterialValuePerKgChange = (nextValuePerKgValue) => {
		setEditExtraMaterialValuePerKg(nextValuePerKgValue);
		const nextTotal = calculateTotalByImpurity(editExtraMaterialWeight, nextValuePerKgValue, editExtraMaterialImpurity);
		if (nextTotal) setEditExtraMaterialTotalValue(nextTotal);
	};

	const handleEditExtraMaterialTotalChange = (nextTotalValue) => {
		setEditExtraMaterialTotalValue(nextTotalValue);
		const nextTotalNumber = parsePositiveNumber(nextTotalValue);
		const netWeight = getNetWeight(editExtraMaterialWeight, editExtraMaterialImpurity);
		if (nextTotalNumber && netWeight) {
			setEditExtraMaterialValuePerKg(formatComputedNumber(nextTotalNumber / netWeight));
		}
	};

	const addMaterialExtra = () => {
		const selectedExtraMaterial = materialTypeOptions.find((option) => option.id === extraMaterialTypeId);
		const materialName = selectedExtraMaterial?.label || "";
		const materialWeight = String(extraMaterialWeight || "").trim();
		const impurity = String(extraMaterialImpurity || "").trim();
		const materialValuePerKg = String(extraMaterialValuePerKg || "").trim();
		const materialTotalValue = String(extraMaterialTotalValue || "").trim();
		const weightNumber = Number(materialWeight);
		const impurityNumber = Number(impurity);
		const valuePerKgNumber = Number(materialValuePerKg);
		const totalValueNumber = Number(materialTotalValue);
		if (!materialName) {
			setError("Informe um material extra.");
			return;
		}
		if (!materialWeight || !Number.isFinite(weightNumber) || weightNumber <= 0) {
			setError("Informe um peso valido para o material extra.");
			return;
		}
		if (!impurity || !Number.isFinite(impurityNumber) || impurityNumber < 0 || impurityNumber > 100) {
			setError("Informe uma impureza entre 0 e 100% para o material.");
			return;
		}
		if (!materialValuePerKg || !Number.isFinite(valuePerKgNumber) || valuePerKgNumber <= 0) {
			setError("Informe um valor por kg valido para o material extra.");
			return;
		}
		if (!materialTotalValue || !Number.isFinite(totalValueNumber) || totalValueNumber <= 0) {
			setError("Informe um valor total valido para o material extra.");
			return;
		}
		if (materialsExtra.some((item) => getExtraMaterialName(item).toLowerCase() === materialName.toLowerCase())) {
			setError("Esse material extra ja foi adicionado.");
			return;
		}
		if (materialsExtra.length >= 3) {
			setError("O limite de 3 materiais extras foi atingido.");
			return;
		}

		setError("");
		setMaterialsExtra((prev) => [...prev, formatExtraMaterial(materialName, materialWeight, impurity, materialValuePerKg, materialTotalValue)]);
		setExtraMaterialTypeId(null);
		setExtraMaterialWeight("");
		setExtraMaterialImpurity("");
		setExtraMaterialValuePerKg("");
		setExtraMaterialTotalValue("");
	};

	const removeMaterialExtra = (materialName) => {
		setMaterialsExtra((prev) => prev.filter((item) => item !== materialName));
	};

	const addEditMaterialExtra = () => {
		const selectedExtraMaterial = materialTypeOptions.find((option) => option.id === editExtraMaterialTypeId);
		const materialName = selectedExtraMaterial?.label || "";
		const materialWeight = String(editExtraMaterialWeight || "").trim();
		const impurity = String(editExtraMaterialImpurity || "").trim();
		const materialValuePerKg = String(editExtraMaterialValuePerKg || "").trim();
		const materialTotalValue = String(editExtraMaterialTotalValue || "").trim();
		const weightNumber = Number(materialWeight);
		const impurityNumber = Number(impurity);
		const valuePerKgNumber = Number(materialValuePerKg);
		const totalValueNumber = Number(materialTotalValue);
		if (!materialName) {
			setEditError("Informe um material extra.");
			return;
		}
		if (!materialWeight || !Number.isFinite(weightNumber) || weightNumber <= 0) {
			setEditError("Informe um peso valido para o material extra.");
			return;
		}
		if (!impurity || !Number.isFinite(impurityNumber) || impurityNumber < 0 || impurityNumber > 100) {
			setEditError("Informe uma impureza entre 0 e 100% para o material.");
			return;
		}
		if (!materialValuePerKg || !Number.isFinite(valuePerKgNumber) || valuePerKgNumber <= 0) {
			setEditError("Informe um valor por kg valido para o material extra.");
			return;
		}
		if (!materialTotalValue || !Number.isFinite(totalValueNumber) || totalValueNumber <= 0) {
			setEditError("Informe um valor total valido para o material extra.");
			return;
		}
		if (editMaterialsExtra.some((item) => getExtraMaterialName(item).toLowerCase() === materialName.toLowerCase())) {
			setEditError("Esse material extra ja foi adicionado.");
			return;
		}
		if (editMaterialsExtra.length >= 3) {
			setEditError("O limite de 3 materiais extras foi atingido.");
			return;
		}

		setEditError("");
		setEditMaterialsExtra((prev) => [...prev, formatExtraMaterial(materialName, materialWeight, impurity, materialValuePerKg, materialTotalValue)]);
		setEditExtraMaterialTypeId(null);
		setEditExtraMaterialWeight("");
		setEditExtraMaterialImpurity("");
		setEditExtraMaterialValuePerKg("");
		setEditExtraMaterialTotalValue("");
	};

	const removeEditMaterialExtra = (materialName) => {
		setEditMaterialsExtra((prev) => prev.filter((item) => item !== materialName));
	};

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

	const handleDeletePurchaseConfirm = async () => {
		const purchaseId = confirmDelete.id;
		if (!purchaseId) return;
		if (!String(confirmDelete.password || "").trim()) return;

		setDeletingPurchase(true);
		try {
			await deletePurchase(purchaseId, confirmDelete.password);
			const [refreshedPurchases, refreshedSuppliers] = await Promise.all([fetchPurchases(), fetchSuppliers()]);
			setPurchases(refreshedPurchases);
			setSuppliers(refreshedSuppliers);
			setConfirmDelete({ open: false, id: null, itemLabel: "", password: "" });
			setIsEditOpen(false);
			setEditingPurchaseId(null);
		} catch (err) {
			const errorMessage = err?.message || "Erro ao remover compra.";
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
			setDeletingPurchase(false);
		}
	};

	const handleSendComprovantes = async (purchase) => {
		if (!purchase?.id) return;

		const supplierName = formatPurchaseSupplierName(purchase, suppliersById);

		if (!purchase.attachments?.length) {
			setErrorModal({
				open: true,
				title: "Comprovantes ausentes",
				message: `A compra #${purchase.id} do fornecedor ${supplierName} não possui comprovantes anexados.`,
			});
			return;
		}

		setSendingPurchaseId(purchase.id);
		try {
			const sendResult = await sendPurchaseComprovantes(purchase.id);
			const sentByWhatsapp = Boolean(sendResult?.whatsapp_sent);
			const sentByEmail = Boolean(sendResult?.email_sent);
			const sentByBoth = sentByWhatsapp && sentByEmail;
			const emailError = sendResult?.email_error;
			const sentAttachmentCount = Number(sendResult?.attachments_sent || 0);
			const refreshedPurchases = await fetchPurchases();
			setPurchases(refreshedPurchases);

			if (sentByBoth) {
				setInfoModal({
					open: true,
					title: "Comprovantes enviados com sucesso",
					message: sentAttachmentCount > 0
						? `${sentAttachmentCount} novo(s) comprovante(s) da compra #${purchase.id} do fornecedor ${supplierName} enviados com sucesso por WhatsApp e Email.`
						: `Todos os comprovantes da compra #${purchase.id} já haviam sido enviados.`,
				});
				return;
			}

			if (sentByWhatsapp && !sentByEmail) {
				setErrorModal({
					open: true,
					title: "Envio parcial",
					message:
						emailError ||
						`Comprovantes enviados no WhatsApp, mas o envio por Email falhou para a compra #${purchase.id} do fornecedor ${supplierName}.`,
				});
				return;
			}

			setErrorModal({
				open: true,
				title: "Falha no envio",
				message: `Não foi possível confirmar o envio completo (WhatsApp + Email) dos comprovantes da compra #${purchase.id} do fornecedor ${supplierName}.`,
			});
		} catch (err) {
			setErrorModal({
				open: true,
				title: "Falha no envio",
				message: err?.message || `Não foi possível enviar os comprovantes da compra #${purchase.id} do fornecedor ${supplierName}.`,
			});
		} finally {
			setSendingPurchaseId(null);
		}
	};

	const removeAttachment = (index) => {
		setAttachments((prev) => prev.filter((_, i) => i !== index));
	};

	const handleWeightChange = (nextWeightValue) => {
		setWeight(nextWeightValue);

		const nextNetWeight = getNetWeight(nextWeightValue, impurityPercentage);
		const valuePerKgNumber = parsePositiveNumber(valuePerKg);
		const totalValueNumber = parsePositiveNumber(totalValue);

		if (nextNetWeight && valuePerKgNumber) {
			setTotalValue(formatComputedNumber(nextNetWeight * valuePerKgNumber));
			return;
		}

		if (nextNetWeight && totalValueNumber) {
			setValuePerKg(formatComputedNumber(totalValueNumber / nextNetWeight));
		}
	};

	const handleValuePerKgChange = (nextValuePerKgValue) => {
		setValuePerKg(nextValuePerKgValue);

		const nextValuePerKgNumber = parsePositiveNumber(nextValuePerKgValue);
		const netWeight = getNetWeight(weight, impurityPercentage);
		const totalValueNumber = parsePositiveNumber(totalValue);

		if (nextValuePerKgNumber && netWeight) {
			setTotalValue(formatComputedNumber(netWeight * nextValuePerKgNumber));
			return;
		}

		if (nextValuePerKgNumber && totalValueNumber) {
			setWeight(formatComputedNumber(getGrossWeightFromNet(totalValueNumber / nextValuePerKgNumber, impurityPercentage) || 0));
		}
	};

	const handleImpurityChange = (nextImpurityValue) => {
		setImpurityPercentage(nextImpurityValue);

		const nextTotal = calculateTotalByImpurity(weight, valuePerKg, nextImpurityValue);
		if (nextTotal) {
			setTotalValue(nextTotal);
			return;
		}

		const totalValueNumber = parsePositiveNumber(totalValue);
		const valuePerKgNumber = parsePositiveNumber(valuePerKg);
		if (totalValueNumber && valuePerKgNumber) {
			const nextGrossWeight = getGrossWeightFromNet(totalValueNumber / valuePerKgNumber, nextImpurityValue);
			if (nextGrossWeight) setWeight(formatComputedNumber(nextGrossWeight));
		}
	};

	const handleTotalValueChange = (nextTotalValue) => {
		setTotalValue(nextTotalValue);

		const nextTotalValueNumber = parsePositiveNumber(nextTotalValue);
		const netWeight = getNetWeight(weight, impurityPercentage);
		const valuePerKgNumber = parsePositiveNumber(valuePerKg);

		if (nextTotalValueNumber && netWeight) {
			setValuePerKg(formatComputedNumber(nextTotalValueNumber / netWeight));
			return;
		}

		if (nextTotalValueNumber && valuePerKgNumber) {
			setWeight(formatComputedNumber(getGrossWeightFromNet(nextTotalValueNumber / valuePerKgNumber, impurityPercentage) || 0));
		}
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
		setEditMaterialTypeId(purchase.materialTypeId || null);
		setEditMaterialsExtra(Array.isArray(purchase.materialsExtra) ? purchase.materialsExtra : []);
		setEditExtraMaterialTypeId(null);
		setEditExtraMaterialWeight("");
		setEditExtraMaterialImpurity("");
		setEditExtraMaterialValuePerKg("");
		setEditWeight(purchase.weight || "");
		const purchaseWeight = getNetWeight(purchase.weight, purchase.impurityPercentage || 0);
		const purchaseTotalValue = parsePositiveNumber(purchase.value);
		const purchaseValuePerKg =
			purchaseWeight && purchaseTotalValue
				? parsePositiveNumber((purchaseTotalValue / purchaseWeight).toFixed(2))
				: parsePositiveNumber(purchase.valuePerKg);
		setEditValuePerKg(purchaseValuePerKg ? String(purchaseValuePerKg) : "");
		setEditTotalValue(purchase.value || "");
		setEditImpurityPercentage(purchase.impurityPercentage || "");
		setEditDatetime(safeDate);
		setEditAttachments([...(purchase.attachments || [])]);
		setEditNewAttachments([]);
		setEditError("");
		setIsEditOpen(true);
	};

	const handleEditWeightChange = (nextWeightValue) => {
		setEditWeight(nextWeightValue);

		const nextNetWeight = getNetWeight(nextWeightValue, editImpurityPercentage);
		const valuePerKgNumber = parsePositiveNumber(editValuePerKg);
		const totalValueNumber = parsePositiveNumber(editTotalValue);

		if (nextNetWeight && valuePerKgNumber) {
			setEditTotalValue(formatComputedNumber(nextNetWeight * valuePerKgNumber));
			return;
		}

		if (nextNetWeight && totalValueNumber) {
			setEditValuePerKg(formatComputedNumber(totalValueNumber / nextNetWeight));
		}
	};

	const handleEditValuePerKgChange = (nextValuePerKgValue) => {
		setEditValuePerKg(nextValuePerKgValue);

		const nextValuePerKgNumber = parsePositiveNumber(nextValuePerKgValue);
		const netWeight = getNetWeight(editWeight, editImpurityPercentage);
		const totalValueNumber = parsePositiveNumber(editTotalValue);

		if (nextValuePerKgNumber && netWeight) {
			setEditTotalValue(formatComputedNumber(netWeight * nextValuePerKgNumber));
			return;
		}

		if (nextValuePerKgNumber && totalValueNumber) {
			setEditWeight(formatComputedNumber(getGrossWeightFromNet(totalValueNumber / nextValuePerKgNumber, editImpurityPercentage) || 0));
		}
	};

	const handleEditImpurityChange = (nextImpurityValue) => {
		setEditImpurityPercentage(nextImpurityValue);

		const nextTotal = calculateTotalByImpurity(editWeight, editValuePerKg, nextImpurityValue);
		if (nextTotal) {
			setEditTotalValue(nextTotal);
			return;
		}

		const totalValueNumber = parsePositiveNumber(editTotalValue);
		const valuePerKgNumber = parsePositiveNumber(editValuePerKg);
		if (totalValueNumber && valuePerKgNumber) {
			const nextGrossWeight = getGrossWeightFromNet(totalValueNumber / valuePerKgNumber, nextImpurityValue);
			if (nextGrossWeight) setEditWeight(formatComputedNumber(nextGrossWeight));
		}
	};

	const handleEditTotalValueChange = (nextTotalValue) => {
		setEditTotalValue(nextTotalValue);

		const nextTotalValueNumber = parsePositiveNumber(nextTotalValue);
		const netWeight = getNetWeight(editWeight, editImpurityPercentage);
		const valuePerKgNumber = parsePositiveNumber(editValuePerKg);

		if (nextTotalValueNumber && netWeight) {
			setEditValuePerKg(formatComputedNumber(nextTotalValueNumber / netWeight));
			return;
		}

		if (nextTotalValueNumber && valuePerKgNumber) {
			setEditWeight(formatComputedNumber(getGrossWeightFromNet(nextTotalValueNumber / valuePerKgNumber, editImpurityPercentage) || 0));
		}
	};

	const handleEditFiles = (fileList) => {
		const files = Array.from(fileList || []);
		if (files.length === 0) return;

		setEditNewAttachments((prev) => {
			const existing = new Set([
				...editAttachments.map((attachment) => attachment.file_name),
				...prev.map((file) => file.name),
			]);
			const newFiles = files.filter((file) => !existing.has(file.name));
			return [...prev, ...newFiles];
		});
	};

	const removeEditAttachment = (index) => {
		setEditNewAttachments((prev) => prev.filter((_, i) => i !== index));
	};

	const handleDeleteAttachmentConfirm = async () => {
		const attachment = confirmAttachmentDelete.attachment;
		if (!attachment?.id || !String(confirmAttachmentDelete.password || "").trim()) return;

		setDeletingAttachment(true);
		try {
			await deletePurchaseAttachment(attachment.id, confirmAttachmentDelete.password);
			setEditAttachments((prev) => prev.filter((item) => item.id !== attachment.id));
			setPurchases(await fetchPurchases());
			setConfirmAttachmentDelete({ open: false, attachment: null, password: "" });
		} catch (err) {
			setErrorModal({
				open: true,
				title: "Erro ao remover comprovante",
				message: err?.message || "Não foi possível remover o comprovante.",
			});
		} finally {
			setDeletingAttachment(false);
		}
	};

	const handleEditSubmit = async (e) => {
		e.preventDefault();
		if (savingEdit) return;
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

		if (!editMaterialTypeId) {
			setEditError("Selecione o tipo de sucata.");
			return;
		}

		if (!editWeight || Number(editWeight) <= 0) {
			setEditError("Informe um peso valido.");
			return;
		}

		if (!editValuePerKg || Number(editValuePerKg) <= 0) {
			setEditError("Informe um valor por kg valido.");
			return;
		}

		if (Number(editImpurityPercentage || 0) < 0 || Number(editImpurityPercentage || 0) > 100) {
			setEditError("Informe uma impureza entre 0 e 100%.");
			return;
		}

		if (!editTotalValue || Number(editTotalValue) <= 0) {
			setEditError("Informe um valor total valido.");
			return;
		}

		if (!editDatetime) {
			setEditError("Informe dia e hora da compra.");
			return;
		}

		if (editAttachments.length + editNewAttachments.length === 0) {
			setEditError("Anexe pelo menos um comprovante (pagamento ou ticket da balanca).");
			return;
		}

		setSavingEdit(true);
		try {
			await updatePurchase(editingPurchaseId, {
				supplier_id: editSupplierId,
				employee_id: editEmployeeId,
				material_type_id: editMaterialTypeId,
				material_types_extra: editMaterialsExtra,
				impurity_percentage: editImpurityPercentage || 0,
				weight: editWeight,
				value: editTotalValue,
				purchase_datetime: formatDateTimeForApi(editDatetime),
			});
			for (const file of editNewAttachments) {
				await uploadAttachment({ purchaseId: editingPurchaseId, file });
			}

			const refreshedPurchases = await fetchPurchases();
			setPurchases(refreshedPurchases);
			setIsEditOpen(false);
			setEditingPurchaseId(null);
			setEditNewAttachments([]);
		} catch (err) {
			setEditError(err?.message || "Erro ao atualizar compra.");
		} finally {
			setSavingEdit(false);
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (creatingPurchase) return;
		setError("");

		if (!SupplierId) {
			setError("Selecione um Fornecedor.");
			return;
		}

		if (!employeeId) {
			setError("Selecione o funcionario responsavel.");
			return;
		}

		if (!materialTypeId) {
			setError("Selecione o tipo de sucata.");
			return;
		}

		if (!weight || Number(weight) <= 0) {
			setError("Informe um peso valido.");
			return;
		}

		if (!valuePerKg || Number(valuePerKg) <= 0) {
			setError("Informe um valor por kg valido.");
			return;
		}

		if (Number(impurityPercentage || 0) < 0 || Number(impurityPercentage || 0) > 100) {
			setError("Informe uma impureza entre 0 e 100%.");
			return;
		}

		if (!totalValue || Number(totalValue) <= 0) {
			setError("Informe um valor total valido.");
			return;
		}

		if (applyAdvance && (!advanceValue || Number(advanceValue) <= 0 || Number(advanceValue) > Number(totalValue))) {
			setError("O valor aplicado ao adiantamento deve ser maior que zero e não pode superar o valor da compra.");
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

		setCreatingPurchase(true);
		try {
			await createPurchaseWithAttachments({
				purchasePayload: {
				supplier_id: SupplierId,
				employee_id: employeeId,
				material_type_id: materialTypeId,
				material_types_extra: materialsExtra,
				impurity_percentage: impurityPercentage || 0,
				weight,
				value: totalValue,
				purchase_datetime: formatDateTimeForApi(datetime),
					apply_advance: applyAdvance,
					advance_value: applyAdvance ? advanceValue : undefined,
				},
				files: attachments,
			});

			const [refreshedPurchases, refreshedSuppliers] = await Promise.all([fetchPurchases(), fetchSuppliers()]);
			setPurchases(refreshedPurchases);
			setSuppliers(refreshedSuppliers);
			setSupplierId(null);
			setEmployeeId(null);
			setMaterialTypeId(null);
			setMaterialsExtra([]);
			setExtraMaterialTypeId(null);
			setExtraMaterialWeight("");
			setExtraMaterialImpurity("");
			setExtraMaterialValuePerKg("");
			setExtraMaterialTotalValue("");
			setWeight("");
			setValuePerKg("");
			setTotalValue("");
			setImpurityPercentage("");
			setDatetime(null);
			setAttachments([]);
			setPendingAdvances([]);
			setApplyAdvance(false);
			setAdvanceValue("");
			setAdvanceValueDraft("");
			setIsEditingAdvanceValue(false);
			setIsAdvanceValueCustomized(false);
			setIsCreateOpen(false);
		} catch (err) {
			setError(err?.message || "Erro ao salvar compra.");
		} finally {
			setCreatingPurchase(false);
		}
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
							options={employeesOptions}
							selectedId={employeeId}
							onSelect={setEmployeeId}
						/>

						{SupplierId && (
							<div className={`md:col-span-2 rounded-lg border px-3 py-2.5 ${
								hasPendingAdvances
									? "border-emerald-200 bg-emerald-50/60"
									: "border-red-200 bg-red-50/70"
							}`}>
								<div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.72fr)] md:items-start">
									<div className="flex items-start gap-2.5">
										{hasPendingAdvances && (
											<input
												type="checkbox"
												checked={applyAdvance}
												onChange={(e) => handleApplyAdvanceChange(e.target.checked)}
												className="mt-0.5 h-3.5 w-3.5 rounded border-emerald-400 accent-emerald-600 checked:bg-emerald-600 checked:border-emerald-600 focus:ring-emerald-500"
											/>
										)}
										<div className="space-y-0.5 leading-tight">
											<p className={`text-sm font-semibold ${hasPendingAdvances ? "text-emerald-900" : "text-red-900"}`}>
												{hasPendingAdvances
													? "Abater adiantamento / gerar saldo positivo"
													: "Sem adiantamento em aberto"}
											</p>
											<p className={`text-xs ${hasPendingAdvances ? "text-emerald-800" : "text-red-800"}`}>
												{hasPendingAdvances
													? `Existe(m) ${pendingAdvances.length} adiantamento(s) pendente(s) para este fornecedor.`
													: "Este fornecedor nao possui adiantamentos pendentes para abater nesta compra."}
											</p>
											{hasPendingAdvances && (
												<p className="text-[11px] text-emerald-700">
													Saldo devedor disponivel: {formatMoney(totalPendingAdvanceValue)}
													{selectedSupplier?.advanceCreditBalance > 0 ? ` | Saldo positivo atual: ${formatMoney(selectedSupplier.advanceCreditBalance)}` : ""}
												</p>
											)}
											{hasPendingAdvances && advancePreview && (
												<div className="space-y-1 pt-1">
													<div className="relative max-w-xs">
														<input
															type="number"
															min="0.01"
															max={totalValue || undefined}
															step="0.01"
															autoFocus={isEditingAdvanceValue}
															readOnly={!isEditingAdvanceValue}
															placeholder="Valor à ser abatido"
															value={isEditingAdvanceValue ? advanceValueDraft : advanceValue}
															onChange={(event) => setAdvanceValueDraft(event.target.value)}
															className={`h-9 w-full rounded-lg border border-emerald-200 bg-white px-3 text-sm text-slate-800 outline-none ${isEditingAdvanceValue ? "pr-20 focus:ring-2 focus:ring-emerald-200" : "pr-11"}`}
														/>
														<div className="absolute inset-y-0 right-1 flex items-center gap-0.5">
															{isEditingAdvanceValue ? (
																<>
																	<AdvanceValueIconButton variant="cancel" label="Cancelar edição" onClick={() => { setAdvanceValueDraft(""); setIsEditingAdvanceValue(false); }}><X className="h-4 w-4" /></AdvanceValueIconButton>
																	<AdvanceValueIconButton variant="confirm" label="Confirmar valor" onClick={handleConfirmAdvanceValue}><Check className="h-4 w-4" /></AdvanceValueIconButton>
																</>
															) : (
																<AdvanceValueIconButton label="Editar valor aplicado" onClick={() => { setAdvanceValueDraft(advanceValue); setIsEditingAdvanceValue(true); }}><Pencil className="h-4 w-4" /></AdvanceValueIconButton>
															)}
														</div>
													</div>
													<p className="text-[11px] font-semibold text-emerald-800">
														Valor abatido: {formatMoney(advancePreview.abatementValue)} / Valor pago: {formatMoney(advancePreview.paidValue)}. {advancePreview.debtAfter > 0
															? `Após a compra, ainda deve ${formatMoney(advancePreview.debtAfter)}.`
															: `Após a compra, saldo positivo de ${formatMoney(advancePreview.creditAfter)}.`}
													</p>
												</div>
											)}
										</div>
									</div>

									<div className={`self-start rounded-lg border bg-white/80 px-3 py-2 shadow-sm ${
										hasPendingAdvances ? "border-emerald-200" : "border-red-200"
									}`}>
										<div className={`flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] ${
											hasPendingAdvances ? "text-emerald-700" : "text-red-700"
										}`}>
											<KeyRound className="h-3.5 w-3.5" />
											<span>Pix do fornecedor</span>
										</div>
										<div className="mt-1.5 flex flex-wrap items-center gap-2">
											<span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
												hasPendingAdvances
													? "bg-emerald-100 text-emerald-800"
													: "bg-red-100 text-red-800"
											}`}>
												{selectedSupplierPix.typeLabel}
											</span>
											<span className={`break-all text-sm font-semibold ${
												hasPendingAdvances ? "text-emerald-950" : "text-red-950"
											}`}>
												{selectedSupplierPix.value}
											</span>
										</div>
									</div>
								</div>
							</div>
						)}

						<div className="md:col-span-2 grid grid-cols-1 md:grid-cols-6 gap-3">
							<SearchSelect
								label="Tipo de sucata"
								placeholder="Pesquisar tipo de sucata..."
								options={materialTypeOptions}
								selectedId={materialTypeId}
								onSelect={setMaterialTypeId}
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
										onChange={(e) => handleWeightChange(e.target.value)}
										placeholder="Ex.: 820"
										className="w-full h-11 pl-9 pr-3 border border-[#d6ab4a]/50 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#d6ab4a]/30 focus:border-[#b8891f] placeholder:text-gray-400"
									/>
								</div>
							</div>

							<div>
								<label className="block text-sm font-medium mb-1 text-[#4a3918]">Valor por kg (R$) *</label>
								<input
									type="number"
									step="0.01"
									min="0"
									value={valuePerKg}
									onChange={(e) => handleValuePerKgChange(e.target.value)}
									placeholder="Valor por kg"
									className="w-full h-11 px-3 border border-[#d6ab4a]/50 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#d6ab4a]/30 focus:border-[#b8891f]"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium mb-1 text-[#4a3918]">Impureza (%)</label>
								<input
									type="number"
									step="0.01"
									min="0"
									max="100"
									value={impurityPercentage}
									onChange={(e) => handleImpurityChange(e.target.value)}
									placeholder="Ex.: 2.5"
									className="w-full h-11 px-3 border border-[#d6ab4a]/50 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#d6ab4a]/30 focus:border-[#b8891f]"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium mb-1 text-[#4a3918]">Valor total (R$) *</label>
								<input
									type="number"
									step="0.01"
									min="0"
									value={totalValue}
									onChange={(e) => handleTotalValueChange(e.target.value)}
									placeholder="Valor total"
									className="w-full h-11 px-3 border border-[#d6ab4a]/50 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#d6ab4a]/30 focus:border-[#b8891f]"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium mb-1 text-[#4a3918]">Dia e hora *</label>
								<div className="relative">
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

						<div className="md:col-span-2">
							<MaterialsCard
								materials={materialsExtra}
								materialOptions={materialTypeOptions}
								selectedMaterialId={extraMaterialTypeId}
								onMaterialSelect={setExtraMaterialTypeId}
								weightValue={extraMaterialWeight}
								onWeightChange={handleExtraMaterialWeightChange}
								onAdd={addMaterialExtra}
								onRemove={removeMaterialExtra}
								impurityValue={extraMaterialImpurity}
								onImpurityChange={handleExtraMaterialImpurityChange}
								valuePerKgValue={extraMaterialValuePerKg}
								onValuePerKgChange={handleExtraMaterialValuePerKgChange}
								totalValue={extraMaterialTotalValue}
								onTotalChange={handleExtraMaterialTotalChange}
							/>
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
						<Button
							type="submit"
							disabled={creatingPurchase}
							className="bg-gradient-to-r from-[#b8891f] to-[#d6ab4a] text-white hover:brightness-105 disabled:opacity-60"
						>
							{creatingPurchase ? "Salvando..." : "Salvar compra"}
						</Button>

						<Button
							type="button"
							variant="outline"
							onClick={() => setInfoModal({
								open: true,
								title: "Salvar compra primeiro",
								message: "Para enviar comprovantes, primeiro salve a compra com seus anexos.",
							})}
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
						const purchaseNetWeight = getNetWeight(purchase.weight, purchase.impurityPercentage || 0);
						const purchaseValuePerKg = purchaseNetWeight
							? Number(purchase.value) / purchaseNetWeight
							: 0;
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
										<p><span className="text-gray-500">Tipo de sucata:</span> {materialTypeOptions.find((t) => t.id === purchase.materialTypeId)?.label || purchase.materialTypeName || "Nao especificado"}</p>
										{purchase.materialsExtra?.length > 0 && (
											<p><span className="text-gray-500">Materiais extras:</span> {formatExtraMaterialNames(purchase.materialsExtra)}</p>
										)}
										<p><span className="text-gray-500">Valor/kg:</span> {purchaseValuePerKg.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
										<p><span className="text-gray-500">Impureza:</span> {Number(purchase.impurityPercentage || 0).toLocaleString("pt-BR")}%</p>
										<p><span className="text-gray-500">Valor total:</span> {Number(purchase.value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
										{Number(purchase.advanceAbatementValue || 0) > 0 && (
											<p><span className="text-gray-500">Valor abatido / valor pago:</span> {formatMoney(purchase.advanceAbatementValue)} / {formatMoney(Math.max(Number(purchase.value || 0) - Number(purchase.advanceAppliedValue || 0), 0))}</p>
										)}
										{Number(purchase.advanceCreditAfter || 0) > 0 && (
											<p><span className="text-gray-500">Saldo positivo:</span> {formatMoney(purchase.advanceCreditAfter)}</p>
										)}
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
													options={employeesOptions}
													selectedId={editEmployeeId}
													onSelect={setEditEmployeeId}
												/>

												<div className="md:col-span-2 grid grid-cols-1 md:grid-cols-6 gap-3">
													<SearchSelect
														label="Tipo de sucata"
														placeholder="Pesquisar tipo de sucata..."
														options={materialTypeOptions}
														selectedId={editMaterialTypeId}
														onSelect={setEditMaterialTypeId}
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
																onChange={(e) => handleEditWeightChange(e.target.value)}
																placeholder="Ex.: 820"
																className="w-full h-11 pl-9 pr-3 border border-[#d6ab4a]/50 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#d6ab4a]/30 focus:border-[#b8891f] placeholder:text-gray-400"
															/>
														</div>
													</div>

													<div>
														<label className="block text-sm font-medium mb-1 text-[#4a3918]">Valor por kg (R$) *</label>
														<input
															type="number"
															step="0.01"
															min="0"
															value={editValuePerKg}
															onChange={(e) => handleEditValuePerKgChange(e.target.value)}
															placeholder="Valor por kg"
															className="w-full h-11 px-3 border border-[#d6ab4a]/50 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#d6ab4a]/30 focus:border-[#b8891f]"
														/>
													</div>

													<div>
														<label className="block text-sm font-medium mb-1 text-[#4a3918]">Impureza (%)</label>
														<input
															type="number"
															step="0.01"
															min="0"
															max="100"
															value={editImpurityPercentage}
															onChange={(e) => handleEditImpurityChange(e.target.value)}
															placeholder="Ex.: 2.5"
															className="w-full h-11 px-3 border border-[#d6ab4a]/50 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#d6ab4a]/30 focus:border-[#b8891f]"
														/>
													</div>

													<div>
														<label className="block text-sm font-medium mb-1 text-[#4a3918]">Valor total (R$) *</label>
														<input
															type="number"
															step="0.01"
															min="0"
															value={editTotalValue}
															onChange={(e) => handleEditTotalValueChange(e.target.value)}
															placeholder="Valor total"
															className="w-full h-11 px-3 border border-[#d6ab4a]/50 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#d6ab4a]/30 focus:border-[#b8891f]"
														/>
													</div>

													<div>
														<label className="block text-sm font-medium mb-1 text-[#4a3918]">Dia e hora *</label>
														<div className="relative">
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

												<div className="md:col-span-2">
													<MaterialsCard
														materials={editMaterialsExtra}
														materialOptions={materialTypeOptions}
														selectedMaterialId={editExtraMaterialTypeId}
														onMaterialSelect={setEditExtraMaterialTypeId}
														weightValue={editExtraMaterialWeight}
														onWeightChange={handleEditExtraMaterialWeightChange}
														onAdd={addEditMaterialExtra}
														onRemove={removeEditMaterialExtra}
														impurityValue={editExtraMaterialImpurity}
														onImpurityChange={handleEditExtraMaterialImpurityChange}
														valuePerKgValue={editExtraMaterialValuePerKg}
														onValuePerKgChange={handleEditExtraMaterialValuePerKgChange}
														totalValue={editExtraMaterialTotalValue}
														onTotalChange={handleEditExtraMaterialTotalChange}
													/>
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
										{editAttachments.map((attachment) => (
											<span
																key={attachment.id}
																className="inline-flex items-center gap-2 bg-white border border-amber-200 rounded-full px-3 py-1.5 text-xs text-gray-700"
															>
																<Paperclip className="w-3 h-3 text-[#b8891f]" />
																{attachment.file_name}
																<button
																	type="button"
																	onClick={() => setConfirmAttachmentDelete({ open: true, attachment, password: "" })}
																	className="text-gray-400 hover:text-red-500"
																	aria-label={`Remover ${attachment.file_name}`}
																>
																	<X className="w-3 h-3" />
																</button>
											</span>
										))}
									</div>
								)}

								{editNewAttachments.length > 0 && (
									<div className="mt-3 flex flex-wrap gap-2">
										{editNewAttachments.map((file, index) => (
											<span key={`${file.name}-${index}`} className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5 text-xs text-gray-700">
												<Paperclip className="w-3 h-3 text-emerald-700" />
												{file.name}
												<button type="button" onClick={() => removeEditAttachment(index)} className="text-gray-400 hover:text-red-500">
													<X className="w-3 h-3" />
												</button>
											</span>
										))}
									</div>
								)}
											</div>

											<div className="flex flex-wrap gap-3 pt-2">
								<Button type="submit" disabled={savingEdit} className="bg-gradient-to-r from-[#b8891f] to-[#d6ab4a] text-white hover:brightness-105 disabled:opacity-60">
									{savingEdit ? "Salvando..." : "Salvar compra"}
												</Button>

												<Button
													type="button"
													variant="outline"
													onClick={() => handleSendComprovantes(purchase)}
													disabled={sendingPurchaseId === purchase.id}
												>
													<Send className="w-4 h-4" /> {sendingPurchaseId === purchase.id ? "Enviando..." : "Enviar comprovantes no WhatsApp/Email"}
												</Button>

												<Button
													type="button"
													variant="outline"
													onClick={() => setConfirmDelete({ open: true, id: purchase.id, itemLabel: `Compra #${purchase.id}`, password: "" })}
													className="border-red-300 text-red-700 hover:bg-red-50"
												>
													Excluir compra
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
				title="Excluir compra"
				message="Tem certeza que deseja excluir esta compra? Esta acao nao pode ser desfeita."
				itemLabel={confirmDelete.itemLabel}
				password={confirmDelete.password}
				onPasswordChange={(password) => setConfirmDelete((prev) => ({ ...prev, password }))}
				onCancel={() => setConfirmDelete({ open: false, id: null, itemLabel: "", password: "" })}
				onConfirm={handleDeletePurchaseConfirm}
				loading={deletingPurchase}
			/>

			<ConfirmDeleteModal
				open={confirmAttachmentDelete.open}
				title="Excluir comprovante"
				message="Tem certeza que deseja excluir este comprovante? Ele também deixará de aparecer para o vendedor."
				itemLabel={confirmAttachmentDelete.attachment?.file_name || ""}
				password={confirmAttachmentDelete.password}
				onPasswordChange={(password) => setConfirmAttachmentDelete((prev) => ({ ...prev, password }))}
				onCancel={() => setConfirmAttachmentDelete({ open: false, attachment: null, password: "" })}
				onConfirm={handleDeleteAttachmentConfirm}
				loading={deletingAttachment}
			/>
		</div>
	);
}

function AdvanceValueIconButton({ label, onClick, children, variant = "edit" }) {
	const palette = variant === "confirm"
		? "text-emerald-700 hover:bg-emerald-50"
		: variant === "cancel"
			? "text-red-600 hover:bg-red-50"
			: "text-slate-900 hover:bg-slate-100";

	return (
		<button type="button" aria-label={label} title={label} onClick={onClick} className={`grid h-8 w-8 place-items-center rounded-lg transition ${palette}`}>
			{children}
		</button>
	);
}
