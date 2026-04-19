import { useEffect, useState } from "react";
import { getUserNotifications, markUserNotificationRead } from "../services/userService";

function normalizeError(err) {
  return err?.response?.data?.message || err?.message || "Failed to load notifications.";
}

export function NotificationsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadNotifications() {
    setLoading(true);
    try {
      const response = await getUserNotifications({ page: 1, limit: 30 });
      setData(response.data);
      setError("");
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  async function markRead(id) {
    try {
      const response = await markUserNotificationRead(id);
      setData((current) => ({
        ...current,
        notifications: (current?.notifications || []).map((item) => (item._id === id ? response.data : item)),
        unreadCount: Math.max((current?.unreadCount || 1) - 1, 0),
      }));
    } catch (err) {
      setError(normalizeError(err));
    }
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">Notifications</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">See order, payment, support, and account alerts in one stream.</p>
      </div>

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="text-sm text-slate-500 dark:text-slate-400">Unread notifications: {data?.unreadCount || 0}</div>
        <div className="mt-5 grid gap-3">
          {loading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
            ))
          ) : (data?.notifications || []).length ? (
            data.notifications.map((notification) => (
              <div key={notification._id} className={`rounded-2xl border px-4 py-4 ${notification.isRead ? "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" : "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-950 dark:text-white">{notification.title}</div>
                    <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{notification.message}</div>
                    <div className="mt-2 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{notification.type} | {new Date(notification.createdAt).toLocaleString()}</div>
                  </div>
                  {!notification.isRead ? (
                    <button type="button" onClick={() => markRead(notification._id)} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
                      Mark as read
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No notifications available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
