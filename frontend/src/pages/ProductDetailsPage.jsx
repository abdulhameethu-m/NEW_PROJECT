import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import { ProductImageGallery } from "../components/ProductImageGallery";
import { ProductReviewsSection } from "../components/ProductReviewsSection";
import { RecommendationSection } from "../components/RecommendationSection";
import * as productService from "../services/productService";
import { getAttributes } from "../services/attributeService";
import { getProductModules } from "../services/productModuleService";
import {
  getFeaturedRecommendations,
  getFrequentlyBoughtRecommendations,
  getRelatedRecommendations,
  getTrendingRecommendations,
  trackGuestRecentlyViewed,
  trackRecentlyViewed,
} from "../services/recommendationService";
import { useAuthStore } from "../context/authStore";
import { formatCurrency } from "../utils/formatCurrency";
import { getDefaultVariant, getVariantGroups } from "../utils/productVariants";
import { saveRedirectAfterLogin } from "../utils/loginRedirect";
import { getFormattedWeight } from "../utils/weight";
import { loadTrackingContext, saveTrackingContext } from "../utils/influencerTracking";
import { loadProductPreview, saveProductPreview } from "../utils/productPreviewCache";
import { useCart } from "../hooks/useCart";
import { useCartDrawer } from "../hooks/useCartDrawer";
import { useWishlist } from "../hooks/useWishlist";
import pendingActionManager from "../utils/pendingActionManager";
import { getCartErrorMessage } from "../utils/cartErrors";
import { SellerCard, SellerNameLink, StoreRatingDisplay } from "../components/seller/SellerNavigation";
import { clickTracking, trackAffiliateEvent } from "../services/influencerCommerceService";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { DesktopProductLayout } from "./DesktopProductLayout";
import { MobileProductLayout } from "./MobileProductLayout";

const RECOMMENDATION_CONTAINER_LIMIT = 20;

function unwrapRecommendationItems(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data?.data?.products)) return response.data.data.products;
  if (Array.isArray(response?.data?.products)) return response.data.products;
  if (Array.isArray(response?.products)) return response.products;
  return [];
}

function withRecommendationTimeout(promise, fallback, ms = 6000) {
  return Promise.race([
    promise.catch(() => fallback),
    new Promise((resolve) => window.setTimeout(() => resolve(fallback), ms)),
  ]);
}

function buildVariantMatch(variants = [], selectedAttributes = {}) {
  return (
    variants.find((variant) =>
      Object.entries(selectedAttributes).every(([key, value]) => variant?.attributes?.[key] === value)
    ) || null
  );
}

function formatFieldValue(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value ?? "");
}

function flattenAttributeGroups(groups = {}) {
  return Object.values(groups).flatMap((fields) => (Array.isArray(fields) ? fields : []));
}

function sortDefinitions(defs = []) {
  return [...defs].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
}

