import { useEffect, useMemo, useState } from "react";
import { Building2, Check, Edit3, Image, LockKeyhole, RotateCcw, Share2, ShieldCheck, Star, Truck } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../context/authStore";
import { resolveApiAssetUrl } from "../../utils/resolveUrl";
import { followVendorStore, unfollowVendorStore } from "../../services/vendorStorefrontService";
import { getVendorMe } from "../../services/vendorService";

const numberFormatter = new Intl.NumberFormat("en-IN");
const compactFormatter = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatCount(value, compact = false) {
  const number = Number(value || 0);
  return compact ? compactFormatter.format(number) : numberFormatter.format(number);
}

function getStoreLocation(vendor) {
  const address =
    vendor?.pickupAddress ||
    vendor?.businessAddress ||
    vendor?.address ||
    vendor?.warehouseAddress ||
    {};
  const parts = [
    address.city || vendor?.city,
    address.state || vendor?.state,
    address.country || vendor?.country,
  ].filter(Boolean);
  return parts.join(", ");
}

function StoreMetric({ label, value, icon }) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 px-2.5 py-2 text-center dark:bg-slate-900">
      <div className="mx-auto flex min-h-6 items-center justify-center gap-1 text-sm font-bold text-slate-950 dark:text-white">
        {icon}
        <span className="truncate">{value}</span>
      </div>
      <div className="mt-0.5 truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}

function StoreChip({ children, icon }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
      {icon}
      <span className="truncate">{children}</span>
    </span>
  );
}

