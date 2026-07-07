import { lazy, Suspense, useState } from "react";
import { AlertTriangle, BarChart3, Calculator, CheckCircle2, Copy, ExternalLink, Eye, Pencil, Link as LinkIcon, Package, Percent, Power, PowerOff, RefreshCw, Search, Settings, ShieldCheck, SlidersHorizontal, Users, WalletCards, XCircle, Trash2 } from "lucide-react";
import { getAdminAffiliateLinkDetails, updateAdminInfluencerCommerceCampaign, updateAdminAffiliateLinkStatus, updateAdminInfluencerWithdrawal, updateAdminInfluencerSettings } from "../../services/adminInfluencerCommerceService";
import { formatCurrency } from "../../utils/formatCurrency";
import CampaignEscrowService from "../../services/campaignEscrowService";
import { ActionButton, campaignActionState, dateValue, FieldShell, idOf, Metric, numberValue, Pagination, percentValue, pickUserName, pickVendorName, ResponsiveTable, Section, shortText, SimpleBars, StatusBadge, statusText, text, unwrap } from "./AdminInfluencerCommerceShared";

const ConfigurationEngineView = lazy(() => import("./AdminInfluencerCommerceConfigurationView"));

function DashboardView({ data }) {
  const metrics = data.metrics || data.kpis || {};
  const charts = data.charts || {};
  const widgets = data.widgets || {};
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Metric label="Total Influencers" value={numberValue(metrics.totalInfluencers)} />
        <Metric label="Active Influencers" value={numberValue(metrics.activeInfluencers)} />
        <Metric label="Total Vendors" value={numberValue(metrics.totalVendors)} />
        <Metric label="Active Campaigns" value={numberValue(metrics.activeCampaigns)} />
        <Metric label="Campaign Revenue" value={formatCurrency(metrics.campaignRevenue || 0)} />
        <Metric label="Subscription Revenue" value={formatCurrency(metrics.totalSubscriptionRevenue || 0)} />
        <Metric label="Monthly Subs Revenue" value={formatCurrency(metrics.monthlySubscriptionRevenue || 0)} />
        <Metric label="Active Subscribers" value={numberValue(metrics.activeSubscribers)} />
        <Metric label="Failed Sub Payments" value={numberValue(metrics.failedSubscriptionPayments)} />
        <Metric label="Upgrade Revenue" value={formatCurrency(metrics.upgradeRevenue || 0)} />
        <Metric label="Downgrade Requests" value={numberValue(metrics.downgradeRequests)} />
        <Metric label="Credit Wallet Balance" value={formatCurrency(metrics.subscriptionCreditBalance || 0)} />
        <Metric label="Commission Paid" value={formatCurrency(metrics.commissionPaid || 0)} />
        <Metric label="Escrow Balance" value={formatCurrency(metrics.escrowBalance || 0)} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Section title="Revenue Trend" icon={BarChart3}><SimpleBars rows={charts.revenueTrend || []} valueKey="revenue" /></Section>
        <Section title="Commission Trend" icon={BarChart3}><SimpleBars rows={charts.commissionTrend || charts.revenueTrend || []} valueKey="commission" /></Section>
      </div>
      <div className="grid gap-4 xl:grid-cols-4">
        <MiniList title="Recent Campaigns" rows={widgets.recentCampaigns} label={(row) => row.title} value={(row) => <StatusBadge value={row.status || row.state} />} />
        <MiniList title="Top Influencers" rows={widgets.topInfluencers} label={pickUserName} value={(row) => formatCurrency(row.revenue || row.totalRevenue || 0)} />
        <MiniList title="Top Vendors" rows={widgets.topVendors} label={pickVendorName} value={(row) => formatCurrency(row.revenue || row.campaignRevenue || 0)} />
        <MiniList title="Recent Subscriptions" rows={widgets.recentSubscriptionPayments} label={(row) => pickVendorName(row.vendorId || row.vendor)} value={(row) => formatCurrency(row.amount || 0)} />
      </div>
    </div>
  );
}

