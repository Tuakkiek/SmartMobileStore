const normalizeText = (value = "") =>
  String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const compactText = (value = "") => normalizeText(value).replace(/\s+/g, "");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const CATEGORY_SYNONYMS = {
  smartphone: [
    "smartphone",
    "phone",
    "mobile",
    "dien thoai",
    "iphone",
    "android",
    "galaxy",
    "pixel",
    "redmi",
    "oneplus",
    "oppo",
    "vivo",
    "xiaomi",
    "realme",
    "nokia",
  ],
  tablet: [
    "tablet",
    "ipad",
    "galaxy tab",
    "matepad",
    "surface go",
    "tab",
  ],
  smartwatch: [
    "smartwatch",
    "smart watch",
    "apple watch",
    "iwatch",
    "galaxy watch",
    "watch gt",
    "watch fit",
    "fitbit",
    "amazfit",
  ],
  laptop: ["laptop", "notebook", "macbook", "ultrabook", "thinkpad", "vivobook"],
  headphone: [
    "headphone",
    "headphones",
    "earphone",
    "earphones",
    "earbud",
    "earbuds",
    "airpods",
    "headset",
    "buds",
  ],
  tv: ["tv", "smart tv", "qled", "oled tv", "android tv", "google tv"],
  monitor: ["monitor", "display", "man hinh", "screen"],
  keyboard: ["keyboard", "ban phim"],
  mouse: ["mouse", "chuot"],
  speaker: ["speaker", "soundbar", "loa"],
  camera: ["camera", "dslr", "mirrorless", "action camera", "webcam"],
  "gaming-console": [
    "gaming console",
    "console",
    "playstation",
    "ps5",
    "xbox",
    "nintendo switch",
    "steam deck",
  ],
  accessories: [
    "accessory",
    "accessories",
    "charger",
    "cable",
    "case",
    "screen protector",
    "adapter",
    "power bank",
    "dock",
    "strap",
    "band",
    "stand",
    "cover",
  ],
};

const aliasToSlug = new Map();
for (const [slug, aliases] of Object.entries(CATEGORY_SYNONYMS)) {
  const allAliases = [slug, ...aliases];
  for (const alias of allAliases) {
    const normalized = normalizeText(alias);
    if (normalized) {
      aliasToSlug.set(normalized, slug);
      aliasToSlug.set(compactText(alias), slug);
    }
  }
}

const ACCESSORY_SIGNAL_WORDS = [
  "charger",
  "cable",
  "case",
  "screen protector",
  "adapter",
  "power bank",
  "dock",
  "strap",
  "band",
  "stand",
  "cover",
];

const hasAnyWord = (text, words) =>
  words.some((word) => {
    const normalizedWord = normalizeText(word);
    if (!normalizedWord) return false;
    const pattern = `\\b${escapeRegex(normalizedWord).replace(/\s+/g, "\\s+")}\\b`;
    return new RegExp(pattern).test(text);
  });

export const normalizeWarehouseCategory = (category) => {
  const normalized = normalizeText(category);
  if (!normalized) return null;
  return aliasToSlug.get(normalized) || aliasToSlug.get(compactText(normalized)) || null;
};

export const classifyProductTypeSlug = ({
  name = "",
  model = "",
  brandName = "",
  currentSlug = "",
} = {}) => {
  const combined = `${name} ${model} ${brandName}`;
  const text = normalizeText(combined);
  const compact = compactText(combined);

  if (!text) {
    return normalizeWarehouseCategory(currentSlug);
  }

  if (hasAnyWord(text, ACCESSORY_SIGNAL_WORDS)) {
    return "accessories";
  }

  if (
    compact.includes("applewatch") ||
    hasAnyWord(text, ["smartwatch", "smart watch", "galaxy watch", "watch gt", "watch fit", "fitbit", "amazfit"])
  ) {
    return "smartwatch";
  }

  if (compact.includes("ipad") || hasAnyWord(text, ["tablet", "galaxy tab", "matepad", "surface go"])) {
    return "tablet";
  }

  if (
    compact.includes("iphone") ||
    hasAnyWord(text, [
      "smartphone",
      "phone",
      "galaxy s",
      "galaxy z",
      "pixel",
      "redmi",
      "oneplus",
      "oppo",
      "vivo",
      "xiaomi",
      "realme",
      "nokia",
    ])
  ) {
    return "smartphone";
  }

  if (hasAnyWord(text, ["macbook", "laptop", "notebook", "ultrabook", "thinkpad", "vivobook"])) {
    return "laptop";
  }

  if (hasAnyWord(text, ["airpods", "earbud", "earphone", "headphone", "headset", "buds"])) {
    return "headphone";
  }

  if (hasAnyWord(text, ["smart tv", "oled tv", "qled", "android tv", "google tv"])) {
    return "tv";
  }

  if (hasAnyWord(text, ["monitor", "display", "screen"])) {
    return "monitor";
  }

  if (hasAnyWord(text, ["keyboard"])) {
    return "keyboard";
  }

  if (hasAnyWord(text, ["mouse"])) {
    return "mouse";
  }

  if (hasAnyWord(text, ["speaker", "soundbar"])) {
    return "speaker";
  }

  if (hasAnyWord(text, ["camera", "dslr", "mirrorless", "webcam"])) {
    return "camera";
  }

  if (hasAnyWord(text, ["playstation", "ps5", "xbox", "nintendo switch", "steam deck", "console"])) {
    return "gaming-console";
  }

  return normalizeWarehouseCategory(currentSlug);
};

const DEFAULT_WAREHOUSE_LABELS = {
  smartphone: ["smartphone", "phone", "mobile", "dien thoai", "iphone"],
  tablet: ["tablet", "tab", "ipad"],
  smartwatch: ["smartwatch", "smart watch", "apple watch", "watch"],
  laptop: ["laptop", "notebook", "macbook"],
  headphone: ["headphone", "headset", "earbuds", "airpods"],
  tv: ["tv", "smart tv"],
  monitor: ["monitor", "display"],
  keyboard: ["keyboard"],
  mouse: ["mouse"],
  speaker: ["speaker", "soundbar"],
  camera: ["camera"],
  "gaming-console": ["gaming-console", "console", "playstation", "xbox"],
  accessories: ["accessories", "accessory", "charger", "cable", "case"],
};

export const getWarehouseCategoryLabels = (slug, displayName = "") => {
  const labels = [...(DEFAULT_WAREHOUSE_LABELS[slug] || [slug])];

  if (displayName && displayName.trim()) {
    labels.push(displayName.trim());
  }

  const seen = new Set();
  const unique = [];

  for (const label of labels) {
    const key = normalizeText(label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(label);
  }

  return unique;
};

export const classificationSlugOrder = Object.keys(CATEGORY_SYNONYMS);
