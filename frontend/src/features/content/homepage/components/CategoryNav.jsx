import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Smartphone,
  Tablet,
  Laptop,
  Watch,
  Headphones,
  Box,
  Package,
} from "lucide-react";
import { productTypeAPI } from "@/features/catalog";

const ICON_BY_KEYWORD = [
  { keywords: ["phone", "smartphone", "iphone", "dien-thoai"], icon: Smartphone },
  { keywords: ["tablet", "ipad", "may-tinh-bang"], icon: Tablet },
  { keywords: ["laptop", "mac", "macbook"], icon: Laptop },
  { keywords: ["watch", "smartwatch", "dong-ho"], icon: Watch },
  { keywords: ["headphone", "airpod", "tai-nghe"], icon: Headphones },
  { keywords: ["accessor", "phu-kien"], icon: Box },
];

// Danh mục không còn hardcode - được lấy động từ API product-types

const normalizeText = (value = "") =>
  String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

// Thứ tự ưu tiên danh mục: 1 = hiển thị đầu tiên, 99 = cuối
const CATEGORY_PRIORITY = [
  { order: 1, keywords: ["dien thoai", "smartphone", "iphone", "mobile"] },
  { order: 2, keywords: ["tablet", "ipad", "may tinh bang"] },
  { order: 3, keywords: ["laptop", "macbook", "may tinh xach tay", "notebook", "mac"] },
  { order: 4, keywords: ["dong ho", "smartwatch", "watch", "apple watch"] },
  { order: 5, keywords: ["tai nghe", "headphone", "airpod", "earphone", "earbuds"] },
  { order: 6, keywords: ["phu kien", "accessor", "cable", "sac", "charger"] },
];

const getCategoryPriority = (type) => {
  const key = normalizeText(`${type?.slug || ""} ${type?.name || ""}`);
  const matched = CATEGORY_PRIORITY.find((p) =>
    p.keywords.some((kw) => key.includes(kw))
  );
  return matched?.order ?? 99;
};

const sortByPriority = (types) =>
  [...types].sort((a, b) => getCategoryPriority(a) - getCategoryPriority(b));

const isLikelyImageUrl = (value = "") => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return true;
  if (trimmed.startsWith("/")) return true;
  return /\.(png|jpe?g|webp|svg|gif|avif)$/i.test(trimmed);
};

const resolveIconComponent = (type) => {
  const key = normalizeText(`${type?.slug || ""} ${type?.name || ""}`);
  const matched = ICON_BY_KEYWORD.find((item) =>
    item.keywords.some((keyword) => key.includes(keyword))
  );
  return matched?.icon || Package;
};

const getProductImageFallback = (allProducts, type) => {
  if (!Array.isArray(allProducts) || allProducts.length === 0) return "";

  const typeId = String(type?._id || "").trim();
  const typeSlug = normalizeText(type?.slug || "");
  const typeName = normalizeText(type?.name || "");

  const matchedProduct = allProducts.find((product) => {
    const productType = product?.productType;
    const productTypeId =
      typeof productType === "object" ? String(productType?._id || "") : String(productType || "");
    const productTypeSlug =
      typeof productType === "object" ? normalizeText(productType?.slug || "") : "";
    const productTypeName =
      typeof productType === "object"
        ? normalizeText(productType?.name || "")
        : normalizeText(product?.category || "");

    if (typeId && productTypeId === typeId) return true;
    if (typeSlug && productTypeSlug === typeSlug) return true;
    if (typeName && productTypeName === typeName) return true;
    return false;
  });

  if (!matchedProduct) return "";

  return (
    matchedProduct?.variants?.[0]?.images?.[0] ||
    matchedProduct?.featuredImages?.[0] ||
    matchedProduct?.images?.[0] ||
    ""
  );
};

const CategoryNav = ({ allProducts = [] }) => {
  const navigate = useNavigate();
  const [productTypes, setProductTypes] = useState([]);

  useEffect(() => {
    const loadProductTypes = async () => {
      try {
        const response = await productTypeAPI.getPublic({ limit: 100 });
        const items = response?.data?.data?.productTypes;
        if (Array.isArray(items) && items.length > 0) {
          setProductTypes(sortByPriority(items));
          return;
        }
        setProductTypes([]);
      } catch (error) {
        console.error("Failed to load public product types:", error);
        setProductTypes([]);
      }
    };

    loadProductTypes();
  }, []);

  const categories = useMemo(() => {
    return productTypes.map((type) => ({
      id: String(type?._id || ""),
      name: String(type?.name || "Sản phẩm"),
      image: isLikelyImageUrl(type?.icon)
        ? String(type.icon).trim()
        : getProductImageFallback(allProducts, type),
      Icon: resolveIconComponent(type),
      isLegacy: false,
    }));
  }, [productTypes, allProducts]);

  const handleCategoryClick = (category) => {
    if (!category) return;

    if (!category.id) {
      navigate(`/products?search=${encodeURIComponent(category.name)}`);
      return;
    }

    const params = new URLSearchParams();
    params.set("productType", category.id);
    params.set("productTypeName", category.name);
    params.set("page", "1");
    navigate(`/products?${params.toString()}`);
  };

  return (
    <section className="bg-white border-b border-gray-100 py-6">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
          {categories.map((category) => {
            const Icon = category.Icon;

            return (
              <button
                key={category.id || category.name}
                onClick={() => handleCategoryClick(category)}
                className="group flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-xl hover:bg-primary hover:shadow-lg transition-all duration-300"
              >
                <div className="w-12 h-12 flex items-center justify-center rounded-full bg-white group-hover:bg-white/90 transition-colors overflow-hidden">
                  {category.image ? (
                    <img
                      src={category.image}
                      alt={category.name}
                      className="w-8 h-8 object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <Icon className="w-6 h-6 text-primary transition-transform group-hover:scale-110" />
                  )}
                </div>
                <div className="text-center">
                  <span className="text-xs md:text-sm font-medium text-gray-900 group-hover:text-white block">
                    {category.name}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CategoryNav;
