import { ChevronDown } from "lucide-react";
import { SidebarItem } from "./SidebarItem";

export function SidebarSection({
  section,
  items,
  isOpen,
  onToggle,
  onNavigate,
  contentId,
  buttonId,
}) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/80 p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
      <button
        id={buttonId}
        type="button"
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={onToggle}
        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:text-white dark:hover:bg-slate-800"
      >
        <span>{section}</span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-slate-500 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <div
        id={contentId}
        role="region"
        aria-labelledby={buttonId}
        className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="overflow-hidden">
          <div className="space-y-1 px-1 pb-1 pt-2">
            {items.map((item) => (
              <SidebarItem key={item.path} item={item} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
