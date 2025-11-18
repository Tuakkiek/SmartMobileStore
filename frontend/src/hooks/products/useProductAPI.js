import { useCallback, useState } from "react";
import { toast } from "sonner";
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
      console.log("Cleaning payload for:", effectiveCategory);

      const cleaned = { ...data };
      const authStorage = localStorage.getItem("auth-storage");
      let createdBy = null;
      if (authStorage) {
        try {
          const { state } = JSON.parse(authStorage);
          createdBy = state?.user?._id || state?.user?.id;
        } catch (e) {
          console.warn("Lỗi parse auth-storage:", e);
        }
      }

      // TẠO SLUG TỪ MODEL
      const slug = cleaned.model
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");

      cleaned.slug = slug; // <--- THÊM DÒNG NÀY

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

              if (effectiveCategory === "iPhone") {
                o.storage = opt.storage;
              } else if (effectiveCategory === "iPad") {
                o.storage = opt.storage;
                o.connectivity = opt.connectivity || "WIFI";
              } else if (effectiveCategory === "Mac") {
                o.cpuGpu = opt.cpuGpu;
                o.ram = opt.ram;
                o.storage = opt.storage;
              } else if (
                ["AirPods", "Accessories", "AppleWatch"].includes(
                  effectiveCategory
                )
              ) {
                o.variantName = opt.variantName;
                if (effectiveCategory === "AppleWatch") {
                  o.bandSize = opt.bandSize || "";
                }
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
        if (!Array.isArray(cleaned.specifications)) {
          cleaned.specifications = [];
        }
      } else {
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

      // Lọc bỏ URLs rỗng VÀ GẮN VÀO PAYLOAD
      cleaned.featuredImages = (cleaned.featuredImages || [])
        .map((url) => url?.trim())
        .filter(Boolean);

      // Chỉ lấy 1 URL đầu tiên nếu là mảng, hoặc trim nếu là string
      cleaned.videoUrl = Array.isArray(cleaned.videoUrl)
        ? cleaned.videoUrl[0]?.trim() || ""
        : cleaned.videoUrl?.trim() || "";

      // ✅ ĐẢM BẢO TRƯỜNG NÀY ĐƯỢC GỬI LÊN
      if (!cleaned.featuredImages) cleaned.featuredImages = [];
      if (!cleaned.videoUrl) cleaned.videoUrl = "";

      console.log("📦 PAYLOAD GỬI LÊN:", JSON.stringify(cleaned, null, 2));
      return cleaned;
    },
    [effectiveCategory]
  );

  const handleSubmit = useCallback(
    async (e, formData) => {
      e.preventDefault();

      if (!validateForm()) {
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
          await api.update(product._id, payload);
          toast.success("Cập nhật sản phẩm thành công!");
        } else {
          const res = await api.create(payload);
          newId =
            res.data?._id ||
            res.data?.data?._id ||
            res.data?.data?.product?._id;
          toast.success("Tạo sản phẩm thành công!");
        }

        onOpenChange(false);
        onSave(newId);
      } catch (error) {
        console.error("Submit error:", error.response?.data || error);
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
