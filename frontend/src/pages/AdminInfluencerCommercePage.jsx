import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AlertTriangle, RefreshCw, X } from "lucide-react";
import {
  getAdminInfluencerCommerceDashboard,
  getAdminInfluencerCommerceRevenueDashboard,
  getAdminInfluencerSettings,
  getAdminInfluencerVendorMatching,
  getInfluencerCommerceConfiguration,
  listAdminAffiliateLinks,
  listAdminAffiliateTracking,
  listAdminInfluencerCommerceCampaigns,
  listAdminInfluencerCommerceInfluencers,
  listAdminInfluencerCommerceVendors,
  listAdminInfluencerPayouts,
  listAdminInfluencerSettlements,
  listInfluencerCommerceConfigAudit,
  listAdminProductPromotions,
} from "../services/adminInfluencerCommerceService";
import CampaignEscrowService from "../services/campaignEscrowService";
import { showError, showSuccess } from "../services/notificationService";
import { MODULES, MODULE_IDS, defaultFilters, unwrap, ActionButton, Filters } from "./adminInfluencerCommerce/AdminInfluencerCommerceShared";
import { useStaffPermission } from "../hooks/useStaffAuth";

const AdminInfluencerCommerceModule = lazy(() =>
  import("./adminInfluencerCommerce/AdminInfluencerCommerceViews").then((module) => ({ default: module.AdminInfluencerCommerceModule })),
);

