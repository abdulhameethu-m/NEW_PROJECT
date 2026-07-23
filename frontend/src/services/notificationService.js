/* eslint-disable no-unused-vars */
let handlers = null;

export function registerNotificationHandlers(nextHandlers) {
  handlers = nextHandlers;
  return () => {
    if (handlers === nextHandlers) handlers = null;
  };
}

function notify(type, message, options = {}) {
  if (!handlers?.showNotification) return "";
  return handlers.showNotification({ ...options, type, message });
}

export function showSuccess(message, options = {}) {
  return notify("success", message, options);
}

export function showError(message, options = {}) {
  return notify("error", message, options);
}

function showWarning(message, options = {}) {
  return notify("warning", message, options);
}

function showInfo(message, options = {}) {
  return notify("info", message, options);
}

function showLoading(message, options = {}) {
  return notify("loading", message, { duration: 0, ...options });
}

function dismissNotification(id) {
  handlers?.dismissNotification?.(id);
}

function clearNotifications() {
  handlers?.clearNotifications?.();
}

export function confirmAction(options = {}) {
  if (!handlers?.confirmAction) return Promise.resolve(false);
  return handlers.confirmAction(options);
}

export function requestInput(options = {}) {
  if (!handlers?.requestInput) return Promise.resolve(null);
  return handlers.requestInput(options);
}
