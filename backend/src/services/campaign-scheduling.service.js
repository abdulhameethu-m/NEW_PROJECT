const PlatformConfig = require("../models/PlatformConfig");
const { AppError } = require("../utils/AppError");

const SETTINGS_KEY = "campaign_scheduling_settings";
const SETTINGS_CATEGORY = "feature";
const SETTINGS_TYPE = "object";

const DEFAULT_SETTINGS = Object.freeze({
  invitationAcceptanceDays: 2,
  contentCreationDays: 7,
  defaultCampaignDurationDays: 30,
  minimumCampaignLeadTimeDays: 3,
  minimumPublishNoticeHours: 0,
  autoPublish: false,
  enableDeadlineReminders: true,
  autoExpireDeliverables: true,
  autoExpireCampaign: true,
  enableEscrowRefund: true,
  gracePeriodHours: 0,
});

let cache = { fetchedAt: 0, value: null };
const CACHE_MS = Number(process.env.CAMPAIGN_SCHEDULING_SETTINGS_CACHE_MS || 8000);

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function cleanSettings(value = {}) {
  return {
    invitationAcceptanceDays: Math.max(1, Math.floor(number(value.invitationAcceptanceDays, DEFAULT_SETTINGS.invitationAcceptanceDays))),
    contentCreationDays: Math.max(1, Math.floor(number(value.contentCreationDays, DEFAULT_SETTINGS.contentCreationDays))),
    defaultCampaignDurationDays: Math.max(1, Math.floor(number(value.defaultCampaignDurationDays, DEFAULT_SETTINGS.defaultCampaignDurationDays))),
    minimumCampaignLeadTimeDays: Math.max(0, Math.floor(number(value.minimumCampaignLeadTimeDays, DEFAULT_SETTINGS.minimumCampaignLeadTimeDays))),
    minimumPublishNoticeHours: Math.max(0, number(value.minimumPublishNoticeHours, DEFAULT_SETTINGS.minimumPublishNoticeHours)),
    autoPublish: Boolean(value.autoPublish),
    enableDeadlineReminders: value.enableDeadlineReminders !== false,
    autoExpireDeliverables: value.autoExpireDeliverables !== false,
    autoExpireCampaign: value.autoExpireCampaign !== false,
    enableEscrowRefund: value.enableEscrowRefund !== false,
    gracePeriodHours: Math.max(0, number(value.gracePeriodHours, DEFAULT_SETTINGS.gracePeriodHours)),
  };
}

function parseDate(value, field) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(`Invalid ${field}`, 400, "VALIDATION_ERROR", { field });
  }
  return date;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + Number(days || 0));
  return next;
}

function addHours(date, hours) {
  const next = new Date(date);
  next.setTime(next.getTime() + Number(hours || 0) * 60 * 60 * 1000);
  return next;
}

function dateParts(dateValue, field = "dateTime") {
  if (!dateValue) return null;
  if (typeof dateValue === "string") {
    const match = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return {
        year: Number(match[1]),
        month: Number(match[2]),
        day: Number(match[3]),
      };
    }
  }
  const date = parseDate(dateValue, field);
  if (!date) return null;
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function timeZoneOffsetMs(timeZone = "UTC", date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(date).reduce((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});
    const localAsUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second)
    );
    return localAsUtc - date.getTime();
  } catch {
    return 0;
  }
}

function zonedDateTimeToUtc(parts, timeZone = "UTC") {
  const guess = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hours, parts.minutes, 0, 0);
  const first = guess - timeZoneOffsetMs(timeZone, new Date(guess));
  const second = guess - timeZoneOffsetMs(timeZone, new Date(first));
  return new Date(second);
}

function combineDateAndTime(dateValue, timeValue = "23:59", field = "dateTime", timezone = "UTC") {
  const date = dateParts(dateValue, field);
  if (!date) return null;
  const time = String(timeValue || "23:59").trim();
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) throw new AppError(`Invalid ${field} time`, 400, "VALIDATION_ERROR", { field });
  const hours = Math.min(23, Math.max(0, Number(match[1])));
  const minutes = Math.min(59, Math.max(0, Number(match[2])));
  return zonedDateTimeToUtc({ ...date, hours, minutes }, timezone || "UTC");
}

function startOfUtcDay(date = new Date()) {
  const next = new Date(date);
  next.setUTCHours(0, 0, 0, 0);
  return next;
}

function endOfUtcDay(date = new Date()) {
  const next = new Date(date);
  next.setUTCHours(23, 59, 59, 999);
  return next;
}

