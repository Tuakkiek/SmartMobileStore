import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Validate config on startup
const missingVars = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"].filter(
  (key) => !process.env[key]
);
if (missingVars.length > 0) {
  console.error("❌ Cloudinary config MISSING env vars:", missingVars);
} else {
  console.log("✅ Cloudinary configured for cloud:", process.env.CLOUDINARY_CLOUD_NAME);
}

export default cloudinary;
