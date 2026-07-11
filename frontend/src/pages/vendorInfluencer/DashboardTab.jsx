import { BarChart3, LineChart, Package, Users } from "lucide-react";
import { formatCurrency } from "../../utils/formatCurrency";
import { Metric, numberValue, percentValue, Section, SimpleBars, statusText } from "./VendorInfluencerShared";

function DashboardView({ dashboard = {} }) {
  const widgets = dashboard.widgets || {};
  const charts = dashboard.charts || {};
  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Total Influencers" value={numberValue(widgets.totalInfluencers)} />
        <Metric label="Active Influencers" value={numberValue(widgets.activeInfluencers)} />
        <Metric label="Campaign Revenue" value={formatCurrency(widgets.campaignRevenue || 0)} />
        <Metric label="Campaign Spend" value={formatCurrency(widgets.campaignSpend || 0)} />
        <Metric label="Commission Paid" value={formatCurrency(widgets.commissionPaid || 0)} />
        <Metric label="Pending Commission" value={formatCurrency(widgets.pendingCommissions || 0)} />
        <Metric label="Clicks" value={numberValue(widgets.clicks || 0)} />
        <Metric label="Orders Generated" value={numberValue(widgets.ordersGenerated || widgets.campaignConversions || 0)} />
        <Metric label="Conversions" value={numberValue(widgets.campaignConversions)} />
        <Metric label="Conversion Rate" value={percentValue(widgets.conversionRate || 0)} />
        <Metric label="ROI" value={percentValue(widgets.roi)} />
        <Metric label="Content Queue" value={numberValue(widgets.pendingContentApprovals)} />
        <Metric label="Applications" value={numberValue(widgets.pendingApplications)} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Section title="Campaign Revenue Trend" icon={BarChart3}><SimpleBars rows={charts.campaignRevenueTrend || []} valueKey="revenue" /></Section>
        <Section title="Commission Trend" icon={LineChart}><SimpleBars rows={charts.commissionTrend || []} valueKey="commission" /></Section>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <MiniTable title="Top Influencers" icon={Users} rows={dashboard.topInfluencers || []} columns={["name", "revenue", "orders"]} moneyColumns={["revenue"]} />
        <MiniTable title="Top Products" icon={Package} rows={dashboard.topProducts || []} columns={["name", "revenue", "orders"]} moneyColumns={["revenue"]} />
      </div>
    </div>
  );
}

function MiniTable({ title, icon, rows, columns, moneyColumns = [] }) {
  return (
    <Section title={title} icon={icon}>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-500"><tr>{columns.map((column) => <th key={column} className="px-3 py-2">{statusText(column)}</th>)}</tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id || row.name} className="border-t border-slate-100 dark:border-slate-800">
                {columns.map((column) => <td key={column} className="px-3 py-3 text-slate-700 dark:text-slate-200">{moneyColumns.includes(column) ? formatCurrency(row[column] || 0) : row[column]}</td>)}
              </tr>
            ))}
            {!rows.length ? <tr><td className="px-3 py-6 text-center text-slate-500" colSpan={columns.length}>No data yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

export default DashboardView;
