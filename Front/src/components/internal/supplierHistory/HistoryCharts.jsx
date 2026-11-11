import MovementLineChart from "./MovementLineChart";

export default function HistoryCharts({ series }) {
  return <div className="grid min-w-0 gap-4 xl:grid-cols-2">
    <MovementLineChart points={series?.sales || []} kind="sale" title="Vendas do fornecedor" color="#b8891f" />
    <MovementLineChart points={series?.advances || []} kind="advance" title="Adiantamentos registrados" color="#0284c7" />
  </div>;
}
