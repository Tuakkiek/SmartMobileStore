const pickValue = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    return value;
  }
  return null;
};

export const resolveAfterSalesConfig = (product = {}) => {
  const productConfig = product?.afterSalesConfig || {};
  const productTypeDefaults = product?.productType?.afterSalesDefaults || {};

  return {
    trackingMode: pickValue(
      productConfig.trackingMode,
      productTypeDefaults.trackingMode,
      "NONE"
    ),
    identifierPolicy: pickValue(
      productConfig.identifierPolicy,
      productTypeDefaults.identifierPolicy,
      "IMEI_OR_SERIAL"
    ),
    warrantyMonths: Number(
      pickValue(
        productConfig.warrantyMonths,
        productTypeDefaults.warrantyMonths,
        0
      )
    ) || 0,
    warrantyTerms: pickValue(
      productConfig.warrantyTerms,
      productTypeDefaults.warrantyTerms,
      ""
    ),
  };
};

export const isSerializedProduct = (product = {}) =>
  resolveAfterSalesConfig(product).trackingMode === "SERIALIZED";

export const formatWarrantyDuration = (months = 0) => {
  const normalizedMonths = Number(months) || 0;
  if (normalizedMonths <= 0) return "Theo chính sách cửa hàng";
  if (normalizedMonths < 12) return `${normalizedMonths} tháng`;
  const years = Math.floor(normalizedMonths / 12);
  const remainingMonths = normalizedMonths % 12;
  if (!remainingMonths) return `${years} năm`;
  return `${years} năm ${remainingMonths} tháng`;
};

export const formatIdentifierPolicy = (policy = "IMEI_OR_SERIAL") => {
  switch (policy) {
    case "IMEI":
      return "IMEI";
    case "SERIAL":
      return "Serial Number";
    case "IMEI_AND_SERIAL":
      return "IMEI và Serial Number";
    default:
      return "IMEI hoặc Serial Number";
  }
};
