import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { STAFF_MODULES, SIDEBAR_SECTIONS, getAccessibleModules } from "../../config/staffModules";

const ICON_MAP = {
  LayoutDashboard: DashboardIcon,
  Users: UsersIcon,
  ShoppingCart: OrdersIcon,
  Package: PackageIcon,
  TrendingUp: PayoutsIcon,
};

export function StaffSidebar({ permissions, isOpen, onToggle }) {
  const location = useLocation();
  const [expandedSections, setExpandedSections] = useState({
    main: true,
    management: true,
    finance: true,
  });

  const accessibleModules = useMemo(() => getAccessibleModules(permissions), [permissions]);

  const modulesBySection = useMemo(() => {
    return accessibleModules.reduce((groups, module) => {
      const section = module.section || "main";
      const next = groups;
      next[section] = next[section] || [];
      next[section].push(module);
      return next;
    }, {});
  }, [accessibleModules]);

  function toggleSection(section) {
    setExpandedSections((current) => ({ ...current, [section]: !current[section] }));
  }

  function isActive(route) {
    return location.pathname === route || location.pathname.startsWith(`${route}/`);
  }

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className="fixed right-4 top-4 z-40 rounded-xl border border-slate-200 bg-white p-2 shadow-lg lg:hidden"
        aria-label="Toggle staff navigation"
      >
        {isOpen ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
      </button>

      <aside
        className={`fixed left-0 top-0 z-40 h-screen w-72 transform overflow-y-auto border-r border-slate-200 bg-white transition-transform duration-300 lg:relative lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="sticky top-0 border-b border-slate-200 bg-white px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-white">
              GRM
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-950">GRM Staff</div>
              <div className="text-xs text-slate-500">Dynamic role workspace</div>
            </div>
          </div>
        </div>

        <nav className="space-y-3 px-3 py-4">
          {Object.entries(modulesBySection).map(([section, sectionModules]) => (
            <div key={section}>
              {section !== "main" ? (
                <button
                  type="button"
                  onClick={() => toggleSection(section)}
                  className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400"
                >
                  <span>{SIDEBAR_SECTIONS[section] || section}</span>
                  <ChevronDownIcon
                    className={`h-3.5 w-3.5 transition-transform ${expandedSections[section] ? "" : "-rotate-90"}`}
                  />
                </button>
              ) : null}

              {expandedSections[section] ? (
                <div className="space-y-1">
                  {sectionModules.map((module) => {
                    const Icon = ICON_MAP[module.icon];
                    const active = isActive(module.route);

                    return (
                      <Link
                        key={module.key}
                        to={module.route}
                        className={`group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition ${
                          active
                            ? "bg-slate-950 text-white shadow-sm"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                        }`}
                      >
                        {Icon ? <Icon size={18} className="shrink-0" /> : null}
                        <div className="min-w-0">
                          <div className="font-medium">{module.name}</div>
                          <div className={`truncate text-xs ${active ? "text-slate-300" : "text-slate-400"}`}>
                            {module.description}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs text-slate-500">
            {accessibleModules.length} module{accessibleModules.length === 1 ? "" : "s"} available
          </p>
        </div>
      </aside>
    </>
  );
}

function IconBase({ className = "h-4 w-4", children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function MenuIcon({ className }) {
  return (
    <IconBase className={className}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </IconBase>
  );
}

function CloseIcon({ className }) {
  return (
    <IconBase className={className}>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </IconBase>
  );
}

function ChevronDownIcon({ className }) {
  return (
    <IconBase className={className}>
      <path d="m6 9 6 6 6-6" />
    </IconBase>
  );
}

function DashboardIcon({ size = 18, className = "" }) {
  return (
    <IconBase className={className || ""}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="5" rx="1.5" />
      <rect x="13.5" y="11.5" width="7" height="9" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    </IconBase>
  );
}

function UsersIcon({ className = "shrink-0" }) {
  return (
    <IconBase className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="9.5" cy="7" r="3" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 4.13a3 3 0 0 1 0 5.74" />
    </IconBase>
  );
}

function OrdersIcon({ className = "shrink-0" }) {
  return (
    <IconBase className={className}>
      <circle cx="9" cy="19" r="1.5" />
      <circle cx="17" cy="19" r="1.5" />
      <path d="M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.74L20 8H7" />
    </IconBase>
  );
}

function PackageIcon({ className = "shrink-0" }) {
  return (
    <IconBase className={className}>
      <path d="m12 2 8 4.5v11L12 22 4 17.5v-11L12 2Z" />
      <path d="M12 22V11.5" />
      <path d="m20 6.5-8 5-8-5" />
    </IconBase>
  );
}

function PayoutsIcon({ className = "shrink-0" }) {
  return (
    <IconBase className={className}>
      <path d="M4 16 10 10l4 4 6-8" />
      <path d="M20 10V6h-4" />
      <path d="M4 20h16" />
    </IconBase>
  );
}
