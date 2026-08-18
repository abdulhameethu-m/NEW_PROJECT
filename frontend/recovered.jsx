import { useEffect, useState } from "react";
import { logout as logoutRequest } from "../services/authService";
import {
  changeUserPassword,
  getUserActivity,
  getUserBilling,
  getUserProfile,
  getUserSessions,
  logoutUserDevices,
  revokeUserSession,
  updateUserProfile,
} from "../services/userService";
import { formatCurrency } from "../utils/formatCurrency";
import { useAuthStore } from "../context/authStore";
import { PasswordField } from "../components/PasswordField";
import {
  ShieldAlert,
  Bell,
  Monitor,
  Lock,
  FileText,
  Activity,
  Smartphone,
  CheckCircle2,
  Shield,
  Eye,
  EyeOff,
  Megaphone,
  Package,
  Truck,
  CreditCard,
  Tag,
  ShoppingBag,
  DollarSign,
  Target,
  Wallet,
  Users,
  Store,
  ChevronRight,
  User,
  RefreshCw
} from "lucide-react";

function normalizeError(err) {
  return err?.response?.data?.message || err?.message || "Unable to save settings.";
}

export function SettingsPage() {
  const localLogout = useAuthStore((state) => state.logout);
  const [preferences, setPreferences] = useState({
    channels: true,
    orderUpdates: true,
    deliveryAlerts: true,
    paymentAlerts: true,
    promotions: false,
    orders: true,
    commissions: true,
    campaigns: true,
    payments: true,
    followers: true,
    storefront: true,
  });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [sessions, setSessions] = useState([]);
  const [billing, setBilling] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadSettings() {
    setLoading(true);
    try {
      const [profileResponse, sessionsResponse, billingResponse, activityResponse] = await Promise.all([
        getUserProfile(),
        getUserSessions(),
        getUserBilling({ page: 1, limit: 5 }),
        getUserActivity({ limit: 8 }),
      ]);

      const savedPrefs = profileResponse.data?.preferences?.notificationPreferences || {};
      setPreferences((curr) => ({ ...curr, ...savedPrefs }));
      setSessions(sessionsResponse.data || []);
      setBilling(billingResponse.data?.billing || []);
      setActivity(activityResponse.data || []);
      setError("");
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  async function savePreferences() {
    setSavingPrefs(true);
    setError("");
    setMessage("");
    try {
      await updateUserProfile({ notificationPreferences: preferences });
      setMessage("Preferences saved.");
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setSavingPrefs(false);
    }
  }

  const handlePrefChange = (key, val) => {
    setPreferences((current) => {
      const newPrefs = { ...current, [key]: val };
      // Fire and forget save for auto-save feel
      updateUserProfile({ notificationPreferences: newPrefs }).catch(() => {});
      return newPrefs;
    });
  };

  async function savePassword() {
    setSavingPassword(true);
    setError("");
    setMessage("");
    try {
      await changeUserPassword(passwords);
      await logoutRequest();
      localLogout();
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setSavingPassword(false);
    }
  }

  async function revokeSession(sessionId) {
    try {
      await revokeUserSession(sessionId);
      await loadSettings();
    } catch (err) {
      setError(normalizeError(err));
    }
  }

  async function logoutAllDevices() {
    try {
      await logoutUserDevices();
      await logoutRequest();
      localLogout();
    } catch (err) {
      setError(normalizeError(err));
    }
  }

  const preferenceItems = [
    { key: "channels", label: "Channels", sub: "Updates about new channels and announcements", icon: Megaphone },
    { key: "orderUpdates", label: "Order Updates", sub: "Receive updates about your orders", icon: Package },
    { key: "deliveryAlerts", label: "Delivery Alerts", sub: "Get alerts about delivery status", icon: Truck },
    { key: "paymentAlerts", label: "Payment Alerts", sub: "Notifications about payments and refunds", icon: CreditCard },
    { key: "promotions", label: "Promotions", sub: "Offers and promotional updates", icon: Tag },
    { key: "orders", label: "Orders", sub: "General order notifications", icon: ShoppingBag },
    { key: "commissions", label: "Commissions", sub: "Updates about your earnings", icon: DollarSign },
    { key: "campaigns", label: "Campaigns", sub: "Campaign and marketing updates", icon: Target },
    { key: "payments", label: "Payments", sub: "Payment related notifications", icon: Wallet },
    { key: "followers", label: "Followers", sub: "Updates about your followers", icon: Users },
    { key: "storefront", label: "Storefront", sub: "Store and product updates", icon: Store },
  ];

  return (
    <div className="grid gap-6">
      <div className="flex items-center gap-3">
        <h1 className="text-[22px] font-bold text-slate-900 dark:text-white">Security and settings</h1>
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
          <ShieldAlert className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">Control notifications, sessions, billing visibility, and account security from one place.</p>

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}

      <div className="grid gap-6 xl:grid-cols-12">
        
        {/* Left and Middle Columns (8 spans) */}
        <div className="grid gap-6 xl:col-span-8">
          <div className="grid gap-6 xl:grid-cols-2">
            
            {/* Notification Preferences */}
            <section className="rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-[17px] font-bold text-slate-900 dark:text-white">Notification preferences</h2>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Choose what updates you want to receive.</p>
                </div>
              </div>
              <div className="grid gap-1">
                {preferenceItems.map((item) => (
                  <label key={item.key} className="flex cursor-pointer items-center justify-between rounded-2xl border border-transparent p-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <div className="flex items-center gap-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">{item.label}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.sub}</div>
                      </div>
                    </div>
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded-[6px] border border-slate-300 bg-white checked:border-indigo-600 checked:bg-indigo-600 hover:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:checked:border-indigo-500 dark:checked:bg-indigo-500"
                        checked={Boolean(preferences[item.key])}
                        onChange={(e) => handlePrefChange(item.key, e.target.checked)}
                      />
                      <svg className="pointer-events-none absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </label>
                ))}
              </div>
            </section>

            {/* Active Sessions */}
            <section className="grid content-start gap-6">
              <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                      <Monitor className="h-5 w-5" />
                    </div>
                    <h2 className="text-[17px] font-bold text-slate-900 dark:text-white">Active sessions</h2>
                  </div>
                  <button
                    onClick={logoutAllDevices}
                    className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20"
                  >
                    Logout all devices
                  </button>
                </div>
                <div className="grid gap-3">
                  {loading ? (
                    <div className="h-40 animate-pulse rounded-2xl bg-slate-50 dark:bg-slate-800/50" />
                  ) : sessions.length ? (
                    <>
                      {sessions.map((session, index) => (
                        <div key={session._id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] dark:border-slate-800 dark:bg-slate-900">
                          <div className="flex items-start gap-4">
                            <div className="mt-1 text-slate-400">
                              {session.userAgent?.toLowerCase().includes("mobile") ? <Smartphone className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                <div className="text-[13px] font-semibold leading-relaxed text-slate-900 dark:text-white">{session.userAgent || "Unknown device"}</div>
                              </div>
                              <div className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                                IP {session.ipAddress || "Unknown"} | Last used {new Date(session.lastUsedAt || session.createdAt).toLocaleString()}
                              </div>
                              <button
                                onClick={() => revokeSession(session._id)}
                                className="mt-4 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                              >
                                Sign out session
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      <button className="mt-2 text-center text-[13px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center justify-center w-full gap-1">
                        View all sessions <ChevronRight className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      No active sessions found.
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* Recent Activity */}
          <section className="rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                  <Activity className="h-5 w-5" />
                </div>
                <h2 className="text-[17px] font-bold text-slate-900 dark:text-white">Recent activity</h2>
              </div>
              <button className="text-[13px] font-bold text-indigo-600 hover:text-indigo-700">View all</button>
            </div>
            
            <div className="flex items-center gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 w-44 shrink-0 animate-pulse rounded-[1.25rem] bg-slate-50 dark:bg-slate-800/50" />)
              ) : activity.length ? (
                activity.map((entry) => {
                  const isLogin = entry.action === "auth.login";
                  const Icon = isLogin ? User : RefreshCw;
                  const colorClass = isLogin ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400" : "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400";
                  
                  return (
                    <div key={entry._id} className="w-44 shrink-0 rounded-[1.25rem] border border-slate-100 bg-white p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] dark:border-slate-800 dark:bg-slate-900 flex flex-col items-center text-center">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full mb-3 ${colorClass}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="text-[13px] font-bold text-slate-900 dark:text-white">{entry.action}</div>
                      <div className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">{new Date(entry.createdAt).toLocaleString()}</div>
                    </div>
                  );
                })
              ) : (
                <div className="w-full rounded-2xl border border-dashed border-slate-300 py-8 text-center text-sm font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  No recent activity yet.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column (4 spans) */}
        <div className="grid content-start gap-6 xl:col-span-4">
          {/* Change Password */}
          <section className="rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-[17px] font-bold text-slate-900 dark:text-white">Change password</h2>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Keep your account secure by using a strong password.</p>
              </div>
            </div>
            <div className="grid gap-5">
              <label className="grid gap-2">
                <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200">Current password</span>
                <PasswordField
                  value={passwords.currentPassword}
                  onChange={(event) => setPasswords((current) => ({ ...current, currentPassword: event.target.value }))}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200">New password</span>
                <PasswordField
                  value={passwords.newPassword}
                  onChange={(event) => setPasswords((current) => ({ ...current, newPassword: event.target.value }))}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500"
                />
              </label>
              <button
                type="button"
                onClick={savePassword}
                disabled={savingPassword}
                className="rounded-xl bg-indigo-600 px-5 py-3 text-[13px] font-bold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors max-w-[160px]"
              >
                {savingPassword ? "Updating..." : "Update password"}
              </button>
            </div>
          </section>

          {/* Recent Billing */}
          <section className="rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                  <FileText className="h-5 w-5" />
                </div>
                <h2 className="text-[17px] font-bold text-slate-900 dark:text-white">Recent billing</h2>
              </div>
              <button className="text-[13px] font-bold text-indigo-600 hover:text-indigo-700">View all</button>
            </div>
            <div className="grid gap-3">
              {loading ? (
                <div className="h-40 animate-pulse rounded-2xl bg-slate-50 dark:bg-slate-800/50" />
              ) : billing.length ? (
                billing.map((item) => {
                  const isPaid = item.paymentStatus === "PAID";
                  return (
                    <div key={item._id} className="flex items-center justify-between rounded-[1.25rem] border border-slate-100 bg-white p-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-colors hover:border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 cursor-pointer">
                      <div>
                        <div className="text-[13px] font-bold text-slate-900 dark:text-white">{item.orderNumber}</div>
                        <div className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">{new Date(item.createdAt).toLocaleString()}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className={`rounded-md px-2 py-1 text-[10px] font-bold tracking-wide ${isPaid ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"}`}>
                          {item.paymentStatus}
                        </div>
                        <div className="text-[13px] font-bold text-slate-900 dark:text-white">{formatCurrency(item.totalAmount || 0)}</div>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  No billing records yet.
                </div>
              )}
            </div>
          </section>

          {/* Security Tips */}
          <section className="relative overflow-hidden rounded-[2rem] border border-indigo-100 bg-indigo-50 p-6 dark:border-indigo-500/20 dark:bg-indigo-500/5">
            <h2 className="text-[17px] font-bold text-indigo-900 dark:text-indigo-300">Security tips</h2>
            <ul className="mt-5 grid gap-3 text-[13px] font-medium text-indigo-800 dark:text-indigo-300/80">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-500" />
                Use a strong, unique password
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-500" />
                Enable notifications to stay updated
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-500" />
                Sign out from unused devices
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-500" />
                Keep your email and phone number updated
              </li>
            </ul>
            <div className="absolute -bottom-6 -right-6 flex h-32 w-32 items-center justify-center rounded-full bg-indigo-100/50 dark:bg-indigo-500/10">
              <Shield className="h-16 w-16 text-indigo-500/40" />
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
