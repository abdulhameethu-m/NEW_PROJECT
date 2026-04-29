import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AddressModal } from "../components/AddressModal";
import { BackButton } from "../components/BackButton";
import { AddressCard } from "../components/commerce/AddressCard";
import { CheckoutStepper } from "../components/commerce/CheckoutStepper";
import { InlineToast } from "../components/commerce/InlineToast";
import { OrderSummaryCard } from "../components/commerce/OrderSummaryCard";
import { PriceBreakdown } from "../components/commerce/PriceBreakdown";
import { DynamicPriceBreakdown } from "../components/commerce/DynamicPriceBreakdown";
import * as cartService from "../services/cartService";
import * as checkoutService from "../services/checkoutService";
import * as paymentService from "../services/paymentService";
import * as pricingService from "../services/pricingService";
import * as userService from "../services/userService";
import { formatCurrency } from "../utils/formatCurrency";
import {
  EMPTY_ADDRESS_FORM,
  buildPriceBreakdown,
  getAddressFormFromSavedAddress,
  getDefaultAddress,
  getShippingAddressFromForm,
  getShippingAddressFromSavedAddress,
  getSummaryItems,
  isAddressFormValid,
} from "../utils/checkout";

function normalizeError(err) {
  return err?.response?.data?.message || err?.message || "Request failed";
}

