import { useCallback, useEffect, useState } from "react";
import {
  createVendorContent,
  deleteVendorContent,
  getVendorContent,
  updateVendorContent,
} from "../services/contentService";

const CONTENT_TYPES = [
  { value: "hero", label: "Hero Banner", description: "Top homepage slider banner" },
  { value: "promo", label: "Promo Banner", description: "One of the two premium banners shown below categories" },
  { value: "collection", label: "Collection Spotlight", description: "Large spotlight banner shown above the footer" },
];

const initialForm = {
  title: "",
  description: "",
  image: "",
  mediaType: "image",
  altText: "",
  type: "promo",
  position: 0,
  startDate: new Date().toISOString().split("T")[0],
  endDate: "",
  ctaUrl: "",
  ctaText: "Shop Now",
  isActive: true,
};

function normalizeError(error) {
  return error?.response?.data?.message || error?.message || "Request failed";
}

export function VendorContentPage() {
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(initialForm);
  const [imagePreview, setImagePreview] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getVendorContent();
      setContents(res?.data || []);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = {
        title: form.title,
        description: form.description,
        image: form.image || imagePreview,
        mediaType: form.mediaType,
        altText: form.altText,
        type: form.type,
        position: Number(form.position || 0),
        startDate: form.startDate ? new Date(form.startDate) : new Date(),
        endDate: form.endDate ? new Date(form.endDate) : null,
        ctaUrl: form.ctaUrl,
        ctaText: form.ctaText,
        isActive: form.isActive,
      };

      if (editingId) {
        await updateVendorContent(editingId, payload);
      } else {
        await createVendorContent(payload);
      }

      setEditingId("");
      setForm(initialForm);
      setImagePreview("");
      await refresh();
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setSaving(false);
    }
  }

  function startEdit(item) {
    setEditingId(item._id);
    setForm({
      title: item.title || "",
      description: item.description || "",
      image: item.image || "",
      mediaType: item.mediaType || "image",
      altText: item.altText || "",
      type: item.type || "promo",
      position: item.position || 0,
      startDate: item.startDate ? new Date(item.startDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      endDate: item.endDate ? new Date(item.endDate).toISOString().split("T")[0] : "",
      ctaUrl: item.ctaUrl || "",
      ctaText: item.ctaText || "Shop Now",
      isActive: item.isActive !== false,
    });
    setImagePreview(item.image || "");
  }

  function handleCancel() {
    setEditingId("");
    setForm(initialForm);
    setImagePreview("");
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this content?")) return;
    try {
      await deleteVendorContent(id);
      await refresh();
    } catch (err) {
      setError(normalizeError(err));
    }
  }

  function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result;
      setImagePreview(base64);
      setForm((prev) => ({ ...prev, image: base64 }));
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="grid gap-6">
      {/* HEADER */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-2xl font-bold text-slate-950 dark:text-white">My Promotional Content</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Create and manage your promotional banners and content on the homepage
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        {/* CONTENT LIST */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white mb-4">Your Content ({contents.length})</h2>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            Use `Promo Banner` for the two side-by-side homepage promos and `Collection Spotlight` for the large lower banner.
          </p>

          {error && (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:bg-rose-900/20 dark:text-rose-300">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-8 text-center text-slate-500">Loading...</div>
          ) : contents.length === 0 ? (
            <div className="py-8 text-center text-slate-500">No content created yet. Create your first promotional banner using the form.</div>
          ) : (
            <div className="space-y-3">
              {contents.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"
                >
                  {item.image ? (
                    item.mediaType === "video" ? (
                      <video src={item.image} className="h-16 w-16 rounded-lg object-cover" muted playsInline />
                    ) : (
                      <img
                        src={item.image}
                        alt={item.altText || item.title}
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                    )
                  ) : null}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-950 dark:text-white truncate">{item.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 capitalize">
                      {item.type} • {item.mediaType || "image"} • Position {item.position}
                    </p>
                    <div className="flex gap-2 mt-1">
                      {!item.isActive && (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-xs rounded dark:bg-rose-900/20 dark:text-rose-300">
                          Inactive
                        </span>
                      )}
                      {item.endDate && new Date(item.endDate) < new Date() && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded dark:bg-amber-900/20 dark:text-amber-300">
                          Expired
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit(item)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-300 transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item._id)}
                      className="px-3 py-1 text-sm bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 dark:bg-rose-900/20 dark:text-rose-300 transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* FORM */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white mb-4">
            {editingId ? "Edit Content" : "Create New"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* TITLE */}
            <div>
              <label className="block text-sm font-medium text-slate-950 dark:text-white mb-1">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g., Summer Sale"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                required
              />
            </div>

            {/* DESCRIPTION */}
            <div>
              <label className="block text-sm font-medium text-slate-950 dark:text-white mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows="2"
                placeholder="Brief description..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>

            {/* IMAGE */}
            <div>
              <label className="block text-sm font-medium text-slate-950 dark:text-white mb-1">Image *</label>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleImageUpload}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
              {imagePreview && (
                form.mediaType === "video" ? (
                  <video src={imagePreview} className="mt-2 h-24 w-full rounded-lg object-cover" muted playsInline controls />
                ) : (
                  <img src={imagePreview} alt="Preview" className="mt-2 h-24 w-full rounded-lg object-cover" />
                )
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-950 dark:text-white mb-1">Media Type *</label>
              <select
                value={form.mediaType}
                onChange={(e) => setForm({ ...form, mediaType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
            </div>

            {/* TYPE */}
            <div>
              <label className="block text-sm font-medium text-slate-950 dark:text-white mb-1">Type *</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                {CONTENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {CONTENT_TYPES.find((type) => type.value === form.type)?.description}
              </p>
            </div>

            {/* CTA */}
            <div>
              <label className="block text-sm font-medium text-slate-950 dark:text-white mb-1">CTA URL</label>
              <input
                type="url"
                value={form.ctaUrl}
                onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>

            {/* DATES */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-slate-950 dark:text-white mb-1">Start</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-950 dark:text-white mb-1">End</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            {/* ACTIVE */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-slate-950 dark:text-white">
                Make it live
              </label>
            </div>

            {/* BUTTONS */}
            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition"
              >
                {saving ? "Saving..." : editingId ? "Update" : "Create"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2 bg-slate-200 text-slate-950 rounded-lg hover:bg-slate-300 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600 font-medium transition"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
