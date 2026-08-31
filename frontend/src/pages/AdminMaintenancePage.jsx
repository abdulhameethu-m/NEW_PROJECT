import { useState, useEffect, useCallback } from "react";
import { useLocation, Link } from "react-router-dom";
import { ArrowLeft, Save, AlertTriangle, PlayCircle, ShieldAlert } from "lucide-react";
import { adminHttp } from "../services/adminHttp";
import { confirmAction } from "../services/notificationService";
import MaintenancePage from "./MaintenancePage"; // for preview

export function AdminMaintenancePage() {
  const location = useLocation();
  const basePath = location.pathname.startsWith("/staff") ? "/staff" : "/admin";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [config, setConfig] = useState({
    enabled: false,
    title: "The Platform is Under Maintenance",
    subtitle: "We're making improvements to serve you better.",
    description: "Our engineers are currently deploying a system upgrade. We appreciate your patience and will be back online shortly.",
    estimatedCompletion: "",
    animation: "Construction",
    allowAdmins: true,
    allowStaff: false,
    allowVendors: false,
    allowInfluencers: false,
  });

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminHttp.get("/api/config/maintenance_mode");
      if (data?.data?.value) {
        setConfig(prev => ({ ...prev, ...data.data.value }));
      }
    } catch (err) {
      if (err?.response?.status !== 404) {
        setError("Failed to load maintenance configuration.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleSave = async () => {
    if (config.enabled) {
      const confirmed = await confirmAction({
        title: "Enable Maintenance Mode?",
        message: "This will instantly block all public traffic, vendors, and influencers unless you allowed them. Are you absolutely sure?",
        tone: "danger",
        confirmLabel: "Enable Maintenance Mode"
      });
      if (!confirmed) return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      await adminHttp.patch("/api/config/maintenance_mode", {
        value: config,
        description: "Global Maintenance Mode Settings"
      });
      setMessage("Maintenance configuration saved successfully.");
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to save configuration.");
    } finally {
      setSaving(false);
    }
  };

  if (previewMode) {
    return (
      <div className="fixed inset-0 z-50">
        <MaintenancePage config={config} onRefresh={async () => {}} />
        <button
          onClick={() => setPreviewMode(false)}
          className="absolute top-6 right-6 z-50 rounded-xl bg-slate-800/80 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md hover:bg-slate-700"
        >
          Close Preview
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl pb-24">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to={`${basePath}/settings`}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Platform Maintenance</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Configure global downtime and maintenance messaging.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPreviewMode(true)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <PlayCircle className="h-4 w-4" /> Preview
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {message && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-64 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800" />
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          
          <div className="md:col-span-2 space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Messaging</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Title</label>
                  <input
                    type="text"
                    name="title"
                    value={config.title}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 bg-transparent px-4 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Subtitle</label>
                  <input
                    type="text"
                    name="subtitle"
                    value={config.subtitle}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 bg-transparent px-4 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
                  <textarea
                    name="description"
                    value={config.description}
                    onChange={handleChange}
                    rows="3"
                    className="w-full rounded-xl border border-slate-300 bg-transparent px-4 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:text-white"
                  ></textarea>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Estimated Completion Time (Optional)</label>
                  <input
                    type="datetime-local"
                    name="estimatedCompletion"
                    value={config.estimatedCompletion}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 bg-transparent px-4 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:text-white"
                  />
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className={`rounded-3xl border p-6 shadow-sm transition-colors ${config.enabled ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/20' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldAlert className={`h-5 w-5 ${config.enabled ? 'text-rose-500' : 'text-slate-400'}`} />
                    Status
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Toggle maintenance mode on or off.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={config.enabled}
                  onClick={() => handleChange({ target: { name: 'enabled', type: 'checkbox', checked: !config.enabled } })}
                  className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border transition ${config.enabled ? "border-rose-500 bg-rose-500" : "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700"}`}
                >
                  <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${config.enabled ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
              
              {config.enabled && (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-100 p-3 text-xs font-medium text-rose-800 dark:border-rose-900/50 dark:bg-rose-900/30 dark:text-rose-300">
                  <AlertTriangle className="inline h-4 w-4 mr-1 mb-0.5" />
                  Maintenance Mode is ACTIVE. Don't forget to save changes.
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Access Control</h2>
              <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">Select which roles can bypass the maintenance screen.</p>
              
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="allowAdmins"
                    checked={config.allowAdmins}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:ring-offset-slate-900"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Allow Admins (Recommended)</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="allowStaff"
                    checked={config.allowStaff}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:ring-offset-slate-900"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Allow Staff Workspace</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="allowVendors"
                    checked={config.allowVendors}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:ring-offset-slate-900"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Allow Vendors</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="allowInfluencers"
                    checked={config.allowInfluencers}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:ring-offset-slate-900"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Allow Influencers</span>
                </label>
                <div className="mt-2 text-xs text-slate-400 italic">
                  Super Admins always have access.
                </div>
              </div>
            </section>
          </div>
          
        </div>
      )}
    </div>
  );
}
