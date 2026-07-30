import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { SIDEBAR_SECTIONS, getAccessibleModules } from "../../config/staffModules";

const ICON_MAP = {
  LayoutDashboard: DashboardIcon,
  Users: UsersIcon,
  ShoppingCart: OrdersIcon,
  Package: PackageIcon,
  TrendingUp: PayoutsIcon,
  MessageCircle: MessageCircleIcon,
  CreditCard: CreditCardIcon,
  BarChart3: BarChart3Icon,
  Megaphone: MegaphoneIcon,
  Search: SearchIcon,
  Percent: PercentIcon,
  Link: LinkIcon,
  Wallet: PayoutsIcon,
  Settings: SettingsIcon,
  Lock: LockIcon,
  UserCheck: UserCheckIcon,
};

export function StaffSidebar({ permissions, enabledModules = {}, isOpen, onToggle }) {
  const location = useLocation();
  const [expandedSections, setExpandedSections] = useState({
    main: true,
    management: true,
    growth: true,
    finance: true,
  });
  const [expandedModules, setExpandedModules] = useState({
    "influencer-commerce": true,
  });
  const [expandedGroups, setExpandedGroups] = useState({
    "influencer-commerce:overview": true,
  });

  const accessibleModules = useMemo(
    () => getAccessibleModules(permissions, enabledModules),
    [enabledModules, permissions]
  );
  const visibleModules = useMemo(
    () => accessibleModules.filter((module) => module.key !== "dashboard"),
    [accessibleModules]
  );

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

  function toggleModule(moduleKey) {
    setExpandedModules((current) => ({ ...current, [moduleKey]: !current[moduleKey] }));
  }

  function toggleGroup(groupKey) {
    setExpandedGroups((current) => ({ ...current, [groupKey]: !current[groupKey] }));
  }

  function isActive(route) {
    return location.pathname === route || location.pathname.startsWith(`${route}/`);
  }

  function isModuleActive(module) {
    if (module.exact) return location.pathname === module.route;
    return isActive(module.route);
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
        className={`fixed left-0 top-0 z-40 flex h-screen w-64 min-w-[16rem] max-w-[16rem] flex-col transform border-r border-slate-200 bg-white transition-transform duration-300 lg:relative lg:translate-x-0 ${
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

        <nav className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
          {Object.entries(modulesBySection).map(([section, sectionModules]) => (
            <div key={section}>
              {section !== "main" && section !== "growth" ? (
                <button
                  type="button"
                  onClick={() => toggleSection(section)}
                  className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400"
                >
                  <span>{SIDEBAR_SECTIONS[section] || section}</span>
                  <ChevronDownIcon
                    className={`ml-auto h-3.5 w-3.5 transition-transform ${expandedSections[section] ? "" : "-rotate-90"}`}
                  />
                </button>
              ) : null}

              {expandedSections[section] ? (
                <div className="space-y-1">
                  {sectionModules.map((module) => {
                    if (module.children?.length) {
                      return (
                        <NestedModule
                          key={module.key}
                          module={module}
                          expanded={Boolean(expandedModules[module.key])}
                          expandedGroups={expandedGroups}
                          isModuleActive={isModuleActive}
                          onToggleModule={toggleModule}
                          onToggleGroup={toggleGroup}
                        />
                      );
                    }

                    return <ModuleLink key={module.key} module={module} active={isModuleActive(module)} />;
                  })}
                </div>
              ) : null}
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs text-slate-500">
            {visibleModules.length} module{visibleModules.length === 1 ? "" : "s"} available
          </p>
        </div>
      </aside>
    </>
  );
}

function ModuleLink({ module, active, nested = false }) {
  const Icon = ICON_MAP[module.icon];
  return (
    <Link
      to={module.route}
      className={`group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition ${
        active
          ? "bg-slate-950 text-white shadow-sm"
          : nested
            ? "bg-white text-slate-600 ring-1 ring-slate-100 hover:bg-slate-100 hover:text-slate-950"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
      }`}
    >
      {Icon ? <Icon size={nested ? 18 : 24} className="shrink-0 text-current" /> : null}
      <div className="min-w-0">
        <div className="truncate font-medium">{module.name}</div>
        {!nested ? (
          <div className={`truncate text-xs ${active ? "text-slate-300" : "text-slate-400"}`}>
            {module.description}
          </div>
        ) : null}
      </div>
    </Link>
  );
}

function NestedModule({ module, expanded, expandedGroups, isModuleActive, onToggleModule, onToggleGroup }) {
  const Icon = ICON_MAP[module.icon];

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <button
        type="button"
        onClick={() => onToggleModule(module.key)}
        className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2 text-left text-slate-800"
      >
        <span className="flex min-w-0 items-center gap-3">
          {Icon ? <Icon size={22} className="shrink-0 text-slate-600" /> : null}
          <span className="truncate text-sm font-semibold">{module.name}</span>
        </span>
        <ChevronDownIcon className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded ? (
        <div className="mt-2 space-y-1">
          {module.children.map((group) => {
            const GroupIcon = ICON_MAP[group.icon];
            const groupKey = `${module.key}:${group.key}`;
            const groupExpanded = Boolean(expandedGroups[groupKey]);

            return (
              <div key={group.key}>
                <button
                  type="button"
                  onClick={() => onToggleGroup(groupKey)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 transition hover:bg-white"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    {GroupIcon ? <GroupIcon size={16} className="shrink-0" /> : null}
                    <span className="truncate">{group.name}</span>
                  </span>
                  <ChevronDownIcon className={`h-3.5 w-3.5 shrink-0 transition-transform ${groupExpanded ? "rotate-180" : "-rotate-90"}`} />
                </button>

                {groupExpanded ? (
                  <div className="ml-5 mt-1 space-y-1">
                    {group.children.map((child) => (
                      <ModuleLink key={child.key} module={child} active={isModuleActive(child)} nested />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function IconBase({ className = "", size = 24, children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
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

function DashboardIcon({ size = 24, className = "" }) {
  return (
    <IconBase size={size} className={className}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="5" rx="1.5" />
      <rect x="13.5" y="11.5" width="7" height="9" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    </IconBase>
  );
}

function UsersIcon({ size = 24, className = "shrink-0" }) {
  return (
    <IconBase size={size} className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="9.5" cy="7" r="3" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 4.13a3 3 0 0 1 0 5.74" />
    </IconBase>
  );
}

function OrdersIcon({ size = 24, className = "shrink-0" }) {
  return (
    <IconBase size={size} className={className}>
      <circle cx="9" cy="19" r="1.5" />
      <circle cx="17" cy="19" r="1.5" />
      <path d="M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.74L20 8H7" />
    </IconBase>
  );
}

function PackageIcon({ size = 24, className = "shrink-0" }) {
  return (
    <IconBase size={size} className={className}>
      <path d="m12 2 8 4.5v11L12 22 4 17.5v-11L12 2Z" />
      <path d="M12 22V11.5" />
      <path d="m20 6.5-8 5-8-5" />
    </IconBase>
  );
}

function MegaphoneIcon({ size = 24, className = "shrink-0" }) {
  return (
    <IconBase size={size} className={className}>
      <path d="m3 11 14-5v12L3 13z" />
      <path d="M11 14v4a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-2.5" />
      <path d="M21 9v6" />
    </IconBase>
  );
}

function SearchIcon({ size = 24, className = "shrink-0" }) {
  return (
    <IconBase size={size} className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4 4" />
    </IconBase>
  );
}

function LinkIcon({ size = 24, className = "shrink-0" }) {
  return (
    <IconBase size={size} className={className}>
      <path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" />
      <path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.1-1.1" />
    </IconBase>
  );
}

function PercentIcon({ size = 24, className = "shrink-0" }) {
  return (
    <IconBase size={size} className={className}>
      <path d="M19 5 5 19" />
      <circle cx="7" cy="7" r="2" />
      <circle cx="17" cy="17" r="2" />
    </IconBase>
  );
}

function PayoutsIcon({ size = 24, className = "shrink-0" }) {
  return (
    <IconBase size={size} className={className}>
      <path d="M4 16 10 10l4 4 6-8" />
      <path d="M20 10V6h-4" />
      <path d="M4 20h16" />
    </IconBase>
  );
}

function MessageCircleIcon({ size = 24, className = "shrink-0" }) {
  return (
    <IconBase size={size} className={className}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </IconBase>
  );
}

function CreditCardIcon({ size = 24, className = "shrink-0" }) {
  return (
    <IconBase size={size} className={className}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </IconBase>
  );
}

function BarChart3Icon({ size = 24, className = "shrink-0" }) {
  return (
    <IconBase size={size} className={className}>
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17v-4" />
      <path d="M8 17v-2" />
    </IconBase>
  );
}

function SettingsIcon({ size = 24, className = "shrink-0" }) {
  return (
    <IconBase size={size} className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m0 5.08l4.24 4.24M1 12h6m6 0h6m-1-8.22l-4.24 4.24m-5.08 0L4.22 19.78" />
    </IconBase>
  );
}

function LockIcon({ size = 24, className = "shrink-0" }) {
  return (
    <IconBase size={size} className={className}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </IconBase>
  );
}

function UserCheckIcon({ size = 24, className = "shrink-0" }) {
  return (
    <IconBase size={size} className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="9.5" cy="7" r="3" />
      <polyline points="16 11 18 13 22 9" />
    </IconBase>
  );
}
