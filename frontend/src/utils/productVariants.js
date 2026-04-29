function slugifyPart(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildVariantId(attributes = {}) {
  return Object.entries(attributes)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${slugifyPart(key)}-${slugifyPart(value)}`)
    .join("__");
}

export function buildVariantTitle(options = []) {
  return options.map((item) => item.value).filter(Boolean).join(" / ");
}

export function buildVariantCombinations(variantDefs = [], selectedValues = {}) {
  const defs = variantDefs
    .map((def) => ({
      ...def,
      values: Array.isArray(selectedValues?.[def.key])
        ? selectedValues[def.key].map((item) => String(item).trim()).filter(Boolean)
        : [],
    }));

  if (!defs.length) return [];
  if (defs.some((def) => def.values.length === 0)) return [];

  const combinations = [];

  function traverse(index, currentAttributes, currentOptions) {
    if (index >= defs.length) {
      combinations.push({
        variantId: buildVariantId(currentAttributes),
        attributes: currentAttributes,
        options: currentOptions,
        title: buildVariantTitle(currentOptions),
      });
      return;
    }

    const def = defs[index];
    for (const value of def.values) {
      traverse(
        index + 1,
        { ...currentAttributes, [def.key]: value },
        [...currentOptions, { key: def.key, name: def.name, value }]
      );
    }
  }

  traverse(0, {}, []);
  return combinations;
}

export function parseCommaSeparatedValues(value = "") {
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function mergeVariantRows({
  combinations = [],
  existingVariants = [],
  basePrice = 0,
  baseDiscountPrice = "",
  baseStock = 0,
  baseWeight = 0,
  productNumber = "",
}) {
  const existingById = new Map((existingVariants || []).map((variant) => [variant.variantId, variant]));

  return combinations.map((combination, index) => {
    const existing = existingById.get(combination.variantId);
    const suffix = combination.options
      .map((item) => slugifyPart(item.value).slice(0, 4).toUpperCase())
      .filter(Boolean)
      .join("-");

    return {
      variantId: combination.variantId,
      title: combination.title,
      attributes: combination.attributes,
      options: combination.options,
      price: existing?.price ?? basePrice ?? "",
      discountPrice: existing?.discountPrice ?? baseDiscountPrice ?? "",
      stock: existing?.stock ?? baseStock ?? 0,
      weight: existing?.weight?.value ?? existing?.weight ?? baseWeight ?? 0,
      sku: existing?.sku || [productNumber, suffix].filter(Boolean).join("-") || `VAR-${index + 1}`,
      images: Array.isArray(existing?.images) ? existing.images : [],
      isDefault: Boolean(existing?.isDefault) || index === 0,
      isActive: existing?.isActive !== false,
      imageUrlsText: Array.isArray(existing?.images) ? existing.images.map((image) => image.url).join(", ") : "",
    };
  });
}

export function normalizeVariantPayloadRows(rows = [], productName = "") {
  const firstActiveIndex = rows.findIndex((row) => row.isActive !== false && Number(row.stock || 0) > 0);
  const fallbackDefaultIndex = firstActiveIndex >= 0 ? firstActiveIndex : 0;

  return rows.map((row, index) => ({
    variantId: row.variantId,
    title: row.title,
    attributes: row.attributes,
    options: row.options,
    price: Number(row.price || 0),
    ...(row.discountPrice !== "" && row.discountPrice !== undefined && row.discountPrice !== null
      ? { discountPrice: Number(row.discountPrice) }
      : {}),
    stock: Number(row.stock || 0),
    weight: {
      value: Number(row.weight || 0),
      unit: "kg",
    },
    sku: String(row.sku || "").trim().toUpperCase(),
    images: parseCommaSeparatedValues(row.imageUrlsText).map((url, imageIndex) => ({
      url,
      altText: row.title ? `${productName} ${row.title}` : productName,
      isPrimary: imageIndex === 0,
    })),
    isDefault: index === fallbackDefaultIndex,
    isActive: row.isActive !== false,
  }));
}

export function getVariantGroups(product) {
  const variants = Array.isArray(product?.variants) ? product.variants.filter((item) => item?.isActive !== false) : [];
  const configKeys = Array.isArray(product?.variantConfig) ? product.variantConfig : [];
  const groups = new Map();

  for (const variant of variants) {
    const options = Array.isArray(variant.options) ? variant.options : [];
    for (const option of options) {
      if (!groups.has(option.key)) {
        groups.set(option.key, {
          key: option.key,
          name: option.name,
          values: [],
        });
      }
      const group = groups.get(option.key);
      if (!group.values.some((item) => item.value === option.value)) {
        group.values.push({
          value: option.value,
          inStock: variants.some(
            (candidate) => candidate.attributes?.[option.key] === option.value && Number(candidate.stock || 0) > 0 && candidate.isActive !== false
          ),
        });
      }
    }
  }

  return [...groups.values()].sort((a, b) => {
    const aIndex = configKeys.indexOf(a.key);
    const bIndex = configKeys.indexOf(b.key);
    return (aIndex < 0 ? 999 : aIndex) - (bIndex < 0 ? 999 : bIndex) || a.name.localeCompare(b.name);
  });
}

export function findMatchingVariant(variants = [], selectedAttributes = {}) {
  return (
    variants.find((variant) =>
      Object.entries(selectedAttributes).every(([key, value]) => variant?.attributes?.[key] === value)
    ) || null
  );
}

export function getDefaultVariant(product) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  return (
    variants.find((variant) => variant.isDefault && variant.isActive !== false && Number(variant.stock || 0) > 0) ||
    variants.find((variant) => variant.isActive !== false && Number(variant.stock || 0) > 0) ||
    variants.find((variant) => variant.isActive !== false) ||
    null
  );
}
