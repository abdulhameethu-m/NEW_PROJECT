import { useCallback, useEffect, useMemo, useState } from "react";
import { confirmAction } from "../../services/notificationService";
import { CheckCircle2, Megaphone, Package, Plus, Send, XCircle } from "lucide-react";
import { getVendorInfluencerProfile, previewVendorInfluencerCampaign } from "../../services/influencerCommerceService";
import { BudgetSummaryPanel } from "../../components/campaign/BudgetSummaryPanel";
import { CampaignLifecycleTimeline } from "../../components/campaign/CampaignLifecycleTimeline";
import { formatCurrency } from "../../utils/formatCurrency";
import {
  FieldLabel,
  configKey,
  configLabel,
  formatDateTime,
  influencerRowName,
  influencerRowUsername,
  influencerRowId,
  mergeInfluencerOptions,
  normalizePaymentConfig,
  numberValue,
  packageKey,
  packagePrice,
  packageQuantity,
  packageUnitPrice,
  Pagination,
  productRowId,
  ResponsiveTable,
  Section,
  selectedPackageQuantity,
  servicePackages,
  StatusBadge,
  statusText,
} from "./VendorInfluencerShared";

function normalizeCampaignTypeConfig(row = {}, paymentModels = []) {
  const paymentByKey = new Map(paymentModels.map((payment) => [payment.key, payment]));
  const allowedRows = row.allowedPaymentModels || row.paymentModels || [];
  const allowedPaymentModels = allowedRows
    .map((item) => paymentByKey.get(configKey(item)) || normalizePaymentConfig(item))
    .filter((item) => item.key);
  const key = configKey(row);
  return {
    ...row,
    key,
    slug: key,
    label: configLabel(row),
    name: configLabel(row),
    allowedPaymentModels,
    paymentModels: allowedPaymentModels,
    defaultPaymentType: row.defaultPaymentType || allowedPaymentModels[0]?.key || "",
    displayOrder: Number(row.displayOrder || 0),
  };
}

function normalizeDynamicField(field = {}) {
  const configuration = field.configuration || field.field?.configuration || {};
  const fieldName = field.fieldName || field.key || field.field?.key || "";
  return {
    ...field,
    fieldName,
    key: fieldName,
    label: field.label || field.field?.label || fieldName,
    fieldType: field.fieldType || field.type || field.field?.fieldType || "text",
    required: Boolean(field.required ?? field.field?.required),
    configuration,
    options: field.options || configuration.options || field.field?.options || [],
    min: field.min ?? configuration.min ?? field.field?.min,
    max: field.max ?? configuration.max ?? field.field?.max,
    defaultValue: field.defaultValue ?? configuration.defaultValue ?? field.field?.defaultValue ?? "",
    displayOrder: Number(field.displayOrder || field.field?.displayOrder || 0),
  };
}

function campaignRuleConfig(configuration = {}) {
  const engine = configuration.campaignRuleEngine || {};
  const paymentModels = (engine.paymentModels || configuration.paymentModelOptions || configuration.paymentModels || [])
    .map(normalizePaymentConfig)
    .filter((row) => row.key)
    .sort((a, b) => a.displayOrder - b.displayOrder || a.label.localeCompare(b.label));
  const campaignTypes = (engine.campaignTypes || configuration.campaignTypes || [])
    .map((row) => normalizeCampaignTypeConfig(row, paymentModels))
    .filter((row) => row.key)
    .sort((a, b) => a.displayOrder - b.displayOrder || a.label.localeCompare(b.label));
  const fieldsByCombination = Object.fromEntries(
    Object.entries(engine.fieldsByCombination || {}).map(([key, rows]) => [
      key,
      (rows || [])
        .map(normalizeDynamicField)
        .filter((field) => !key.endsWith(":fixed") || !["fixedFee", "fixedAmount", "milestonePayment", "paymentSchedule"].includes(field.fieldName || field.key))
        .sort((a, b) => a.displayOrder - b.displayOrder || a.label.localeCompare(b.label)),
    ])
  );
  return {
    campaignTypes,
    paymentModels,
    attributionWindows: (engine.attributionWindows || configuration.attributionWindows || []).filter((row) => !row.customAllowed),
    fieldsByCombination,
  };
}

function defaultDynamicValues(fields = []) {
  return fields.reduce((values, field) => {
    const name = field.fieldName || field.key;
    if (!name || values[name] !== undefined) return values;
    if (field.defaultValue !== "" && field.defaultValue !== null && field.defaultValue !== undefined) {
      values[name] = field.defaultValue;
    } else if (field.fieldType === "boolean") {
      values[name] = false;
    }
    return values;
  }, {});
}

function fieldNames(fields = []) {
  return new Set(fields.map((field) => field.fieldName || field.key).filter(Boolean));
}

function splitLines(value = "") {
  if (Array.isArray(value)) return value;
  return String(value || "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toDateInputValue(date = new Date()) {
  const next = new Date(date);
  next.setMinutes(next.getMinutes() - next.getTimezoneOffset());
  return next.toISOString().slice(0, 10);
}

function addDaysToInputDate(value, days = 0) {
  if (!value) return "";
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return "";
  const next = new Date(year, month - 1, day);
  next.setDate(next.getDate() + Number(days || 0));
  return toDateInputValue(next);
}

function dateRangeLabel(value = "") {
  if (!value) return "";
  const [year, month, day] = String(value).split("-");
  return year && month && day ? `${day}-${month}-${year}` : value;
}

function isInputDateInRange(value, start, end) {
  if (!value || !start || !end) return false;
  return value >= start && value <= end;
}

function DynamicCampaignField({ field, value, onChange }) {
  const name = field.fieldName || field.key;
  const label = field.label || name;
  const commonClass = "h-11 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white";
  if (field.configuration?.readOnly) {
    return (
      <label className="block space-y-1.5">
        <FieldLabel>{label}</FieldLabel>
        <span className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">{String(value ?? field.defaultValue ?? "")}</span>
      </label>
    );
  }
  if (field.fieldType === "boolean") {
    return (
      <label className="block space-y-1.5">
        <FieldLabel>{label}</FieldLabel>
        <span className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
          <input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(name, event.target.checked)} />
          {value ? "Enabled" : "Disabled"}
        </span>
      </label>
    );
  }
  if (field.fieldType === "select" || field.fieldType === "multi_select") {
    const options = field.options || field.configuration?.options || [];
    return (
      <label className="block space-y-1.5">
        <FieldLabel>{label}</FieldLabel>
        <select multiple={field.fieldType === "multi_select"} value={field.fieldType === "multi_select" ? (Array.isArray(value) ? value : []) : (value || "")} onChange={(event) => {
          if (field.fieldType === "multi_select") {
            onChange(name, Array.from(event.target.selectedOptions).map((option) => option.value));
          } else {
            onChange(name, event.target.value);
          }
        }} className={commonClass} aria-label={label}>
          {field.fieldType !== "multi_select" ? <option value="">Select</option> : null}
          {options.map((option) => {
            const optionValue = option.value ?? option.key ?? option.label ?? option;
            return <option key={String(optionValue)} value={optionValue}>{option.label || option.name || optionValue}</option>;
          })}
        </select>
      </label>
    );
  }
  if (field.fieldType === "textarea" || field.fieldType === "json") {
    return (
      <label className="block space-y-1.5 xl:col-span-2">
        <FieldLabel>{label}</FieldLabel>
        <textarea value={value || ""} onChange={(event) => onChange(name, event.target.value)} rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" aria-label={label} />
      </label>
    );
  }
  const numeric = ["number", "currency", "percentage"].includes(field.fieldType);
  return (
    <label className="block space-y-1.5">
      <FieldLabel>{label}</FieldLabel>
      <input type={numeric ? "number" : field.fieldType === "date" ? "date" : "text"} min={field.min ?? field.configuration?.min} max={field.max ?? field.configuration?.max} value={value ?? ""} onChange={(event) => onChange(name, numeric ? Number(event.target.value || 0) : event.target.value)} className={commonClass} aria-label={label} />
    </label>
  );
}

