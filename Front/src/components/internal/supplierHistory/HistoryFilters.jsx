import { useRef, useState } from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { focusClass, inputClass, panelClass } from "./shared";

function readFilters(query) {
  const params = new URLSearchParams(query);
  return { start: params.get("start") || "", end: params.get("end") || "", type: params.get("type") || "all", status: params.get("status") || "all" };
}

export default function HistoryFilters({ query, onChange, loading }) {
  const [draft, setDraft] = useState(() => readFilters(query));
  const [error, setError] = useState("");
  const [changing, setChanging] = useState(false);
  const startInput = useRef(null);
  const [previousQuery, setPreviousQuery] = useState(query);
  // Synchronize before rendering new controls; a delayed effect can erase a user's next edit.
  if (previousQuery !== query) {
    setPreviousQuery(query);
    setDraft(readFilters(query));
    setError("");
    setChanging(false);
  }
  const busy = loading || changing;
  const navigateFilters = next => {
    setChanging(next.toString() !== query);
    onChange(next);
  };
  const change = (field, value) => { setDraft(current => ({ ...current, [field]: value })); setError(""); };
  const apply = event => {
    event.preventDefault();
    if (draft.start && draft.end && draft.start > draft.end) {
      setError("A data inicial não pode ser posterior à data final.");
      startInput.current?.focus();
      return;
    }
    const next = new URLSearchParams();
    const values = new FormData(event.currentTarget);
    for (const key of ["start", "end", "type", "status"]) {
      const value = values.get(key);
      if (value && value !== "all") next.set(key, value);
    }
    navigateFilters(next);
  };
  return <form onSubmit={apply} className={`${panelClass} space-y-4 p-5`} aria-label="Filtros do histórico">
    <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900"><Filter className="h-4 w-4 text-[#8a6417]" aria-hidden="true" /> Filtrar movimentações</h3>
    <fieldset disabled={busy} className="grid gap-4 disabled:opacity-70 sm:grid-cols-2 xl:grid-cols-4">
      <label className="space-y-1.5 text-sm text-gray-700"><span>Data de início</span>
        <input ref={startInput} type="date" name="start" autoComplete="off" value={draft.start} onChange={event => change("start", event.target.value)} aria-invalid={!!error} aria-describedby={error ? "period-error" : undefined} className={inputClass} />
      </label>
      <label className="space-y-1.5 text-sm text-gray-700"><span>Data de fim</span>
        <input type="date" name="end" autoComplete="off" value={draft.end} onChange={event => change("end", event.target.value)} className={inputClass} />
      </label>
      <label className="space-y-1.5 text-sm text-gray-700"><span>Tipo de movimentação</span>
        <select name="type" value={draft.type} onChange={event => change("type", event.target.value)} className={inputClass}>
          <option value="all">Todas as movimentações</option><option value="purchase">Compras</option><option value="advance">Adiantamentos</option>
        </select>
      </label>
      <label className="space-y-1.5 text-sm text-gray-700"><span>Situação dos adiantamentos</span>
        <select name="status" value={draft.status} onChange={event => change("status", event.target.value)} disabled={draft.type === "purchase"} className={`${inputClass} disabled:bg-gray-50 disabled:text-gray-400`}>
          <option value="all">Todas as situações</option><option value="pendente">Pendentes</option><option value="finalizado">Finalizados</option>
        </select>
      </label>
    </fieldset>
    {error && <p role="alert" id="period-error" className="text-sm text-red-700">{error}</p>}
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-gray-500">Sem datas, todo o histórico é exibido. A situação dos adiantamentos é a atual.</p>
      <div className="flex shrink-0 gap-2">
        <Button type="button" variant="outline" onClick={() => {
          setDraft(readFilters(""));
          setError("");
          navigateFilters(new URLSearchParams());
        }} className={focusClass}>Limpar filtros</Button>
        <Button type="submit" disabled={busy} className={focusClass}>Aplicar filtros</Button>
      </div>
    </div>
  </form>;
}
