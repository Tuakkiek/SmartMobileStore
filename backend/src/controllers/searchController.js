// ============================================
// FILE: backend/src/controllers/searchController.js
// ✅ FULL-TEXT SEARCH với AI-powered ranking
// ============================================

import IPhone, { IPhoneVariant } from "../models/IPhone.js";
import IPad, { IPadVariant } from "../models/IPad.js";
import Mac, { MacVariant } from "../models/Mac.js";
import AirPods, { AirPodsVariant } from "../models/AirPods.js";
import AppleWatch, { AppleWatchVariant } from "../models/AppleWatch.js";
import Accessory, { AccessoryVariant } from "../models/Accessory.js";

// ============================================
// SYNONYM DICTIONARY (Từ điển đồng nghĩa)
// ============================================
const SYNONYM_MAP = {
  // Laptop / Mac
  laptop: ["macbook", "mac", "máy tính xách tay"],
  "máy tính xách tay": ["macbook", "mac", "laptop"],
  macbook: ["mac", "laptop"],

  // Tai nghe
  "tai nghe": ["airpods", "tai nghe bluetooth"],
  "tai phone": ["airpods", "tai nghe"],

  // Dây đeo / Strap
  "dây đeo": ["strap", "dây watch", "dây apple watch"],
  strap: ["dây đeo", "dây watch"],

  // Chuột
  chuột: ["mouse", "magic mouse"],
  mouse: ["chuột", "magic mouse"],

  // Bàn phím
  "bàn phím": ["keyboard", "magic keyboard"],
  keyboard: ["bàn phím"],

  // Sạc / Cáp
  sạc: ["charger", "củ sạc", "adapter"],
  "củ sạc": ["sạc", "charger", "adapter"],
  cáp: ["cable", "dây cáp"],
  cable: ["cáp", "dây"],

  // Ốp lưng / Case
  "ốp lưng": ["case", "vỏ máy"],
  case: ["ốp lưng", "vỏ"],

  // Máy tính bảng
  "máy tính bảng": ["ipad", "tablet"],
  tablet: ["ipad", "máy tính bảng"],

  // Đồng hồ
  "đồng hồ": ["apple watch", "watch"],
  "đồng hồ thông minh": ["apple watch", "smartwatch"],

  // Điện thoại
  "điện thoại": ["iphone", "phone", "smartphone"],
  "di động": ["iphone", "điện thoại"],
  phone: ["iphone", "điện thoại"],
};

// ============================================
// TYPO CORRECTION (Sửa lỗi chính tả)
// ============================================
const TYPO_MAP = {
  // iPhone variations
  ipone: "iphone",
  ifone: "iphone",
  aiphon: "iphone",
  iphoen: "iphone",
  ipohne: "iphone",

  // iPad
  iapd: "ipad",
  iapad: "ipad",

  // MacBook
  macbok: "macbook",
  macboo: "macbook",
  makbook: "macbook",
  mắcbúc: "macbook",

  // AirPods
  aripod: "airpods",
  airpod: "airpods",
  "ari pod": "airpods",

  // Watch
  wach: "watch",
  wacth: "watch",
  watc: "watch",

  // Common Vietnamese typos
  sac: "sạc",
  cap: "cáp",
  "op lung": "ốp lưng",
  chuot: "chuột",
  "ban phim": "bàn phím",
};

// ============================================
// CATEGORY MAPPING
// ============================================
const CATEGORY_MAP = {
  iPhone: { model: IPhone, variant: IPhoneVariant, route: "dien-thoai" },
  iPad: { model: IPad, variant: IPadVariant, route: "may-tinh-bang" },
  Mac: { model: Mac, variant: MacVariant, route: "macbook" },
  AirPods: { model: AirPods, variant: AirPodsVariant, route: "tai-nghe" },
  AppleWatch: {
    model: AppleWatch,
    variant: AppleWatchVariant,
    route: "apple-watch",
  },
  Accessory: { model: Accessory, variant: AccessoryVariant, route: "phu-kien" },
};

// ============================================
// HELPER: Normalize Vietnamese text
// ============================================
const normalizeVietnamese = (text) => {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .trim();
};

// ============================================
// HELPER: Correct typos
// ============================================
const correctTypos = (query) => {
  let corrected = normalizeVietnamese(query);

  // Check exact match first
  if (TYPO_MAP[corrected]) {
    return TYPO_MAP[corrected];
  }

  // Replace word by word
  Object.entries(TYPO_MAP).forEach(([typo, correct]) => {
    const regex = new RegExp(`\\b${typo}\\b`, "gi");
    corrected = corrected.replace(regex, correct);
  });

  return corrected;
};

