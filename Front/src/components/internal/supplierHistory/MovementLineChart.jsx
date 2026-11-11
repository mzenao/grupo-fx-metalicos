import { useEffect, useId, useRef, useState } from "react";
import { dateTime, focusClass, money, panelClass } from "./shared";

const axisMoney = value => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }).format(value);
const shortDate = value => new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });

function RecordChart({ points, kind, title, color }) {
  const id = useId();
  const container = useRef(null);
  const [width, setWidth] = useState(420);
  const [selected, setSelected] = useState(null);
  const sale = kind === "sale";
  const label = sale ? "Venda" : "Adiantamento";
  const chartLabel = sale ? "Gráfico de vendas" : "Gráfico de adiantamentos";
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, entry.contentRect.width)));
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  const left = 65;
  const right = width - 20;
  const top = 20;
  const bottom = 218;
  const maximum = Math.max(1, ...points.map(point => point.value)) * 1.1;
  const x = index => points.length > 1 ? left + index * (right - left) / (points.length - 1) : (left + right) / 2;
  const y = point => bottom - point.value / maximum * (bottom - top);
  const active = selected === null ? null : points[selected];
  const path = points.map((point, index) => `${index ? "L" : "M"}${x(index)},${y(point)}`).join(" ");
  const last = points.length - 1;
  const ticks = [...new Set([0, Math.floor(last / 2), last])].filter(index => index >= 0 &&
    (index === 0 || index === last || (x(index) - x(0) >= 55 && x(last) - x(index) >= 55)));

  const selectAtPointer = event => {
    const rect = event.currentTarget.getBoundingClientRect();
    const cursor = (event.clientX - rect.left) / rect.width * width;
    const index = points.length > 1 ? Math.round((cursor - left) / (right - left) * last) : 0;
    setSelected(Math.max(0, Math.min(last, index)));
  };
  const navigate = event => {
    const current = selected ?? last;
    const targets = { ArrowLeft: Math.max(0, current - 1), ArrowRight: Math.min(last, current + 1), Home: 0, End: last };
    if (!(event.key in targets)) return;
    event.preventDefault();
    setSelected(targets[event.key]);
  };

  return <section className={`${panelClass} min-w-0 p-5`} aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`} className="font-semibold text-gray-900">{title}</h3>
    <p className="mt-1 text-xs text-gray-500">Cada ponto representa {sale ? "uma venda" : "um adiantamento"}, em ordem cronológica.</p>
    {points.length === 0 ? <p className="flex h-64 items-center justify-center text-sm text-gray-500">Sem registros no período.</p> : <>
      <div ref={container} role="group" aria-label={chartLabel} tabIndex={0} aria-describedby={`${id}-hint${active ? ` ${id}-tooltip` : ""}`}
        onKeyDown={navigate} onFocus={() => setSelected(current => current ?? last)} onBlur={() => setSelected(null)}
        className={`relative mt-4 min-w-0 rounded-lg ${focusClass}`}>
        <svg viewBox={`0 0 ${width} 265`} className="block w-full touch-pan-y" role="img" aria-labelledby={`${id}-description`}
          onPointerMove={event => { if (event.pointerType === "mouse") selectAtPointer(event); }} onPointerDown={selectAtPointer}
          onPointerLeave={event => { if (event.pointerType === "mouse") setSelected(null); }}>
          <title id={`${id}-description`}>{title}. Um ponto por registro; o eixo vertical mostra o valor em reais. Detalhes disponíveis ao selecionar um ponto e na tabela abaixo.</title>
          {[0, 0.25, 0.5, 0.75, 1].map(fraction => <g key={fraction}>
            <line x1={left} x2={right} y1={bottom - fraction * (bottom - top)} y2={bottom - fraction * (bottom - top)} stroke="#e5e7eb" strokeDasharray="3 4" />
            <text x={left - 8} y={bottom - fraction * (bottom - top) + 4} textAnchor="end" fontSize="10" fill="#6b7280">{axisMoney(maximum * fraction)}</text>
          </g>)}
          <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {active && <line x1={x(selected)} x2={x(selected)} y1={top} y2={bottom} stroke="#9ca3af" strokeDasharray="3 3" />}
          {points.map((point, index) => <circle key={point.id} data-record-id={point.id} cx={x(index)} cy={y(point)} r={selected === index ? 5 : 3.5} fill={color} stroke="white" strokeWidth="1.5" />)}
          {ticks.map(index => <text key={index} x={x(index)} y="243" textAnchor="middle" fontSize="10" fill="#6b7280">{shortDate(points[index].datetime)}</text>)}
        </svg>
        {active && <div id={`${id}-tooltip`} role="tooltip" aria-live="polite" aria-atomic="true" className="pointer-events-none absolute z-10 w-48 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs shadow-lg"
          style={{ left: Math.max(0, Math.min(width - 192, x(selected) - 96)), top: Math.max(0, y(active) - 100) }}>
          <p className="font-semibold text-gray-900">{label} #{active.id}</p>
          <p className="mt-1 text-gray-500">{dateTime(active.datetime)}</p>
          <p className="mt-2 font-semibold text-gray-900">Valor: {money(active.value)}</p>
          {sale && <p className="mt-1 text-[#8a6417]">Sucata: {money(active.value_per_kg)}/kg</p>}
        </div>}
      </div>
      <p id={`${id}-hint`} className="mt-1 text-xs text-gray-500">Passe o cursor ou toque em um ponto para ver os detalhes. Pelo teclado, use as setas.</p>
      <details className="mt-3 text-xs text-gray-600">
        <summary className={`w-fit cursor-pointer rounded py-1 hover:text-[#8a6417] ${focusClass}`}>Ver valores do gráfico</summary>
        <div className="mt-2 max-h-52 overflow-auto">
          <table className="w-full min-w-[360px] text-left">
            <caption className="sr-only">{title}: valores por registro</caption>
            <thead><tr><th scope="col" className="py-2">Registro / Data</th><th scope="col" className="py-2 text-right">Valor</th>{sale && <th scope="col" className="py-2 text-right">Preço do kg</th>}</tr></thead>
            <tbody>{points.map(point => <tr key={point.id} className="border-t border-gray-100 tabular-nums"><td className="py-2">#{point.id} · {dateTime(point.datetime)}</td><td className="py-2 text-right">{money(point.value)}</td>{sale && <td className="py-2 text-right">{money(point.value_per_kg)}/kg</td>}</tr>)}</tbody>
          </table>
        </div>
      </details>
    </>}
  </section>;
}

export default function MovementLineChart(props) {
  // Reset point selection when a filtered dataset is replaced.
  const key = props.points.map(point => point.id).join(",");
  return <RecordChart key={key} {...props} />;
}
