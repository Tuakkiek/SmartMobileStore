const MAX_REVIEW_IMAGES = 5;
const DEFAULT_BASE64_GRACE_UNTIL = "2026-03-16T23:59:59+07:00";
const CLOUDINARY_HOST = "res.cloudinary.com";

const BASE64_IMAGE_PATTERN = /^data:image\/[a-zA-Z0-9.+-]+;base64,/i;

export const getReviewBase64GraceUntil = () => {
  const rawValue = process.env.REVIEW_BASE64_GRACE_UNTIL || DEFAULT_BASE64_GRACE_UNTIL;
  const parsed = new Date(rawValue);

  if (Number.isNaN(parsed.getTime())) {
    return new Date(DEFAULT_BASE64_GRACE_UNTIL);
  }

  return parsed;
};

export const isBase64Image = (value) =>
  typeof value === "string" && BASE64_IMAGE_PATTERN.test(value.trim());

export const isCloudinaryImageUrl = (value) => {
  if (typeof value !== "string") return false;

  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== "https:") return false;
    if (parsed.hostname !== CLOUDINARY_HOST) return false;

    // Minimal strictness: a Cloudinary image upload URL should include /image/upload/
    return parsed.pathname.includes("/image/upload/");
  } catch {
    return false;
  }
};

const normalizeInputImages = (images) => {
  if (!Array.isArray(images)) return [];
  return images
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
};

const buildBase64ExpiredMessage = (graceUntil) => {
  const configuredCutoff = process.env.REVIEW_BASE64_GRACE_UNTIL || DEFAULT_BASE64_GRACE_UNTIL;
  const fallbackCutoff =
    graceUntil instanceof Date && !Number.isNaN(graceUntil.getTime())
      ? graceUntil.toISOString()
      : DEFAULT_BASE64_GRACE_UNTIL;

  return `Base64 image payload is no longer supported after ${configuredCutoff} (UTC: ${fallbackCutoff}). Please upload via Cloudinary first.`;
};

export const validateReviewImages = (images, options = {}) => {
  const normalizedImages = normalizeInputImages(images);

  if (normalizedImages.length > MAX_REVIEW_IMAGES) {
    return {
      ok: false,
      statusCode: 400,
      message: `Review supports up to ${MAX_REVIEW_IMAGES} images only.`,
      images: [],
    };
  }

  const now = options.now instanceof Date ? options.now : new Date();
  const base64GraceUntil =
    options.base64GraceUntil instanceof Date
      ? options.base64GraceUntil
      : getReviewBase64GraceUntil();

  const validatedImages = [];

  for (const image of normalizedImages) {
    if (isCloudinaryImageUrl(image)) {
      validatedImages.push(image);
      continue;
    }

    if (isBase64Image(image)) {
      if (now.getTime() <= base64GraceUntil.getTime()) {
        validatedImages.push(image);
        continue;
      }

      return {
        ok: false,
        statusCode: 400,
        message: buildBase64ExpiredMessage(base64GraceUntil),
        images: [],
      };
    }

    return {
      ok: false,
      statusCode: 400,
      message: "Only Cloudinary HTTPS image URLs are allowed for review images.",
      images: [],
    };
  }

  return {
    ok: true,
    statusCode: 200,
    message: "",
    images: validatedImages,
  };
};

export default {
  MAX_REVIEW_IMAGES,
  DEFAULT_BASE64_GRACE_UNTIL,
  getReviewBase64GraceUntil,
  isBase64Image,
  isCloudinaryImageUrl,
  validateReviewImages,
};
