import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BarChart3, Calculator, CheckCircle2, Package, Pencil, ShieldCheck, SlidersHorizontal, Trash2, WalletCards, Power, PowerOff, XCircle } from "lucide-react";
import { createInfluencerCommerceConfig, deleteInfluencerCommerceConfig, updateAdminInfluencerSettings, updateInfluencerCommerceConfig } from "../../services/adminInfluencerCommerceService";
import { formatCurrency } from "../../utils/formatCurrency";
import { ActionButton, FieldShell, numberValue, Pagination, ResponsiveTable, Section, shortText, StatusBadge } from "./AdminInfluencerCommerceShared";

const defaultScoreForm = {
  followersWeight: 30,
  engagementWeight: 25,
  conversionWeight: 20,
  completionWeight: 15,
  revenueWeight: 10,
  reason: "Updated from admin configuration engine",
  approval: { status: "active" },
};

const defaultRankingForm = {
  scoreWeight: 35,
  revenueWeight: 20,
  ordersWeight: 10,
  conversionWeight: 15,
  campaignSuccessWeight: 10,
  storefrontRevenueWeight: 5,
  engagementWeight: 5,
  followersWeight: 5,
  reason: "Updated from admin configuration engine",
  approval: { status: "active" },
};

function ConfigInput({ label, value, onChange, type = "number" }) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(type === "number" ? Number(event.target.value) : event.target.value)}
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      />
    </label>
  );
}

function ConfigTextarea({ label, value, onChange, placeholder = "", rows = 4 }) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="min-h-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-950 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      />
    </label>
  );
}

