// frontend/src/hooks/products/useProductAPI.js

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { generateSKU } from "@/lib/generateSKU";
import {
  iPhoneAPI,
  iPadAPI,
  macAPI,
  airPodsAPI,
  appleWatchAPI,
  accessoryAPI,
} from "@/lib/api";

const API_MAP = {
  iPhone: iPhoneAPI,
  iPad: iPadAPI,
  Mac: macAPI,
  AirPods: airPodsAPI,
  AppleWatch: appleWatchAPI,
  Accessories: accessoryAPI,
};

/**
 * Hook quản lý việc gửi (submit) form và làm sạch dữ liệu (payload)
 * @param {string} effectiveCategory - Danh mục sản phẩm
 * @param {boolean} isEdit - Chế độ chỉnh sửa hay tạo mới
 * @param {object} product - Dữ liệu sản phẩm gốc (nếu là edit)
 * @param {function} validateForm - Hàm validation
 * @param {function} onOpenChange - Hàm đóng modal
 * @param {function} onSave - Hàm callback sau khi lưu thành công
 * @returns {object} { handleSubmit, isSubmitting }
 */
export const useProductAPI = (
  effectiveCategory,
  isEdit,
  product,
  validateForm,
  onOpenChange,
  onSave
) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cleanPayload = useCallback(
    (data) => {
      console.log("🧹 Cleaning payload for:", effectiveCategory);

      const cleaned = { ...data };
      const authStorage = localStorage.getItem("auth-storage");
      let createdBy = null;
      if (authStorage) {
        try {
          // Trích xuất userId từ localStorage
          const { state } = JSON.parse(authStorage);
          createdBy = state?.user?._id || state?.user?.id;
        } catch (e) {
          console.warn("Lỗi parse auth-storage:", e);
        }
      }

      cleaned.variants = (data.variants || [])
        .map((variant) => ({
          color: String(variant.color || "").trim(),
          images: (variant.images || []).filter((img) => img.trim()),
          options: (variant.options || [])
            .map((opt) => {
              const o = {
                originalPrice: Number(opt.originalPrice || 0),
                price: Number(opt.price || 0),
                stock: Number(opt.stock || 0),
              };

              let variantOpts;

              if (effectiveCategory === "iPhone") {
                o.storage = opt.storage;
                variantOpts = o.storage;
              } else if (effectiveCategory === "iPad") {
                o.storage = opt.storage;
                o.connectivity = opt.connectivity || "WIFI";
                variantOpts = o.storage;
              } else if (effectiveCategory === "Mac") {
                o.cpuGpu = opt.cpuGpu;
                o.ram = opt.ram;
                o.storage = opt.storage;
                variantOpts = {
                  cpuGpu: o.cpuGpu,
                  ram: o.ram,
                  storage: o.storage,
                };
              } else if (
                ["AirPods", "Accessories", "AppleWatch"].includes(
                  effectiveCategory
                )
              ) {
                o.variantName = opt.variantName;
                variantOpts = o.variantName;
                if (effectiveCategory === "AppleWatch") {
                  o.bandSize = opt.bandSize || "";
                }
              }

              // Tự động tạo SKU nếu chưa có (hoặc nếu là tạo mới)
              try {
                o.sku =
                  opt.sku ||
                  generateSKU(
                    effectiveCategory,
                    cleaned.model,
                    variant.color,
                    variantOpts,
                    o.connectivity || ""
                  );
              } catch (error) {
                console.error("❌ SKU generation error:", error);
                o.sku = `${effectiveCategory}-${cleaned.model}-${
                  variant.color
                }-${Date.now()}`.toUpperCase();
              }

              return o;
            })
            .filter((o) => o.price >= 0 && o.stock >= 0),
        }))
        .filter((v) => v.color && v.options.length > 0);

      cleaned.createdBy = createdBy;
      cleaned.category = effectiveCategory;
      cleaned.name = cleaned.name.trim();
      cleaned.model = cleaned.model.trim();
      cleaned.description = (cleaned.description || "").trim();

      // HANDLE SPECIFICATIONS
      if (effectiveCategory === "Accessories") {
        // Accessories uses array of {key, value}
        if (!Array.isArray(cleaned.specifications)) {
          cleaned.specifications = [];
        }
      } else {
        // Other categories use object
        if (Array.isArray(cleaned.specifications)) {
          cleaned.specifications = {};
        }
        cleaned.specifications = {
          ...cleaned.specifications,
          colors: Array.isArray(cleaned.specifications.colors)
            ? cleaned.specifications.colors
                .map((c) => String(c).trim())
                .filter(Boolean)
            : [],
        };
      }

      console.log("✅ Cleaned payload:", JSON.stringify(cleaned, null, 2));
      return cleaned;
    },
    [effectiveCategory]
  );

  const handleSubmit = useCallback(
    async (e, formData) => {
      e.preventDefault();

      console.log("📤 Submitting form...");

      if (!validateForm()) {
        console.log("❌ Validation failed");
        return;
      }

      setIsSubmitting(true);
      try {
        const api = API_MAP[effectiveCategory];
        if (!api) {
          throw new Error(`API not found for ${effectiveCategory}`);
        }

        const payload = cleanPayload(formData);
        let newId = null;

        if (isEdit) {
          console.log("🔄 Updating product:", product._id);
          await api.update(product._id, payload);
          toast.success("Cập nhật sản phẩm thành công!");
        } else {
          console.log("➕ Creating new product");
          const res = await api.create(payload);
          newId =
            res.data?._id ||
            res.data?.data?._id ||
            res.data?.data?.product?._id;
          console.log("✅ Created product with ID:", newId);
          toast.success("Tạo sản phẩm thành công!");
        }

        onOpenChange(false);
        onSave(newId);
      } catch (error) {
        console.error("❌ Submit error:", error.response?.data || error);
        toast.error(error.response?.data?.message || "Lưu thất bại");
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      effectiveCategory,
      isEdit,
      product,
      validateForm,
      cleanPayload,
      onOpenChange,
      onSave,
    ]
  );

  return { handleSubmit, isSubmitting };
};
