import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Info, Search, Ticket } from "lucide-react";

export default function UserCouponsPage() {
  const [activeTab, setActiveTab] = useState("available");

  return (
    <div className="mx-auto max-w-5xl py-6">
      {/* Header section */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950 dark:text-white">My Coupons</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Here are all the coupons you can use on your orders.
          </p>
        </div>
        <div className="hidden sm:block">
          {/* Top-right decorative icon mimicking the image */}
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 dark:bg-indigo-900/20">
            <Ticket className="h-8 w-8 -rotate-12" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-100 text-[10px] text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300">✦</span>
          </div>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="mt-8 flex flex-col gap-4 border-b border-slate-200 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab("available")}
            className={`relative pb-4 text-sm font-semibold transition-colors ${
              activeTab === "available"
                ? "text-indigo-600"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            Available (0)
            {activeTab === "available" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-indigo-600" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("used")}
            className={`relative pb-4 text-sm font-semibold transition-colors ${
              activeTab === "used"
                ? "text-indigo-600"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            Used (0)
            {activeTab === "used" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-indigo-600" />
            )}
          </button>
        </div>

        <div className="flex gap-3 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search coupons..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm text-slate-950 outline-none transition focus:border-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-white sm:w-64"
            />
          </div>
          <div className="relative">
            <select className="h-10 appearance-none rounded-xl border border-slate-200 bg-white pl-4 pr-10 text-sm font-medium text-slate-950 outline-none transition focus:border-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-white">
              <option>All Coupons</option>
              <option>Expiring Soon</option>
              <option>Newest</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Empty State */}
      <div className="mt-8 flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-indigo-50/30 py-24 px-4 text-center dark:border-slate-800 dark:bg-slate-900/50">
        <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
          <Ticket className="h-12 w-12 -rotate-12" />
        </div>
        <h3 className="text-xl font-bold text-slate-950 dark:text-white">No coupons available</h3>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          There are currently no coupons available for you. Check back later for new offers and discounts.
        </p>
        <Link
          to="/shop"
          className="mt-8 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          Continue Shopping
        </Link>
      </div>

      {/* Info Banner */}
      <div className="mt-8 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
        <div>
          <h4 className="text-sm font-semibold text-slate-950 dark:text-white">How to use a coupon?</h4>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Copy the code and apply it on the checkout page to avail the discount.
          </p>
        </div>
      </div>
    </div>
  );
}
