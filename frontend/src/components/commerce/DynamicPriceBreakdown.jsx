import { useEffect, useState } from "react";
import * as pricingService from "../../services/pricingService";

/**
 * Dynamic Price Breakdown Component
 * Shows price breakdown with all active pricing rules
 */
export function DynamicPriceBreakdown({ subtotal, itemCount = 1, currencySymbol = "₹" }) {
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function calculateBreakdown() {
      setLoading(true);
      setError("");
      try {
        const result = await pricingService.calculateOrderTotal(subtotal, itemCount);
        setBreakdown(result.data || result);
      } catch (err) {
        setError(err?.response?.data?.message || err?.message || "Failed to calculate total");
        setBreakdown(null);
      } finally {
        setLoading(false);
      }
    }

    if (subtotal >= 0) {
      calculateBreakdown();
    }
  }, [subtotal, itemCount]);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-600 text-sm">{error}</div>;
  }

  if (!breakdown) {
    return null;
  }

  return (
    <div className="space-y-3 text-sm">
      {/* Subtotal */}
      <div className="flex justify-between">
        <span className="text-gray-600">Subtotal</span>
        <span className="font-medium">
          {currencySymbol}
          {(breakdown.subtotal || 0).toFixed(2)}
        </span>
      </div>

      {/* Individual charges */}
      {breakdown.charges && breakdown.charges.length > 0 ? (
        <div className="border-t pt-2 space-y-2">
          {breakdown.charges.map((charge, index) => (
            <div key={index} className="flex justify-between items-start">
              <div>
                <div className="text-gray-600">{charge.displayName}</div>
                {charge.category && (
                  <small className="text-gray-400">({charge.category})</small>
                )}
              </div>
              <span className="font-medium">
                {currencySymbol}
                {charge.amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {/* Total */}
      <div className="border-t pt-2 flex justify-between items-center text-base font-bold bg-blue-50 p-2 rounded">
        <span>Total Amount</span>
        <span className="text-blue-600">
          {currencySymbol}
          {(breakdown.total || 0).toFixed(2)}
        </span>
      </div>

      {/* Summary info */}
      {breakdown.chargesTotal > 0 && (
        <div className="text-xs text-gray-500">
          Charges: {currencySymbol}
          {(breakdown.chargesTotal || 0).toFixed(2)} ({breakdown.charges?.length || 0} rules)
        </div>
      )}
    </div>
  );
}

/**
 * Compact Price Breakdown (inline display)
 */
export function CompactPriceBreakdown({ subtotal, itemCount = 1, currencySymbol = "₹" }) {
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function calculateBreakdown() {
      try {
        const result = await pricingService.calculateOrderTotal(subtotal, itemCount);
        setBreakdown(result.data || result);
      } catch {
        setBreakdown(null);
      } finally {
        setLoading(false);
      }
    }

    if (subtotal >= 0) {
      calculateBreakdown();
    }
  }, [subtotal, itemCount]);

  if (loading || !breakdown) {
    return null;
  }

  if (!breakdown.charges || breakdown.charges.length === 0) {
    return null;
  }

  return (
    <div className="inline-block bg-gray-50 px-3 py-2 rounded text-xs">
      <span className="font-semibold">
        {currencySymbol}
        {breakdown.subtotal.toFixed(2)}
      </span>
      {breakdown.charges.map((charge, idx) => (
        <span key={idx} className="ml-3">
          + <span className="text-gray-600">{charge.displayName}</span>{" "}
          <span className="font-medium">
            {currencySymbol}
            {charge.amount.toFixed(2)}
          </span>
        </span>
      ))}
      <div className="mt-1 pt-1 border-t border-gray-300 font-bold text-blue-600">
        = {currencySymbol}
        {breakdown.total.toFixed(2)}
      </div>
    </div>
  );
}

/**
 * Expandable Price Breakdown
 */
export function ExpandablePriceBreakdown({ subtotal, itemCount = 1, currencySymbol = "₹" }) {
  const [expanded, setExpanded] = useState(false);
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function calculateBreakdown() {
      if (!expanded) return;

      setLoading(true);
      try {
        const result = await pricingService.calculateOrderTotal(subtotal, itemCount);
        setBreakdown(result.data || result);
      } catch {
        setBreakdown(null);
      } finally {
        setLoading(false);
      }
    }

    calculateBreakdown();
  }, [expanded, subtotal, itemCount]);

  return (
    <div className="border rounded">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex justify-between items-center hover:bg-gray-50"
      >
        <span className="font-semibold">Price Breakdown</span>
        <span className={`transform transition ${expanded ? "rotate-180" : ""}`}>▼</span>
      </button>

      {expanded && (
        <div className="border-t p-4 bg-gray-50 space-y-2 text-sm">
          {loading ? (
            <div className="text-gray-500">Calculating...</div>
          ) : breakdown ? (
            <>
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-medium">
                  {currencySymbol}
                  {(breakdown.subtotal || 0).toFixed(2)}
                </span>
              </div>

              {breakdown.charges && breakdown.charges.map((charge, idx) => (
                <div key={idx} className="flex justify-between text-gray-600">
                  <span>{charge.displayName}</span>
                  <span>
                    {currencySymbol}
                    {charge.amount.toFixed(2)}
                  </span>
                </div>
              ))}

              <div className="border-t pt-2 flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="text-blue-600">
                  {currencySymbol}
                  {(breakdown.total || 0).toFixed(2)}
                </span>
              </div>
            </>
          ) : (
            <div className="text-red-600">Unable to calculate breakdown</div>
          )}
        </div>
      )}
    </div>
  );
}

export default DynamicPriceBreakdown;
