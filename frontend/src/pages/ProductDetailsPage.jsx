import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import { ProductImage } from "../components/ProductImage";
import * as cartService from "../services/cartService";
import * as productService from "../services/productService";
import * as wishlistService from "../services/wishlistService";
import { useAuthStore } from "../context/authStore";
import { formatCurrency } from "../utils/formatCurrency";
import {
  getProductHighlights,
  getProductMedia,
  getProductPricing,
  getProductSpecifications,
} from "../utils/checkout";
import { saveRedirectAfterLogin } from "../utils/loginRedirect";

const PRODUCT_TABS = [
  { key: "description", label: "Description" },
  { key: "specs", label: "Specifications" },
  { key: "warranty", label: "Warranty" },
];

export function ProductDetailsPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [product, setProduct] = useState(null);
  const [adding, setAdding] = useState(false);
  const [wishlistSaved, setWishlistSaved] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("description");

  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      setLoading(true);
      setError("");
      try {
        const response = await productService.getProductById(productId);
        const nextProduct = response?.data;

        if (!nextProduct || nextProduct.status !== "APPROVED" || nextProduct.isActive !== true) {
          throw new Error("NOT_PUBLIC");
        }

        if (!cancelled) {
          setProduct(nextProduct);
        }
      } catch (err) {
        if (!cancelled) {
          setProduct(null);
          setError(err?.message === "NOT_PUBLIC" ? "Product not available" : "Failed to load product");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (productId) {
      loadProduct();
    }

    return () => {
      cancelled = true;
    };
  }, [productId]);

  useEffect(() => {
    let cancelled = false;

    async function loadWishlistStatus() {
      if (!token || !productId) {
        setWishlistSaved(false);
        return;
      }

      try {
        const response = await wishlistService.getWishlistStatus(productId);
        if (!cancelled) {
          setWishlistSaved(Boolean(response?.data?.saved));
        }
      } catch {
        if (!cancelled) {
          setWishlistSaved(false);
        }
      }
    }

    loadWishlistStatus();
    return () => {
      cancelled = true;
    };
  }, [productId, token]);

  const media = useMemo(() => getProductMedia(product), [product]);
  const pricing = useMemo(() => getProductPricing(product), [product]);
  const highlights = useMemo(() => getProductHighlights(product), [product]);
  const specifications = useMemo(() => getProductSpecifications(product), [product]);

  async function handleAddToCart(redirectTo = "/cart") {
    if (!token) {
      saveRedirectAfterLogin(window.location.href);
      navigate("/login");
      return;
    }

    setAdding(true);
    setError("");
    try {
      await cartService.addToCart(product._id, 1);
      navigate(redirectTo);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to add to cart");
    } finally {
      setAdding(false);
    }
  }

  async function handleWishlistToggle() {
    if (!token) {
      saveRedirectAfterLogin(window.location.href);
      navigate("/login");
      return;
    }

    setWishlistLoading(true);
    setError("");
    try {
      if (wishlistSaved) {
        await wishlistService.removeFromWishlist(product._id);
        setWishlistSaved(false);
      } else {
        await wishlistService.addToWishlist(product._id);
        setWishlistSaved(true);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update wishlist");
    } finally {
      setWishlistLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="h-6 w-40 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
          <div className="h-10 w-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-3">
            <div className="aspect-[1.05] animate-pulse rounded-[2rem] bg-slate-200 dark:bg-slate-800" />
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="aspect-square animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="h-7 w-3/4 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-1/3 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
            <div className="h-36 w-full animate-pulse rounded-[2rem] bg-slate-200 dark:bg-slate-800" />
            <div className="h-72 w-full animate-pulse rounded-[2rem] bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Product</h1>
          <BackButton fallbackTo="/shop" />
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          {error}
        </div>
        <Link
          to="/shop"
          className="inline-flex rounded-lg bg-[color:var(--commerce-accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Home / Shop / <span className="text-slate-700 dark:text-slate-200">{product.category}</span>
          </div>
          <h1 className="mt-2 max-w-4xl text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            {product.name}
          </h1>
        </div>
        <BackButton fallbackTo="/shop" />
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.95fr)]">
        <div className="space-y-8">
          <ProductImage media={media} productName={product?.name} />

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Product highlights</div>
                <h2 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">Why shoppers choose this item</h2>
              </div>
              <div className="hidden rounded-full bg-[color:var(--commerce-accent-soft)] px-4 py-2 text-sm font-semibold text-[color:var(--commerce-accent)] sm:block">
                Quick facts
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {highlights.map((highlight, index) => (
                <div key={`${highlight}-${index}`} className="flex gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[color:var(--commerce-accent)] shadow-sm dark:bg-slate-900">
                    {["*", "!", "+", "<>", "#"][index % 5]}
                  </div>
                  <div className="text-sm leading-6 text-slate-700 dark:text-slate-200">{highlight}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center gap-3">
              {PRODUCT_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    activeTab === tab.key
                      ? "bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="mt-6">
              {activeTab === "description" ? (
                <div className="space-y-4 text-sm leading-7 text-slate-700 dark:text-slate-200">
                  <p>{product.description}</p>
                  {product.shortDescription ? <p className="text-slate-500 dark:text-slate-400">{product.shortDescription}</p> : null}
                </div>
              ) : null}

              {activeTab === "specs" ? (
                specifications.length ? (
                  <div className="grid gap-3">
                    {specifications.map(([label, value]) => (
                      <div
                        key={`${label}-${value}`}
                        className="grid gap-1 rounded-2xl border border-slate-200 p-4 text-sm dark:border-slate-800 sm:grid-cols-[180px_minmax(0,1fr)]"
                      >
                        <div className="font-semibold text-slate-950 dark:text-white">{label}</div>
                        <div className="text-slate-600 dark:text-slate-300">{value}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                    Detailed specifications will appear here as the catalog data grows.
                  </div>
                )
              ) : null}

              {activeTab === "warranty" ? (
                <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm leading-7 text-slate-700 dark:bg-slate-950 dark:text-slate-200">
                  {product.warranty || "Standard seller warranty applies. Contact support from your orders page for claim assistance."}
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <aside className="xl:sticky xl:top-24 xl:self-start">
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 bg-[linear-gradient(135deg,_rgba(14,165,233,0.14),_rgba(251,191,36,0.12))] p-6 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  {product.category}
                </span>
                {product.stock > 0 ? (
                  <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">In stock</span>
                ) : (
                  <span className="rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold text-white">Out of stock</span>
                )}
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="text-4xl font-black tracking-tight text-slate-950 dark:text-white">
                    {formatCurrency(pricing.salePrice)}
                  </div>
                  {pricing.hasDiscount ? (
                    <div className="pb-1 text-lg text-slate-500 line-through dark:text-slate-400">
                      {formatCurrency(pricing.price)}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {pricing.hasDiscount ? (
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                      You save {formatCurrency(pricing.amountSaved)}
                    </span>
                  ) : null}
                  {product?.ratings?.averageRating > 0 ? (
                    <span className="rounded-full bg-slate-950 px-3 py-1 font-semibold text-white dark:bg-slate-100 dark:text-slate-950">
                      {`Rating ${Number(product.ratings.averageRating).toFixed(1)} | ${product.ratings.totalReviews} reviews`}
                    </span>
                  ) : (
                    <span className="text-slate-600 dark:text-slate-300">Be the first to review this product.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-5 p-6">
              <div className="grid gap-3 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-[color:var(--commerce-accent)]">+</span>
                  <span>Secure checkout, backend price validation, and live stock confirmation before order placement.</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-[color:var(--commerce-accent)]">&lt;&gt;</span>
                  <span>{product.returnPolicy || "Easy replacement support available from your order dashboard."}</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-[color:var(--commerce-accent)]">!</span>
                  <span>Optimized mobile checkout flow with saved address selection and Razorpay support.</span>
                </div>
              </div>

              <div className="grid gap-3">
                <button
                  type="button"
                  disabled={product.stock === 0 || adding}
                  onClick={() => handleAddToCart("/cart")}
                  className="rounded-2xl bg-[color:var(--commerce-accent)] px-5 py-4 text-sm font-semibold text-white shadow-sm transition hover:translate-y-[-1px] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {adding ? "Adding to cart..." : "Add to Cart"}
                </button>
                <button
                  type="button"
                  disabled={product.stock === 0 || adding}
                  onClick={() => handleAddToCart("/checkout")}
                  className="rounded-2xl bg-[color:var(--commerce-accent-warm)] px-5 py-4 text-sm font-semibold text-slate-950 shadow-sm transition hover:translate-y-[-1px] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Buy Now
                </button>
                <button
                  type="button"
                  disabled={wishlistLoading}
                  onClick={handleWishlistToggle}
                  className="rounded-2xl border border-slate-300 bg-white px-5 py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {wishlistLoading ? "Updating..." : wishlistSaved ? "Saved to Wishlist" : "Save to Wishlist"}
                </button>
              </div>

              <div className="rounded-[1.5rem] bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                <div className="font-semibold text-slate-950 dark:text-white">Seller confidence</div>
                <div className="mt-2 grid gap-2">
                  <div>SKU: {product.SKU}</div>
                  <div>{product.stock > 0 ? `${product.stock} units ready to dispatch.` : "Restock pending."}</div>
                  <div>Category: {product.category}</div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
