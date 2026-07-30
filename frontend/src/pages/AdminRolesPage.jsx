import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ChevronDown,
  Link as LinkIcon,
  Megaphone,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import { confirmAction } from "../services/notificationService";
import {
  createStaffRole,
  deleteStaffRole,
  getStaffPermissionCatalog,
  listStaffRoles,
  updateStaffRole,
} from "../services/adminApi";

function normalizeError(err) {
  return err?.response?.data?.message || err?.message || "Request failed";
}

export function AdminRolesPage() {
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
    let alive = true;

    (async () => {
      setLoading(true);
      try {
        const [catalogResponse, rolesResponse] = await Promise.all([
          getStaffPermissionCatalog(),
          listStaffRoles(),
        ]);
        if (!alive) return;
        setCatalog(catalogResponse.data.catalog || {});
        setCatalogLayout(catalogResponse.data.layout || {});
        setEmptyPermissions(catalogResponse.data.emptyPermissions || {});
        setRoles(rolesResponse.data || []);
        setForm((current) => ({
          ...current,
          permissions: structuredClone(catalogResponse.data.emptyPermissions || {}),
        }));
      } catch (err) {
        if (alive) setError(normalizeError(err));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const modules = useMemo(() => Object.entries(catalog), [catalog]);

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
          Object.keys(current.permissions[moduleName] || {}).map((action) => [action, checked])
        ),
      },
    }));
  }

  function toggleAll(checked) {
    setForm((current) => ({
      ...current,
      permissions: Object.fromEntries(
        Object.entries(current.permissions).map(([moduleName, actions]) => [
          moduleName,
          Object.fromEntries(Object.keys(actions).map((action) => [action, checked])),
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

  function actionKey(itemKey, action) {
    if (action === "view") return `${itemKey}Read`;
    return `${itemKey}${action[0].toUpperCase()}${action.slice(1)}`;
  }

  function actionLabel(action) {
    return action === "view" ? "view" : action;
  }

  function itemPermissionActions(moduleName, group, item) {
    const isViewOnlyItem =
      moduleName === "influencerCommerce" &&
      (
        (group?.label === "People" && ["influencers", "vendors", "influencerVendorMatching"].includes(item?.key)) ||
        (group?.label === "Configuration" && item?.key === "settings")
      );

    if (isViewOnlyItem) return ["view"];
    return item.actions || ["create", "read", "update", "delete"];
  }

  function layoutPermissionActions(moduleName, layout) {
    return (layout.groups || []).flatMap((group) =>
      (group.items || []).flatMap((item) =>
        itemPermissionActions(moduleName, group, item).map((action) =>
          actionKey(item.key, action)
        )
      )
    );
  }

  function toggleLayoutModule(moduleName, layout, checked) {
    const visibleActions = layoutPermissionActions(moduleName, layout);
    setForm((current) => ({
      ...current,
      permissions: {
        ...current.permissions,
        [moduleName]: {
          ...(current.permissions[moduleName] || {}),
          ...Object.fromEntries(visibleActions.map((action) => [action, checked])),
        },
      },
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

  function renderInfluencerCommerceModule(moduleName, layout) {
    const visibleActions = layoutPermissionActions(moduleName, layout);
    const enabledCount = visibleActions.filter((action) => form.permissions?.[moduleName]?.[action]).length;

    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-base font-semibold text-slate-950 dark:text-white">{layout.label || moduleName}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{enabledCount} permissions enabled</div>
          </div>
          <button
            type="button"
            onClick={() => toggleLayoutModule(moduleName, layout, enabledCount !== visibleActions.length)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-medium uppercase tracking-wide dark:border-slate-700 dark:bg-slate-950"
          >
            {enabledCount === visibleActions.length ? "Clear Module" : "Select Module"}
          </button>
        </div>

        <div className="mt-4 space-y-1">
          {layout.groups.map((group) => {
            const expanded = Boolean(expandedPermissionGroups[`${moduleName}:${group.label}`]);
            const Icon = permissionGroupIcon(group.label);

            return (
              <div key={group.label}>
                <button
                  type="button"
                  onClick={() => togglePermissionGroup(moduleName, group.label)}
                  className="flex w-full items-center justify-between rounded-xl px-2 py-3 text-left transition hover:bg-white dark:hover:bg-slate-800"
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-slate-500" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {group.label}
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
                  />
                </button>

                {expanded ? (
                  <div className="ml-7 space-y-3 pb-3">
                    {(group.items || []).map((item) => (
                      <div key={item.key} className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100 dark:bg-slate-950 dark:ring-slate-800">
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{item.label}</div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-4">
                          {itemPermissionActions(moduleName, group, item).map((action) => {
                            const permissionAction = actionKey(item.key, action);

                            return (
                              <label
                                key={permissionAction}
                                className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                              >
                                <input
                                  type="checkbox"
                                  checked={Boolean(form.permissions?.[moduleName]?.[permissionAction])}
                                  onChange={(event) => updatePermission(moduleName, permissionAction, event.target.checked)}
                                />
                                {actionLabel(action)}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function startEditing(role) {
    setEditingId(role._id);
    setForm({
      name: role.name,
      description: role.description || "",
      permissions: structuredClone(role.permissions),
    });
  }

  const editingRole = useMemo(
    () => roles.find((role) => role._id === editingId) || null,
    [editingId, roles]
  );

  function resetForm() {
    setEditingId("");
    setForm({
      name: "",
      description: "",
      permissions: structuredClone(emptyPermissions),
    });
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

      if (editingId) {
        setRoles((current) => current.map((role) => (role._id === editingId ? response.data : role)));
      } else {
        setRoles((current) => [response.data, ...current]);
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
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(22rem,0.9fr)]">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Role library</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Dynamic RBAC roles with per-module actions.</p>
          </div>
          <button
            type="button"
            onClick={() => toggleAll(true)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            Enable all
          </button>
        </div>

        {error ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

        <div className="mt-4 grid gap-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
            ))
          ) : (
            roles.map((role) => (
              <div key={role._id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-950 dark:text-white">{role.name}</h3>
                      {role.isSystem ? (
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          System
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{role.description || "No description provided"}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => startEditing(role)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
                      Edit
                    </button>
                    {!role.isSystem ? (
                      <button type="button" onClick={() => handleDelete(role)} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                        Delete
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{editingId ? "Edit role" : "Create role"}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Delete, update, refund, and process actions automatically imply read where applicable.</p>
          </div>
          <button type="button" onClick={resetForm} className="text-sm font-medium text-slate-600 hover:underline">
            Reset
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Role name
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3"
              placeholder="Support Staff"
              disabled={Boolean(editingRole?.isSystem)}
              required
            />
            {editingRole?.isSystem ? (
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                System role names are locked. You can still update description and permissions.
              </div>
            ) : null}
          </label>

          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Description
            <textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3"
              rows={3}
              placeholder="Explain how this role should be used."
            />
          </label>

          <div className="flex gap-2">
            <button type="button" onClick={() => toggleAll(true)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
              Select all
            </button>
            <button type="button" onClick={() => toggleAll(false)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
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
                    {renderInfluencerCommerceModule(moduleName, moduleLayout)}
                  </div>
                );
              }

              return (
                <div key={moduleName} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold capitalize text-slate-950 dark:text-white">{moduleName}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{enabledCount} permissions enabled</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleModule(moduleName, enabledCount !== actions.length)}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium uppercase tracking-wide"
                    >
                      {enabledCount === actions.length ? "Clear module" : "Select module"}
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {actions.map((action) => (
                      <label key={action} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm capitalize dark:bg-slate-800">
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

          <button type="submit" disabled={saving || !form.name.trim()} className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white disabled:opacity-50">
            {saving ? "Saving role..." : editingId ? "Update role" : "Create role"}
          </button>
        </form>
      </section>
    </div>
  );
}
