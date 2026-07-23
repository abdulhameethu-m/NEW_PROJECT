import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Info, Loader2, ShieldAlert, TriangleAlert, X } from "lucide-react";
import { registerNotificationHandlers } from "../services/notificationService";

const NotificationContext = createContext(null);

const toneStyles = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950 dark:text-emerald-100",
  error: "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950 dark:text-rose-100",
  warning: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950 dark:text-amber-100",
  loading: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/60 dark:bg-blue-950 dark:text-blue-100",
  info: "border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100",
};

const toneIcons = {
  success: CheckCircle2,
  error: ShieldAlert,
  warning: TriangleAlert,
  loading: Loader2,
  info: Info,
};

function parseTimeParts(value = "") {
  const raw = String(value || "").trim();
  const amPmMatch = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*([ap])\.?\s*m\.?$/i);
  if (amPmMatch) {
    const hour = Math.min(12, Math.max(1, Number(amPmMatch[1]) || 10));
    const minute = Math.min(59, Math.max(0, Number(amPmMatch[2] || 0)));
    return {
      hour: String(hour),
      minute: String(minute).padStart(2, "0"),
      period: amPmMatch[3].toUpperCase() === "P" ? "PM" : "AM",
    };
  }
  const [hourValue = "10", minuteValue = "00"] = raw.split(":");
  const hour24 = Math.min(23, Math.max(0, Number(hourValue) || 10));
  const minute = Math.min(59, Math.max(0, Number(minuteValue) || 0));
  const hour12 = hour24 % 12 || 12;
  return {
    hour: String(hour12),
    minute: String(minute).padStart(2, "0"),
    period: hour24 >= 12 ? "PM" : "AM",
  };
}

