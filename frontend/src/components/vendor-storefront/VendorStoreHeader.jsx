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
    `shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition sm:px-4 ${
      isActive
        ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
    }`;
  const mobileNavClass = ({ isActive }) =>
    `shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-xs font-bold transition ${
      isActive
        ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
        : "bg-white text-slate-600 ring-1 ring-slate-200 hover:text-slate-950 dark:bg-slate-950 dark:text-slate-300 dark:ring-slate-800 dark:hover:text-white"
    }`;
  const storeLocation = getStoreLocation(vendor);

  return (
    <header className="max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 max-sm:rounded-xl">
      <div className="md:hidden">
        <div className="relative h-[160px] overflow-hidden bg-slate-100 dark:bg-slate-900">
          {banner ? (
            <img loading="lazy" decoding="async" src={banner} alt={`${vendor.vendorName} banner`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#f8fafc,#e5e7eb_52%,#f1f5f9)] dark:bg-[linear-gradient(135deg,#0f172a,#1e293b_52%,#111827)]">
              <Image className="h-10 w-10 text-slate-300 dark:text-slate-700" strokeWidth={1.25} />
            </div>
          )}
          {vendor.verified ? (
            <div className="absolute right-3 top-3 z-30 inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1 text-[11px] font-semibold text-white shadow-sm ring-1 ring-white/80">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verified
            </div>
          ) : null}
        </div>

        <div className="px-3 pb-3">
          <div className="-mt-[60px] flex flex-col items-start gap-4">
            <div className="h-[120px] w-[120px] ml-3 shrink-0 flex items-center justify-center overflow-hidden rounded-full border-4 border-white bg-white shadow-md ring-1 ring-slate-200 dark:border-slate-950 dark:bg-slate-900 dark:ring-slate-800 z-20">
              {logo ? (
                <img loading="lazy" decoding="async" src={logo} alt={`${vendor.vendorName} logo`} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <span className="text-lg font-semibold tracking-wide">{vendor.vendorName?.slice(0, 3) || "GRM"}</span>
                </div>
              )}
            </div>
            <div className="w-full relative z-30 pl-3 pt-3">
              <div className="flex min-w-0 flex-col gap-3">
                <h1 className="truncate text-2xl font-semibold leading-tight text-slate-950 dark:text-white">{vendor.vendorName}</h1>
                <p className="text-sm font-medium leading-6 text-slate-900 dark:text-slate-300">
                  {vendor.storeDescription || "Premium Fashion & Textile Marketplace"}
                </p>
              </div>
            </div>
          </div>

          {storeLocation ? (
            <p className="mt-2 truncate text-xs font-medium text-slate-500 dark:text-slate-400">{storeLocation}</p>
          ) : null}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <StoreMetric
              label={`${formatCount(vendor.totalReviews)} Reviews`}
              value={Number(vendor.rating || 0).toFixed(1)}
              icon={<Star className="h-4 w-4 fill-amber-400 text-amber-400" />}
            />
            <StoreMetric label="Followers" value={formatCount(vendor.followersCount, true)} />
            <StoreMetric label="Products" value={formatCount(vendor.productsCount)} />
            <StoreMetric label="Trust" value={vendor.verified ? "Verified" : "New"} />
          </div>

          <div className="mt-3 flex max-h-[72px] flex-wrap gap-1.5 overflow-hidden">
            {vendor.verified ? <StoreChip icon={<ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />}>Verified Store</StoreChip> : null}
            <StoreChip icon={<RotateCcw className="h-3.5 w-3.5" />}>Easy Returns</StoreChip>
            <StoreChip icon={<Truck className="h-3.5 w-3.5" />}>On-time Delivery</StoreChip>
            <StoreChip icon={<LockKeyhole className="h-3.5 w-3.5" />}>Secure Payments</StoreChip>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {isOwnStore ? (
              <Link
                to="/vendor/settings"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white dark:bg-white dark:text-slate-950"
              >
                <Edit3 className="h-4 w-4" />
                Edit
              </Link>
            ) : user?.role === "vendor" ? (
              <span />
            ) : (
              <button
                type="button"
                onClick={toggleFollow}
                disabled={busy}
                className="inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white disabled:opacity-60 dark:bg-white dark:text-slate-950"
              >
                {isFollowing ? "Following" : "Follow Store"}
              </button>
            )}
            <button
              type="button"
              onClick={shareStore}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
          </div>

          {dynamicInfo.length || vendor.storeCategories?.length ? (
            <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
              <summary className="cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-200">Store information</summary>
              <div className="mt-2 grid gap-2">
                {dynamicInfo.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={`${item.label}-${item.value}`} className="flex min-w-0 items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="shrink-0 font-semibold">{item.label}:</span>
                      <span className="truncate">{item.value}</span>
                    </div>
                  );
                })}
                {vendor.storeCategories?.length ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {vendor.storeCategories.map((category) => (
                      <span key={category} className="rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:ring-slate-800">
                        {category}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </details>
          ) : null}
        </div>

        <nav className="sticky top-0 z-20 flex max-w-full gap-2 overflow-x-auto border-t border-slate-100 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
          <NavLink to={`/vendor/${vendor.storeSlug}`} end className={mobileNavClass}>Store</NavLink>
          <NavLink to={`/vendor/${vendor.storeSlug}/products`} className={mobileNavClass}>Products</NavLink>
          <NavLink to={`/vendor/${vendor.storeSlug}/reviews`} className={mobileNavClass}>Reviews</NavLink>
          <NavLink to={`/vendor/${vendor.storeSlug}/followers`} className={mobileNavClass}>Followers</NavLink>
          <a href="#about-store" className="shrink-0 whitespace-nowrap rounded-full bg-white px-3 py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:ring-slate-800">About</a>
        </nav>
      </div>

      <div className="hidden md:block">
      <div className="relative h-44 overflow-hidden bg-slate-100 lg:h-52 dark:bg-slate-900">
        {banner ? (
          <img loading="lazy" decoding="async" src={banner} alt={`${vendor.vendorName} banner`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#f8fafc,#e5e7eb_52%,#f1f5f9)] dark:bg-[linear-gradient(135deg,#0f172a,#1e293b_52%,#111827)]">
            <Image className="h-20 w-20 text-slate-300 dark:text-slate-700" strokeWidth={1.25} />
          </div>
        )}
      </div>

      <div className="px-4 pb-4 sm:px-6 sm:pb-5">
        <div className="flex flex-col gap-4 pt-0 sm:pt-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:gap-4 sm:text-left">
            <div className="-mt-10 flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border-4 border-white bg-white text-center shadow-sm ring-1 ring-slate-200 dark:border-slate-950 dark:bg-slate-900 dark:ring-slate-800 sm:mt-0 sm:h-28 sm:w-28 sm:rounded-lg">
              {logo ? (
                <img loading="lazy" decoding="async" src={logo} alt={`${vendor.vendorName} logo`} className="h-full w-full object-contain p-2" />
              ) : (
                <div className="grid gap-1 text-slate-700 dark:text-slate-200">
                  <span className="text-xl font-semibold tracking-wide">{vendor.vendorName?.slice(0, 3) || "GRM"}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-400">Store</span>
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h1 className="min-w-0 text-2xl font-bold leading-tight text-slate-950 dark:text-white sm:text-3xl">{vendor.vendorName}</h1>
                {vendor.verified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-900">
                    <ShieldCheck className="h-3.5 w-3.5" /> Verified Store
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                {vendor.storeDescription || "Premium Fashion & Textile Marketplace"}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 sm:flex sm:flex-wrap sm:items-center sm:gap-y-2">
                <span className="inline-flex min-w-0 flex-col items-center gap-1 rounded-xl bg-slate-50 px-2 py-2 sm:flex-row sm:rounded-none sm:bg-transparent sm:py-0 sm:pr-4 dark:bg-slate-900 sm:dark:bg-transparent">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span>{Number(vendor.rating || 0).toFixed(1)}</span>
                  <span className="truncate text-xs font-medium sm:text-sm">({formatCount(vendor.totalReviews)} Reviews)</span>
                </span>
                <span className="rounded-xl bg-slate-50 px-2 py-2 text-center sm:border-l sm:border-slate-200 sm:bg-transparent sm:px-4 sm:py-0 dark:bg-slate-900 sm:dark:border-slate-800 sm:dark:bg-transparent">{formatCount(vendor.followersCount, true)}<span className="block text-xs font-medium sm:inline sm:text-sm"> Followers</span></span>
                <span className="rounded-xl bg-slate-50 px-2 py-2 text-center sm:border-l sm:border-slate-200 sm:bg-transparent sm:px-4 sm:py-0 dark:bg-slate-900 sm:dark:border-slate-800 sm:dark:bg-transparent">{formatCount(vendor.productsCount)}<span className="block text-xs font-medium sm:inline sm:text-sm"> Products</span></span>
              </div>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
                <span className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                  <RotateCcw className="h-4 w-4" /> Easy Returns
                </span>
                <span className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                  <Truck className="h-4 w-4" /> On-time Delivery
                </span>
                <span className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                  <LockKeyhole className="h-4 w-4" /> Secure Payments
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-start sm:gap-3 lg:justify-end lg:pt-3">
            {isOwnStore ? (
              <Link
                to="/vendor/settings"
                className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 sm:col-span-1 sm:min-w-32"
                title="Edit this store profile"
              >
                <Edit3 className="h-4 w-4" />
                Edit Profile
              </Link>
            ) : user?.role === "vendor" ? null : (
              <button
                type="button"
                onClick={toggleFollow}
                disabled={busy}
                className={`group col-span-1 inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-bold text-white shadow-sm transition disabled:opacity-60 sm:min-w-32 ${
                  isFollowing ? "bg-slate-950 hover:bg-rose-600 dark:bg-white dark:text-slate-950 dark:hover:bg-rose-600 dark:hover:text-white" : "bg-slate-950 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                }`}
              >
                {isFollowing ? (
                  <>
                    <span className="inline-flex items-center gap-1 group-hover:hidden">Following <Check className="h-4 w-4" /></span>
                    <span className="hidden group-hover:inline">Unfollow</span>
                  </>
                ) : (
                  "Follow Store"
                )}
              </button>
            )}
            <button
              type="button"
              onClick={shareStore}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:min-w-32"
              aria-label="Share profile"
              title="Share profile"
            >
              <Share2 className="h-4 w-4" />
              Share Profile
            </button>
          </div>
        </div>

        {dynamicInfo.length ? (
          <div className="mt-4 grid grid-cols-1 gap-2 border-t border-slate-100 pt-4 sm:flex sm:flex-wrap dark:border-slate-800">
            {dynamicInfo.map((item) => {
              const Icon = item.icon;
              return (
                <span key={`${item.label}-${item.value}`} className="inline-flex max-w-full items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 sm:py-1.5">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="shrink-0 text-slate-500 dark:text-slate-400">{item.label}:</span>
                  <span className="truncate">{item.value}</span>
                </span>
              );
            })}
          </div>
        ) : null}

        {vendor.storeCategories?.length ? (
          <div className={`${dynamicInfo.length ? "mt-3" : "mt-4 border-t border-slate-100 pt-4 dark:border-slate-800"} flex flex-wrap gap-2`}>
            {vendor.storeCategories.map((category) => (
              <span key={category} className="rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {category}
              </span>
            ))}
          </div>
        ) : null}

        <nav className="mt-4 -mx-4 flex gap-2 overflow-x-auto border-t border-slate-100 px-4 pt-4 dark:border-slate-800 sm:mx-0 sm:px-0">
          <NavLink to={`/vendor/${vendor.storeSlug}`} end className={navClass}>Store</NavLink>
          <NavLink to={`/vendor/${vendor.storeSlug}/products`} className={navClass}>Products</NavLink>
          <NavLink to={`/vendor/${vendor.storeSlug}/reviews`} className={navClass}>Reviews</NavLink>
          <NavLink to={`/vendor/${vendor.storeSlug}/followers`} className={navClass}>Followers</NavLink>
          <Link to="/cart" className="ml-auto hidden rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 sm:block">
            Marketplace Cart
          </Link>
        </nav>
        <Link to="/cart" className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 sm:hidden">
          Marketplace Cart
        </Link>
      </div>
      </div>
    </header>
  );
}
