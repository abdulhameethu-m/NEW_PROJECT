import { Eye, GitCompare } from "lucide-react";
import { ProductCard } from "../ProductCard";

export function VendorProductGrid({ products = [], loading = false, emptyText = "No products found." }) {
  if (loading && !products.length) {
    return (
      <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index} className="aspect-square animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
    );
  }

  if (!products.length) {
    return <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-12 text-center text-sm text-slate-500 dark:border-slate-700">{emptyText}</div>;
  }

  return (
    <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {products.map((product) => (
        <div key={product._id} className="group relative min-w-0">
          <ProductCard product={product} imageAspectClass="aspect-square" dense />
        </div>
      ))}
    </div>
  );
}