function ensureRazorpay() {
  if (typeof window !== "undefined" && typeof window.Razorpay === "function") {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-razorpay-sdk="true"]');
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Razorpay checkout.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.razorpaySdk = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout."));
    document.body.appendChild(script);
  });
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState("");
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS_FORM);
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [currentStep, setCurrentStep] = useState("address");
  const [showAddressSelector, setShowAddressSelector] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [pricingConfig, setPricingConfig] = useState(null);
  const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [checkoutRes, addressRes, pricingRes] = await Promise.all([
        checkoutService.prepareCheckout(),
        userService.getUserAddresses(),
        pricingService.getPricingConfig(),
      ]);

      const nextSummary = checkoutRes?.data || null;
      const nextAddresses = Array.isArray(addressRes?.data) ? addressRes.data : [];
      const nextPricingConfig = pricingRes?.data || null;
      const defaultAddress = getDefaultAddress(nextAddresses);

      setSummary(nextSummary);
      setAddresses(nextAddresses);
      setPricingConfig(nextPricingConfig);

      if (defaultAddress) {
        setSelectedAddressId(defaultAddress._id);
        setAddressForm(getAddressFormFromSavedAddress(defaultAddress));
        setShowAddressModal(false);
      } else {
        setSelectedAddressId("");
        setAddressForm(EMPTY_ADDRESS_FORM);
        setShowAddressModal(true);
      }
    } catch (err) {
      setError(normalizeError(err));
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const selectedAddress = useMemo(
    () => addresses.find((address) => String(address?._id) === String(selectedAddressId)) || null,
    [addresses, selectedAddressId]
  );
  const orderItems = useMemo(() => getSummaryItems(summary), [summary]);
  
  // Use dynamic pricing breakdown from API response (includes all active pricing rules)
  const totalAmount = useMemo(() => {
    return summary?.total || summary?.totalAmount || 0;
  }, [summary]);

  // Build summary for display that includes dynamic charges
  const priceBreakdown = useMemo(() => {
    if (!summary) return null;
    
    // New API response includes charges and total from pricing engine
    if (summary.charges && summary.chargesTotal !== undefined) {
      return {
        subtotal: summary.subtotal || 0,
        charges: summary.charges,
        chargesTotal: summary.chargesTotal || 0,
        totalAmount: summary.total || 0,
      };
    }
    
    // Fall back to old calculation method if new format not available
    if (pricingConfig) {
      return pricingService.calculatePriceBreakdown({
        subtotal: Number(summary?.subtotal || 0),
        discount: Math.max((Number(summary?.originalAmount || summary?.subtotal || 0) - Number(summary?.subtotal || 0)), 0),
        itemCount: getSummaryItems(summary).reduce((sum, item) => sum + Number(item?.quantity || 0), 0),
        pricingConfig,
      });
    }
    
    // Fallback to legacy method
    return buildPriceBreakdown(summary);
  }, [summary, pricingConfig]);
  const hasUsableAddress = Boolean(selectedAddress) || (!selectedAddress && isAddressFormValid(addressForm));
  const unlockedSteps = useMemo(() => (hasUsableAddress ? ["address", "summary", "payment"] : ["address"]), [hasUsableAddress]);

  function getActiveShippingAddress() {
    if (selectedAddress) {
      return getShippingAddressFromSavedAddress(selectedAddress);
    }
    return getShippingAddressFromForm(addressForm);
  }

  async function handleQuantityChange(productId, variantId, quantity) {
    setUpdatingItemId(`${String(productId)}:${variantId || ""}`);
    setError("");
    try {
      await cartService.updateCartItem(productId, quantity, variantId);
      const checkoutRes = await checkoutService.prepareCheckout();
      setSummary(checkoutRes?.data || null);
      setToast({ type: "success", message: "Order summary updated." });
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setUpdatingItemId("");
    }
  }

  async function handleAddressModalSubmit(payload, formSnapshot) {
    setSavingAddress(true);
    setError("");
    try {
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
      setToast({ type: "success", message: "Address saved and selected for delivery." });
      setCurrentStep("summary");
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setSavingAddress(false);
    }
  }

  async function placeOrder() {
    const shippingAddress = getActiveShippingAddress();

    if (!shippingAddress?.fullName || !shippingAddress?.line1 || !shippingAddress?.postalCode) {
      setCurrentStep("address");
      setToast({ type: "error", message: "Select or save a delivery address before payment." });
      return;
    }

    setPlacing(true);
    setError("");
    try {
      if (paymentMethod === "COD") {
        const response = await checkoutService.createOrder({ shippingAddress, paymentMethod: "COD" });
        navigate("/checkout/success", {
          replace: true,
          state: {
            orders: response?.data?.orders || [],
            payment: response?.data?.payment || null,
          },
        });
        return;
      }

      const orderRes = await paymentService.createRazorpayOrder({ cartId: "current", shippingAddress });
      const razorpayData = orderRes?.data || {};
      await ensureRazorpay();

      if (typeof window === "undefined" || typeof window.Razorpay !== "function") {
        throw new Error("Razorpay checkout is not available.");
      }

      const options = {
        key: razorpayData.key,
        amount: razorpayData.amount,
        currency: razorpayData.currency,
        order_id: razorpayData.orderId,
        name: "UChooseMe",
        description: "Secure checkout",
        prefill: {
          name: shippingAddress.fullName,
          contact: shippingAddress.phone,
        },
        theme: {
          color: "#0f766e",
        },
        handler: async (response) => {
          const verified = await paymentService.verifyRazorpayPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            shippingAddress,
          });
          navigate("/checkout/success", {
            replace: true,
            state: {
              orders: verified?.data?.orders || [],
              payment: verified?.data?.payment || null,
            },
          });
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Secure checkout</div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Address, summary, payment</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Live cart validation, saved addresses, current location, and secure Razorpay handoff.</p>
        </div>
        <BackButton fallbackTo="/cart" />
      </div>

      <CheckoutStepper currentStep={currentStep} onStepChange={setCurrentStep} unlockedSteps={unlockedSteps} />

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-3">
          <div className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          <div className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
        </div>
      ) : !summary ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          Unable to prepare checkout. Please review your cart.
          <button
            type="button"
            onClick={() => navigate("/cart")}
            className="mt-4 inline-flex rounded-xl bg-[color:var(--commerce-accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
          >
            Go to cart
          </button>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-5">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Step 1</div>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">Select delivery address</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddressSelector((current) => !current);
                      setShowAddressModal(false);
                    }}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAddressId("");
                      setAddressForm(EMPTY_ADDRESS_FORM);
                      setShowAddressSelector(false);
                      setShowAddressModal(true);
                    }}
                    className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-950"
                  >
                    Add New Address
                  </button>
                </div>
              </div>

              {selectedAddress ? (
                <div className="mt-5">
                  <AddressCard
                    address={selectedAddress}
                    selected
                    compact
                    onEdit={() => setShowAddressSelector((current) => !current)}
                  />
                </div>
              ) : null}

              {!selectedAddress && !showAddressModal ? (
                <div className="mt-5 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                  No saved address is selected yet. Add one below to continue.
                </div>
              ) : null}

              {showAddressSelector ? (
                <div className="mt-5 grid gap-4">
                  {addresses.length ? (
                    addresses.map((address) => (
                      <AddressCard
                        key={address._id}
                        address={address}
                        selected={String(address._id) === String(selectedAddressId)}
                        onSelect={() => {
                          setSelectedAddressId(address._id);
                          setAddressForm(getAddressFormFromSavedAddress(address));
                          setShowAddressSelector(false);
                          setShowAddressModal(false);
                          setCurrentStep("summary");
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

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (hasUsableAddress) {
                      setCurrentStep("summary");
                      return;
                    }
                    setToast({ type: "error", message: "Select or save a valid address to continue." });
                  }}
                  className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-950"
                >
                  Continue to summary
                </button>
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Step 2</div>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">Review your order</h2>
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">{orderItems.length} products ready for checkout</div>
              </div>

              <div className="mt-5 grid gap-4">
                {orderItems.map((item) => (
                  <OrderSummaryCard
                    key={`${String(item.productId)}:${item.variantId || ""}`}
                    item={item}
                    busy={updatingItemId === `${String(item.productId)}:${item.variantId || ""}`}
                    onQuantityChange={(quantity) => handleQuantityChange(String(item.productId), item.variantId || "", quantity)}
                  />
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep("payment")}
                  className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-950"
                >
                  Continue to payment
                </button>
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Step 3</div>
                <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">Choose payment</h2>
              </div>

              <div className="mt-5 grid gap-3">
                {[
                  {
                    value: "COD",
                    title: "Cash on Delivery",
                    description: "Pay when the order arrives. Best for familiar delivery locations.",
                  },
                  {
                    value: "ONLINE",
                    title: "Razorpay",
                    description: "UPI, cards, wallets, and net banking through secure Razorpay checkout.",
                  },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPaymentMethod(option.value)}
                    className={`rounded-[1.5rem] border p-4 text-left transition ${
                      paymentMethod === option.value
                        ? "border-[color:var(--commerce-accent)] bg-[color:var(--commerce-accent-soft)]"
                        : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold text-slate-950 dark:text-white">{option.title}</div>
                        <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{option.description}</div>
                      </div>
                      <div
                        className={`h-5 w-5 rounded-full border ${
                          paymentMethod === option.value
                            ? "border-[color:var(--commerce-accent)] bg-[color:var(--commerce-accent)]"
                            : "border-slate-300 dark:border-slate-700"
                        }`}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <aside className="xl:sticky xl:top-24 xl:self-start">
            <div className="grid gap-4">
              <PriceBreakdown breakdown={priceBreakdown} />

              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Order total</div>
                <div className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                  {formatCurrency(totalAmount || 0)}
                </div>
                <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {paymentMethod === "ONLINE" ? "You will be redirected to Razorpay next." : "Cash will be collected on delivery."}
                </div>

                <button
                  type="button"
                  disabled={placing || !hasUsableAddress}
                  onClick={placeOrder}
                  className="mt-5 w-full rounded-2xl bg-[color:var(--commerce-accent-warm)] px-4 py-4 text-sm font-semibold text-slate-950 shadow-sm transition hover:translate-y-[-1px] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {placing ? "Processing..." : paymentMethod === "ONLINE" ? "Continue to Razorpay" : "Place COD Order"}
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/cart")}
                  className="mt-3 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Back to cart
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      <AddressModal
        open={showAddressModal}
        initialValues={addressForm}
        saving={savingAddress}
        mapsKey={mapsKey}
        onClose={() => {
          setShowAddressModal(false);
          if (selectedAddress) {
            setAddressForm(getAddressFormFromSavedAddress(selectedAddress));
          }
        }}
        onSubmit={handleAddressModalSubmit}
      />

      <InlineToast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