function AdminWorkflowModal({ request, busy, onCancel, onConfirm }) {
  const [value, setValue] = useState(request?.defaultValue || "");
  const [confirmation, setConfirmation] = useState("");
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    setValue(request?.defaultValue || "");
    setConfirmation("");
    setLocalError("");
  }, [request]);

  if (!request) return null;

  const isInput = request.type === "input";
  const requiredText = request.requiresText ? request.confirmationText || "CONFIRM" : "";
  const confirmDisabled = busy || (isInput && request.required !== false && !value.trim()) || (requiredText && confirmation !== requiredText);

  const submit = (event) => {
    event.preventDefault();
    if (confirmDisabled) {
      setLocalError(requiredText ? `Type ${requiredText} to continue.` : "Required information is missing.");
      return;
    }
    onConfirm(isInput ? value : true);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="admin-workflow-title">
      <form onSubmit={submit} className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full ${request.tone === "danger" ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-200" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200"}`}>
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="admin-workflow-title" className="text-lg font-black text-slate-950 dark:text-white">{request.title || "Confirm admin action"}</h2>
              {request.message ? <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{request.message}</p> : null}
            </div>
          </div>
          <button type="button" onClick={onCancel} disabled={busy} className="rounded-full p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800" aria-label="Close modal">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isInput ? (
          <label className="mt-5 grid gap-2 text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {request.label || "Reason"}
            {request.multiline ? (
              <textarea value={value} onChange={(event) => setValue(event.target.value)} rows={4} placeholder={request.placeholder || ""} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-950 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            ) : (
              <input value={value} onChange={(event) => setValue(event.target.value)} placeholder={request.placeholder || ""} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium normal-case tracking-normal text-slate-950 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            )}
          </label>
        ) : null}

        {requiredText ? (
          <label className="mt-5 grid gap-2 text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Type {requiredText} to confirm
            <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="h-11 rounded-xl border border-rose-200 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-slate-950 outline-none focus:border-rose-500 dark:border-rose-900 dark:bg-slate-950 dark:text-white" />
          </label>
        ) : null}

        {localError ? <p className="mt-3 text-sm font-semibold text-rose-600 dark:text-rose-300">{localError}</p> : null}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={busy} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200">{request.cancelLabel || "Cancel"}</button>
          <button type="submit" disabled={confirmDisabled} className={`rounded-xl px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 ${request.tone === "danger" ? "bg-rose-600 hover:bg-rose-700" : "bg-slate-950 hover:bg-slate-800 dark:bg-white dark:text-slate-950"}`}>
            {busy ? "Working..." : request.confirmLabel || "Continue"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function AdminInfluencerCommercePage() {
  const location = useLocation();
  const { hasPermission } = useStaffPermission();
  const basePath = location.pathname.startsWith("/staff/influencer-commerce")
    ? "/staff/influencer-commerce"
    : "/admin/influencer-commerce";
  const isStaffWorkspace = basePath.startsWith("/staff");
  const moduleId = useMemo(() => {
    const suffix = location.pathname.replace(/^\/(?:admin|staff)\/influencer-commerce\/?/, "");
    const next = suffix.split("/")[0] || "dashboard";
    return MODULE_IDS.has(next) ? next : null;
  }, [location.pathname]);
  const [filters, setFilters] = useState(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  // State updates do not disable a button until React renders again. Keep a
  // synchronous guard as well so rapid clicks cannot submit a release twice.
  const inFlightActions = useRef(new Set());
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [data, setData] = useState({});
  const [workflowRequest, setWorkflowRequest] = useState(null);

  const params = useMemo(() => {
    const clean = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value) clean[key] = value;
    });
    return clean;
  }, [filters]);

  const fetcher = useMemo(() => ({
    dashboard: getAdminInfluencerCommerceDashboard,
    influencers: listAdminInfluencerCommerceInfluencers,
    vendors: listAdminInfluencerCommerceVendors,
    campaigns: listAdminInfluencerCommerceCampaigns,
    "vendor-campaign-commission": async () => ({ data: { items: await CampaignEscrowService.listFeeConfigurations() } }),
    matching: getAdminInfluencerVendorMatching,
    "affiliate-links": listAdminAffiliateLinks,
    tracking: listAdminAffiliateTracking,
    promotions: listAdminProductPromotions,
    settlements: async (query) => {
      const [settlements, fixedPayments, refunds, releaseQueue] = await Promise.all([
        listAdminInfluencerSettlements(query),
        CampaignEscrowService.listAllPaymentOrders(query),
        CampaignEscrowService.listRefundRequests({ ...query, limit: query.limit || 20 }),
        CampaignEscrowService.listReleaseQueue(query),
      ]);
      return {
        data: {
          ...(unwrap(settlements) || {}),
          fixedPayments: fixedPayments?.orders || [],
          fixedPaymentPagination: {
            total: fixedPayments?.total || 0,
            page: Math.floor(Number(fixedPayments?.skip || 0) / Number(fixedPayments?.limit || 20)) + 1,
            limit: fixedPayments?.limit || 20,
            pages: fixedPayments?.pages || 1,
          },
          refunds: refunds?.refunds || [],
          releaseQueue: releaseQueue?.items || [],
        },
      };
    },
    revenue: getAdminInfluencerCommerceRevenueDashboard,
    payouts: listAdminInfluencerPayouts,
    configuration: async (query) => {
      const [overview, audit] = await Promise.all([
        getInfluencerCommerceConfiguration(),
        listInfluencerCommerceConfigAudit({ limit: 20, ...query }),
      ]);
      return { data: { ...(overview?.data || {}), auditLogs: audit?.data?.items || [], auditPagination: audit?.data?.pagination } };
    },
    settings: getAdminInfluencerSettings,
  }), []);

  const load = useCallback(async (silentOrEvent = false) => {
    const silent = typeof silentOrEvent === "boolean" ? silentOrEvent : false;
    if (!moduleId) return;
    if (!silent) setLoading(true);
    setError("");
    try {
      const response = await fetcher[moduleId](moduleId === "settings" ? undefined : params);
      setData(unwrap(response));
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Unable to load influencer commerce data.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [fetcher, moduleId, params]);

  useEffect(() => {
    load();
  }, [load]);

  const runAction = useCallback(async (id, action, successMessage) => {
    if (inFlightActions.current.has(id)) return false;
    inFlightActions.current.add(id);
    setBusyId(id);
    setMessage("");
    setError("");
    try {
      await action();
      setMessage(successMessage);
      showSuccess(successMessage);
      await load(true);
      return true;
    } catch (err) {
      const nextError = err?.response?.data?.message || err?.message || "Action failed.";
      setError(nextError);
      showError(nextError);
      return false;
    } finally {
      inFlightActions.current.delete(id);
      setBusyId("");
    }
  }, [load]);

  const confirmAdminAction = useCallback((options = {}) => new Promise((resolve) => {
    setWorkflowRequest({
      ...options,
      type: "confirm",
      title: options.title || (options.tone === "danger" ? "Confirm destructive admin action" : "Confirm admin action"),
      confirmLabel: options.confirmLabel || "Continue",
      requiresText: options.requiresText ?? options.tone === "danger",
      confirmationText: options.confirmationText || "CONFIRM",
      resolve,
    });
  }), []);

  const requestAdminInput = useCallback((options = {}) => new Promise((resolve) => {
    setWorkflowRequest({
      ...options,
      type: "input",
      title: options.title || "Admin input required",
      confirmLabel: options.confirmLabel || "Continue",
      resolve,
    });
  }), []);

  const closeWorkflow = useCallback((value) => {
    workflowRequest?.resolve(value);
    setWorkflowRequest(null);
  }, [workflowRequest]);

  const capabilities = useMemo(() => {
    const moduleCapability = (key, overrides = {}) => ({
      create: !isStaffWorkspace || hasPermission(`influencerCommerce.${key}Create`),
      read: !isStaffWorkspace || hasPermission(`influencerCommerce.${key}Read`),
      update: !isStaffWorkspace || hasPermission(`influencerCommerce.${key}Update`),
      delete: !isStaffWorkspace || hasPermission(`influencerCommerce.${key}Delete`),
      ...overrides,
    });

    return {
      campaigns: moduleCapability("campaigns", {
        create: false,
      }),
      vendorCampaignCommission: moduleCapability("vendorCampaignCommission"),
      affiliateLinks: moduleCapability("affiliateLinks"),
      affiliateTracking: moduleCapability("affiliateTracking"),
      productPromotions: moduleCapability("productPromotions"),
      settlements: moduleCapability("settlements"),
      campaignFinance: moduleCapability("campaignFinance", {
        create: false,
        update: false,
        delete: false,
      }),
      revenueDashboard: moduleCapability("revenueDashboard", {
        create: false,
        update: false,
        delete: false,
      }),
      payouts: moduleCapability("payouts"),
      tierScoreConfig: moduleCapability("tierScoreConfig"),
      settings: {
        read: !isStaffWorkspace || hasPermission("influencerCommerce.settingsRead"),
        update: !isStaffWorkspace,
      },
    };
  }, [hasPermission, isStaffWorkspace]);

  if (!moduleId) return <Navigate to={basePath} replace />;

  const module = MODULES[moduleId];
  const Icon = module.icon;
  const items = data.items || [];
  const pagination = data.pagination;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-indigo-500" aria-hidden="true" />
            <h1 className="text-xl font-semibold text-slate-950 dark:text-white">{module.label}</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Admin control center synchronized with vendor and influencer commerce workflows.</p>
        </div>
        <ActionButton tone="slate" icon={RefreshCw} disabled={loading} onClick={load}>Refresh</ActionButton>
      </div>

      {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">{message}</div> : null}
      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">{error}</div> : null}

      {!["settings", "vendor-campaign-commission"].includes(moduleId) ? <Filters filters={filters} setFilters={setFilters} compact={moduleId === "dashboard"} /> : null}
      {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">Loading influencer commerce data...</div> : (
        <Suspense fallback={<div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">Loading admin module...</div>}>
          <AdminInfluencerCommerceModule
            moduleId={moduleId}
            data={data}
            items={items}
            pagination={pagination}
            setFilters={setFilters}
            runAction={runAction}
            busyId={busyId}
            requestAdminInput={requestAdminInput}
            confirmAdminAction={confirmAdminAction}
            capabilities={capabilities}
          />
        </Suspense>
      )}
      <AdminWorkflowModal request={workflowRequest} busy={Boolean(busyId)} onCancel={() => closeWorkflow(null)} onConfirm={closeWorkflow} />
    </div>
  );
}


