import { useEffect, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Phone, Mail, ShoppingCart, Scale, HandCoins, Wallet } from "lucide-react";
import { fetchSupplierHistory } from "@/services/supplierHistoryData";
import SupplierProfile from "@/components/internal/supplierHistory/SupplierProfile";
import HistoryFilters from "@/components/internal/supplierHistory/HistoryFilters";
import HistoryCharts from "@/components/internal/supplierHistory/HistoryCharts";
import HistoryMovements from "@/components/internal/supplierHistory/HistoryMovements";
import { ErrorState, focusClass, money, number, panelClass, supplierName } from "@/components/internal/supplierHistory/shared";

function Metric({ title, value, subtitle, icon: Icon }) {
  return <div className={`${panelClass} flex min-w-0 items-start justify-between gap-3 p-4`}>
    <div className="min-w-0"><p className="text-sm text-gray-500">{title}</p><p className="mt-1 break-words text-xl font-bold tabular-nums text-gray-900">{value}</p><p className="mt-1 text-xs text-gray-500">{subtitle}</p></div>
    <span className="rounded-xl bg-amber-50 p-2.5 text-[#8a6417]"><Icon className="h-5 w-5" aria-hidden="true" /></span>
  </div>;
}

export default function SupplierHistoryDetail() {
  const { supplierId } = useParams();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const query = params.toString();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const returnTo = location.state?.from?.startsWith("/supplier-history?") ? location.state.from : "/supplier-history";

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError("");
    fetchSupplierHistory(supplierId, query, controller.signal)
      .then(result => { if (active) setData(result); })
      .catch(err => { if (active && err.name !== "AbortError") setError(err.message === "Resource not found" ? "Fornecedor não encontrado. Volte à listagem e selecione outro cadastro." : err.message || "Não foi possível carregar o histórico."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [supplierId, query, attempt]);
  const changeFilters = next => setParams(next, { state: { from: returnTo } });

  return <div className="min-w-0 space-y-5">
    <Link to={returnTo} className={`inline-flex items-center gap-2 rounded text-sm font-semibold text-[#8a6417] hover:underline ${focusClass}`}><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Voltar aos fornecedores</Link>
    {data && data.supplier.id === Number(supplierId) && !error && <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><h2 className="break-words text-xl font-bold text-gray-900">{supplierName(data.supplier)}</h2>
                <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">{data.supplier.supplier_code} · {data.supplier.is_pf ? "PF" : "PJ"}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-600">
                <span className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0" aria-hidden="true" />{data.supplier.phone || "Telefone não informado"}</span>
                <span className="flex min-w-0 items-center gap-2"><Mail className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="break-all">{data.supplier.email || "E-mail não informado"}</span></span>
              </div>
            </div>
          </div>
          <SupplierProfile supplier={data.supplier} />
    </>}
    <HistoryFilters query={query} onChange={changeFilters} loading={loading} />
    {loading ? <p role="status" className="py-10 text-center text-sm text-gray-500">Carregando histórico do fornecedor…</p>
      : error ? <ErrorState message={error} retry={() => setAttempt(value => value + 1)} />
        : data && <>
          <div className={`${panelClass} flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between`}>
            <div><h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900"><Wallet className="h-4 w-4 text-[#8a6417]" aria-hidden="true" /> Saldos atuais</h3><p className="mt-1 text-xs text-gray-500">Independentes do período e dos filtros.</p></div>
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              <div><p className="text-xs text-gray-500">Saldo positivo</p><p className="mt-1 text-lg font-bold tabular-nums text-emerald-700">{money(data.balances.positive)}</p></div>
              <div><p className="text-xs text-gray-500">Saldo devedor</p><p className="mt-1 text-lg font-bold tabular-nums text-red-700">{money(data.balances.negative)}</p></div>
            </div>
          </div>
          <section aria-labelledby="filtered-summary-title" className="space-y-3">
            <h3 id="filtered-summary-title" className="text-sm font-semibold text-gray-700">Resumo das movimentações filtradas</h3>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric title="Compras" value={money(data.summary.purchase_value)} subtitle={`${data.summary.purchase_count} compras registradas`} icon={ShoppingCart} />
              <Metric title="Peso recebido" value={`${number(data.summary.weight)} kg`} subtitle="Peso total das compras" icon={Scale} />
              <Metric title="Adiantamentos" value={money(data.summary.advance_value)} subtitle={`${data.summary.advance_count} adiantamentos registrados`} icon={HandCoins} />
              <Metric title="Abatimentos" value={money(data.summary.abatement_value)} subtitle="Vinculados às compras do filtro" icon={Wallet} />
            </div>
          </section>
          <HistoryCharts series={data.chart_series} />
          <HistoryMovements key={`${supplierId}-${query}`} movements={data.movements} pagination={data.pagination} onPageChange={page => {
            const next = new URLSearchParams(params); next.set("page", page); changeFilters(next);
          }} />
        </>}
  </div>;
}
