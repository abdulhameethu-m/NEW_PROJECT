import { useEffect, useMemo, useRef, useState } from "react";
import { confirmAction } from "../services/notificationService";
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  Megaphone,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import {
  createStaffRole,
  deleteStaffRole,
  getStaffPermissionCatalog,
  listStaffRoles,
  updateStaffRole,
} from "../services/adminApi";
import { useStaffPermission, useRequirePermission } from "../hooks/useStaffAuth";

function normalizeError(error) {
  return error?.response?.data?.message || error?.message || "Request failed";
}

export function StaffRolesPage() {
  useRequirePermission("roles.read");
  const { hasPermission } = useStaffPermission();
  const formRef = useRef(null);
  const [catalog, setCatalog] = useState({});
  const [catalogLayout, setCatalogLayout] = useState({});
  const [emptyPermissions, setEmptyPermissions] = useState({});
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState("");
  const [expandedPermissionGroups, setExpandedPermissionGroups] = useState({});
  const [form, setForm] = useState({
    name: "",
    description: "",
    permissions: {},
  });

  useEffect(() => {
    let active = true;

    async function loadRolesWorkspace() {
      setLoading(true);
      setError("");
      try {
        const [catalogResponse, rolesResponse] = await Promise.all([
          getStaffPermissionCatalog(),
          listStaffRoles(),
        ]);

        if (!active) return;

        const nextCatalog = catalogResponse?.data?.catalog || catalogResponse?.catalog || {};
        const nextCatalogLayout = catalogResponse?.data?.layout || catalogResponse?.layout || {};
        const nextEmptyPermissions =
          catalogResponse?.data?.emptyPermissions || catalogResponse?.emptyPermissions || {};
        const nextRoles = rolesResponse?.data?.roles || rolesResponse?.data || rolesResponse || [];

        setCatalog(nextCatalog);
        setCatalogLayout(nextCatalogLayout);
        setEmptyPermissions(nextEmptyPermissions);
        setRoles(nextRoles);
        setForm({
          name: "",
          description: "",
          permissions: structuredClone(nextEmptyPermissions),
        });
      } catch (err) {
        if (active) setError(normalizeError(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadRolesWorkspace();

    return () => {
      active = false;
    };
  }, []);

  const canCreate = hasPermission("roles.create");
  const canUpdate = hasPermission("roles.update");
  const canDelete = hasPermission("roles.delete");
  const modules = useMemo(() => Object.entries(catalog), [catalog]);
  const editingRole = useMemo(
    () => roles.find((role) => role._id === editingId) || null,
    [editingId, roles]
  );

  function focusForm() {
    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function resetForm() {
    setEditingId("");
    setForm({
      name: "",
      description: "",
      permissions: structuredClone(emptyPermissions),
    });
  }

  function startCreating() {
    resetForm();
    focusForm();
  }

  function startEditing(role) {
    setEditingId(role._id);
    setForm({
      name: role.name || "",
      description: role.description || "",
      permissions: structuredClone(role.permissions || emptyPermissions),
    });
    focusForm();
  }

  function updatePermission(moduleName, action, checked) {
    setForm((current) => ({
      ...current,
      permissions: {
        ...current.permissions,
        [moduleName]: {
          ...current.permissions[moduleName],
          [action]: checked,
        },
      },
    }));
  }

  function toggleModule(moduleName, checked) {
    setForm((current) => ({
      ...current,
      permissions: {
        ...current.permissions,
        [moduleName]: Object.fromEntries(
          (catalog[moduleName] || Object.keys(current.permissions[moduleName] || {})).map((action) => [action, checked])
        ),
      },
    }));
  }

  function toggleAll(checked) {
    setForm((current) => ({
      ...current,
      permissions: Object.fromEntries(
        Object.entries(catalog).map(([moduleName, actions]) => [
          moduleName,
          Object.fromEntries(actions.map((action) => [action, checked])),
        ])
      ),
    }));
  }

  function togglePermissionGroup(moduleName, groupLabel) {
    const key = `${moduleName}:${groupLabel}`;
    setExpandedPermissionGroups((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  function permissionGroupIcon(label) {
    const icons = {
      Overview: BarChart3,
      People: Users,
      Campaigns: Megaphone,
      "Affiliate & Products": LinkIcon,
      Finance: Wallet,
      Configuration: Settings,
    };
    return icons[label] || BarChart3;
  }

  function renderNestedModuleCard(moduleName, layout, enabledCount) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Megaphone className="h-5 w-5 text-slate-600" />
            <div>
              <div className="text-base font-semibold text-slate-950">{layout.label || moduleName}</div>
              <div className="text-xs text-slate-500">{enabledCount} permissions enabled</div>
            </div>
          </div>
          <ChevronUp className="h-4 w-4 text-slate-500" />
        </div>

        <div className="mt-4 space-y-1">
        {layout.groups.map((group) => (
          <div key={group.label}>
            <button
              type="button"
              onClick={() => togglePermissionGroup(moduleName, group.label)}
              className="flex w-full items-center justify-between rounded-xl px-2 py-3 text-left transition hover:bg-white"
            >
              <span className="flex items-center gap-3">
                {(() => {
                  const Icon = permissionGroupIcon(group.label);
                  return <Icon className="h-4 w-4 text-slate-500" />;
                })()}
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {group.label}
                </span>
              </span>
              <ChevronDown
                className={`h-4 w-4 text-slate-400 transition-transform ${
                  expandedPermissionGroups[`${moduleName}:${group.label}`] ? "rotate-180" : ""
                }`}
              />
            </button>

            {expandedPermissionGroups[`${moduleName}:${group.label}`] ? (
              <div className="ml-8 mt-1 space-y-2 pb-2">
              {(group.permissions || (group.items || []).flatMap((item) =>
                (item.actions || ["view"]).map((action) => ({
                  action: `${item.key}Read`,
                  label: item.label,
                  accessLabel: action === "view" ? "View" : action,
                }))
              )).map((permission) => (
                <label
                  key={permission.action}
                  className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 text-sm text-slate-700 shadow-sm ring-1 ring-slate-100"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(form.permissions?.[moduleName]?.[permission.action])}
                    onChange={(event) => updatePermission(moduleName, permission.action, event.target.checked)}
                  />
                  <span className="font-medium">{permission.label}</span>
                </label>
              ))}
              </div>
            ) : null}
          </div>
        ))}
        </div>
      </div>
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = {
        name: form.name,
        description: form.description,
        permissions: form.permissions,
      };

      const response = editingId
        ? await updateStaffRole(editingId, payload)
        : await createStaffRole(payload);

      const savedRole = response?.data || response;

      if (editingId) {
        setRoles((current) => current.map((role) => (role._id === editingId ? savedRole : role)));
      } else {
        setRoles((current) => [savedRole, ...current]);
      }

      resetForm();
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(role) {
    if (role.isSystem) return;
    if (!(await confirmAction({ message: `Delete role "${role.name}"?`, tone: "danger", confirmLabel: "Confirm" }))) return;

    try {
      await deleteStaffRole(role._id);
      setRoles((current) => current.filter((item) => item._id !== role._id));
      if (editingId === role._id) resetForm();
    } catch (err) {
      setError(normalizeError(err));
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Roles & Permissions</h1>
          <p className="mt-1 text-sm text-slate-600">Manage staff roles and their permissions</p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={startCreating}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            + Create Role
          </button>
        )}
      </section>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

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
                  .flatMap((actions) => Object.values(actions || {}))
                  .filter(Boolean).length;

                return (
                  <tr key={role._id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-semibold text-slate-950">{role.name}</td>
                    <td className="px-6 py-4 text-slate-600">{role.description || "-"}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                        {permissionCount} permissions
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          role.isSystem ? "bg-slate-100 text-slate-700" : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {role.isSystem ? "System" : "Custom"}
                      </span>
                    </td>
                    {(canUpdate || canDelete) && (
                      <td className="px-6 py-4">
                        <div className="flex gap-3">
                          {canUpdate && (
                            <button
                              type="button"
                              onClick={() => startEditing(role)}
                              className="text-sm font-medium text-amber-700 hover:text-amber-900"
                            >
                              Edit
                            </button>
                          )}
                          {canDelete && !role.isSystem && (
                            <button
                              type="button"
                              onClick={() => handleDelete(role)}
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

      {(canCreate || (canUpdate && editingId)) && (
        <section ref={formRef} className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">{editingId ? "Edit Role" : "Create Role"}</h2>
              <p className="mt-1 text-sm text-slate-600">Choose which staff modules and actions this role can access.</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => toggleAll(true)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Reset
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Role name
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3"
                placeholder="Support Staff"
                disabled={Boolean(editingRole?.isSystem)}
                required
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Description
              <textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3"
                rows={3}
                placeholder="Explain how this role should be used."
              />
            </label>

            {editingRole?.isSystem ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                System role names are locked. You can still update the description and permissions.
              </div>
            ) : null}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => toggleAll(true)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Enable all
              </button>
              <button
                type="button"
                onClick={() => toggleAll(false)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Clear all
              </button>
            </div>

            <div className="space-y-4">
              {modules.map(([moduleName, actions]) => {
                const enabledCount = actions.filter((action) => form.permissions?.[moduleName]?.[action]).length;
                const moduleLayout = catalogLayout[moduleName];

                if (moduleLayout?.groups?.length) {
                  return (
                    <div key={moduleName}>
                      {renderNestedModuleCard(moduleName, moduleLayout, enabledCount)}
                    </div>
                  );
                }

                return (
                  <div key={moduleName} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-sm font-semibold capitalize text-slate-950">{moduleLayout?.label || moduleName}</div>
                        <div className="text-xs text-slate-500">{enabledCount} permissions enabled</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleModule(moduleName, enabledCount !== actions.length)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-700 hover:bg-slate-50"
                      >
                        {enabledCount === actions.length ? "Clear Module" : "Select Module"}
                      </button>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {actions.map((action) => (
                        <label
                          key={action}
                          className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm capitalize"
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(form.permissions?.[moduleName]?.[action])}
                            onChange={(event) => updatePermission(moduleName, action, event.target.checked)}
                          />
                          {action}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="submit"
              disabled={saving || !form.name.trim()}
              className="inline-flex rounded-lg bg-slate-950 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? "Saving role..." : editingId ? "Update Role" : "Create Role"}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
