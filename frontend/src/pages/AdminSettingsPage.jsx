export function AdminSettingsPage() {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Workspace settings</h2>
        <div className="mt-4 grid gap-4">
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="text-sm font-medium text-slate-900 dark:text-white">Moderation policy</div>
            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Products and sellers must be reviewed before approval.</div>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="text-sm font-medium text-slate-900 dark:text-white">Order workflow</div>
            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Admins can move orders through Pending, Shipped, and Delivered states.</div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Notes</h2>
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          This panel is ready for future toggles such as tax rules, commission settings, notification preferences, and brand configuration.
        </div>
      </section>
    </div>
  );
}
