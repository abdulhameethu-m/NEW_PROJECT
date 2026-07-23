export const EMPTY_ADDRESS_FORM = {
  name: "",
  phone: "",
  addressLine: "",
  district: "",
  state: "",
  pincode: "",
  country: "India",
  isDefault: false,
  latitude: "",
  longitude: "",
};

export function getAddressFormFromSavedAddress(address) {
  return {
    name: address?.name || "",
    phone: address?.phone || "",
    addressLine: address?.addressLine || "",
    district: address?.district || address?.city || "",
    state: address?.state || "",
    pincode: address?.pincode || "",
    country: address?.country || "India",
    isDefault: Boolean(address?.isDefault),
    latitude: address?.latitude || "",
    longitude: address?.longitude || "",
  };
}

export function getShippingAddressFromSavedAddress(address) {
  const fullName = String(address?.name || "").trim();
  
  return {
    fullName,
    phone: String(address?.phone || "").trim(),
    line1: String(address?.addressLine || "").trim(),
    line2: "",
    district: String(address?.district || address?.city || "").trim(),
    city: String(address?.district || address?.city || "").trim(),
    state: String(address?.state || "").trim(),
    postalCode: String(address?.pincode || "").trim(),
    country: String(address?.country || "India").trim() || "India",
  };
}

export function getAddressPayloadFromForm(form) {
  return {
    name: String(form?.name || "").trim(),
    phone: String(form?.phone || "").trim(),
    addressLine: String(form?.addressLine || "").trim(),
    district: String(form?.district || form?.city || "").trim(),
    city: String(form?.district || form?.city || "").trim(),
    state: String(form?.state || "").trim(),
    pincode: String(form?.pincode || "").trim(),
    country: String(form?.country || "India").trim() || "India",
    isDefault: Boolean(form?.isDefault),
    latitude: form?.latitude ?? "",
    longitude: form?.longitude ?? "",
  };
}

export function getShippingAddressFromForm(form) {
  const payload = getAddressPayloadFromForm(form);
  return {
    fullName: payload.name,
    phone: payload.phone,
    line1: payload.addressLine,
    line2: "",
    district: payload.district,
    city: payload.city,
    state: payload.state,
    postalCode: payload.pincode,
    country: payload.country,
  };
}

export function validateAddressForm(form) {
  const payload = getAddressPayloadFromForm(form);
  const errors = {};

  if (payload.name.length < 2) errors.name = "Enter the recipient name.";
  if (!/^[0-9]{10}$/.test(payload.phone)) errors.phone = "Enter a valid 10-digit phone number.";
  if (payload.addressLine.length < 5) errors.addressLine = "Enter a complete address.";
  if (payload.district.length < 2) errors.district = "Select the district.";
  if (payload.state.length < 2) errors.state = "Enter the state.";
  if (!/^[0-9]{6}$/.test(payload.pincode)) errors.pincode = "Enter a valid 6-digit pincode.";
  if (payload.country.length < 2) errors.country = "Enter the country.";

  return errors;
}

export function getDefaultAddress(addresses = []) {
  if (!Array.isArray(addresses) || addresses.length === 0) return null;
  return addresses.find((address) => address?.isDefault) || addresses[0] || null;
}

export function getSummaryItems(summary) {
  if (!Array.isArray(summary?.sellers)) return [];
  return summary.sellers.flatMap((seller) =>
    Array.isArray(seller?.items)
      ? seller.items.map((item) => ({
          ...item,
          sellerId: seller.sellerId,
          seller: seller.seller || seller.vendor || null,
          sellerSubtotal: seller.subtotal,
          variantId: item?.variantId || "",
          variantTitle: item?.variantTitle || "",
        }))
      : []
  );
}

export function buildPriceBreakdown(summary) {
  const items = getSummaryItems(summary);
  const mrp = items.reduce((sum, item) => {
    const original = Number(item?.originalPrice || item?.price || 0);
    return sum + original * Number(item?.quantity || 0);
  }, 0);
  const subtotal = Number(summary?.subtotal || 0);
  const charges = Array.isArray(summary?.charges) ? summary.charges : [];
  const shippingFee = Number(
    summary?.shippingFee ||
      charges.find((charge) => charge?.key === "shipping_cost")?.amount ||
      summary?.shipping?.cost ||
      0
  );
  const taxAmount = Number(
    summary?.taxAmount ||
      charges.find((charge) => charge?.key === "tax" || String(charge?.category || "").toUpperCase() === "TAX")?.amount ||
      0
  );
  const totalAmount = Number(summary?.totalAmount || summary?.total || subtotal + shippingFee + taxAmount);
  const discount = Math.max((mrp || subtotal) - subtotal, 0);

  return {
    mrp: mrp || subtotal,
    subtotal,
    discount,
    shippingFee,
    taxAmount,
    totalAmount,
    totalSavings: discount,
    itemCount: items.reduce((sum, item) => sum + Number(item?.quantity || 0), 0),
  };
}
