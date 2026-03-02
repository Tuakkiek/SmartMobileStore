import cloudinary from "../../lib/cloudinary.js";

const buildYearMonthFolder = () => {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `reviews/images/${year}/${month}`;
};

const ensureCloudinaryEnv = () => {
  const requiredKeys = [
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ];
  const missing = requiredKeys.filter((key) => !process.env[key]);
  return missing;
};

export const getReviewUploadSignature = async (req, res) => {
  try {
    const { resourceType = "image" } = req.body || {};

    if (resourceType !== "image") {
      return res.status(400).json({
        success: false,
        message: "Only image upload is supported in this phase.",
      });
    }

    const missing = ensureCloudinaryEnv();
    if (missing.length > 0) {
      return res.status(500).json({
        success: false,
        message: `Cloudinary configuration is missing: ${missing.join(", ")}`,
      });
    }

    const timestamp = Math.round(Date.now() / 1000);
    const folder = buildYearMonthFolder();
    const uploadPreset =
      process.env.CLOUDINARY_REVIEW_IMAGE_PRESET || "review_images_signed";

    const paramsToSign = {
      timestamp,
      folder,
      upload_preset: uploadPreset,
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET
    );

    return res.json({
      success: true,
      data: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        timestamp,
        signature,
        folder,
        resourceType,
        uploadPreset,
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to generate upload signature.",
    });
  }
};

export default {
  getReviewUploadSignature,
};
