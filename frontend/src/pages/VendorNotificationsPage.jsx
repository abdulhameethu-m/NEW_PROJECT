import { useCallback, useEffect, useState } from "react";
import { StatusBadge } from "../components/StatusBadge";
import { VendorList, VendorSection } from "../components/VendorPanel";
import { getNotifications, markNotificationsRead } from "../services/notificationService";

export function VendorNotificationsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await getNotifications("vendor", { limit: 30 });
      setData({
        notifications: response.data?.notifications || [],
        unreadCount: response.data?.summary?.total || 0,
      });
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load notifications.");
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  async function markRead(id) {
    await markNotificationsRead("vendor", { notificationIds: [id] });
    await load();
  }

  return (
    <VendorSection title="Notifications" description="Order alerts, payout updates, and system activity ordered by recency.">
      {error ? <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      <div className="mb-4 text-sm text-slate-500 dark:text-slate-400">Unread notifications: {data?.unreadCount || 0}</div>
      <VendorList
        items={data?.notifications || []}
        emptyMessage="Your notification center is clear."
        renderItem={(item) => (
          <div key={item._id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-semibold text-slate-950 dark:text-white">{item.title}</div>
                  <StatusBadge value={item.type} />
                </div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.message}</div>
                <div className="mt-2 text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</div>
              </div>
              {!item.isRead ? (
                <button onClick={() => markRead(item._id)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-white dark:border-slate-700 dark:hover:bg-slate-900">
                  Mark Read
                </button>
              ) : (
                <StatusBadge value="Read" />
              )}
            </div>
          </div>
        )}
      />
    </VendorSection>
  );
}
