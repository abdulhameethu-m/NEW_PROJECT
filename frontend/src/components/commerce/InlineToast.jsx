import { useEffect } from "react";

export function InlineToast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined;
    const id = window.setTimeout(() => onClose?.(), 3500);
    return () => window.clearTimeout(id);
  }, [toast, onClose]);

  if (!toast) return null;

  const tone =
    toast.type === "error"
      ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
      : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200";

  return (
    <div className={`fixed bottom-5 right-5 z-50 max-w-sm rounded-2xl border px-4 py-3 shadow-lg ${tone}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="text-sm font-medium">{toast.message}</div>
        <button type="button" onClick={() => onClose?.()} className="text-xs font-semibold uppercase tracking-wide">
          Close
        </button>
      </div>
    </div>
  );
}
