import { useMemo } from "react";

export const PRODUCT_FILTER_KEYS = [
  "storage",
  "ram",
  "color",
  "connectivity",
  "condition",
];

const STORAGE_REGEX = /(\d+(?:GB|TB))/i;
const CONNECTIVITY_REGEX = /\b(wi-?fi|5g|4g|lte)\b/i;
const CONDITION_ORDER = ["NEW", "LIKE_NEW"];

const hasValue = (value) =>
  value !== undefined && value !== null && String(value).trim() !== "";

const uniqueValues = (items = []) => {
  const seen = new Set();
  const unique = [];

  items.forEach((item) => {
    const raw = String(item || "").trim();
    if (!raw) return;
    const key = raw.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(raw);
  });

  return unique;
};

const parseCapacity = (value) => {
  const match = String(value || "").toUpperCase().match(/(\d+)\s*(TB|GB)/);
  if (!match) return Number.POSITIVE_INFINITY;

  const amount = Number(match[1] || 0);
  if (!Number.isFinite(amount)) return Number.POSITIVE_INFINITY;
  return match[2] === "TB" ? amount * 1024 : amount;
};

const sortCapacityValues = (values = []) =>
  [...values].sort((a, b) => parseCapacity(a) - parseCapacity(b));

const sortNumericValues = (values = []) =>
  [...values].sort((a, b) => {
    const aNum = Number.parseInt(String(a).replace(/\D/g, ""), 10) || 0;
    const bNum = Number.parseInt(String(b).replace(/\D/g, ""), 10) || 0;
    return aNum - bNum;
  });

export const normalizeFilterValue = (value) =>
  hasValue(value) ? String(value).trim().toLowerCase() : "";

export const getVariantFieldValue = (variant, field) => {
  if (!variant || !field) return "";

  const directValue = variant?.[field];
  if (hasValue(directValue)) return String(directValue).trim();

  const attributeValue = variant?.attributes?.[field];
  if (hasValue(attributeValue)) return String(attributeValue).trim();

  if (field === "storage") {
    const match = String(variant?.variantName || "").match(STORAGE_REGEX);
    return match ? match[1].toUpperCase() : "";
  }

  if (field === "connectivity") {
    const match = String(variant?.variantName || "").match(CONNECTIVITY_REGEX);
    if (!match) return "";
    const token = String(match[1] || "").toLowerCase();
    if (token === "wifi" || token === "wi-fi") return "WiFi";
    return token.toUpperCase();
  }

  return "";
};

export const variantMatchesFilter = (variant, filterType, filterValues = []) => {
  if (!Array.isArray(filterValues) || filterValues.length === 0) return true;
  if (!variant) return false;

  const variantValue = getVariantFieldValue(variant, filterType);
  if (!hasValue(variantValue)) return false;

  const normalizedVariantValue = normalizeFilterValue(variantValue);
  return filterValues.some(
    (value) => normalizeFilterValue(value) === normalizedVariantValue,
  );
};

const normalizeFilterMap = (filters = {}) => {
  const normalized = {};

  Object.entries(filters || {}).forEach(([key, values]) => {
    if (!Array.isArray(values)) {
      normalized[key] = [];
      return;
    }
    normalized[key] = uniqueValues(values);
  });

  return normalized;
};

const normalizePriceRange = (priceRange = {}) => ({
  min: hasValue(priceRange?.min) ? String(priceRange.min).trim() : "",
  max: hasValue(priceRange?.max) ? String(priceRange.max).trim() : "",
});

export const createEmptyFilters = (filterOptions = {}) => {
  const empty = {};
  Object.keys(filterOptions || {}).forEach((key) => {
    empty[key] = [];
  });
  return empty;
};

export const toggleFilterValue = (currentFilters = {}, type, value) => {
  const prevValues = Array.isArray(currentFilters?.[type])
    ? currentFilters[type]
    : [];
  const target = String(value || "").trim();

  const nextValues = prevValues.includes(target)
    ? prevValues.filter((item) => item !== target)
    : [...prevValues, target];

  return {
    ...currentFilters,
    [type]: nextValues,
  };
};

