import { useEffect, useMemo, useState } from "react";
import { Calendar, Scale, DollarSign, ChevronDown, ChevronUp } from "lucide-react";
import InternalSupplierLayout, { useSectionContext } from "@/layouts/InternalSupplierLayout";
import { fetchMe, getSessionUser, updateMyAccount } from "@/services/authApi";
import SuccessModal from "@/components/internal/successModal";
import ErrorModal from "@/components/internal/errorModal";
import {
  fetchMaterialTypes,
  fetchPurchases,
} from "@/services/ordersData";
import { fetchAdvances } from "@/services/advancesData";
import { fetchSuppliers } from "@/services/entityData";

const fmtMoney = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

const fmtDateTime = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function formatMaterial(purchase, materialTypes) {
  if (purchase?.materialTypeName) return purchase.materialTypeName;
  const found = materialTypes.find((type) => type.id === purchase?.materialTypeId);
  return found?.label || "Não especificado";
}

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
  if (type === "email") return supplier.email || "";
  return "";
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

function getAdvanceStatusLabel(status) {
  return String(status || "pendente").toLowerCase() === "finalizado" ? "Finalizado" : "Pendente";
}

function getAdvanceStatusBadgeClass(status) {
  return String(status || "pendente").toLowerCase() === "finalizado"
    ? "bg-emerald-100 text-emerald-800"
    : "bg-amber-100 text-amber-800";
}

