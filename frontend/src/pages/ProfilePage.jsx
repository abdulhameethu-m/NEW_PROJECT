import { useMemo, useState, useEffect } from "react";
import { User, Mail, Phone, Save, UploadCloud, Pencil, Settings } from "lucide-react";
import { useAuthStore } from "../context/authStore";
import { getUserProfile, updateUserProfile } from "../services/userService";
import { resolveApiAssetUrl } from "../utils/resolveUrl";

function normalizeError(err) {
  return err?.response?.data?.message || err?.message || "Failed to update profile.";
}

export function ProfilePage() {
  const setAuth = useAuthStore((state) => state.setAuth);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [profile, setProfile] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    getUserProfile()
      .then((data) => {
        if (!cancelled) {
          const profileData = data?.data ?? data;
          setProfile(profileData);
          setForm({
            name: profileData?.name || "",
            email: profileData?.email || "",
            phone: profileData?.phone || "",
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(normalizeError(err));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const avatarPreview = useMemo(() => {
    if (avatarFile) return URL.createObjectURL(avatarFile);
    return resolveApiAssetUrl(profile?.avatarUrl);
  }, [avatarFile, profile?.avatarUrl]);

  useEffect(() => {
    return () => {
      if (avatarFile && avatarPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarFile, avatarPreview]);

  async function saveProfile() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      let response;
      if (avatarFile) {
        const payload = new FormData();
        payload.append("name", form.name);
        payload.append("email", form.email);
        payload.append("phone", form.phone);
        payload.append("avatar", avatarFile);
        response = await updateUserProfile(payload, { isFormData: true });
      } else {
        response = await updateUserProfile(form);
      }

      const profileData = response?.data ?? response;
      setProfile(profileData);
      setAuth({
        user: profileData,
      });
      setAvatarFile(null);
      setMessage("Profile updated successfully.");
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setSaving(false);
    }
  }

  if (!loading && !profile && !error) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        Profile data is unavailable right now. Please refresh and try again.
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="text-sm font-bold text-slate-900 dark:text-white">Profile photo</div>
        <div className="mt-2 h-1 w-8 rounded-full bg-indigo-200 dark:bg-indigo-900" />
        
        <div className="mt-8 flex flex-col items-center">
          <div className="relative">
            {avatarPreview ? (
              <img loading="lazy" decoding="async" src={avatarPreview} alt={form.name || "User"} className="h-32 w-32 rounded-full border-4 border-white object-cover shadow-sm dark:border-slate-800" />
            ) : (
              <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-white bg-indigo-50 text-4xl font-bold text-indigo-600 shadow-sm dark:border-slate-800 dark:bg-indigo-900/50 dark:text-indigo-400">
                {(form.name || "U").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute bottom-0 right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-indigo-600 text-white shadow-md dark:border-slate-800">
              <Pencil className="h-3.5 w-3.5" />
            </div>
          </div>
          
          <label className="mt-8 flex cursor-pointer items-center justify-center gap-2 rounded-[1.25rem] border border-indigo-100 bg-white px-5 py-2.5 text-xs font-bold text-indigo-600 shadow-[0_2px_10px_rgba(79,70,229,0.05)] transition hover:border-indigo-200 hover:bg-indigo-50 active:scale-[0.98] dark:border-indigo-500/20 dark:bg-slate-900 dark:text-indigo-400 dark:hover:bg-indigo-500/10 w-[80%]">
            <UploadCloud className="h-4 w-4" />
            Upload photo
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => setAvatarFile(event.target.files?.[0] || null)}
            />
          </label>
          <div className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
            JPEG, PNG, or WEBP.<br/>Up to 5 MB.
          </div>
        </div>

        {/* Decorative background pattern */}
        <div className="absolute -right-12 top-4 h-32 w-32 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #4f46e5 2px, transparent 2px)', backgroundSize: '12px 12px' }} />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Profile management</h1>
            <p className="mt-2 text-[13px] text-slate-500 dark:text-slate-400 max-w-sm">Update your personal details used across checkout, orders, and support.</p>
          </div>
          <div className="relative hidden h-16 w-16 shrink-0 items-center justify-center rounded-[2rem] bg-[#f5f3ff] sm:flex dark:bg-indigo-950/30">
            <User className="h-7 w-7 text-indigo-400" />
            <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm dark:bg-slate-900">
              <Settings className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="absolute -left-2 top-2 text-indigo-300/60 text-xs">✦</span>
            <span className="absolute right-0 top-0 text-indigo-300/60 text-[10px]">✦</span>
            <span className="absolute -bottom-1 left-2 text-indigo-300/60 text-xs">✦</span>
          </div>
        </div>

        {error ? <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
        {message ? <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}

        {loading ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-[3.25rem] animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ) : (
          <div className="mt-8 grid gap-x-6 gap-y-5 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Full name</span>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <User className="h-4 w-4 text-indigo-400" />
                </div>
                <input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className="w-full rounded-[1.25rem] border border-slate-200 bg-white py-3 pl-11 pr-4 text-[13px] font-medium text-slate-900 outline-none transition focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-500"
                />
              </div>
            </label>
            <label className="grid gap-2">
              <span className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Email address</span>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Mail className="h-4 w-4 text-indigo-400" />
                </div>
                <input
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  className="w-full rounded-[1.25rem] border border-slate-200 bg-white py-3 pl-11 pr-4 text-[13px] font-medium text-slate-900 outline-none transition focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-500"
                />
              </div>
            </label>
            <label className="grid gap-2">
              <span className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Phone number</span>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Phone className="h-4 w-4 text-indigo-400" />
                </div>
                <input
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                  className="w-full rounded-[1.25rem] border border-slate-200 bg-white py-3 pl-11 pr-4 text-[13px] font-medium text-slate-900 outline-none transition focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-500"
                />
              </div>
            </label>
            
            <div className="rounded-[1.25rem] bg-[#f8f8ff] px-5 py-4 dark:bg-slate-800/50">
              <div className="text-[13px] font-bold text-slate-900 dark:text-white">Account status</div>
              <div className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                Role: <span className="text-indigo-600 dark:text-indigo-400">{profile?.role || "User"}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                Status: <span className="text-emerald-600 dark:text-emerald-400">{profile?.status || "Active"}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 flex">
          <button
            type="button"
            onClick={saveProfile}
            disabled={saving || loading}
            className="inline-flex min-h-[3.25rem] items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 text-[13px] font-bold text-white transition hover:bg-indigo-700 active:scale-95 disabled:opacity-60 dark:bg-indigo-500"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </section>
    </div>
  );
}