function CampaignFormSection({ title, description, children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/60 ${className}`}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{title}</h3>
        {description ? <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

function FieldHint({ children }) {
  return <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{children}</p>;
}

function PriceSummaryRow({ label, value, strong = false }) {
  return (
    <div className={`flex items-center justify-between gap-3 ${strong ? "pt-2 text-sm font-semibold text-slate-950 dark:text-white" : "text-xs text-slate-600 dark:text-slate-300"}`}>
      <span>{label}</span>
      <span>{formatCurrency(value || 0)}</span>
    </div>
  );
}

function fixedRewardCalculationRows(selectedServices = []) {
  return selectedServices.map((item) => {
    const units = selectedPackageQuantity(item);
    const packageTotal = Number(item.price || item.rate || item.total || 0);
    const unitPrice = units ? packageTotal / units : packageTotal;
    return {
      ...item,
      units,
      unitPrice,
      total: packageTotal,
      label: item.packageName || item.serviceName || "Deliverable",
    };
  });
}

function withoutSelectionKey(item = {}) {
  const next = { ...item };
  delete next.selectionKey;
  return next;
}

function emptyProductShipping() {
  return {
    productRequired: false,
    returnRequired: true,
    deliveryAddressSnapshot: { name: "", phone: "", addressLine1: "", addressLine2: "", city: "", state: "", postalCode: "", country: "India" },
    returnAddressSnapshot: { name: "", phone: "", addressLine1: "", addressLine2: "", city: "", state: "", postalCode: "", country: "India" },
    courierCompany: "",
    trackingNumber: "",
    trackingUrl: "",
    shipmentDate: "",
    estimatedDelivery: "",
    shippingCost: 0,
    packageWeight: "",
    packageDimensions: { length: "", width: "", height: "", unit: "cm" },
    notes: "",
  };
}

function isAddressEmpty(address = {}) {
  return ![address.name, address.phone, address.addressLine1, address.city, address.state, address.postalCode].some((value) => String(value || "").trim());
}

function CampaignForm({ influencers, products, configuration = {}, onCreate, busy, initialInfluencerId = "", initialProductIds = [] }) {
  const initialProductKey = initialProductIds.join("|");
  const rules = useMemo(() => campaignRuleConfig(configuration), [configuration]);
  const [form, setForm] = useState({
    influencerId: initialInfluencerId || "",
    title: "",
    campaignType: "",
    productIds: initialProductIds,
    paymentType: "",
    commissionPercent: 0,
    fixedFee: 0,
    attributionDays: 0,
    expectedBudget: 0,
    productValue: 0,
    shippingCost: 0,
    selectedServices: [],
    dynamicFields: {},
    invitationDeadline: "",
    contentCreationDays: 7,
    campaignDurationDays: 30,
    endDate: "",
    deadline: "",
    marketplace: { public: true },
    productShipping: emptyProductShipping(),
  });
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState("");

  useEffect(() => {
    if (initialInfluencerId) {
      setForm((current) => ({ ...current, influencerId: initialInfluencerId }));
    }
  }, [initialInfluencerId]);

  useEffect(() => {
    if (initialProductKey) {
      setForm((current) => {
        if (current.productIds.join("|") === initialProductKey) return current;
        return { ...current, productIds: initialProductKey.split("|") };
      });
    }
  }, [initialProductKey]);

  const influencerOptions = useMemo(() => {
    return mergeInfluencerOptions(influencers);
  }, [influencers]);

  const selectedInfluencer = useMemo(() => {
    const id = String(form.influencerId || "");
    return influencerOptions.find((row) => influencerRowId(row) === id) || null;
  }, [form.influencerId, influencerOptions]);
  const [deliveryAddressStatus, setDeliveryAddressStatus] = useState("");

  useEffect(() => {
    let cancelled = false;
    const influencerId = String(form.influencerId || "");
    if (!influencerId || !form.productShipping?.productRequired) {
      setDeliveryAddressStatus("");
      return () => {
        cancelled = true;
      };
    }
    setDeliveryAddressStatus("loading");
    getVendorInfluencerProfile(influencerId)
      .then((response) => {
        if (cancelled) return;
        const address = response?.data?.deliveryAddress || response?.data?.profile?.deliveryAddress || null;
        if (!address?.addressLine1 && !address?.city && !address?.postalCode) {
          setDeliveryAddressStatus("missing");
          return;
        }
        setForm((current) => {
          const currentAddress = current.productShipping?.deliveryAddressSnapshot || {};
          if (!isAddressEmpty(currentAddress)) return current;
          return {
            ...current,
            productShipping: {
              ...(current.productShipping || emptyProductShipping()),
              deliveryAddressSnapshot: { ...emptyProductShipping().deliveryAddressSnapshot, ...address },
            },
          };
        });
        setDeliveryAddressStatus("loaded");
      })
      .catch(() => {
        if (!cancelled) setDeliveryAddressStatus("missing");
      });
    return () => {
      cancelled = true;
    };
  }, [form.influencerId, form.productShipping?.productRequired]);

  const selectedRateCard = selectedInfluencer?.rateCard || selectedInfluencer?.services || [];
  const selectedCampaignType = rules.campaignTypes.find((type) => type.key === form.campaignType) || rules.campaignTypes[0] || null;
  const paymentModels = selectedCampaignType?.allowedPaymentModels?.length ? selectedCampaignType.allowedPaymentModels : rules.paymentModels;
  const selectedPaymentModel = paymentModels.find((model) => model.key === form.paymentType) || paymentModels[0];
  const schedulingSettings = configuration.schedulingSettings || {};
  const adminContentCreationDays = Math.max(1, Math.floor(Number(form.contentCreationDays || schedulingSettings.contentCreationDays || 7) || 7));
  const contentCreationWindow = useMemo(() => {
    if (!form.invitationDeadline) return { start: "", end: "" };
    return {
      start: form.invitationDeadline,
      end: addDaysToInputDate(form.invitationDeadline, adminContentCreationDays),
    };
  }, [adminContentCreationDays, form.invitationDeadline]);
  const contentCreationWindowLabel = contentCreationWindow.start && contentCreationWindow.end
    ? `Selectable dates: ${dateRangeLabel(contentCreationWindow.start)} to ${dateRangeLabel(contentCreationWindow.end)}`
    : "Due Date must be within the Content Creation Period.";
  const minimumDeliverableDueDate = useMemo(() => {
    const today = toDateInputValue(new Date());
    if (!contentCreationWindow.start) return today;
    return contentCreationWindow.start > today ? contentCreationWindow.start : today;
  }, [contentCreationWindow.start]);
  const maximumDeliverableDueDate = contentCreationWindow.end;
  const campaignContentCreationWindow = useMemo(() => {
    if (!form.invitationDeadline) return { start: "", end: "", firstCampaignEndDate: "" };
    const start = form.invitationDeadline;
    const end = addDaysToInputDate(start, adminContentCreationDays);
    return {
      start,
      end,
      firstCampaignEndDate: addDaysToInputDate(end, 1),
    };
  }, [adminContentCreationDays, form.invitationDeadline]);
  const minimumCampaignEndDate = campaignContentCreationWindow.firstCampaignEndDate;
  const campaignEndDateHint = campaignContentCreationWindow.end && minimumCampaignEndDate
    ? `Content creation ends ${dateRangeLabel(campaignContentCreationWindow.end)}. First selectable campaign end date: ${dateRangeLabel(minimumCampaignEndDate)}.`
    : "Set the invitation deadline and content creation days first.";
  const fixedCalculationRows = useMemo(() => fixedRewardCalculationRows(form.selectedServices), [form.selectedServices]);
  const calculatedFixedReward = useMemo(() => fixedCalculationRows.reduce((sum, item) => sum + Number(item.total || 0), 0), [fixedCalculationRows]);
  const fixedPaymentSummary = useMemo(() => {
    if (!["fixed", "hybrid"].includes(form.paymentType)) return null;
    const fixedCost = Number(preview?.pricing?.fixedCost ?? (form.paymentType === "fixed" ? calculatedFixedReward : form.fixedFee) ?? 0);
    return preview?.fundingSummary || {
      budgetAmount: fixedCost,
      escrowAmount: fixedCost,
      totalAmount: fixedCost,
      feeLines: [],
      feeSource: "Configured by Admin",
    };
  }, [calculatedFixedReward, form.fixedFee, form.paymentType, preview?.pricing?.fixedCost, preview?.fundingSummary]);
  const attributionWindows = rules.attributionWindows.length ? rules.attributionWindows : [];
  const dynamicFields = useMemo(() => (
    rules.fieldsByCombination[`${form.campaignType}:${form.paymentType}`] || []
  ), [rules.fieldsByCombination, form.campaignType, form.paymentType]);
  const dynamicNames = useMemo(() => fieldNames(dynamicFields), [dynamicFields]);
  const allowsServiceSelection = ["fixed", "commission", "hybrid"].includes(form.paymentType) || dynamicNames.has("selectedServices") || dynamicNames.has("services");
  const handledDynamicNames = new Set([
    "fixedFee",
    "fixedAmount",
    "milestonePayment",
    "paymentSchedule",
    "selectedServices",
    "services",
    "commissionPercent",
    "commissionPercentage",
    "deliverableCommissionRates",
    "commissionRules",
    "attributionDays",
    "expectedBudget",
    "maximumBudget",
    "productValue",
    "shippingCost",
    "affiliateTrackingEnabled",
  ]);
  const genericDynamicFields = dynamicFields.filter((field) => !handledDynamicNames.has(field.fieldName || field.key));

  useEffect(() => {
    setForm((current) => {
      const campaignType = rules.campaignTypes.some((type) => type.key === current.campaignType)
        ? current.campaignType
        : rules.campaignTypes[0]?.key || "";
      const typeConfig = rules.campaignTypes.find((type) => type.key === campaignType) || rules.campaignTypes[0] || null;
      const allowedPayments = typeConfig?.allowedPaymentModels?.length ? typeConfig.allowedPaymentModels : rules.paymentModels;
      const paymentType = allowedPayments.some((model) => model.key === current.paymentType)
        ? current.paymentType
        : typeConfig?.defaultPaymentType || allowedPayments[0]?.key || "";
      const fields = rules.fieldsByCombination[`${campaignType}:${paymentType}`] || [];
      const defaults = defaultDynamicValues(fields);
      const attributionDays = Number(current.attributionDays || defaults.attributionDays || rules.attributionWindows[0]?.days || 0);
      const commissionPercent = Number(current.commissionPercent || defaults.commissionPercent || defaults.commissionPercentage || 0);
      const dynamicFieldsNext = {
        ...defaults,
        ...current.dynamicFields,
        paymentType,
        attributionDays,
        commissionPercent,
        fixedFee: current.fixedFee,
        expectedBudget: current.expectedBudget,
        productValue: current.productValue,
        shippingCost: current.shippingCost,
      };
      if (
        campaignType === current.campaignType &&
        paymentType === current.paymentType &&
        attributionDays === current.attributionDays &&
        commissionPercent === current.commissionPercent
      ) {
        return { ...current, dynamicFields: dynamicFieldsNext };
      }
      return { ...current, campaignType, paymentType, attributionDays, commissionPercent, dynamicFields: dynamicFieldsNext };
    });
  }, [rules]);

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value, dynamicFields: { ...current.dynamicFields, [key]: value } }));
  }

  function setProductShippingField(key, value) {
    setForm((current) => ({
      ...current,
      productShipping: { ...(current.productShipping || emptyProductShipping()), [key]: value },
    }));
  }

  function setProductShippingAddress(type, key, value) {
    setForm((current) => {
      const productShipping = current.productShipping || emptyProductShipping();
      const address = productShipping[type] || {};
      return {
        ...current,
        productShipping: {
          ...productShipping,
          [type]: { ...address, [key]: value },
        },
      };
    });
  }

  function setCampaignEndDate(value) {
    if (value && minimumCampaignEndDate && value < minimumCampaignEndDate) return;
    setForm((current) => {
      return {
        ...current,
        endDate: value,
        deadline: value,
        dynamicFields: { ...current.dynamicFields, endDate: value },
      };
    });
  }

  useEffect(() => {
    if (!minimumCampaignEndDate) return;
    setForm((current) => {
      if (!current.endDate || current.endDate >= minimumCampaignEndDate) return current;
      return {
        ...current,
        endDate: "",
        deadline: "",
        dynamicFields: { ...current.dynamicFields, endDate: "" },
      };
    });
  }, [minimumCampaignEndDate]);

  function setDynamicField(key, value) {
    setForm((current) => ({ ...current, dynamicFields: { ...current.dynamicFields, [key]: value } }));
  }

  function setCampaignType(value) {
    const typeConfig = rules.campaignTypes.find((type) => type.key === value) || null;
    const allowedPayments = typeConfig?.allowedPaymentModels?.length ? typeConfig.allowedPaymentModels : rules.paymentModels;
    const paymentType = allowedPayments.some((model) => model.key === form.paymentType)
      ? form.paymentType
      : typeConfig?.defaultPaymentType || allowedPayments[0]?.key || "";
    const fields = rules.fieldsByCombination[`${value}:${paymentType}`] || [];
    const defaults = defaultDynamicValues(fields);
    setForm((current) => ({
      ...current,
      campaignType: value,
      paymentType,
      commissionPercent: Number(defaults.commissionPercent ?? defaults.commissionPercentage ?? current.commissionPercent ?? 0),
      attributionDays: Number(defaults.attributionDays ?? current.attributionDays ?? rules.attributionWindows[0]?.days ?? 0),
      dynamicFields: { ...defaults, campaignType: value, paymentType },
    }));
  }

  function setPaymentType(value) {
    const fields = rules.fieldsByCombination[`${form.campaignType}:${value}`] || [];
    const defaults = defaultDynamicValues(fields);
    const nextNames = fieldNames(fields);
    setForm((current) => ({
      ...current,
      paymentType: value,
      commissionPercent: Number(defaults.commissionPercent ?? defaults.commissionPercentage ?? current.commissionPercent ?? 0),
      attributionDays: Number(defaults.attributionDays ?? current.attributionDays ?? rules.attributionWindows[0]?.days ?? 0),
      selectedServices: ["fixed", "commission", "hybrid"].includes(value) || nextNames.has("selectedServices") || nextNames.has("services") ? current.selectedServices : [],
      fixedFee: value === "fixed" ? 0 : nextNames.has("fixedFee") || nextNames.has("fixedAmount") ? current.fixedFee : 0,
      dynamicFields: { ...defaults, paymentType: value },
    }));
  }

  function toggleProduct(productId) {
    setForm((current) => {
      const selected = new Set(current.productIds);
      if (selected.has(productId)) selected.delete(productId);
      else selected.add(productId);
      return { ...current, productIds: [...selected] };
    });
  }

  function togglePackageSelection(service, pkg) {
    const serviceId = String(service._id || service.id || service.serviceId);
    const pkgId = String(pkg._id || pkg.id || pkg.packageId || "");
    const key = packageKey(service, pkg);
    setForm((current) => {
      const exists = current.selectedServices.some((item) => String(item.selectionKey || "") === key);
      const existing = current.selectedServices.filter((item) => String(item.selectionKey || "") !== key);
      if (exists) return { ...current, selectedServices: existing, dynamicFields: { ...current.dynamicFields, selectedServices: existing, deliverableCommissionRates: existing } };
      const selectedServices = [
        ...existing,
        {
          selectionKey: key,
          serviceId,
          packageId: pkgId || undefined,
          packageName: pkg.packageName || pkg.name || service.serviceName,
          packageQuantity: packageQuantity(pkg),
          serviceTypeKey: service.serviceTypeKey,
          serviceName: service.serviceName,
          quantity: 1,
          units: 1,
          commissionPercentage: Math.max(0, Math.min(50, Number(current.commissionPercent || 0))),
          price: packagePrice(pkg, service),
          currency: pkg.currency || service.currency || "INR",
        },
      ];
      return {
        ...current,
        selectedServices,
        dynamicFields: { ...current.dynamicFields, selectedServices, deliverableCommissionRates: selectedServices },
      };
    });
  }

  function setDeliverableCommission(selectionKey, value) {
    const commissionPercentage = Math.max(0, Math.min(50, Number(value || 0)));
    setForm((current) => {
      const selectedServices = current.selectedServices.map((item) => (
        String(item.selectionKey || "") === String(selectionKey || "")
          ? { ...item, commissionPercentage }
          : item
      ));
      return {
        ...current,
        selectedServices,
        dynamicFields: { ...current.dynamicFields, selectedServices, deliverableCommissionRates: selectedServices },
      };
    });
  }

  function setDeliverableDueDate(selectionKey, dueDate) {
    if (dueDate && !isInputDateInRange(dueDate, minimumDeliverableDueDate, maximumDeliverableDueDate)) return;
    setForm((current) => {
      const selectedServices = current.selectedServices.map((item) => (
        String(item.selectionKey || "") === String(selectionKey || "")
          ? { ...item, dueDate }
          : item
      ));
      return {
        ...current,
        selectedServices,
        dynamicFields: { ...current.dynamicFields, selectedServices, deliverableCommissionRates: selectedServices },
      };
    });
  }

  useEffect(() => {
    setForm((current) => {
      let changed = false;
      const selectedServices = current.selectedServices.map((item) => {
        if (!item.dueDate || isInputDateInRange(item.dueDate, minimumDeliverableDueDate, maximumDeliverableDueDate)) return item;
        changed = true;
        return { ...item, dueDate: "" };
      });
      if (!changed) return current;
      return {
        ...current,
        selectedServices,
        dynamicFields: { ...current.dynamicFields, selectedServices, deliverableCommissionRates: selectedServices },
      };
    });
  }, [maximumDeliverableDueDate, minimumDeliverableDueDate]);

  function selectedPackage(service, pkg) {
    const key = packageKey(service, pkg);
    return form.selectedServices.find((item) => String(item.selectionKey || "") === key) || null;
  }

  const deliverableCommissionRatesFrom = useCallback((rows = [], fallbackPercent = form.commissionPercent) => {
    return rows.map((item) => ({
      selectionKey: item.selectionKey,
      serviceId: item.serviceId,
      packageId: item.packageId,
      serviceTypeKey: item.serviceTypeKey,
      serviceName: item.serviceName,
      packageName: item.packageName,
      commissionPercentage: Math.max(0, Math.min(50, Number(item.commissionPercentage ?? fallbackPercent ?? 0) || 0)),
    }));
  }, [form.commissionPercent]);

  const buildPayload = useCallback((source = form) => {
    const selectedServices = source.selectedServices.map(withoutSelectionKey);
    const deliverableCommissionRates = deliverableCommissionRatesFrom(source.selectedServices, source.commissionPercent);
    const fallbackCommissionPercent = ["commission", "hybrid"].includes(source.paymentType) && deliverableCommissionRates.length
      ? Math.max(...deliverableCommissionRates.map((item) => Number(item.commissionPercentage || 0)))
      : Number(source.commissionPercent || 0);
    const fixedReward = source.paymentType === "fixed"
      ? fixedRewardCalculationRows(source.selectedServices).reduce((sum, item) => sum + Number(item.total || 0), 0)
      : Number(source.fixedFee || 0);
    const dynamicFieldValues = {
      ...(source.dynamicFields || {}),
      selectedServices,
      deliverableCommissionRates,
      ...(source.paymentType === "fixed" ? {} : { fixedFee: fixedReward }),
      commissionPercent: fallbackCommissionPercent,
      commissionPercentage: fallbackCommissionPercent,
      attributionDays: Number(source.attributionDays || 0),
      expectedBudget: Number(source.expectedBudget || 0),
      productValue: Number(source.productValue || 0),
      shippingCost: Number(source.shippingCost || 0),
      contentCreationDays: Number(source.contentCreationDays || 7),
      campaignDurationDays: Number(source.campaignDurationDays || 30),
    };
    return {
      ...source,
      selectedServices,
      deliverableCommissionRates,
      dynamicFields: dynamicFieldValues,
      endDate: source.endDate || source.deadline || null,
      deadline: source.deadline || null,
      contentCreationDays: Number(source.contentCreationDays || 7),
      campaignDurationDays: Number(source.campaignDurationDays || 30),
      lifecycle: {
        contentCreationDays: Number(source.contentCreationDays || 7),
        campaignDurationDays: Number(source.campaignDurationDays || 30),
      },
      commissionPercent: fallbackCommissionPercent,
      ...(source.paymentType === "fixed" ? {} : { fixedFee: fixedReward }),
      marketplace: {
        ...source.marketplace,
        applicationDeadline: source.invitationDeadline || null,
        requiredDeliverables: splitLines(dynamicFieldValues.expectedDeliverables || dynamicFieldValues.deliverables || source.marketplace?.requiredDeliverables || []),
      },
      paymentModel: {
        paymentType: source.paymentType,
        selectedServices,
        services: selectedServices,
        deliverableCommissionRates,
        dynamicFields: dynamicFieldValues,
        ...(source.paymentType === "fixed" ? {} : { fixedFee: fixedReward }),
        calculatedFixedReward: source.paymentType === "fixed" ? fixedReward : undefined,
        commissionPercentage: fallbackCommissionPercent,
        attributionDays: Number(source.attributionDays || 0),
        expectedBudget: Number(source.expectedBudget || 0),
        commissionCap: Number(dynamicFieldValues.commissionCap || 0),
        productValue: Number(source.productValue || 0),
        shippingCost: Number(source.shippingCost || 0),
        shippingDetails: dynamicFieldValues.shippingDetails || "",
        returnRequired: Boolean(dynamicFieldValues.returnRequired),
        currency: dynamicFieldValues.currency || undefined,
      },
      productShipping: {
        ...(source.productShipping || emptyProductShipping()),
        productRequired: Boolean(source.productShipping?.productRequired),
        returnRequired: source.productShipping?.returnRequired !== false,
        shippingCost: Number(source.productShipping?.shippingCost || 0),
      },
    };
  }, [deliverableCommissionRatesFrom, form]);

  const refreshPreview = useCallback(async (nextForm = form) => {
    if (!nextForm.productIds.length) {
      setPreview(null);
      setPreviewError("");
      return;
    }
    setPreviewError("");
    try {
      const response = await previewVendorInfluencerCampaign(buildPayload(nextForm));
      setPreview(response?.data || null);
    } catch (err) {
      setPreview(null);
      setPreviewError(err?.response?.data?.message || "Unable to preview pricing.");
    }
  }, [buildPayload, form]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refreshPreview().catch(() => {});
    }, 350);
    return () => window.clearTimeout(timer);
  }, [refreshPreview]);

  async function submit(event) {
    event.preventDefault();
    const created = await onCreate(buildPayload());
    if (!created) return;
    const campaignType = rules.campaignTypes[0]?.key || "";
    const typeConfig = rules.campaignTypes[0] || null;
    const paymentType = typeConfig?.defaultPaymentType || typeConfig?.allowedPaymentModels?.[0]?.key || rules.paymentModels[0]?.key || "";
    const fields = rules.fieldsByCombination[`${campaignType}:${paymentType}`] || [];
    const defaults = defaultDynamicValues(fields);
    setForm({
      influencerId: initialInfluencerId || "",
      title: "",
      campaignType,
      productIds: initialProductKey ? initialProductKey.split("|") : [],
      paymentType,
      commissionPercent: Number(defaults.commissionPercent ?? defaults.commissionPercentage ?? 0),
      fixedFee: 0,
      attributionDays: Number(defaults.attributionDays ?? rules.attributionWindows[0]?.days ?? 0),
      expectedBudget: 0,
      productValue: 0,
      shippingCost: 0,
      selectedServices: [],
      dynamicFields: defaults,
      invitationDeadline: "",
      contentCreationDays: Number(configuration.schedulingSettings?.contentCreationDays || 7),
      campaignDurationDays: Number(configuration.schedulingSettings?.defaultCampaignDurationDays || configuration.schedulingSettings?.campaignDurationDays || 30),
      endDate: "",
      deadline: "",
      marketplace: { public: true },
      productShipping: emptyProductShipping(),
    });
    setPreview(null);
  }

  const fixedNeedsDeliverables = form.paymentType === "fixed" && !form.selectedServices.length;
  const commissionNeedsDeliverables = ["commission", "hybrid"].includes(form.paymentType) && !form.selectedServices.length;
  const commissionNeedsRates = ["commission", "hybrid"].includes(form.paymentType) && form.selectedServices.some((item) => Number(item.commissionPercentage || 0) <= 0);
  const needsScheduling = ["fixed", "hybrid"].includes(form.paymentType) || form.selectedServices.length > 0;
  const missingInvitationDeadline = Boolean(form.influencerId) && !form.invitationDeadline;
  const missingCampaignDates = needsScheduling && !form.endDate;
  const invalidCampaignEndDate = Boolean(form.endDate && minimumCampaignEndDate && form.endDate < minimumCampaignEndDate);
  const missingDeliverableDueDates = needsScheduling && form.selectedServices.some((item) => !item.dueDate);
  const invalidDeliverableDueDates = needsScheduling && form.selectedServices.some((item) => {
    if (!item.dueDate) return false;
    return !isInputDateInRange(item.dueDate, minimumDeliverableDueDate, maximumDeliverableDueDate);
  });
  const canSubmit = !busy && form.title.trim() && form.productIds.length && form.campaignType && form.paymentType && !fixedNeedsDeliverables && !commissionNeedsDeliverables && !commissionNeedsRates && !missingInvitationDeadline && !missingCampaignDates && !invalidCampaignEndDate && !missingDeliverableDueDates && !invalidDeliverableDueDates && !previewError;
  const submitHelp =
    !form.title.trim() ? "Add a campaign title to continue."
    : !form.productIds.length ? "Select at least one product."
    : !form.campaignType || !form.paymentType ? "Choose campaign and payment rules."
    : fixedNeedsDeliverables ? "Select deliverables from the creator's approved rate card to calculate the fixed reward."
    : commissionNeedsDeliverables ? "Select the creator deliverables before creating a commission campaign."
    : commissionNeedsRates ? "Set a commission percentage for each selected deliverable."
    : missingInvitationDeadline ? "Set the invitation acceptance deadline."
    : missingCampaignDates ? "Set the campaign end date."
    : invalidCampaignEndDate ? campaignEndDateHint
    : missingDeliverableDueDates ? "Set a due date for every fixed deliverable."
    : invalidDeliverableDueDates ? contentCreationWindowLabel
    : previewError || "";

  return (
    <form onSubmit={submit} className="space-y-5">
      <CampaignFormSection
        title="1. Campaign Basics"
        description="Name the campaign, decide whether it is public or invite-only, and choose the rule set that controls pricing."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <label className="block space-y-1.5 lg:col-span-2">
            <FieldLabel>Campaign Title</FieldLabel>
            <input value={form.title} onChange={(event) => setField("title", event.target.value)} placeholder="Example: Summer phone launch with reels" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" aria-label="Campaign title" />
            <FieldHint>Use a clear title your team and creators can recognize later.</FieldHint>
          </label>
          <label className="block space-y-1.5">
            <FieldLabel>Influencer</FieldLabel>
            <select value={form.influencerId} onChange={(event) => setForm((current) => ({ ...current, influencerId: event.target.value, selectedServices: [], productShipping: { ...(current.productShipping || emptyProductShipping()), deliveryAddressSnapshot: emptyProductShipping().deliveryAddressSnapshot } }))} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" aria-label="Invite influencer">
              <option value="">Public marketplace campaign</option>
              {influencerOptions.map((row) => {
                const id = influencerRowId(row);
                const username = influencerRowUsername(row);
                return <option key={id} value={id}>{influencerRowName(row)}{username ? ` @${username}` : ""}</option>;
              })}
            </select>
            <FieldHint>Leave public to let eligible creators apply.</FieldHint>
          </label>
          <label className="block space-y-1.5">
            <FieldLabel>Campaign Type</FieldLabel>
            <select value={form.campaignType} onChange={(event) => setCampaignType(event.target.value)} disabled={!rules.campaignTypes.length} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white disabled:opacity-60" aria-label="Campaign type">
              {!rules.campaignTypes.length ? <option value="">No campaign rules configured</option> : null}
              {rules.campaignTypes.map((type) => <option key={type.key} value={type.key}>{type.label}</option>)}
            </select>
          </label>
          <label className="block space-y-1.5">
            <FieldLabel>Invitation Acceptance Date Before</FieldLabel>
            <input type="date" min={toDateInputValue(new Date())} value={form.invitationDeadline} onChange={(event) => setField("invitationDeadline", event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" aria-label="Invitation acceptance date before" />
            <FieldHint>The influencer must accept before this date, otherwise the invitation expires automatically.</FieldHint>
          </label>
          <label className="block space-y-1.5">
            <FieldLabel>Campaign End Date</FieldLabel>
            <input type="date" min={minimumCampaignEndDate || undefined} value={form.endDate} onChange={(event) => setCampaignEndDate(event.target.value)} disabled={!minimumCampaignEndDate} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-900" aria-label="Campaign end date" />
            <FieldHint>{campaignEndDateHint}</FieldHint>
          </label>
          <label className="block space-y-1.5">
            <FieldLabel>Content Creation Days</FieldLabel>
            <input type="number" min="1" max="365" value={form.contentCreationDays} onChange={(event) => setField("contentCreationDays", event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" aria-label="Content creation days" />
            <FieldHint>Countdown starts after the influencer accepts.</FieldHint>
          </label>
          <label className="block space-y-1.5">
            <FieldLabel>Live Campaign Days</FieldLabel>
            <input type="number" min="1" max="3650" value={form.campaignDurationDays} onChange={(event) => setField("campaignDurationDays", event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" aria-label="Live campaign days" />
            <FieldHint>Runtime starts only after approved content is published.</FieldHint>
          </label>
          <label className="block space-y-1.5">
            <FieldLabel>Visibility</FieldLabel>
            <span className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
              <input type="checkbox" checked={form.marketplace.public} onChange={(event) => setForm((current) => ({ ...current, marketplace: { ...current.marketplace, public: event.target.checked } }))} />
              Marketplace
            </span>
          </label>
        </div>
      </CampaignFormSection>

      <CampaignFormSection
        title="2. Products & Payment"
        description="Choose the products creators should promote, then set the payment terms used for attribution and budgeting."
      >
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <fieldset className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <FieldLabel>Campaign Products</FieldLabel>
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                {form.productIds.length} selected
              </span>
            </div>
            <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-950">
              {products.map((row) => {
                const product = row.product || row;
                const productId = productRowId(row);
                const selected = form.productIds.includes(productId);
                if (!productId) return null;
                return (
                  <label key={productId} className={`grid cursor-pointer grid-cols-[auto_1fr] gap-3 rounded-lg border px-3 py-2 text-sm transition ${selected ? "border-indigo-300 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/30" : "border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-800 dark:hover:bg-slate-900"}`}>
                    <input className="mt-1" type="checkbox" checked={selected} onChange={() => toggleProduct(productId)} />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-slate-900 dark:text-white" title={product.name}>{product.name || "Untitled product"}</span>
                      <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                        {[product.category, product.price ? formatCurrency(product.price) : null, product.stock != null ? `${product.stock} in stock` : null].filter(Boolean).join(" - ") || "Ready for campaign selection"}
                      </span>
                    </span>
                  </label>
                );
              })}
              {!products.length ? <p className="px-2 py-4 text-sm text-slate-500">Add approved products before creating a campaign.</p> : null}
            </div>
          </fieldset>

          <div className="space-y-4">
            <label className="block space-y-1.5">
              <FieldLabel>Payment Model</FieldLabel>
              <select value={form.paymentType} onChange={(event) => setPaymentType(event.target.value)} disabled={!paymentModels.length} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white disabled:opacity-60" aria-label="Payment model">
                {!paymentModels.length ? <option value="">No valid payment models</option> : null}
                {paymentModels.map((model) => <option key={model.key} value={model.key}>{model.label}</option>)}
              </select>
              <FieldHint>{selectedPaymentModel?.description || "The model controls creator payout, commission reserve, and campaign budget behavior."}</FieldHint>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              {form.paymentType !== "fixed" && (dynamicNames.has("fixedFee") || dynamicNames.has("fixedAmount")) && !form.selectedServices.length ? (
                <label className="block space-y-1.5">
                  <FieldLabel>{dynamicFields.find((field) => ["fixedFee", "fixedAmount"].includes(field.fieldName || field.key))?.label || "Fixed Fee"}</FieldLabel>
                  <input type="number" min="0" value={form.fixedFee} onChange={(event) => setField("fixedFee", Number(event.target.value || 0))} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" aria-label="Fixed fee" />
                </label>
              ) : null}
              {(dynamicNames.has("commissionPercent") || dynamicNames.has("commissionPercentage")) && form.paymentType !== "commission" ? (
                <label className="block space-y-1.5">
                  <FieldLabel>{dynamicFields.find((field) => ["commissionPercent", "commissionPercentage"].includes(field.fieldName || field.key))?.label || "Commission %"}</FieldLabel>
                  <input type="number" min="0" max="50" value={form.commissionPercent} onChange={(event) => setField("commissionPercent", Number(event.target.value || 0))} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" aria-label="Commission percent" />
                </label>
              ) : null}
              {dynamicNames.has("attributionDays") ? (
                <label className="block space-y-1.5">
                  <FieldLabel>{dynamicFields.find((field) => (field.fieldName || field.key) === "attributionDays")?.label || "Attribution Window"}</FieldLabel>
                  <select value={form.attributionDays} onChange={(event) => setField("attributionDays", Number(event.target.value || 0))} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" aria-label="Attribution window">
                    {attributionWindows.map((window) => <option key={window.key || window.days} value={window.days}>{window.label || `${window.days} days`}</option>)}
                  </select>
                </label>
              ) : null}
              {(dynamicNames.has("expectedBudget") || dynamicNames.has("maximumBudget")) ? (
                <label className="block space-y-1.5">
                  <FieldLabel>{dynamicFields.find((field) => ["expectedBudget", "maximumBudget"].includes(field.fieldName || field.key))?.label || "Maximum Budget"}</FieldLabel>
                  <input type="number" min="0" value={form.expectedBudget} onChange={(event) => setField("expectedBudget", Number(event.target.value || 0))} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" aria-label="Expected budget" />
                </label>
              ) : null}
              {dynamicNames.has("productValue") ? (
                <label className="block space-y-1.5">
                  <FieldLabel>{dynamicFields.find((field) => (field.fieldName || field.key) === "productValue")?.label || "Product Value"}</FieldLabel>
                  <input type="number" min="0" value={form.productValue} onChange={(event) => setField("productValue", Number(event.target.value || 0))} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" aria-label="Product value" />
                </label>
              ) : null}
              {dynamicNames.has("shippingCost") ? (
                <label className="block space-y-1.5">
                  <FieldLabel>{dynamicFields.find((field) => (field.fieldName || field.key) === "shippingCost")?.label || "Shipping Cost"}</FieldLabel>
                  <input type="number" min="0" value={form.shippingCost} onChange={(event) => setField("shippingCost", Number(event.target.value || 0))} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" aria-label="Shipping cost" />
                </label>
              ) : null}
            </div>
          </div>
        </div>

        {form.paymentType === "fixed" ? (
          <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/20">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-950 dark:text-white">Fixed Campaign Reward</h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Rate Card Source: Influencer Approved Rate Card</p>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3 text-right shadow-sm dark:bg-slate-950">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Fixed Reward</p>
                <p className="text-xl font-black text-indigo-700 dark:text-indigo-300">{formatCurrency(calculatedFixedReward)}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div className="rounded-xl bg-white p-3 dark:bg-slate-950">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Selected Deliverables</p>
                <div className="mt-2 space-y-2">
                  {fixedCalculationRows.length ? fixedCalculationRows.map((row) => (
                    <div key={row.selectionKey || `${row.serviceId}-${row.packageId}`} className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{row.label}</span>
                      <span className="font-bold text-slate-950 dark:text-white">{formatCurrency(row.total)}</span>
                    </div>
                  )) : <p className="text-xs text-slate-500">Select deliverables below to calculate the reward.</p>}
                </div>
              </div>
              <div className="rounded-xl bg-white p-3 dark:bg-slate-950">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Calculation</p>
                <div className="mt-2 space-y-2">
                  {fixedCalculationRows.length ? fixedCalculationRows.map((row) => (
                    <div key={row.selectionKey || `${row.serviceId}-${row.packageId}-calc`} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-600 dark:text-slate-300">{formatCurrency(row.unitPrice)} × {row.units}</span>
                      <span className="font-bold text-slate-950 dark:text-white">{formatCurrency(row.total)}</span>
                    </div>
                  )) : <p className="text-xs text-slate-500">No deliverables selected.</p>}
                  <div className="border-t border-slate-200 pt-2 dark:border-slate-800">
                    <PriceSummaryRow label="Escrow Amount" value={calculatedFixedReward} strong />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-indigo-600" aria-hidden="true" />
              <div>
                <h4 className="text-sm font-bold text-slate-950 dark:text-white">Product Shipping</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Use this when the creator must receive a physical product before content starts.</p>
              </div>
            </div>
            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold dark:border-slate-700">
              <input
                type="checkbox"
                checked={Boolean(form.productShipping?.productRequired)}
                onChange={(event) => setProductShippingField("productRequired", event.target.checked)}
              />
              Product Required
            </label>
          </div>

          {form.productShipping?.productRequired ? (
            <div className="mt-4 space-y-4">
              <label className="inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={form.productShipping?.returnRequired !== false}
                  onChange={(event) => setProductShippingField("returnRequired", event.target.checked)}
                />
                Product return required after campaign
              </label>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <FieldLabel>Influencer Delivery Address</FieldLabel>
                  {selectedInfluencer ? <FieldHint>{influencerRowName(selectedInfluencer)}{influencerRowUsername(selectedInfluencer) ? ` @${influencerRowUsername(selectedInfluencer)}` : ""}</FieldHint> : <FieldHint>Select an influencer to auto-link this shipment to the creator.</FieldHint>}
                  {deliveryAddressStatus === "loading" ? <p className="mt-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300">Loading saved creator delivery address...</p> : null}
                  {deliveryAddressStatus === "loaded" && !isAddressEmpty(form.productShipping.deliveryAddressSnapshot) ? <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">Saved creator delivery address loaded.</p> : null}
                  {deliveryAddressStatus === "missing" && isAddressEmpty(form.productShipping.deliveryAddressSnapshot) ? <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">No saved creator address found yet. Ask the influencer to click Product Required in My Services and save a delivery address.</p> : null}
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {[
                      ["name", "Receiver name"],
                      ["phone", "Phone"],
                      ["addressLine1", "Address line 1"],
                      ["addressLine2", "Address line 2"],
                      ["city", "City"],
                      ["state", "State"],
                      ["postalCode", "Postal code"],
                      ["country", "Country"],
                    ].map(([key, label]) => (
                      <input
                        key={key}
                        value={form.productShipping.deliveryAddressSnapshot?.[key] || ""}
                        onChange={(event) => setProductShippingAddress("deliveryAddressSnapshot", key, event.target.value)}
                        placeholder={label}
                        className="h-10 rounded-lg border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        aria-label={`Delivery ${label}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <FieldLabel>Vendor Return Address</FieldLabel>
                  <FieldHint>Leave blank to use the default vendor pickup address saved in settings.</FieldHint>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {[
                      ["name", "Return contact"],
                      ["phone", "Phone"],
                      ["addressLine1", "Address line 1"],
                      ["addressLine2", "Address line 2"],
                      ["city", "City"],
                      ["state", "State"],
                      ["postalCode", "Postal code"],
                      ["country", "Country"],
                    ].map(([key, label]) => (
                      <input
                        key={key}
                        value={form.productShipping.returnAddressSnapshot?.[key] || ""}
                        onChange={(event) => setProductShippingAddress("returnAddressSnapshot", key, event.target.value)}
                        placeholder={label}
                        className="h-10 rounded-lg border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        aria-label={`Return ${label}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <label className="block space-y-1.5">
                  <FieldLabel>Courier Company</FieldLabel>
                  <input value={form.productShipping.courierCompany || ""} onChange={(event) => setProductShippingField("courierCompany", event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
                </label>
                <label className="block space-y-1.5">
                  <FieldLabel>Tracking Number</FieldLabel>
                  <input value={form.productShipping.trackingNumber || ""} onChange={(event) => setProductShippingField("trackingNumber", event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
                </label>
                <label className="block space-y-1.5">
                  <FieldLabel>Shipment Date</FieldLabel>
                  <input type="date" value={form.productShipping.shipmentDate || ""} onChange={(event) => setProductShippingField("shipmentDate", event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
                </label>
                <label className="block space-y-1.5">
                  <FieldLabel>Estimated Delivery</FieldLabel>
                  <input type="date" value={form.productShipping.estimatedDelivery || ""} onChange={(event) => setProductShippingField("estimatedDelivery", event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
                </label>
                <label className="block space-y-1.5">
                  <FieldLabel>Shipping Cost</FieldLabel>
                  <input type="number" min="0" value={form.productShipping.shippingCost || 0} onChange={(event) => setProductShippingField("shippingCost", Number(event.target.value || 0))} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
                </label>
                <label className="block space-y-1.5">
                  <FieldLabel>Package Weight</FieldLabel>
                  <input value={form.productShipping.packageWeight || ""} onChange={(event) => setProductShippingField("packageWeight", event.target.value)} placeholder="Example: 500 g" className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
                </label>
                <label className="block space-y-1.5 lg:col-span-2">
                  <FieldLabel>Tracking URL</FieldLabel>
                  <input value={form.productShipping.trackingUrl || ""} onChange={(event) => setProductShippingField("trackingUrl", event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
                </label>
              </div>
              <textarea value={form.productShipping.notes || ""} onChange={(event) => setProductShippingField("notes", event.target.value)} placeholder="Packaging notes, handoff instructions, or product condition notes" className="min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            </div>
          ) : null}
        </div>

        {allowsServiceSelection ? (
          <fieldset className="mt-5 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <FieldLabel>Creator Deliverables</FieldLabel>
              {["commission", "hybrid"].includes(form.paymentType) ? (
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Commission starts only for each published deliverable
                </span>
              ) : null}
            </div>
            <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-950">
              {selectedRateCard.length ? selectedRateCard.map((service) => (
                <div key={service._id || service.id} className="rounded-lg px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-900">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{service.serviceName}</span>
                    <span className="text-xs font-semibold text-slate-500">{service.minimumNoticePeriod ? `${service.minimumNoticePeriod}d notice` : ""}</span>
                  </div>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {servicePackages(service).map((pkg) => {
                      const selectedItem = selectedPackage(service, pkg);
                      const selected = Boolean(selectedItem);
                      const price = packagePrice(pkg, service);
                      const commissionMode = ["commission", "hybrid"].includes(form.paymentType);
                      return (
                        <div
                          key={packageKey(service, pkg)}
                          role="checkbox"
                          tabIndex={0}
                          aria-checked={selected}
                          onClick={() => togglePackageSelection(service, pkg)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              togglePackageSelection(service, pkg);
                            }
                          }}
                          className={`grid min-h-10 cursor-pointer grid-cols-[auto_1fr_minmax(96px,auto)] items-center gap-2 rounded-lg border px-2 py-1.5 text-sm ${selected ? "border-indigo-300 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/30" : "border-slate-100 dark:border-slate-800"}`}
                        >
                          <input type="checkbox" checked={selected} onClick={(event) => event.stopPropagation()} onChange={() => togglePackageSelection(service, pkg)} />
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-slate-800 dark:text-slate-100">{pkg.packageName || pkg.name || "Package"}</span>
                            <span className="text-xs text-slate-500">Package: {pkg.packageName || pkg.name || "Package"} · Quantity: {packageQuantity(pkg)} · Unit Price: {formatCurrency(packageUnitPrice(pkg, service))} · {pkg.deliveryDays ?? service.deliveryDays ?? 0}d · {pkg.revisionCount ?? service.revisionCount ?? 0} rev</span>
                            {selected && needsScheduling ? (
                              <span className="mt-2 grid max-w-56 gap-1" onClick={(event) => event.stopPropagation()}>
                                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Due Date</span>
                                <input
                                  type="date"
                                  min={minimumDeliverableDueDate || undefined}
                                  max={maximumDeliverableDueDate || undefined}
                                  value={selectedItem?.dueDate || ""}
                                  disabled={!contentCreationWindow.start || !contentCreationWindow.end}
                                  onChange={(event) => setDeliverableDueDate(selectedItem.selectionKey, event.target.value)}
                                  className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                  aria-label={`${pkg.packageName || service.serviceName} due date`}
                                />
                                <span className="text-[11px] font-medium text-slate-500">{contentCreationWindowLabel}</span>
                              </span>
                            ) : null}
                          </span>
                          {commissionMode ? (
                            selected ? (
                              <span className="flex items-center justify-end gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="50"
                                  step="0.1"
                                  value={selectedItem?.commissionPercentage ?? ""}
                                  onClick={(event) => event.stopPropagation()}
                                  onChange={(event) => setDeliverableCommission(selectedItem.selectionKey, event.target.value)}
                                  className="h-9 w-20 rounded-lg border border-slate-200 bg-white px-2 text-right text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                  aria-label={`${pkg.packageName || service.serviceName} commission percent`}
                                />
                                <span className="text-sm font-semibold text-slate-500">%</span>
                              </span>
                            ) : (
                              <span className="text-right text-xs font-semibold text-slate-400">Select</span>
                            )
                          ) : (
                            <span className="text-sm font-semibold text-slate-950 dark:text-white">{price ? formatCurrency(price) : "Request"}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )) : (
                <p className="px-2 py-4 text-sm text-slate-500">
                  {form.paymentType === "fixed" ? "Select a creator with an approved rate card to calculate the fixed reward." : "Select a creator with active services or enter a fallback fixed fee."}
                </p>
              )}
            </div>
          </fieldset>
        ) : null}

        {genericDynamicFields.length ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {genericDynamicFields.map((field) => (
              <DynamicCampaignField key={field.fieldName || field.key} field={field} value={form.dynamicFields?.[field.fieldName || field.key]} onChange={setDynamicField} />
            ))}
          </div>
        ) : null}
      </CampaignFormSection>

      <CampaignFormSection
        title="3. Review & Create"
        description="Check the estimated campaign cost before creating the campaign. Fixed-fee campaigns may require escrow funding after acceptance."
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-950 dark:text-white">{selectedPaymentModel?.label || "Payment Model"}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{form.productIds.length} product{form.productIds.length === 1 ? "" : "s"} selected</p>
              </div>
              <StatusBadge value={form.marketplace.public ? "marketplace" : "invite only"} />
            </div>
            <div className="mt-4 space-y-2">
              {form.paymentType === "fixed" ? (
                <>
                  <PriceSummaryRow label="Influencer Fixed Reward" value={preview?.pricing?.fixedCost ?? calculatedFixedReward} />
                  <PriceSummaryRow label="Platform Fees" value={fixedPaymentSummary?.platformFeeAmount || preview?.pricing?.platformFees || 0} />
                  <PriceSummaryRow label="Shipping" value={preview?.pricing?.shippingCost || 0} />
                  <PriceSummaryRow label="Other Admin Charges" value={(fixedPaymentSummary?.gatewayFeeAmount || 0) + (fixedPaymentSummary?.taxAmount || preview?.pricing?.taxes || 0)} />
                  <PriceSummaryRow label="Escrow Amount" value={fixedPaymentSummary?.escrowAmount ?? preview?.pricing?.fixedCost ?? calculatedFixedReward} />
                  <PriceSummaryRow label="Total Amount Payable" value={fixedPaymentSummary?.totalAmount ?? preview?.pricing?.totalBudget ?? calculatedFixedReward} strong />
                </>
              ) : (
                <>
                  <PriceSummaryRow label="Fixed fee" value={preview?.pricing?.fixedCost || 0} />
                  <PriceSummaryRow label="Commission reserve" value={preview?.pricing?.commissionReserve || 0} />
                  <PriceSummaryRow label="Product and shipping" value={(preview?.pricing?.productCost || 0) + (preview?.pricing?.shippingCost || 0)} />
                  <PriceSummaryRow label="Estimated total budget" value={preview?.pricing?.totalBudget || 0} strong />
                </>
              )}
            </div>
            {previewError ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{previewError}</p> : null}
          </div>

          <div className="flex flex-col justify-between rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-slate-950 dark:text-white">Ready to launch?</p>
              <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                The campaign will use the selected products, payment model, and marketplace visibility settings.
              </p>
              {submitHelp ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">{submitHelp}</p> : null}
            </div>
            <button type="submit" disabled={!canSubmit} className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50">
              <Send className="h-4 w-4" aria-hidden="true" />
              {busy ? "Creating..." : ["fixed", "hybrid"].includes(form.paymentType) ? "Send Invitation" : "Create Campaign"}
            </button>
          </div>
        </div>
        {fixedPaymentSummary && form.paymentType !== "fixed" ? (
          <div className="mt-5">
            <BudgetSummaryPanel campaign={{ title: form.title }} {...fixedPaymentSummary} />
          </div>
        ) : null}
      </CampaignFormSection>
    </form>
  );
}

function CampaignsView({ campaigns, pagination, products, influencers, configuration, selectedInfluencerId = "", selectedProductIds = [], busyId, onPage, onCreate, onReview, onStatus, onFund, onDelete }) {
  async function confirmDelete(campaign) {
    const title = campaign.title || "this campaign";
    if (await confirmAction({ message: `Delete "${title}"? This is only allowed before applications, content, or commissions exist.`, tone: "danger", confirmLabel: "Confirm" })) {
      onDelete(campaign);
    }
  }

  return (
    <div className="grid gap-5">
      <Section title="Create Campaign" icon={Megaphone}>
        <CampaignForm influencers={influencers} products={products} configuration={configuration} initialInfluencerId={selectedInfluencerId} initialProductIds={selectedProductIds} onCreate={onCreate} busy={busyId === "create-campaign"} />
      </Section>
      <Section title="Campaign Management" icon={Megaphone}>
        <ResponsiveTable
          headers={["Campaign", "Lifecycle", "End Date", "Budget", "Revenue", "Orders", "Applications", "Approved Creators", "Status", "Actions"]}
          rows={campaigns}
          renderRow={(campaign) => (
            (() => {
              const canDelete = campaign.canDelete === true;
              const deleteReason = campaign.deleteDisabledReason || "Delete is enabled only before applications, content, commissions, and sales attribution exist.";
              const state = String(campaign.state || "");
              const isBusy = busyId === campaign._id;
              const isActive = state === "active";
              const isPaused = state === "paused";
              const isCancelled = state === "cancelled";
              const isCompleted = state === "completed";
              const isExpired = state === "expired";
              const isTerminal = isCancelled || isCompleted || isExpired;
              const fixedFundingStatus = campaign.fixedPaymentWorkflow?.status || "";
              const canFundEscrow = ["fixed", "hybrid"].includes(campaign.paymentType)
                && ["accepted_awaiting_funding", "funding_pending"].includes(fixedFundingStatus);
              const escrowFunded = ["fixed", "hybrid"].includes(campaign.paymentType)
                && (
                  Boolean(campaign.fixedPaymentWorkflow?.fundedAt)
                  || Boolean(campaign.fixedPaymentWorkflow?.contentEnabled)
                  || ["funded", "content_in_progress", "vendor_approved", "partially_released", "fully_released"].includes(fixedFundingStatus)
                );
              const endDate = campaign.endDate || campaign.deadline || campaign.marketplace?.applicationDeadline;
              const paymentModel = campaign.paymentModel || campaign.paymentModelSnapshot || {};
              const attributionRule = campaign.attributionRule || {};
              const pricing = campaign.pricing || paymentModel.pricing || {};
              const budgetValue = ["fixed", "hybrid"].includes(campaign.paymentType)
                ? pricing.fixedCost || paymentModel.fixedFee || campaign.fixedFee || campaign.budget || 0
                : pricing.totalBudget || campaign.budget || campaign.fixedFee || 0;
              const paymentLabel = paymentModel.label || statusText(campaign.paymentType || paymentModel.type);
              const attributionDays = attributionRule.attributionDays || campaign.attributionWindowDays;
              return (
                <tr key={campaign._id} className="border-t border-slate-100 align-top dark:border-slate-800">
                  <td className="px-3 py-3 font-semibold text-slate-950 dark:text-white">
                    {campaign.title || "Campaign"}
                    <div className="text-xs font-normal capitalize text-slate-500">{statusText(campaign.campaignType)} - {paymentLabel || "Payment model"}</div>
                  </td>
                  <td className="px-3 py-3"><CampaignLifecycleTimeline campaign={campaign} /></td>
                  <td className="px-3 py-3">
                    {endDate ? formatDateTime(endDate) : "-"}
                    {isExpired ? <div className="mt-1 text-xs font-semibold text-rose-600">Tracking inactive</div> : null}
                  </td>
                  <td className="px-3 py-3">
                    {formatCurrency(budgetValue)}
                    {attributionDays ? <div className="text-xs text-slate-500">{attributionDays} day attribution</div> : null}
                  </td>
                  <td className="px-3 py-3">{formatCurrency(campaign.revenue || campaign.analytics?.revenue || 0)}</td>
                  <td className="px-3 py-3">{numberValue(campaign.orders || campaign.analytics?.orders || 0)}</td>
                  <td className="px-3 py-3">{campaign.applicationsCount || campaign.applications?.length || 0}</td>
                  <td className="px-3 py-3">{campaign.approvedCreators || 0}</td>
                  <td className="px-3 py-3">
                    <StatusBadge value={campaign.state} />
                    {campaign.productShipping?.productRequired ? (
                      <div className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-300">
                        Product: {statusText(campaign.productShipping.shipmentStatus || "pending_shipment")}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button disabled={isBusy || isActive || isTerminal} onClick={() => onStatus(campaign, "activate")} className="rounded-lg border border-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-900/50 dark:text-emerald-300">{isActive ? "Active" : "Activate"}</button>
                      <button disabled={isBusy || isPaused || isTerminal} onClick={() => onStatus(campaign, "pause")} className="rounded-lg border border-amber-200 px-2 py-1 text-xs font-semibold text-amber-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-900/50 dark:text-amber-300">{isExpired ? "Expired" : isCancelled ? "Cancelled" : isPaused ? "Paused" : "Pause"}</button>
                      <button disabled={isBusy || isCancelled || isCompleted} onClick={() => onStatus(campaign, "close")} className="rounded-lg border border-slate-200 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700">{isCompleted ? "Closed" : isCancelled ? "Cancelled" : isExpired ? "Close" : "Close"}</button>
                      {canFundEscrow ? (
                        <button disabled={busyId === `fund-${campaign._id}`} onClick={() => onFund(campaign)} className="rounded-lg bg-indigo-600 px-2 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
                          Fund Escrow
                        </button>
                      ) : null}
                      {escrowFunded ? (
                        <button disabled className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 disabled:cursor-default dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                          Funded
                        </button>
                      ) : null}
                      {["fixed", "hybrid"].includes(campaign.paymentType) && campaign.fixedPaymentWorkflow?.status === "vendor_approved" ? (
                        <span className="rounded-lg border border-indigo-200 px-2 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-900/50 dark:text-indigo-300">
                          Awaiting admin release
                        </span>
                      ) : null}
                      {["fixed", "hybrid"].includes(campaign.paymentType) && campaign.fixedPaymentWorkflow?.contentEnabled && !isTerminal ? (
                        <span className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                          Refunds handled by admin finance
                        </span>
                      ) : null}
                      <button
                        disabled={!canDelete || busyId === `delete-${campaign._id}`}
                        title={canDelete ? "Delete campaign" : deleteReason}
                        onClick={() => confirmDelete(campaign)}
                        className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:opacity-60 dark:border-rose-900/50 dark:text-rose-300 dark:hover:bg-rose-950/30 dark:disabled:border-slate-800 dark:disabled:text-slate-600"
                      >
                        Delete
                      </button>
                    </div>
                    {campaign.productShipping?.productRequired ? (
                      <div className="mt-2 max-w-xs rounded-lg bg-slate-50 px-2 py-1.5 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                        <span className="font-semibold">Logistics:</span> {statusText(campaign.productShipping.shipmentStatus || "pending_shipment")}
                        {campaign.productShipping.courierCompany ? ` via ${campaign.productShipping.courierCompany}` : ""}
                        {campaign.productShipping.trackingNumber ? ` · ${campaign.productShipping.trackingNumber}` : ""}
                      </div>
                    ) : null}
                    {!canDelete ? <p className="mt-2 max-w-xs text-xs text-slate-500">{deleteReason}</p> : null}
                    {(campaign.applications || []).length ? (
                      <div className="mt-3 space-y-2">
                        {(campaign.applications || []).map((application) => {
                          const applicationInfluencerId = String(application.influencerId?._id || application.influencerId);
                          const applicationBusy = busyId === `${campaign._id}-${applicationInfluencerId}`;
                          const isApproved = application.status === "approved";
                          const isRejected = application.status === "rejected";
                          return (
                            <div key={applicationInfluencerId} className="flex flex-wrap items-center gap-2 text-xs">
                              <StatusBadge value={application.status} />
                              <button disabled={applicationBusy || isApproved || isTerminal} onClick={() => onReview(campaign, { ...application, influencerId: applicationInfluencerId }, "approve")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><CheckCircle2 className="h-3 w-3" />{isApproved ? "Approved" : "Approve"}</button>
                              <button disabled={applicationBusy || isRejected || isTerminal} onClick={() => onReview(campaign, { ...application, influencerId: applicationInfluencerId }, "reject")} className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2 py-1 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><XCircle className="h-3 w-3" />{isRejected ? "Rejected" : "Reject"}</button>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })()
          )}
        />
        <Pagination pagination={pagination} onPage={onPage} />
      </Section>
    </div>
  );
}

export default CampaignsView;
