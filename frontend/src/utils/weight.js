export function getWeightValue(source) {
  if (source?.weight && typeof source.weight === "object") {
    const nestedValue = Number(source.weight.value);
    if (Number.isFinite(nestedValue) && nestedValue > 0) {
      return nestedValue;
    }
  }

  const directValue = Number(source?.weight);
  if (Number.isFinite(directValue) && directValue > 0) {
    return directValue;
  }

  return 0;
}

export function getWeightUnit(source) {
  if (source?.weight && typeof source.weight === "object" && source.weight.unit) {
    return source.weight.unit;
  }
  return "kg";
}

export function formatWeight(value, unit = "kg") {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return "";
  }

  const formatted = Number.isInteger(numericValue)
    ? String(numericValue)
    : numericValue.toFixed(3).replace(/\.?0+$/, "");

  return `${formatted} ${unit}`;
}

export function getFormattedWeight(source) {
  const value = getWeightValue(source);
  if (!value) {
    return "";
  }
  return formatWeight(value, getWeightUnit(source));
}
