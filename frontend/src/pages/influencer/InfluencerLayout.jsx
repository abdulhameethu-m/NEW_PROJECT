import { useMemo, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import {
  BarChart3,
  Boxes,
  CheckCircle2,
  Clapperboard,
  ClipboardList,
  LayoutDashboard,
  Link2,
  Megaphone,
  PackagePlus,
  Settings,
  Star,
  Store,
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
    section: "Affiliate Product",
    key: "growth",
    items: [
      { name: "My Promotion Products", path: "/influencer/affiliate-products", icon: PackagePlus },
      { name: "Active Campaign Products", path: "/influencer/affiliate-products", matchSearch: "?tab=active_campaigns", icon: Megaphone },
      { name: "Approved Products", path: "/influencer/affiliate-products", matchSearch: "?tab=approved", icon: Store },
      { name: "Saved Products", path: "/influencer/affiliate-products", matchSearch: "?tab=saved", icon: Star },
      { name: "Generate Affiliate Links", path: "/influencer/affiliate-products", matchSearch: "?tab=links", icon: Link2 },
      { name: "Product Analytics", path: "/influencer/affiliate-products", matchSearch: "?tab=analytics", icon: BarChart3 },
      { name: "Campaign Performance", path: "/influencer/affiliate-products", matchSearch: "?tab=campaign_performance", icon: Wallet },
    ],
  },
  {
    section: "Videos & Content",
    key: "content",
    items: [
      { name: "Upload Videos", path: "/influencer/content", icon: Upload },
      { name: "Product Videos", path: "/influencer/content", matchSearch: "?tab=products", icon: Clapperboard },
      { name: "Shorts/Reels", path: "/influencer/content", matchSearch: "?tab=reels", icon: Clapperboard },
      { name: "Live Commerce", path: "/influencer/content", matchSearch: "?tab=live", icon: Megaphone },
      { name: "Media Library", path: "/influencer/content", matchSearch: "?tab=media", icon: Store },
      { name: "Scheduled Content", path: "/influencer/content", matchSearch: "?tab=scheduled", icon: Upload },
      { name: "Content Analytics", path: "/influencer/content", matchSearch: "?tab=analytics", icon: BarChart3 },
      { name: "Performance Reports", path: "/influencer/content", matchSearch: "?tab=reports", icon: BarChart3 },
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
      { name: "Rejected Campaigns", path: "/influencer/campaigns", matchSearch: "?tab=rejected", icon: ClipboardList },
      { name: "Completed Campaigns", path: "/influencer/campaigns", matchSearch: "?tab=completed", icon: CheckCircle2 },
      { name: "Campaign Analytics", path: "/influencer/campaigns", matchSearch: "?tab=analytics", icon: BarChart3 },
    ],
  },
];

const PAGE_META = {
  "/influencer/dashboard": {
    title: "Creator overview",
    subtitle: "Campaigns, content, collections, and affiliate performance.",
  },
  "/influencer/collections": {
    title: "Collections",
    subtitle: "Curate products and share creator recommendations.",
  },
  "/influencer/affiliate-links": {
    title: "Affiliate links",
    subtitle: "Generate product, collection, campaign, and storefront tracking URLs.",
  },
  "/influencer/affiliate-products": {
    title: "Affiliate Products",
    subtitle: "Discover products, generate tracking links, save opportunities, and analyze affiliate performance.",
  },
  "/influencer/campaigns": {
    title: "Campaign Marketplace",
    subtitle: "Configure services, discover campaigns, manage deliverables, and analyze brand performance.",
  },
  "/influencer/reels/upload": {
    title: "Upload a reel",
    subtitle: "Attach content to an active campaign and tag eligible products.",
  },
  "/influencer/content": {
    title: "Videos & Content",
    subtitle: "Upload, schedule, monetize, and analyze product videos, reels, live commerce, and media assets.",
  },
  "/influencer/reels": {
    title: "Reel performance",
    subtitle: "Moderation status, engagement metrics, and storefront attribution.",
  },
};

function withQueryPath(item) {
  return item.matchSearch ? { ...item, to: `${item.path}${item.matchSearch}`, matchPath: item.path } : item;
}

function sectionWithQueryPaths(section) {
  return {
    ...section,
    items: section.items.map(withQueryPath),
  };
}

export function InfluencerLayout() {
  const user = useAuthStore((s) => s.user);
  const { influencerCommerceEnabled, loading: commerceLoading } = usePlatformFeatures();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const meta = useMemo(() => {
    const hit = Object.keys(PAGE_META).find(
      (path) => location.pathname === path || location.pathname.startsWith(`${path}/`)
    );
    return PAGE_META[hit] || PAGE_META["/influencer/dashboard"];
  }, [location.pathname]);

  const sidebarSections = useMemo(() => INFLUENCER_SECTIONS.map(sectionWithQueryPaths), []);

  const userRoles = Array.from(new Set([user?.role, ...(user?.roles || [])].filter(Boolean)));
  if (!user || !userRoles.includes("influencer")) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!commerceLoading && !influencerCommerceEnabled) {
    return <Navigate to="/" replace />;
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
          onMenuToggle={() => setSidebarOpen((open) => !open)}
          sidebarOpen={sidebarOpen}
        />
        <main className="min-w-0 max-w-full flex-1 overflow-x-hidden px-4 py-4 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