function useSupplierPortalData() {
  const [authUser, setAuthUser] = useState(() => getSessionUser());
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [materialTypes, setMaterialTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    Promise.resolve()
      .then(async () => {
        const [user, suppliersResult, materialTypesResult, purchasesResult, advancesResult] = await Promise.all([
          fetchMe(),
          fetchSuppliers().then((data) => ({ ok: true, data })).catch(() => ({ ok: false, data: [] })),
          fetchMaterialTypes().then((data) => ({ ok: true, data })).catch(() => ({ ok: false, data: [] })),
          fetchPurchases().then((data) => ({ ok: true, data })).catch(() => ({ ok: false, data: [] })),
          fetchAdvances().then((data) => ({ ok: true, data })).catch(() => ({ ok: false, data: [] })),
        ]);

        if (!mounted) return;
        setAuthUser(user || null);
        setSuppliers(suppliersResult.ok ? suppliersResult.data : []);
        setMaterialTypes(materialTypesResult.ok ? materialTypesResult.data : []);
        setPurchases(purchasesResult.ok ? purchasesResult.data : []);
        setAdvances(advancesResult.ok ? advancesResult.data : []);
      })
      .catch(() => {
        if (!mounted) return;
        setAuthUser(null);
        setSuppliers([]);
        setMaterialTypes([]);
        setPurchases([]);
        setAdvances([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const supplierId = authUser?.supplier?.id || null;
  const currentSupplier = useMemo(() => {
    const fromList = suppliers.find((supplier) => supplier.id === supplierId);
    if (fromList) return fromList;

    const supplier = authUser?.supplier;
    if (!supplier) return null;

    return {
      id: supplier.id,
      supplierCode: supplier.supplier_code,
      personType: supplier.is_pf ? "PF" : "PJ",
      name: supplier.name || "",
      companyName: supplier.company_name || "",
    };
  }, [suppliers, supplierId, authUser]);

  const supplierPurchases = useMemo(
    () =>
      purchases
        .filter((purchase) => String(purchase.SupplierId) === String(supplierId))
        .sort((a, b) => {
          const dateA = new Date(a.datetime || 0).getTime();
          const dateB = new Date(b.datetime || 0).getTime();
          if (dateB !== dateA) return dateB - dateA;
          return (Number(b.id) || 0) - (Number(a.id) || 0);
        }),
    [purchases, supplierId]
  );

  const supplierAdvances = useMemo(
    () =>
      advances
        .filter((advance) => String(advance.SupplierId) === String(supplierId))
        .sort((a, b) => {
          const dateA = new Date(a.advanceDatetime || 0).getTime();
          const dateB = new Date(b.advanceDatetime || 0).getTime();
          if (dateB !== dateA) return dateB - dateA;
          return (Number(b.id) || 0) - (Number(a.id) || 0);
        }),
    [advances, supplierId]
  );

  return {
    authUser,
    currentSupplier,
    supplierPurchases,
    supplierAdvances,
    suppliers,
    materialTypes,
    loading,
  };
}

function DashboardSection({ onOpenSale }) {
  const { setActiveSection } = useSectionContext();
  const [showAllMovements, setShowAllMovements] = useState(false);
  const { supplierPurchases, currentSupplier } = useSupplierPortalData();

  const summary = useMemo(() => {
    const totalPurchases = supplierPurchases.length;
    const totalWeight = supplierPurchases.reduce((sum, p) => sum + (Number(p.weight) || 0), 0);
    const totalValue = supplierPurchases.reduce((sum, p) => sum + (Number(p.value) || 0), 0);

    return {
      totalPurchases,
      totalWeight,
      totalValue,
      avgTicket: totalPurchases > 0 ? totalValue / totalPurchases : 0,
    };
  }, [supplierPurchases]);

  const purchaseGroupCards = [
    {
      id: "vendas",
      title: "Vendas registradas",
      value: summary.totalPurchases,
      sub: "Total acumulado",
      icon: Calendar,
      color: "from-[#b8891f] to-[#d6ab4a]",
      bg: "bg-amber-50",
    },
    {
      id: "peso",
      title: "Peso vendido",
      value: `${summary.totalWeight.toLocaleString("pt-BR")} kg`,
      sub: "Volume acumulado",
      icon: Scale,
      color: "from-emerald-500 to-teal-500",
      bg: "bg-emerald-50",
    },
    {
      id: "valor",
      title: "Valor total de vendas",
      value: fmtMoney(summary.totalValue),
      sub: `Ticket médio ${fmtMoney(summary.avgTicket)}`,
      icon: DollarSign,
      color: "from-sky-500 to-blue-500",
      bg: "bg-sky-50",
    },
  ];

  const displayedPurchases = showAllMovements
    ? supplierPurchases
    : supplierPurchases.slice(0, 5);

  return (
    <section className="space-y-6 w-full">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Dashboard</h2>
        <p className="text-gray-600 mb-6">Resumo acumulado das suas movimentações</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {purchaseGroupCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.id} className={`p-6 rounded-xl border-2 border-gray-200 bg-white ${card.bg}`}>
              <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${card.color} text-white mb-3`}>
                <Icon size={24} />
              </div>
              <h3 className="text-sm text-gray-600 font-medium mb-2">{card.title}</h3>
              <p className="text-3xl font-bold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-500 mt-2">{card.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Últimas Movimentações</h3>
        </div>

        {displayedPurchases.length === 0 ? (
          <div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-gray-500">Nenhuma movimentação encontrada</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedPurchases.map((purchase) => (
              <button
                type="button"
                key={purchase.id}
                onClick={() => {
                  onOpenSale?.(purchase.id);
                  setActiveSection("sales");
                }}
                className="w-full p-4 border border-gray-200 rounded-lg bg-white hover:bg-amber-50/40 hover:border-amber-300 transition-all text-left"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-gray-900">Venda #{purchase.id}</p>
                  <p className="text-sm font-semibold text-gray-900">{fmtMoney(purchase.value)}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                  <p className="text-gray-700 break-words"><span className="text-gray-500">Fornecedor:</span> {currentSupplier ? (currentSupplier.personType === "PF" ? currentSupplier.name : currentSupplier.companyName) : purchase.SupplierName}</p>
                  <p className="text-gray-700 break-words"><span className="text-gray-500">Funcionário:</span> {purchase.employeeName || "-"}</p>
                  <p className="text-gray-700"><span className="text-gray-500">Peso:</span> {purchase.weight || "0"} kg</p>
                  <p className="text-gray-700"><span className="text-gray-500">Data e hora:</span> {fmtDateTime(purchase.datetime)}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {supplierPurchases.length > 5 && (
          <button
            onClick={() => setShowAllMovements(!showAllMovements)}
            className="mt-4 w-full py-2 text-amber-700 font-semibold hover:bg-amber-50 rounded-lg transition-colors"
          >
            {showAllMovements ? "Mostrar menos" : "Exibir mais"}
          </button>
        )}
      </div>
    </section>
  );
}

function SalesPortalWrapper({ initialSearchId = "" }) {
  const [searchId, setSearchId] = useState(initialSearchId || "");
  const [expandedSaleId, setExpandedSaleId] = useState(null);
  const { currentSupplier, supplierPurchases, suppliers, materialTypes } = useSupplierPortalData();

  useEffect(() => {
    if (initialSearchId !== undefined && initialSearchId !== null) {
      setSearchId(String(initialSearchId));
    }
  }, [initialSearchId]);

  const suppliersById = useMemo(() => {
    const map = new Map();
    suppliers.forEach((supplier) => {
      map.set(supplier.id, supplier);
    });
    return map;
  }, [suppliers]);

  const filteredPurchases = useMemo(() => {
    if (!searchId || !searchId.trim()) return supplierPurchases;
    return supplierPurchases.filter((purchase) => String(purchase.id).includes(searchId.trim()));
  }, [supplierPurchases, searchId]);

  const toggleSale = (saleId) => {
    setExpandedSaleId((prev) => (prev === saleId ? null : saleId));
  };

  const totalAttachments = useMemo(
    () => supplierPurchases.reduce((sum, purchase) => sum + (purchase.attachmentNames?.length || 0), 0),
    [supplierPurchases]
  );

  return (
    <section className="space-y-6 w-full">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Minhas Vendas</h2>
        {currentSupplier && (
          <p className="text-sm text-gray-600 mt-1 break-words">
            {currentSupplier.personType === "PF" ? currentSupplier.name : currentSupplier.companyName}
          </p>
        )}
      </div>

      <div>
        <input
          type="text"
          placeholder="Pesquisar por ID da venda..."
          value={searchId || ""}
          onChange={(e) => setSearchId(e.target.value)}
          className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SummaryCard label="Total de vendas" value={`${supplierPurchases.length}`} />
        <SummaryCard label="Comprovantes anexados" value={`${totalAttachments}`} />
      </div>

      {supplierPurchases.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-gray-500">Você ainda não possui vendas registradas</p>
        </div>
      ) : filteredPurchases.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-gray-500">Nenhuma venda encontrada com este ID</p>
        </div>
      ) : (
        <section className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-amber-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Vendas registradas</h3>
            <span className="text-xs text-gray-500">{filteredPurchases.length} vendas</span>
          </div>

          <div className="divide-y divide-gray-100">
            {filteredPurchases.map((purchase) => {
              const saleSupplier = suppliersById.get(purchase.SupplierId);
              const isExpanded = expandedSaleId === purchase.id;
              return (
                <div key={purchase.id}>
                  <button
                    type="button"
                    onClick={() => toggleSale(purchase.id)}
                    className="w-full p-4 text-left cursor-pointer hover:bg-amber-50/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900">Venda #{purchase.id}</p>
                        <p className="text-xs text-gray-500">{fmtDateTime(purchase.datetime)}</p>
                      </div>
                      <div className="text-gray-400 flex-shrink-0 mt-0.5">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm mt-2">
                      <p>
                        <span className="text-gray-500">Fornecedor:</span>{" "}
                        {`${saleSupplier ? (saleSupplier.personType === "PF" ? saleSupplier.name : saleSupplier.companyName) : purchase.SupplierName || "-"} #${purchase.SupplierId + 200}`}
                      </p>
                      <p><span className="text-gray-500">Tipo de Material:</span> {formatMaterial(purchase, materialTypes)}</p>
                      <p><span className="text-gray-500">Peso:</span> {`${purchase.weight || "0"} kg`}</p>
                      <p><span className="text-gray-500">Valor total:</span> {fmtMoney(purchase.value)}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Comprovantes: {purchase.attachmentNames?.join(", ") || "Nenhum"}
                    </p>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 bg-amber-50/35 border-t border-amber-100">
                      <div className="pt-4 space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <InfoSection label="Fornecedor" value={`${saleSupplier ? (saleSupplier.personType === "PF" ? saleSupplier.name : saleSupplier.companyName) : purchase.SupplierName || "-"} #${purchase.SupplierId + 200}`} />
                          <InfoSection label="Tipo de Material" value={formatMaterial(purchase, materialTypes)} />
                          <InfoSection label="Peso" value={`${purchase.weight || "0"} kg`} />
                          <InfoSection label="Valor por kg" value={fmtMoney(purchase.valuePerKg)} />
                          <InfoSection label="Valor Total" value={fmtMoney(purchase.value)} />
                          <InfoSection label="Data e Hora" value={fmtDateTime(purchase.datetime)} />
                        </div>

                        <div className="pt-4 border-t border-amber-100">
                          <InfoSection label="Funcionário Responsável" value={purchase.employeeName || "-"} />
                        </div>

                        {purchase.attachmentNames?.length > 0 ? (
                          <div className="pt-4 border-t border-amber-100">
                            <p className="text-sm font-semibold text-gray-700 mb-3">
                              Comprovantes e Tickets ({purchase.attachmentNames.length})
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {(Array.isArray(purchase.attachments) && purchase.attachments.length > 0
                                ? purchase.attachments
                                : (purchase.attachmentNames || []).map((name, idx) => ({
                                    id: `name-${idx}`,
                                    file_name: name,
                                  }))
                              ).map((attachment) => {
                                const href = attachment?.file_url || attachment?.file_path;
                                const hasLink = Boolean(href);

                                return (
                                  <a
                                    key={attachment.id}
                                    href={hasLink ? href : undefined}
                                    target={hasLink ? "_blank" : undefined}
                                    rel={hasLink ? "noreferrer" : undefined}
                                    className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                                      hasLink
                                        ? "border-amber-200 bg-amber-50/40 text-amber-900 hover:bg-amber-100/60"
                                        : "border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                                    }`}
                                    onClick={(e) => {
                                      if (!hasLink) e.preventDefault();
                                    }}
                                  >
                                    <p className="font-medium break-all">{attachment.file_name || "Anexo"}</p>
                                    <p className="text-xs mt-1 opacity-80">{hasLink ? "Clique para visualizar" : "Arquivo indisponível"}</p>
                                  </a>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="pt-4 border-t border-amber-100">
                            <p className="text-sm font-semibold text-gray-700 mb-3">Comprovantes e Tickets (0)</p>
                            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 bg-gray-50/50 text-center">
                              <p className="text-sm text-gray-500">Nenhum comprovante anexado</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </section>
  );
}

function AdvancesPortalWrapper() {
  const [searchId, setSearchId] = useState("");
  const [expandedAdvanceId, setExpandedAdvanceId] = useState(null);
  const { currentSupplier, supplierAdvances } = useSupplierPortalData();

  const filteredAdvances = useMemo(() => {
    if (!searchId.trim()) return supplierAdvances;
    return supplierAdvances.filter((advance) => String(advance.id).includes(searchId.trim()));
  }, [supplierAdvances, searchId]);

  const summary = useMemo(() => {
    return {
      total: supplierAdvances.length,
      remaining: supplierAdvances.reduce((sum, advance) => sum + (Number(advance.valueRemaining) || 0), 0),
    };
  }, [supplierAdvances]);

  return (
    <section className="space-y-6 w-full">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Meus Adiantamentos</h2>
        {currentSupplier && (
          <p className="text-sm text-gray-600 mt-1 break-words">
            {currentSupplier.personType === "PF" ? currentSupplier.name : currentSupplier.companyName}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SummaryCard label="Total de adiantamentos" value={`${summary.total}`} />
        <SummaryCard label="Slado Devedor" value={fmtMoney(summary.remaining)} />
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

      {supplierAdvances.length === 0 ? (
        <div className="rounded-2xl border border-amber-100 bg-amber-50/45 p-8 text-center">
          <p className="text-slate-700 font-medium">Nenhum adiantamento encontrado para este fornecedor.</p>
        </div>
      ) : filteredAdvances.length === 0 ? (
        <div className="rounded-2xl border border-amber-100 bg-amber-50/45 p-8 text-center">
          <p className="text-slate-700 font-medium">Nenhum adiantamento encontrado com este ID.</p>
        </div>
      ) : (
        <section className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-amber-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Adiantamentos registrados</h3>
            <span className="text-xs text-gray-500">{filteredAdvances.length} adiantamentos</span>
          </div>

          <div className="divide-y divide-gray-100">
            {filteredAdvances.map((advance) => {
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
                        <p className="text-xs text-gray-500">{fmtDateTime(advance.advanceDatetime)}</p>
                      </div>
                      <div className="text-gray-400 flex-shrink-0 mt-0.5">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm mt-2">
                      <p><span className="text-gray-500">Fornecedor:</span> {advance.SupplierName || "-"}</p>
                      <p><span className="text-gray-500">Funcionário:</span> {advance.employeeName || "-"}</p>
                      <p><span className="text-gray-500">Valor total:</span> {fmtMoney(advance.valueTotal)}</p>
                      <p><span className="text-gray-500">Slado Devedor:</span> {fmtMoney(advance.valueRemaining)}</p>
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
                          <InfoSection label="Valor total" value={fmtMoney(advance.valueTotal)} />
                          <InfoSection label="Valor restante" value={fmtMoney(advance.valueRemaining)} />
                          <InfoSection label="Data e Hora" value={fmtDateTime(advance.advanceDatetime)} />
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
                          {advance.attachments?.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {advance.attachments.map((attachment) => {
                                const href = attachment?.file_url || attachment?.file_path;
                                const hasLink = Boolean(href);

                                return (
                                  <a
                                    key={attachment.id}
                                    href={hasLink ? href : undefined}
                                    target={hasLink ? "_blank" : undefined}
                                    rel={hasLink ? "noreferrer" : undefined}
                                    className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                                      hasLink
                                        ? "border-amber-200 bg-amber-50/40 text-amber-900 hover:bg-amber-100/60"
                                        : "border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                                    }`}
                                    onClick={(e) => {
                                      if (!hasLink) e.preventDefault();
                                    }}
                                  >
                                    <p className="font-medium break-all">{attachment.file_name || "Anexo"}</p>
                                    <p className="text-xs mt-1 opacity-80">{hasLink ? "Clique para visualizar" : "Arquivo indisponível"}</p>
                                  </a>
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
    </section>
  );
}

function AccountPortalWrapper() {
  const [authUser, setAuthUser] = useState(() => getSessionUser());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState({
    open: false,
    title: "",
    message: "",
    type: "info",
  });
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

  const isPf = useMemo(() => {
    if (!currentSupplier) return false;
    if (typeof currentSupplier.is_pf === "boolean") return currentSupplier.is_pf;
    return !!(currentSupplier.cpf && !currentSupplier.cnpj);
  }, [currentSupplier]);

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

  const handlePixTypeChange = (value) => {
    setFormData((prev) => ({ ...prev, pixKeyType: value }));
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
      const message = err?.message || "Não foi possível atualizar a conta.";
      setFeedbackModal({
        open: true,
        type: "error",
        title: "Falha ao salvar",
        message,
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
      <section className="space-y-6 w-full">
        <p className="text-gray-600">Carregando dados da conta...</p>
      </section>
    );
  }

  return (
    <section className="space-y-6 w-full">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Minha Conta</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Informações Pessoais</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isPf ? "Nome" : "Razão Social"}
            </label>
            <input
              type="text"
              name="nomeOuEmpresa"
              value={formData.nomeOuEmpresa}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isPf ? "CPF" : "CNPJ"}
            </label>
            <input
              type="text"
              name="documento"
              value={formData.documento}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
            <input
              type="text"
              name="telefone"
              value={formData.telefone}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 ">Tipo da chave Pix</label>
            <PixTypeSelect
              value={formData.pixKeyType}
              onChange={handlePixTypeChange}
              options={isPf ? [
                { value: "cpf", label: "CPF" },
                { value: "phone", label: "Telefone" },
                { value: "email", label: "Email" },
              ] : [
                { value: "cnpj", label: "CNPJ" },
                { value: "phone", label: "Telefone" },
                { value: "email", label: "Email" },
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chave Pix</label>
            <input
              type="text"
              readOnly
              value={pixValue || ""}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
            <textarea
              name="enderecoUnificado"
              value={formData.enderecoUnificado}
              onChange={handleChange}
              rows={4}
              placeholder="Ex.: Rua X, 123, Bairro Y, Cidade/UF, CEP 00000-000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-y"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Alterar senha</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha atual</label>
            <input
              type="password"
              name="senhaAtual"
              value={formData.senhaAtual}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
            <input
              type="password"
              name="novaSenha"
              value={formData.novaSenha}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar nova senha</label>
            <input
              type="password"
              name="confirmarNovaSenha"
              value={formData.confirmarNovaSenha}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-gradient-to-r from-[#b8891f] to-[#d6ab4a] text-white font-semibold rounded-lg hover:shadow-lg transition-shadow disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? "Salvando..." : "Salvar Alterações"}
        </button>
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
  );
}

function SupplierPortalContent() {
  const { activeSection } = useSectionContext();
  const [selectedSaleId, setSelectedSaleId] = useState("");

  return (
    <div className="w-full max-w-6xl mx-auto">
      {activeSection === "dashboard" && <DashboardSection onOpenSale={(saleId) => setSelectedSaleId(String(saleId))} />}
      {activeSection === "sales" && <SalesPortalWrapper initialSearchId={selectedSaleId} />}
      {activeSection === "advances" && <AdvancesPortalWrapper />}
      {activeSection === "account" && <AccountPortalWrapper />}
    </div>
  );
}

export default function SupplierPortal() {
  return (
    <InternalSupplierLayout>
      <SupplierPortalContent />
    </InternalSupplierLayout>
  );
}

function InfoSection({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
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

function PixTypeSelect({ value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value) || options[0];

  return (
    <div className="relative" tabIndex={0} onBlur={() => setTimeout(() => setOpen(false), 120)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full h-11 px-4 border border-gray-300 rounded-lg bg-white text-left text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
      >
        {selected?.label || "Selecione"}
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-md overflow-hidden">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-900 hover:bg-amber-500/25"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
