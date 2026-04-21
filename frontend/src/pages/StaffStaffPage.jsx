import { useEffect, useState } from "react";
import { listStaffAccounts } from "../services/adminApi";
import { useStaffPermission, useRequirePermission } from "../hooks/useStaffAuth";

function normalizeError(error) {
  return error?.response?.data?.message || error?.message || "Request failed";
}

export function StaffStaffPage() {
  useRequirePermission("staff.read");
  const { hasPermission } = useStaffPermission();
  const [searchTerm, setSearchTerm] = useState("");
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadStaff() {
      setLoading(true);
      setError("");
      try {
        const response = await listStaffAccounts();
        if (active) setStaff(response?.data || response || []);
      } catch (err) {
        if (active) setError(normalizeError(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadStaff();

    return () => {
      active = false;
    };
  }, [searchTerm]);

  const canCreate = hasPermission("staff.create");
  const canUpdate = hasPermission("staff.update");
  const canDelete = hasPermission("staff.delete");

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Staff Management</h1>
          <p className="mt-1 text-sm text-slate-600">Manage staff members and their access levels</p>
        </div>
        {canCreate && (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            + Add Staff
          </button>
        )}
      </section>

      {/* Search */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-amber-500 focus:outline-none"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Staff Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-amber-500" />
              <p className="mt-4 text-sm text-slate-600">Loading staff...</p>
            </div>
          </div>
        ) : staff.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-sm text-slate-600">No staff found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-slate-950">Name</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-950">Email</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-950">Phone</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-950">Role</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-950">Status</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-950">Last Login</th>
                {(canUpdate || canDelete) && <th className="px-6 py-3 text-left font-semibold text-slate-950">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {staff.map((member) => (
                <tr key={member._id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-semibold text-slate-950">{member.name}</td>
                  <td className="px-6 py-4 text-slate-600">{member.email}</td>
                  <td className="px-6 py-4 text-slate-600">{member.phone}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {member.roleId?.name || "Unassigned"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        member.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {member.status?.charAt(0).toUpperCase() + member.status?.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {member.lastLogin ? new Date(member.lastLogin).toLocaleDateString() : "Never"}
                  </td>
                  {(canUpdate || canDelete) && (
                    <td className="px-6 py-4">
                      <div className="flex gap-3">
                        {canUpdate && (
                          <button
                            type="button"
                            className="text-sm font-medium text-amber-700 hover:text-amber-900"
                          >
                            Edit
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            className="text-sm font-medium text-rose-700 hover:text-rose-900"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
