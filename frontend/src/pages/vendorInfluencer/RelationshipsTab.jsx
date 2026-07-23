import { Users } from "lucide-react";
import { formatCurrency } from "../../utils/formatCurrency";
import { influencerRowId, Pagination, percentValue, ResponsiveTable, Section, StatusBadge } from "./VendorInfluencerShared";

function RelationshipsView({ rows, pagination, busyId, onStatus, onInvite, onPage }) {
  return (
    <Section title="Influencer Relationship Management" icon={Users}>
      <ResponsiveTable
        headers={["Influencer", "Status", "Category", "Active Campaigns", "Revenue", "Commission", "Conversion", "Last Activity", "Actions"]}
        rows={rows}
        renderRow={(row) => {
          const influencerId = influencerRowId(row);
          const isBusy = busyId === influencerId || busyId === `invite-${influencerId}`;
          const isActive = row.status === "active" || row.status === "approved";
          const isPaused = row.status === "paused";
          return (
            <tr key={row.id || influencerId} className="border-t border-slate-100 dark:border-slate-800">
              <td className="px-3 py-3 font-semibold text-slate-950 dark:text-white">{row.name}<div className="text-xs font-normal text-slate-500">@{row.username}</div></td>
              <td className="px-3 py-3"><StatusBadge value={row.status} /></td>
              <td className="px-3 py-3">{row.category || "-"}</td>
              <td className="px-3 py-3">{row.activeCampaigns}</td>
              <td className="px-3 py-3">{formatCurrency(row.revenueGenerated || 0)}</td>
              <td className="px-3 py-3">{formatCurrency(row.commissionPaid || 0)}</td>
              <td className="px-3 py-3">{percentValue(row.conversionRate)}</td>
              <td className="px-3 py-3">{row.lastActivity ? new Date(row.lastActivity).toLocaleDateString() : "-"}</td>
              <td className="px-3 py-3">
                <div className="flex flex-wrap gap-2">
                  <button disabled={isBusy} onClick={() => onInvite(row)} className="rounded-lg bg-indigo-600 px-2 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Invite</button>
                  <button disabled={isBusy || isActive} onClick={() => onStatus(row, "active")} className="rounded-lg border border-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-900/50 dark:text-emerald-300">{isActive ? "Active" : "Activate"}</button>
                  <button disabled={isBusy || isPaused} onClick={() => onStatus(row, "paused")} className="rounded-lg border border-amber-200 px-2 py-1 text-xs font-semibold text-amber-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-900/50 dark:text-amber-300">{isPaused ? "Paused" : "Pause"}</button>
                </div>
              </td>
            </tr>
          );
        }}
      />
      <Pagination pagination={pagination} onPage={onPage} />
    </Section>
  );
}

export default RelationshipsView;