function RevenueDashboardView({ data, setFilters }) {
  const kpis = data.kpis || {};
  const selectedPaymentModel = data.selectedPaymentModel || "all";
  const modelRows = data.modelBreakdown || [];
  const sourceRows = data.sourceBreakdown || [];
  const campaignRows = data.campaignWiseRevenue || [];
  const feeCards = data.feeCards || [];
  const feeRows = data.feeTableRows || [];
  const paymentModels = [
    { key: "all", label: "All Models" },
    { key: "fixed", label: "Fixed Payment" },
    { key: "commission", label: "Commission" },
    { key: "hybrid", label: "Hybrid" },
    { key: "free_product", label: "Free Product" },
  ];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {paymentModels.map((option) => {
          const active = selectedPaymentModel === option.key;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => setFilters((current) => ({ ...current, paymentModel: option.key, page: 1 }))}
              className={`h-10 rounded-xl px-4 text-sm font-semibold transition ${active ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"}`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Metric label="Total Platform Revenue" value={formatCurrency(kpis.totalPlatformRevenue || 0)} hint="All selected-model fee revenue" />
        <Metric label="Fixed Payment Revenue" value={formatCurrency(kpis.fixedPaymentRevenue || 0)} hint="Fixed funding platform fees" />
        <Metric label="Commission Revenue" value={formatCurrency(kpis.commissionRevenue || 0)} hint="Order commission platform fees" />
        <Metric label="Hybrid Revenue" value={formatCurrency(kpis.hybridRevenue || 0)} hint="Fixed fee + commission fee" />
        <Metric label="Free Product Revenue" value={formatCurrency(kpis.freeProductRevenue || 0)} hint="Usually zero unless configured" />
        <Metric label="Today" value={formatCurrency(kpis.todaysRevenue || 0)} />
        <Metric label="This Month" value={formatCurrency(kpis.monthlyRevenue || 0)} />
        <Metric label="Period Revenue" value={formatCurrency(kpis.periodRevenue || 0)} />
        <Metric label="Gross Sales Tracked" value={formatCurrency(kpis.grossRevenue || 0)} />
        <Metric label="Influencer Payouts" value={formatCurrency(kpis.influencerPayout || 0)} />
      </div>

      <Section title="Collected Extra Fees" icon={WalletCards}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {feeCards.length ? feeCards.map((row) => (
            <Metric key={row.id} label={row.label} value={formatCurrency(row.amount || 0)} hint={`${statusText(row.feeCode || row.source)} · ${row.paymentModelLabel || "Selected model"}`} />
          )) : <p className="text-sm text-slate-500 dark:text-slate-400">No fee collections found for this payment model and date range.</p>}
        </div>
      </Section>

      <div className="grid gap-4 xl:grid-cols-2">
        <Section title="Fee Source Reconciliation" icon={Calculator}>
          <ResponsiveTable headers={["Source", "What It Counts", "Revenue"]} rows={sourceRows} renderRow={(row) => (
            <tr key={row.source}>
              <td className="px-3 py-3 font-mono text-xs text-slate-700 dark:text-slate-200">{row.source}</td>
              <td className="px-3 py-3 text-slate-500 dark:text-slate-400">{row.description}</td>
              <td className="px-3 py-3 font-semibold text-slate-900 dark:text-white">{formatCurrency(row.amount || 0)}</td>
            </tr>
          )} />
        </Section>

        <Section title="Payment Model Breakdown" icon={Percent}>
          <ResponsiveTable headers={["Payment Model", "Fixed Fee Source", "Commission Source", "Total", "Campaigns", "Transactions"]} rows={modelRows} renderRow={(row) => (
            <tr key={row.model}>
              <td className="px-3 py-3 font-medium text-slate-900 dark:text-white">{row.label}</td>
              <td className="px-3 py-3">{formatCurrency(row.fixedFeeRevenue || 0)}</td>
              <td className="px-3 py-3">{formatCurrency(row.commissionFeeRevenue || 0)}</td>
              <td className="px-3 py-3 font-semibold text-slate-900 dark:text-white">{formatCurrency(row.totalPlatformRevenue || 0)}</td>
              <td className="px-3 py-3">{numberValue(row.campaignCount)}</td>
              <td className="px-3 py-3">{numberValue(row.transactionCount)}</td>
            </tr>
          )} />
        </Section>
      </div>

      <Section title="Campaign-Wise Revenue" icon={BarChart3}>
        <ResponsiveTable headers={["Campaign", "Vendor", "Model", "Fixed Fee", "Commission Fee", "Total Fee", "Budget", "Gross Sales", "Status", "Created"]} rows={campaignRows} renderRow={(row) => (
          <tr key={row.id || row.campaignId}>
            <td className="px-3 py-3">
              <div className="font-medium text-slate-900 dark:text-white" title={text(row.campaignName)}>{shortText(row.campaignName, 36)}</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{numberValue(row.transactionCount + row.commissionRecordCount)} fee records</div>
            </td>
            <td className="px-3 py-3 text-slate-500 dark:text-slate-400">{text(row.vendor)}</td>
            <td className="px-3 py-3"><StatusBadge value={row.paymentModelLabel || row.paymentModel} /></td>
            <td className="px-3 py-3">{formatCurrency(row.fixedFeeRevenue || 0)}</td>
            <td className="px-3 py-3">{formatCurrency(row.commissionFeeRevenue || 0)}</td>
            <td className="px-3 py-3 font-semibold text-slate-900 dark:text-white">{formatCurrency(row.totalPlatformRevenue || 0)}</td>
            <td className="px-3 py-3">{formatCurrency(row.campaignBudget || 0)}</td>
            <td className="px-3 py-3">{formatCurrency(row.grossRevenue || 0)}</td>
            <td className="px-3 py-3"><StatusBadge value={row.campaignStatus || "active"} /></td>
            <td className="px-3 py-3 text-slate-500 dark:text-slate-400">{dateValue(row.createdDate)}</td>
          </tr>
        )} />
      </Section>

      <Section title="Collected Fee Table" icon={Calculator}>
        <ResponsiveTable headers={["Fee", "Model", "Code", "Type", "Rate", "Fixed", "Base", "Collected", "Campaigns", "Source"]} rows={feeRows} renderRow={(row) => (
          <tr key={row.id}>
            <td className="px-3 py-3 font-medium text-slate-900 dark:text-white">{text(row.feeName)}</td>
            <td className="px-3 py-3"><StatusBadge value={row.paymentModelLabel || row.paymentModel} /></td>
            <td className="px-3 py-3 font-mono text-xs text-slate-500">{text(row.feeCode)}</td>
            <td className="px-3 py-3"><StatusBadge value={row.feeType || "configured"} /></td>
            <td className="px-3 py-3">{Number(row.percentageValue || 0)}%</td>
            <td className="px-3 py-3">{formatCurrency(row.fixedValue || 0)}</td>
            <td className="px-3 py-3">{formatCurrency(row.baseAmount || 0)}</td>
            <td className="px-3 py-3 font-semibold text-slate-900 dark:text-white">{formatCurrency(row.amount || 0)}</td>
            <td className="px-3 py-3">{numberValue(row.campaignCount)}</td>
            <td className="px-3 py-3 text-slate-500 dark:text-slate-400">{text(row.source)}</td>
          </tr>
        )} />
      </Section>
    </div>
  );
}

function MiniList({ title, rows = [], label, value }) {
  return (
    <Section title={title} icon={SlidersHorizontal}>
      <div className="space-y-2">
        {rows?.length ? rows.slice(0, 6).map((row, index) => (
          <div key={idOf(row) || index} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-950">
            <span className="min-w-0 truncate font-medium text-slate-700 dark:text-slate-200">{label(row)}</span>
            <span className="shrink-0 text-slate-500 dark:text-slate-400">{value(row)}</span>
          </div>
        )) : <p className="text-sm text-slate-500 dark:text-slate-400">No records yet.</p>}
      </div>
    </Section>
  );
}

function InfluencersView({ items, pagination, setFilters }) {
  return (
    <Section title="Influencer Management" icon={Users}>
      <ResponsiveTable headers={["Influencer", "Email", "Category", "Followers", "Engagement", "Conversion", "Revenue", "Commission", "KYC", "Status"]} rows={items} renderRow={(row) => (
        <tr key={idOf(row)}>
          <td className="px-3 py-3 font-medium text-slate-900 dark:text-white">{pickUserName(row)}</td>
          <td className="px-3 py-3 text-slate-500">{text(row.email || row.userId?.email)}</td>
          <td className="px-3 py-3 text-slate-500">{text(row.category || row.niche)}</td>
          <td className="px-3 py-3">{numberValue(row.followers || row.totalFollowers)}</td>
          <td className="px-3 py-3">{percentValue(row.engagementRate)}</td>
          <td className="px-3 py-3">{percentValue(row.conversionRate)}</td>
          <td className="px-3 py-3">{formatCurrency(row.revenueGenerated || row.revenue || 0)}</td>
          <td className="px-3 py-3">{formatCurrency(row.commissionEarned || row.commission || 0)}</td>
          <td className="px-3 py-3"><StatusBadge value={row.kycStatus || row.verificationStatus} /></td>
          <td className="px-3 py-3"><StatusBadge value={row.accountStatus || row.status} /></td>
        </tr>
      )} />
      <Pagination pagination={pagination} setFilters={setFilters} />
    </Section>
  );
}

function VendorsView({ items, pagination, setFilters }) {
  return (
    <Section title="Vendor Commerce Oversight" icon={Users}>
      <ResponsiveTable headers={["Vendor", "Active Campaigns", "Influencers", "Revenue", "Commission Liability", "Escrow Usage", "Pending Settlements", "Fraud Flags", "Status"]} rows={items} renderRow={(row) => (
        <tr key={idOf(row)}>
          <td className="px-3 py-3 font-medium text-slate-900 dark:text-white">{pickVendorName(row)}</td>
          <td className="px-3 py-3">{numberValue(row.activeCampaigns)}</td>
          <td className="px-3 py-3">{numberValue(row.influencersConnected)}</td>
          <td className="px-3 py-3">{formatCurrency(row.campaignRevenue || 0)}</td>
          <td className="px-3 py-3">{formatCurrency(row.commissionLiability || 0)}</td>
          <td className="px-3 py-3">{formatCurrency(row.escrowUsage || 0)}</td>
          <td className="px-3 py-3">{numberValue(row.pendingSettlements)}</td>
          <td className="px-3 py-3">{numberValue(row.fraudFlags)}</td>
          <td className="px-3 py-3"><StatusBadge value={row.status} /></td>
        </tr>
      )} />
      <Pagination pagination={pagination} setFilters={setFilters} />
    </Section>
  );
}

function CampaignsView({ items, pagination, setFilters, runAction, busyId, confirmAdminAction }) {
  return (
    <Section title="Campaign Center" icon={BarChart3}>
      <ResponsiveTable headers={["Campaign", "Vendor", "Budget", "Revenue", "Applications", "Creators", "Products", "Commission", "Status", "Actions"]} rows={items} renderRow={(row) => {
        const id = idOf(row);
        const actions = campaignActionState(row);
        const pricing = row.pricing || row.paymentModel?.pricing || {};
        const paymentLabel = row.paymentModel?.label || statusText(row.paymentType || row.paymentModel?.type);
        const attributionDays = row.attributionRule?.attributionDays || row.attributionWindowDays;
        const budgetValue = pricing.totalBudget || row.budget || row.fixedFee || 0;
        return (
          <tr key={id}>
            <td className="px-3 py-3 font-medium text-slate-900 dark:text-white">{text(row.title)}<div className="text-xs font-normal capitalize text-slate-500">{paymentLabel || "-"}</div></td>
            <td className="px-3 py-3 text-slate-500">{pickVendorName(row.vendorId || row.vendor)}</td>
            <td className="px-3 py-3">{formatCurrency(budgetValue)}{attributionDays ? <div className="text-xs text-slate-500">{attributionDays} day attribution</div> : null}</td>
            <td className="px-3 py-3">{formatCurrency(row.revenue || 0)}</td>
            <td className="px-3 py-3">{numberValue(row.applicationsCount || row.applications?.length)}</td>
            <td className="px-3 py-3">{numberValue(row.approvedCreators || row.approvedInfluencers?.length)}</td>
            <td className="px-3 py-3">{numberValue(row.products?.length || row.productIds?.length)}</td>
            <td className="px-3 py-3">{percentValue(row.commissionPercent || row.commissionRate)}</td>
            <td className="px-3 py-3"><StatusBadge value={row.status || row.state} /></td>
            <td className="px-3 py-3">
              <div className="flex flex-wrap gap-2">
                <ActionButton
                  tone={actions.cancelled ? "slate" : "amber"}
                  disabled={busyId === `cancel-${id}`}
                  onClick={async () => {
                    if (!actions.cancelled && !(await confirmAdminAction({
                      title: "Cancel campaign",
                      message: `Cancel "${text(row.title)}"? Vendors and influencers may lose active campaign access.`,
                      tone: "danger",
                      confirmLabel: "Cancel Campaign",
                    }))) return;
                    return runAction(
                      `cancel-${id}`,
                      () => updateAdminInfluencerCommerceCampaign(id, { action: actions.cancelled ? "activate" : "pause" }),
                      actions.cancelled ? "Campaign reactivated." : "Campaign cancelled.",
                    );
                  }}
                >
                  {actions.cancelled ? "Cancelled" : "Cancel"}
                </ActionButton>
                <ActionButton
                  tone="slate"
                  disabled={busyId === `publish-${id}`}
                  onClick={() => runAction(
                    `publish-${id}`,
                    () => updateAdminInfluencerCommerceCampaign(id, { action: actions.published ? "unfeature" : "feature" }),
                    actions.published ? "Campaign unpublished." : "Campaign published."
                  )}
                >
                  {actions.published ? "Published" : "Publish"}
                </ActionButton>
                <ActionButton
                  tone={actions.completed ? "slate" : "red"}
                  disabled={busyId === `complete-${id}`}
                  onClick={async () => {
                    if (!actions.completed && !(await confirmAdminAction({
                      title: "Complete campaign",
                      message: `Close "${text(row.title)}" as completed? This can affect campaign settlement and reporting.`,
                      tone: "danger",
                      confirmLabel: "Complete Campaign",
                    }))) return;
                    return runAction(
                      `complete-${id}`,
                      () => updateAdminInfluencerCommerceCampaign(id, { action: actions.completed ? "activate" : "close" }),
                      actions.completed ? "Campaign reactivated." : "Campaign completed.",
                    );
                  }}
                >
                  {actions.completed ? "Completed" : "Complete"}
                </ActionButton>
              </div>
            </td>
          </tr>
        );
      }} />
      <Pagination pagination={pagination} setFilters={setFilters} />
    </Section>
  );
}

function MatchingView({ data }) {
  const rows = data.matches || [];
  return (
    <Section title="Influencer-Vendor Matching" icon={Search}>
      <ResponsiveTable headers={["Match", "Category Fit", "Engagement", "Conversion", "Revenue", "Fraud Risk", "Location", "Language"]} rows={rows} renderRow={(row, index) => {
        const vendorId = idOf(row.vendorId || row.vendor);
        const influencerId = idOf(row.influencerId || row.influencer || row);
        const id = idOf(row) || `${vendorId}-${influencerId}` || index;
        return (
          <tr key={id}>
            <td className="px-3 py-3">
              <div className="font-medium text-slate-900 dark:text-white">{text(row.influencerName || pickUserName(row.influencer || row))}</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{text(row.vendorName || pickVendorName(row.vendor || row.vendorId))}</div>
            </td>
            <td className="px-3 py-3">{percentValue(row.categoryFit || row.score)}</td>
            <td className="px-3 py-3">{percentValue(row.engagementRate)}</td>
            <td className="px-3 py-3">{percentValue(row.conversionRate)}</td>
            <td className="px-3 py-3">{formatCurrency(row.revenue || row.pastRevenue || 0)}</td>
            <td className="px-3 py-3"><StatusBadge value={row.fraudRisk || "low"} /></td>
            <td className="px-3 py-3">{text(row.location || row.country)}</td>
            <td className="px-3 py-3">{text(row.language || row.languages?.join(", "))}</td>
          </tr>
        );
      }} />
    </Section>
  );
}

function AffiliateLinksView({ items, pagination, setFilters, runAction, busyId }) {
  const [selected, setSelected] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const openDetails = async (row) => {
    setSelected(row);
    setDetailError("");
    setDetailsLoading(true);
    try {
      const response = await getAdminAffiliateLinkDetails(idOf(row));
      setSelected(unwrap(response));
    } catch (err) {
      setDetailError(err?.response?.data?.message || err?.message || "Unable to load affiliate link details.");
    } finally {
      setDetailsLoading(false);
    }
  };

  const copyLink = async (row) => {
    const value = row.affiliateLink || row.shortUrl || "";
    if (!value) return;
    await navigator.clipboard?.writeText(value).catch(() => null);
  };

  const statusAction = (row, action) => runAction(
    `affiliate-${idOf(row)}-${action}`,
    () => updateAdminAffiliateLinkStatus(idOf(row), { action, reason: action === "deactivate" ? "Manually deactivated by admin from Affiliate Links module." : "Manually activated by admin from Affiliate Links module." }),
    action === "deactivate" ? "Affiliate link deactivated." : "Affiliate link activated."
  );

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Metric label="Total Links" value={numberValue(pagination?.total || items.length)} />
        <Metric label="Tracking Active" value={numberValue(items.filter((row) => row.trackingStatus === "active").length)} />
        <Metric label="Clicks" value={numberValue(items.reduce((sum, row) => sum + Number(row.clicks || 0), 0))} />
        <Metric label="Orders" value={numberValue(items.reduce((sum, row) => sum + Number(row.orders || 0), 0))} />
        <Metric label="Commission" value={formatCurrency(items.reduce((sum, row) => sum + Number(row.commission || 0), 0))} />
      </div>
      <Section title="Affiliate Link Management" icon={LinkIcon}>
        <ResponsiveTable headers={["Link", "Campaign", "Vendor", "Influencer", "Product", "Status", "Metrics", "Expiry", "Actions"]} rows={items} renderRow={(row) => {
          const id = idOf(row);
          const canActivate = row.actions?.canActivate;
          const canDeactivate = row.actions?.canDeactivate;
          return (
            <tr key={id}>
              <td className="px-3 py-3">
                <div className="font-mono text-xs text-slate-700 dark:text-slate-200" title={row.affiliateLink}>{shortText(row.trackingCode || row.trackingToken || id, 18)}</div>
                <div className="mt-1 max-w-[28rem] whitespace-normal break-all text-xs leading-5 text-indigo-600" title={row.affiliateLink}>{row.affiliateLink || "-"}</div>
              </td>
              <td className="px-3 py-3">
                <div className="font-medium text-slate-900 dark:text-white">{shortText(row.campaignName, 28)}</div>
                <div className="mt-1 text-xs text-slate-500">{statusText(row.paymentModel || row.campaignType)}</div>
              </td>
              <td className="px-3 py-3">{text(row.vendorName)}</td>
              <td className="px-3 py-3">{text(row.influencerName)}</td>
              <td className="px-3 py-3" title={text(row.productName)}>{shortText(row.productName, 32)}</td>
              <td className="px-3 py-3">
                <div className="space-y-1">
                  <StatusBadge value={row.status} />
                  <StatusBadge value={row.trackingStatus} />
                  {row.disabledReason ? <p className="max-w-40 text-xs text-slate-500">{shortText(row.disabledReason, 48)}</p> : null}
                </div>
              </td>
              <td className="px-3 py-3 text-xs">
                <div>{numberValue(row.clicks)} clicks · {numberValue(row.orders)} orders</div>
                <div className="mt-1">{formatCurrency(row.revenue)} revenue</div>
                <div className="mt-1 text-emerald-600">{formatCurrency(row.commission)} commission</div>
              </td>
              <td className="px-3 py-3">{dateValue(row.expiryDate || row.expiresAt)}</td>
              <td className="px-3 py-3">
                <div className="flex flex-wrap gap-2">
                  <ActionButton tone="slate" icon={Eye} onClick={() => openDetails(row)}>View</ActionButton>
                  <ActionButton tone="slate" icon={Copy} onClick={() => copyLink(row)} disabled={!row.affiliateLink}>Copy</ActionButton>
                  <ActionButton tone="slate" icon={ExternalLink} onClick={() => row.affiliateLink && window.open(row.affiliateLink, "_blank", "noopener,noreferrer")} disabled={!row.affiliateLink}>Open</ActionButton>
                  {row.trackingStatus === "active" ? (
                    <ActionButton tone="red" icon={PowerOff} disabled={!canDeactivate || busyId === `affiliate-${id}-deactivate`} onClick={() => statusAction(row, "deactivate")}>Deactivate</ActionButton>
                  ) : (
                    <ActionButton tone="green" icon={Power} disabled={!canActivate || busyId === `affiliate-${id}-activate`} onClick={() => statusAction(row, "activate")}>Activate</ActionButton>
                  )}
                </div>
              </td>
            </tr>
          );
        }} />
        <Pagination pagination={pagination} setFilters={setFilters} />
      </Section>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Affiliate link details</h3>
                <p className="mt-1 text-sm text-slate-500">Centralized admin control for link status, attribution readiness, and historical metrics.</p>
              </div>
              <button type="button" className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700" onClick={() => setSelected(null)}>Close</button>
            </div>
            {detailError ? <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{detailError}</div> : null}
            {detailsLoading ? <div className="mt-4 rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500 dark:bg-slate-950">Loading details...</div> : (
              <div className="mt-5 space-y-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <Metric label="Clicks" value={numberValue(selected.clicks)} hint={`${numberValue(selected.uniqueClicks)} unique`} />
                  <Metric label="Orders" value={numberValue(selected.orders)} hint={`Last order ${dateValue(selected.lastOrder)}`} />
                  <Metric label="Revenue" value={formatCurrency(selected.revenue)} />
                  <Metric label="Commission" value={formatCurrency(selected.commission)} />
                </div>
                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="grid gap-3 md:grid-cols-2">
                    <p><span className="text-slate-500">Campaign:</span> {text(selected.campaignName)} ({statusText(selected.campaignStatus)})</p>
                    <p><span className="text-slate-500">Product:</span> {text(selected.productName)}</p>
                    <p><span className="text-slate-500">Vendor:</span> {text(selected.vendorName)}</p>
                    <p><span className="text-slate-500">Influencer:</span> {text(selected.influencerName)}</p>
                    <p><span className="text-slate-500">Tracking:</span> {statusText(selected.trackingStatus)}</p>
                    <p><span className="text-slate-500">Expires:</span> {dateValue(selected.expiresAt)}</p>
                  </div>
                  <div className="mt-4 break-all rounded-xl bg-slate-50 p-3 font-mono text-xs dark:bg-slate-950">{selected.affiliateLink || "-"}</div>
                </div>
                <Section title="Audit History" icon={ShieldCheck}>
                  <div className="space-y-3">
                    {(selected.history || []).length ? selected.history.map((row) => (
                      <div key={row.id} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
                        <div className="font-semibold text-slate-900 dark:text-white">{statusText(row.action)}</div>
                        <div className="mt-1 text-xs text-slate-500">{dateValue(row.createdAt)} · {text(row.actor)}</div>
                        {row.metadata?.reason ? <div className="mt-1 text-xs text-slate-500">{row.metadata.reason}</div> : null}
                      </div>
                    )) : <p className="text-sm text-slate-500">No audit events yet.</p>}
                  </div>
                </Section>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

function ProductPromotionsView({ items, pagination, setFilters }) {
  return (
    <Section title="Product Promotions" icon={Package}>
      <ResponsiveTable headers={["Product", "Campaign", "Vendor", "Creators", "Clicks", "Orders", "Revenue", "Commission", "Conversion", "Status"]} rows={items} renderRow={(row) => (
        <tr key={row.id || `${idOf(row.campaignId || row.campaign)}-${idOf(row.productId || row.product)}`}>
          <td className="px-3 py-3">
            <div className="font-medium text-slate-900 dark:text-white" title={text(row.productName || row.product?.name || row.name)}>
              {shortText(row.productName || row.product?.name || row.name, 42)}
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{text(row.category || row.product?.category)}</div>
          </td>
          <td className="px-3 py-3" title={text(row.campaignTitle || row.campaign?.title)}>{shortText(row.campaignTitle || row.campaign?.title, 28)}</td>
          <td className="px-3 py-3 text-slate-500">{text(row.vendorName || pickVendorName(row.vendor || row.vendorId))}</td>
          <td className="px-3 py-3">{numberValue(row.influencersPromoting || row.creators || row.promoters)}</td>
          <td className="px-3 py-3">{numberValue(row.clicks)}</td>
          <td className="px-3 py-3">{numberValue(row.orders)}</td>
          <td className="px-3 py-3">{formatCurrency(row.revenue || 0)}</td>
          <td className="px-3 py-3">{formatCurrency(row.commission || 0)}</td>
          <td className="px-3 py-3">{percentValue(row.conversionRate)}</td>
          <td className="px-3 py-3"><StatusBadge value={row.campaignState || row.status || row.product?.status} /></td>
        </tr>
      )} />
      <Pagination pagination={pagination} setFilters={setFilters} />
    </Section>
  );
}

function TrackingView({ items, pagination, setFilters }) {
  return (
    <Section title="Affiliate Tracking Monitor" icon={LinkIcon}>
      <ResponsiveTable headers={["Click ID", "Influencer", "Vendor", "Product", "Campaign", "Clicked On", "Order", "Conversion", "Link Expires", "Fraud Risk"]} rows={items} renderRow={(row) => (
        <tr key={idOf(row)}>
          <td className="px-3 py-3 font-mono text-xs" title={text(row.sessionId || row.trackingTokenId || idOf(row))}>{shortText(row.sessionId || row.trackingTokenId || idOf(row), 14)}</td>
          <td className="px-3 py-3">{text(row.influencerName || pickUserName(row.influencerId || row.influencer))}</td>
          <td className="px-3 py-3">{text(row.vendorName || pickVendorName(row.vendorId || row.vendor))}</td>
          <td className="px-3 py-3" title={text(row.productName || row.productId?.name || row.product?.name)}>{shortText(row.productName || row.productId?.name || row.product?.name, 34)}</td>
          <td className="px-3 py-3">{text(row.campaignTitle || row.campaignId?.title || row.campaign?.title)}</td>
          <td className="px-3 py-3">{dateValue(row.createdAt || row.clickTimestamp)}</td>
          <td className="px-3 py-3">{text(row.orderNumber || row.order?.orderNumber || row.orderId?.orderNumber)}</td>
          <td className="px-3 py-3"><StatusBadge value={row.conversionStatus || row.status} /></td>
          <td className="px-3 py-3">{dateValue(row.expiresAt || row.tokenExpiry)}</td>
          <td className="px-3 py-3"><StatusBadge value={row.fraudRisk || "low"} /></td>
        </tr>
      )} />
      <Pagination pagination={pagination} setFilters={setFilters} />
    </Section>
  );
}

function SettlementsView({ items, fixedPayments, refunds, releaseQueue, pagination, setFilters, runAction, busyId, confirmAdminAction }) {
  return (
    <div className="space-y-4">
      <Section title="Approved Fixed Deliverables" icon={CheckCircle2}>
        <ResponsiveTable headers={["Campaign", "Vendor", "Influencer", "Deliverable", "Amount", "Status", "Action"]} rows={releaseQueue} renderRow={(row) => {
          const campaign = row.campaign || {};
          const campaignId = idOf(campaign);
          const influencerId = idOf(campaign.influencerId);
          const actionId = `release-fixed-${row.deliverableId}`;
          return (
            <tr key={row.deliverableId}>
              <td className="px-3 py-3 font-medium text-slate-900 dark:text-white">{text(campaign.title)}</td>
              <td className="px-3 py-3">{pickVendorName(campaign.vendorId)}</td>
              <td className="px-3 py-3">{pickUserName(campaign.influencerId)}</td>
              <td className="px-3 py-3">{text(row.title || row.deliverableType)}</td>
              <td className="px-3 py-3">{formatCurrency(row.amount || 0)}</td>
              <td className="px-3 py-3"><StatusBadge value={row.paymentEligibility} /></td>
              <td className="px-3 py-3">
                <ActionButton
                  tone="green"
                  disabled={!campaignId || !influencerId || busyId === actionId}
                  onClick={async () => {
                    if (!(await confirmAdminAction({
                      title: "Release fixed deliverable",
                      message: `Release ${formatCurrency(row.amount || 0)} to ${pickUserName(campaign.influencerId)} for "${text(campaign.title)}"?`,
                      tone: "danger",
                      confirmLabel: "Release Earnings",
                    }))) return;
                    return runAction(
                      actionId,
                      () => CampaignEscrowService.releaseApprovedDeliverables(campaignId, influencerId, [row.deliverableId]),
                      "Approved earnings released to the influencer wallet.",
                    );
                  }}
                >
                  Release
                </ActionButton>
              </td>
            </tr>
          );
        }} />
      </Section>

      <Section title="Fixed Campaign Payments" icon={WalletCards}>
        <ResponsiveTable headers={["Campaign", "Vendor", "Budget", "Paid", "Escrow Balance", "Released", "Refunded", "Payment", "Campaign Status"]} rows={fixedPayments} renderRow={(row) => (
          <tr key={idOf(row)}>
            <td className="px-3 py-3 font-medium text-slate-900 dark:text-white">{text(row.campaignId?.title || row.campaignId)}</td>
            <td className="px-3 py-3">{pickVendorName(row.vendorId)}</td>
            <td className="px-3 py-3">{formatCurrency(row.budgetAmount || 0)}</td>
            <td className="px-3 py-3">{formatCurrency(row.totalAmount || 0)}</td>
            <td className="px-3 py-3">{formatCurrency(row.escrow?.amountRemaining || 0)}</td>
            <td className="px-3 py-3">{formatCurrency(row.escrow?.amountReleased || 0)}</td>
            <td className="px-3 py-3">{formatCurrency(row.escrow?.amountRefunded || 0)}</td>
            <td className="px-3 py-3"><StatusBadge value={row.status} /></td>
            <td className="px-3 py-3"><StatusBadge value={row.campaignId?.state || row.escrow?.campaignStatus} /></td>
          </tr>
        )} />
      </Section>

      <Section title="Fixed Campaign Refunds" icon={RefreshCw}>
        <ResponsiveTable headers={["Campaign", "Vendor", "Amount", "Reason", "Status", "Requested", "Actions"]} rows={refunds} renderRow={(row) => {
          const id = idOf(row);
          return (
            <tr key={id}>
              <td className="px-3 py-3">{text(row.campaignId?.title || row.campaignId)}</td>
              <td className="px-3 py-3">{pickVendorName(row.vendorId)}</td>
              <td className="px-3 py-3">{formatCurrency(row.totalRefundAmount || 0)}</td>
              <td className="px-3 py-3">{statusText(row.reason)}</td>
              <td className="px-3 py-3"><StatusBadge value={row.status} /></td>
              <td className="px-3 py-3">{dateValue(row.requestedAt)}</td>
              <td className="px-3 py-3">
                <div className="flex flex-wrap gap-2">
                  <ActionButton tone="green" disabled={row.status !== "requested" || busyId === `approve-refund-${id}`} onClick={async () => {
                    if (!(await confirmAdminAction({ title: "Approve refund", message: `Approve refund of ${formatCurrency(row.totalRefundAmount || 0)}?`, confirmLabel: "Approve Refund" }))) return;
                    return runAction(`approve-refund-${id}`, () => CampaignEscrowService.approveRefund(id, "Approved by platform admin"), "Refund approved.");
                  }}>Approve</ActionButton>
                  <ActionButton tone="red" disabled={row.status !== "requested" || busyId === `reject-refund-${id}`} onClick={async () => {
                    if (!(await confirmAdminAction({ title: "Reject refund", message: `Reject refund of ${formatCurrency(row.totalRefundAmount || 0)}?`, tone: "danger", confirmLabel: "Reject Refund" }))) return;
                    return runAction(`reject-refund-${id}`, () => CampaignEscrowService.rejectRefund(id, "Rejected by platform admin"), "Refund rejected.");
                  }}>Reject</ActionButton>
                  <ActionButton tone="amber" disabled={row.status !== "approved" || busyId === `process-refund-${id}`} onClick={async () => {
                    if (!(await confirmAdminAction({ title: "Process refund", message: `Send ${formatCurrency(row.totalRefundAmount || 0)} to Razorpay for processing?`, tone: "danger", confirmLabel: "Process Refund" }))) return;
                    return runAction(`process-refund-${id}`, () => CampaignEscrowService.processRefund(id), "Refund sent to Razorpay.");
                  }}>Process</ActionButton>
                </div>
              </td>
            </tr>
          );
        }} />
      </Section>

      <Section title="Commission Escrow & Settlements" icon={WalletCards}>
        <ResponsiveTable headers={["Vendor", "Influencer", "Campaign", "Order", "Escrow", "Hold Until", "Status", "Released"]} rows={items} renderRow={(row) => (
          <tr key={idOf(row)}>
            <td className="px-3 py-3">{pickVendorName(row.vendorId || row.vendor)}</td>
            <td className="px-3 py-3">{pickUserName(row.influencerId || row.influencer)}</td>
            <td className="px-3 py-3">{text(row.campaignId?.title || row.campaign?.title)}</td>
            <td className="px-3 py-3">{text(row.orderId?.orderNumber || row.orderNumber)}</td>
            <td className="px-3 py-3">{formatCurrency(row.escrowAmount || 0)}</td>
            <td className="px-3 py-3">{dateValue(row.holdUntil)}</td>
            <td className="px-3 py-3"><StatusBadge value={row.settlementStatus || row.state} /></td>
            <td className="px-3 py-3">{dateValue(row.releasedDate)}</td>
          </tr>
        )} />
        <Pagination pagination={pagination} setFilters={setFilters} />
      </Section>
    </div>
  );
}

function VendorCampaignCommissionView({ items, runAction, busyId, confirmAdminAction }) {
  const emptyForm = () => ({
    feeName: "Platform Fee",
    feeCode: "platform_fee",
    paymentModel: "fixed",
    feeType: "percentage",
    percentageValue: 0,
    fixedValue: 0,
    calculationBase: "campaign_budget",
    isActive: true,
    effectiveFrom: new Date().toISOString().slice(0, 10),
    effectiveTo: "",
  });
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const inputClass = "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white";
  const dateInput = (value) => value ? new Date(value).toISOString().slice(0, 10) : "";
  const payloadFor = (value) => ({
    feeName: value.feeName,
    feeCode: value.feeCode,
    paymentModel: value.paymentModel,
    feeType: value.feeType,
    percentageValue: Number(value.percentageValue || 0),
    fixedValue: Number(value.fixedValue || 0),
    calculationBase: value.calculationBase,
    isActive: Boolean(value.isActive),
    effectiveFrom: value.effectiveFrom,
    effectiveTo: value.effectiveTo || null,
  });
  const resetForm = () => {
    setEditingId("");
    setForm(emptyForm());
  };
  const startEdit = (row) => {
    setEditingId(idOf(row));
    setForm({
      feeName: row.feeName || "",
      feeCode: row.feeCode || "platform_fee",
      paymentModel: row.paymentModel || "all",
      feeType: row.feeType || "percentage",
      percentageValue: Number(row.percentageValue || 0),
      fixedValue: Number(row.fixedValue || 0),
      calculationBase: row.calculationBase || "campaign_budget",
      isActive: Boolean(row.isActive),
      effectiveFrom: dateInput(row.effectiveFrom),
      effectiveTo: dateInput(row.effectiveTo),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const saveConfiguration = async () => {
    const actionId = editingId ? `edit-campaign-fee-${editingId}` : "create-campaign-fee";
    const saved = await runAction(
      actionId,
      () => editingId
        ? CampaignEscrowService.updateFeeConfiguration(editingId, payloadFor(form))
        : CampaignEscrowService.createFeeConfiguration(payloadFor(form)),
      editingId ? "Campaign fee configuration updated." : "Campaign fee configuration created."
    );
    if (saved) resetForm();
  };
  const deleteConfiguration = async (row) => {
    const id = idOf(row);
    if (!(await confirmAdminAction({
      message: `Delete "${row.feeName}"? Existing payment snapshots will remain unchanged.`,
      tone: "danger",
      confirmLabel: "Confirm",
    }))) return;
    const deleted = await runAction(
      `delete-campaign-fee-${id}`,
      () => CampaignEscrowService.deleteFeeConfiguration(id),
      "Campaign fee configuration deleted."
    );
    if (deleted && editingId === id) resetForm();
  };
  return (
    <div className="space-y-4">
      <Section title={editingId ? "Edit Fee Configuration" : "Create Fee Configuration"} icon={Calculator}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <FieldShell label="Fee Name"><input className={inputClass} value={form.feeName} onChange={(event) => setForm((current) => ({ ...current, feeName: event.target.value }))} /></FieldShell>
          <FieldShell label="Fee Code">
            <select className={inputClass} value={form.feeCode} onChange={(event) => setForm((current) => ({ ...current, feeCode: event.target.value }))}>
              <option value="platform_fee">Platform Fee</option>
              <option value="gateway_fee">Gateway Fee</option>
              <option value="gst">GST</option>
              <option value="refund_processing_fee">Refund Processing Fee</option>
              <option value="partial_refund_fee">Partial Refund Fee</option>
            </select>
          </FieldShell>
          <FieldShell label="Payment Model">
            <select className={inputClass} value={form.paymentModel} onChange={(event) => setForm((current) => ({ ...current, paymentModel: event.target.value }))}>
              <option value="all">All Models</option>
              <option value="fixed">Fixed Payment</option>
              <option value="commission">Commission</option>
              <option value="hybrid">Hybrid</option>
              <option value="free_product">Free Product</option>
            </select>
          </FieldShell>
          <FieldShell label="Fee Type">
            <select className={inputClass} value={form.feeType} onChange={(event) => setForm((current) => ({ ...current, feeType: event.target.value }))}>
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </FieldShell>
          <FieldShell label="Calculation Base">
            <select className={inputClass} value={form.calculationBase} onChange={(event) => setForm((current) => ({ ...current, calculationBase: event.target.value }))}>
              <option value="campaign_budget">Campaign Budget</option>
              <option value="service_fees">Service Fees</option>
              <option value="refundable_amount">Refundable Amount</option>
            </select>
          </FieldShell>
          <FieldShell label="Percentage"><input type="number" min="0" max="100" step="0.01" className={inputClass} value={form.percentageValue} onChange={(event) => setForm((current) => ({ ...current, percentageValue: event.target.value }))} /></FieldShell>
          <FieldShell label="Fixed Amount"><input type="number" min="0" step="0.01" className={inputClass} value={form.fixedValue} onChange={(event) => setForm((current) => ({ ...current, fixedValue: event.target.value }))} /></FieldShell>
          <FieldShell label="Effective From"><input type="date" className={inputClass} value={form.effectiveFrom} onChange={(event) => setForm((current) => ({ ...current, effectiveFrom: event.target.value }))} /></FieldShell>
          <FieldShell label="Effective To"><input type="date" className={inputClass} value={form.effectiveTo} onChange={(event) => setForm((current) => ({ ...current, effectiveTo: event.target.value }))} /></FieldShell>
          <FieldShell label="Status">
            <label className={`${inputClass} flex items-center gap-2`}>
              <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} />
              Active
            </label>
          </FieldShell>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <ActionButton
            icon={CheckCircle2}
            disabled={busyId === (editingId ? `edit-campaign-fee-${editingId}` : "create-campaign-fee") || !form.feeName.trim()}
            onClick={saveConfiguration}
          >
            {editingId ? "Update Configuration" : "Save Configuration"}
          </ActionButton>
          {editingId ? <ActionButton tone="slate" icon={XCircle} onClick={resetForm}>Cancel Edit</ActionButton> : null}
        </div>
      </Section>
      <Section title="Configured Campaign Fees" icon={Percent}>
        <ResponsiveTable headers={["Fee", "Model", "Code", "Type", "Percentage", "Fixed", "Base", "Effective", "Status", "Actions"]} rows={items} renderRow={(row) => (
          <tr key={idOf(row)}>
            <td className="px-3 py-3 font-medium text-slate-900 dark:text-white">{row.feeName}</td>
            <td className="px-3 py-3"><StatusBadge value={row.paymentModel || "all"} /></td>
            <td className="px-3 py-3 text-slate-500">{row.feeCode}</td>
            <td className="px-3 py-3"><StatusBadge value={row.feeType} /></td>
            <td className="px-3 py-3">{Number(row.percentageValue || 0)}%</td>
            <td className="px-3 py-3">{formatCurrency(row.fixedValue || 0)}</td>
            <td className="px-3 py-3 text-slate-500">{statusText(row.calculationBase)}</td>
            <td className="px-3 py-3 text-slate-500">{row.effectiveFrom ? new Date(row.effectiveFrom).toLocaleDateString() : "-"}</td>
            <td className="px-3 py-3"><StatusBadge value={row.isActive ? "active" : "inactive"} /></td>
            <td className="px-3 py-3">
              <div className="flex flex-wrap gap-2">
                <ActionButton tone="slate" icon={Pencil} disabled={Boolean(busyId)} onClick={() => startEdit(row)}>Edit</ActionButton>
                <ActionButton
                  tone={row.isActive ? "amber" : "green"}
                  disabled={busyId === `toggle-fee-${idOf(row)}`}
                  onClick={() => runAction(
                    `toggle-fee-${idOf(row)}`,
                    () => CampaignEscrowService.updateFeeConfiguration(idOf(row), payloadFor({ ...row, isActive: !row.isActive, effectiveFrom: dateInput(row.effectiveFrom), effectiveTo: dateInput(row.effectiveTo) })),
                    `Campaign fee ${row.isActive ? "deactivated" : "activated"}.`
                  )}
                >
                  {row.isActive ? "Deactivate" : "Activate"}
                </ActionButton>
                <ActionButton tone="red" icon={Trash2} disabled={busyId === `delete-campaign-fee-${idOf(row)}`} onClick={() => deleteConfiguration(row)}>Delete</ActionButton>
              </div>
            </td>
          </tr>
        )} />
      </Section>
    </div>
  );
}

function withdrawalActions(row = {}) {
  const status = String(row.status || "").toUpperCase();
  if (status === "REQUESTED") return ["UNDER_REVIEW", "APPROVED", "REJECTED"];
  if (status === "UNDER_REVIEW") return ["APPROVED", "REJECTED"];
  if (status === "APPROVED") return ["PROCESSING", "CANCELLED"];
  if (status === "PROCESSING") return ["COMPLETED", "FAILED"];
  if (status === "FAILED") return ["PROCESSING", "CANCELLED"];
  return [];
}

function withdrawalTone(status = "") {
  if (status === "APPROVED" || status === "PROCESSING") return "amber";
  if (status === "COMPLETED") return "green";
  if (["REJECTED", "CANCELLED", "FAILED"].includes(status)) return "red";
  return "slate";
}

function PayoutsView({ items, withdrawalRequests = [], pagination, setFilters, runAction, busyId, requestAdminInput }) {
  return (
    <div className="space-y-4">
      <Section title="Withdrawal Requests" icon={WalletCards}>
        <ResponsiveTable headers={["Influencer", "Amount", "Status", "Requested", "Account", "Reference", "Actions"]} rows={withdrawalRequests} renderRow={(row) => {
          const actions = withdrawalActions(row);
          return (
            <tr key={idOf(row)}>
              <td className="px-3 py-3 font-medium text-slate-900 dark:text-white">{row.influencerName || pickUserName(row.influencerId)}</td>
              <td className="px-3 py-3">{formatCurrency(row.amount || 0)}</td>
              <td className="px-3 py-3"><StatusBadge value={row.status} /></td>
              <td className="px-3 py-3">{dateValue(row.requestedAt)}</td>
              <td className="px-3 py-3">{text(row.accountLabel || row.bankAccountId?.bankName || row.bankAccountId?.paymentMethod)}</td>
              <td className="px-3 py-3">{text(row.transactionReference)}</td>
              <td className="px-3 py-3">
                <div className="flex flex-wrap gap-2">
                  {actions.map((status) => (
                    <ActionButton
                      key={status}
                      tone={withdrawalTone(status)}
                      disabled={busyId === `withdrawal-${idOf(row)}-${status}`}
                      onClick={async () => {
                        const transactionReference = status === "COMPLETED" && !row.transactionReference
                          ? await requestAdminInput({
                              title: "Bank transfer reference",
                              label: "Reference",
                              required: false,
                              confirmLabel: "Continue",
                            }) || ""
                          : row.transactionReference || "";
                        const reason = ["REJECTED", "CANCELLED", "FAILED"].includes(status)
                          ? await requestAdminInput({
                              title: "Withdrawal reason",
                              label: "Reason",
                              required: false,
                              confirmLabel: "Continue",
                            }) || ""
                          : "";
                        return runAction(
                          `withdrawal-${idOf(row)}-${status}`,
                          () => updateAdminInfluencerWithdrawal(idOf(row), { status, transactionReference, reason }),
                          `Withdrawal moved to ${status.replace(/_/g, " ").toLowerCase()}.`
                        );
                      }}
                    >
                      {status.replace(/_/g, " ")}
                    </ActionButton>
                  ))}
                </div>
              </td>
            </tr>
          );
        }} />
      </Section>

      <Section title="Influencer Wallets" icon={WalletCards}>
        <ResponsiveTable headers={["Influencer", "Available", "Pending", "Approved", "Withdrawn", "Method", "Verification"]} rows={items} renderRow={(row) => (
          <tr key={idOf(row)}>
            <td className="px-3 py-3 font-medium text-slate-900 dark:text-white">{pickUserName(row.influencerId || row.influencer)}</td>
            <td className="px-3 py-3">{formatCurrency(row.availableBalance || 0)}</td>
            <td className="px-3 py-3">{formatCurrency(row.pendingBalance || 0)}</td>
            <td className="px-3 py-3">{formatCurrency(row.approvedEarnings || 0)}</td>
            <td className="px-3 py-3">{formatCurrency(row.withdrawnBalance || 0)}</td>
            <td className="px-3 py-3">{text(row.payoutMethod || row.method || row.payoutAccount?.paymentMethod)}</td>
            <td className="px-3 py-3"><StatusBadge value={row.accountVerificationStatus || row.verificationStatus || row.payoutAccount?.verificationStatus} /></td>
          </tr>
        )} />
        <Pagination pagination={pagination} setFilters={setFilters} />
      </Section>
    </div>
  );
}

function SettingsView({ data, runAction, busyId }) {
  const settings = data.settings || data || {};
  const enabled = Boolean(settings.enabled ?? settings.influencerCommerceEnabled);

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <Section title="Influencer Commerce Settings" icon={Settings}>
        <div className="grid gap-3 md:grid-cols-2">
          {[
            ["Default Commission Rate", percentValue(settings.defaultCommissionRate)],
            ["Maximum Commission Rate", percentValue(settings.maximumCommissionRate)],
            ["Commission Hold Days", numberValue(settings.commissionHoldDays)],
            ["Tracking Cookie Duration", `${numberValue(settings.trackingCookieDurationDays)} days`],
            ["Self-Attribution Blocking", settings.selfAttributionBlocking ? "Enabled" : "Disabled"],
            ["Auto-Settlement Rules", settings.autoSettlementEnabled ? "Enabled" : "Manual"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">{value}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Platform Toggle" icon={ShieldCheck}>
        <div className="space-y-3">
          <StatusBadge value={enabled ? "enabled" : "disabled"} />
          <p className="text-sm text-slate-500 dark:text-slate-400">This updates the existing platform configuration used by admin, vendor, and influencer dashboards.</p>
          <ActionButton disabled={busyId === "toggle-settings"} onClick={() => runAction("toggle-settings", () => updateAdminInfluencerSettings({ enabled: !enabled }), "Influencer commerce settings updated.")}>
            {enabled ? "Disable" : "Enable"} Commerce
          </ActionButton>
        </div>
      </Section>
    </div>
  );
}

export function AdminInfluencerCommerceModule({ moduleId, data, items, pagination, setFilters, runAction, busyId, requestAdminInput, confirmAdminAction }) {
  if (moduleId === "dashboard") return <DashboardView data={data} />;
  if (moduleId === "influencers") return <InfluencersView items={items} pagination={pagination} setFilters={setFilters} />;
  if (moduleId === "vendors") return <VendorsView items={items} pagination={pagination} setFilters={setFilters} />;
  if (moduleId === "campaigns") return <CampaignsView items={items} pagination={pagination} setFilters={setFilters} runAction={runAction} busyId={busyId} confirmAdminAction={confirmAdminAction} />;
  if (moduleId === "vendor-campaign-commission") return <VendorCampaignCommissionView items={items} runAction={runAction} busyId={busyId} confirmAdminAction={confirmAdminAction} />;
  if (moduleId === "matching") return <MatchingView data={data} />;
  if (moduleId === "affiliate-links") return <AffiliateLinksView items={items} pagination={pagination} setFilters={setFilters} runAction={runAction} busyId={busyId} />;
  if (moduleId === "promotions") return <ProductPromotionsView items={items} pagination={pagination} setFilters={setFilters} />;
  if (moduleId === "tracking") return <TrackingView items={items} pagination={pagination} setFilters={setFilters} />;
  if (moduleId === "settlements") return <SettlementsView items={items} fixedPayments={data.fixedPayments || []} refunds={data.refunds || []} releaseQueue={data.releaseQueue || []} pagination={pagination} setFilters={setFilters} runAction={runAction} busyId={busyId} confirmAdminAction={confirmAdminAction} />;
  if (moduleId === "revenue") return <RevenueDashboardView data={data} setFilters={setFilters} />;
  if (moduleId === "payouts") return <PayoutsView items={items} withdrawalRequests={data.withdrawalRequests || []} pagination={pagination} setFilters={setFilters} runAction={runAction} busyId={busyId} requestAdminInput={requestAdminInput} />;
  if (moduleId === "configuration") return (
    <Suspense fallback={<div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">Loading configuration tools...</div>}>
      <ConfigurationEngineView data={data} runAction={runAction} busyId={busyId} confirmAdminAction={confirmAdminAction} />
    </Suspense>
  );
  if (moduleId === "settings") return <SettingsView data={data} runAction={runAction} busyId={busyId} />;
  return null;
}

export default AdminInfluencerCommerceModule;
