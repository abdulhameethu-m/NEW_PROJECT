import { useEffect, useState } from "react";
import { listAdminCatalogRequests, reviewCatalogRequest } from "../services/catalogRequestService";

export function AdminCatalogRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    setLoading(true);
    try {
      const response = await listAdminCatalogRequests({ page: 1, limit: 20 });
      setRequests(response?.data?.items || []);
    } finally {
      setLoading(false);
    }
  }

  async function handleDecision(id, action) {
    let reviewReason = "";
    if (action === "reject") {
      reviewReason = window.prompt("Enter rejection reason for the vendor:");
      if (!reviewReason || !reviewReason.trim()) {
        setMessage("Rejection reason is required to reject a request.");
        return;
      }
    }

    try {
      await reviewCatalogRequest(id, {
        action,
        status: action === "approve" ? "approved" : action === "reject" ? "rejected" : "under_review",
        remarks: reviewReason,
        reviewReason,
      });
      setMessage("Decision saved.");
      loadRequests();
    } catch (error) {
      setMessage(error?.response?.data?.message || "Failed to update request.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Catalog Requests</h1>
        <p className="mt-1 text-sm text-slate-600">Review vendor requests and approve or reject catalog additions.</p>
      </div>
      {message ? <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{message}</div> : null}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {loading ? <div className="text-sm text-slate-500">Loading...</div> : null}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-600">
                <th className="py-3">Request ID</th>
                <th className="py-3">Vendor</th>
                <th className="py-3">Type</th>
                <th className="py-3">Requested</th>
                <th className="py-3">Status</th>
                <th className="py-3">Reason</th>
                <th className="py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((item) => (
                <tr key={item._id} className="border-b border-slate-100">
                  <td className="py-3 font-medium text-slate-700">{item.requestId}</td>
                  <td className="py-3">{item.vendorId?.shopName || "-"}</td>
                  <td className="py-3">{item.requestType}</td>
                  <td className="py-3">{item.requestedName}</td>
                  <td className="py-3">{item.status}</td>
                  <td className="py-3 text-sm text-slate-600">
                    {item.status === "rejected" ? item.reviewReason || item.remarks || "-" : "-"}
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      {item.status === "approved" ? (
                        <button disabled className="rounded-lg bg-emerald-600 px-3 py-2 text-white opacity-80">Approved</button>
                      ) : item.status === "rejected" ? (
                        <button disabled className="rounded-lg bg-rose-600 px-3 py-2 text-white opacity-80">Rejected</button>
                      ) : (
                        <>
                          <button onClick={() => handleDecision(item.requestId, "approve")} className="rounded-lg bg-emerald-600 px-3 py-2 text-white">Approve</button>
                          <button onClick={() => handleDecision(item.requestId, "reject")} className="rounded-lg bg-rose-600 px-3 py-2 text-white">Reject</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
