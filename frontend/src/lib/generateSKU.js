// ============================================
// FILE: src/lib/generateSKU.js
// ✅ UPDATED 2025: Unified SKU generation logic for all categories
// ============================================

export function generateSKU(category, model, color, variantOptions, connectivity = '') {
  // Định nghĩa prefix cho từng danh mục
  const prefix = {
    iPhone: "IPHONE",
    iPad: "IPAD",
    Mac: "MAC",
    AirPods: "AIRPOD",
    AppleWatch: "APPLEWATCH",
    Accessories: "ACCESSORY",
  }[category] || "GEN";

  // Hàm chuẩn hóa chuỗi: bỏ dấu, chuyển thành chữ hoa, xóa khoảng trắng
  const normalize = (str) =>
    (str || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")  // Loại bỏ dấu tiếng Việt
      .toUpperCase()
      .replace(/\s+/g, "");  // Loại bỏ khoảng trắng

  // Chuẩn hóa các tham số
  const normalizedModel = normalize(model || "UNKNOWN");
  const normalizedColor = normalize(color || "UNKNOWN");
  const normalizedConnectivity = normalize(connectivity || "");

  let normalizedStorage = "";
  let normalizedCpuGpu = "";
  let normalizedRam = "";
  let normalizedVariantName = "";
  let normalizedBandSize = "";

  if (category === "Mac") {
    if (typeof variantOptions !== "object") {
      throw new Error("For Mac, variantOptions must be an object with cpuGpu, ram, storage");
    }
    normalizedCpuGpu = normalize(variantOptions.cpuGpu || "");
    normalizedRam = normalize(variantOptions.ram || "");
    normalizedStorage = normalize(variantOptions.storage || "");
  } else if (category === "AppleWatch") {
    if (typeof variantOptions !== "object") {
      throw new Error("For Apple Watch, variantOptions must be an object with variantName, bandSize");
    }
    normalizedVariantName = normalize(variantOptions.variantName || "");
    normalizedBandSize = normalize(variantOptions.bandSize || "");
  } else {
    if (typeof variantOptions === "string") {
      if (["iPhone", "iPad"].includes(category)) {
        normalizedStorage = normalize(variantOptions);
      } else {
        normalizedVariantName = normalize(variantOptions);
      }
    } else if (typeof variantOptions === "object") {
      normalizedStorage = normalize(variantOptions.storage || "");
      normalizedVariantName = normalize(variantOptions.variantName || "");
      normalizedBandSize = normalize(variantOptions.bandSize || "");
    }
  }

  switch (category) {
    case "iPhone":
      return `${prefix}-${normalizedModel}-${normalizedColor}-${normalizedStorage}`;
    case "iPad":
      return `${prefix}-${normalizedModel}-${normalizedColor}-${normalizedStorage}-${normalizedConnectivity}`;
    case "Mac":
      return `${prefix}-${normalizedModel}-${normalizedColor}-${normalizedCpuGpu}-${normalizedRam}-${normalizedStorage}`;
    case "AirPods":
      return `${prefix}-${normalizedModel}-${normalizedColor}-${normalizedVariantName}`;
    case "AppleWatch":
      return `${prefix}-${normalizedModel}-${normalizedColor}-${normalizedVariantName}-${normalizedBandSize}`;
    case "Accessories":
      return `${prefix}-${normalizedModel}-${normalizedColor}-${normalizedVariantName}`;
    default:
      return `${prefix}-${normalizedModel}-${normalizedColor}`;
  }
}