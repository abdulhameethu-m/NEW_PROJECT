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
  LayoutDashboard,
  Lightbulb,
  FolderTree,
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

  function togglePermissionGroup(groupId) {
    setExpandedPermissionGroups((current) => ({
      ...current,
      [groupId]: !current[groupId],
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
      Users: Users,
      "Staff Accounts": Users,
      "Roles & Permissions": Settings,
      Products: LinkIcon,
      Orders: Wallet,
      Reviews: Megaphone,
      Payments: Wallet,
      Payouts: Wallet,
      Settlements: Wallet,
      Analytics: BarChart3,
      Settings: Settings,
      Branding: Settings,
    };
    return icons[label] || BarChart3;
  }

  function toggleGroupCard(modulesInGroup, checkAll) {
    setForm((current) => {
      const nextPermissions = { ...current.permissions };
      modulesInGroup.forEach((mod) => {
        if (catalog[mod] || nextPermissions[mod]) {
          nextPermissions[mod] = Object.fromEntries(
            (catalog[mod] || Object.keys(nextPermissions[mod] || {})).map((action) => [action, checkAll])
          );
        }
      });
      return { ...current, permissions: nextPermissions };
    });
  }

  function renderGroupCard({ id, label, icon: Icon = Settings, items }) {
    const modulesInGroup = [...new Set(items.flatMap((accordion) => accordion.checkboxes.map((cb) => cb.moduleName)))];
    
    const totalCheckboxes = items.reduce((acc, curr) => acc + curr.checkboxes.length, 0);
    const enabledCount = items.reduce((acc, curr) => {
      return acc + curr.checkboxes.filter((cb) => form.permissions?.[cb.moduleName]?.[cb.action]).length;
    }, 0);

    const checkAll = enabledCount !== totalCheckboxes;

    return (
      <div key={id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon className="h-5 w-5 text-slate-600" />
            <div>
              <div className="text-base font-semibold text-slate-950">{label}</div>
              <div className="text-xs text-slate-500">{enabledCount} permissions enabled</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => toggleGroupCard(modulesInGroup, checkAll)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            {checkAll ? "Select Module" : "Clear Module"}
          </button>
        </div>

        <div className="mt-4 space-y-1">
          {items.map((accordion) => {
            const accId = `${id}:${accordion.label}`;
            const AccIcon = permissionGroupIcon(accordion.iconLabel || accordion.label);

            return (
              <div key={accordion.label}>
                <button
                  type="button"
                  onClick={() => togglePermissionGroup(accId)}
                  className="flex w-full items-center justify-between rounded-xl px-2 py-3 text-left transition hover:bg-white"
                >
                  <span className="flex items-center gap-3">
                    <AccIcon className="h-4 w-4 text-slate-500" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {accordion.label}
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-400 transition-transform ${
                      expandedPermissionGroups[accId] ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {expandedPermissionGroups[accId] ? (
                  <div className="ml-8 mt-1 space-y-2 pb-2">
                    {accordion.checkboxes.map((cb) => (
                      <label
                        key={`${cb.moduleName}:${cb.action}`}
                        className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 text-sm text-slate-700 shadow-sm ring-1 ring-slate-100"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(form.permissions?.[cb.moduleName]?.[cb.action])}
                          onChange={(e) => updatePermission(cb.moduleName, cb.action, e.target.checked)}
                        />
                        <span className="font-medium capitalize">{cb.label || cb.action}</span>
                      </label>
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
        <div />
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
              {(() => {
                const uiGroups = [
                  {
                    id: "dashboard",
                    label: "Dashboard",
                    icon: LayoutDashboard,
                    items: [{ moduleName: "dashboardFake", label: "Dashboard" }], // Empty placeholder mostly since it's default
                  },
                  { id: "influencerCommerce", isInfluencerCommerce: true },
                  {
                    id: "overview",
                    label: "Overview",
                    icon: BarChart3,
                    items: [
                      { moduleName: "analytics", label: "Analytics" },
                      { moduleName: "revenue", label: "Revenue" },
                      { moduleName: "auditLogs", label: "Audit Logs" },
                    ],
                  },
                  {
                    id: "management",
                    label: "Management",
                    icon: Users,
                    items: [
                      { moduleName: "users", label: "Users" },
                      { moduleName: "sellers", label: "Sellers" },
                      { moduleName: "products", label: "Products" },
                      { moduleName: "inventory", label: "Inventory" },
                      { moduleName: "orders", label: "Orders" },
                      { moduleName: "pickups", label: "Pickups" },
                      { moduleName: "reviews", label: "Reviews" },
                    ],
                  },
                  {
                    id: "catalog",
                    label: "Catalog",
                    icon: FolderTree,
                    items: [
                      { moduleName: "categories", label: "Categories" },
                      { moduleName: "subcategories", label: "Subcategories" },
                      { moduleName: "returnRules", label: "Return Rules" },
                      { moduleName: "catalogRequests", label: "Catalog Requests" },
                      { moduleName: "attributes", label: "Attributes" },
                      { moduleName: "productModules", label: "Product Modules" },
                      { moduleName: "homepageContainers", label: "Homepage Containers" },
                      { moduleName: "homepageBuilder", label: "Homepage Builder" },
                      { moduleName: "vendorAccess", label: "Vendor Access" },
                      { moduleName: "shippingAccess", label: "Shipping Access" },
                    ],
                  },
                  {
                    id: "commerceIntelligence",
                    label: "Commerce Intelligence",
                    icon: Lightbulb,
                    items: [
                      { moduleName: "recommendationSettings", label: "Recommendation Settings" },
                      { moduleName: "relatedProducts", label: "Related Products Engine" },
                      { moduleName: "frequentlyBoughtTogether", label: "Frequently Bought Together" },
                      { moduleName: "crossSellRules", label: "Cross Sell Rules" },
                      { moduleName: "upsellRules", label: "Upsell Rules" },
                      { moduleName: "recommendationAnalytics", label: "Recommendation Analytics" },
                      { moduleName: "aiScoringRules", label: "AI Scoring Rules" },
                      { moduleName: "recommendationPreview", label: "Recommendation Preview" },
                      { moduleName: "cacheManagement", label: "Cache Management" },
                    ],
                  },
                  {
                    id: "finance",
                    label: "Finance",
                    icon: Wallet,
                    items: [
                      { moduleName: "payments", label: "Payments" },
                      { moduleName: "refunds", label: "Refunds" },
                      { moduleName: "returns", label: "Returns" },
                      { moduleName: "escrowRefunds", label: "Escrow Refunds" },
                      { moduleName: "cancellationPolicies", label: "Cancellation Policies" },
                      { moduleName: "codAdvance", label: "COD Advance" },
                      { moduleName: "invoices", label: "Invoices" },
                      { moduleName: "payouts", label: "Payout Management" },
                      { moduleName: "commission", label: "Commission" },
                      { moduleName: "financeInfluencers", label: "Influencers" },
                    ],
                  },
                  {
                    id: "workspace",
                    label: "Workspace",
                    icon: Settings,
                    items: [
                      { moduleName: "settings", label: "Settings" },
                      { moduleName: "branding", label: "Company Branding" },
                      { moduleName: "maintenance", label: "Platform Maintenance" },
                      { moduleName: "shipping", label: "Shipping" },
                      { moduleName: "pricing", label: "Pricing" },
                      { moduleName: "pricingCategories", label: "Pricing Categories" },
                      { moduleName: "roles", label: "Staff Roles" },
                      { moduleName: "staff", label: "Staff Accounts" },
                    ],
                  },
                ];

                const cards = [];

                uiGroups.forEach((groupDef) => {
                  if (groupDef.isInfluencerCommerce) {
                    if (catalog.influencerCommerce && catalogLayout.influencerCommerce) {
                      const layout = catalogLayout.influencerCommerce;
                      const items = layout.groups.map((group) => {
                        const checkboxes = (group.permissions || (group.items || []).flatMap((item) =>
                          (item.actions || ["view"]).map((action) => {
                            const parsedAction = action === "view" || action === "read" 
                              ? `${item.key}Read` 
                              : `${item.key}${action.charAt(0).toUpperCase() + action.slice(1)}`;

                            return {
                              action: parsedAction,
                              label: `${item.label} (${action})`,
                            };
                          })
                        )).map((p) => ({
                          moduleName: "influencerCommerce",
                          action: p.action,
                          label: p.label,
                        }));
                        return {
                          label: group.label,
                          iconLabel: group.label,
                          checkboxes,
                        };
                      });
                      cards.push(
                        renderGroupCard({
                          id: "influencerCommerce",
                          label: layout.label || "Influencer Commerce",
                          icon: Megaphone,
                          items,
                        })
                      );
                    }
                    return;
                  }

                  const items = groupDef.items
                    .filter((item) => catalog[item.moduleName]) // Only include modules present in catalog
                    .map((item) => ({
                      label: item.label,
                      iconLabel: item.label,
                      checkboxes: (catalog[item.moduleName] || []).map((action) => ({
                        moduleName: item.moduleName,
                        action,
                        label: action,
                      })),
                    }));

                  if (items.length > 0) {
                    cards.push(renderGroupCard({ ...groupDef, items }));
                  }
                });

                return cards;
              })()}
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