const getConditionSortIndex = (condition) => {
  const normalized = String(condition || "").trim().toUpperCase();
  const index = CONDITION_ORDER.indexOf(normalized);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
};

export const extractDynamicFilters = (products = []) => {
  const buckets = {
    storage: new Set(),
    ram: new Set(),
    color: new Set(),
    connectivity: new Set(),
    condition: new Set(),
  };

  products.forEach((product) => {
    if (hasValue(product?.condition)) {
      buckets.condition.add(String(product.condition).trim());
    }

    const variants = Array.isArray(product?.variants) ? product.variants : [];
    variants.forEach((variant) => {
      const storage = getVariantFieldValue(variant, "storage");
      const ram = getVariantFieldValue(variant, "ram");
      const color = getVariantFieldValue(variant, "color");
      const connectivity = getVariantFieldValue(variant, "connectivity");

      if (hasValue(storage)) buckets.storage.add(storage);
      if (hasValue(ram)) buckets.ram.add(ram);
      if (hasValue(color)) buckets.color.add(color);
      if (hasValue(connectivity)) buckets.connectivity.add(connectivity);
    });
  });

  const dynamic = {};

  const storageValues = sortCapacityValues(Array.from(buckets.storage));
  if (storageValues.length) dynamic.storage = storageValues;

  const ramValues = sortNumericValues(Array.from(buckets.ram));
  if (ramValues.length) dynamic.ram = ramValues;

  const colorValues = Array.from(buckets.color).sort((a, b) =>
    String(a).localeCompare(String(b), "vi"),
  );
  if (colorValues.length) dynamic.color = colorValues;

  const connectivityValues = Array.from(buckets.connectivity).sort((a, b) =>
    String(a).localeCompare(String(b), "vi"),
  );
  if (connectivityValues.length) dynamic.connectivity = connectivityValues;

  const conditionValues = Array.from(buckets.condition).sort((a, b) => {
    const indexDiff = getConditionSortIndex(a) - getConditionSortIndex(b);
    if (indexDiff !== 0) return indexDiff;
    return String(a).localeCompare(String(b), "vi");
  });
  if (conditionValues.length) dynamic.condition = conditionValues;

  return dynamic;
};

export const mergeFilterOptions = (fallbackFilters = {}, dynamicFilters = {}) => {
  const merged = {};
  const keys = new Set([
    ...Object.keys(fallbackFilters || {}),
    ...Object.keys(dynamicFilters || {}),
  ]);

  keys.forEach((key) => {
    const dynamicValues = Array.isArray(dynamicFilters?.[key])
      ? uniqueValues(dynamicFilters[key])
      : [];
    const fallbackValues = Array.isArray(fallbackFilters?.[key])
      ? uniqueValues(fallbackFilters[key])
      : [];

    const selectedValues = dynamicValues.length ? dynamicValues : fallbackValues;
    if (selectedValues.length) merged[key] = selectedValues;
  });

  return merged;
};

export const getProductMinPrice = (product) => {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const prices = variants
    .map((variant) => Number(variant?.price))
    .filter((price) => Number.isFinite(price));

  if (prices.length) return Math.min(...prices);

  const fallbackPrice = Number(product?.price);
  return Number.isFinite(fallbackPrice) ? fallbackPrice : 0;
};

const productMatchesDiscreteFilters = (product, filters = {}) => {
  const activeEntries = Object.entries(filters).filter(
    ([, values]) => Array.isArray(values) && values.length > 0,
  );

  if (!activeEntries.length) return true;

  return activeEntries.every(([filterKey, selectedValues]) => {
    if (filterKey === "condition") {
      const normalizedCondition = normalizeFilterValue(product?.condition);
      return selectedValues.some(
        (value) => normalizeFilterValue(value) === normalizedCondition,
      );
    }

    const variants = Array.isArray(product?.variants) ? product.variants : [];
    const hasVariantMatch = variants.some((variant) =>
      variantMatchesFilter(variant, filterKey, selectedValues),
    );

    if (hasVariantMatch) return true;

    const productLevelValue =
      product?.[filterKey] ?? product?.attributes?.[filterKey] ?? "";
    if (!hasValue(productLevelValue)) return false;

    const normalizedProductValue = normalizeFilterValue(productLevelValue);
    return selectedValues.some(
      (value) => normalizeFilterValue(value) === normalizedProductValue,
    );
  });
};

