import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import CollectionHeader from "../components/collections/CollectionHeader";
import CollectionToolbar from "../components/collections/CollectionToolbar";
import CollectionGrid from "../components/collections/CollectionGrid";
import CollectionSkeleton from "../components/collections/CollectionSkeleton";
import EmptyState from "../components/collections/EmptyState";
import { getHomepageContainerProducts } from "../services/homepageContainerService";

function normalizeError(error) {
  return error?.response?.data?.message || error?.message || "Failed to load container products";
}

export function HomepageContainerProductsPage() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [container, setContainer] = useState(null);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ total: 0 });

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const response = await getHomepageContainerProducts(slug, { page: 1, limit: 24 });
        if (!alive) return;
        setContainer(response?.data?.container || null);
        setProducts(response?.data?.products || []);
        setPagination(response?.data?.pagination || { total: 0 });
      } catch (err) {
        if (alive) setError(normalizeError(err));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [slug]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <CollectionHeader
        title={container?.title || "Collection"}
        description={container?.description}
        count={pagination.total || 0}
        imageUrl={container?.image}
      />

      <CollectionToolbar count={pagination.total || 0} />

      {error ? (
        <div className="mx-auto w-full max-w-3xl px-3 py-4">
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
            {error}
          </div>
        </div>
      ) : null}

      {loading ? (
        <CollectionSkeleton />
      ) : products.length ? (
        <>
          <CollectionGrid products={products} loading={loading} />
          <div className="mx-auto w-full max-w-3xl px-3 text-sm text-slate-500 dark:text-slate-400">Showing {products.length} of {pagination.total} matched products.</div>
        </>
      ) : (
        <EmptyState title="No products matched this collection right now." />
      )}
    </div>
  );
}
