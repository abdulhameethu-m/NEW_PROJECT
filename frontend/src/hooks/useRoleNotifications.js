import { useCallback, useEffect, useRef, useState } from "react";
import {
  getNotificationSummary,
  markNotificationsRead,
} from "../services/notificationService";

const EMPTY_SUMMARY = {
  total: 0,
  modules: {},
  subModules: {},
};

const DEFAULT_RATE_LIMIT_BACKOFF_MS = 60_000;
const AUTO_READ_COOLDOWN_MS = 60_000;

function retryAfterDelay(error) {
  const retryAfter = error?.response?.headers?.["retry-after"];
  const retrySeconds = Number(retryAfter);
  return Number.isFinite(retrySeconds) && retrySeconds > 0
    ? retrySeconds * 1000
    : DEFAULT_RATE_LIMIT_BACKOFF_MS;
}

export function useRoleNotifications(role, activeTarget = null, pollingInterval = 15000) {
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const inFlightAutoReadRef = useRef(null);
  const inFlightSummaryRef = useRef(null);
  const lastAutoReadAtRef = useRef({});
  const rateLimitedUntilRef = useRef(0);
  const summaryRef = useRef(EMPTY_SUMMARY);

  const refresh = useCallback(async () => {
    if (Date.now() < rateLimitedUntilRef.current) {
      setLoading(false);
      return summaryRef.current;
    }
    if (inFlightSummaryRef.current) {
      return inFlightSummaryRef.current;
    }

    inFlightSummaryRef.current = (async () => {
      const response = await getNotificationSummary(role);
      const nextSummary = response.data || EMPTY_SUMMARY;
      summaryRef.current = nextSummary;
      setSummary(nextSummary);
      setError("");
      return nextSummary;
    })();

    try {
      return await inFlightSummaryRef.current;
    } catch (err) {
      if (err?.response?.status === 429) {
        rateLimitedUntilRef.current = Date.now() + retryAfterDelay(err);
        setError("");
        return summaryRef.current;
      } else {
        setError(err?.response?.data?.message || "Failed to load notifications.");
      }
      return EMPTY_SUMMARY;
    } finally {
      inFlightSummaryRef.current = null;
      setLoading(false);
    }
  }, [role]);

  const markRead = useCallback(
    async (payload = {}) => {
      if (Date.now() < rateLimitedUntilRef.current) {
        return null;
      }

      const response = await markNotificationsRead(role, payload);
      if (response?.data?.summary) {
        summaryRef.current = response.data.summary;
        setSummary(response.data.summary);
      } else {
        await refresh();
      }
      return response?.data;
    },
    [refresh, role]
  );

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      const next = await refresh();
      if (!active) return;
      setSummary(next);
    }

    load();
    const intervalId = pollingInterval > 0
      ? window.setInterval(() => {
          refresh();
        }, pollingInterval)
      : null;

    return () => {
      active = false;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [pollingInterval, refresh]);

  useEffect(() => {
    if (!activeTarget?.module && !activeTarget?.subModule) {
      return;
    }

    const key = `${activeTarget.module || ""}:${activeTarget.subModule || ""}`;
    const now = Date.now();
    const unreadCount = activeTarget.subModule
      ? Number(summary.subModules?.[activeTarget.subModule] || 0)
      : Number(summary.modules?.[activeTarget.module] || 0);

    if (
      unreadCount <= 0 ||
      inFlightAutoReadRef.current === key ||
      now - Number(lastAutoReadAtRef.current[key] || 0) < AUTO_READ_COOLDOWN_MS
    ) {
      return;
    }

    inFlightAutoReadRef.current = key;
    lastAutoReadAtRef.current[key] = now;
    markRead({
      module: activeTarget.module,
      subModule: activeTarget.subModule,
    }).catch((err) => {
      if (err?.response?.status === 429) {
        rateLimitedUntilRef.current = Date.now() + retryAfterDelay(err);
        return;
      }
      setError(err?.response?.data?.message || "Failed to mark notifications as read.");
    }).finally(() => {
      if (inFlightAutoReadRef.current === key) {
        inFlightAutoReadRef.current = null;
      }
    });
  }, [activeTarget, markRead, summary]);

  return {
    summary,
    loading,
    error,
    refresh,
    markRead,
  };
}