// ============================================
// HELPER: Expand synonyms
// ============================================
const expandSynonyms = (originalQuery) => {
  const normalized = normalizeVietnamese(originalQuery);
  const terms = new Set([normalized]);

  Object.entries(SYNONYM_MAP).forEach(([key, synonyms]) => {
    const normalizedKey = normalizeVietnamese(key);
    
    // Chỉ kích hoạt nếu query chứa ĐÚNG cụm từ đó (không tách từ)
    if (normalized.includes(normalizedKey)) {
      synonyms.forEach(syn => {
        const normSyn = normalizeVietnamese(syn);
        if (normSyn && normSyn !== normalizedKey) {
          terms.add(normSyn);
        }
      });
    }
  });

  return Array.from(terms);
};
// ============================================
// HELPER: Extract attributes from query
// ============================================
const extractAttributes = (query) => {
  const normalized = normalizeVietnamese(query);
  const attributes = {
    storage: null,
    color: null,
    model: null,
  };

  // Storage detection
  const storageMatch = normalized.match(/(\d+)\s*(gb|tb)/i);
  if (storageMatch) {
    attributes.storage = storageMatch[1] + storageMatch[2].toUpperCase();
  }

  // Color detection (Vietnamese)
  const colors = [
    "đen",
    "trắng",
    "xanh",
    "đỏ",
    "hồng",
    "tím",
    "vàng",
    "bạc",
    "gold",
  ];
  colors.forEach((color) => {
    if (normalized.includes(color)) {
      attributes.color = color;
    }
  });

  // Model detection (e.g., "15 pro max", "14 plus")
  const modelMatch = normalized.match(
    /(iphone|ip)\s*(\d+)\s*(pro\s*max|pro|plus|mini)?/i
  );
  if (modelMatch) {
    attributes.model = modelMatch[2];
    if (modelMatch[3]) {
      attributes.model += " " + modelMatch[3].replace(/\s+/g, " ");
    }
  }

  return attributes;
};

// ============================================
// HELPER: Calculate relevance score
// ============================================
const calculateRelevance = (product, query, attributes) => {
  let score = 0;
  const normalizedQuery = normalizeVietnamese(query);
  const normalizedName = normalizeVietnamese(product.name);
  const normalizedModel = normalizeVietnamese(product.model);

  // 1. EXACT MATCH (100 points)
  if (
    normalizedName === normalizedQuery ||
    normalizedModel === normalizedQuery
  ) {
    score += 100;
  }

  // 2. NAME MATCH (30 points for word boundary, 15 for partial)
  const queryWords = normalizedQuery.split(/\s+/);
  queryWords.forEach((word) => {
    const wordBoundaryRegex = new RegExp(`\\b${word}\\b`, "i");
    if (wordBoundaryRegex.test(normalizedName)) {
      score += 30;
      // Bonus if at start
      if (normalizedName.startsWith(word)) score += 15;
    } else if (normalizedName.includes(word)) {
      score += 15;
    }

    // Same for model
    if (wordBoundaryRegex.test(normalizedModel)) {
      score += 25;
    } else if (normalizedModel.includes(word)) {
      score += 10;
    }
  });

  // 3. ATTRIBUTE MATCH (20 points each)
  if (
    attributes.storage &&
    product.specifications?.storage?.includes(attributes.storage)
  ) {
    score += 20;
  }
  if (
    attributes.color &&
    product.specifications?.colors?.some((c) =>
      normalizeVietnamese(c).includes(attributes.color)
    )
  ) {
    score += 20;
  }
  if (attributes.model && normalizedModel.includes(attributes.model)) {
    score += 25;
  }

  // 4. DESCRIPTION MATCH (5 points)
  if (
    product.description &&
    normalizeVietnamese(product.description).includes(normalizedQuery)
  ) {
    score += 5;
  }

  // 5. BOOST FOR POPULAR PRODUCTS
  if (product.salesCount > 0) {
    score += Math.min(product.salesCount / 10, 10); // Max 10 points
  }

  // 6. BOOST FOR IN-STOCK
  const hasStock = product.variants?.some((v) => v.stock > 0);
  if (hasStock) {
    score += 5;
  }

  // 7. BOOST FOR NEW PRODUCTS (within 30 days)
  const daysSinceCreation =
    (Date.now() - new Date(product.createdAt)) / (1000 * 60 * 60 * 24);
  if (daysSinceCreation <= 30) {
    score += 10;
  }

  return Math.min(score, 100); // Cap at 100
};

