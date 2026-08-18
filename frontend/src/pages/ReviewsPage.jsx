import { useEffect, useMemo, useState } from "react";
import { Sparkles, Pencil, Trash2, CheckCircle, ShieldCheck, Box, User, ChevronRight, ChevronDown, ImageIcon, UploadCloud, Send, X } from "lucide-react";
import {
  createUserReview,
  deleteUserReview,
  getUserReviewableProducts,
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

function RatingStars({ value = 0, onChange, size = "text-3xl" }) {
  const numericValue = Number(value) || 0;
  return (
    <div className="flex items-center gap-1" role={onChange ? "radiogroup" : "img"} aria-label={`${numericValue} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = numericValue >= star;
        const half = numericValue >= star - 0.5 && numericValue < star;
        return (
          <button
            key={star}
            type="button"
            role={onChange ? "radio" : undefined}
            aria-checked={onChange ? numericValue === star : undefined}
            disabled={!onChange}
            onClick={() => onChange?.(star)}
            className={`${size} leading-none ${onChange ? "cursor-pointer transition hover:scale-110" : "cursor-default"} ${filled || half ? "text-amber-500" : "text-slate-300 dark:text-slate-700"}`}
            title={`${star} star${star > 1 ? "s" : ""}`}
          >
            <span className="relative inline-block">
              <span className={half ? "text-slate-300 dark:text-slate-700" : ""}>★</span>
              {half ? <span className="absolute inset-0 w-1/2 overflow-hidden text-amber-500">★</span> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [reviewableProducts, setReviewableProducts] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const photoPreviews = useMemo(
    () => photoFiles.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [photoFiles]
  );

  useEffect(() => {
    return () => {
      photoPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [photoPreviews]);

  async function loadReviews() {
    setLoading(true);
    try {
      const [reviewsResponse, reviewableResponse] = await Promise.all([
        getUserReviews(),
        getUserReviewableProducts(),
      ]);
      setReviews(reviewsResponse.data || []);
      setReviewableProducts(reviewableResponse.data || []);
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
    const firstItem = reviewableProducts[0];
    setForm({
      ...defaultForm,
      productId: firstItem?.productId || "",
      orderId: firstItem?.orderId || "",
    });
    setPhotoFiles([]);
    setShowForm(true);
  }

  function openCreateForItem(item) {
    setEditingId("");
    setForm({
      ...defaultForm,
      productId: item.productId || "",
      orderId: item.orderId || "",
    });
    setPhotoFiles([]);
    setShowForm(true);
  }

  function openEdit(review) {
    setEditingId(review._id);
    setForm({
      productId: review.productId?._id || "",
      orderId: review.orderId?._id || "",
      rating: review.rating || 5,
      title: review.title || "",
      comment: review.review || review.comment || "",
    });
    setPhotoFiles([]);
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
        }, photoFiles);
        setReviews(response.data || []);
      } else {
        const response = await createUserReview({
          productId: form.productId,
          orderId: form.orderId || null,
          rating: Number(form.rating),
          title: form.title,
          comment: form.comment,
        }, photoFiles);
        setReviews(response.data || []);
      }
      setShowForm(false);
      setForm(defaultForm);
      setEditingId("");
      setPhotoFiles([]);
      await loadReviews();
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

  function closeForm() {
    setShowForm(false);
    setEditingId("");
    setForm(defaultForm);
    setPhotoFiles([]);
  }

  function renderReviewForm({ inline = false } = {}) {
    return (
      <form onSubmit={submitForm} className={`${inline ? "mt-5 rounded-3xl bg-[#fbfbfe] p-6 shadow-sm border border-indigo-50 dark:border-slate-800 dark:bg-slate-950 sm:p-8" : "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8"}`}>
        {!inline && (
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-[#fbfbfe] text-indigo-600 shadow-[0_0_0_1px_rgba(79,70,229,0.1)] dark:bg-indigo-500/20 dark:text-indigo-400">
              <Box className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-slate-900 dark:text-white">{editingId ? "Edit review" : "Write a review"}</h2>
              <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-slate-400">Share your experience and help others choose better.</p>
            </div>
          </div>
        )}
        <div className="grid gap-6 sm:grid-cols-2">
          {!editingId ? (
            <label className="grid gap-2 sm:col-span-2">
              <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200">Delivered product</span>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-indigo-600">
                  <Box className="h-5 w-5" />
                </div>
                <select
                  value={`${form.orderId}:${form.productId}`}
                  onChange={(event) => {
                    const [orderId, productId] = event.target.value.split(":");
                    setForm((current) => ({ ...current, orderId, productId }));
                  }}
                  className="w-full appearance-none rounded-[1.25rem] border border-slate-200 bg-white py-3.5 pl-12 pr-10 text-[14px] font-medium text-slate-900 outline-none transition focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  required
                >
                  {reviewableProducts.map((item) => (
                    <option key={`${item.orderId}-${item.productId}`} value={`${item.orderId}:${item.productId}`}>
                      {item.productName} - {item.orderNumber}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </label>
          ) : null}

          <div className="grid gap-2">
            <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200">Rating</span>
            <div className="flex min-h-[6rem] flex-col justify-center rounded-[1.25rem] border border-slate-200 bg-white px-5 dark:border-slate-700 dark:bg-slate-950">
              <RatingStars value={form.rating} onChange={(rating) => setForm((current) => ({ ...current, rating }))} size="text-2xl" />
              <div className="mt-1 text-[13px] font-medium text-slate-400">Tap a star to rate</div>
            </div>
          </div>

          <label className="grid gap-2">
            <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200">Title</span>
            <div className="relative h-full">
              <input value={form.title} placeholder="Give your review a title" onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="h-full min-h-[6rem] w-full rounded-[1.25rem] border border-slate-200 bg-white px-5 pr-12 text-[14px] font-medium text-slate-900 outline-none transition focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-5 text-indigo-500">
                <Pencil className="h-4 w-4" />
              </div>
            </div>
          </label>

          <label className="grid gap-2 sm:col-span-2">
            <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200">Comment</span>
            <div className="relative">
              <textarea value={form.comment} placeholder="Share details of your experience with this product..." onChange={(event) => setForm((current) => ({ ...current, comment: event.target.value }))} className="min-h-[9rem] w-full resize-y rounded-[1.25rem] border border-slate-200 bg-white p-5 pb-8 text-[14px] font-medium text-slate-900 outline-none transition focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              <div className="absolute bottom-3 right-4 text-[12px] font-medium text-slate-400">
                {form.comment.length}/1000
              </div>
            </div>
          </label>

          <div className="grid gap-2 sm:col-span-2">
            <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200">Photos (optional)</span>
            <div className="relative flex min-h-[6.5rem] flex-col gap-4 rounded-[1.25rem] border border-dashed border-indigo-200 bg-[#fbfbfe] p-4 dark:border-indigo-500/20 dark:bg-indigo-500/5 sm:flex-row sm:items-center sm:gap-5">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(event) => setPhotoFiles(Array.from(event.target.files || []).slice(0, 5))}
                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
              />
              <div className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-[1rem] bg-indigo-50 text-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-400">
                <ImageIcon className="h-8 w-8" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex h-9 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-[13px] font-bold text-white transition hover:bg-indigo-700 dark:bg-indigo-500">
                    <UploadCloud className="h-4 w-4" /> Choose Files
                  </div>
                  <span className="text-[13px] font-medium text-slate-500">
                    {photoFiles.length ? `${photoFiles.length} file(s) chosen` : "No file chosen"}
                  </span>
                </div>
                <div className="mt-2 text-[12px] font-medium text-slate-400">
                  Upload up to 5 images (JPG, PNG) • Max 5MB each
                </div>
              </div>
            </div>
          </div>
          
          {photoPreviews.length ? (
            <div className="flex flex-wrap gap-3 sm:col-span-2">
              {photoPreviews.map((preview, index) => (
                <div key={`${preview.file.name}-${index}`} className="relative h-[4.5rem] w-[4.5rem] overflow-hidden rounded-[1rem] border border-slate-200 bg-slate-100 dark:border-slate-800">
                  <img loading="lazy" decoding="async" src={preview.url} alt={preview.file.name} className="h-full w-full object-cover p-1" />
                </div>
              ))}
            </div>
          ) : null}
        </div>
        
        <div className="mt-8 flex gap-3">
          <button type="submit" className="inline-flex h-[2.75rem] items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-[13px] font-bold text-white shadow-md transition hover:bg-indigo-700 active:scale-95 disabled:opacity-60 dark:bg-indigo-500">
            <Send className="h-4 w-4" /> {editingId ? "Update review" : "Publish review"}
          </button>
          <button type="button" onClick={closeForm} className="inline-flex h-[2.75rem] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-[13px] font-bold text-slate-600 transition hover:bg-slate-50 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
            <X className="h-4 w-4" /> Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-950 dark:text-white">
            Reviews and ratings
            <Sparkles className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </h1>
          <p className="mt-1.5 text-[14px] font-medium text-slate-500 dark:text-slate-400">Share feedback on delivered products and manage your published reviews.</p>
        </div>
        <button type="button" onClick={openCreate} disabled={!reviewableProducts.length} className="inline-flex h-[2.75rem] items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-[13px] font-bold text-white shadow-md transition hover:bg-indigo-700 active:scale-95 disabled:opacity-60 dark:bg-indigo-500">
          <Pencil className="h-4 w-4" /> Add review
        </button>
      </div>

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      {!editingId && reviewableProducts.length ? (
        <div className="grid gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#fbfbfe] text-indigo-600 shadow-[0_0_0_1px_rgba(79,70,229,0.1)] dark:bg-indigo-500/20 dark:text-indigo-400">
              <Box className="h-5 w-5" />
            </div>
            <div className="text-[15px] font-bold text-slate-900 dark:text-white">Delivered products ready for review</div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {reviewableProducts.map((item) => (
              <button
                key={`${item.orderId}-${item.productId}`}
                type="button"
                onClick={() => openCreateForItem(item)}
                className="group flex min-h-[6rem] items-center justify-between rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-[0_1px_8px_-2px_rgba(0,0,0,0.05)] transition hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center gap-5">
                  <div className="flex h-[3.5rem] w-[3.5rem] shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-[#fbfbfe] shadow-[0_0_0_1px_rgba(79,70,229,0.08)] dark:bg-slate-800">
                    {item.image ? <img loading="lazy" decoding="async" src={resolveApiAssetUrl(item.image)} alt={item.productName || "Product"} className="h-full w-full object-cover p-1" /> : <Box className="h-6 w-6 text-indigo-300" />}
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="truncate text-[15px] font-bold text-slate-900 dark:text-white">{item.productName}</div>
                    <div className="mt-1 text-[12px] font-medium text-slate-500 dark:text-slate-400">Order {item.orderNumber}</div>
                    {item.variantTitle ? <div className="mt-1 truncate text-[12px] font-bold text-[#ec4899]">{item.variantTitle}</div> : <div className="mt-1 truncate text-[12px] font-bold text-[#ec4899]">pink</div>}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 transition group-hover:text-indigo-600" />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {showForm && !editingId ? renderReviewForm() : null}

      {loading ? (
        <div className="h-48 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800" />
      ) : reviews.length ? (
        <div className="grid gap-4">
          {reviews.map((review) => (
            <div key={review._id} className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#fbfbfe] text-indigo-600 shadow-[0_0_0_1px_rgba(79,70,229,0.1)] dark:bg-indigo-500/10 dark:text-indigo-400">
                    {review.productId?.images?.[0]?.url ? (
                      <img loading="lazy" decoding="async" src={resolveApiAssetUrl(review.productId.images[0].url)} alt={review.productId?.name || "Product"} className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-6 w-6" />
                    )}
                  </div>
                  <div>
                    <div className="text-[16px] font-bold text-slate-900 dark:text-white">{review.productId?.name}</div>
                    <div className="mt-1 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                      Reviewed on {new Date(review.createdAt || Date.now()).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </div>
                </div>
                <RatingStars value={review.rating} size="text-[1.5rem]" />
              </div>
              <div className="mt-6">
                {review.title && <h3 className="text-[16px] font-bold text-indigo-700 dark:text-indigo-400">{review.title}</h3>}
                <p className="mt-2 text-[14px] leading-relaxed text-slate-700 dark:text-slate-300">{review.review || review.comment || "No review comment added."}</p>
              </div>
              {review.images?.length ? (
                <div className="mt-4 flex flex-wrap gap-3">
                  {review.images.map((image, index) => (
                    <a key={`${image.url}-${index}`} href={resolveApiAssetUrl(image.url)} target="_blank" rel="noreferrer" className="h-[4.5rem] w-[4.5rem] overflow-hidden rounded-[1rem] bg-[#fbfbfe] shadow-[0_0_0_1px_rgba(79,70,229,0.08)] dark:bg-slate-800">
                      <img loading="lazy" decoding="async" src={resolveApiAssetUrl(image.url)} alt="Review photo" className="h-full w-full object-cover p-1" />
                    </a>
                  ))}
                </div>
              ) : null}
              {review.vendorReply || review.sellerResponse?.message ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                  Seller response: {review.vendorReply || review.sellerResponse.message}
                </div>
              ) : null}
              <div className="mt-4 flex items-center gap-4">
                {review.status ? (
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#e6fcf2] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#059669] dark:bg-emerald-900/30 dark:text-emerald-300">
                    <CheckCircle className="h-3.5 w-3.5" />
                    {review.status}
                  </div>
                ) : null}
              </div>
              <div className="mt-5 flex gap-3">
                <button type="button" onClick={() => openEdit(review)} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-indigo-100 bg-white px-4 text-[13px] font-bold text-indigo-600 transition hover:bg-indigo-50 active:scale-95 dark:border-indigo-500/20 dark:bg-slate-900 dark:text-indigo-400 dark:hover:bg-indigo-500/10">
                  <Pencil className="h-4 w-4" /> Edit
                </button>
                <button type="button" onClick={() => removeReview(review._id)} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rose-100 bg-rose-50/50 px-4 text-[13px] font-bold text-rose-600 transition hover:bg-rose-50 active:scale-95 dark:border-rose-900/30 dark:bg-slate-900 dark:text-rose-400 dark:hover:bg-rose-900/20">
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
              {showForm && editingId === review._id ? renderReviewForm({ inline: true }) : null}
            </div>
          ))}
          <div className="mt-8 flex flex-col items-center gap-6 rounded-[1.5rem] border border-slate-100 bg-[#fbfbfe] px-6 py-8 text-center dark:border-slate-800 dark:bg-slate-800/50 sm:flex-row sm:px-8 sm:text-left">
            <div className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-[1.25rem] bg-indigo-600 shadow-lg shadow-indigo-600/20">
              <ShieldCheck className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-[17px] font-bold text-indigo-700 dark:text-indigo-400">Your feedback helps us</h3>
              <p className="mt-1.5 max-w-sm text-[14px] font-medium text-slate-500 dark:text-slate-400">Share your experience to help other customers and improve our products.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          No reviews yet. You can review delivered products from here.
        </div>
      )}
    </div>
  );
}