export function VendorStoreHeader({ vendor, isFollowing, onFollowChange }) {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const [busy, setBusy] = useState(false);
  const [isOwnStore, setIsOwnStore] = useState(false);
  const banner = resolveApiAssetUrl(vendor?.bannerUrl);
  const logo = resolveApiAssetUrl(vendor?.logoUrl);
  const shippingMode = String(vendor?.shippingSettings?.defaultShippingMode || "").replace(/_/g, " ");
  const dynamicInfo = useMemo(() => {
    const items = [
      vendor?.vendorCode ? { icon: ShieldCheck, label: "Store ID", value: vendor.vendorCode } : null,
      vendor?.companyName && vendor.companyName !== vendor.vendorName ? { icon: Building2, label: "Company", value: vendor.companyName } : null,
      vendor?.defaultCourier ? { icon: Truck, label: "Courier", value: vendor.defaultCourier } : null,
      shippingMode ? { icon: Truck, label: "Shipping", value: shippingMode } : null,
    ];
    return items.filter(Boolean);
  }, [shippingMode, vendor]);

  useEffect(() => {
    let alive = true;

    if (!isAuthenticated || user?.role !== "vendor" || !vendor?.storeSlug) {
      setIsOwnStore(false);
      return () => {
        alive = false;
      };
    }

    getVendorMe()
      .then((response) => {
        const currentVendor = response?.data || response;
        if (!alive) return;
        setIsOwnStore(String(currentVendor?.storeSlug || "").toLowerCase() === String(vendor.storeSlug || "").toLowerCase());
      })
      .catch(() => {
        if (alive) setIsOwnStore(false);
      });

    return () => {
      alive = false;
    };
  }, [isAuthenticated, user?.role, vendor?.storeSlug]);

  async function toggleFollow() {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/vendor/${vendor.storeSlug}`);
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const response = isFollowing
        ? await unfollowVendorStore(vendor.storeSlug)
        : await followVendorStore(vendor.storeSlug);
      onFollowChange?.(response.data);
    } finally {
      setBusy(false);
    }
  }

  async function shareStore() {
    const url = `${window.location.origin}/vendor/${vendor.storeSlug}`;
    if (navigator.share) {
      await navigator.share({ title: vendor.vendorName, url });
      return;
    }
    await navigator.clipboard.writeText(url);
  }

  const navClass = ({ isActive }) =>
    `shrink-0 whitespace-nowrap pb-4 text-[15px] transition-colors border-b-2 ${
      isActive
        ? "border-indigo-600 text-[#2B2358] font-bold dark:border-indigo-400 dark:text-indigo-100"
        : "border-transparent text-slate-600 hover:text-indigo-600 hover:border-slate-300 font-semibold dark:text-slate-300 dark:hover:text-white"
    }`;

  const storeLocation = getStoreLocation(vendor);

  return (
    <div className="relative w-full max-w-full">
      {/* Banner */}
      <div className="relative z-10 h-48 w-full shrink-0 overflow-hidden rounded-t-[2rem] border border-b-0 border-slate-200 bg-indigo-50/50 dark:border-slate-800 dark:bg-slate-900 sm:h-64 md:h-[300px]">
        {banner ? (
          <img loading="lazy" decoding="async" src={banner} alt={`${vendor.vendorName} banner`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#f8fafc,#e5e7eb_52%,#f1f5f9)] dark:bg-[linear-gradient(135deg,#0f172a,#1e293b_52%,#111827)]">
            <Image className="h-20 w-20 text-slate-300 dark:text-slate-700" strokeWidth={1.25} />
          </div>
        )}
      </div>

      {/* Main Content Card overlapping the banner */}
      <header className="relative z-20 mx-0 rounded-t-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:-mt-20 sm:mx-6 sm:rounded-b-[2rem] sm:p-7 md:-mt-24 md:mx-4">
        <div className="flex flex-col gap-6 md:flex-row md:gap-8">
          {/* Logo Section */}
          <div className="relative z-30 -mt-12 flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white text-center shadow-[0_2px_8px_rgba(0,0,0,0.08)] ring-4 ring-white dark:border-slate-800 dark:bg-slate-900 dark:ring-slate-950 sm:mt-0 sm:h-32 sm:w-32">
            {logo ? (
              <img loading="lazy" decoding="async" src={logo} alt={`${vendor.vendorName} logo`} className="h-full w-full object-contain p-3" />
            ) : (
              <div className="grid gap-1 text-slate-700 dark:text-slate-200">
                <span className="text-xl font-bold tracking-tight sm:text-2xl">{vendor.vendorName?.slice(0, 3) || "GRM"}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Store</span>
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="flex min-w-0 flex-1 flex-col justify-between gap-6 md:flex-row md:items-start">
            <div className="min-w-0 flex-1">
              {/* Title & Badges */}
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">{vendor.vendorName}</h1>
                {vendor.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-900">
                    <ShieldCheck className="h-3.5 w-3.5" /> Verified Store
                  </span>
                )}
              </div>
              {/* Description */}
              <p className="mt-2 text-[15px] font-medium leading-snug text-slate-600 dark:text-slate-300">
                {vendor.storeDescription || "Premium Fashion & Textile Marketplace"}
              </p>
              {/* Metrics */}
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] font-semibold text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="text-slate-900 dark:text-white">{Number(vendor.rating || 0).toFixed(1)}</span>
                  <span className="text-slate-500">({formatCount(vendor.totalReviews)} Reviews)</span>
                </div>
                <div className="hidden h-4 w-[1px] bg-slate-300 dark:bg-slate-700 sm:block"></div>
                <div>
                  <span className="text-slate-900 dark:text-white">{formatCount(vendor.followersCount, true)}</span> <span className="text-slate-500">Followers</span>
                </div>
                <div className="hidden h-4 w-[1px] bg-slate-300 dark:bg-slate-700 sm:block"></div>
                <div>
                  <span className="text-slate-900 dark:text-white">{formatCount(vendor.productsCount)}</span> <span className="text-slate-500">Products</span>
                </div>
              </div>

              {/* Features Chips */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <StoreChip icon={<RotateCcw className="h-3.5 w-3.5" />}>Easy Returns</StoreChip>
                <StoreChip icon={<Truck className="h-3.5 w-3.5" />}>On-time Delivery</StoreChip>
                <StoreChip icon={<LockKeyhole className="h-3.5 w-3.5" />}>Secure Payments</StoreChip>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              {isOwnStore ? (
                <Link to="/vendor/settings" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-950 px-5 text-[14px] font-semibold text-white shadow-sm transition hover:bg-indigo-900 dark:bg-indigo-600 dark:hover:bg-indigo-500">
                  <Edit3 className="h-4 w-4" /> Edit Profile
                </Link>
              ) : user?.role === "vendor" ? null : (
                <button
                  type="button"
                  onClick={toggleFollow}
                  disabled={busy}
                  className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-[14px] font-semibold shadow-sm transition disabled:opacity-60 ${
                    isFollowing ? "bg-indigo-950 text-white hover:bg-rose-600" : "bg-[#0B092A] text-white hover:bg-slate-900"
                  }`}
                >
                  {isFollowing ? (
                    <><span className="flex group-hover:hidden items-center gap-2">Following <Check className="h-4 w-4" /></span><span className="hidden group-hover:inline">Unfollow</span></>
                  ) : "Follow Store"}
                </button>
              )}
              <button
                type="button"
                onClick={shareStore}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-[14px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <Share2 className="h-4 w-4" /> Share Profile
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Meta Info Box */}
        {dynamicInfo.length > 0 && (
          <div className="mt-8 rounded-xl border border-slate-100 bg-[#F8F9FB] p-3 sm:px-5 sm:py-3.5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-start gap-x-8 gap-y-3">
              {dynamicInfo.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={`${item.label}-${item.value}`} className="flex items-center gap-2 text-[13px] text-slate-700 dark:text-slate-300">
                    <Icon className="h-4 w-4 shrink-0 text-indigo-500/70 dark:text-indigo-400" />
                    <span className="font-semibold">{item.label}:</span>
                    <span className="truncate text-slate-600 dark:text-slate-400">{item.value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tabs Bar */}
        <div className="mt-8 flex flex-col justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 sm:flex-row sm:items-center">
          <nav className="-mb-[1px] flex items-center gap-6 overflow-x-auto scrollbar-hide">
             <NavLink to={`/vendor/${vendor.storeSlug}`} end className={navClass}>Store</NavLink>
             <NavLink to={`/vendor/${vendor.storeSlug}/products`} className={navClass}>Products</NavLink>
             <NavLink to={`/vendor/${vendor.storeSlug}/reviews`} className={navClass}>Reviews</NavLink>
             <NavLink to={`/vendor/${vendor.storeSlug}/followers`} className={navClass}>Followers</NavLink>
          </nav>
          <div className="shrink-0 pb-4">
             <Link to="/cart" className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 sm:w-auto">
                Marketplace Cart
             </Link>
          </div>
        </div>
      </header>
    </div>
  );
}
