import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Paperclip, Receipt, ShoppingCart, HandCoins } from "lucide-react";
import { Link } from "react-router-dom";
import { resolvePurchaseAttachmentPreviewUrl } from "@/services/ordersData";
import { resolveAdvanceAttachmentPreviewUrl } from "@/services/advancesData";
import { InfoField, Pagination, dateTime, focusClass, money, number, panelClass } from "./shared";

function AttachmentLink({ attachment, kind }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [href, setHref] = useState("");
  const urls = useRef([]);
  useEffect(() => () => { urls.current.forEach(url => URL.revokeObjectURL(url)); }, []);
  const open = async () => {
    // Open during the user's gesture so resolving a protected URL does not trigger popup blocking.
    const tab = window.open("about:blank", "_blank");
    if (tab) tab.opener = null;
    setBusy(true);
    setError("");
    try {
      const resolve = kind === "purchase" ? resolvePurchaseAttachmentPreviewUrl : resolveAdvanceAttachmentPreviewUrl;
      const url = await resolve(attachment);
      if (!/^https?:\/\//i.test(url) && !url.startsWith("blob:")) throw new Error("Não foi possível abrir o comprovante.");
      if (url.startsWith("blob:")) urls.current.push(url);
      setHref(url);
      if (tab) tab.location.href = url;
    } catch (err) {
      tab?.close();
      setError(err.message || "Não foi possível abrir o comprovante. Tente novamente.");
    } finally { setBusy(false); }
  };
  return <li className="min-w-0">
    <button type="button" onClick={open} disabled={busy} className={`inline-flex max-w-full items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-left text-sm text-[#8a6417] hover:bg-amber-50 disabled:opacity-60 ${focusClass}`}>
      <Paperclip className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="break-all">{busy ? "Abrindo…" : attachment.file_name}</span>
    </button>
    {href && <a href={href} target="_blank" rel="noopener noreferrer" className={`ml-2 inline-block rounded p-1 text-xs text-[#8a6417] underline ${focusClass}`}>Abrir comprovante</a>}
    {error && <p role="alert" className="mt-1 text-xs text-red-700">{error}</p>}
  </li>;
}

function Movement({ movement }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const purchase = movement.type === "purchase";
  const Icon = purchase ? ShoppingCart : HandCoins;
  const title = `${purchase ? "Compra" : "Adiantamento"} #${movement.id}`;
  return <article className="border-b border-gray-100 last:border-b-0">
    <button type="button" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(value => !value)}
      className={`grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 p-4 text-left hover:bg-amber-50/40 sm:p-5 ${focusClass}`}>
      <span className={`rounded-xl p-2.5 ${purchase ? "bg-amber-50 text-[#8a6417]" : "bg-sky-50 text-sky-700"}`}><Icon className="h-5 w-5" aria-hidden="true" /></span>
      <span className="grid min-w-0 gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-900">{title}
            {!purchase && <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${movement.status === "pendente" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>{movement.status === "pendente" ? "Pendente" : "Finalizado"}</span>}
          </span>
          <span className="mt-1 block break-words text-xs text-gray-500">{dateTime(movement.datetime)} · {movement.employee_name}</span>
          {purchase && <span className="mt-1 block text-xs text-gray-500">{movement.material_name} · {number(movement.weight)} kg</span>}
        </span>
        <span className="font-semibold tabular-nums text-gray-900 sm:text-right">{money(purchase ? movement.value : movement.value_total)}</span>
      </span>
      <ChevronDown className={`h-4 w-4 text-gray-500 ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
    </button>
    {expanded && <div id={id} className="space-y-4 border-t border-amber-100 bg-amber-50/30 p-5">
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <InfoField label="Funcionário responsável" value={movement.employee_name} />
        <InfoField label="Data e hora" value={dateTime(movement.datetime)} />
        {purchase ? <>
          <InfoField label="Material" value={movement.material_name} />
          <InfoField label="Materiais adicionais" value={(movement.material_types_extra || []).join(", ")} />
          <InfoField label="Peso" value={`${number(movement.weight)} kg`} />
          <InfoField label="Valor por kg" value={money(movement.value_per_kg)} />
          <InfoField label="Impureza" value={`${number(movement.impurity_percentage)}%`} />
          <InfoField label="Valor da compra" value={money(movement.value)} />
          <InfoField label="Abatimento de adiantamentos" value={money(movement.advance_abatement_value)} />
          <InfoField label="Valor aplicado ao saldo" value={money(movement.advance_applied_value)} />
          {!!movement.advance_id && <InfoField label="Adiantamento vinculado" value={`#${movement.advance_id}`} />}
        </> : <>
          <InfoField label="Valor registrado" value={money(movement.value_total)} />
          <InfoField label="Saldo devedor atual do adiantamento" value={money(movement.value_remaining)} />
          <InfoField label="Situação atual" value={movement.status === "pendente" ? "Pendente" : "Finalizado"} />
        </>}
      </dl>
      <div className="border-t border-amber-100 pt-3">
        <p className="mb-2 text-xs font-semibold text-gray-600">Comprovantes</p>
        {movement.attachments?.length ? <ul className="flex flex-wrap gap-2">
          {movement.attachments.map(attachment => <AttachmentLink key={attachment.id} attachment={attachment} kind={movement.type} />)}
        </ul> : <p className="text-sm text-gray-500">Nenhum comprovante anexado.</p>}
      </div>
      {purchase && <Link to={`/orders#${movement.id}`} className={`inline-block rounded text-sm font-semibold text-[#8a6417] underline underline-offset-4 ${focusClass}`}>Abrir compra</Link>}
    </div>}
  </article>;
}

export default function HistoryMovements({ movements, pagination, onPageChange }) {
  return <section className={`${panelClass} overflow-hidden`} aria-labelledby="history-movements-title">
    <div className="flex items-center justify-between border-b border-amber-100 px-5 py-4">
      <h3 id="history-movements-title" className="font-semibold text-gray-900">Histórico de movimentações</h3>
      <span className="text-xs text-gray-500">{pagination.total} registros</span>
    </div>
    {movements.length ? movements.map(movement => <Movement key={`${movement.type}-${movement.id}`} movement={movement} />)
      : <div className="p-10 text-center text-sm text-gray-500"><Receipt className="mx-auto mb-3 h-9 w-9 text-gray-300" aria-hidden="true" /><p>Nenhuma movimentação encontrada.</p><p className="mt-1 text-xs">Se houver filtros ativos, amplie o período ou limpe os filtros.</p></div>}
    <Pagination {...pagination} onChange={onPageChange} label="movimentações" />
  </section>;
}
