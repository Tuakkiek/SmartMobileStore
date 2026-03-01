// ============================================
// FILE: frontend/src/components/shared/CategoryDropdown.jsx
// Dynamic category dropdown based on universal products
// ============================================
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Package, X, ChevronRight } from "lucide-react";
import { universalProductAPI } from "@/lib/api";

const PRODUCT_TYPE_TO_CATEGORY_PATH = {
  smartphone: "dien-thoai",
  tablet: "may-tinh-bang",
  laptop: "macbook",
  smartwatch: "apple-watch",
  headphone: "tai-nghe",
  tv: "tivi",
  monitor: "man-hinh",
  keyboard: "ban-phim",
  mouse: "chuot",
  speaker: "loa",
  camera: "may-anh",
  "gaming-console": "may-choi-game",
  accessories: "phu-kien",
};

const CATEGORY_FALLBACK_IMAGES = {
  smartphone: "/iphone_17_pro_bac.png",
  tablet: "/ipad_air_xanh.png",
  laptop: "/mac.png",
  headphone: "/airpods.png",
  smartwatch: "/applewatch.png",
  accessories: "/op_ip_17_pro.png",
};

const normalizeText = (value = "") =>
  String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const slugify = (value = "") =>
  normalizeText(value)
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");

const getVariantStorageSuffix = (variantName = "") => {
  const match = String(variantName).match(/^(\d+(?:GB|TB))/i);
  return match ? `-${match[1].toLowerCase()}` : "";
};

const pickBestVariant = (variants = []) => {
  if (!Array.isArray(variants) || variants.length === 0) return null;
  let variant = variants.find((v) => v?.stock > 0 && v?.sku && v?.slug);
  if (!variant) variant = variants.find((v) => v?.sku && v?.slug);
  if (!variant) variant = variants.find((v) => v?.sku);
  if (!variant) variant = variants[0];
  return variant || null;
};

const getProductImage = (product) => {
  const bestVariant = pickBestVariant(product?.variants);
  return (
    bestVariant?.images?.[0] ||
    product?.featuredImages?.[0] ||
    product?.images?.[0] ||
    "/placeholder.png"
  );
};

const getSeriesName = (product, categorySlug, categoryName) => {
  const sourceName = String(product?.name || product?.model || "").trim();
  if (!sourceName) return categoryName || "Sản phẩm";

  const normalized = normalizeText(sourceName);
  const normalizedCategory = normalizeText(categoryName);
  const normalizedSlug = normalizeText(categorySlug);

  if (normalized.includes("iphone")) {
    const match = sourceName.match(/iPhone\s+(\d+[A-Za-z]*)/i);
    if (match) return `iPhone ${match[1]} Series`;
  }

  if (normalized.includes("ipad")) {
    if (/pro/i.test(sourceName)) return "iPad Pro";
    if (/air/i.test(sourceName)) return "iPad Air";
    if (/mini/i.test(sourceName)) return "iPad Mini";
    return "iPad";
  }

  if (normalized.includes("macbook") || normalized.includes("mac ")) {
    if (/macbook\s+pro/i.test(sourceName)) return "MacBook Pro";
    if (/macbook\s+air/i.test(sourceName)) return "MacBook Air";
    if (/imac/i.test(sourceName)) return "iMac";
    return "Mac";
  }

  if (normalized.includes("airpods")) {
    if (/max/i.test(sourceName)) return "AirPods Max";
    if (/pro/i.test(sourceName)) return "AirPods Pro";
    return "AirPods";
  }

  if (normalized.includes("watch")) {
    if (/ultra/i.test(sourceName)) return "Apple Watch Ultra";
    if (/se/i.test(sourceName)) return "Apple Watch SE";
    const series = sourceName.match(/Series\s+(\d+)/i);
    if (series) return `Apple Watch Series ${series[1]}`;
    return "Apple Watch";
  }

  if (normalizedSlug === "accessories" || normalizedCategory.includes("phu kien")) {
    return "Phụ kiện";
  }

  return String(product?.model || product?.name || categoryName || "Sản phẩm").trim();
};

