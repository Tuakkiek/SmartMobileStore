import mongoose from "mongoose";
import UniversalProduct from "../product/UniversalProduct.js";

const CATEGORY_ROUTE_MAP = {
  smartphone: "dien-thoai",
  tablet: "may-tinh-bang",
  laptop: "macbook",
  headphone: "tai-nghe",
  smartwatch: "apple-watch",
  accessories: "phu-kien",
};

const normalizeVietnamese = (text) => {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
};

const getCategoryRoute = (productType) => {
  const slug = normalizeVietnamese(productType?.slug || "").replace(
    /\s+/g,
    "-"
  );
  const nameSlug = normalizeVietnamese(productType?.name || "").replace(
    /\s+/g,
    "-"
  );
  return CATEGORY_ROUTE_MAP[slug] || CATEGORY_ROUTE_MAP[nameSlug] || "san-pham";
};

const findProductById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return UniversalProduct.findById(id)
    .populate("productType", "name slug")
    .lean();
};

export const getRelatedProducts = async (req, res) => {
  try {
    const product = await findProductById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay san pham",
      });
    }

    const query = {
      _id: { $ne: product._id },
      status: "AVAILABLE",
    };

    if (product.productType?._id) {
      query.productType = product.productType._id;
    }

    if (product.condition) {
      query.condition = product.condition;
    }

    const products = await UniversalProduct.find(query)
      .populate("variants")
      .populate("productType", "name slug")
      .sort({ averageRating: -1, salesCount: -1, createdAt: -1 })
      .limit(4)
      .lean();

    const normalized = products.map((item) => {
      const variants = Array.isArray(item.variants) ? item.variants : [];
      const prices = variants
        .map((variant) => Number(variant.price))
        .filter((price) => Number.isFinite(price));
      const originalPrices = variants
        .map((variant) => Number(variant.originalPrice))
        .filter((price) => Number.isFinite(price));

      const minPrice = prices.length ? Math.min(...prices) : 0;
      const minOriginalPrice = originalPrices.length
        ? Math.min(...originalPrices)
        : minPrice;
      const images =
        item.featuredImages?.length > 0
          ? item.featuredImages
          : variants[0]?.images || [];

      return {
        _id: item._id,
        name: item.name,
        model: item.model,
        category: item.productType?.name || "",
        categoryRoute: getCategoryRoute(item.productType),
        images,
        price: minPrice,
        originalPrice: minOriginalPrice,
        averageRating: item.averageRating || 0,
        totalReviews: item.totalReviews || 0,
        variants,
        baseSlug: item.baseSlug || item.slug,
        installmentBadge: item.installmentBadge || "NONE",
      };
    });

    res.json({
      success: true,
      data: { products: normalized },
    });
  } catch (error) {
    console.error("Error getting related products:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export default {
  getRelatedProducts,
};
