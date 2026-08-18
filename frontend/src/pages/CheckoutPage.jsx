import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ShoppingCart, ShoppingBag } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AddressModal } from "../components/AddressModal";
import { BackButton } from "../components/BackButton";
import { AddressCard } from "../components/commerce/AddressCard";
import { CheckoutStepper } from "../components/commerce/CheckoutStepper";
import { InlineToast } from "../components/commerce/InlineToast";
import { OrderSummaryCard } from "../components/commerce/OrderSummaryCard";
import { PriceBreakdown } from "../components/commerce/PriceBreakdown";
import { RecommendationSection } from "../components/RecommendationSection";
import { FbtBundleSection } from "../components/FbtBundleSection";
import { useAuthStore } from "../context/authStore";
import useAuthCartStore from "../context/authCartStore";
import { useCart } from "../hooks/useCart";
import * as checkoutService from "../services/checkoutService";
import * as paymentService from "../services/paymentService";
import * as pricingService from "../services/pricingService";
import { trackAffiliateEvent } from "../services/influencerCommerceService";
import { getCheckoutRecommendations, getFbtRecommendations } from "../services/recommendationService";
import * as userService from "../services/userService";
import { emitCartChanged, extractProductId, extractVariantId, getCartItemKey } from "../utils/cartState";
import { formatCurrency } from "../utils/formatCurrency";
import {
  EMPTY_ADDRESS_FORM,
  buildPriceBreakdown,
  getAddressFormFromSavedAddress,
  getDefaultAddress,
  getShippingAddressFromForm,
  getShippingAddressFromSavedAddress,
  getSummaryItems,
} from "../utils/checkout";
import { loadTrackingContext } from "../utils/influencerTracking";
import { saveRedirectAfterLogin } from "../utils/loginRedirect";
import pendingCheckoutManager from "../utils/pendingCheckoutManager";
import {
  clearStaleRazorpayCheckoutState,
  inspectRazorpayCheckout,
  isRazorpayInspectorEnabled,
} from "../utils/razorpayCheckoutInspector";
import { ensureRazorpay } from "../utils/razorpayLoader";
import { useBranding } from "../context/BrandingContext";

const CHECKOUT_SUCCESS_STORAGE_KEY = "checkoutSuccessPayload";
const RECOMMENDATION_CONTAINER_LIMIT = 20;

function clearCheckoutCartState() {
  const emptyCart = { items: [], totalAmount: 0, itemCount: 0, totalQuantity: 0 };
  useAuthCartStore.getState().setCart(emptyCart);
  emitCartChanged(emptyCart);
}

function normalizeError(err) {
  if (err?.code === "ECONNABORTED" || /timeout/i.test(String(err?.message || ""))) {
    return "Payment request timed out before Razorpay opened. Please try again.";
  }
  const firstIssue = err?.response?.data?.details?.issues?.[0];
  if (firstIssue?.path?.length) {
    return `${firstIssue.path.join(".")}: ${firstIssue.message}`;
  }
  if (err?.response?.data?.debug?.message) {
    return err.response.data.debug.message;
  }
  return err?.response?.data?.message || err?.message || "Request failed";
}

function hasValidShippingAddress(address) {
  return Boolean(
    String(address?.fullName || "").trim() &&
      String(address?.phone || "").trim() &&
      String(address?.line1 || "").trim() &&
      String(address?.district || address?.city || "").trim() &&
      String(address?.state || "").trim() &&
      String(address?.postalCode || "").trim() &&
      String(address?.country || "").trim()
  );
}

