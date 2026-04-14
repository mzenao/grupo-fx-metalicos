import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import ErrorModal from "@/components/internal/errorModal";
import { fetchMe, getSessionUser } from "@/services/authApi";
import {
  fetchMaterialTypes,
  fetchPurchases,
  resolvePurchaseAttachmentPreviewUrl,
} from "@/services/ordersData";

const personTypeBadge = {
  PF: "bg-sky-100 text-sky-800",
  PJ: "bg-amber-100 text-amber-800",
};

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

export default function Sells() {
  const [searchId, setSearchId] = useState("");
  const [expandedSaleId, setExpandedSaleId] = useState(null);
  const [authUser, setAuthUser] = useState(() => getSessionUser());
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [materialTypes, setMaterialTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openingAttachmentId, setOpeningAttachmentId] = useState(null);
  const [errorModal, setErrorModal] = useState({ open: false, title: "", message: "" });

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    Promise.resolve()
      .then(async () => {
        const [user, materialsData, purchasesData] = await Promise.all([
          fetchMe(),
          fetchMaterialTypes(),
          fetchPurchases(),
        ]);

        if (!mounted) return;
        setAuthUser(user || null);
        setSuppliers([]);
        setMaterialTypes(materialsData);
        setPurchases(purchasesData);
      })
      .catch(() => {
        if (!mounted) return;
        setAuthUser(null);
        setSuppliers([]);
        setMaterialTypes([]);
        setPurchases([]);
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
  const currentSupplierCode = authUser?.supplier?.supplier_code || null;

  const currentSupplier = useMemo(() => {
    if (!currentSupplierId) return null;
    const fromList = suppliers.find((supplier) => supplier.id === currentSupplierId);
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
  }, [currentSupplierId, suppliers, authUser]);

  const suppliersById = useMemo(() => {
    const map = new Map();
    suppliers.forEach((supplier) => {
      map.set(supplier.id, supplier);
    });
    return map;
  }, [suppliers]);

  const userPurchases = useMemo(() => {
    if (isSupplier) {
      return [...purchases].sort((a, b) => {
        const dateA = new Date(a.datetime || 0).getTime();
        const dateB = new Date(b.datetime || 0).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return (Number(b.id) || 0) - (Number(a.id) || 0);
      });
    }

    const normalizedSupplierId = currentSupplierId != null ? String(currentSupplierId) : null;
    const normalizedSupplierCode = currentSupplierCode != null ? String(currentSupplierCode) : null;

    return purchases
      .filter((purchase) => {
        const purchaseSupplierId = purchase?.SupplierId != null ? String(purchase.SupplierId) : null;
        const purchaseSupplierCode = purchase?.SupplierCode != null ? String(purchase.SupplierCode) : null;
        const matchesById = normalizedSupplierId && purchaseSupplierId === normalizedSupplierId;
        const matchesByCode = normalizedSupplierCode && purchaseSupplierCode === normalizedSupplierCode;
        return Boolean(matchesById || matchesByCode);
      })
      .sort((a, b) => {
        const dateA = new Date(a.datetime || 0).getTime();
        const dateB = new Date(b.datetime || 0).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return (Number(b.id) || 0) - (Number(a.id) || 0);
      });
  }, [purchases, currentSupplierId, currentSupplierCode, isSupplier]);

  const filteredPurchases = useMemo(() => {
    if (!searchId.trim()) return userPurchases;
    return userPurchases.filter((purchase) => String(purchase.id).includes(searchId.trim()));
  }, [userPurchases, searchId]);

  const toggleSale = (saleId) => {
    setExpandedSaleId((prev) => (prev === saleId ? null : saleId));
  };

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
      const resolvedUrl = await resolvePurchaseAttachmentPreviewUrl(attachment);
      if (!resolvedUrl) {
        throw new Error("Arquivo indisponivel");
      }
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

  if (loading) {
    return (
      <main className="pt-28 pb-14 px-6 max-w-4xl mx-auto w-full">
        <section className="rounded-2xl border border-amber-200 bg-white p-8 shadow-sm">
          <p className="text-slate-600">Carregando vendas...</p>
        </section>
      </main>
    );
  }

  if (!isSupplier) {
    return (
      <main className="pt-28 pb-14 px-6 max-w-4xl mx-auto w-full">
        <section className="rounded-2xl border border-amber-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Minhas Vendas</h1>
          <p className="text-slate-600">Esta área está disponível apenas para fornecedores.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="pt-28 pb-14 px-6 max-w-6xl mx-auto w-full">
      <section className="rounded-3xl border border-amber-200/80 bg-white/95 shadow-[0_14px_34px_rgba(30,22,8,0.08)] overflow-hidden">
        <header className="px-8 py-7 bg-gradient-to-r from-[#1e1608] to-[#3a2a10] text-amber-50">
          <h1 className="text-2xl md:text-3xl font-bold">Minhas Vendas</h1>
          {currentSupplier && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <p className="text-sm md:text-base font-semibold text-amber-50">
                {currentSupplier.personType === "PF" ? currentSupplier.name : currentSupplier.companyName}
              </p>
              {currentSupplier.supplierCode && (
                <span className={`text-[11px] px-2 py-1 rounded-md font-semibold ${personTypeBadge[currentSupplier.personType]}`}>
                  {currentSupplier.supplierCode}
                </span>
              )}
              <span className={`text-[11px] px-2 py-1 rounded-md font-semibold ${personTypeBadge[currentSupplier.personType]}`}>
                {currentSupplier.personType}
              </span>
            </div>
          )}
          <p className="text-amber-100/85 text-sm md:text-base mt-2">
            Essas vendas são as mesmas cadastradas em Orders, com exibição dedicada para o fornecedor.
          </p>
        </header>

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SummaryCard label="Total de vendas" value={`${userPurchases.length}`} />
            <SummaryCard
              label="Comprovantes anexados"
              value={`${userPurchases.reduce((sum, purchase) => sum + (purchase.attachmentNames?.length || 0), 0)}`}
            />
          </div>

          <div>
            <input
              type="text"
              placeholder="Pesquisar por ID da venda..."
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            />
          </div>

          {userPurchases.length === 0 ? (
            <div className="rounded-2xl border border-amber-100 bg-amber-50/45 p-8 text-center">
              <p className="text-slate-700 font-medium">Nenhuma venda encontrada para este fornecedor.</p>
            </div>
          ) : filteredPurchases.length === 0 ? (
            <div className="rounded-2xl border border-amber-100 bg-amber-50/45 p-8 text-center">
              <p className="text-slate-700 font-medium">Nenhuma venda encontrada com este ID.</p>
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
                              </div>
                            ) : (
                              <div className="pt-4 border-t border-amber-100">
                                <p className="text-sm font-semibold text-gray-700 mb-3">
                                  Comprovantes e Tickets (0)
                                </p>
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
        </div>
      </section>

      <ErrorModal
        open={errorModal.open}
        title={errorModal.title}
        message={errorModal.message}
        onClose={() => setErrorModal((prev) => ({ ...prev, open: false }))}
      />
    </main>
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
