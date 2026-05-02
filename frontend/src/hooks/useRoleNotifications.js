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

export function useRoleNotifications(role, activeTarget = null, pollingInterval = 15000) {
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const inFlightAutoReadRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const response = await getNotificationSummary(role);
      setSummary(response.data || EMPTY_SUMMARY);
      setError("");
      return response.data || EMPTY_SUMMARY;
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load notifications.");
      return EMPTY_SUMMARY;
    } finally {
      setLoading(false);
    }
  }, [role]);

  const markRead = useCallback(
    async (payload = {}) => {
      const response = await markNotificationsRead(role, payload);
      if (response?.data?.summary) {
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
    const intervalId = window.setInterval(() => {
      refresh();
    }, pollingInterval);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [pollingInterval, refresh]);

  useEffect(() => {
    if (!activeTarget?.module && !activeTarget?.subModule) {
      return;
    }

    const key = `${activeTarget.module || ""}:${activeTarget.subModule || ""}`;
    const unreadCount = activeTarget.subModule
      ? Number(summary.subModules?.[activeTarget.subModule] || 0)
      : Number(summary.modules?.[activeTarget.module] || 0);

    if (unreadCount <= 0 || inFlightAutoReadRef.current === key) {
      return;
    }

    inFlightAutoReadRef.current = key;
    markRead({
      module: activeTarget.module,
      subModule: activeTarget.subModule,
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
