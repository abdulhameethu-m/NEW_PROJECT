import { FileCheck2 } from "lucide-react";
import { formatCurrency } from "../../utils/formatCurrency";
import { MetricTile, numberValue, Pagination, ResponsiveTable, Section, shortText, StatusBadge, statusText } from "./VendorInfluencerShared";

function ContentView({ rows, pagination, busyId, onPage, onReview, onView }) {
  return (
    <Section title="Content Approvals" icon={FileCheck2}>
      <ResponsiveTable
        headers={["Creator", "Campaign", "Content", "Type", "Metrics", "Submitted", "Status", "Actions"]}
        rows={rows}
        renderRow={(row) => {
          const state = String(row.status || "").toLowerCase();
          const isBusy = busyId === row.id;
          const isApproved = ["approved", "published"].includes(state);
          const isRejected = state === "rejected";
          const isPending = ["uploaded", "pending_review", "under_review", "revision_requested"].includes(state);
          const reviewNote = row.reviewNote || row.latestReview?.comments || "";
          const displayStatus = isRejected ? "Waiting for influencer reupload" : row.status;
          const metrics = row.metrics || {};
          const productNames = (row.products || []).map((product) => product.name).filter(Boolean);
          return (
            <tr key={row.id} className="border-t border-slate-100 align-top dark:border-slate-800">
              <td className="px-3 py-3 font-semibold text-slate-950 dark:text-white">
                {row.creatorName || "Creator"}
                <div className="text-xs font-normal text-slate-500">@{row.creatorUsername || row.creatorEmail || "creator"}</div>
              </td>
              <td className="px-3 py-3">{row.campaign?.title || "-"}</td>
              <td className="max-w-xs px-3 py-3 font-semibold text-slate-950 dark:text-white">
                <span className="block truncate" title={row.title}>{shortText(row.title, 60)}</span>
                <div className="mt-1 text-xs font-normal text-slate-500" title={productNames.join(", ")}>
                  {row.source === "deliverable_execution" ? `Deliverable value: ${formatCurrency(row.totalPrice || 0)}` : productNames.length ? shortText(productNames.join(", "), 58) : "No product tagged"}
                </div>
                {isRejected && reviewNote ? (
                  <div className="mt-2 rounded-lg border border-rose-100 bg-rose-50 px-2 py-1.5 text-xs font-medium leading-5 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
                    <span className="font-semibold">Reason:</span> {reviewNote}
                  </div>
                ) : null}
              </td>
              <td className="px-3 py-3 capitalize">{statusText(row.contentType)}</td>
              <td className="px-3 py-3">
                <div className="grid min-w-32 grid-cols-3 gap-1 text-xs">
                  <MetricTile label="Views" value={numberValue(metrics.views)} />
                  <MetricTile label="Clicks" value={numberValue(metrics.clicks)} />
                  <MetricTile label="Orders" value={numberValue(metrics.orders)} />
                </div>
              </td>
              <td className="px-3 py-3">{row.submittedDate ? new Date(row.submittedDate).toLocaleDateString() : "-"}</td>
              <td className="px-3 py-3">
                <StatusBadge value={displayStatus} />
                {isRejected ? <p className="mt-1 text-xs font-semibold text-rose-600">Waiting for influencer to reupload</p> : null}
              </td>
              <td className="px-3 py-3">
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={!row.url} onClick={() => onView(row)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200">View</button>
                  <button type="button" disabled={isBusy || isApproved || isRejected} onClick={() => onReview(row, "approve")} className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{isApproved ? "Approved" : "Approve"}</button>
                  <button type="button" disabled={isBusy || isRejected || isApproved || !isPending} onClick={() => onReview(row, "reject")} className="rounded-lg bg-rose-600 px-2 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{isRejected ? "Rejected" : "Reject"}</button>
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

export default ContentView;
