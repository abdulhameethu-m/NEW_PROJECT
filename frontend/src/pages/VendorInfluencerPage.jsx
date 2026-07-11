import { createElement, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Megaphone, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { usePlatformFeatures } from "../context/PlatformFeaturesContext";
import {
  cancelVendorInfluencerSubscription,
  confirmVendorInfluencerSubscriptionChange,
  createVendorInfluencerCampaign,
  createVendorInfluencerSubscriptionChangeOrder,
  createVendorInfluencerSubscriptionOrder,
  deleteVendorInfluencerCampaign,
  discoverVendorInfluencers,
  getVendorContentApprovals,
  getVendorDeliverableReviewQueue,
  getVendorInfluencerCampaigns,
  getVendorInfluencerCommerceConfiguration,
  getVendorInfluencerCommerceDashboard,
  getVendorInfluencerEscrowRefundDeliverables,
  getVendorInfluencerEscrowRefunds,
  getVendorInfluencerPerformance,
  getVendorInfluencerRelationships,
  getVendorInfluencerSubscriptionPlans,
  getVendorPromotionProducts,
  previewVendorInfluencerSubscriptionChange,
  reviewCampaignExecutionDeliverable,
  reviewVendorCampaignApplication,
  reviewVendorInfluencerContent,
  saveVendorInfluencer,
  updateVendorInfluencerCampaignStatus,
  updateVendorInfluencerRelationship,
  visitVendorInfluencer,
  verifyVendorInfluencerSubscriptionPayment,
} from "../services/influencerCommerceService";
import { resolveApiAssetUrl } from "../utils/resolveUrl";
import { requestInput } from "../services/notificationService";
import CampaignEscrowService from "../services/campaignEscrowService";
import {
  ACTIVE_TAB_REFRESH_INTERVAL_MS,
  arrayValue,
  CAMPAIGN_TYPES,
  campaignBuilderPath,
  defaultFilters,
  Filters,
  FOUNDATION_REFRESH_TTL_MS,
  influencerRowId,
  loadRazorpayScript,
  mergeInfluencerOptions,
  normalizeInfluencerOption,
  TAB_IDS,
  TAB_PATHS,
  TABS,
} from "./vendorInfluencer/VendorInfluencerShared";

const DashboardView = lazy(() => import("./vendorInfluencer/DashboardTab"));
const DiscoverView = lazy(() => import("./vendorInfluencer/DiscoverTab"));
const SubscriptionView = lazy(() => import("./vendorInfluencer/SubscriptionTab"));
const RelationshipsView = lazy(() => import("./vendorInfluencer/RelationshipsTab"));
const CampaignsView = lazy(() => import("./vendorInfluencer/CampaignsTab"));
const ContentView = lazy(() => import("./vendorInfluencer/ContentTab"));
const PerformanceView = lazy(() => import("./vendorInfluencer/PerformanceTab"));
const VendorEscrowRefundsView = lazy(() => import("./vendorInfluencer/EscrowRefundsTab"));
const SubscriptionChangeModal = lazy(() => import("./vendorInfluencer/SubscriptionChangeModal"));
const VendorEscrowRefundDetailModal = lazy(() => import("./vendorInfluencer/EscrowRefundDetailModal"));
const CampaignPaymentModal = lazy(() =>
  import("../components/campaign/CampaignPaymentModal").then((module) => ({ default: module.CampaignPaymentModal || module.default })),
);

function TabFallback() {
  return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">Loading section...</div>;
}

export function VendorInfluencerPage() {
  const { influencerCommerceEnabled, loading: commerceLoading } = usePlatformFeatures();
  const location = useLocation();
  const navigate = useNavigate();
  const tab = useMemo(() => {
    const suffix = location.pathname.replace(/^\/vendor\/influencer-commerce\/?/, "");
    const next = suffix.split("/")[0] || "dashboard";
    return TAB_IDS.has(next) ? next : "dashboard";
  }, [location.pathname]);
  const [filters, setFilters] = useState(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [data, setData] = useState({});
  const [planChangePreview, setPlanChangePreview] = useState(null);
  const [selectedInvite, setSelectedInvite] = useState(null);
  const [campaignPayment, setCampaignPayment] = useState(null);
  const [escrowRefundDetail, setEscrowRefundDetail] = useState({ open: false, loading: false, data: null });
  const foundationInFlightRef = useRef(null);
  const foundationLoadedAtRef = useRef(0);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const influencerId = params.get("influencerId") || "";
    const productId = params.get("productId") || "";
    if (!influencerId && !productId) return;
    setFilters((current) => {
      const next = {
        ...current,
        influencerId: influencerId || current.influencerId,
        productId: productId || current.productId,
        page: 1,
      };
      if (next.influencerId === current.influencerId && next.productId === current.productId && next.page === current.page) return current;
      return next;
    });
  }, [location.search]);

  const query = useMemo(() => {
    const clean = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (key === "paymentModel" && value === "all") return;
      if (value) clean[key] = value;
    });
    return clean;
  }, [filters]);

  const campaigns = arrayValue(data.campaigns?.items).length ? arrayValue(data.campaigns?.items) : arrayValue(data.dashboard?.campaigns);
  const products = arrayValue(data.products?.items);
  const relationships = arrayValue(data.relationships?.items);
  const discovery = arrayValue(data.discover?.items);
  const campaignInfluencers = useMemo(() => mergeInfluencerOptions([selectedInvite, ...relationships, ...discovery]), [selectedInvite, relationships, discovery]);

  const loadFoundation = useCallback(async ({ force = false } = {}) => {
    if (!force && foundationInFlightRef.current) {
      return foundationInFlightRef.current;
    }

    if (!force && Date.now() - foundationLoadedAtRef.current < FOUNDATION_REFRESH_TTL_MS) {
      return null;
    }

    foundationInFlightRef.current = Promise.all([
      getVendorInfluencerCampaigns({ limit: 100 }),
      getVendorPromotionProducts({ limit: 100 }),
      getVendorInfluencerRelationships({ limit: 100 }),
      discoverVendorInfluencers({ limit: 100, sort: "trending" }).catch(() => ({ data: { items: [] } })),
      getVendorInfluencerSubscriptionPlans(),
      getVendorInfluencerCommerceConfiguration(),
    ]).then(([campaignResponse, productResponse, relationshipResponse, discoveryResponse, subscriptionResponse, configurationResponse]) => {
      foundationLoadedAtRef.current = Date.now();
      setData((current) => ({
        ...current,
        campaigns: campaignResponse?.data || { items: [] },
        products: productResponse?.data || { items: [] },
        relationships: relationshipResponse?.data || { items: [] },
        discover: current.discover?.items?.length ? current.discover : discoveryResponse?.data || { items: [] },
        subscription: subscriptionResponse?.data || {},
        configuration: configurationResponse?.data || {},
      }));
    }).finally(() => {
      foundationInFlightRef.current = null;
    });

    return foundationInFlightRef.current;
  }, []);

  const loadTab = useCallback(async ({ silent = false } = {}) => {
    if (commerceLoading || !influencerCommerceEnabled) return;
    if (!silent) setLoading(true);
    setError("");
    try {
      const loaders = {
        dashboard: () => getVendorInfluencerCommerceDashboard(query),
        discover: () => discoverVendorInfluencers(query),
        subscription: () => getVendorInfluencerSubscriptionPlans(),
        relationships: () => getVendorInfluencerRelationships(query),
        campaigns: () => getVendorInfluencerCampaigns(query),
        content: async () => {
          const [contentResponse, deliverableResponse] = await Promise.all([
            getVendorContentApprovals({ ...query, queue: "pending" }),
            getVendorDeliverableReviewQueue(query),
          ]);
          const contentItems = contentResponse?.data?.items || [];
          const deliverableItems = (deliverableResponse?.data?.items || []).map((row) => ({
            id: `deliverable-${row.id}`,
            source: "deliverable_execution",
            deliverableId: row.id,
            submissionId: row.latestSubmission?._id,
            campaignId: row.campaign?._id || row.campaign?.id,
            creatorName: row.influencer?.displayName || row.influencer?.userId?.name || "Creator",
            creatorUsername: row.influencer?.userId?.username || row.influencer?.userId?.email || "creator",
            campaign: row.campaign,
            title: row.title,
            contentType: row.latestSubmission?.contentType || row.deliverableType,
            submittedDate: row.latestSubmission?.submittedAt,
            status: row.status,
            url: row.latestSubmission?.contentUrl,
            metrics: {},
            products: [],
            totalPrice: row.totalPrice,
          }));
          return {
            data: {
              ...(contentResponse?.data || {}),
              items: [...deliverableItems, ...contentItems],
              deliverableItems,
            },
          };
        },
        performance: () => getVendorInfluencerPerformance(query),
        "escrow-refunds": () => getVendorInfluencerEscrowRefunds(query),
      };
      const response = await loaders[tab]();
      setData((current) => ({ ...current, [tab]: response?.data || {} }));
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load influencer commerce data.");
    } finally {
      setLoading(false);
    }
  }, [commerceLoading, influencerCommerceEnabled, query, tab]);

  useEffect(() => {
    if (!commerceLoading && influencerCommerceEnabled) {
      loadFoundation().catch(() => {});
    }
  }, [commerceLoading, influencerCommerceEnabled, loadFoundation]);

  useEffect(() => {
    const timer = window.setTimeout(() => loadTab(), filters.search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [loadTab, filters.search]);

  useEffect(() => {
    if (commerceLoading || !influencerCommerceEnabled) return undefined;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible" || busyId) return;
      loadTab({ silent: true }).catch(() => {});
    }, ACTIVE_TAB_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [busyId, commerceLoading, influencerCommerceEnabled, loadTab]);

  if (!commerceLoading && !influencerCommerceEnabled) {
    return <Navigate to="/vendor/dashboard" replace />;
  }

  async function runAction(id, action, successText) {
    setBusyId(id);
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(successText);
      try {
        await Promise.all([loadTab({ silent: true }), loadFoundation({ force: true })]);
      } catch {
        // The action itself succeeded; stale data is better than blocking the workflow.
      }
      return true;
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Action failed.");
      return false;
    } finally {
      setBusyId("");
    }
  }

  async function createCampaign(payload) {
    setBusyId("create-campaign");
    setError("");
    setMessage("");
    let campaign;
    try {
      const response = await createVendorInfluencerCampaign(payload);
      campaign = response?.data || response;
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Campaign creation failed.");
      setBusyId("");
      return false;
    }

    setMessage(["fixed", "hybrid"].includes(campaign?.paymentType)
      ? "Campaign invitation sent. Escrow funding becomes available after the influencer accepts."
      : "Campaign synchronized with the influencer ecosystem.");
    await Promise.all([loadTab({ silent: true }), loadFoundation({ force: true })]).catch(() => {});
    setBusyId("");
    return true;
  }

  async function verifyCampaignPayment(verification) {
    setBusyId("verify-campaign-payment");
    setError("");
    try {
      const confirmation = await CampaignEscrowService.verifyPayment(
        verification.paymentOrderId,
        verification.razorpayOrderId,
        verification.razorpayPaymentId,
        verification.razorpaySignature
      );
      let funded = confirmation?.status === "paid";
      for (let attempt = 0; attempt < 5 && !funded; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 1000));
        const payment = await CampaignEscrowService.getPaymentDetails(verification.paymentOrderId);
        funded = payment?.status === "paid" && Boolean(payment?.escrowId);
      }
      setMessage(funded
        ? "Payment verified by Razorpay. Escrow is funded and the campaign is active."
        : "Payment captured. Escrow funding is waiting for Razorpay webhook verification.");
      setCampaignPayment(null);
      await Promise.all([loadTab({ silent: true }), loadFoundation({ force: true })]);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Payment verification failed.");
      throw err;
    } finally {
      setBusyId("");
    }
  }

  async function openCampaignFunding(campaign) {
    const campaignId = campaign._id || campaign.id;
    setBusyId(`fund-${campaignId}`);
    setError("");
    try {
      const fundingSummary = await CampaignEscrowService.calculateCost(campaignId);
      setCampaignPayment({ campaign, fundingSummary, paymentOrder: null });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Unable to load campaign funding details.");
    } finally {
      setBusyId("");
    }
  }

  async function openEscrowRefundDetail(row) {
    const campaignId = row.campaignId || row.id || row._id;
    if (!campaignId) return;
    setEscrowRefundDetail({ open: true, loading: true, data: null });
    setError("");
    try {
      const response = await getVendorInfluencerEscrowRefundDeliverables(campaignId);
      setEscrowRefundDetail({ open: true, loading: false, data: response?.data || response || null });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Unable to load deliverable finance details.");
      setEscrowRefundDetail({ open: false, loading: false, data: null });
    }
  }

  async function createCampaignPaymentOrder() {
    const campaignId = campaignPayment?.campaign?._id || campaignPayment?.campaign?.id;
    if (!campaignId) throw new Error("Campaign not found.");
    const paymentOrder = await CampaignEscrowService.createPaymentOrder(campaignId);
    setCampaignPayment((current) => current ? { ...current, paymentOrder } : current);
    return paymentOrder;
  }

  async function visitInfluencerProfile(row) {
    const influencerId = influencerRowId(row);
    const ok = await runAction(`visit-${influencerId}`, () => visitVendorInfluencer(influencerId), "Influencer visit recorded.");
    if (ok && row.username) navigate(`/influencer/${encodeURIComponent(row.username)}`);
  }

  async function purchaseSubscription(plan, billingCycle = "monthly") {
    const current = data.subscription?.currentSubscription;
    const hasActiveSubscription = Boolean(current?._id && ["active", "trialing", "grace_period"].includes(String(current.status || "").toLowerCase()));
    if (hasActiveSubscription) {
      setBusyId(`preview-${plan._id}`);
      setError("");
      try {
        const response = await previewVendorInfluencerSubscriptionChange({ planId: plan._id, billingCycle });
        setPlanChangePreview(response?.data || response);
      } catch (err) {
        setError(err?.response?.data?.message || "Unable to calculate subscription change.");
      } finally {
        setBusyId("");
      }
      return;
    }
    setBusyId(`subscribe-${plan._id}`);
    setError("");
    setMessage("");
    try {
      const orderResponse = await createVendorInfluencerSubscriptionOrder({ planId: plan._id, billingCycle, autoRenew: Boolean(plan.autoRenewAllowed) });
      const order = orderResponse?.data || orderResponse;
      if (!order?.requiresPayment) {
        setMessage("Subscription activated.");
        await Promise.all([loadTab({ silent: true }), loadFoundation({ force: true })]);
        return;
      }
      const ready = await loadRazorpayScript();
      if (!ready || !window.Razorpay) throw new Error("Razorpay checkout failed to load.");
      await new Promise((resolve, reject) => {
        const checkout = new window.Razorpay({
          key: order.key,
          amount: order.amount,
          currency: order.currency,
          name: "Influencer Commerce",
          description: `${plan.planName} subscription`,
          order_id: order.razorpayOrderId,
          handler: async (response) => {
            try {
              await verifyVendorInfluencerSubscriptionPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              resolve();
            } catch (err) {
              reject(err);
            }
          },
          modal: {
            ondismiss: () => reject(new Error("Checkout closed before payment was completed.")),
          },
        });
        checkout.open();
      });
      setMessage("Subscription payment verified and plan activated.");
      await Promise.all([loadTab({ silent: true }), loadFoundation({ force: true })]);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Subscription purchase failed.");
    } finally {
      setBusyId("");
    }
  }

  async function confirmSubscriptionChange() {
    if (!planChangePreview?.targetPlan?._id) return;
    const preview = planChangePreview;
    setBusyId(`change-${preview.targetPlan._id}`);
    setError("");
    setMessage("");
    try {
      const orderResponse = await createVendorInfluencerSubscriptionChangeOrder({
        planId: preview.targetPlan._id,
        billingCycle: preview.targetBillingCycle,
        autoRenew: Boolean(preview.targetPlan.autoRenewAllowed),
      });
      const order = orderResponse?.data || orderResponse;
      if (!order?.requiresPayment) {
        setPlanChangePreview(null);
        setMessage("Subscription changed.");
        await Promise.all([loadTab({ silent: true }), loadFoundation({ force: true })]);
        return;
      }
      const ready = await loadRazorpayScript();
      if (!ready || !window.Razorpay) throw new Error("Razorpay checkout failed to load.");
      await new Promise((resolve, reject) => {
        const checkout = new window.Razorpay({
          key: order.key,
          amount: order.amount,
          currency: order.currency,
          name: "Influencer Commerce",
          description: "Subscription change",
          order_id: order.razorpayOrderId || order.orderId,
          handler: async (paymentResult) => {
            try {
              await confirmVendorInfluencerSubscriptionChange({
                razorpay_order_id: paymentResult.razorpay_order_id,
                razorpay_payment_id: paymentResult.razorpay_payment_id,
                razorpay_signature: paymentResult.razorpay_signature,
              });
              resolve();
            } catch (verifyError) {
              reject(verifyError);
            }
          },
          modal: { ondismiss: () => reject(new Error("Payment cancelled.")) },
          theme: { color: "#4f46e5" },
        });
        checkout.open();
      });
      setPlanChangePreview(null);
      setMessage("Subscription changed.");
      await Promise.all([loadTab({ silent: true }), loadFoundation({ force: true })]);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Subscription change failed.");
    } finally {
      setBusyId("");
    }
  }

  async function refreshAll() {
    setMessage("");
    setError("");
    try {
      await Promise.all([loadFoundation({ force: true }), loadTab()]);
      setMessage("Influencer commerce data refreshed.");
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to refresh influencer commerce data.");
    }
  }

  function openCampaignBuilder({ influencer, influencerId = "", productId = "", preserveProduct = true, preserveInfluencer = true } = {}) {
    const nextInfluencerId = String(influencerId || influencerRowId(influencer) || (preserveInfluencer ? filters.influencerId : ""));
    const nextProductId = String(productId || (preserveProduct ? filters.productId : ""));
    const normalized = normalizeInfluencerOption(influencer ? { ...influencer, influencerId: nextInfluencerId } : {});
    if (normalized) setSelectedInvite(normalized);
    setFilters((current) => ({
      ...current,
      influencerId: nextInfluencerId,
      productId: nextProductId,
      page: 1,
    }));
    navigate(campaignBuilderPath({ influencerId: nextInfluencerId, productId: nextProductId }));
  }

  function startCampaignInvite(row, notes) {
    const influencerId = influencerRowId(row);
    if (!influencerId) {
      setError("Influencer not found.");
      return;
    }
    setError("");
    setMessage("Influencer selected. Create a campaign to send the invite.");
    openCampaignBuilder({ influencer: row, influencerId });
    updateVendorInfluencerRelationship(influencerId, { status: "invited", notes }).catch(() => {});
  }

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-200">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Existing influencer commerce stack
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">Influencer Commerce</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
              Campaign collaboration, affiliate promotion, content approvals, attribution, commissions, payouts, and performance data powered by the existing campaign, content, wallet, notification, and commission systems.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={refreshAll} disabled={loading || Boolean(busyId)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Refresh
            </button>
            <button type="button" onClick={() => navigate("/vendor/products/create")} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Product
            </button>
            <button type="button" onClick={() => navigate(TAB_PATHS.campaigns)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950">
              <Megaphone className="h-4 w-4" aria-hidden="true" />
              New Campaign
            </button>
          </div>
        </div>
      </section>

      <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900" aria-label="Influencer commerce sections">
        {TABS.map(([id, label, Icon]) => {
          const active = id === tab;
          return (
            <button
              key={id}
              type="button"
              onClick={() => navigate(TAB_PATHS[id])}
              className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${active ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}
            >
              {createElement(Icon, { className: "h-4 w-4", "aria-hidden": "true" })}
              {label}
            </button>
          );
        })}
      </nav>

      <Filters filters={filters} setFilters={setFilters} campaigns={campaigns} products={products} configuration={data.configuration || {}} tab={tab} includeSearch={!["dashboard", "subscription"].includes(tab)} />

      {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100">{message}</div> : null}
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100">{error}</div> : null}
      {planChangePreview ? <Suspense fallback={null}><SubscriptionChangeModal preview={planChangePreview} busy={Boolean(busyId)} onClose={() => setPlanChangePreview(null)} onConfirm={confirmSubscriptionChange} /></Suspense> : null}
      <Suspense fallback={null}>
        <CampaignPaymentModal
          isOpen={Boolean(campaignPayment)}
          onClose={() => setCampaignPayment(null)}
          campaign={campaignPayment?.campaign}
          fundingSummary={campaignPayment?.fundingSummary}
          paymentData={campaignPayment?.paymentOrder}
          onCreatePaymentOrder={createCampaignPaymentOrder}
          onPaymentSuccess={verifyCampaignPayment}
          onPaymentError={(err) => setError(err?.response?.data?.message || err?.message || "Payment failed.")}
          isLoading={busyId === "verify-campaign-payment"}
        />
      </Suspense>

      {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">Loading influencer commerce...</div> : null}

      <Suspense fallback={<TabFallback />}>
        {tab === "dashboard" ? <DashboardView dashboard={data.dashboard} /> : null}
      {tab === "discover" ? (
        <DiscoverView
          rows={discovery}
          pagination={data.discover?.pagination}
          subscriptionData={data.subscription}
          busyId={busyId}
          onSubscribe={purchaseSubscription}
          onPage={(page) => setFilters((current) => ({ ...current, page }))}
          onSave={(row) => {
            const influencerId = influencerRowId(row);
            return runAction(`save-${influencerId}`, () => saveVendorInfluencer(influencerId, !row.saved), row.saved ? "Influencer removed from saved list." : "Influencer saved.");
          }}
          onVisit={visitInfluencerProfile}
          onInvite={(row) => startCampaignInvite(row, "Invited from influencer discovery.")}
        />
      ) : null}
      {tab === "subscription" ? (
        <SubscriptionView
          data={data.subscription}
          busyId={busyId}
          onSubscribe={purchaseSubscription}
          onCancel={() => runAction("cancel-subscription", () => cancelVendorInfluencerSubscription(), "Subscription cancelled.")}
        />
      ) : null}
      {tab === "relationships" ? (
        <RelationshipsView
          rows={relationships}
          pagination={data.relationships?.pagination}
          busyId={busyId}
          onPage={(page) => setFilters((current) => ({ ...current, page }))}
          onInvite={(row) => startCampaignInvite(row, "Invited from relationship management.")}
          onStatus={(row, status) => runAction(influencerRowId(row), () => updateVendorInfluencerRelationship(influencerRowId(row), { status }), "Relationship updated.")}
        />
      ) : null}
      {tab === "campaigns" ? <CampaignsView campaigns={campaigns} pagination={data.campaigns?.pagination} products={products} influencers={campaignInfluencers} configuration={data.configuration || {}} selectedInfluencerId={filters.influencerId} selectedProductIds={filters.productId ? [filters.productId] : []} busyId={busyId} onPage={(page) => setFilters((current) => ({ ...current, page }))} onCreate={createCampaign} onReview={(campaign, application, decision) => runAction(`${campaign._id}-${application.influencerId}`, () => reviewVendorCampaignApplication(campaign._id, application.influencerId, { decision }), "Campaign application reviewed.")} onStatus={(campaign, action) => runAction(campaign._id, () => updateVendorInfluencerCampaignStatus(campaign._id, { action }), "Campaign status updated.")} onFund={openCampaignFunding} onDelete={(campaign) => runAction(`delete-${campaign._id}`, () => deleteVendorInfluencerCampaign(campaign._id), "Campaign deleted.")} /> : null}
      {tab === "content" ? (
        <ContentView
          rows={data.content?.items || []}
          pagination={data.content?.pagination}
          busyId={busyId}
          onPage={(page) => setFilters((current) => ({ ...current, page }))}
          onView={(row) => {
            const url = resolveApiAssetUrl(row.url);
            if (url) window.open(url, "_blank", "noopener,noreferrer");
          }}
          onReview={async (row, decision) => {
            const note = decision === "changes" ? "Please update this content and resubmit." : "";
            if (row.source === "deliverable_execution") {
              const apiDecision = decision === "changes" ? "revision_requested" : decision;
              let schedule = {};
              if (apiDecision === "approve") {
                const defaultDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
                const publishDate = await requestInput({ title: "Schedule publish", label: "Publish date (YYYY-MM-DD)", defaultValue: defaultDate, required: true });
                if (!publishDate) return null;
                const publishTime = await requestInput({ title: "Schedule publish", label: "Publish time (HH:mm, 24-hour)", defaultValue: "10:00", required: true });
                if (!publishTime) return null;
                schedule = {
                  publishDate,
                  publishTime,
                  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
                };
              }
              return runAction(row.id, () => reviewCampaignExecutionDeliverable(row.campaignId, row.deliverableId, { submissionId: row.submissionId, decision: apiDecision, comments: note, ...schedule }), "Deliverable review synchronized.");
            }
            return runAction(row.id, () => reviewVendorInfluencerContent(row.id, { decision, note }), "Content review synchronized.");
          }}
        />
      ) : null}
      {tab === "performance" ? (
        <PerformanceView
          rows={data.performance?.items || []}
          summary={data.performance?.summary}
          pagination={data.performance?.pagination}
          busyId={busyId}
          onPage={(page) => setFilters((current) => ({ ...current, page }))}
          onCampaign={(row) => {
            openCampaignBuilder({ influencer: row, influencerId: influencerRowId(row) });
          }}
        />
      ) : null}
      {tab === "escrow-refunds" ? (
        <VendorEscrowRefundsView
          data={data["escrow-refunds"]}
          onView={openEscrowRefundDetail}
        />
      ) : null}
      </Suspense>
      <Suspense fallback={null}>
        <VendorEscrowRefundDetailModal
          state={escrowRefundDetail}
          onClose={() => setEscrowRefundDetail({ open: false, loading: false, data: null })}
        />
      </Suspense>
    </div>
  );
}
