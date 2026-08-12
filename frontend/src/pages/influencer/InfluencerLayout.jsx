import { useMemo, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import {
  BarChart3,
  Boxes,
  CheckCircle2,
  ClipboardList,
  LayoutDashboard,
  Link2,
  Megaphone,
  PackageCheck,
  PackagePlus,
  Settings,
  Star,
  Store,
  Undo2,
  Upload,
  Wallet,
} from "lucide-react";
import { Sidebar } from "../../components/sidebar/Sidebar";
import { Topbar } from "../../components/Topbar";
import { useAuthStore } from "../../context/authStore";
import { usePlatformFeatures } from "../../context/PlatformFeaturesContext";

const INFLUENCER_PRIMARY_ITEM = {
  name: "Dashboard",
  path: "/influencer/dashboard",
  icon: LayoutDashboard,
};

const INFLUENCER_SECTIONS = [
  {
    section: "Collection",
    key: "collection",
    items: [
      { name: "Create Collection", path: "/influencer/collections", matchSearch: "?tab=create", icon: Boxes },
      { name: "Featured Collections", path: "/influencer/collections", matchSearch: "?tab=featured", icon: Star },
      { name: "Seasonal Collections", path: "/influencer/collections", matchSearch: "?tab=seasonal", icon: Boxes },
      { name: "Product Assignment", path: "/influencer/collections", matchSearch: "?tab=assignment", icon: PackagePlus },
      { name: "Collection Analytics", path: "/influencer/collections", matchSearch: "?tab=analytics", icon: BarChart3 },
      { name: "Collection Visibility", path: "/influencer/collections", matchSearch: "?tab=visibility", icon: Boxes },
    ],
  },
  {
    section: "Influencer Commerce",
    key: "influencer-commerce",
    items: [
      { name: "Earnings & Withdrawals", path: "/influencer/earnings-withdrawals", icon: Wallet },
      { name: "Campaign Earnings", path: "/influencer/finance/campaign-earnings", icon: Wallet },
    ],
  },
  {
    section: "Affiliate Product",
    key: "growth",
    items: [
      { name: "My Promotion Products", path: "/influencer/affiliate-products", icon: PackagePlus },
      { name: "Generate Affiliate Links", path: "/influencer/affiliate-products", matchSearch: "?tab=links", icon: Link2 },
    ],
  },
  {
    section: "Videos & Content",
    key: "content",
    items: [
      { name: "Upload Content", path: "/influencer/content", icon: Upload },
      { name: "Media Library", path: "/influencer/content", matchSearch: "?tab=media", icon: Store },
      { name: "Scheduled Content", path: "/influencer/content", matchSearch: "?tab=scheduled", icon: Upload },
    ],
  },
  {
    section: "Campaign Marketplace",
    key: "campaigns",
    items: [
      { name: "Available Campaigns", path: "/influencer/campaigns", icon: Megaphone },
      { name: "My Services", path: "/influencer/campaigns", matchSearch: "?tab=services", icon: Settings },
      { name: "Recommended Campaigns", path: "/influencer/campaigns", matchSearch: "?tab=recommended", icon: Star },
      { name: "Campaign Invitations", path: "/influencer/campaigns", matchSearch: "?tab=invitations", icon: ClipboardList },
      { name: "Accepted Campaigns", path: "/influencer/campaigns", matchSearch: "?tab=accepted", icon: CheckCircle2 },
      { name: "Delivered Products", path: "/influencer/campaigns", matchSearch: "?tab=delivered-products", icon: PackageCheck },
      { name: "Returned Products", path: "/influencer/campaigns", matchSearch: "?tab=returned-products", icon: Undo2 },
      { name: "Rejected Campaigns", path: "/influencer/campaigns", matchSearch: "?tab=rejected", icon: ClipboardList },
      { name: "Completed Campaigns", path: "/influencer/campaigns", matchSearch: "?tab=completed", icon: CheckCircle2 },
      { name: "Campaign Analytics", path: "/influencer/campaigns", matchSearch: "?tab=analytics", icon: BarChart3 },
    ],
  },
  {
    section: "Settings",
    key: "settings",
    items: [
      { name: "Profile Settings", path: "/influencer/settings", icon: Settings },
    ],
  },
];

function withQueryPath(item) {
  return item.matchSearch ? { ...item, to: `${item.path}${item.matchSearch}`, matchPath: item.path } : item;
}

function sectionWithQueryPaths(section) {
  return {
    ...section,
    items: section.items.map(withQueryPath),
  };
}

const pageMeta = {
  "/influencer/dashboard": {
    title: "Dashboard",
    subtitle: "Track earnings, campaign performance, and creator growth metrics.",
  },
  "/influencer/settings": {
    title: "Profile Settings",
    subtitle: "Manage your public profile, storefront, and account preferences.",
  },
  "/influencer/collections": {
    title: "Collections",
    subtitle: "Create, manage, and showcase your curated product collections.",
  },
  "/influencer/earnings-withdrawals": {
    title: "Earnings & Withdrawals",
    subtitle: "Monitor commission earnings, wallet balance, and withdrawal requests.",
  },
  "/influencer/finance/campaign-earnings": {
    title: "Campaign Earnings",
    subtitle: "Track fixed, commission, hybrid, and free-product campaign earnings.",
  },
  "/influencer/affiliate-products": {
    title: "Affiliate Products",
    subtitle: "Promote products, generate affiliate links, and track performance.",
  },
  "/influencer/affiliate-links": {
    title: "Affiliate Links",
    subtitle: "Create and manage your personal affiliate links for products.",
  },
  "/influencer/campaigns": {
    title: "Campaign Marketplace",
    subtitle: "Browse available campaigns, manage invitations, and track accepted campaigns.",
  },
  "/influencer/campaign-execution": {
    title: "Campaign Execution",
    subtitle: "Execute campaigns and manage deliverables with real-time tracking.",
  },
  "/influencer/content": {
    title: "Content Center",
    subtitle: "Upload posts or reels, manage content library, and schedule publications.",
  },
};

export function InfluencerLayout() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const { influencerCommerceEnabled, loading: commerceLoading } = usePlatformFeatures();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const sidebarSections = useMemo(() => INFLUENCER_SECTIONS.map(sectionWithQueryPaths), []);

  const userRoles = Array.from(new Set([user?.role, ...(user?.roles || [])].filter(Boolean)));
  if (!user || !userRoles.includes("influencer")) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!commerceLoading && !influencerCommerceEnabled) {
    return <Navigate to="/" replace />;
  }

  let meta = pageMeta[location.pathname] || pageMeta["/influencer/dashboard"];
  if (location.pathname.startsWith("/influencer/campaigns/")) {
    meta = pageMeta["/influencer/campaigns"];
  } else if (location.pathname.startsWith("/influencer/collections/")) {
    meta = pageMeta["/influencer/collections"];
  } else if (location.pathname.startsWith("/influencer/campaign-execution/")) {
    meta = pageMeta["/influencer/campaign-execution"];
  }

  function handleMenuToggle() {
    setSidebarOpen((open) => !open);
  }

  return (
    <div className={`flex min-h-screen max-w-full overflow-x-hidden bg-slate-100 dark:bg-slate-950 ${sidebarOpen ? "lg:ml-20" : "lg:ml-0"}`}>
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={() => setSidebarOpen(false)}
        title="Influencer Hub"
        subtitle="Creator commerce workspace"
        primaryItem={INFLUENCER_PRIMARY_ITEM}
        sections={sidebarSections}
      />
      <div className="flex min-w-0 max-w-full flex-1 flex-col">
        <Topbar
          title={meta.title}
          subtitle={meta.subtitle}
          onMenuToggle={handleMenuToggle}
          sidebarOpen={sidebarOpen}
        />
        <main className="min-w-0 max-w-full flex-1 overflow-x-hidden px-4 py-4 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