function timePartsToValue(parts = {}) {
  const hour12 = Math.min(12, Math.max(1, Number(parts.hour) || 12));
  const minute = Math.min(59, Math.max(0, Number(parts.minute) || 0));
  const hour24 = parts.period === "PM" ? (hour12 % 12) + 12 : hour12 % 12;
  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function createNotification(input) {
  return {
    id: input.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: input.type || "info",
    title: input.title || "",
    message: input.message || "",
    duration: input.duration ?? (input.type === "error" ? 7000 : 3500),
    action: input.action || null,
  };
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [confirmation, setConfirmation] = useState(null);
  const [inputRequest, setInputRequest] = useState(null);
  const [timeParts, setTimeParts] = useState(parseTimeParts("10:00"));
  const inputRef = useRef(null);

  const dismissNotification = useCallback((id) => {
    setNotifications((items) => items.filter((item) => item.id !== id));
  }, []);

  const showNotification = useCallback((input) => {
    const next = createNotification(input);
    setNotifications((items) => [next, ...items].slice(0, 6));
    return next.id;
  }, []);

  const clearNotifications = useCallback(() => setNotifications([]), []);

  const confirmAction = useCallback((options = {}) => new Promise((resolve) => {
    setConfirmation({
      title: options.title || "Confirm action",
      message: options.message || "Do you want to continue?",
      confirmLabel: options.confirmLabel || "Continue",
      cancelLabel: options.cancelLabel || "Cancel",
      tone: options.tone || "warning",
      resolve,
    });
  }), []);

  const requestInput = useCallback((options = {}) => new Promise((resolve) => {
    setInputRequest({
      title: options.title || "Input required",
      message: options.message || "",
      label: options.label || "Value",
      defaultValue: options.defaultValue || "",
      placeholder: options.placeholder || "",
      confirmLabel: options.confirmLabel || "Submit",
      cancelLabel: options.cancelLabel || "Cancel",
      multiline: Boolean(options.multiline),
      type: options.type || "text",
      min: options.min,
      max: options.max,
      step: options.step,
      inputMode: options.inputMode,
      pattern: options.pattern,
      required: options.required !== false,
      resolve,
    });
  }), []);

  useEffect(() => registerNotificationHandlers({ showNotification, dismissNotification, clearNotifications, confirmAction, requestInput }), [clearNotifications, confirmAction, dismissNotification, requestInput, showNotification]);

  useEffect(() => {
    if (inputRequest && inputRef.current) inputRef.current.focus();
  }, [inputRequest]);

  useEffect(() => {
    if (inputRequest?.type === "time") {
      setTimeParts(parseTimeParts(inputRequest.defaultValue || "10:00"));
    }
  }, [inputRequest]);

  const value = useMemo(() => ({
    showNotification,
    dismissNotification,
    clearNotifications,
    confirmAction,
    requestInput,
    showSuccess: (message, options = {}) => showNotification({ ...options, type: "success", message }),
    showError: (message, options = {}) => showNotification({ ...options, type: "error", message }),
    showWarning: (message, options = {}) => showNotification({ ...options, type: "warning", message }),
    showInfo: (message, options = {}) => showNotification({ ...options, type: "info", message }),
    showLoading: (message, options = {}) => showNotification({ ...options, type: "loading", message, duration: 0 }),
  }), [clearNotifications, confirmAction, dismissNotification, requestInput, showNotification]);

  function resolveConfirmation(result) {
    confirmation?.resolve(Boolean(result));
    setConfirmation(null);
  }

  function resolveInput(result) {
    const value = inputRequest?.type === "time" ? timePartsToValue(timeParts) : inputRef.current?.value || "";
    inputRequest?.resolve(result ? value : null);
    setInputRequest(null);
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[80] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-3" aria-live="polite" aria-relevant="additions">
        {notifications.map((item) => {
          const Icon = toneIcons[item.type] || Info;
          return (
            <div key={item.id} className={`pointer-events-auto rounded-xl border p-4 shadow-xl ${toneStyles[item.type] || toneStyles.info}`} role={item.type === "error" ? "alert" : "status"}>
              <div className="flex gap-3">
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${item.type === "loading" ? "animate-spin" : ""}`} />
                <div className="min-w-0 flex-1">
                  {item.title ? <div className="text-sm font-black">{item.title}</div> : null}
                  <div className="text-sm font-semibold">{item.message}</div>
                  {item.action ? <button type="button" onClick={item.action.onClick} className="mt-2 text-xs font-black underline">{item.action.label}</button> : null}
                </div>
                <button type="button" onClick={() => dismissNotification(item.id)} className="rounded-full p-1 opacity-70 hover:bg-black/5 hover:opacity-100" aria-label="Dismiss notification">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {confirmation ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="confirmation-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <h2 id="confirmation-title" className="text-lg font-black text-slate-950 dark:text-white">{confirmation.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{confirmation.message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => resolveConfirmation(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">{confirmation.cancelLabel}</button>
              <button type="button" onClick={() => resolveConfirmation(true)} className={`rounded-xl px-4 py-2 text-sm font-bold text-white ${confirmation.tone === "danger" ? "bg-rose-600 hover:bg-rose-700" : "bg-slate-950 hover:bg-slate-800 dark:bg-white dark:text-slate-950"}`}>{confirmation.confirmLabel}</button>
            </div>
          </div>
        </div>
      ) : null}

      {inputRequest ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="input-title">
          <form className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900" onSubmit={(event) => { event.preventDefault(); resolveInput(true); }}>
            <h2 id="input-title" className="text-lg font-black text-slate-950 dark:text-white">{inputRequest.title}</h2>
            {inputRequest.message ? <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{inputRequest.message}</p> : null}
            <label className="mt-4 block text-xs font-black uppercase text-slate-500" htmlFor="notification-input">{inputRequest.label}</label>
            {inputRequest.multiline ? (
              <textarea id="notification-input" ref={inputRef} defaultValue={inputRequest.defaultValue} placeholder={inputRequest.placeholder} required={inputRequest.required} rows={4} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            ) : inputRequest.type === "time" ? (
              <div className="mt-2 grid grid-cols-[1fr_1fr_1fr] gap-2">
                <select
                  id="notification-input"
                  value={timeParts.hour}
                  onChange={(event) => setTimeParts((current) => ({ ...current, hour: event.target.value }))}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((hour) => <option key={hour} value={hour}>{hour}</option>)}
                </select>
                <select
                  value={timeParts.minute}
                  onChange={(event) => setTimeParts((current) => ({ ...current, minute: event.target.value }))}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  {Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0")).map((minute) => <option key={minute} value={minute}>{minute}</option>)}
                </select>
                <select
                  value={timeParts.period}
                  onChange={(event) => setTimeParts((current) => ({ ...current, period: event.target.value }))}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="AM">A.M</option>
                  <option value="PM">P.M</option>
                </select>
              </div>
            ) : (
              <input id="notification-input" ref={inputRef} type={inputRequest.type} defaultValue={inputRequest.defaultValue} placeholder={inputRequest.placeholder} required={inputRequest.required} min={inputRequest.min} max={inputRequest.max} step={inputRequest.step} inputMode={inputRequest.inputMode} pattern={inputRequest.pattern} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => resolveInput(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">{inputRequest.cancelLabel}</button>
              <button type="submit" className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950">{inputRequest.confirmLabel}</button>
            </div>
          </form>
        </div>
      ) : null}
    </NotificationContext.Provider>
  );
}
