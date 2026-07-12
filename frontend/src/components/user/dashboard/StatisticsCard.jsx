import { compactCount } from "./dashboardUtils";

export function StatisticsCard({ label, value, icon: Icon, tone = "slate" }) {
  const tones = {
    slate: "bg-white text-slate-950 border-slate-200 dark:bg-slate-900 dark:text-white dark:border-slate-800",
    amber: "bg-amber-50 text-amber-950 border-amber-200 dark:bg-amber-950/20 dark:text-amber-100 dark:border-amber-900",
    emerald: "bg-emerald-50 text-emerald-950 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-100 dark:border-emerald-900",
    rose: "bg-rose-50 text-rose-950 border-rose-200 dark:bg-rose-950/20 dark:text-rose-100 dark:border-rose-900",
    blue: "bg-blue-50 text-blue-950 border-blue-200 dark:bg-blue-950/20 dark:text-blue-100 dark:border-blue-900",
  };

  return (
    <div className={`min-h-[78px] rounded-2xl border p-3 shadow-sm ${tones[tone] || tones.slate}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1 text-xl font-black leading-none tracking-normal">{compactCount(value)}</p>
        </div>
        {Icon ? (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/70 text-current dark:bg-white/10">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
