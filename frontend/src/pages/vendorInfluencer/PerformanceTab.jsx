import { LineChart } from "lucide-react";
import { formatCurrency } from "../../utils/formatCurrency";
import { Metric, numberValue, Pagination, percentValue, ResponsiveTable, Section, StatusBadge } from "./VendorInfluencerShared";

function PerformanceView({ rows, summary = {}, pagination, onPage, onCampaign }) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Creators" value={numberValue(summary.creators || rows.length)} />
        <Metric label="Revenue" value={formatCurrency(summary.revenue || 0)} />
        <Metric label="Commission" value={formatCurrency(summary.commission || 0)} />
        <Metric label="Clicks" value={numberValue(summary.clicks)} />
        <Metric label="Orders" value={numberValue(summary.orders)} />
      </div>
      <Section title="Performance Intelligence" icon={LineChart}>
        <ResponsiveTable
          headers={["Rank", "Creator", "Status", "Category", "Revenue", "Commission", "Orders", "Clicks", "Conversions", "CTR", "ROI", "Engagement", "AOV", "Actions"]}
          rows={rows}
          renderRow={(row) => {
            return (
              <tr key={row.influencerId} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-3 py-3 font-semibold">#{row.rank || "-"}</td>
                <td className="px-3 py-3 font-semibold text-slate-950 dark:text-white">
                  {row.name}
                  <div className="text-xs font-normal text-slate-500">@{row.username}</div>
                </td>
                <td className="px-3 py-3"><StatusBadge value={row.status || "tracked"} /></td>
                <td className="px-3 py-3">{row.category || "-"}</td>
                <td className="px-3 py-3">{formatCurrency(row.revenueGenerated || 0)}</td>
                <td className="px-3 py-3">{formatCurrency(row.commissionPaid || 0)}</td>
                <td className="px-3 py-3">{numberValue(row.ordersGenerated)}</td>
                <td className="px-3 py-3">{numberValue(row.clicks)}</td>
                <td className="px-3 py-3">{numberValue(row.conversions)}</td>
                <td className="px-3 py-3">{percentValue(row.ctr)}</td>
                <td className="px-3 py-3">{percentValue(row.roi)}</td>
                <td className="px-3 py-3">{numberValue(row.engagement)}</td>
                <td className="px-3 py-3">{formatCurrency(row.averageOrderValue || 0)}</td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => onCampaign(row)} className="rounded-lg bg-indigo-600 px-2 py-1 text-xs font-semibold text-white">Campaign</button>
                  </div>
                </td>
              </tr>
            );
          }}
        />
        <Pagination pagination={pagination} onPage={onPage} />
      </Section>
    </div>
  );
}

export default PerformanceView;
