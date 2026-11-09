import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { ContactRound, ChevronRight, Search } from "lucide-react";
import { fetchSuppliers } from "@/services/entityData";
import { ErrorState, Pagination, focusClass, inputClass, panelClass, supplierName } from "@/components/internal/supplierHistory/shared";

export default function SupplierHistory() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const search = params.get("q") || "";

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    fetchSuppliers().then(data => { if (active) setSuppliers(data); })
      .catch(err => { if (active) setError(err.message || "Não foi possível carregar os fornecedores."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);

  const filtered = useMemo(() => {
    const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const query = normalize(search.trim());
    return suppliers.filter(item => normalize([
      item.supplierCode, supplierName(item), item.phone, item.email, item.cpf, item.cnpj,
    ].join(" ")).includes(query)).sort((a, b) => supplierName(a).localeCompare(supplierName(b), "pt-BR"));
  }, [suppliers, search]);
  const pages = Math.max(1, Math.ceil(filtered.length / 20));
  const page = Math.min(pages, Math.max(1, Number.parseInt(params.get("page"), 10) || 1));
  const visible = filtered.slice((page - 1) * 20, page * 20);
  const updateSearch = value => {
    const next = new URLSearchParams(params);
    if (value) next.set("q", value); else next.delete("q");
    next.delete("page");
    setParams(next, { replace: true });
  };

  return <div className="min-w-0 space-y-5">
    <p className="text-sm text-gray-600">Selecione um fornecedor para consultar seus dados, compras e adiantamentos.</p>
    <section className={`${panelClass} overflow-hidden`} aria-label="Fornecedores">
      <div className="flex flex-col gap-3 border-b border-amber-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 font-semibold text-gray-900">
          <ContactRound className="h-5 w-5 text-[#8a6417]" aria-hidden="true" /> Fornecedores
          {!loading && !error && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-[#8a6417]">{filtered.length}</span>}
        </div>
        <div className="relative w-full sm:max-w-md">
          <label htmlFor="supplier-history-search" className="sr-only">Buscar fornecedor</label>
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-gray-400" aria-hidden="true" />
          <input id="supplier-history-search" name="q" type="search" autoComplete="off" value={search}
            onChange={event => updateSearch(event.target.value)} placeholder="Nome, código, telefone ou e-mail…" className={`${inputClass} pl-10`} />
        </div>
      </div>
      {loading ? <p role="status" className="p-8 text-center text-gray-500">Carregando fornecedores…</p>
        : error ? <div className="p-5"><ErrorState message={error} retry={() => setAttempt(value => value + 1)} /></div>
          : filtered.length === 0 ? <p className="p-10 text-center text-sm text-gray-500">{search ? "Nenhum fornecedor encontrado. Tente outro nome ou contato." : "Nenhum fornecedor cadastrado."}</p>
            : <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <caption className="sr-only">Fornecedores e contatos. Selecione um nome para abrir o histórico.</caption>
                  <thead className="bg-amber-50/60 text-xs text-gray-600"><tr>
                    {["Código", "Nome / Razão social", "Tipo", "Telefone", "E-mail", ""].map((label, index) => <th key={index} scope="col" className="px-4 py-3 font-semibold">{label}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {visible.map(supplier => {
                      const url = `/supplier-history/${supplier.id}`;
                      const state = { from: location.pathname + location.search };
                      return <tr key={supplier.id} className="relative hover:bg-amber-50/50 focus-within:bg-amber-50/50">
                        <td className="px-4 py-4 tabular-nums text-gray-500">{supplier.supplierCode}</td>
                        <td className="max-w-xs px-4 py-4 font-semibold text-gray-900">
                          <Link to={url} state={state} className={`break-words after:absolute after:inset-0 ${focusClass}`}>{supplierName(supplier)}</Link>
                        </td>
                        <td className="px-4 py-4"><span className={`rounded-md px-2 py-1 text-xs font-semibold ${supplier.personType === "PF" ? "bg-sky-100 text-sky-800" : "bg-amber-100 text-amber-800"}`}>{supplier.personType}</span></td>
                        <td className="whitespace-nowrap px-4 py-4 text-gray-600">{supplier.phone || "—"}</td>
                        <td className="max-w-xs break-words px-4 py-4 text-gray-600">{supplier.email || "—"}</td>
                        <td className="px-4 py-4"><ChevronRight className="h-4 w-4 text-[#8a6417]" aria-hidden="true" /></td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} pages={pages} total={filtered.length} label="fornecedores" onChange={value => {
                const next = new URLSearchParams(params); next.set("page", value); setParams(next);
              }} />
            </>}
    </section>
  </div>;
}
