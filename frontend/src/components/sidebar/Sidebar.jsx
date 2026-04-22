import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Loader } from "lucide-react";
import { SidebarSection } from "./SidebarSection";

function pathMatches(pathname, targetPath) {
  return pathname === targetPath || pathname.startsWith(`${targetPath}/`);
}

export function Sidebar({
  open,
  onClose,
  title,
  subtitle,
  primaryItem,
  sections,
  loading = false,
  error = "",
}) {
  const location = useLocation();
  const PrimaryIcon = primaryItem.icon || LayoutDashboard;

  const activeSectionKey = useMemo(() => {
    return (
      sections.find((section) =>
        section.items.some((item) => pathMatches(location.pathname, item.path))
      )?.key || sections[0]?.key || null
    );
  }, [location.pathname, sections]);

  const [openSection, setOpenSection] = useState(null);

  useEffect(() => {
    if (activeSectionKey) {
      setOpenSection(activeSectionKey);
    }
  }, [activeSectionKey]);

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-slate-950/40 transition-opacity duration-300 lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[min(18rem,88vw)] flex-col border-r border-slate-200 bg-slate-50/95 backdrop-blur transition-transform duration-300 ease-out dark:border-slate-800 dark:bg-slate-950/95 lg:sticky lg:top-0 lg:h-screen lg:w-80 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 px-4 py-4 dark:border-slate-800">
          <div className="min-w-0">
            <div className="truncate text-base font-semibold text-slate-950 dark:text-white sm:text-lg">
              {title}
            </div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              {subtitle}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-white dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900 lg:hidden"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" d="M5 5l10 10M15 5 5 15" />
            </svg>
          </button>
        </div>

        <div className="border-b border-slate-200 px-3 py-3 dark:border-slate-800">
          <NavLink
            to={primaryItem.path}
            onClick={onClose}
            className={({ isActive }) =>
              [
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors",
                isActive
                  ? "bg-indigo-500 text-white"
                  : "bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
              ].join(" ")
            }
          >
            <PrimaryIcon className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{primaryItem.name}</span>
          </NavLink>
        </div>

        <nav className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
          {loading ? (
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              <Loader className="h-4 w-4 animate-spin" />
              <span>Loading navigation...</span>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-200">
              {error}
            </div>
          ) : null}

          {sections.map((section) => (
            <SidebarSection
              key={section.key}
              section={section.section}
              items={section.items}
              isOpen={openSection === section.key}
              onToggle={() =>
                setOpenSection((current) => (current === section.key ? null : section.key))
              }
              onNavigate={onClose}
              contentId={`sidebar-section-${section.key}`}
              buttonId={`sidebar-trigger-${section.key}`}
            />
          ))}
        </nav>
      </aside>
    </>
  );
}