const getSortedSeries = (products, categorySlug, categoryName) => {
  const groups = {};
  products.forEach((product) => {
    const seriesName = getSeriesName(product, categorySlug, categoryName);
    if (!groups[seriesName]) {
      groups[seriesName] = { seriesName, products: [], image: "" };
    }
    groups[seriesName].products.push(product);
  });

  return Object.values(groups)
    .map((group) => ({
      ...group,
      image: getProductImage(group.products[0]),
      products: [...group.products].sort((a, b) =>
        String(a?.name || "").localeCompare(String(b?.name || ""), "vi")
      ),
    }))
    .sort((a, b) => {
      const aNum = parseInt(String(a.seriesName).match(/\d+/)?.[0] || "0", 10);
      const bNum = parseInt(String(b.seriesName).match(/\d+/)?.[0] || "0", 10);
      if (aNum && bNum) return bNum - aNum;
      return String(a.seriesName).localeCompare(String(b.seriesName), "vi");
    });
};

const calculateTopSellers = (products = []) => {
  if (!Array.isArray(products) || products.length === 0) return [];
  const withSales = products.filter((p) => (p?.salesCount || 0) > 0);
  const source = withSales.length > 0 ? withSales : products;
  return [...source]
    .sort((a, b) => {
      if ((b?.salesCount || 0) !== (a?.salesCount || 0)) {
        return (b?.salesCount || 0) - (a?.salesCount || 0);
      }
      return new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0);
    })
    .slice(0, 4);
};

const buildDynamicCategories = (products = []) => {
  const map = new Map();

  products.forEach((product) => {
    const typeObj = typeof product?.productType === "object" ? product.productType : null;
    const typeId = String(typeObj?._id || product?.productType || "").trim();
    const typeName = String(typeObj?.name || "Sản phẩm").trim();
    const typeSlug = String(typeObj?.slug || slugify(typeName)).trim();
    const key = typeId || typeSlug || typeName;

    if (!map.has(key)) {
      map.set(key, {
        id: typeId || typeSlug,
        name: typeName,
        slug: typeSlug,
        products: [],
      });
    }
    map.get(key).products.push(product);
  });

  return Array.from(map.values())
    .map((category) => {
      const categoryImage =
        CATEGORY_FALLBACK_IMAGES[category.slug] || getProductImage(category.products[0]);
      return {
        ...category,
        image: categoryImage,
        series: getSortedSeries(category.products, category.slug, category.name),
        topSellers: calculateTopSellers(category.products),
      };
    })
    .sort((a, b) => String(a.name).localeCompare(String(b.name), "vi"));
};

const buildProductDetailUrl = (product) => {
  if (!product) return "";
  const baseSlug = product.baseSlug || product.slug;
  if (!baseSlug) return "";

  const variant = pickBestVariant(product.variants);
  const categoryPath =
    PRODUCT_TYPE_TO_CATEGORY_PATH[product?.productType?.slug] || "products";
  const storageSuffix = getVariantStorageSuffix(variant?.variantName || "");
  const productSlug = `${baseSlug}${storageSuffix}`;

  if (variant?.sku) {
    if (categoryPath === "products") {
      return `/products/${baseSlug}?sku=${variant.sku}`;
    }
    return `/${categoryPath}/${productSlug}?sku=${variant.sku}`;
  }

  if (categoryPath === "products") {
    return `/products/${baseSlug}`;
  }

  return `/${categoryPath}/${productSlug}`;
};

