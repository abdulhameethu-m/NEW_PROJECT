export function AddressCard({
  address,
  selected = false,
  onSelect,
  onEdit,
  actionLabel = "Deliver here",
  compact = false,
}) {
  if (!address) return null;

  return (
    <div
      className={`rounded-[1.75rem] border p-5 shadow-sm transition ${
        selected
          ? "border-[color:var(--commerce-accent)] bg-[color:var(--commerce-accent-soft)]"
          : "border-slate-200 bg-white hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
      }`}
    >
      <div className={`flex ${compact ? "flex-col gap-3" : "flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"}`}>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-base font-semibold text-slate-950 dark:text-white">{address.name}</div>
            {address.isDefault ? (
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                Default
              </span>
            ) : null}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-300">{address.phone}</div>
          <div className="text-sm leading-6 text-slate-700 dark:text-slate-200">
            <div>{address.addressLine}</div>
            <div>
              {address.city}, {address.state} {address.pincode}
            </div>
            <div>{address.country || "India"}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Change
            </button>
          ) : null}
          {onSelect ? (
            <button
              type="button"
              onClick={onSelect}
              className={`rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm ${
                selected ? "bg-slate-900 dark:bg-slate-100 dark:text-slate-900" : "bg-[color:var(--commerce-accent)]"
              }`}
            >
              {selected ? "Selected" : actionLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