function ConfigSelect({ label, value, onChange, options = [] }) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function ConfigCheckbox({ label, checked, onChange }) {
  return (
    <label className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
      <input type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

function weightTotal(form, keys) {
  return keys.reduce((sum, key) => sum + Number(form[key] || 0), 0);
}

const PAYMENT_MODEL_OPTIONS = [
  { value: "fixed", label: "Fixed" },
  { value: "commission", label: "Commission" },
  { value: "hybrid", label: "Hybrid" },
  { value: "free_product", label: "Free Product" },
];

const COMMERCE_EDITOR_DEFS = {
  serviceTypes: {
    title: "Service Types",
    defaults: { key: "", label: "", description: "", group: "content", defaultCurrency: "INR", defaultDeliveryDays: 3, defaultRevisionCount: 1, displayOrder: 0 },
    fields: [
      { key: "key", label: "Key", type: "text" },
      { key: "label", label: "Label", type: "text" },
      { key: "group", label: "Group", type: "text" },
      { key: "defaultCurrency", label: "Currency", type: "text" },
      { key: "defaultDeliveryDays", label: "Delivery Days", type: "number" },
      { key: "defaultRevisionCount", label: "Revisions", type: "number" },
      { key: "displayOrder", label: "Display Order", type: "number" },
      { key: "description", label: "Description", type: "textarea" },
    ],
    detail: (row) => `${row.group || "content"} - ${row.defaultCurrency || "INR"} - ${numberValue(row.defaultDeliveryDays)}d`,
  },
  packageTemplates: {
    title: "Package Templates",
    defaults: { key: "", label: "", serviceTypeKey: "", packageName: "", quantity: 1, defaultDeliveryDays: 3, defaultRevisionCount: 1, displayOrder: 0 },
    fields: [
      { key: "key", label: "Key", type: "text" },
      { key: "label", label: "Label", type: "text" },
      { key: "serviceTypeKey", label: "Service Type Key", type: "text" },
      { key: "packageName", label: "Package Name", type: "text" },
      { key: "quantity", label: "Quantity", type: "number" },
      { key: "defaultDeliveryDays", label: "Delivery Days", type: "number" },
      { key: "defaultRevisionCount", label: "Revisions", type: "number" },
      { key: "displayOrder", label: "Display Order", type: "number" },
      { key: "description", label: "Description", type: "textarea" },
    ],
    detail: (row) => `${row.serviceTypeKey || "all services"} - ${numberValue(row.quantity || 1)} deliverable${Number(row.quantity || 1) === 1 ? "" : "s"}`,
  },
  categoryOptions: {
    title: "Category Options",
    defaults: { key: "", label: "", description: "", displayOrder: 0 },
    fields: [
      { key: "key", label: "Key", type: "text" },
      { key: "label", label: "Label", type: "text" },
      { key: "displayOrder", label: "Display Order", type: "number" },
      { key: "description", label: "Description", type: "textarea" },
    ],
    detail: (row) => row.description || "Discovery and requirement category",
  },
  languageOptions: {
    title: "Language Options",
    defaults: { key: "", label: "", description: "", displayOrder: 0 },
    fields: [
      { key: "key", label: "Key", type: "text" },
      { key: "label", label: "Label", type: "text" },
      { key: "displayOrder", label: "Display Order", type: "number" },
      { key: "description", label: "Description", type: "textarea" },
    ],
    detail: (row) => row.description || "Creator language filter option",
  },
  attributionWindows: {
    title: "Attribution Windows",
    defaults: { key: "", label: "", days: 30, customAllowed: false, minDays: 1, maxDays: 365, displayOrder: 0 },
    fields: [
      { key: "key", label: "Key", type: "text" },
      { key: "label", label: "Label", type: "text" },
      { key: "days", label: "Days", type: "number" },
      { key: "minDays", label: "Min Days", type: "number" },
      { key: "maxDays", label: "Max Days", type: "number" },
      { key: "displayOrder", label: "Display Order", type: "number" },
      { key: "customAllowed", label: "Custom Allowed", type: "checkbox" },
    ],
    detail: (row) => row.customAllowed ? `${row.minDays || 1}-${row.maxDays || row.days || 365} days` : `${row.days || 0} days`,
  },
  paymentModels: {
    title: "Payment Models",
    defaults: { key: "commission", label: "", description: "", requiresFixedFee: false, requiresCommission: true, requiresAttributionWindow: true, requiresProduct: false, budgetComponents: [], displayOrder: 0 },
    fields: [
      { key: "key", label: "Key", type: "select", options: PAYMENT_MODEL_OPTIONS },
      { key: "label", label: "Label", type: "text" },
      { key: "budgetComponents", label: "Budget Components", type: "csv" },
      { key: "displayOrder", label: "Display Order", type: "number" },
      { key: "requiresFixedFee", label: "Requires Fixed Fee", type: "checkbox" },
      { key: "requiresCommission", label: "Requires Commission", type: "checkbox" },
      { key: "requiresAttributionWindow", label: "Requires Attribution", type: "checkbox" },
      { key: "requiresProduct", label: "Requires Product", type: "checkbox" },
      { key: "description", label: "Description", type: "textarea" },
    ],
    detail: (row) => (row.budgetComponents || []).join(", ") || "No budget components",
  },
};

const defaultSchedulingForm = {
  minimumCampaignLeadTimeDays: 3,
  minimumPublishNoticeHours: 0,
  autoPublish: false,
  enableDeadlineReminders: true,
  autoExpireDeliverables: true,
  autoExpireCampaign: true,
  enableEscrowRefund: true,
  gracePeriodHours: 0,
};

function schedulingFormFromSettings(settings = {}) {
  return {
    ...defaultSchedulingForm,
    ...settings,
  };
}

const ADVANCED_CONFIG_ENTITIES = [
  { entityType: "campaignTypes", label: "Campaign Types" },
  { entityType: "paymentModelOptions", label: "Payment Model Options" },
  { entityType: "campaignPaymentRules", label: "Campaign Payment Rules" },
  { entityType: "campaignDynamicFields", label: "Campaign Dynamic Fields" },
  { entityType: "campaignValidationRules", label: "Campaign Validation Rules" },
  { entityType: "campaignTemplates", label: "Campaign Templates" },
  { entityType: "discoveryRules", label: "Discovery Rules" },
  { entityType: "campaignRules", label: "Campaign Rules" },
  { entityType: "dynamicFormFields", label: "Dynamic Form Fields" },
];

function splitConfigList(value) {
  if (Array.isArray(value)) return value;
  return String(value || "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function withoutSystemFields(row = {}) {
  const copy = { ...row };
  delete copy._id;
  delete copy.__v;
  delete copy.createdAt;
  delete copy.updatedAt;
  return copy;
}

function configLabel(row = {}) {
  return row.tierName || row.planName || row.name || row.label || row.field?.label || row.fieldName || row.ruleName || row.slug || row.key || "Configuration";
}

function isConfigActive(row = {}) {
  return String(row.approval?.status || row.status || "active").toLowerCase() === "active";
}

function configTogglePayload(row = {}, nextActive) {
  const nextStatus = nextActive ? "active" : "inactive";
  const reason = `${nextActive ? "Enabled" : "Disabled"} from admin commerce configuration`;
  const payload = { approval: { status: nextStatus, reason }, reason };
  if (["active", "inactive"].includes(String(row.status || "").toLowerCase())) payload.status = nextStatus;
  return payload;
}

function ConfigToggleButton({ entityType, row = {}, runAction, busyId, label }) {
  const id = row._id;
  if (!id) return null;
  const active = isConfigActive(row);
  const nextActive = !active;
  const name = label || configLabel(row);
  return (
    <ActionButton
      tone={active ? "amber" : "green"}
      icon={active ? XCircle : CheckCircle2}
      disabled={Boolean(busyId)}
      onClick={() => runAction(
        `toggle-${entityType}-${id}`,
        () => updateInfluencerCommerceConfig(entityType, id, configTogglePayload(row, nextActive)),
        `${name} ${nextActive ? "enabled" : "disabled"}.`
      )}
    >
      {active ? "Disable" : "Enable"}
    </ActionButton>
  );
}

function CommerceEntityEditor({ entityType, rows = [], def, runAction, busyId, archiveConfig }) {
  const blankForm = useMemo(() => ({ ...def.defaults, displayOrder: rows.length + 1, approval: { status: "active" }, reason: "Updated from admin commerce configuration" }), [def.defaults, rows.length]);
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState("");

  const reset = () => {
    setEditingId("");
    setForm(blankForm);
  };

  const edit = (row) => {
    const next = { ...blankForm, ...withoutSystemFields(row), approval: { status: row.approval?.status || "active" }, reason: "Updated from admin commerce configuration" };
    def.fields.forEach((field) => {
      if (field.type === "csv") next[field.key] = Array.isArray(row[field.key]) ? row[field.key].join(", ") : row[field.key] || "";
    });
    setEditingId(row._id);
    setForm(next);
  };

  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const payload = () => {
    const next = { ...form, approval: form.approval || { status: "active" }, reason: form.reason || "Updated from admin commerce configuration" };
    def.fields.forEach((field) => {
      if (field.type === "csv") next[field.key] = splitConfigList(next[field.key]);
    });
    return next;
  };

  const save = async () => {
    const body = payload();
    const success = await runAction(
      editingId ? `update-${entityType}-${editingId}` : `create-${entityType}`,
      () => editingId ? updateInfluencerCommerceConfig(entityType, editingId, body) : createInfluencerCommerceConfig(entityType, body),
      editingId ? `${def.title} updated.` : `${def.title} created.`
    );
    if (success) reset();
  };

  return (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{def.title}</h3>
        {editingId ? <ActionButton tone="slate" onClick={reset}>Cancel</ActionButton> : null}
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {def.fields.map((field) => {
          if (field.type === "checkbox") return <ConfigCheckbox key={field.key} label={field.label} checked={form[field.key]} onChange={(value) => updateField(field.key, value)} />;
          if (field.type === "select") return <ConfigSelect key={field.key} label={field.label} value={form[field.key] || ""} onChange={(value) => updateField(field.key, value)} options={field.options} />;
          if (field.type === "textarea") return <div key={field.key} className="md:col-span-2"><ConfigTextarea label={field.label} value={form[field.key] || ""} onChange={(value) => updateField(field.key, value)} /></div>;
          return <ConfigInput key={field.key} type={field.type === "number" ? "number" : "text"} label={field.label} value={form[field.key] ?? ""} onChange={(value) => updateField(field.key, value)} />;
        })}
      </div>
      <div className="mt-3 flex justify-end">
        <ActionButton icon={CheckCircle2} disabled={Boolean(busyId) || !form.key || !form.label} onClick={save}>{editingId ? "Update" : "Create"}</ActionButton>
      </div>
      <div className="mt-4">
        <ResponsiveTable headers={["Name", "Key", "Details", "Order", "Status", "Actions"]} rows={rows} renderRow={(row) => (
          <tr key={row._id || row.key}>
            <td className="px-3 py-3 font-semibold text-slate-950 dark:text-white">{row.label || row.key}</td>
            <td className="px-3 py-3 text-slate-500">{row.key}</td>
            <td className="px-3 py-3 text-slate-500">{def.detail(row)}</td>
            <td className="px-3 py-3">{numberValue(row.displayOrder)}</td>
            <td className="px-3 py-3"><StatusBadge value={row.approval?.status} /></td>
            <td className="px-3 py-3">
              <div className="flex flex-wrap gap-2">
                <ActionButton tone="slate" icon={Pencil} disabled={Boolean(busyId)} onClick={() => edit(row)}>Update</ActionButton>
                <ConfigToggleButton entityType={entityType} row={row} label={row.label || row.key} runAction={runAction} busyId={busyId} />
                <ActionButton tone="red" icon={Trash2} disabled={Boolean(busyId)} onClick={() => archiveConfig(entityType, row._id, row.label || row.key)}>Delete</ActionButton>
              </div>
            </td>
          </tr>
        )} />
      </div>
    </div>
  );
}

function AdvancedConfigManager({ data, runAction, busyId, archiveConfig }) {
  const [entityType, setEntityType] = useState(ADVANCED_CONFIG_ENTITIES[0].entityType);
  const [editingId, setEditingId] = useState("");
  const [json, setJson] = useState("{}");
  const [jsonError, setJsonError] = useState("");
  const entity = ADVANCED_CONFIG_ENTITIES.find((item) => item.entityType === entityType) || ADVANCED_CONFIG_ENTITIES[0];
  const rows = data[entityType] || [];

  const reset = () => {
    setEditingId("");
    setJson("{}");
    setJsonError("");
  };

  const edit = (row) => {
    setEditingId(row._id);
    setJson(JSON.stringify({ ...withoutSystemFields(row), approval: { status: row.approval?.status || "active" }, reason: "Updated from admin advanced commerce configuration" }, null, 2));
    setJsonError("");
  };

  const save = async () => {
    let payload;
    try {
      payload = JSON.parse(json);
    } catch {
      setJsonError("Enter valid JSON before saving.");
      return;
    }
    if (!payload || Array.isArray(payload) || typeof payload !== "object") {
      setJsonError("JSON must be an object.");
      return;
    }
    payload = { ...payload, approval: payload.approval || { status: "active" }, reason: payload.reason || "Updated from admin advanced commerce configuration" };
    const label = payload.label || payload.key || entity.label;
    const success = await runAction(
      editingId ? `update-${entityType}-${editingId}` : `create-${entityType}`,
      () => editingId ? updateInfluencerCommerceConfig(entityType, editingId, payload) : createInfluencerCommerceConfig(entityType, payload),
      editingId ? `${label} updated.` : `${label} created.`
    );
    if (success) reset();
  };

  return (
    <Section title="Templates, Rules & Dynamic Fields" icon={SlidersHorizontal}>
      <div className="grid gap-3 lg:grid-cols-[240px_minmax(0,1fr)]">
        <ConfigSelect label="Configuration Type" value={entityType} onChange={(value) => { setEntityType(value); reset(); }} options={ADVANCED_CONFIG_ENTITIES.map((item) => ({ value: item.entityType, label: item.label }))} />
        <ConfigTextarea label="Configuration JSON" value={json} onChange={setJson} rows={8} />
      </div>
      {jsonError ? <p className="mt-2 text-sm font-semibold text-rose-600 dark:text-rose-300">{jsonError}</p> : null}
      <div className="mt-3 flex justify-end gap-2">
        {editingId ? <ActionButton tone="slate" onClick={reset}>Cancel</ActionButton> : null}
        <ActionButton icon={CheckCircle2} disabled={Boolean(busyId)} onClick={save}>{editingId ? "Update" : "Create"}</ActionButton>
      </div>
      <div className="mt-4">
        <ResponsiveTable headers={["Name", "Key", "Detail", "Status", "Actions"]} rows={rows} renderRow={(row) => (
          <tr key={row._id || row.key}>
            <td className="px-3 py-3 font-semibold text-slate-950 dark:text-white">{row.name || row.label || row.field?.label || row.fieldName || row.ruleName || row.key}</td>
            <td className="px-3 py-3 text-slate-500">{row.slug || row.key || row.scope || row.fieldName || "-"}</td>
            <td className="px-3 py-3 text-slate-500">{row.defaultPaymentType || row.paymentType || row.fieldType || row.field?.fieldType || row.ruleName || (row.rules ? shortText(JSON.stringify(row.rules), 46) : row.allowed !== undefined ? (row.allowed ? "Allowed" : "Blocked") : "-")}</td>
            <td className="px-3 py-3"><StatusBadge value={row.approval?.status} /></td>
            <td className="px-3 py-3">
              <div className="flex flex-wrap gap-2">
                <ActionButton tone="slate" icon={Pencil} disabled={Boolean(busyId)} onClick={() => edit(row)}>Update</ActionButton>
                <ConfigToggleButton entityType={entityType} row={row} label={row.name || row.label || row.key || row.slug || row.scope} runAction={runAction} busyId={busyId} />
                <ActionButton tone="red" icon={Trash2} disabled={Boolean(busyId)} onClick={() => archiveConfig(entityType, row._id, row.name || row.label || row.key || row.slug || row.scope)}>Delete</ActionButton>
              </div>
            </td>
          </tr>
        )} />
      </div>
    </Section>
  );
}

function CommerceConfigurationView({ data, runAction, busyId, archiveConfig }) {
  return (
    <div className="space-y-4">
      <Section title="Creator Rate Card Builder" icon={Package}>
        <div className="grid gap-4 xl:grid-cols-2">
          {Object.entries(COMMERCE_EDITOR_DEFS).map(([entityType, def]) => (
            <CommerceEntityEditor
              key={entityType}
              entityType={entityType}
              rows={data[entityType] || []}
              def={def}
              runAction={runAction}
              busyId={busyId}
              archiveConfig={archiveConfig}
            />
          ))}
        </div>
      </Section>
      <AdvancedConfigManager data={data} runAction={runAction} busyId={busyId} archiveConfig={archiveConfig} />
    </div>
  );
}

function ConfigurationEngineView({ data, runAction, busyId, confirmAdminAction }) {
  const tiers = data.tiers || [];
  const plans = data.plans || [];
  const scoreConfig = useMemo(() => data.scoreConfig || {}, [data.scoreConfig]);
  const rankingRule = useMemo(() => data.rankingRule || {}, [data.rankingRule]);
  const budgetRule = useMemo(() => data.budgetRule || {}, [data.budgetRule]);
  const schedulingSettings = useMemo(() => data.schedulingSettings || data.settings?.scheduling || {}, [data.schedulingSettings, data.settings?.scheduling]);
  const blankTierForm = { tierName: "", minScore: 0, maxScore: 100, minFollowers: 0, maxFollowers: 0, color: "#475569", priority: tiers.length + 1, displayOrder: tiers.length + 1, approval: { status: "active" }, reason: "Created from linked tier and plan configuration" };
  const blankPlanForm = {
    planName: "",
    description: "",
    monthlyPrice: 0,
    quarterlyPrice: 0,
    halfYearlyPrice: 0,
    yearlyPrice: 0,
    durationDays: 30,
    monthlyDurationDays: 30,
    quarterlyDurationDays: 90,
    halfYearlyDurationDays: 180,
    yearlyDurationDays: 365,
    customDurationDays: 30,
    autoRenewAllowed: false,
    campaignLimit: 1,
    influencerVisibilityLimit: 20,
    allowAllTiers: false,
    prioritySupport: false,
    featuredCampaigns: false,
    advancedAnalytics: false,
    dedicatedManager: false,
    displayOrder: plans.length + 1,
    approval: { status: "active" },
    metadata: {
      cardBenefitsText: "",
      cardBadge: "",
      ctaLabel: "",
      customPricing: false,
      customPricingLabel: "",
      customPricingSubtext: "",
      iconKey: "zap",
      theme: "indigo",
      isMostPopular: false,
      campaignBoost: false,
      summaryTitle: "Subscription Plans",
      summarySubtitle: "Choose a plan that fits your business needs. Upgrade anytime to unlock more features.",
      helpLabel: "How Subscriptions Work?",
      currentPlanLabel: "Current Plan",
      activeStatusLabel: "Active",
      renewPrefix: "Your plan renews on",
      readyText: "Your plan is ready to use",
      campaignsLabel: "Campaigns",
      campaignUnlimitedHint: "Unlimited campaigns",
      campaignRemainingSingular: "campaign remaining",
      campaignRemainingPlural: "campaigns remaining",
      influencersLabel: "Influencers Visible",
      visibilityUnlimitedHint: "Unlimited visibility",
      visibilityLimitHint: "Limit reached",
      visibilityAvailableHint: "Visibility available",
      benefitsLabel: "Plan Benefits",
      benefitsHint: "Upgrade to unlock more",
      upgradeCta: "Upgrade Plan",
      availablePlansTitle: "Available Plans",
      monthlyLabel: "Monthly",
      yearlyLabel: "Yearly",
      savingsLabel: "Save 20%",
    },
    reason: "Created from linked tier and plan configuration",
  };
  const [scoreForm, setScoreForm] = useState({ ...defaultScoreForm, ...scoreConfig });
  const [rankingForm, setRankingForm] = useState({ ...defaultRankingForm, ...rankingRule });
  const [tierForm, setTierForm] = useState(blankTierForm);
  const [editingTierId, setEditingTierId] = useState("");
  const [planForm, setPlanForm] = useState(blankPlanForm);
  const [editingPlanId, setEditingPlanId] = useState("");
  const [budgetForm, setBudgetForm] = useState({ warningThresholdPercent: budgetRule.warningThresholdPercent ?? 20, criticalThresholdPercent: budgetRule.criticalThresholdPercent ?? 10, pauseWhenExhausted: budgetRule.pauseWhenExhausted ?? true, approval: { status: "active" }, reason: "Updated from admin configuration engine" });
  const [schedulingForm, setSchedulingForm] = useState(() => schedulingFormFromSettings(schedulingSettings));
  const scoreKeys = ["followersWeight", "engagementWeight", "conversionWeight", "completionWeight", "revenueWeight"];
  const rankingKeys = ["scoreWeight", "revenueWeight", "ordersWeight", "conversionWeight", "campaignSuccessWeight", "storefrontRevenueWeight", "engagementWeight", "followersWeight"];
  const scoreTotal = weightTotal(scoreForm, scoreKeys);
  const rankingTotal = weightTotal(rankingForm, rankingKeys);

  useEffect(() => {
    setScoreForm({ ...defaultScoreForm, ...scoreConfig });
  }, [scoreConfig]);

  useEffect(() => {
    setRankingForm({ ...defaultRankingForm, ...rankingRule });
  }, [rankingRule]);

  useEffect(() => {
    setBudgetForm({
      warningThresholdPercent: budgetRule.warningThresholdPercent ?? 20,
      criticalThresholdPercent: budgetRule.criticalThresholdPercent ?? 10,
      pauseWhenExhausted: budgetRule.pauseWhenExhausted ?? true,
      approval: { status: budgetRule.approval?.status || "active" },
      reason: "Updated from admin configuration engine",
    });
  }, [budgetRule]);

  useEffect(() => {
    setSchedulingForm(schedulingFormFromSettings(schedulingSettings));
  }, [schedulingSettings]);

  const resetTierForm = () => {
    setEditingTierId("");
    setTierForm({ ...blankTierForm });
  };
  const resetPlanForm = () => {
    setEditingPlanId("");
    setPlanForm({ ...blankPlanForm });
  };
  const editTier = (tier) => {
    setEditingTierId(tier._id);
    setTierForm({
      tierName: tier.tierName || "",
      minScore: tier.minScore ?? 0,
      maxScore: tier.maxScore ?? 100,
      minFollowers: tier.minFollowers ?? 0,
      maxFollowers: tier.maxFollowers ?? 0,
      color: tier.color || "#475569",
      priority: tier.priority ?? 0,
      displayOrder: tier.displayOrder ?? tier.priority ?? 0,
      approval: { status: tier.approval?.status || "active" },
      reason: "Updated from linked tier and plan configuration",
    });
  };
  const editPlan = (plan) => {
    const metadata = plan.metadata || {};
    setEditingPlanId(plan._id);
    setPlanForm({
      planName: plan.planName || "",
      description: plan.description || metadata.cardDescription || "",
      monthlyPrice: plan.monthlyPrice ?? 0,
      quarterlyPrice: plan.quarterlyPrice ?? 0,
      halfYearlyPrice: plan.halfYearlyPrice ?? 0,
      yearlyPrice: plan.yearlyPrice ?? 0,
      durationDays: plan.durationDays ?? 30,
      monthlyDurationDays: plan.monthlyDurationDays ?? plan.durationDays ?? 30,
      quarterlyDurationDays: plan.quarterlyDurationDays ?? 90,
      halfYearlyDurationDays: plan.halfYearlyDurationDays ?? 180,
      yearlyDurationDays: plan.yearlyDurationDays ?? 365,
      customDurationDays: plan.customDurationDays ?? plan.durationDays ?? 30,
      autoRenewAllowed: Boolean(plan.autoRenewAllowed),
      campaignLimit: plan.campaignLimit ?? 1,
      influencerVisibilityLimit: plan.influencerVisibilityLimit ?? 20,
      allowAllTiers: Boolean(plan.allowAllTiers),
      prioritySupport: Boolean(plan.prioritySupport),
      featuredCampaigns: Boolean(plan.featuredCampaigns),
      advancedAnalytics: Boolean(plan.advancedAnalytics),
      dedicatedManager: Boolean(plan.dedicatedManager),
      displayOrder: plan.displayOrder ?? 0,
      approval: { status: plan.approval?.status || "active" },
      metadata: {
        ...metadata,
        cardBenefitsText: Array.isArray(metadata.cardBenefits) ? metadata.cardBenefits.join("\n") : metadata.cardBenefitsText || "",
        cardBadge: metadata.cardBadge || "",
        ctaLabel: metadata.ctaLabel || "",
        customPricing: Boolean(metadata.customPricing),
        customPricingLabel: metadata.customPricingLabel || "",
        customPricingSubtext: metadata.customPricingSubtext || "",
        iconKey: metadata.iconKey || "zap",
        theme: metadata.theme || "indigo",
        isMostPopular: Boolean(metadata.isMostPopular),
        campaignBoost: Boolean(metadata.campaignBoost),
        summaryTitle: metadata.summaryTitle || "Subscription Plans",
        summarySubtitle: metadata.summarySubtitle || "Choose a plan that fits your business needs. Upgrade anytime to unlock more features.",
        helpLabel: metadata.helpLabel || "How Subscriptions Work?",
        currentPlanLabel: metadata.currentPlanLabel || "Current Plan",
        activeStatusLabel: metadata.activeStatusLabel || "Active",
        renewPrefix: metadata.renewPrefix || "Your plan renews on",
        readyText: metadata.readyText || "Your plan is ready to use",
        campaignsLabel: metadata.campaignsLabel || "Campaigns",
        campaignUnlimitedHint: metadata.campaignUnlimitedHint || "Unlimited campaigns",
        campaignRemainingSingular: metadata.campaignRemainingSingular || "campaign remaining",
        campaignRemainingPlural: metadata.campaignRemainingPlural || "campaigns remaining",
        influencersLabel: metadata.influencersLabel || "Influencers Visible",
        visibilityUnlimitedHint: metadata.visibilityUnlimitedHint || "Unlimited visibility",
        visibilityLimitHint: metadata.visibilityLimitHint || "Limit reached",
        visibilityAvailableHint: metadata.visibilityAvailableHint || "Visibility available",
        benefitsLabel: metadata.benefitsLabel || "Plan Benefits",
        benefitsHint: metadata.benefitsHint || "Upgrade to unlock more",
        upgradeCta: metadata.upgradeCta || "Upgrade Plan",
        availablePlansTitle: metadata.availablePlansTitle || "Available Plans",
        monthlyLabel: metadata.monthlyLabel || "Monthly",
        yearlyLabel: metadata.yearlyLabel || "Yearly",
        savingsLabel: metadata.savingsLabel || "Save 20%",
      },
      reason: "Updated from linked tier and plan configuration",
    });
  };
  const saveTier = async () => {
    const success = await runAction(
      editingTierId ? `update-tier-${editingTierId}` : "create-tier",
      () => editingTierId ? updateInfluencerCommerceConfig("tiers", editingTierId, tierForm) : createInfluencerCommerceConfig("tiers", tierForm),
      editingTierId ? "Tier updated." : "Tier created."
    );
    if (success) resetTierForm();
  };
  const savePlan = async () => {
    const benefits = String(planForm.metadata?.cardBenefitsText || "")
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
    const metadata = planForm.metadata || {};
    const payload = {
      ...planForm,
      autoRenewAllowed: Boolean(planForm.autoRenewAllowed),
      allowAllTiers: Boolean(planForm.allowAllTiers),
      prioritySupport: Boolean(planForm.prioritySupport),
      featuredCampaigns: Boolean(planForm.featuredCampaigns),
      advancedAnalytics: Boolean(planForm.advancedAnalytics),
      dedicatedManager: Boolean(planForm.dedicatedManager),
      metadata: {
        ...metadata,
        cardDescription: planForm.description || "",
        cardBenefits: benefits,
        cardBenefitsText: planForm.metadata?.cardBenefitsText || "",
        iconKey: metadata.iconKey || "zap",
        theme: metadata.theme || "indigo",
        isMostPopular: Boolean(metadata.isMostPopular),
        customPricing: Boolean(metadata.customPricing),
        campaignBoost: Boolean(metadata.campaignBoost),
      },
    };
    const success = await runAction(
      editingPlanId ? `update-plan-${editingPlanId}` : "create-plan",
      () => editingPlanId ? updateInfluencerCommerceConfig("subscriptionPlans", editingPlanId, payload) : createInfluencerCommerceConfig("subscriptionPlans", payload),
      editingPlanId ? "Subscription plan updated." : "Subscription plan created."
    );
    if (success) resetPlanForm();
  };
  const archiveConfig = async (entityType, id, label) => {
    const pairLabel = entityType === "tiers" ? "matching subscription plan" : entityType === "subscriptionPlans" ? "matching influencer tier" : "";
    const message = pairLabel ? `Archive ${label}? This will also archive the ${pairLabel}.` : `Archive ${label}?`;
    if (!(await confirmAdminAction({ message, tone: "danger", confirmLabel: "Confirm" }))) return false;
    return runAction(`delete-${entityType}-${id}`, () => deleteInfluencerCommerceConfig(entityType, id), `${label} archived.`);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <Section
          title="Influencer Score Engine"
          icon={Calculator}
          action={(
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge value={scoreConfig?.approval?.status || "draft"} />
              <ConfigToggleButton entityType="scoreConfigs" row={scoreConfig} label="Score engine" runAction={runAction} busyId={busyId} />
            </div>
          )}
        >
          <div className="grid gap-3 md:grid-cols-5">
            {scoreKeys.map((key) => (
              <ConfigInput key={key} label={key.replace(/Weight$/, "")} value={scoreForm[key] ?? 0} onChange={(value) => setScoreForm((current) => ({ ...current, [key]: value }))} />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className={`text-sm font-semibold ${scoreTotal === 100 ? "text-emerald-600" : "text-rose-600"}`}>Total: {scoreTotal}%</span>
            <ActionButton icon={CheckCircle2} disabled={!scoreConfig._id || busyId === "save-score" || scoreTotal !== 100} onClick={() => runAction("save-score", () => updateInfluencerCommerceConfig("scoreConfigs", scoreConfig._id, scoreForm), "Score formula activated.")}>Save Formula</ActionButton>
          </div>
        </Section>

        <Section title="Influencer Tier & Plan Pairing" icon={ShieldCheck}>
          <div className="grid gap-3 md:grid-cols-6">
            <ConfigInput type="text" label="Tier / Plan Name" value={tierForm.tierName} onChange={(value) => setTierForm((current) => ({ ...current, tierName: value }))} />
            <ConfigInput label="Min Score" value={tierForm.minScore} onChange={(value) => setTierForm((current) => ({ ...current, minScore: value }))} />
            <ConfigInput label="Max Score" value={tierForm.maxScore} onChange={(value) => setTierForm((current) => ({ ...current, maxScore: value }))} />
            <ConfigInput label="Min Followers" value={tierForm.minFollowers} onChange={(value) => setTierForm((current) => ({ ...current, minFollowers: value }))} />
            <ConfigInput label="Max Followers" value={tierForm.maxFollowers} onChange={(value) => setTierForm((current) => ({ ...current, maxFollowers: value }))} />
            <ConfigInput type="text" label="Color" value={tierForm.color} onChange={(value) => setTierForm((current) => ({ ...current, color: value }))} />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            {editingTierId ? <ActionButton tone="slate" onClick={resetTierForm}>Cancel</ActionButton> : null}
            <ActionButton icon={CheckCircle2} disabled={Boolean(busyId) || !tierForm.tierName} onClick={saveTier}>{editingTierId ? "Update Tier" : "Create Tier"}</ActionButton>
          </div>
          <ResponsiveTable headers={["Tier", "Score", "Followers", "Priority", "Status", "Actions"]} rows={tiers} renderRow={(tier) => (
            <tr key={tier._id}>
              <td className="px-3 py-3"><span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: tier.color }} />{tier.tierName}</span></td>
              <td className="px-3 py-3">{tier.minScore}-{tier.maxScore}</td>
              <td className="px-3 py-3">{numberValue(tier.minFollowers)}-{tier.maxFollowers ? numberValue(tier.maxFollowers) : "Unlimited"}</td>
              <td className="px-3 py-3">{tier.priority}</td>
              <td className="px-3 py-3"><StatusBadge value={tier.approval?.status} /></td>
              <td className="px-3 py-3">
                <div className="flex flex-wrap gap-2">
                  <ActionButton tone="slate" icon={Pencil} disabled={Boolean(busyId)} onClick={() => editTier(tier)}>Update</ActionButton>
                  <ConfigToggleButton entityType="tiers" row={tier} label={tier.tierName} runAction={runAction} busyId={busyId} />
                  <ActionButton tone="red" icon={Trash2} disabled={Boolean(busyId)} onClick={() => archiveConfig("tiers", tier._id, tier.tierName)}>Delete</ActionButton>
                </div>
              </td>
            </tr>
          )} />
        </Section>

        <Section title="Vendor Subscription Plans" icon={WalletCards}>
          <div className="grid gap-3 md:grid-cols-5">
            <ConfigInput type="text" label="Plan / Tier Name" value={planForm.planName} onChange={(value) => setPlanForm((current) => ({ ...current, planName: value }))} />
            <ConfigInput label="Monthly Price" value={planForm.monthlyPrice} onChange={(value) => setPlanForm((current) => ({ ...current, monthlyPrice: value }))} />
            <ConfigInput label="Quarterly Price" value={planForm.quarterlyPrice} onChange={(value) => setPlanForm((current) => ({ ...current, quarterlyPrice: value }))} />
            <ConfigInput label="Half-Year Price" value={planForm.halfYearlyPrice} onChange={(value) => setPlanForm((current) => ({ ...current, halfYearlyPrice: value }))} />
            <ConfigInput label="Yearly Price" value={planForm.yearlyPrice} onChange={(value) => setPlanForm((current) => ({ ...current, yearlyPrice: value }))} />
            <ConfigInput label="Campaign Limit" value={planForm.campaignLimit} onChange={(value) => setPlanForm((current) => ({ ...current, campaignLimit: value }))} />
            <ConfigInput label="Discovery Limit" value={planForm.influencerVisibilityLimit} onChange={(value) => setPlanForm((current) => ({ ...current, influencerVisibilityLimit: value }))} />
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-6">
            <ConfigInput label="Default Days" value={planForm.durationDays} onChange={(value) => setPlanForm((current) => ({ ...current, durationDays: value }))} />
            <ConfigInput label="Monthly Days" value={planForm.monthlyDurationDays} onChange={(value) => setPlanForm((current) => ({ ...current, monthlyDurationDays: value }))} />
            <ConfigInput label="Quarterly Days" value={planForm.quarterlyDurationDays} onChange={(value) => setPlanForm((current) => ({ ...current, quarterlyDurationDays: value }))} />
            <ConfigInput label="Half-Year Days" value={planForm.halfYearlyDurationDays} onChange={(value) => setPlanForm((current) => ({ ...current, halfYearlyDurationDays: value }))} />
            <ConfigInput label="Yearly Days" value={planForm.yearlyDurationDays} onChange={(value) => setPlanForm((current) => ({ ...current, yearlyDurationDays: value }))} />
            <ConfigInput label="Custom Days" value={planForm.customDurationDays} onChange={(value) => setPlanForm((current) => ({ ...current, customDurationDays: value }))} />
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <ConfigTextarea label="Card Description" value={planForm.description || ""} onChange={(value) => setPlanForm((current) => ({ ...current, description: value }))} placeholder="Shown under the plan name on the vendor subscription card." />
            <ConfigTextarea label="Card Benefits" value={planForm.metadata?.cardBenefitsText || ""} onChange={(value) => setPlanForm((current) => ({ ...current, metadata: { ...(current.metadata || {}), cardBenefitsText: value } }))} placeholder="One benefit per line. These appear as the checklist on the card." />
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <ConfigInput label="Display Order" value={planForm.displayOrder ?? 0} onChange={(value) => setPlanForm((current) => ({ ...current, displayOrder: value }))} />
            <ConfigInput type="text" label="Badge Text" value={planForm.metadata?.cardBadge || ""} onChange={(value) => setPlanForm((current) => ({ ...current, metadata: { ...(current.metadata || {}), cardBadge: value } }))} />
            <ConfigInput type="text" label="CTA Label" value={planForm.metadata?.ctaLabel || ""} onChange={(value) => setPlanForm((current) => ({ ...current, metadata: { ...(current.metadata || {}), ctaLabel: value } }))} />
            <ConfigInput type="text" label="Custom Price Label" value={planForm.metadata?.customPricingLabel || ""} onChange={(value) => setPlanForm((current) => ({ ...current, metadata: { ...(current.metadata || {}), customPricingLabel: value } }))} />
            <ConfigInput type="text" label="Custom Price Subtext" value={planForm.metadata?.customPricingSubtext || ""} onChange={(value) => setPlanForm((current) => ({ ...current, metadata: { ...(current.metadata || {}), customPricingSubtext: value } }))} />
            <label className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
              Icon
              <select value={planForm.metadata?.iconKey || "zap"} onChange={(event) => setPlanForm((current) => ({ ...current, metadata: { ...(current.metadata || {}), iconKey: event.target.value } }))} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                <option value="zap">Starter</option>
                <option value="medal">Medal</option>
                <option value="star">Star</option>
                <option value="gem">Diamond</option>
                <option value="crown">Crown</option>
                <option value="card">Card</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
              Card Theme
              <select value={planForm.metadata?.theme || "indigo"} onChange={(event) => setPlanForm((current) => ({ ...current, metadata: { ...(current.metadata || {}), theme: event.target.value } }))} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                <option value="indigo">Indigo</option>
                <option value="slate">Silver</option>
                <option value="amber">Gold</option>
                <option value="sky">Diamond</option>
                <option value="violet">Platinum</option>
                <option value="emerald">Emerald</option>
              </select>
            </label>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-4">
            <ConfigCheckbox label="Most Popular" checked={planForm.metadata?.isMostPopular} onChange={(value) => setPlanForm((current) => ({ ...current, metadata: { ...(current.metadata || {}), isMostPopular: value } }))} />
            <ConfigCheckbox label="Custom Pricing" checked={planForm.metadata?.customPricing} onChange={(value) => setPlanForm((current) => ({ ...current, metadata: { ...(current.metadata || {}), customPricing: value } }))} />
            <ConfigCheckbox label="Allow Auto Renew" checked={planForm.autoRenewAllowed} onChange={(value) => setPlanForm((current) => ({ ...current, autoRenewAllowed: value }))} />
            <ConfigCheckbox label="Priority Support" checked={planForm.prioritySupport} onChange={(value) => setPlanForm((current) => ({ ...current, prioritySupport: value }))} />
            <ConfigCheckbox label="Featured Campaigns" checked={planForm.featuredCampaigns} onChange={(value) => setPlanForm((current) => ({ ...current, featuredCampaigns: value }))} />
            <ConfigCheckbox label="Advanced Analytics" checked={planForm.advancedAnalytics} onChange={(value) => setPlanForm((current) => ({ ...current, advancedAnalytics: value }))} />
            <ConfigCheckbox label="Dedicated Manager" checked={planForm.dedicatedManager} onChange={(value) => setPlanForm((current) => ({ ...current, dedicatedManager: value }))} />
            <ConfigCheckbox label="All Tiers Access" checked={planForm.allowAllTiers} onChange={(value) => setPlanForm((current) => ({ ...current, allowAllTiers: value }))} />
            <ConfigCheckbox label="Campaign Boost" checked={planForm.metadata?.campaignBoost} onChange={(value) => setPlanForm((current) => ({ ...current, metadata: { ...(current.metadata || {}), campaignBoost: value } }))} />
          </div>
          <div className="mt-5 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Active Plan Summary</p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <ConfigInput type="text" label="Page Title" value={planForm.metadata?.summaryTitle || ""} onChange={(value) => setPlanForm((current) => ({ ...current, metadata: { ...(current.metadata || {}), summaryTitle: value } }))} />
              <ConfigInput type="text" label="Help Button" value={planForm.metadata?.helpLabel || ""} onChange={(value) => setPlanForm((current) => ({ ...current, metadata: { ...(current.metadata || {}), helpLabel: value } }))} />
              <ConfigInput type="text" label="Current Label" value={planForm.metadata?.currentPlanLabel || ""} onChange={(value) => setPlanForm((current) => ({ ...current, metadata: { ...(current.metadata || {}), currentPlanLabel: value } }))} />
              <ConfigInput type="text" label="Status Label" value={planForm.metadata?.activeStatusLabel || ""} onChange={(value) => setPlanForm((current) => ({ ...current, metadata: { ...(current.metadata || {}), activeStatusLabel: value } }))} />
              <ConfigInput type="text" label="Renew Prefix" value={planForm.metadata?.renewPrefix || ""} onChange={(value) => setPlanForm((current) => ({ ...current, metadata: { ...(current.metadata || {}), renewPrefix: value } }))} />
              <ConfigInput type="text" label="Ready Text" value={planForm.metadata?.readyText || ""} onChange={(value) => setPlanForm((current) => ({ ...current, metadata: { ...(current.metadata || {}), readyText: value } }))} />
              <ConfigInput type="text" label="Campaigns Label" value={planForm.metadata?.campaignsLabel || ""} onChange={(value) => setPlanForm((current) => ({ ...current, metadata: { ...(current.metadata || {}), campaignsLabel: value } }))} />
              <ConfigInput type="text" label="Influencers Label" value={planForm.metadata?.influencersLabel || ""} onChange={(value) => setPlanForm((current) => ({ ...current, metadata: { ...(current.metadata || {}), influencersLabel: value } }))} />
              <ConfigInput type="text" label="Benefits Label" value={planForm.metadata?.benefitsLabel || ""} onChange={(value) => setPlanForm((current) => ({ ...current, metadata: { ...(current.metadata || {}), benefitsLabel: value } }))} />
              <ConfigInput type="text" label="Upgrade CTA" value={planForm.metadata?.upgradeCta || ""} onChange={(value) => setPlanForm((current) => ({ ...current, metadata: { ...(current.metadata || {}), upgradeCta: value } }))} />
              <ConfigInput type="text" label="Plans Title" value={planForm.metadata?.availablePlansTitle || ""} onChange={(value) => setPlanForm((current) => ({ ...current, metadata: { ...(current.metadata || {}), availablePlansTitle: value } }))} />
              <ConfigInput type="text" label="Savings Label" value={planForm.metadata?.savingsLabel || ""} onChange={(value) => setPlanForm((current) => ({ ...current, metadata: { ...(current.metadata || {}), savingsLabel: value } }))} />
            </div>
            <div className="mt-3">
              <ConfigTextarea label="Page Subtitle" value={planForm.metadata?.summarySubtitle || ""} onChange={(value) => setPlanForm((current) => ({ ...current, metadata: { ...(current.metadata || {}), summarySubtitle: value } }))} />
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            {editingPlanId ? <ActionButton tone="slate" onClick={resetPlanForm}>Cancel</ActionButton> : null}
            <ActionButton icon={CheckCircle2} disabled={Boolean(busyId) || !planForm.planName} onClick={savePlan}>{editingPlanId ? "Update Plan" : "Create Plan"}</ActionButton>
          </div>
          <ResponsiveTable headers={["Plan", "Price", "Campaigns", "Discovery", "Features", "Status", "Actions"]} rows={plans} renderRow={(plan) => (
            <tr key={plan._id}>
              <td className="px-3 py-3 font-semibold">{plan.planName}</td>
              <td className="px-3 py-3">{formatCurrency(plan.monthlyPrice || 0)} / mo</td>
              <td className="px-3 py-3">{plan.campaignLimit < 0 ? "Unlimited" : plan.campaignLimit}</td>
              <td className="px-3 py-3">{plan.influencerVisibilityLimit < 0 ? "Unlimited" : numberValue(plan.influencerVisibilityLimit)}</td>
              <td className="px-3 py-3 text-xs">{[plan.metadata?.cardBadge, plan.prioritySupport && "Priority", plan.featuredCampaigns && "Featured", plan.advancedAnalytics && "Analytics", plan.dedicatedManager && "Manager"].filter(Boolean).join(", ") || "-"}</td>
              <td className="px-3 py-3"><StatusBadge value={plan.approval?.status} /></td>
              <td className="px-3 py-3">
                <div className="flex flex-wrap gap-2">
                  <ActionButton tone="slate" icon={Pencil} disabled={Boolean(busyId)} onClick={() => editPlan(plan)}>Update</ActionButton>
                  <ConfigToggleButton entityType="subscriptionPlans" row={plan} label={plan.planName} runAction={runAction} busyId={busyId} />
                  <ActionButton tone="red" icon={Trash2} disabled={Boolean(busyId)} onClick={() => archiveConfig("subscriptionPlans", plan._id, plan.planName)}>Delete</ActionButton>
                </div>
              </td>
            </tr>
          )} />
        </Section>

        <CommerceConfigurationView data={data} runAction={runAction} busyId={busyId} archiveConfig={archiveConfig} />
      </div>

      <div className="space-y-4">
        <Section
          title="Ranking Rules"
          icon={BarChart3}
          action={(
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge value={rankingRule?.approval?.status || "draft"} />
              <ConfigToggleButton entityType="rankingRules" row={rankingRule} label="Ranking rules" runAction={runAction} busyId={busyId} />
            </div>
          )}
        >
          <div className="grid gap-3">
            {rankingKeys.map((key) => (
              <ConfigInput key={key} label={key.replace(/Weight$/, "")} value={rankingForm[key] ?? 0} onChange={(value) => setRankingForm((current) => ({ ...current, [key]: value }))} />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className={`text-sm font-semibold ${rankingTotal === 100 ? "text-emerald-600" : "text-rose-600"}`}>Total: {rankingTotal}%</span>
            <ActionButton icon={CheckCircle2} disabled={!rankingRule._id || busyId === "save-ranking" || rankingTotal !== 100} onClick={() => runAction("save-ranking", () => updateInfluencerCommerceConfig("rankingRules", rankingRule._id, rankingForm), "Ranking formula activated.")}>Save Ranking</ActionButton>
          </div>
        </Section>

        <Section title="Campaign Scheduling" icon={SlidersHorizontal}>
          <div className="grid gap-3">
            <ConfigSelect
              label="Minimum Campaign Lead Time"
              value={String(schedulingForm.minimumCampaignLeadTimeDays)}
              onChange={(value) => setSchedulingForm((current) => ({ ...current, minimumCampaignLeadTimeDays: Number(value) }))}
              options={[1, 2, 3, 5, 7, 10, 14].map((days) => ({ value: String(days), label: `${days} ${days === 1 ? "day" : "days"}` }))}
            />
            <ConfigInput
              label="Minimum Publish Notice (hours)"
              value={schedulingForm.minimumPublishNoticeHours}
              onChange={(value) => setSchedulingForm((current) => ({ ...current, minimumPublishNoticeHours: value }))}
            />
            <ConfigInput
              label="Grace Period (hours)"
              value={schedulingForm.gracePeriodHours}
              onChange={(value) => setSchedulingForm((current) => ({ ...current, gracePeriodHours: value }))}
            />
            <div className="grid gap-2">
              <ConfigCheckbox label="Auto publish approved deliverables" checked={schedulingForm.autoPublish} onChange={(checked) => setSchedulingForm((current) => ({ ...current, autoPublish: checked }))} />
              <ConfigCheckbox label="Send deadline reminders" checked={schedulingForm.enableDeadlineReminders} onChange={(checked) => setSchedulingForm((current) => ({ ...current, enableDeadlineReminders: checked }))} />
              <ConfigCheckbox label="Auto expire overdue deliverables" checked={schedulingForm.autoExpireDeliverables} onChange={(checked) => setSchedulingForm((current) => ({ ...current, autoExpireDeliverables: checked }))} />
              <ConfigCheckbox label="Auto expire blocked campaigns" checked={schedulingForm.autoExpireCampaign} onChange={(checked) => setSchedulingForm((current) => ({ ...current, autoExpireCampaign: checked }))} />
              <ConfigCheckbox label="Enable escrow refund on expiry" checked={schedulingForm.enableEscrowRefund} onChange={(checked) => setSchedulingForm((current) => ({ ...current, enableEscrowRefund: checked }))} />
            </div>
          </div>
          <div className="mt-4">
            <ActionButton
              icon={CheckCircle2}
              disabled={busyId === "save-scheduling"}
              onClick={() => runAction("save-scheduling", () => updateAdminInfluencerSettings({ scheduling: schedulingForm }), "Campaign scheduling settings updated.")}
            >
              Save Scheduling Settings
            </ActionButton>
          </div>
        </Section>

        <Section
          title="Budget Protection"
          icon={AlertTriangle}
          action={(
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge value={budgetRule?.approval?.status || "draft"} />
              <ConfigToggleButton entityType="budgetRules" row={budgetRule} label="Budget protection" runAction={runAction} busyId={busyId} />
            </div>
          )}
        >
          <div className="grid gap-3">
            <ConfigInput label="Warning Threshold" value={budgetForm.warningThresholdPercent} onChange={(value) => setBudgetForm((current) => ({ ...current, warningThresholdPercent: value }))} />
            <ConfigInput label="Critical Threshold" value={budgetForm.criticalThresholdPercent} onChange={(value) => setBudgetForm((current) => ({ ...current, criticalThresholdPercent: value }))} />
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <input type="checkbox" checked={Boolean(budgetForm.pauseWhenExhausted)} onChange={(event) => setBudgetForm((current) => ({ ...current, pauseWhenExhausted: event.target.checked }))} />
              Pause exhausted campaigns
            </label>
          </div>
          <div className="mt-4">
            <ActionButton icon={CheckCircle2} disabled={!budgetRule._id || busyId === "save-budget"} onClick={() => runAction("save-budget", () => updateInfluencerCommerceConfig("budgetRules", budgetRule._id, budgetForm), "Budget protection updated.")}>Save Budget Rules</ActionButton>
          </div>
        </Section>

      </div>
    </div>
  );
}


export default ConfigurationEngineView;
