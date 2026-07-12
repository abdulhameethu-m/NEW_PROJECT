import React from "react";
import { ProductCard } from "../ProductCard";

export default function CollectionGrid({ products, loading }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-3 pb-8">
      <div className="mt-3 grid grid-cols-2 gap-[10px] sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse h-44 rounded-lg bg-slate-100" />
            ))
          : products.map((product) => (
              <div key={product._id} className="w-full">
                <ProductCard product={product} cardStyle="MINIMAL" imageAspectClass="aspect-[3/4]" dense />
              </div>
            ))}
      </div>
    </main>
  );
}