function getAddressFormFromShippingAddress(address = {}) {
  return {
    name: String(address.fullName || "").trim(),
    phone: String(address.phone || "").trim(),
    addressLine: String(address.line1 || "").trim(),
    district: String(address.district || address.city || "").trim(),
    state: String(address.state || "").trim(),
    pincode: String(address.postalCode || "").trim(),
    country: String(address.country || "India").trim() || "India",
    isDefault: false,
    latitude: "",
    longitude: "",
  };
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function reconcileSummaryWithCart(summary, cartLike) {
  const cartItems = Array.isArray(cartLike?.items) ? cartLike.items : [];
  if (!cartItems.length) return null;
  if (!summary || !Array.isArray(summary?.sellers)) return summary;

  const cartItemMap = new Map(
    cartItems.map((item) => [
      getCartItemKey(extractProductId(item?.productId || item), extractVariantId(item)),
      item,
    ])
  );

  const sellers = summary.sellers
    .map((seller) => {
      const items = Array.isArray(seller?.items)
        ? seller.items
            .map((item) => {
              const key = getCartItemKey(extractProductId(item?.productId || item), extractVariantId(item));
              const cartItem = cartItemMap.get(key);
              if (!cartItem) return null;
              return {
                ...item,
                quantity: cartItem.quantity,
                price: cartItem.price,
                image: cartItem.image || item.image,
                variantId: cartItem.variantId || item.variantId || "",
                variantTitle: cartItem.variantTitle || item.variantTitle || "",
              };
            })
            .filter(Boolean)
        : [];

      return {
        ...seller,
        items,
        subtotal: items.reduce((sum, item) => sum + Number(item?.price || 0) * Number(item?.quantity || 0), 0),
      };
    })
    .filter((seller) => seller.items.length > 0);

  if (!sellers.length) return null;

  const subtotal = sellers.reduce((sum, seller) => sum + Number(seller?.subtotal || 0), 0);
  const chargesTotal = Number(summary?.chargesTotal || 0);
  const itemCount = sellers.reduce(
    (sum, seller) => sum + seller.items.reduce((itemSum, item) => itemSum + Number(item?.quantity || 0), 0),
    0
  );

  return {
    ...summary,
    sellers,
    subtotal,
    itemCount,
    total: subtotal + chargesTotal,
    totalAmount: subtotal + chargesTotal,
  };
}

function persistCheckoutSuccessPayload(payload) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(CHECKOUT_SUCCESS_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore session storage failures and still allow in-memory navigation state.
  }
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const { branding } = useBranding();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const currentUser = useAuthStore((state) => state.user);
  const {
    cart,
    addItem,
    updateItem,
    removeItem,
    validateCart,
    refreshCart,
    guestCartId,
  } = useCart();
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState("");
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS_FORM);
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [currentStep, setCurrentStep] = useState("summary");
  const [showAddressSelector, setShowAddressSelector] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showCodConfirmPopup, setShowCodConfirmPopup] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [toast, setToast] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [fbtBundle, setFbtBundle] = useState(null);
  const [pricingConfig, setPricingConfig] = useState(null);
  const [amountPulse, setAmountPulse] = useState(false);
  const [codAvailability, setCodAvailability] = useState(null);
  const checkoutStartedTrackedRef = useRef(false);
  const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const didMountPaymentMethodRef = useRef(false);
  const restoredPendingCheckoutRef = useRef(false);

  const selectedAddress = useMemo(
    () => addresses.find((address) => String(address?._id) === String(selectedAddressId)) || null,
    [addresses, selectedAddressId]
  );
  const activeShippingAddress = useMemo(() => {
    if (selectedAddress) {
      return getShippingAddressFromSavedAddress(selectedAddress);
    }
    return getShippingAddressFromForm(addressForm);
  }, [selectedAddress, addressForm]);
  const hasUsableAddress = hasValidShippingAddress(activeShippingAddress);
  const unlockedSteps = useMemo(() => ["address", "summary", "payment"], []);
  const orderItems = useMemo(() => getSummaryItems(summary), [summary]);
  const totalAmount = useMemo(() => summary?.total || summary?.totalAmount || 0, [summary]);
  const codAdvance = useMemo(() => summary?.codAdvance || null, [summary]);
  const hasCodAdvance = paymentMethod === "COD" && codAdvance?.enabled && Number(codAdvance?.advanceAmount || 0) > 0;
  const payNowAmount = hasCodAdvance ? Number(codAdvance.advanceAmount || 0) : totalAmount;
  const checkoutProductIds = useMemo(
    () => (Array.isArray(cart?.items) ? cart.items : []).map((item) => item?.productId?._id || item?.productId).filter(Boolean).map(String),
    [cart?.items]
  );
  const getCheckoutItemKey = useCallback(
    (item) => `${extractProductId(item?.productId || item)}:${extractVariantId(item)}`,
    []
  );

  useEffect(() => {
    let cancelled = false;
    async function loadRecommendations() {
      if (!checkoutProductIds.length) {
        setRecommendations(null);
        return;
      }
      try {
        const response = await getCheckoutRecommendations(checkoutProductIds, { limit: RECOMMENDATION_CONTAINER_LIMIT });
        const fbtResponse = checkoutProductIds[0]
          ? await getFbtRecommendations(checkoutProductIds[0], { limit: RECOMMENDATION_CONTAINER_LIMIT - 1 }).catch(() => ({ data: null }))
          : { data: null };
        if (!cancelled) {
          setRecommendations(response?.data || null);
          setFbtBundle(fbtResponse?.data || null);
        }
      } catch {
        if (!cancelled) {
          setRecommendations(null);
          setFbtBundle(null);
        }
      }
    }
    loadRecommendations();
    return () => {
      cancelled = true;
    };
  }, [checkoutProductIds]);

  useEffect(() => {
    if (checkoutStartedTrackedRef.current) return;
    const trackingContext = loadTrackingContext();
    if (!trackingContext?.trackingToken) return;
    checkoutStartedTrackedRef.current = true;
    trackAffiliateEvent({
      trackingToken: trackingContext.trackingToken,
      anonymousId: trackingContext.anonymousId || "",
      eventType: "checkout_started",
      metadata: { source: "checkout" },
    }).catch(() => null);
  }, []);

  const priceBreakdown = useMemo(() => {
    if (!summary) return null;

    if (summary.charges && summary.chargesTotal !== undefined) {
      return {
        subtotal: summary.subtotal || 0,
        charges: summary.charges,
        chargesTotal: summary.chargesTotal || 0,
        totalAmount: summary.total || 0,
        codAdvance: paymentMethod === "COD" ? codAdvance : null,
      };
    }

    if (pricingConfig) {
      const breakdown = pricingService.calculatePriceBreakdown({
        subtotal: Number(summary?.subtotal || 0),
        discount: Math.max(
          Number(summary?.originalAmount || summary?.subtotal || 0) - Number(summary?.subtotal || 0),
          0
        ),
        itemCount: getSummaryItems(summary).reduce((sum, item) => sum + Number(item?.quantity || 0), 0),
        pricingConfig,
      });
      return {
        ...breakdown,
        codAdvance: paymentMethod === "COD" ? codAdvance : null,
      };
    }

    return {
      ...buildPriceBreakdown(summary),
      codAdvance: paymentMethod === "COD" ? codAdvance : null,
    };
  }, [codAdvance, paymentMethod, summary, pricingConfig]);

  const persistPendingCheckoutState = useCallback(
    ({
      selectedPaymentMethod = paymentMethod,
      shippingAddress = activeShippingAddress,
      step = currentStep,
      selectedSavedAddressId = selectedAddress?._id || selectedAddressId || "",
      cartItems = Array.isArray(cart?.items) ? cart.items : [],
    } = {}) => {
      if (!cartItems.length && !orderItems.length) return null;

      return pendingCheckoutManager.update({
        source: "checkout",
        redirectAfterAuth: "/checkout",
        redirectAfterLogin: "/checkout",
        cartItems,
        shippingAddress: hasValidShippingAddress(shippingAddress) ? shippingAddress : null,
        selectedAddress: hasValidShippingAddress(shippingAddress) ? shippingAddress : null,
        selectedAddressId: selectedSavedAddressId || "",
        paymentMethod: selectedPaymentMethod,
        selectedPaymentMethod,
        currentStep: step,
        checkoutStep: step,
        appliedCoupon: summary?.coupon || null,
      });
    },
    [
      activeShippingAddress,
      cart?.items,
      currentStep,
      orderItems.length,
      paymentMethod,
      selectedAddress?._id,
      selectedAddressId,
      summary?.coupon,
    ]
  );

  const restorePendingCheckoutState = useCallback(() => {
    if (restoredPendingCheckoutRef.current) return;
    const pendingCheckout = pendingCheckoutManager.get();
    if (!pendingCheckout) return;

    const restoredPaymentMethod =
      pendingCheckout.selectedPaymentMethod || pendingCheckout.paymentMethod;
    const restoredShippingAddress =
      pendingCheckout.selectedAddress || pendingCheckout.shippingAddress;
    const restoredStep = pendingCheckout.checkoutStep || pendingCheckout.currentStep;

    if (restoredPaymentMethod) {
      setPaymentMethod(restoredPaymentMethod);
    }
    if (pendingCheckout.selectedAddressId) {
      setSelectedAddressId(String(pendingCheckout.selectedAddressId));
    }
    if (restoredShippingAddress) {
      setAddressForm(getAddressFormFromShippingAddress(restoredShippingAddress));
    }
    if (restoredStep) {
      setCurrentStep(restoredStep);
    }

    restoredPendingCheckoutRef.current = true;
  }, []);

  async function verifyPaymentWithRetry(payload, maxAttempts = 4) {
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await paymentService.verifyRazorpayPayment(payload);
      } catch (verificationError) {
        lastError = verificationError;
        if (attempt < maxAttempts) {
          await delay(1500 * attempt);
          continue;
        }
      }
    }

    throw lastError || new Error("Payment verification failed.");
  }

  const loadPreparedCheckout = useCallback(
    async (shippingAddress, selectedPaymentMethod = paymentMethod, guestCartItems = cart?.items || []) => {
      const trackingContext = loadTrackingContext();
      const payload = {
        paymentMethod: selectedPaymentMethod,
      };

      if (shippingAddress && String(shippingAddress?.fullName || "").trim()) {
        payload.shippingAddress = shippingAddress;
      }
      if (trackingContext?.trackingToken) {
        payload.trackingToken = trackingContext.trackingToken;
      }

      if (isAuthenticated) {
        if (!cart?.items || cart.items.length === 0) return null;
        const checkoutRes = await checkoutService.prepareCheckout(payload);
        return checkoutRes?.data || null;
      }

      if (!Array.isArray(guestCartItems) || guestCartItems.length === 0) {
        return null;
      }

      const guestCheckoutRes = await checkoutService.prepareGuestCheckout({
        ...payload,
        guestCartItems,
        guestCartId,
      });
      return guestCheckoutRes?.data || null;
    },
    [cart?.items, guestCartId, isAuthenticated, paymentMethod]
  );

  const refresh = useCallback(
    async ({
      selectedPaymentMethod = paymentMethod,
      selectedAddressForm = addressForm,
      preserveGuestAddress = false,
    } = {}) => {
      setLoading(true);
      setError("");

      try {
        restorePendingCheckoutState();
        const pricingRes = await pricingService.getPricingConfig().catch(() => ({ data: null }));
        setPricingConfig(pricingRes?.data || null);

        if (isAuthenticated) {
          const [addressRes] = await Promise.all([userService.getUserAddresses(), refreshCart()]);
          const nextAddresses = Array.isArray(addressRes?.data) ? addressRes.data : [];
          const defaultAddress = getDefaultAddress(nextAddresses);
          const pendingCheckout = pendingCheckoutManager.get();
          const pendingSelectedAddressId = String(pendingCheckout?.selectedAddressId || "");
          const pendingSavedAddress =
            nextAddresses.find((address) => String(address?._id) === pendingSelectedAddressId) || null;
          const pendingShippingAddress =
            pendingCheckout?.selectedAddress || pendingCheckout?.shippingAddress || null;
          const shouldPreferPendingAddress =
            pendingShippingAddress && !pendingSavedAddress && !preserveGuestAddress;

          setAddresses(nextAddresses);

          if (pendingSavedAddress && !preserveGuestAddress) {
            setSelectedAddressId(pendingSavedAddress._id);
            setAddressForm(getAddressFormFromSavedAddress(pendingSavedAddress));
          } else if (shouldPreferPendingAddress) {
            setSelectedAddressId("");
            setAddressForm(getAddressFormFromShippingAddress(pendingShippingAddress));
          } else if (defaultAddress) {
            setSelectedAddressId(defaultAddress._id);
            setAddressForm(getAddressFormFromSavedAddress(defaultAddress));
          } else {
            setSelectedAddressId("");
          }

          const effectiveAddress = pendingSavedAddress
            ? getShippingAddressFromSavedAddress(pendingSavedAddress)
            : shouldPreferPendingAddress
              ? pendingShippingAddress
            : defaultAddress
              ? getShippingAddressFromSavedAddress(defaultAddress)
              : getShippingAddressFromForm(selectedAddressForm);

          const nextSummary = await loadPreparedCheckout(effectiveAddress, selectedPaymentMethod);
          setSummary(nextSummary);
          setCodAvailability(nextSummary?.codAvailability || null);
        } else {
          setAddresses([]);
          setSelectedAddressId("");
          const validation = await validateCart();
          const guestCartItems = validation?.validatedItems || [];
          const guestShippingAddress = getShippingAddressFromForm(selectedAddressForm);
          const nextSummary = await loadPreparedCheckout(
            guestShippingAddress,
            selectedPaymentMethod,
            guestCartItems
          );
          setSummary(nextSummary);
          setCodAvailability(nextSummary?.codAvailability || null);
        }
      } catch (refreshError) {
        setError(normalizeError(refreshError));
        setSummary(null);
      } finally {
        setLoading(false);
      }
    },
    [
      addressForm,
      isAuthenticated,
      loadPreparedCheckout,
      paymentMethod,
      refreshCart,
      restorePendingCheckoutState,
      validateCart,
    ]
  );
  const refreshRef = useRef(refresh);
  const addressFormRef = useRef(addressForm);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    addressFormRef.current = addressForm;
  }, [addressForm]);

  const redirectToLoginForFinalCheckout = useCallback(
    (shippingAddress, step = "payment") => {
      persistPendingCheckoutState({
        shippingAddress,
        step,
      });
      saveRedirectAfterLogin(`${window.location.origin}/checkout`);
      navigate("/login", { state: { from: { pathname: "/checkout" } } });
    },
    [navigate, persistPendingCheckoutState]
  );

  useEffect(() => {
    refreshRef.current({ selectedAddressForm: addressFormRef.current });
  }, [isAuthenticated]);

  useEffect(() => {
    ensureRazorpay().catch(() => {});
  }, []);

  useEffect(() => {
    if (loading || !summary) return;
    persistPendingCheckoutState();
  }, [loading, persistPendingCheckoutState, summary]);

  useEffect(() => {
    if (!didMountPaymentMethodRef.current) {
      didMountPaymentMethodRef.current = true;
      return;
    }

    const activeAddress = activeShippingAddress;
    setError("");
    loadPreparedCheckout(activeAddress, paymentMethod)
      .then((nextSummary) => {
        setSummary(nextSummary);
        setCodAvailability(nextSummary?.codAvailability || null);
        setAmountPulse(true);
      })
      .catch((paymentError) => setError(normalizeError(paymentError)));
  }, [activeShippingAddress, loadPreparedCheckout, paymentMethod]);

  useEffect(() => {
    if (!amountPulse) return undefined;
    const timer = window.setTimeout(() => setAmountPulse(false), 320);
    return () => window.clearTimeout(timer);
  }, [amountPulse]);

  async function handleQuantityChange(productId, variantId, quantity) {
    setUpdatingItemId(`${String(productId)}:${variantId || ""}`);
    setError("");
    try {
      const updatedCart = await updateItem(productId, quantity, variantId);
      let resolvedSummary = null;

      if (isAuthenticated) {
        resolvedSummary = reconcileSummaryWithCart(summary, updatedCart);
        setSummary(resolvedSummary);
        setCodAvailability(resolvedSummary?.codAvailability || codAvailability || null);
        await refreshCart();
      } else {
        const guestValidation = await validateCart(Array.isArray(updatedCart?.items) ? updatedCart.items : []);
        const nextSummary = await loadPreparedCheckout(
          activeShippingAddress,
          paymentMethod,
          guestValidation?.validatedItems
        );
        resolvedSummary = nextSummary;
      }

      setSummary(resolvedSummary);
      setCodAvailability(resolvedSummary?.codAvailability || codAvailability || null);
      setAmountPulse(true);
      setToast({ type: "success", message: "Order summary updated." });
    } catch (quantityError) {
      setError(normalizeError(quantityError));
    } finally {
      setUpdatingItemId("");
    }
  }

  async function handleRemoveItem(productId, variantId) {
    setUpdatingItemId(`${String(productId)}:${variantId || ""}`);
    setError("");
    try {
      const updatedCart = await removeItem(productId, variantId);
      let resolvedSummary = null;

      if (isAuthenticated) {
        resolvedSummary = reconcileSummaryWithCart(summary, updatedCart);
        setSummary(resolvedSummary);
        setCodAvailability(resolvedSummary?.codAvailability || codAvailability || null);
        await refreshCart();
      } else {
        const guestValidation = await validateCart(Array.isArray(updatedCart?.items) ? updatedCart.items : []);
        const nextSummary = await loadPreparedCheckout(
          activeShippingAddress,
          paymentMethod,
          guestValidation?.validatedItems
        );
        resolvedSummary = nextSummary;
      }

      const remainingItems = getSummaryItems(resolvedSummary);

      if (!resolvedSummary || remainingItems.length === 0) {
        setSummary(null);
        setToast({ type: "success", message: "Item removed. Your checkout is now empty." });
      } else {
        setSummary(resolvedSummary);
        setCodAvailability(resolvedSummary?.codAvailability || codAvailability || null);
        setAmountPulse(true);
        setToast({ type: "success", message: "Item removed from checkout." });
      }
    } catch (removeError) {
      setError(normalizeError(removeError));
    } finally {
      setUpdatingItemId("");
    }
  }

  async function handleAddressModalSubmit(payload, formSnapshot) {
    setSavingAddress(true);
    setError("");
    try {
      if (isAuthenticated) {
        const response = await userService.createUserAddress(payload);
        const createdAddress = response?.data;
        const nextAddresses = createdAddress
          ? [createdAddress, ...addresses.filter((item) => item._id !== createdAddress._id)]
          : addresses;

        setAddresses(nextAddresses);
        setAddressForm(formSnapshot);
        setSelectedAddressId(createdAddress?._id || "");
        setShowAddressModal(false);
        setShowAddressSelector(false);
        const nextSummary = await loadPreparedCheckout(
          createdAddress
            ? getShippingAddressFromSavedAddress(createdAddress)
            : getShippingAddressFromForm(formSnapshot),
          paymentMethod
        );
        setSummary(nextSummary);
        setCodAvailability(nextSummary?.codAvailability || null);
        setAmountPulse(true);
        setToast({ type: "success", message: "Address saved and selected for delivery." });
      } else {
        setAddressForm(formSnapshot);
        setSelectedAddressId("");
        setShowAddressModal(false);
        const guestValidation = await validateCart();
        const nextSummary = await loadPreparedCheckout(
          getShippingAddressFromForm(formSnapshot),
          paymentMethod,
          guestValidation?.validatedItems
        );
        setSummary(nextSummary);
        setCodAvailability(nextSummary?.codAvailability || null);
        setAmountPulse(true);
        setToast({ type: "success", message: "Delivery address saved for this checkout session." });
      }

      setCurrentStep("summary");
    } catch (addressError) {
      setError(normalizeError(addressError));
    } finally {
      setSavingAddress(false);
    }
  }

  async function placeOrder() {
    const shippingAddress = activeShippingAddress;

    if (!hasValidShippingAddress(shippingAddress)) {
      setCurrentStep("address");
      setToast({ type: "error", message: "Add a valid delivery address before continuing." });
      return;
    }

    if (paymentMethod === "COD" && codAvailability?.codAvailable === false) {
      setToast({ type: "error", message: "Cash on Delivery is not available for this address." });
      return;
    }

    setPlacing(true);
    setError("");

    try {
      const trackingContext = loadTrackingContext();
      if (!isAuthenticated) {
        redirectToLoginForFinalCheckout(shippingAddress);
        return;
      }

      if (paymentMethod === "COD" && !(codAdvance?.enabled && Number(codAdvance?.advanceAmount || 0) > 0)) {
        const response = await checkoutService.createOrder({
          shippingAddress,
          paymentMethod: "COD",
          trackingToken: trackingContext?.trackingToken,
        });
        const orders = response?.data?.orders || [];
        const payment = response?.data?.payment || null;
        
        setShowSuccessAnimation(true);
        setTimeout(() => {
          persistCheckoutSuccessPayload({ orders, payment });
          pendingCheckoutManager.clear();
          clearCheckoutCartState();
          navigate("/checkout/success", { replace: true, state: { orders, payment } });
        }, 3000);
        return;
      }

      const [orderRes] = await Promise.all([
        (paymentMethod === "COD" ? paymentService.createCodAdvanceOrder : paymentService.createRazorpayOrder)({
          cartId: "current",
          shippingAddress,
          trackingToken: trackingContext?.trackingToken,
        }),
        ensureRazorpay(),
      ]);
      const razorpayData = orderRes || {};

      const razorpayOrderId = razorpayData.razorpay_order_id || razorpayData.razorpayOrderId || razorpayData.orderId;
      const razorpayKey = razorpayData.key_id || razorpayData.key;
      const checkoutAmount = Number(razorpayData.amount || 0);
      const checkoutCurrency = String(razorpayData.currency || "").toUpperCase();
      const expiresAt = razorpayData.expiresAt ? new Date(razorpayData.expiresAt).getTime() : 0;
      if (!razorpayKey || !razorpayOrderId || !String(razorpayOrderId).startsWith("order_")) {
        throw new Error("Invalid Razorpay order token. Please retry checkout.");
      }
      if (!Number.isFinite(checkoutAmount) || checkoutAmount <= 0 || !/^[A-Z]{3}$/.test(checkoutCurrency)) {
        throw new Error("Invalid Razorpay checkout amount or currency. Please retry checkout.");
      }
      if (expiresAt && expiresAt <= Date.now()) {
        throw new Error("Payment session expired before checkout opened. Please retry checkout.");
      }
      if (
        razorpayData.checkoutIntegrity &&
        (razorpayData.checkoutIntegrity.amountMatches === false ||
          razorpayData.checkoutIntegrity.currencyMatches === false ||
          String(razorpayData.checkoutIntegrity.orderStatus || "").toLowerCase() !== "created")
      ) {
        throw new Error("Razorpay order integrity check failed. Please retry checkout.");
      }

      if (typeof window === "undefined" || typeof window.Razorpay !== "function") {
        throw new Error("Razorpay checkout is not available.");
      }

      clearStaleRazorpayCheckoutState();
      const normalizedContact = String(shippingAddress.phone || "").replace(/\D/g, "");
      const checkoutContact =
        normalizedContact.length === 10 ? `+91${normalizedContact}` : normalizedContact ? `+${normalizedContact}` : "";
      const checkoutEmail =
        currentUser?.email ||
        selectedAddress?.email ||
        shippingAddress?.email ||
        "customer@example.com";

      const options = {
        key: razorpayKey,
        amount: checkoutAmount,
        currency: checkoutCurrency,
        order_id: razorpayOrderId,
        name: branding?.companyName || "UChooseMe",
        description: paymentMethod === "COD" ? "COD advance payment" : "Secure checkout",
        prefill: {
          name: shippingAddress.fullName,
          email: checkoutEmail,
          contact: checkoutContact,
        },
        theme: {
          color: branding?.brandColors?.primaryColor || "#0f766e",
        },
        modal: {
          ondismiss: () => {
            setToast({ type: "error", message: "Payment window closed. You can retry securely from checkout." });
            setPlacing(false);
          },
        },
        retry: {
          enabled: false,
        },
        handler: async (response) => {
          if (
            !String(response?.razorpay_order_id || "").startsWith("order_") ||
            !String(response?.razorpay_payment_id || "").startsWith("pay_") ||
            !/^[a-f0-9]{64}$/i.test(String(response?.razorpay_signature || ""))
          ) {
            setToast({ type: "error", message: "Razorpay returned an invalid payment response. Please retry." });
            setPlacing(false);
            return;
          }

          const verificationPayload = {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            shippingAddress,
            trackingToken: trackingContext?.trackingToken,
          };
          const checkoutStartedAt = Date.now();

          setShowSuccessAnimation(true);
          await new Promise(resolve => setTimeout(resolve, 3000));

          navigate("/checkout/success", {
            replace: true,
            state: {
              orders: [],
              payment: {
                method: paymentMethod === "COD" ? "COD_ADVANCE" : "ONLINE",
                status: "PROCESSING",
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
              },
              processing: true,
              verificationPayload,
              checkoutStartedAt,
            },
          });

          try {
            setVerifyingPayment(true);
            const verified = await verifyPaymentWithRetry(verificationPayload);
            const successPayload = {
              orders: verified?.orders || [],
              payment: verified?.payment || null,
            };
            persistCheckoutSuccessPayload(successPayload);
            pendingCheckoutManager.clear();
            clearCheckoutCartState();
            navigate("/checkout/success", {
              replace: true,
              state: successPayload,
            });
          } catch (verificationError) {
            if (verificationError?.response?.status === 401) {
              redirectToLoginForFinalCheckout(shippingAddress);
              return;
            }
            navigate("/checkout/success", {
              replace: true,
              state: {
                orders: [],
                payment: {
                  method: paymentMethod === "COD" ? "COD_ADVANCE" : "ONLINE",
                  status: "PROCESSING",
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                },
                processing: true,
                verificationPayload,
                checkoutStartedAt,
                verificationError: normalizeError(verificationError),
              },
            });
          } finally {
            setVerifyingPayment(false);
            setPlacing(false);
          }
        },
      };

      await inspectRazorpayCheckout({
        options,
        backendOrder: {
          backendConfiguration: {
            key: razorpayKey,
            key_id: razorpayKey,
            mode: razorpayData.gatewayMode,
            currency: checkoutCurrency,
          },
          order: {
            razorpay_order_id: razorpayOrderId,
            order_id: razorpayOrderId,
            amount: checkoutAmount,
            currency: checkoutCurrency,
            status: razorpayData.checkoutIntegrity?.orderStatus || "",
            expiresAt: razorpayData.expiresAt,
            paymentSessionId: razorpayData.paymentSessionId,
          },
          checkoutJsUrl: "https://checkout.razorpay.com/v1/checkout.js",
        },
        fetchBackendOrder: () => paymentService.inspectCheckoutOrder(razorpayOrderId),
      });

      await paymentService.recordCheckoutOpened({
        razorpay_order_id: razorpayOrderId,
        paymentSessionId: razorpayData.paymentSessionId,
        key_id: razorpayKey,
        gatewayMode: razorpayData.gatewayMode,
        amount: checkoutAmount,
        currency: checkoutCurrency,
      });

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response) => {
        const reason = response?.error?.description || response?.error?.reason || response?.error?.code;
        const message = reason ? `Payment failed: ${reason}` : "Payment failed before verification. Please retry.";
        if (isRazorpayInspectorEnabled()) {
          inspectRazorpayCheckout({
            options,
            fetchBackendOrder: () => paymentService.inspectCheckoutOrder(razorpayOrderId),
            failureResponse: response,
          }).catch(() => {});
        }
        paymentService
          .recordCheckoutFailure({
            razorpay_order_id: razorpayOrderId,
            paymentSessionId: razorpayData.paymentSessionId,
            key_id: razorpayKey,
            gatewayMode: razorpayData.gatewayMode,
            amount: checkoutAmount,
            currency: checkoutCurrency,
            error: response?.error || {},
          })
          .catch(() => {});
        try {
          rzp.close();
        } catch {
          // Razorpay may already have closed the modal.
        }
        setToast({ type: "error", message });
        setPlacing(false);
      });
      rzp.open();
    } catch (placeOrderError) {
      if (placeOrderError?.response?.status === 401) {
        redirectToLoginForFinalCheckout(shippingAddress);
        return;
      }
      setError(normalizeError(placeOrderError));
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="grid gap-6 relative mx-auto max-w-7xl px-4 lg:px-8 py-8 bg-slate-50/30 min-h-screen">
      <AnimatePresence>
        {showSuccessAnimation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm"
          >
            <div className="relative flex items-center justify-center">
              {/* Confetti particles */}
              {[...Array(24)].map((_, i) => {
                const angle = (i * 15 * Math.PI) / 180;
                const distance = 80 + Math.random() * 80;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                    animate={{ 
                      opacity: [0, 1, 0], 
                      scale: [0, Math.random() + 0.5, 0], 
                      x: Math.cos(angle) * distance, 
                      y: Math.sin(angle) * distance,
                      rotate: Math.random() * 360
                    }}
                    transition={{ delay: 0.1, duration: 1.5, ease: "easeOut" }}
                    className={`absolute h-3 w-3 ${['bg-blue-500', 'bg-purple-500', 'bg-amber-400', 'bg-emerald-500'][i % 4]} ${i % 2 === 0 ? 'rounded-full' : 'rounded-sm'}`}
                  />
                );
              })}
              
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: [0, -15, 15, -15, 15, 0] }}
                transition={{ 
                  scale: { type: "spring", bounce: 0.5 },
                  rotate: { delay: 0.4, duration: 0.5, ease: "easeInOut" }
                }}
                className="relative z-10 flex h-32 w-32 items-center justify-center rounded-full bg-[#0066ff] text-white shadow-2xl shadow-blue-500/40"
              >
                <Check className="h-16 w-16" strokeWidth={4} />
              </motion.div>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-8 text-center"
            >
              <div className="text-sm font-bold uppercase tracking-widest text-blue-600 mb-2">Order Confirmed</div>
              <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                Thank you! Your order<br/>is in the system.
              </h2>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!summary && !loading && !cart?.items?.length ? (
        <div className="flex flex-col gap-8 pb-12">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                Order Summary
              </h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Review your items and confirm your order details before proceeding to payment.
              </p>
            </div>
            <BackButton fallbackTo="/shop" />
          </div>

          <div className="flex flex-col gap-6">
            {/* Main Empty State Card */}
            <div className="rounded-[2rem] bg-white p-8 shadow-sm flex flex-col min-h-[450px] border border-slate-100 relative overflow-hidden">
              {/* Header row in card */}
              <div className="flex items-center gap-4 relative z-10">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-500 border border-indigo-100/50">
                  <ShoppingCart size={20} strokeWidth={2.5} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Your Items</h3>
              </div>
              
              {/* Center Content */}
              <div className="flex-1 flex flex-col items-center justify-center relative z-10">
                <div className="relative mb-8 flex items-center justify-center w-40 h-40">
                  <div className="absolute inset-0 bg-indigo-50/80 rounded-full" />
                  <div className="relative text-indigo-200/80">
                    <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M25 40 L75 40 L80 90 L20 90 Z" fill="currentColor" opacity="0.4" />
                      <path d="M35 40 C35 20, 65 20, 65 40" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.6" />
                      <path d="M25 40 L75 40 L80 90 L20 90 Z" stroke="currentColor" strokeWidth="3" strokeDasharray="4 4" fill="none" opacity="0.8" />
                    </svg>
                  </div>
                  {/* Decorative sparks */}
                  <div className="absolute top-4 right-2 w-1.5 h-1.5 rounded-full bg-indigo-400 rotate-45" />
                  <div className="absolute top-10 -right-2 w-2 h-0.5 bg-indigo-300 -rotate-45" />
                  <div className="absolute bottom-8 -left-4 w-1.5 h-1.5 rounded-full bg-indigo-300" />
                  <div className="absolute bottom-16 -left-6 w-2 h-0.5 bg-indigo-400 rotate-45" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Your cart is empty</h2>
                <p className="text-slate-500 mt-2 text-sm">Looks like you haven't added anything yet.</p>
              </div>
            </div>

            {/* Bottom Call to Action Card */}
            <div className="rounded-[1.5rem] bg-white p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6 border border-slate-100">
              <div className="flex items-center gap-4 text-center sm:text-left flex-col sm:flex-row">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-500 shrink-0 border border-indigo-100/50">
                  <ShoppingBag size={24} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Your checkout is empty</h3>
                  <p className="text-sm text-slate-500 mt-0.5">Add items to your cart and review your order here.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/shop")}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 py-3.5 text-sm font-bold text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-colors shrink-0"
              >
                <ShoppingBag size={18} strokeWidth={2.5} />
                Go to Shopping
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Decorative Background */}
          <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
            {/* Shopping Bags */}
            <div className="absolute top-10 left-[5%] opacity-10 rotate-[-15deg]">
              <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
            </div>
            {/* Clipboard */}
            <div className="absolute top-8 right-[30%] opacity-10 rotate-[15deg]">
              <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M9 14h6"></path><path d="M9 18h6"></path><path d="M9 10h6"></path></svg>
            </div>
            {/* Sparkles */}
            <div className="absolute top-20 right-[15%] opacity-20">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path></svg>
            </div>
            <div className="absolute top-[10%] left-[20%] opacity-20">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path></svg>
            </div>
            <div className="absolute top-40 right-10 opacity-20">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path></svg>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-2 relative z-10">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                Order Summary
              </h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Please review your order details before proceeding to payment.
              </p>
            </div>
            <Link
              to="/cart"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 shrink-0"
            >
              &larr; Back to Cart
            </Link>
          </div>

          {!isAuthenticated ? (
            <div className="relative z-10 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100">
              Login is required only when you place the order or continue to Razorpay. You can review the entire checkout first.
            </div>
          ) : null}

          {error && error !== "Cart is empty" ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="grid gap-3">
              <div className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
              <div className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
            </div>
          ) : (
        <div className="grid gap-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="grid gap-5">
            <section className="relative z-10 rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100/50">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    1. Delivery Address
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isAuthenticated) {
                        setAddressForm(addressForm || EMPTY_ADDRESS_FORM);
                      } else {
                        setSelectedAddressId("");
                        setAddressForm(EMPTY_ADDRESS_FORM);
                        setShowAddressSelector(false);
                      }
                      setShowAddressModal(true);
                    }}
                    className="flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                    Add New Address
                  </button>
                </div>
              </div>

              {selectedAddress ? (
                <div className="mt-5 relative">
                  <AddressCard
                    address={selectedAddress}
                    selected
                    compact
                    onEdit={() => {
                      setAddressForm(getAddressFormFromSavedAddress(selectedAddress));
                      setSelectedAddressId(String(selectedAddress._id));
                      setShowAddressModal(true);
                      setShowAddressSelector(false);
                    }}
                  />
                  {isAuthenticated ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddressSelector((current) => !current);
                        setShowAddressModal(false);
                      }}
                      className="absolute top-4 right-4 z-10 flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50/50 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-100/50 transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                      Edit
                    </button>
                  ) : null}
                </div>
              ) : hasUsableAddress ? (
                <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                  <div className="font-semibold text-slate-950 dark:text-white">{addressForm.name}</div>
                  <div className="mt-1">{addressForm.addressLine}</div>
                  <div className="mt-1">
                    {addressForm.district || addressForm.city}, {addressForm.state} {addressForm.pincode}
                  </div>
                  <div className="mt-1">{addressForm.phone}</div>
                </div>
              ) : (
                <div className="mt-5 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                  {isAuthenticated
                    ? "No saved address is selected yet. Add one to continue."
                    : "Add a delivery address to unlock shipping estimates and COD availability. The address stays only for this checkout session until you sign in."}
                </div>
              )}

              {isAuthenticated && showAddressSelector ? (
                <div className="mt-5 grid gap-4">
                  {addresses.length ? (
                    addresses.map((address) => (
                      <AddressCard
                        key={address._id}
                        address={address}
                        selected={String(address._id) === String(selectedAddressId)}
                        onEdit={() => {
                          setSelectedAddressId(String(address._id));
                          setAddressForm(getAddressFormFromSavedAddress(address));
                          setShowAddressModal(true);
                        }}
                        onSelect={() => {
                          setSelectedAddressId(address._id);
                          setAddressForm(getAddressFormFromSavedAddress(address));
                          setShowAddressSelector(false);
                          setShowAddressModal(false);
                          loadPreparedCheckout(getShippingAddressFromSavedAddress(address), paymentMethod)
                            .then((nextSummary) => {
                              setSummary(nextSummary);
                              setCodAvailability(nextSummary?.codAvailability || null);
                              setAmountPulse(true);
                            })
                            .catch((selectionError) => setError(normalizeError(selectionError)));
                        }}
                      />
                    ))
                  ) : (
                    <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                      No saved addresses yet. Add a new address to enable faster checkout next time.
                    </div>
                  )}
                </div>
              ) : null}
            </section>

            <section className="relative z-10 rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100/50">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    2. Review Your Order
                  </h2>
                </div>
                <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {orderItems.length} {orderItems.length === 1 ? 'Item' : 'Items'}
                </div>
              </div>

              <div className="mt-5 grid gap-4">
                {orderItems.map((item) => (
                  <OrderSummaryCard
                    key={getCheckoutItemKey(item)}
                    item={item}
                    busy={updatingItemId === getCheckoutItemKey(item)}
                    onQuantityChange={(quantity) =>
                      handleQuantityChange(extractProductId(item?.productId || item), extractVariantId(item), quantity)
                    }
                    onRemove={() => handleRemoveItem(extractProductId(item?.productId || item), extractVariantId(item))}
                  />
                ))}
              </div>


            </section>

            <section className="relative z-10 rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100/50">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  3. Choose Payment
                </h2>
              </div>

              <div className="mt-5 grid gap-3">
                {[
                  {
                    value: "COD",
                    title: "Cash on Delivery",
                    description: "Pay when the order arrives. Best for familiar delivery locations.",
                    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M12 12h.01"/><path d="M17 12h.01"/><path d="M7 12h.01"/></svg>,
                    disabled:
                      paymentMethod !== "COD"
                        ? Boolean(codAvailability && codAvailability.codAvailable === false)
                        : false,
                  },
                  {
                    value: "ONLINE",
                    title: "Razorpay",
                    description: "UPI, cards, wallets, and net banking through secure Razorpay checkout.",
                    icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>,
                  },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => !option.disabled && setPaymentMethod(option.value)}
                    disabled={option.disabled}
                    className={`rounded-[1.5rem] border p-4 text-left transition-all ${
                      paymentMethod === option.value
                        ? "border-indigo-600 bg-indigo-50/50 shadow-sm"
                        : "border-slate-200 hover:border-slate-300 bg-white dark:border-slate-800 dark:hover:border-slate-700 dark:bg-slate-900"
                    } ${option.disabled ? "cursor-not-allowed opacity-50" : ""}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-100 shadow-sm dark:bg-slate-800 dark:border-slate-700">
                        {option.icon}
                      </div>
                      <div className="flex-1">
                        <div className="text-base font-bold text-slate-900 dark:text-white">{option.title}</div>
                        <div className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{option.description}</div>
                        {option.value === "COD" && codAvailability?.codAvailable === false ? (
                          <div className="mt-2 text-xs font-bold text-rose-600">
                            COD unavailable: {(codAvailability.reasons || []).map(r => {
                              if (r === "ORDER_VALUE_BELOW_MINIMUM") return "Order value is below the minimum required";
                              if (r === "ORDER_VALUE_EXCEEDED") return "Order value exceeded maximum allowed";
                              if (r === "PINCODE_RESTRICTED") return "Not available for your pincode";
                              if (r === "ZONE_RESTRICTED") return "Not available in your region";
                              if (r === "COD_DISABLED") return "Temporarily disabled";
                              if (r === "ADDRESS_REQUIRED") return "Address is required";
                              if (String(r).startsWith("PRODUCT_RESTRICTED")) return "Some items don't support COD";
                              if (String(r).startsWith("VENDOR_RESTRICTED")) return "A seller doesn't accept COD";
                              return r;
                            }).join(", ")}.
                          </div>
                        ) : null}
                      </div>
                      <div
                        className={`shrink-0 flex items-center justify-center h-5 w-5 rounded-full border-2 transition-colors ${
                          paymentMethod === option.value
                            ? "border-indigo-600"
                            : "border-slate-300 dark:border-slate-600"
                        }`}
                      >
                        {paymentMethod === option.value && (
                          <div className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
            </div>

          <aside className="xl:sticky xl:top-24 xl:self-start">
            <div className="grid gap-4">
              <PriceBreakdown breakdown={priceBreakdown} />

              {paymentMethod === "COD" && codAdvance?.enabled ? (
                <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-semibold">COD Advance (Pay Now)</span>
                    <span className="font-bold">{formatCurrency(codAdvance.advanceAmount || 0)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-4">
                    <span>Remaining Payable</span>
                    <span className="font-semibold">{formatCurrency(codAdvance.remainingCODAmount || 0)}</span>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-amber-800">
                    {codAdvance.tooltip ||
                      "You are paying only the advance amount now. The remaining amount must be paid to the delivery partner when the order is delivered."}
                  </p>
                </div>
              ) : null}

              <div className="relative z-10 rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] dark:border-slate-800 dark:bg-slate-900">
                <div className="text-base font-bold text-slate-900 dark:text-white">
                  {hasCodAdvance ? "Pay now" : "Order Total"}
                </div>
                <div className="mt-2 text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                  <span
                    className={`inline-block transition-all duration-300 ${
                      amountPulse ? "translate-y-[-1px] scale-[1.03] text-indigo-600" : ""
                    }`}
                  >
                    {formatCurrency(payNowAmount || 0)}
                  </span>
                </div>
                {hasCodAdvance ? (
                  <div className="mt-2 space-y-1 text-sm text-slate-500 dark:text-slate-400">
                    <div className="flex items-center justify-between gap-4">
                      <span>Order total</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">{formatCurrency(totalAmount || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span>Balance on delivery</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">{formatCurrency(codAdvance.remainingCODAmount || 0)}</span>
                    </div>
                  </div>
                ) : null}
                <div className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                  {!isAuthenticated
                    ? "Review complete. Sign in only when you are ready to place the order."
                    : paymentMethod === "ONLINE"
                      ? "You will be redirected to Razorpay next."
                      : codAdvance?.enabled
                        ? "You will pay the COD advance now and the balance on delivery."
                        : "Cash will be collected on delivery."}
                </div>

                <button
                  type="button"
                  disabled={placing || orderItems.length === 0 || (paymentMethod === "COD" && codAvailability?.codAvailable === false)}
                  onClick={() => {
                    if (!hasUsableAddress) {
                      setToast({ type: "error", message: "Please select or add a delivery address first." });
                      return;
                    }
                    if (
                      isAuthenticated &&
                      paymentMethod === "COD" &&
                      !(codAdvance?.enabled && Number(codAdvance?.advanceAmount || 0) > 0)
                    ) {
                      setShowCodConfirmPopup(true);
                    } else {
                      placeOrder();
                    }
                  }}
                  className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-4 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {placing
                    ? "Processing..."
                    : !isAuthenticated
                      ? paymentMethod === "ONLINE"
                        ? "Login to Continue to Razorpay"
                        : codAdvance?.enabled
                          ? "Login to Pay COD Advance"
                          : "Login to Place COD Order"
                      : paymentMethod === "ONLINE"
                        ? "Continue to Razorpay"
                        : codAdvance?.enabled
                          ? "Pay COD Advance"
                          : "Place COD Order"}
                </button>

                {!isAuthenticated ? (
                  <button
                    type="button"
                    onClick={() => {
                      persistPendingCheckoutState();
                      saveRedirectAfterLogin(`${window.location.origin}/checkout`);
                      navigate("/login", { state: { from: { pathname: "/checkout" } } });
                    }}
                    className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-900"
                  >
                    Sign in now
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => navigate("/cart")}
                  className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-900"
                >
                  Back to Cart
                </button>
              </div>
            </div>
          </aside>
          </div>
          <FbtBundleSection fbt={fbtBundle} sourceProductId={checkoutProductIds[0] || ""} surface="checkout" onAddProduct={addItem} />
          <RecommendationSection
            title="Checkout add-ons"
            subtitle="Low-friction extras surfaced for the current basket."
            items={recommendations?.addOns || []}
            layout="grid"
            recommendationType="cross_sell"
            surface="checkout"
            sourceProductId={checkoutProductIds[0] || ""}
          />
          <RecommendationSection
            title="Recently viewed"
            subtitle="Quick access to products you explored before checkout."
            items={recommendations?.recentlyViewed || []}
            layout="carousel"
            recommendationType="recently_viewed"
            surface="checkout"
            sourceProductId={checkoutProductIds[0] || ""}
          />
          <RecommendationSection
            title="Trending now"
            subtitle="Popular products customers are exploring right now."
            items={recommendations?.trending || []}
            layout="grid"
            recommendationType="trending"
            surface="checkout"
            sourceProductId={checkoutProductIds[0] || ""}
          />
          <RecommendationSection
            title="Recommended for you"
            subtitle="Personalized products based on your shopping signals."
            items={recommendations?.personalized || []}
            layout="carousel"
            recommendationType="personalized"
            surface="checkout"
            sourceProductId={checkoutProductIds[0] || ""}
          />
          <RecommendationSection
            title="Better picks to consider"
            subtitle="Higher-value alternatives related to your checkout items."
            items={recommendations?.upsell || []}
            layout="grid"
            recommendationType="upsell"
            surface="checkout"
            sourceProductId={checkoutProductIds[0] || ""}
          />
        </div>
      )}

      {showCodConfirmPopup && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800 flex flex-col max-h-[90vh]">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Confirm COD Order</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Please review your Cash on Delivery order details below.
            </p>
            
            <div className="mt-4 flex-1 overflow-y-auto pr-1">
              <div className="space-y-3">
                {orderItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm gap-3">
                    <div className="flex items-center gap-3">
                      <img 
                        src={item.image || "https://placehold.co/100x100"} 
                        alt={item.productTitle || item.name || "Product"} 
                        className="h-12 w-12 rounded-lg object-cover bg-slate-100 dark:bg-slate-700" 
                      />
                      <div className="flex flex-col">
                        <span className="text-slate-900 dark:text-white font-medium line-clamp-1">
                          {item.productTitle || item.name || "Product"}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 text-xs">
                          Qty: {item.quantity}
                        </span>
                      </div>
                    </div>
                    <span className="font-medium text-slate-900 dark:text-white flex-shrink-0">
                      {formatCurrency(Number(item.price || 0) * Number(item.quantity || 1))}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 border-t border-slate-200 dark:border-slate-700 pt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Subtotal</span>
                  <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(summary?.subtotal || 0)}</span>
                </div>
                {Number(summary?.shipping || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Shipping</span>
                    <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(summary.shipping)}</span>
                  </div>
                )}
                {Number(summary?.codFee || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">COD Fee</span>
                    <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(summary.codFee)}</span>
                  </div>
                )}
                {Number(summary?.chargesTotal || 0) > Number(summary?.shipping || 0) + Number(summary?.codFee || 0) && (
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Extra Fees</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {formatCurrency(Number(summary.chargesTotal) - (Number(summary?.shipping || 0) + Number(summary?.codFee || 0)))}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2 text-base font-bold text-slate-900 dark:text-white mt-2">
                  <span>Total Amount</span>
                  <span className="text-[color:var(--commerce-primary)]">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowCodConfirmPopup(false)}
                className="flex-1 rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCodConfirmPopup(false);
                  placeOrder();
                }}
                className="flex-1 rounded-xl bg-[color:var(--commerce-accent-warm)] py-3 text-sm font-bold text-slate-950 shadow transition hover:-translate-y-0.5 hover:shadow-md"
              >
                Confirm Order
              </button>
            </div>
          </div>
        </div>
      )}

      <AddressModal
        open={showAddressModal}
        initialValues={addressForm}
        saving={savingAddress}
        mapsKey={mapsKey}
        title={isAuthenticated ? "Add New Address" : "Delivery Address"}
        description={
          isAuthenticated
            ? "Save a delivery address without leaving checkout."
            : "Use this delivery address to estimate shipping and resume checkout after login."
        }
        submitLabel={isAuthenticated ? "Save address" : "Use this address"}
        onClose={() => {
          setShowAddressModal(false);
          if (selectedAddress) {
            setAddressForm(getAddressFormFromSavedAddress(selectedAddress));
          }
        }}
        onSubmit={handleAddressModalSubmit}
      />

      <InlineToast toast={toast} onClose={() => setToast(null)} />

      {verifyingPayment ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 px-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[2rem] bg-white p-6 text-center shadow-2xl dark:bg-slate-900">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-[color:var(--commerce-accent)] dark:border-slate-700 dark:border-t-[color:var(--commerce-accent)]" />
            <h2 className="mt-5 text-xl font-semibold text-slate-950 dark:text-white">Verifying payment securely...</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Please wait while we confirm your Razorpay payment and create the order.
            </p>
            <div className="mt-5">
              <Link to="/orders" className="text-sm font-medium text-blue-600 hover:underline">
                View orders instead
              </Link>
            </div>
          </div>
        </div>
      ) : null}
      </>
      )}
    </div>
  );
}
