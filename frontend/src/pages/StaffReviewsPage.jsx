import { useEffect, useState } from "react";
import { useStaffPermission, useRequirePermission } from "../hooks/useStaffAuth";

function normalizeError(error) {
  return error?.response?.data?.message || error?.message || "Request failed";
}

export function StaffReviewsPage() {
  useRequirePermission("reviews.read");
  const { hasPermission } = useStaffPermission();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadReviews() {
      setLoading(true);
      setError("");
      try {
        // Placeholder API call - adjust based on actual endpoint
        const mockReviews = [
          {
            _id: "1",
            productId: "prod-123",
            productName: "Sample Product",
            userId: "user-123",
            userName: "John Doe",
            rating: 5,
            comment: "Great product!",
            status: "approved",
            createdAt: new Date(),
          },
        ];
        if (active) setReviews(mockReviews);
      } catch (err) {
        if (active) setError(normalizeError(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadReviews();

    return () => {
      active = false;
    };
  }, [searchTerm, statusFilter]);

  const canDelete = hasPermission("reviews.delete");

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Reviews</h1>
          <p className="mt-1 text-sm text-slate-600">Manage product reviews and ratings</p>
        </div>
      </section>

      {/* Filters */}
      <div className="flex flex-col gap-4 lg:flex-row">
        <input
          type="text"
          placeholder="Search by product or customer..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-amber-500 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-amber-500 focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-amber-500" />
              <p className="mt-4 text-sm text-slate-600">Loading reviews...</p>
            </div>
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
            <p className="text-sm text-slate-600">No reviews found</p>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review._id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-950">{review.productName}</h3>
                    <span className="inline-flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={i < review.rating ? "text-amber-400" : "text-slate-300"}>
                          ★
                        </span>
                      ))}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">by {review.userName}</p>
                  <p className="mt-3 text-sm text-slate-700">{review.comment}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      review.status === "approved"
                        ? "bg-emerald-50 text-emerald-700"
                        : review.status === "rejected"
                          ? "bg-rose-50 text-rose-700"
                          : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {review.status?.charAt(0).toUpperCase() + review.status?.slice(1)}
                  </span>
                  {canDelete && (
                    <button
                      type="button"
                      className="text-sm font-medium text-rose-700 hover:text-rose-900"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
