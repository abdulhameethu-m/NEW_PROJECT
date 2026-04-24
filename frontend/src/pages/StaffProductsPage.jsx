import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deleteProduct, getProductStats, listProducts } from "../services/adminApi";
import { useStaffPermission } from "../hooks/useStaffAuth";

function normalizeError(error) {
  return error?.response?.data?.message || error?.message || "Request failed";
}

export function StaffProductsPage() {
  const { hasPermission } = useStaffPermission();
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const canCreateProducts = hasPermission("products.create");
  const canUpdateProducts = hasPermission("products.update");
  const canDeleteProducts = hasPermission("products.delete");

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      setLoading(true);
      setError("");
      try {
        const [productsResponse, statsResponse] = await Promise.all([
          listProducts({ page: 1, limit: 40, ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}) }),
          getProductStats(),
        ]);

        if (active) {
          setProducts(productsResponse.data?.products || []);
          setStats(statsResponse.data?.countByStatus || []);
        }
      } catch (err) {
        if (active) setError(normalizeError(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProducts();

    return () => {
      active = false;
    };
  }, [searchTerm]);

  async function handleDelete(productId) {
    if (!window.confirm("Delete this product?")) return;
    setBusyId(productId);
    setError("");
    try {
      await deleteProduct(productId);
      setProducts((current) => current.filter((product) => product._id !== productId));
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="mt-1 text-slate-600">Catalog operations and moderation visibility based on product permissions.</p>
        </div>
        <div className="flex items-center gap-3">
          {canCreateProducts ? (
            <Link
              to="/staff/products/create"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <PlusIcon className="h-4 w-4" />
              Create Product
            </Link>
          ) : null}
          <div className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
            {products.length} product{products.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      {stats.length ? (
        <div className="grid gap-4 md:grid-cols-3">
          {stats.map((item) => (
            <div key={item._id} className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{item._id}</div>
              <div className="mt-2 text-3xl font-semibold text-slate-950">{item.count}</div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="relative flex-1">
        <SearchIcon className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search products"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="w-full rounded-[1.25rem] border border-slate-200 py-3 pl-10 pr-4 text-sm"
        />
      </div>

      {error ? (
        <div className="rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="grid gap-3 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : products.length ? (
          <div className="divide-y divide-slate-200">
            {products.map((product) => (
              <div key={product._id} className="grid gap-4 px-4 py-4 lg:grid-cols-[1.5fr_1fr_.8fr_.7fr_auto] lg:items-center lg:px-5">
                <div>
                  <div className="font-semibold text-slate-950">{product.name}</div>
                  <div className="mt-1 text-xs text-slate-500">{product.SKU || product._id}</div>
                </div>
                <div className="text-sm text-slate-600">{product.category || "Uncategorized"}</div>
                <div className="font-semibold text-slate-950">${Number(product.price || 0).toFixed(2)}</div>
                <div className="text-sm text-slate-600">{product.stock} in stock</div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {product.status}
                  </span>
                  {canUpdateProducts ? (
                    <Link
                      to={`/staff/products/${product._id}/edit`}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <EditIcon className="h-3.5 w-3.5" />
                      Edit
                    </Link>
                  ) : null}
                  {canDeleteProducts ? (
                    <button
                      type="button"
                      disabled={busyId === product._id}
                      onClick={() => handleDelete(product._id)}
                      className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-12 text-center text-sm text-slate-500">No products found.</div>
        )}
      </div>
    </div>
  );
}

function IconBase({ className = "h-4 w-4", children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function SearchIcon({ className = "h-4 w-4" }) {
  return (
    <IconBase className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </IconBase>
  );
}

function TrashIcon({ className = "h-4 w-4" }) {
  return (
    <IconBase className={className}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 10v6" />
      <path d="M14 10v6" />
    </IconBase>
  );
}

function PlusIcon({ className = "h-4 w-4" }) {
  return (
    <IconBase className={className}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </IconBase>
  );
}

function EditIcon({ className = "h-4 w-4" }) {
  return (
    <IconBase className={className}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </IconBase>
  );
}