const CategoryDropdown = ({
  isMobileMenu = false,
  isOpen: controlledIsOpen,
  onClose = () => {},
}) => {
  const navigate = useNavigate();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const dropdownRef = useRef(null);

  const isOpen = isMobileMenu ? Boolean(controlledIsOpen) : internalIsOpen;

  const closePanel = useCallback(() => {
    if (isMobileMenu) {
      onClose();
      return;
    }
    setInternalIsOpen(false);
  }, [isMobileMenu, onClose]);

  const fetchCategoryData = useCallback(async () => {
    if (loading || loaded) return;
    setLoading(true);
    try {
      const response = await universalProductAPI.getAll({
        page: 1,
        limit: 500,
        status: "AVAILABLE",
      });
      const products = response?.data?.data?.products || [];
      const dynamicCategories = buildDynamicCategories(products);
      setCategories(dynamicCategories);
      setSelectedCategory(0);
      setLoaded(true);
    } catch (error) {
      console.error("Error loading dynamic categories:", error);
      setCategories([]);
      setLoaded(false);
    } finally {
      setLoading(false);
    }
  }, [loading, loaded]);

  useEffect(() => {
    if (!isOpen) return;
    fetchCategoryData();
  }, [isOpen, fetchCategoryData]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        if (!isMobileMenu) {
          setInternalIsOpen(false);
        }
      }
    };

    if (isOpen && !isMobileMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, isMobileMenu]);

  const currentCategory = categories[selectedCategory];
  const currentSeries = currentCategory?.series || [];
  const currentTopSellers = useMemo(
    () => currentCategory?.topSellers || [],
    [currentCategory]
  );

  const handleCategoryClick = (index) => {
    setSelectedCategory(index);
  };

  const navigateToCategory = (category, seriesName = "") => {
    if (!category) return;

    if (!category.id) {
      const fallbackKeyword = seriesName || category.name || "";
      navigate(`/tim-kiem?s=${encodeURIComponent(fallbackKeyword)}`);
      closePanel();
      return;
    }

    const params = new URLSearchParams();
    params.set("productType", category.id);
    params.set("productTypeName", category.name || "Sản phẩm");
    if (seriesName) params.set("model", seriesName);
    params.set("page", "1");

    navigate(`/products?${params.toString()}`);
    closePanel();
  };

  const navigateToProductDetail = (product) => {
    const targetUrl = buildProductDetailUrl(product);
    if (!targetUrl) return;
    closePanel();
    window.location.href = targetUrl;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {!isMobileMenu && (
        <button
          onMouseEnter={() => setInternalIsOpen(true)}
          className="hidden md:flex bg-white text-black rounded-full px-6 py-3 items-center gap-2 transition-all duration-300 hover:bg-gray-100 hover:scale-105 shadow-sm font-medium"
        >
          <Menu className="w-5 h-5" />
          Danh mục
        </button>
      )}

      {isOpen && (
        <>
          {isMobileMenu && (
            <div className="md:hidden fixed inset-0 z-40" onClick={closePanel} />
          )}

          <div
            className={`
              ${
                isMobileMenu
                  ? "fixed bottom-16 left-0 right-0 h-[66vh] z-50 bg-white rounded-t-3xl shadow-2xl overflow-hidden"
                  : "fixed inset-0 top-20 z-50 bg-white overflow-y-auto"
              }
              md:inset-auto md:top-20 md:left-1/2 md:-translate-x-1/2 md:w-[1200px] md:h-[600px] md:rounded-3xl md:shadow-2xl md:overflow-hidden md:bg-white/40 md:backdrop-blur-3xl md:border md:border-white/20
            `}
            onClick={(event) => event.stopPropagation()}
          >
            {isMobileMenu && (
              <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex flex-col items-center flex-shrink-0">
                <div className="w-12 h-1 bg-gray-300 rounded-full mb-2" />
                <div className="flex items-center justify-between w-full">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Danh mục sản phẩm
                  </h2>
                  <button
                    onClick={closePanel}
                    className="text-gray-700 hover:text-black"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
            )}

            <div
              className={`flex h-full ${
                isMobileMenu ? "flex-col" : "flex-col md:flex-row"
              }`}
            >
              <div
                className={`w-full bg-gray-50 p-2 md:w-80 md:p-6 md:overflow-y-auto ${
                  isMobileMenu ? "flex-shrink-0" : ""
                }`}
              >
                <div className="flex gap-2 overflow-x-auto md:flex-col md:space-y-1 md:overflow-x-hidden pb-2 md:pb-0 scrollbar-hide">
                  {categories.map((category, index) => (
                    <button
                      key={category.id || `${category.slug}-${index}`}
                      onClick={() => handleCategoryClick(index)}
                      onMouseEnter={() => handleCategoryClick(index)}
                      className={`flex-shrink-0 w-20 p-2 flex flex-col items-center gap-1 rounded-xl md:w-full md:flex-row md:items-center md:gap-3 md:px-4 md:py-3 md:text-left font-medium transition-all ${
                        selectedCategory === index
                          ? "bg-white text-black shadow-sm"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <img
                        src={category.image || "/placeholder.png"}
                        alt={category.name}
                        className="w-14 h-14 md:w-10 md:h-10 object-contain"
                      />
                      <span className="text-center text-xs md:text-left md:text-base">
                        {category.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 p-4 overflow-y-auto md:p-8 bg-white md:bg-transparent pb-6">
                {loading ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      {[...Array(4)].map((_, index) => (
                        <div key={index} className="animate-pulse">
                          <div className="w-16 h-16 bg-gray-200 rounded-lg mx-auto" />
                          <div className="h-3 bg-gray-200 rounded mt-2 w-16 mx-auto" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : !currentCategory ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <p>Không có dữ liệu danh mục</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-6 md:mb-10">
                      <h3 className="text-base md:text-lg font-bold mb-4 md:mb-5 flex items-center gap-2 text-gray-900">
                        <span className="inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 bg-red-500 text-white text-xs font-bold rounded-full shadow-lg">
                          HOT
                        </span>
                        Sản phẩm bán chạy
                      </h3>

                      {currentTopSellers.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                          {currentTopSellers.map((product) => (
                            <button
                              key={product._id}
                              onClick={() => navigateToProductDetail(product)}
                              className="group relative text-center hover:-translate-y-2 transition-all duration-300 flex flex-col h-full justify-start"
                            >
                              <div className="w-20 h-20 md:w-24 md:h-24 mx-auto bg-white rounded-2xl overflow-hidden shadow-md mb-2 md:mb-3 flex-shrink-0">
                                <img
                                  src={getProductImage(product)}
                                  alt={product.name}
                                  className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                                  loading="lazy"
                                />
                              </div>
                              <p className="text-xs md:text-sm font-medium line-clamp-2 text-gray-800 px-1 leading-tight">
                                {product.name}
                              </p>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                          {[...Array(4)].map((_, index) => (
                            <div key={index} className="animate-pulse text-center">
                              <div className="w-20 h-20 md:w-24 md:h-24 mx-auto bg-gray-200 rounded-2xl mb-2 md:mb-3" />
                              <div className="h-3 md:h-4 bg-gray-200 rounded-full w-16 md:w-20 mx-auto" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <h3 className="text-sm text-black font-semibold mb-3 md:mb-4 md:text-lg">
                      Chọn theo dòng {currentCategory.name}
                    </h3>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-6">
                      {currentSeries.map((series, index) => (
                        <button
                          key={`${series.seriesName}-${index}`}
                          onClick={() =>
                            navigateToCategory(currentCategory, series.seriesName)
                          }
                          className="bg-white rounded-xl border border-gray-200 p-3 hover:shadow-lg transition-all text-left group md:p-4"
                        >
                          <div className="flex gap-3 items-start mb-3">
                            <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0">
                              {series.image ? (
                                <img
                                  src={series.image}
                                  alt={series.seriesName}
                                  className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  <Package className="w-6 h-6 md:w-8 md:h-8" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-sm text-gray-900 md:text-base mb-1">
                                {series.seriesName}
                              </h4>
                              <p className="text-xs text-gray-500">
                                {series.products.length} sản phẩm
                              </p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                          </div>

                          <div className="space-y-1 text-xs text-gray-600 md:text-sm">
                            {series.products.slice(0, 2).map((product, itemIndex) => (
                              <p
                                key={`${product._id}-${itemIndex}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  navigateToProductDetail(product);
                                }}
                                className="hover:text-black cursor-pointer pl-1 line-clamp-1"
                              >
                                • {product.name}
                              </p>
                            ))}
                            {series.products.length > 2 && (
                              <p className="text-xs text-blue-600 pl-1">
                                +{series.products.length - 2} sản phẩm khác
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CategoryDropdown;
