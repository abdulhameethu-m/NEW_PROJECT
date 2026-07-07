import { createElement, useState } from "react";
import { CheckCircle2, CreditCard, Crown, FileCheck2, Gem, HelpCircle, Medal, RefreshCw, ShieldCheck, Star, Tag, Users, Zap } from "lucide-react";
import { formatCurrency } from "../../utils/formatCurrency";
import { clampPercent, numberValue, ResponsiveTable, Section, StatusBadge } from "./VendorInfluencerShared";

function planIcon(plan = {}) {
  const key = String(plan.metadata?.iconKey || "").toLowerCase();
  if (key === "crown") return Crown;
  if (key === "gem") return Gem;
  if (key === "star") return Star;
  if (key === "medal") return Medal;
  if (key === "card") return CreditCard;
  const name = String(plan.planName || plan).toLowerCase();
  if (name.includes("platinum")) return Crown;
  if (name.includes("diamond")) return Gem;
  if (name.includes("gold")) return Star;
  if (name.includes("silver")) return Medal;
  return Zap;
}

function planTone(plan = {}) {
  const tones = {
    violet: { ring: "border-violet-200", icon: "bg-violet-100 text-violet-700", button: "bg-violet-600 hover:bg-violet-500 text-white", accent: "text-violet-600" },
    sky: { ring: "border-sky-200", icon: "bg-sky-100 text-sky-700", button: "border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50", accent: "text-sky-600" },
    amber: { ring: "border-amber-300 shadow-amber-100", icon: "bg-amber-100 text-amber-700", button: "bg-indigo-600 hover:bg-indigo-500 text-white", accent: "text-amber-600" },
    slate: { ring: "border-slate-200", icon: "bg-slate-100 text-slate-500", button: "border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50", accent: "text-slate-500" },
    emerald: { ring: "border-emerald-200", icon: "bg-emerald-100 text-emerald-700", button: "bg-emerald-600 hover:bg-emerald-500 text-white", accent: "text-emerald-600" },
    indigo: { ring: "border-slate-200", icon: "bg-indigo-50 text-indigo-600", button: "bg-slate-100 text-indigo-700", accent: "text-indigo-600" },
  };
  const configured = tones[String(plan.metadata?.theme || "").toLowerCase()];
  if (configured) return configured;
  const name = String(plan.planName || plan).toLowerCase();
  if (name.includes("platinum")) return tones.violet;
  if (name.includes("diamond")) return tones.sky;
  if (name.includes("gold")) return tones.amber;
  if (name.includes("silver")) return tones.slate;
  return { ring: "border-slate-200", icon: "bg-indigo-50 text-indigo-600", button: "bg-slate-100 text-indigo-700", accent: "text-indigo-600" };
}

function planDescription(plan = {}) {
  if (plan.description) return plan.description;
  if (plan.metadata?.cardDescription) return plan.metadata.cardDescription;
  const name = String(plan.planName || "").toLowerCase();
  if (name.includes("platinum")) return "For large brands and agencies needing premium capabilities.";
  if (name.includes("diamond")) return "For established brands running high-volume campaigns.";
  if (name.includes("gold")) return "For scaling businesses looking to maximize influencer reach and performance.";
  if (name.includes("silver")) return "For growing businesses running consistent campaigns.";
  return "For individuals getting started with influencer marketing.";
}

function planBenefits(plan = {}) {
  if (Array.isArray(plan.metadata?.cardBenefits) && plan.metadata.cardBenefits.length) return plan.metadata.cardBenefits.filter(Boolean);
  const benefits = [
    `${plan.campaignLimit < 0 ? "Unlimited" : numberValue(plan.campaignLimit || 0)} Active Campaign${Number(plan.campaignLimit) === 1 ? "" : "s"}`,
    `${plan.influencerVisibilityLimit < 0 ? "Unlimited" : `Discover up to ${numberValue(plan.influencerVisibilityLimit || 0)}`} Influencers`,
    plan.allowAllTiers ? "Access to All Tiers" : `Access to ${plan.planName || "Configured"} Tier`,
    plan.advancedAnalytics ? "Advanced Analytics" : "Basic Analytics",
    plan.prioritySupport ? "Priority Support" : "Email Support",
    plan.featuredCampaigns ? "Featured Campaigns" : "Standard Visibility",
    plan.metadata?.campaignBoost ? "Campaign Boost" : "",
    plan.dedicatedManager ? "Dedicated Account Manager" : "",
    plan.autoRenewAllowed ? "Auto Renew Available" : "",
  ].filter(Boolean);
  return benefits;
}

