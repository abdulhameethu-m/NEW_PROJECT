import { useEffect, useState } from "react";
import {
  createUserReview,
  deleteUserReview,
  getUserReviews,
  updateUserReview,
} from "../services/userService";
import { resolveApiAssetUrl } from "../utils/resolveUrl";

function normalizeError(err) {
  return err?.response?.data?.message || err?.message || "Failed to update reviews.";
}

const defaultForm = {
  productId: "",
  orderId: "",
  rating: 5,
  title: "",
  comment: "",
};

export function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadReviews() {
    setLoading(true);
    try {
      const response = await getUserReviews();
      setReviews(response.data || []);
      setError("");
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReviews();
  }, []);

  function openCreate() {
    setEditingId("");
    setForm(defaultForm);
    setShowForm(true);
  }

  function openEdit(review) {
    setEditingId(review._id);
    setForm({
      productId: review.productId?._id || "",
      orderId: review.orderId?._id || "",
      rating: review.rating || 5,
      title: review.title || "",
      comment: review.comment || "",
    });
    setShowForm(true);
  }

  async function submitForm(event) {
    event.preventDefault();
    try {
      if (editingId) {
        const response = await updateUserReview(editingId, {
          rating: Number(form.rating),
          title: form.title,
          comment: form.comment,
        });
        setReviews(response.data || []);
      } else {
        const response = await createUserReview({
          productId: form.productId,
          orderId: form.orderId || null,
          rating: Number(form.rating),
          title: form.title,
          comment: form.comment,
        });
        setReviews(response.data || []);
      }
      setShowForm(false);
      setForm(defaultForm);
      setEditingId("");
      setError("");
    } catch (err) {
      setError(normalizeError(err));
    }
  }

  async function removeReview(id) {
    try {
      await deleteUserReview(id);
      setReviews((current) => current.filter((review) => review._id !== id));
    } catch (err) {
      setError(normalizeError(err));
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">Reviews and ratings</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Share feedback on delivered products and manage your published reviews.</p>
        </div>
        <button type="button" onClick={openCreate} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">
          Add review
        </button>
      </div>

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      {showForm ? (
        <form onSubmit={submitForm} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Product ID</span>
              <input value={form.productId} onChange={(event) => setForm((current) => ({ ...current, productId: event.target.value }))} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Order ID</span>
              <input value={form.orderId} onChange={(event) => setForm((current) => ({ ...current, orderId: event.target.value }))} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Rating</span>
              <select value={form.rating} onChange={(event) => setForm((current) => ({ ...current, rating: event.target.value }))} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} star{value > 1 ? "s" : ""}</option>)}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Title</span>
              <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            </label>
            <label className="grid gap-2 sm:col-span-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Comment</span>
              <textarea value={form.comment} onChange={(event) => setForm((current) => ({ ...current, comment: event.target.value }))} className="min-h-28 rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            </label>
          </div>
          <div className="mt-5 flex gap-3">
            <button type="submit" className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white">{editingId ? "Update review" : "Publish review"}</button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">Cancel</button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <div className="h-48 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800" />
      ) : reviews.length ? (
        <div className="grid gap-4">
          {reviews.map((review) => (
            <div key={review._id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
                    {review.productId?.images?.[0]?.url ? (
                      <img src={resolveApiAssetUrl(review.productId.images[0].url)} alt={review.productId?.name || "Product"} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-950 dark:text-white">{review.productId?.name}</div>
                    <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{review.title || "Untitled review"}</div>
                  </div>
                </div>
                <div className="text-sm font-semibold text-amber-500">{review.rating}/5</div>
              </div>
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{review.comment || "No review comment added."}</p>
              {review.sellerResponse?.message ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                  Seller response: {review.sellerResponse.message}
                </div>
              ) : null}
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={() => openEdit(review)} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">Edit</button>
                <button type="button" onClick={() => removeReview(review._id)} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/20 dark:text-rose-200">Delete</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          No reviews yet. You can review delivered products from here.
        </div>
      )}
    </div>
  );
}
