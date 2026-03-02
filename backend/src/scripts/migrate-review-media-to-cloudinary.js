import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

import { connectDB } from "../config/db.js";
import Review from "../modules/review/Review.js";
import cloudinary from "../lib/cloudinary.js";
import { isBase64Image } from "../modules/review/reviewMediaValidation.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

const startedAt = new Date();
const runId = startedAt.toISOString().replace(/[:.]/g, "-");
const dryRun = !process.argv.includes("--apply");

const ensureCloudinaryConfig = () => {
  const requiredKeys = [
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ];
  const missing = requiredKeys.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing Cloudinary env vars: ${missing.join(", ")}`);
  }
};

const buildMigrationFolder = () => {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `reviews/images/${year}/${month}/migration`;
};

const createReportDir = () => {
  const reportDir = path.join(
    process.cwd(),
    "backups",
    "review-media-migration",
    runId
  );
  fs.mkdirSync(reportDir, { recursive: true });
  return reportDir;
};

const report = {
  metadata: {
    runId,
    startedAt: startedAt.toISOString(),
    dryRun,
    apply: !dryRun,
    query: {
      imagesRegex: "^data:image/",
    },
  },
  summary: {
    scannedReviews: 0,
    reviewsWithBase64: 0,
    reviewsUpdated: 0,
    base64ImagesFound: 0,
    uploadedImages: 0,
    uploadFailures: 0,
  },
  entries: [],
};

const uploadBase64Image = async (base64Data, folder) => {
  const uploadOptions = {
    folder,
    resource_type: "image",
  };

  if (process.env.CLOUDINARY_REVIEW_IMAGE_PRESET) {
    uploadOptions.upload_preset = process.env.CLOUDINARY_REVIEW_IMAGE_PRESET;
  }

  return cloudinary.uploader.upload(base64Data, uploadOptions);
};

const processReview = async (review, folder) => {
  const reviewId = String(review._id);
  const originalImages = Array.isArray(review.images) ? review.images : [];
  const nextImages = [];

  let hasBase64 = false;
  let changed = false;
  let uploadedCount = 0;
  let failureCount = 0;
  const failedIndexes = [];

  for (let index = 0; index < originalImages.length; index += 1) {
    const image = originalImages[index];

    if (!isBase64Image(image)) {
      nextImages.push(image);
      continue;
    }

    hasBase64 = true;
    report.summary.base64ImagesFound += 1;

    if (dryRun) {
      nextImages.push(image);
      continue;
    }

    try {
      const uploadResult = await uploadBase64Image(image, folder);
      nextImages.push(uploadResult.secure_url);
      uploadedCount += 1;
      changed = true;
      report.summary.uploadedImages += 1;
    } catch (error) {
      nextImages.push(image);
      failureCount += 1;
      failedIndexes.push(index);
      report.summary.uploadFailures += 1;
    }
  }

  if (!hasBase64) {
    return;
  }

  report.summary.reviewsWithBase64 += 1;

  if (!dryRun && changed) {
    await Review.updateOne({ _id: review._id }, { $set: { images: nextImages } });
    report.summary.reviewsUpdated += 1;
  }

  report.entries.push({
    reviewId,
    base64ImageCount: originalImages.filter((img) => isBase64Image(img)).length,
    uploadedCount,
    failureCount,
    failedIndexes,
    updated: !dryRun && changed,
  });
};

const writeReport = (reportDir) => {
  const finishedAt = new Date();
  report.metadata.finishedAt = finishedAt.toISOString();
  report.metadata.durationMs = finishedAt.getTime() - startedAt.getTime();

  const reportPath = path.join(reportDir, "report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
  return reportPath;
};

const run = async () => {
  const reportDir = createReportDir();

  if (!dryRun) {
    ensureCloudinaryConfig();
  }

  await connectDB();
  console.log(`[migrate:review-media] Connected to MongoDB (dryRun=${dryRun})`);

  const folder = buildMigrationFolder();
  const query = {
    images: { $elemMatch: { $regex: "^data:image/" } },
  };

  const cursor = Review.find(query).select("_id images").lean().cursor();

  for await (const review of cursor) {
    report.summary.scannedReviews += 1;
    await processReview(review, folder);
  }

  const reportPath = writeReport(reportDir);

  console.log(
    `[migrate:review-media] Completed dryRun=${dryRun} scanned=${report.summary.scannedReviews} reviewsWithBase64=${report.summary.reviewsWithBase64} updated=${report.summary.reviewsUpdated} uploadedImages=${report.summary.uploadedImages} failedUploads=${report.summary.uploadFailures}`
  );
  console.log(`[migrate:review-media] Report: ${reportPath}`);
};

run()
  .catch(async (error) => {
    console.error("[migrate:review-media] Failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
