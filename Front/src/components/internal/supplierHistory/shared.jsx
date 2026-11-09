import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const panelClass = "rounded-2xl border border-amber-100 bg-white shadow-sm";
export const focusClass = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b8891f] focus-visible:ring-offset-2";
export const inputClass = `h-11 w-full rounded-lg border border-amber-200 bg-white px-3 text-sm text-gray-900 ${focusClass}`;
export const money = value => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const number = value => Number(value || 0).toLocaleString("pt-BR", { maximumFractionDigits: 3 });
export const dateTime = value => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
};
export const supplierName = supplier => (supplier.is_pf ?? supplier.personType === "PF")
  ? supplier.name : supplier.company_name || supplier.companyName || supplier.name;

export function ErrorState({ message, retry }) {
  return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
    <p>{message}</p>
    <Button type="button" variant="outline" onClick={retry} className={`mt-3 gap-2 bg-white ${focusClass}`}>
      <RefreshCw className="h-4 w-4" aria-hidden="true" /> Tentar novamente
    </Button>
  </div>;
}

export function Pagination({ page, pages, total, onChange, label = "registros" }) {
  return <nav aria-label={`Paginação de ${label}`} className="flex flex-wrap items-center justify-between gap-3 border-t border-amber-100 px-4 py-3 text-sm">
    <p className="text-gray-600" aria-live="polite">{total} {label} · Página {page} de {pages}</p>
    <div className="flex gap-2">
      <Button type="button" variant="outline" disabled={page <= 1} onClick={() => onChange(page - 1)} className={`gap-1 ${focusClass}`}>
        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Anterior
      </Button>
      <Button type="button" variant="outline" disabled={page >= pages} onClick={() => onChange(page + 1)} className={`gap-1 ${focusClass}`}>
        Próxima <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  </nav>;
}

export function InfoField({ label, value }) {
  return <div className="min-w-0">
    <dt className="text-xs text-gray-500">{label}</dt>
    <dd className="mt-1 break-words text-sm font-medium text-gray-900">{value || "—"}</dd>
  </div>;
}
