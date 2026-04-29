import { BackButton } from "../components/BackButton";
import { PricingCategoriesManager } from "../components/admin/PricingCategoriesManager";

export function AdminPricingCategoriesPage() {
  return (
    <div className="grid min-w-0 max-w-full gap-4 sm:gap-6">
      <div className="flex items-center gap-3">
        <BackButton />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pricing Categories</h1>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="mb-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Create and manage pricing categories that organize your pricing rules. Categories help group related fees and charges
            together for better organization and management.
          </p>
        </div>

        <PricingCategoriesManager />
      </div>
    </div>
  );
}

export default AdminPricingCategoriesPage;
