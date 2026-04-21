import { useEffect, useState } from "react";
import { listStaffRoles } from "../services/adminApi";
import { useStaffPermission, useRequirePermission } from "../hooks/useStaffAuth";

function normalizeError(error) {
  return error?.response?.data?.message || error?.message || "Request failed";
}

export function StaffRolesPage() {
  useRequirePermission("roles.read");
  const { hasPermission } = useStaffPermission();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadRoles() {
      setLoading(true);
      setError("");
      try {
        const response = await listStaffRoles();
        if (active) setRoles(response.data?.roles || response.data || []);
      } catch (err) {
        if (active) setError(normalizeError(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadRoles();

    return () => {
      active = false;
    };
  }, []);

  const canCreate = hasPermission("roles.create");
  const canUpdate = hasPermission("roles.update");
  const canDelete = hasPermission("roles.delete");

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Roles & Permissions</h1>
          <p className="mt-1 text-sm text-slate-600">Manage staff roles and their permissions</p>
        </div>
        {canCreate && (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            + Create Role
          </button>
        )}
      </section>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Roles Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-amber-500" />
              <p className="mt-4 text-sm text-slate-600">Loading roles...</p>
            </div>
          </div>
        ) : roles.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-sm text-slate-600">No roles found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-slate-950">Role Name</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-950">Description</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-950">Permissions</th>
                <th className="px-6 py-3 text-left font-semibold text-slate-950">Type</th>
                {(canUpdate || canDelete) && <th className="px-6 py-3 text-left font-semibold text-slate-950">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {roles.map((role) => {
                const permissionCount = Object.values(role.permissions || {})
                  .flat()
                  .filter(Boolean).length;

                return (
                  <tr key={role._id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-semibold text-slate-950">{role.name}</td>
                    <td className="px-6 py-4 text-slate-600">{role.description || "—"}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                        {permissionCount} permissions
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        role.isSystem ? "bg-slate-100 text-slate-700" : "bg-blue-50 text-blue-700"
                      }`}>
                        {role.isSystem ? "System" : "Custom"}
                      </span>
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
                          {canDelete && !role.isSystem && (
                            <button
                              type="button"
                              className="text-sm font-medium text-rose-700 hover:text-rose-900"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