// ============================================
// MAIN SEARCH FUNCTION
// ============================================
export const search = async (req, res) => {
  try {
    const { q, limit = 20, category } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Query phải có ít nhất 2 ký tự",
      });
    }

    // STEP 1: Normalize & correct query
    const correctedQuery = correctTypos(q);

    // STEP 2: Extract attributes (storage, color, model)
    const attributes = extractAttributes(correctedQuery);

    // STEP 3: Expand with synonyms
    const expandedQueries = expandSynonyms(correctedQuery);

    // STEP 4: Build MongoDB text search query
    const searchTerms = expandedQueries.join(" ");

    // STEP 5: Search in relevant categories
    const categoriesToSearch = category
      ? [CATEGORY_MAP[category]]
      : Object.values(CATEGORY_MAP);

    const searchPromises = categoriesToSearch.map(async (cat) => {
      if (!cat) return [];

      try {
        // Text search with scoring
        const products = await cat.model
          .find(
            { $text: { $search: searchTerms } },
            { score: { $meta: "textScore" } }
          )
          .populate("variants")
          .sort({ score: { $meta: "textScore" } })
          .limit(parseInt(limit) * 2) // Get more for re-ranking
          .lean();

        // Fallback: Regex search if text search returns nothing
        if (products.length === 0) {
          const regexQuery = new RegExp(
            correctedQuery.split(/\s+/).join("|"),
            "i"
          );
          const fallbackProducts = await cat.model
            .find({
              $or: [
                { name: regexQuery },
                { model: regexQuery },
                { description: regexQuery },
              ],
            })
            .populate("variants")
            .limit(parseInt(limit))
            .lean();

          return fallbackProducts.map((p) => ({
            ...p,
            _category: cat.route,
            _relevance: calculateRelevance(p, correctedQuery, attributes),
          }));
        }

        // Calculate custom relevance score
        return products.map((p) => ({
          ...p,
          _category: cat.route,
          _relevance: calculateRelevance(p, correctedQuery, attributes),
        }));
      } catch (error) {
        console.error(`Search error in ${cat.route}:`, error);
        return [];
      }
    });

    const results = await Promise.all(searchPromises);
    let allProducts = results.flat();

    // STEP 6: Re-rank by relevance score
    allProducts.sort((a, b) => b._relevance - a._relevance);

    // STEP 7: Apply limit
    const topProducts = allProducts.slice(0, parseInt(limit));

    // STEP 8: Return with metadata
    return res.json({
      success: true,
      data: {
        query: q,
        correctedQuery: correctedQuery !== q ? correctedQuery : null,
        extractedAttributes: attributes,
        totalResults: allProducts.length,
        results: topProducts,
      },
    });
  } catch (error) {
    console.error("Search error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi tìm kiếm",
      error: error.message,
    });
  }
};

// ============================================
// AUTOCOMPLETE / SUGGESTIONS
// ============================================
export const autocomplete = async (req, res) => {
  try {
    const { q, limit = 5 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({
        success: true,
        data: { suggestions: [] },
      });
    }

    const correctedQuery = correctTypos(q);
    const normalized = normalizeVietnamese(correctedQuery);

    // Get suggestions from all categories
    const suggestionPromises = Object.values(CATEGORY_MAP).map(async (cat) => {
      try {
        const products = await cat.model
          .find({
            $or: [
              { name: new RegExp(`^${normalized}`, "i") },
              { model: new RegExp(`^${normalized}`, "i") },
            ],
          })
          .select("name model")
          .limit(parseInt(limit))
          .lean();

        return products.map((p) => ({
          text: p.name,
          model: p.model,
          category: cat.route,
        }));
      } catch (error) {
        return [];
      }
    });

    const suggestions = await Promise.all(suggestionPromises);
    const uniqueSuggestions = [
      ...new Map(suggestions.flat().map((item) => [item.text, item])).values(),
    ].slice(0, parseInt(limit));

    return res.json({
      success: true,
      data: {
        query: q,
        suggestions: uniqueSuggestions,
      },
    });
  } catch (error) {
    console.error("Autocomplete error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy gợi ý",
    });
  }
};

// ============================================
// EXPORT
// ============================================
export default { search, autocomplete };
