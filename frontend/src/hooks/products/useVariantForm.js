// frontend/src/hooks/products/useVariantForm.js

import { useCallback } from "react";
import { emptyVariant } from "@/lib/productConstants";

/**
 * Hook quản lý logic cho phần variants của ProductEditModal
 * @param {object} formData - Dữ liệu form hiện tại
 * @param {function} setFormData - Hàm cập nhật formData
 * @param {string} effectiveCategory - Danh mục sản phẩm
 * @returns {object} Các hàm xử lý biến thể
 */
export const useVariantForm = (formData, setFormData, effectiveCategory) => {
  const addVariant = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      variants: [...prev.variants, emptyVariant(effectiveCategory)],
    }));
  }, [effectiveCategory, setFormData]);

  const removeVariant = useCallback(
    (vIdx) => {
      setFormData((prev) => ({
        ...prev,
        variants: prev.variants.filter((_, i) => i !== vIdx),
      }));
    },
    [setFormData]
  );

  const handleVariantChange = useCallback(
    (vIdx, field, value) => {
      if (!formData) return;
      const variants = [...formData.variants];
      variants[vIdx] = { ...variants[vIdx], [field]: value };
      setFormData((prev) => ({ ...prev, variants }));
    },
    [formData, setFormData]
  );

  // IMAGE HANDLERS
  const handleVariantImageChange = useCallback(
    (vIdx, imgIdx, value) => {
      if (!formData) return;
      const variants = [...formData.variants];
      variants[vIdx].images[imgIdx] = value;
      setFormData((prev) => ({ ...prev, variants }));
    },
    [formData, setFormData]
  );

  const addVariantImage = useCallback(
    (vIdx) => {
      if (!formData) return;
      const variants = [...formData.variants];
      variants[vIdx].images.push("");
      setFormData((prev) => ({ ...prev, variants }));
    },
    [formData, setFormData]
  );

  const removeVariantImage = useCallback(
    (vIdx, imgIdx) => {
      if (!formData) return;
      const variants = [...formData.variants];
      variants[vIdx].images = variants[vIdx].images.filter(
        (_, i) => i !== imgIdx
      );
      setFormData((prev) => ({ ...prev, variants }));
    },
    [formData, setFormData]
  );

  // OPTION HANDLERS
  const addVariantOption = useCallback(
    (vIdx) => {
      if (!formData) return;
      const variants = [...formData.variants];
      const newOption = {
        sku: "",
        originalPrice: "",
        price: "",
        stock: "",
      };

      // THÊM FIELD PHÙ HỢP
      if (effectiveCategory === "iPhone") {
        newOption.storage = "";
      } else if (effectiveCategory === "iPad") {
        newOption.storage = "";
        newOption.connectivity = "WIFI";
      } else if (effectiveCategory === "Mac") {
        newOption.cpuGpu = "";
        newOption.ram = "";
        newOption.storage = "";
      } else if (
        ["AirPods", "AppleWatch", "Accessories"].includes(effectiveCategory)
      ) {
        newOption.variantName = "";
        if (effectiveCategory === "AppleWatch") {
          newOption.bandSize = "";
        }
      }

      variants[vIdx].options.push(newOption);
      setFormData((prev) => ({ ...prev, variants }));
    },
    [formData, effectiveCategory, setFormData]
  );

  const removeVariantOption = useCallback(
    (vIdx, oIdx) => {
      if (!formData) return;
      const variants = [...formData.variants];
      variants[vIdx].options = variants[vIdx].options.filter(
        (_, i) => i !== oIdx
      );
      setFormData((prev) => ({ ...prev, variants }));
    },
    [formData, setFormData]
  );

  const handleVariantOptionChange = useCallback(
    (vIdx, oIdx, field, value) => {
      if (!formData) return;
      const variants = [...formData.variants];
      variants[vIdx].options[oIdx] = {
        ...variants[vIdx].options[oIdx],
        [field]: value,
      };
      setFormData((prev) => ({ ...prev, variants }));
    },
    [formData, setFormData]
  );

  return {
    addVariant,
    removeVariant,
    handleVariantChange,
    handleVariantImageChange,
    addVariantImage,
    removeVariantImage,
    handleVariantOptionChange,
    addVariantOption,
    removeVariantOption,
  };
};