const productMatchesPriceRange = (product, priceRange = {}) => {
  if (!hasValue(priceRange?.min) && !hasValue(priceRange?.max)) return true;

  const minPrice = hasValue(priceRange?.min) ? Number(priceRange.min) : 0;
  const maxPrice = hasValue(priceRange?.max) ? Number(priceRange.max) : Infinity;

  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const variantPrices = variants
    .map((variant) => Number(variant?.price))
    .filter((price) => Number.isFinite(price));

  if (variantPrices.length > 0) {
    return variantPrices.some((price) => price >= minPrice && price <= maxPrice);
  }

  const fallbackPrice = Number(product?.price);
  if (!Number.isFinite(fallbackPrice)) return false;
  return fallbackPrice >= minPrice && fallbackPrice <= maxPrice;
};

export const filterProducts = (products = [], filters = {}, priceRange = {}) => {
  if (!Array.isArray(products) || products.length === 0) return [];

  const normalizedFilters = normalizeFilterMap(filters);
  const normalizedPriceRange = normalizePriceRange(priceRange);

  const hasDiscreteFilters = Object.values(normalizedFilters).some(
    (values) => Array.isArray(values) && values.length > 0,
  );
  const hasPriceFilter =
    hasValue(normalizedPriceRange.min) || hasValue(normalizedPriceRange.max);

  if (!hasDiscreteFilters && !hasPriceFilter) {
    return products;
  }

  return products.filter((product) => {
    if (!productMatchesDiscreteFilters(product, normalizedFilters)) return false;
    if (!productMatchesPriceRange(product, normalizedPriceRange)) return false;
    return true;
  });
};

export const sortProductsByOption = (products = [], sortBy = "default") => {
  const sorted = [...products];

  switch (sortBy) {
    case "price_asc":
      return sorted.sort((a, b) => getProductMinPrice(a) - getProductMinPrice(b));
    case "price_desc":
      return sorted.sort((a, b) => getProductMinPrice(b) - getProductMinPrice(a));
    case "newest":
      return sorted.sort(
        (a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0),
      );
    case "popular":
      return sorted.sort((a, b) => (b?.salesCount || 0) - (a?.salesCount || 0));
    default:
      return sorted;
  }
};

export const useProductFilters = ({
  products = [],
  filters = {},
  priceRange = { min: "", max: "" },
  fallbackFilters = {},
} = {}) => {
  const dynamicFilters = useMemo(
    () => extractDynamicFilters(products),
    [products],
  );

  const effectiveFilters = useMemo(
    () => mergeFilterOptions(fallbackFilters, dynamicFilters),
    [fallbackFilters, dynamicFilters],
  );

  const filteredProducts = useMemo(
    () => filterProducts(products, filters, priceRange),
    [products, filters, priceRange],
  );

  const activeFiltersCount = useMemo(() => {
    const normalizedFilters = normalizeFilterMap(filters);
    const normalizedPriceRange = normalizePriceRange(priceRange);

    return (
      Object.values(normalizedFilters).reduce(
        (count, values) => count + (Array.isArray(values) ? values.length : 0),
        0,
      ) + (hasValue(normalizedPriceRange.min) || hasValue(normalizedPriceRange.max) ? 1 : 0)
    );
  }, [filters, priceRange]);

  return {
    filteredProducts,
    effectiveFilters,
    dynamicFilters,
    activeFiltersCount,
  };
};

export default useProductFilters;