function ProgressLine({ value, tone = "bg-indigo-500" }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${clampPercent(value)}%` }} />
    </div>
  );
}

function planBillingPrice(plan = {}, billingCycle = "monthly") {
  if (billingCycle === "yearly") return Number(plan.yearlyPrice ?? plan.monthlyPrice ?? 0);
  if (billingCycle === "quarterly") return Number(plan.quarterlyPrice ?? Number(plan.monthlyPrice || 0) * 3);
  if (billingCycle === "half_yearly") return Number(plan.halfYearlyPrice ?? Number(plan.monthlyPrice || 0) * 6);
  if (billingCycle === "custom") return Number(plan.metadata?.customPrice ?? plan.monthlyPrice ?? 0);
  return Number(plan.monthlyPrice || 0);
}

function billingCycleLabel(cycle = "monthly") {
  if (cycle === "yearly") return "year";
  if (cycle === "quarterly") return "quarter";
  if (cycle === "half_yearly") return "half year";
  if (cycle === "custom") return "term";
  return "month";
}

function SubscriptionView({ data = {}, busyId, onSubscribe, onCancel }) {
  const payments = data.payments || [];
  const invoices = data.invoices || [];

  return (
    <div className="grid gap-5">
      <PremiumSubscriptionPlans data={data} busyId={busyId} onSubscribe={onSubscribe} onCancel={onCancel} showCancel />

      <div className="grid gap-5 xl:grid-cols-2">
        <Section title="Payment History" icon={CreditCard}>
          <ResponsiveTable
            headers={["Plan", "Amount", "Status", "Payment", "Date"]}
            rows={payments}
            renderRow={(payment) => (
              <tr key={payment._id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-3 py-3 font-semibold">{payment.metadata?.planName || payment.planId?.planName || "-"}</td>
                <td className="px-3 py-3">{formatCurrency(payment.amount || 0, { currency: payment.currency })}</td>
                <td className="px-3 py-3"><StatusBadge value={payment.status} /></td>
                <td className="px-3 py-3">{payment.razorpayPaymentId || payment.razorpayOrderId || "-"}</td>
                <td className="px-3 py-3">{payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : "-"}</td>
              </tr>
            )}
          />
        </Section>
        <Section title="Invoices" icon={FileCheck2}>
          <ResponsiveTable
            headers={["Invoice", "Amount", "Status", "Date"]}
            rows={invoices}
            renderRow={(invoice) => (
              <tr key={invoice.invoiceId} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-3 py-3 font-semibold">{invoice.invoiceId}</td>
                <td className="px-3 py-3">{formatCurrency(invoice.amount || 0, { currency: invoice.currency })}</td>
                <td className="px-3 py-3"><StatusBadge value={invoice.status} /></td>
                <td className="px-3 py-3">{invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : "-"}</td>
              </tr>
            )}
          />
        </Section>
      </div>
    </div>
  );
}

function PremiumSubscriptionPlans({ data = {}, busyId, onSubscribe, onCancel, showCancel = false }) {
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [today] = useState(() => Date.now());
  const current = data.currentSubscription || {};
  const currentPlan = current.planId || {};
  const plans = data.plans || [];
  const copySourcePlan = currentPlan?._id ? currentPlan : plans.find((plan) => plan?.metadata && Object.keys(plan.metadata).length) || {};
  const usage = data.usage || {};
  const hasActiveSubscription = Boolean(current?._id && ["active", "trialing", "grace_period"].includes(String(current.status || "").toLowerCase()));
  const currentPlanId = hasActiveSubscription ? String(currentPlan._id || current.planId || "") : "";
  const currentBillingCycle = current.billingCycle || "monthly";
  const activeCampaigns = Number(usage.activeCampaigns || 0);
  const campaignLimit = hasActiveSubscription ? Number(usage.campaignLimit ?? current.campaignLimit ?? currentPlan.campaignLimit ?? 0) : 0;
  const visibilityLimit = hasActiveSubscription ? Number(usage.visibilityLimit ?? current.visibilityLimit ?? currentPlan.influencerVisibilityLimit ?? 0) : 0;
  const influencersVisible = hasActiveSubscription ? Number(usage.influencersVisible || 0) : 0;
  const campaignProgress = campaignLimit < 0 ? 42 : campaignLimit ? (activeCampaigns / campaignLimit) * 100 : 0;
  const visibleProgress = visibilityLimit < 0 ? 68 : visibilityLimit ? (influencersVisible / visibilityLimit) * 100 : 0;
  const benefitCount = hasActiveSubscription ? planBenefits(currentPlan).filter(Boolean).length : 0;
  const meta = copySourcePlan.metadata || {};
  const copy = (key, fallback) => meta[key] || fallback;
  const remainingCampaigns = Math.max(0, campaignLimit - activeCampaigns);
  const campaignRemainingLabel = remainingCampaigns === 1 ? copy("campaignRemainingSingular", "campaign remaining") : copy("campaignRemainingPlural", "campaigns remaining");
  const renewDate = current.endDate ? new Date(current.endDate).toLocaleDateString() : "";
  const startDate = current.startDate ? new Date(current.startDate).toLocaleDateString() : "";
  const daysRemaining = current.endDate ? Math.max(0, Math.ceil((new Date(current.endDate).getTime() - today) / 86400000)) : 0;

  return (
    <section className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-950 dark:text-white">{copy("summaryTitle", "Subscription Plans")}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy("summarySubtitle", "Choose a plan that fits your business needs. Upgrade anytime to unlock more features.")}</p>
        </div>
        <button type="button" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
          <HelpCircle className="h-4 w-4" />
          {copy("helpLabel", "How Subscriptions Work?")}
        </button>
      </div>

      <div className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 xl:grid-cols-[1.05fr_1.25fr_1.25fr_1.25fr_auto]">
        <div className="border-slate-200 xl:border-r xl:pr-5 dark:border-slate-800">
          <p className="text-xs font-semibold text-indigo-600">{copy("currentPlanLabel", "Current Plan")}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h3 className="text-2xl font-semibold text-slate-950 dark:text-white">{hasActiveSubscription ? currentPlan.planName : "No Active Subscription"}</h3>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${hasActiveSubscription ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{hasActiveSubscription ? copy("activeStatusLabel", "Active") : "Inactive"}</span>
          </div>
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{hasActiveSubscription && renewDate ? `${copy("renewPrefix", "Your plan renews on")} ${renewDate}` : "Choose a plan to activate influencer commerce."}</p>
          {hasActiveSubscription ? <p className="mt-2 text-xs font-semibold text-slate-500">Start: {startDate || "-"} · End: {renewDate || "-"} · {daysRemaining} days remaining</p> : null}
        </div>

        <PlanUsageTile icon={CreditCard} label={copy("campaignsLabel", "Campaigns")} value={`${numberValue(activeCampaigns)} / ${campaignLimit < 0 ? "Unlimited" : numberValue(campaignLimit)}`} progress={campaignProgress} hint={campaignLimit < 0 ? copy("campaignUnlimitedHint", "Unlimited campaigns") : `${remainingCampaigns} ${campaignRemainingLabel}`} tone="bg-indigo-300" iconClass="bg-indigo-100 text-indigo-700" />
        <PlanUsageTile icon={Users} label={copy("influencersLabel", "Influencers Visible")} value={`${visibilityLimit < 0 ? numberValue(influencersVisible) : numberValue(influencersVisible)} / ${visibilityLimit < 0 ? "Unlimited" : numberValue(visibilityLimit)}`} progress={visibleProgress} hint={visibilityLimit < 0 ? copy("visibilityUnlimitedHint", "Unlimited visibility") : influencersVisible >= visibilityLimit ? copy("visibilityLimitHint", "Limit reached") : copy("visibilityAvailableHint", "Visibility available")} tone="bg-emerald-400" iconClass="bg-emerald-100 text-emerald-700" />
        <PlanUsageTile icon={Crown} label={copy("benefitsLabel", "Plan Benefits")} value={hasActiveSubscription ? `${benefitCount} / ${Math.max(benefitCount, planBenefits(currentPlan).length || 6)}` : "0"} progress={hasActiveSubscription ? (benefitCount / Math.max(benefitCount, planBenefits(currentPlan).length || 6)) * 100 : 0} hint={hasActiveSubscription ? copy("benefitsHint", "Upgrade to unlock more") : "Subscribe to unlock benefits"} tone="bg-amber-300" iconClass="bg-amber-100 text-amber-700" />

        <div className="flex items-center gap-2 xl:justify-end">
          {showCancel ? (
            <button type="button" disabled={!current?._id || busyId === "cancel-subscription"} onClick={onCancel} className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200">Cancel</button>
          ) : null}
          <button type="button" onClick={() => document.getElementById("available-subscription-plans")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="h-11 rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-500">{hasActiveSubscription ? copy("upgradeCta", "Upgrade Plan") : "Choose Plan"}</button>
        </div>
      </div>

      <div id="available-subscription-plans" className="mt-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h3 className="text-xl font-semibold text-slate-950 dark:text-white">{copy("availablePlansTitle", "Available Plans")}</h3>
        <div className="inline-flex w-fit rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-950">
          <button type="button" onClick={() => setBillingCycle("monthly")} className={`h-9 rounded-lg px-4 text-sm font-semibold ${billingCycle === "monthly" ? "bg-white text-indigo-700 ring-1 ring-indigo-300 dark:bg-slate-900" : "text-slate-500"}`}>{copy("monthlyLabel", "Monthly")}</button>
          <button type="button" onClick={() => setBillingCycle("quarterly")} className={`h-9 rounded-lg px-4 text-sm font-semibold ${billingCycle === "quarterly" ? "bg-white text-indigo-700 ring-1 ring-indigo-300 dark:bg-slate-900" : "text-slate-500"}`}>Quarterly</button>
          <button type="button" onClick={() => setBillingCycle("half_yearly")} className={`h-9 rounded-lg px-4 text-sm font-semibold ${billingCycle === "half_yearly" ? "bg-white text-indigo-700 ring-1 ring-indigo-300 dark:bg-slate-900" : "text-slate-500"}`}>Half Yearly</button>
          <button type="button" onClick={() => setBillingCycle("yearly")} className={`h-9 rounded-lg px-4 text-sm font-semibold ${billingCycle === "yearly" ? "bg-white text-indigo-700 ring-1 ring-indigo-300 dark:bg-slate-900" : "text-slate-500"}`}>{copy("yearlyLabel", "Yearly")}</button>
          <span className="ml-1 inline-flex items-center rounded-lg bg-emerald-100 px-3 text-xs font-semibold text-emerald-700">{copy("savingsLabel", "Save 20%")}</span>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {plans.map((plan) => (
          <PremiumPlanCard key={plan._id} plan={plan} currentPlan={currentPlan} billingCycle={billingCycle} currentBillingCycle={currentBillingCycle} isCurrent={String(plan._id) === currentPlanId} busy={busyId === `subscribe-${plan._id}` || busyId === `preview-${plan._id}`} disabled={Boolean(busyId)} onSubscribe={onSubscribe} />
        ))}
      </div>

      <div className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 md:grid-cols-2 xl:grid-cols-4">
        <TrustTile icon={ShieldCheck} title="Secure Payments" text="100% secure payments powered by Razorpay" tone="bg-violet-100 text-violet-700" />
        <TrustTile icon={RefreshCw} title="Cancel Anytime" text="Change or cancel your plan anytime you want" tone="bg-emerald-100 text-emerald-700" />
        <TrustTile icon={Tag} title="No Hidden Charges" text="Transparent pricing with no hidden fees" tone="bg-sky-100 text-sky-700" />
        <TrustTile icon={CreditCard} title="24/7 Support" text="Get help whenever you need it" tone="bg-rose-100 text-rose-700" />
      </div>
    </section>
  );
}

function PlanUsageTile({ icon: Icon, label, value, progress, hint, tone, iconClass }) {
  return (
    <div className="border-slate-200 xl:border-r xl:px-5 dark:border-slate-800">
      <div className="flex items-center gap-3">
        <span className={`grid h-11 w-11 place-items-center rounded-2xl ${iconClass}`}>
          {createElement(Icon, { className: "h-5 w-5" })}
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{label}</p>
          <p className="text-xl font-semibold text-slate-950 dark:text-white">{value}</p>
        </div>
      </div>
      <div className="mt-4"><ProgressLine value={progress} tone={tone} /></div>
      <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">{hint}</p>
    </div>
  );
}
function PremiumPlanCard({ plan, currentPlan = {}, billingCycle, currentBillingCycle = "monthly", isCurrent, busy, disabled, onSubscribe }) {
  const icon = createElement(planIcon(plan), { className: "h-5 w-5" });
  const tone = planTone(plan);
  const badgeText = plan.metadata?.cardBadge || (plan.metadata?.isMostPopular ? "Most Popular" : "");
  const price = planBillingPrice(plan, billingCycle);
  const customPricing = Boolean(plan.metadata?.customPricing);
  const sameCycle = isCurrent && billingCycle === currentBillingCycle;
  const currentRank = Number(currentPlan.displayOrder ?? currentPlan.monthlyPrice ?? 0);
  const targetRank = Number(plan.displayOrder ?? plan.monthlyPrice ?? 0);
  const hasCurrentPlan = Boolean(currentPlan?._id);
  const changeLabel = !hasCurrentPlan ? "Subscribe Now" : isCurrent ? "Upgrade Billing Cycle" : targetRank < currentRank || planBillingPrice(plan, billingCycle) < planBillingPrice(currentPlan, currentBillingCycle) ? "Downgrade Plan" : "Upgrade Plan";
  const ctaLabel = sameCycle ? "Current Plan" : plan.metadata?.ctaLabel || (customPricing ? "Contact Sales" : changeLabel);
  const chips = [
    plan.metadata?.isMostPopular ? "Most Popular" : "",
    customPricing ? "Custom Pricing" : "",
    plan.autoRenewAllowed ? "Auto Renew" : "",
    plan.allowAllTiers ? "All Tiers" : "",
    plan.prioritySupport ? "Priority" : "",
  ].filter(Boolean);

  return (
    <article className={`relative flex min-h-[465px] flex-col rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl dark:bg-slate-950 ${tone.ring}`}>
      {badgeText ? <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-100 px-4 py-1 text-xs font-semibold text-amber-800 shadow-sm">{badgeText}</span> : null}
      <div className="flex items-start gap-3">
        <span className={`grid h-10 w-10 place-items-center rounded-2xl ${tone.icon}`}>
          {icon}
        </span>
        <div>
          <h4 className="text-lg font-semibold text-slate-950 dark:text-white">{plan.planName}</h4>
          <p className="mt-3 min-h-16 text-sm leading-6 text-slate-600 dark:text-slate-300">{planDescription(plan)}</p>
        </div>
      </div>

      {chips.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span key={chip} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone.icon}`}>{chip}</span>
          ))}
        </div>
      ) : null}

      <div className="mt-5">
        {customPricing ? (
          <>
            <p className="text-2xl font-semibold text-slate-950 dark:text-white">{plan.metadata?.customPricingLabel || "Custom Pricing"}</p>
            <p className="mt-1 text-sm text-slate-500">{plan.metadata?.customPricingSubtext || "Contact for pricing"}</p>
          </>
        ) : (
          <p className="text-3xl font-semibold text-slate-950 dark:text-white">
            {formatCurrency(price)}
            <span className="text-sm font-medium text-slate-500"> / {billingCycleLabel(billingCycle)}</span>
          </p>
        )}
      </div>

      <ul className="mt-6 space-y-3 text-sm text-slate-700 dark:text-slate-200">
        {planBenefits(plan).map((benefit) => (
          <li key={benefit} className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled={sameCycle || disabled}
        onClick={() => !customPricing && onSubscribe(plan, billingCycle)}
        className={`mt-auto h-11 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-indigo-500 ${tone.button}`}
      >
        {sameCycle ? "Current Plan" : busy ? "Opening..." : ctaLabel}
      </button>
    </article>
  );
}

function TrustTile({ icon: Icon, title, text, tone }) {
  return (
    <div className="flex items-center gap-4 border-slate-200 xl:border-r xl:last:border-r-0 dark:border-slate-800">
      <span className={`grid h-14 w-14 flex-shrink-0 place-items-center rounded-full ${tone}`}>
        {createElement(Icon, { className: "h-6 w-6" })}
      </span>
      <div>
        <p className="font-semibold text-slate-950 dark:text-white">{title}</p>
        <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">{text}</p>
      </div>
    </div>
  );
}

export { PremiumSubscriptionPlans };
export default SubscriptionView;
