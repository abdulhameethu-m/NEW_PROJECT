export const DEFAULT_CURRENCY = "INR";
export const DEFAULT_LOCALE = "en-IN";

export function formatCurrency(amount, { currency = DEFAULT_CURRENCY, locale = DEFAULT_LOCALE } = {}) {
  const value = Number(amount || 0);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(Number.isFinite(value) ? value : 0);
}