function buildModuleSections(groups = {}, modules = []) {
  const moduleByKey = new Map((modules || []).map((moduleDef) => [moduleDef.key, moduleDef]));
  return Object.entries(groups)
    .map(([moduleKey, fields]) => ({
      key: moduleKey,
      name: moduleByKey.get(moduleKey)?.name || fields?.[0]?.group || moduleKey,
      order: moduleByKey.get(moduleKey)?.order ?? 999,
      fields: sortDefinitions(fields || []),
    }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
}

function buildModulesData(product, moduleSections = []) {
  const explicitModulesData = product?.modulesData || product?.extraDetails;
  if (explicitModulesData && Object.keys(explicitModulesData).length) return explicitModulesData;

  const next = {};
  for (const section of moduleSections) {
    for (const field of section.fields.filter((item) => !item.isVariant)) {
      const value = product?.attributes?.[field.key];
      if (value === undefined || value === null || value === "") continue;
      next[section.key] = {
        ...(next[section.key] || {}),
        [field.key]: value,
      };
    }
  }
  return next;
}

function resolveSwatchColor(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.startsWith("#")) return normalized;

  const swatchMap = {
    black: "#111827",
    white: "#f8fafc",
    red: "#dc2626",
    blue: "#2563eb",
    green: "#16a34a",
    yellow: "#facc15",
    orange: "#f97316",
    purple: "#7c3aed",
    violet: "#8b5cf6",
    pink: "#ec4899",
    gray: "#6b7280",
    grey: "#6b7280",
    silver: "#cbd5e1",
    gold: "#d4af37",
    navy: "#1e3a8a",
    brown: "#92400e",
    beige: "#d6d3d1",
    cream: "#f5f5dc",
    maroon: "#7f1d1d",
    teal: "#0f766e",
  };

  return swatchMap[normalized] || null;
}

function isVisualSwatchGroup(group, displayType) {
  const key = String(group?.key || "").toLowerCase();
  const name = String(group?.name || "").toLowerCase();
  return displayType === "swatch" || displayType === "image-swatch" || key.includes("color") || name.includes("color");
}

export function ProductDetailsPage() {
  const { productId } = useParams();
  const isMobile = useMediaQuery("(max-width: 1023px)");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { addItem: addCartItem } = useCart();
  const { openDrawer } = useCartDrawer();
  const {
    addItem: addWishlistItem,
    removeItem: removeWishlistItem,
    isInWishlist,
  } = useWishlist();
  const initialProduct = loadProductPreview(productId);
  const [loading, setLoading] = useState(!initialProduct);
  const [error, setError] = useState("");
  const [product, setProduct] = useState(initialProduct);
  const [adding, setAdding] = useState(false);
  const [wishlistSaved, setWishlistSaved] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("description");
  const [attributeDefs, setAttributeDefs] = useState([]);
  const [attributeGroups, setAttributeGroups] = useState({});
  const [productModules, setProductModules] = useState([]);
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [recommendations, setRecommendations] = useState(null);
  const [fbtBundle, setFbtBundle] = useState(null);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const trackedProductViewRef = useRef("");

  async function ensureCurrentTrackingContext() {
    const trackingContext = loadTrackingContext();
    if (trackingContext?.trackingToken && String(trackingContext.productId || "") === String(productId || "")) {
      return trackingContext;
    }

    const trackingCode = searchParams.get("ref") || searchParams.get("trackingCode") || "";
    const reelId = searchParams.get("reel") || "";
    if (!trackingCode && !reelId) return trackingContext;

    const anonymousId =
      searchParams.get("anonymousId") ||
      (typeof window !== "undefined" ? window.localStorage.getItem("anonInfluencerId") || "" : "");

    try {
      const response = await clickTracking({
        trackingCode,
        reelId,
        productId,
        anonymousId,
        surface: trackingCode ? "affiliate_link" : "product_detail",
      });
      const payload = response?.data || response || {};
      if (payload.anonymousId && typeof window !== "undefined") {
        window.localStorage.setItem("anonInfluencerId", payload.anonymousId);
      }
      if (payload.trackingToken) {
        const nextContext = {
          trackingToken: payload.trackingToken,
          anonymousId: payload.anonymousId || anonymousId,
          productId,
          reelId,
          trackingCode,
          campaignId: payload.session?.campaignId || "",
          influencerId: payload.session?.influencerId || "",
          affiliateLinkId: payload.session?.affiliateLinkId || "",
          clickId: payload.session?._id || "",
        };
        saveTrackingContext(nextContext);
        return nextContext;
      }
    } catch {
      return trackingContext;
    }

    return trackingContext;
  }

  async function trackCurrentAffiliateEvent(eventType, metadata = {}) {
    const trackingContext = await ensureCurrentTrackingContext();
    if (!trackingContext?.trackingToken || String(trackingContext.productId || "") !== String(productId || "")) return Promise.resolve(null);
    return trackAffiliateEvent({
      trackingToken: trackingContext.trackingToken,
      anonymousId: trackingContext.anonymousId || "",
      eventType,
      metadata: { productId, ...metadata },
    }).catch(() => null);
  }

  useEffect(() => {
    const trackingContext = loadTrackingContext();
    const reelId = searchParams.get("reel");
    const trackingToken = searchParams.get("trackingToken");
    const anonymousId = searchParams.get("anonymousId");
    // A reel/reference is source metadata, not a signed tracking token. Do
    // not carry a token from another product into this product's cart add.
    if (trackingToken || trackingContext?.productId === productId) {
      saveTrackingContext({
        ...trackingContext,
        trackingToken: trackingToken || trackingContext?.trackingToken,
        anonymousId: anonymousId || trackingContext?.anonymousId,
        productId,
        reelId: reelId || trackingContext?.reelId,
      });
    }
  }, [productId, searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      const previewProduct = loadProductPreview(productId);
      if (previewProduct) {
        setProduct(previewProduct);
        setSelectedAttributes(getDefaultVariant(previewProduct)?.attributes || {});
        setLoading(false);
      } else {
        setProduct(null);
        setLoading(true);
      }
      setError("");
      try {
        const response = await productService.getProductById(productId);
        const nextProduct = response?.data;

        if (!nextProduct || nextProduct.status !== "APPROVED" || nextProduct.isActive !== true) {
          throw new Error("NOT_PUBLIC");
        }

        if (!cancelled) {
          setProduct(nextProduct);
          saveProductPreview(nextProduct);
          const defaultVariant = getDefaultVariant(nextProduct);
          setSelectedAttributes(defaultVariant?.attributes || {});
          const trackingContext = loadTrackingContext();
          if (trackingContext?.trackingToken && String(trackingContext.productId || "") === String(productId) && trackedProductViewRef.current !== `${productId}:${trackingContext.trackingToken}`) {
            trackedProductViewRef.current = `${productId}:${trackingContext.trackingToken}`;
            trackAffiliateEvent({
              trackingToken: trackingContext.trackingToken,
              anonymousId: trackingContext.anonymousId || "",
              eventType: "product_view",
              metadata: { productId },
            }).catch(() => null);
          }
        }
      } catch (err) {
        if (!cancelled) {
          const previewProduct = loadProductPreview(productId);
          if (err?.message === "NOT_PUBLIC" || !previewProduct) {
            setProduct(null);
            setError(err?.message === "NOT_PUBLIC" ? "Product not available" : "Failed to load product");
          } else {
            setProduct(previewProduct);
            setError("");
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (productId) loadProduct();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  useEffect(() => {
    let cancelled = false;
    async function loadWishlistStatus() {
      if (!productId) {
        setWishlistSaved(false);
        return;
      }
      try {
        const saved = await isInWishlist(productId);
        if (!cancelled) setWishlistSaved(Boolean(saved));
      } catch {
        if (!cancelled) setWishlistSaved(false);
      }
    }
    loadWishlistStatus();
    return () => {
      cancelled = true;
    };
  }, [productId, isInWishlist]);

  useEffect(() => {
    let cancelled = false;
    async function loadCatalogMeta() {
      if (!product?.categoryId || !product?.subCategoryId) {
        setAttributeDefs([]);
        return;
      }
      try {
        const [attributeRes, moduleRes] = await Promise.all([
          getAttributes({
            categoryId: product.categoryId?._id || product.categoryId,
            subCategoryId: product.subCategoryId?._id || product.subCategoryId,
          }),
          getProductModules(),
        ]);
        if (!cancelled) {
          const groupedDefs = attributeRes?.data && typeof attributeRes.data === "object" ? attributeRes.data : {};
          setAttributeGroups(groupedDefs);
          setAttributeDefs(flattenAttributeGroups(groupedDefs));
          setProductModules(Array.isArray(moduleRes?.data) ? moduleRes.data : []);
        }
      } catch {
        if (!cancelled) {
          setAttributeGroups({});
          setAttributeDefs([]);
          setProductModules([]);
        }
      }
    }
    loadCatalogMeta();
    return () => {
      cancelled = true;
    };
  }, [product?.categoryId, product?.subCategoryId]);

  useEffect(() => {
    let cancelled = false;
    async function loadRecommendations() {
      if (!productId) {
        setRecommendations(null);
        setFbtBundle(null);
        setRecommendationsLoading(false);
        return;
      }
      setRecommendationsLoading(true);
      try {
        const publicFallback = productService.getPublicProducts({
          page: 1,
          limit: RECOMMENDATION_CONTAINER_LIMIT + 1,
          ...(product?.categoryId ? { categoryId: product.categoryId?._id || product.categoryId } : {}),
        });
        const [fbtResponse, featuredResponse, trendingResponse, relatedResponse, fallbackResponse] = await Promise.all([
          withRecommendationTimeout(getFrequentlyBoughtRecommendations(productId, { limit: RECOMMENDATION_CONTAINER_LIMIT }), { data: { items: [] } }),
          withRecommendationTimeout(getFeaturedRecommendations({ limit: RECOMMENDATION_CONTAINER_LIMIT }), { data: { items: [] } }),
          withRecommendationTimeout(getTrendingRecommendations({ limit: RECOMMENDATION_CONTAINER_LIMIT }), { data: { items: [] } }),
          withRecommendationTimeout(getRelatedRecommendations(productId, { limit: RECOMMENDATION_CONTAINER_LIMIT }), { data: { items: [] } }),
          withRecommendationTimeout(publicFallback, { data: { products: [] } }),
        ]);
        if (!cancelled) {
          const fallbackItems = unwrapRecommendationItems(fallbackResponse)
            .filter((item) => String(item?._id) !== String(productId))
            .slice(0, RECOMMENDATION_CONTAINER_LIMIT);
          const featured = unwrapRecommendationItems(featuredResponse);
          const trending = unwrapRecommendationItems(trendingResponse);
          const related = unwrapRecommendationItems(relatedResponse);
          const fbtItems = unwrapRecommendationItems(fbtResponse);
          setRecommendations({
            featured: featured.length ? featured : fallbackItems,
            trending: trending.length ? trending : fallbackItems,
            related: related.length ? related : fallbackItems,
          });
          setFbtBundle(fbtItems.length ? fbtItems : fallbackItems);
        }
      } catch {
        if (!cancelled) {
          setRecommendations(null);
          setFbtBundle(null);
        }
      } finally {
        if (!cancelled) setRecommendationsLoading(false);
      }
    }
    loadRecommendations();
    return () => {
      cancelled = true;
    };
  }, [product?.categoryId, productId]);

  useEffect(() => {
    if (!product?._id) return;
    if (isAuthenticated) {
      trackRecentlyViewed(product._id).catch(() => {});
      return;
    }
    trackGuestRecentlyViewed(product);
  }, [isAuthenticated, product]);

  const variants = useMemo(
    () => (Array.isArray(product?.variants) ? product.variants.filter((item) => item?.isActive !== false) : []),
    [product]
  );
  const activeVariant = useMemo(() => {
    if (!variants.length) return null;
    return buildVariantMatch(variants, selectedAttributes) || getDefaultVariant(product);
  }, [variants, selectedAttributes, product]);
  const variantGroups = useMemo(() => getVariantGroups(product), [product]);
  const variantDefsByKey = useMemo(
    () => Object.fromEntries(attributeDefs.filter((item) => item.isVariant).map((item) => [item.key, item])),
    [attributeDefs]
  );
  const moduleSections = useMemo(
    () => buildModuleSections(attributeGroups, productModules),
    [attributeGroups, productModules]
  );

  const media = useMemo(() => {
    const variantImages = Array.isArray(activeVariant?.images) ? activeVariant.images : [];
    const productImages = Array.isArray(product?.images) ? product.images : [];

    const mergedImages = [];
    const seenUrls = new Set();

    for (const image of [...variantImages, ...productImages]) {
      const url = String(image?.url || "").trim();
      if (!url || seenUrls.has(url)) continue;
      seenUrls.add(url);
      mergedImages.push(image);
    }

    return mergedImages
      .map((image, index) => ({
        type: "image",
        url: image?.url || "",
        altText: image?.altText || product?.name || "Product image",
        sortOrder: Number.isFinite(Number(image?.sortOrder)) ? Number(image.sortOrder) : index,
      }))
      .filter((image) => image.url);
  }, [activeVariant, product]);

  const galleryKey = useMemo(() => {
    if (activeVariant?.variantId) {
      return `${activeVariant.variantId}:${media.map((item) => item.url).join("|")}`;
    }
    return `generic:${media.map((item) => item.url).join("|")}`;
  }, [activeVariant?.variantId, media]);

  const pricing = useMemo(() => {
    const price = Number(activeVariant?.price ?? product?.price ?? 0);
    const salePrice = Number(activeVariant?.discountPrice ?? product?.discountPrice ?? price);
    const hasDiscount = salePrice > 0 && price > salePrice;
    return {
      price,
      salePrice,
      hasDiscount,
      discountPercent: hasDiscount ? Math.round(((price - salePrice) / price) * 100) : 0,
      amountSaved: hasDiscount ? price - salePrice : 0,
    };
  }, [activeVariant, product]);

  const visibleFbtBundle = useMemo(() => {
    return Array.isArray(fbtBundle) ? fbtBundle : [];
  }, [fbtBundle]);

  const stock = Number(activeVariant?.stock ?? product?.stock ?? 0);
  const productWeightLabel = useMemo(() => getFormattedWeight(product), [product]);
  const moduleTabs = useMemo(() => {
    const details = buildModulesData(product, moduleSections);
    return moduleSections
      .map((section) => ({
        key: section.key,
        label: section.name,
        fields: section.fields.filter((field) => !field.isVariant),
        values: details?.[section.key] || {},
      }))
      .filter((section) =>
        section.fields.some((field) => section.values?.[field.key] !== undefined && section.values?.[field.key] !== "")
      );
  }, [product, moduleSections]);

  const tabs = useMemo(
    () => [
      { key: "description", label: "Description" },
      ...moduleTabs.map((tab) => ({ key: tab.key, label: tab.label })),
    ],
    [moduleTabs]
  );

  useEffect(() => {
    if (!tabs.some((tab) => tab.key === activeTab)) {
      setActiveTab("description");
    }
  }, [activeTab, tabs]);

  async function handleAddToCart(redirectTo = null) {
    if (adding) return;
    setAdding(true);
    setError("");
    try {
      const quantity = 1;
      const variantId = activeVariant?.variantId || "";
      await ensureCurrentTrackingContext();

      if (!isAuthenticated && redirectTo === "/checkout") {
        const added = await addCartItem(product._id, quantity, variantId);
        if (added) {
          await trackCurrentAffiliateEvent("add_to_cart", { variantId, quantity, buyNow: true });
          pendingActionManager.initiateGuestBuyNow(product._id, quantity, variantId);
          saveRedirectAfterLogin(`${window.location.origin}/checkout`);
          navigate("/login", { state: { from: { pathname: "/checkout" } } });
        }
        return;
      }

      const added = await addCartItem(product._id, quantity, variantId);
      if (!added) {
        return;
      }
      await trackCurrentAffiliateEvent("add_to_cart", { variantId, quantity });

      if (!redirectTo) {
        openDrawer(product, activeVariant, quantity);
      } else if (redirectTo === "/checkout") {
        navigate(redirectTo);
      }
    } catch (err) {
      setError(getCartErrorMessage(err, "Failed to add to cart"));
    } finally {
      setAdding(false);
    }
  }

  async function handleWishlistToggle() {
    const previousState = wishlistSaved;
    setWishlistSaved(!previousState);
    setError("");
    try {
      if (previousState) {
        await removeWishlistItem(product._id);
      } else {
        await addWishlistItem(
          product._id,
          activeVariant?.variantId || "",
          selectedAttributes
        );
        await trackCurrentAffiliateEvent("wishlist", { variantId: activeVariant?.variantId || "" });
      }
    } catch (err) {
      setWishlistSaved(previousState);
      setError(err?.response?.data?.message || "Failed to update wishlist");
    }
  }

  function selectVariantValue(groupKey, value) {
    const nextSelection = { ...selectedAttributes, [groupKey]: value };
    const exact = buildVariantMatch(variants, nextSelection);
    if (exact) {
      setSelectedAttributes(exact.attributes || {});
      return;
    }

    const fallback = variants.find((variant) =>
      variant?.attributes?.[groupKey] === value &&
      Object.entries(nextSelection).every(([key, currentValue]) =>
        key === groupKey ? true : !currentValue || variant?.attributes?.[key] === currentValue
      )
    );
    if (fallback) {
      setSelectedAttributes(fallback.attributes || {});
    }
  }

  const viewProps = {
    loading, error, product, media, galleryKey, stock, pricing, activeVariant, productWeightLabel,
    variantGroups, selectedAttributes, variants, variantDefsByKey, selectVariantValue,
    tabs, activeTab, setActiveTab, moduleTabs, adding, handleAddToCart, handleWishlistToggle,
    wishlistLoading, wishlistSaved, visibleFbtBundle, recommendations, recommendationsLoading
  };

  if (isMobile) {
    return <MobileProductLayout {...viewProps} />;
  }

  return <DesktopProductLayout {...viewProps} />;
}