async function getSettings({ force = false } = {}) {
  if (!force && cache.value && Date.now() - cache.fetchedAt < CACHE_MS) return cache.value;
  let doc = await PlatformConfig.findOne({ key: SETTINGS_KEY }).select("value").lean();
  if (!doc) {
    const created = await PlatformConfig.create({
      key: SETTINGS_KEY,
      value: DEFAULT_SETTINGS,
      description: "Campaign scheduling, deliverable deadline, publish lock, and refund eligibility settings.",
      category: SETTINGS_CATEGORY,
      type: SETTINGS_TYPE,
      isPublic: false,
    });
    doc = { value: created.value };
  }
  cache = { fetchedAt: Date.now(), value: cleanSettings({ ...DEFAULT_SETTINGS, ...(doc.value || {}) }) };
  return cache.value;
}

async function updateSettings(payload = {}) {
  const value = cleanSettings({ ...DEFAULT_SETTINGS, ...payload });
  await PlatformConfig.findOneAndUpdate(
    { key: SETTINGS_KEY },
    {
      $set: {
        value,
        description: "Campaign scheduling, deliverable deadline, publish lock, and refund eligibility settings.",
        category: SETTINGS_CATEGORY,
        type: SETTINGS_TYPE,
        isPublic: false,
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );
  cache = { fetchedAt: Date.now(), value };
  return value;
}

function supportsFixedScheduling(campaignOrPaymentType = {}) {
  const paymentType = typeof campaignOrPaymentType === "string"
    ? campaignOrPaymentType
    : campaignOrPaymentType.paymentType || campaignOrPaymentType.paymentModelSnapshot?.paymentType;
  return ["fixed", "hybrid"].includes(String(paymentType || "").toLowerCase());
}

async function normalizeCampaignSchedule(payload = {}, paymentType = "", { now = new Date() } = {}) {
  const settings = await getSettings();
  const rawEnd = payload.endDate || payload.campaignEndDate || payload.timeline?.campaignEndDate || payload.paymentModel?.endDate || payload.dynamicFields?.campaignEndDate || payload.deadline;
  const endDate = parseDate(rawEnd, "endDate");
  if (endDate && typeof rawEnd === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rawEnd)) {
    endDate.setUTCHours(23, 59, 59, 999);
  }
  const selectedDeliverables = [
    ...(Array.isArray(payload.selectedServices) ? payload.selectedServices : []),
    ...(Array.isArray(payload.paymentModel?.selectedServices) ? payload.paymentModel.selectedServices : []),
    ...(Array.isArray(payload.paymentModel?.services) ? payload.paymentModel.services : []),
    ...(Array.isArray(payload.dynamicFields?.selectedServices) ? payload.dynamicFields.selectedServices : []),
  ].filter(Boolean);
  const deliverables = selectedDeliverables.filter((row) => row.dueDate || row.expectedCompletionDate);
  const requiresEndDate = supportsFixedScheduling(paymentType) || selectedDeliverables.length > 0;

  if (!requiresEndDate && !endDate) {
    return { startDate: null, endDate: null, scheduling: { settingsSnapshot: settings } };
  }
  if (requiresEndDate && !endDate) {
    throw new AppError("Campaign end date is required when deliverables are scheduled.", 400, "CAMPAIGN_SCHEDULE_REQUIRED", { field: "endDate" });
  }
  if (selectedDeliverables.some((row) => !row.dueDate && !row.expectedCompletionDate)) {
    throw new AppError("Every selected deliverable requires its own due date.", 400, "DELIVERABLE_DUE_DATE_REQUIRED", { field: "dueDate" });
  }

  deliverables.forEach((deliverable) => validateDeliverableDueDate(deliverable.dueDate || deliverable.expectedCompletionDate, { endDate, scheduling: { settingsSnapshot: settings } }, { now }));

  return {
    startDate: null,
    endDate,
    scheduling: {
      settingsSnapshot: settings,
      validationBaseAt: now,
      affiliateEnabled: false,
      trackingEnabled: false,
      commissionEnabled: false,
    },
  };
}

function validateDeliverableDueDate(dueDate, campaign = {}, { now = new Date() } = {}) {
  const due = parseDate(dueDate, "dueDate");
  if (!due) return null;
  if (typeof dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    due.setUTCHours(23, 59, 59, 999);
  }
  const settings = cleanSettings({ ...DEFAULT_SETTINGS, ...(campaign.scheduling?.settingsSnapshot || {}) });
  const baseline = campaign.scheduling?.validationBaseAt ? new Date(campaign.scheduling.validationBaseAt) : now;
  const earliestDueDate = startOfUtcDay(addDays(startOfUtcDay(baseline), settings.minimumCampaignLeadTimeDays));
  const end = parseDate(campaign.endDate || campaign.deadline, "endDate");
  if (end) end.setUTCHours(23, 59, 59, 999);
  if (due.getTime() < earliestDueDate.getTime()) {
    throw new AppError(
      `Deliverable due date must be at least ${settings.minimumCampaignLeadTimeDays} day(s) from today.`,
      400,
      "DELIVERABLE_DUE_DATE_INVALID",
      { field: "dueDate", minimumCampaignLeadTimeDays: settings.minimumCampaignLeadTimeDays }
    );
  }
  if (end && due.getTime() >= endOfUtcDay(end).getTime()) {
    throw new AppError("Campaign end date must be after all deliverable due dates.", 400, "DELIVERABLE_DUE_DATE_INVALID", { field: "dueDate" });
  }
  return due;
}

async function validatePublishSchedule({ campaign, deliverable, publishDate, publishTime = "00:00", timezone = "UTC", now = new Date() }) {
  const settings = await getSettings();
  const scheduledPublishAt = combineDateAndTime(publishDate, publishTime, "publishDate", timezone);
  if (!scheduledPublishAt) throw new AppError("Publish date and time are required when approving a deliverable.", 400, "PUBLISH_SCHEDULE_REQUIRED", { field: "publishDate" });
  const minimum = addHours(now, settings.minimumPublishNoticeHours);
  if (scheduledPublishAt.getTime() < minimum.getTime()) {
    throw new AppError("Publish date is earlier than the configured minimum publish notice.", 400, "PUBLISH_NOTICE_REQUIRED", { field: "publishDate" });
  }
  const campaignEnd = parseDate(campaign.endDate || campaign.deadline, "endDate");
  if (campaignEnd && scheduledPublishAt.getTime() > endOfUtcDay(campaignEnd).getTime()) {
    throw new AppError("Publish date must be on or before the campaign end date.", 400, "PUBLISH_DATE_INVALID", { field: "publishDate" });
  }
  const due = parseDate(deliverable.dueDate || deliverable.expectedCompletionDate, "dueDate");
  if (due && startOfUtcDay(scheduledPublishAt).getTime() < startOfUtcDay(due).getTime()) {
    throw new AppError("Publish date must be on or after the deliverable due date.", 400, "PUBLISH_DATE_INVALID", { field: "publishDate" });
  }
  return { scheduledPublishAt, publishDate: scheduledPublishAt, publishTime, publishTimezone: timezone || "UTC" };
}

function assertUploadOpen(deliverable = {}, now = new Date()) {
  if (["expired", "missed_deadline", "cancelled", "published"].includes(String(deliverable.status || "").toLowerCase())) {
    throw new AppError("Deliverable Deadline Expired. This deliverable can no longer be uploaded.", 409, "DELIVERABLE_DEADLINE_EXPIRED");
  }
  const due = deliverable.dueDate || deliverable.expectedCompletionDate;
  if (due && endOfUtcDay(parseDate(due, "dueDate")).getTime() < now.getTime()) {
    throw new AppError("Deliverable Deadline Expired. This deliverable can no longer be uploaded.", 409, "DELIVERABLE_DEADLINE_EXPIRED");
  }
}

function assertPublishOpen(campaign = {}, deliverable = {}, now = new Date()) {
  const endDate = campaign.endDate || campaign.deadline || campaign.marketplace?.applicationDeadline;
  if (endDate && new Date(endDate).getTime() <= now.getTime()) {
    throw new AppError("Campaign expired. Publishing is no longer allowed.", 409, "CAMPAIGN_EXPIRED");
  }
  const publishAt = deliverable.publishDate && deliverable.publishTime
    ? combineDateAndTime(deliverable.publishDate, deliverable.publishTime, "publishDate", deliverable.publishTimezone || "UTC")
    : deliverable.scheduledPublishAt || deliverable.publishDate;
  if (publishAt && new Date(publishAt).getTime() > now.getTime()) {
    throw new AppError("Publishing scheduled. Publish button is not available yet.", 409, "PUBLISH_LOCKED", { availableAt: publishAt });
  }
}

module.exports = {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  addDays,
  assertPublishOpen,
  assertUploadOpen,
  combineDateAndTime,
  endOfUtcDay,
  getSettings,
  normalizeCampaignSchedule,
  startOfUtcDay,
  supportsFixedScheduling,
  updateSettings,
  validateDeliverableDueDate,
  validatePublishSchedule,
};
