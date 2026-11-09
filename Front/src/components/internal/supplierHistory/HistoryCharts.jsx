import { useEffect, useId, useRef, useState } from "react";
import { focusClass, money, panelClass } from "./shared";

const monthLabel = month => new Date(`${month}-01T12:00:00-03:00`).toLocaleDateString("pt-BR", { month: "short", year: "2-digit", timeZone: "America/Sao_Paulo" });

function Chart({ series, field, title, color }) {
  const id = useId();
  const container = useRef(null);
  const [availableWidth, setAvailableWidth] = useState(280);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) => setAvailableWidth(entry.contentRect.width));
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [series.length]);
  const width = Math.max(280, availableWidth, series.length * 64 + 80);
  const max = Math.max(1, ...series.map(item => item[field]));
  const plotHeight = 155;
  const columnWidth = (width - 85) / Math.max(1, series.length);
  return <section className={`${panelClass} min-w-0 p-5`} aria-labelledby={id}>
    <h3 id={id} className="font-semibold text-gray-900">{title}</h3>
    <p className="mt-1 text-xs text-gray-500">Valor em R$ por mês de registro</p>
    {series.length === 0 ? <p className="flex h-48 items-center justify-center text-sm text-gray-500">Sem registros no período.</p> : <>
      <div ref={container} className={`mt-4 overflow-x-auto ${focusClass}`} role="region" aria-label={`Gráfico: ${title}`} tabIndex={0}>
        <svg role="img" aria-labelledby={`${id}-description`} viewBox={`0 0 ${width} 220`} style={{ width: "100%", minWidth: width, height: 220 }}>
          <title id={`${id}-description`}>{title}. Valores mensais disponíveis na tabela abaixo.</title>
          {[0, 0.5, 1].map(fraction => <g key={fraction}>
            <line x1="65" x2={width - 10} y1={180 - fraction * plotHeight} y2={180 - fraction * plotHeight} stroke="#e5e7eb" />
            <text x="58" y={184 - fraction * plotHeight} textAnchor="end" fontSize="11" fill="#6b7280">{new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(max * fraction)}</text>
          </g>)}
          {series.map((item, index) => {
            const x = 70 + index * columnWidth;
            const height = item[field] / max * plotHeight;
            return <g key={item.month}>
              <rect x={x + columnWidth * 0.2} y={180 - height} width={columnWidth * 0.6} height={height} rx="3" fill={color}>
                <title>{monthLabel(item.month)}: {money(item[field])}</title>
              </rect>
              <text x={x + columnWidth * 0.5} y="202" textAnchor="middle" fontSize="11" fill="#6b7280">{monthLabel(item.month)}</text>
            </g>;
          })}
        </svg>
      </div>
      <details className="mt-2 text-xs text-gray-600">
        <summary className={`w-fit cursor-pointer rounded py-1 hover:text-[#8a6417] ${focusClass}`}>Ver valores do gráfico</summary>
        <div className="mt-2 max-h-48 overflow-auto">
          <table className="w-full text-left"><caption className="sr-only">{title} por mês</caption>
            <thead><tr><th scope="col" className="py-2">Mês</th><th scope="col" className="py-2 text-right">Valor</th></tr></thead>
            <tbody>{series.map(item => <tr key={item.month} className="border-t border-gray-100"><td className="py-2">{monthLabel(item.month)}</td><td className="py-2 text-right tabular-nums">{money(item[field])}</td></tr>)}</tbody>
          </table>
        </div>
      </details>
    </>}
  </section>;
}

export default function HistoryCharts({ series }) {
  return <div className="grid min-w-0 gap-4 xl:grid-cols-2">
    <Chart series={series} field="purchase_value" title="Evolução das compras" color="#b8891f" />
    <Chart series={series} field="advance_value" title="Adiantamentos registrados" color="#0284c7" />
  </div>;
}
