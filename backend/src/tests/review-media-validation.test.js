import test from "node:test";
import assert from "node:assert/strict";

import {
  isBase64Image,
  isCloudinaryImageUrl,
  validateReviewImages,
} from "../modules/review/reviewMediaValidation.js";

test("accepts cloudinary image urls", () => {
  const result = validateReviewImages([
    "https://res.cloudinary.com/demo/image/upload/v1/reviews/images/2026/03/sample.jpg",
  ]);

  assert.equal(result.ok, true);
  assert.equal(result.images.length, 1);
});

test("rejects non-cloudinary urls", () => {
  const result = validateReviewImages(["https://example.com/image.png"]);

  assert.equal(result.ok, false);
  assert.match(result.message, /Cloudinary/i);
});

test("enforces maximum 5 images", () => {
  const images = new Array(6)
    .fill(0)
    .map(
      (_, index) =>
        `https://res.cloudinary.com/demo/image/upload/v1/reviews/images/2026/03/${index}.jpg`
    );

  const result = validateReviewImages(images);
  assert.equal(result.ok, false);
  assert.match(result.message, /up to 5/i);
});

test("allows base64 images before grace cutoff", () => {
  const base64 = "data:image/jpeg;base64,ZmFrZQ==";
  assert.equal(isBase64Image(base64), true);

  const result = validateReviewImages([base64], {
    now: new Date("2026-03-10T00:00:00.000Z"),
    base64GraceUntil: new Date("2026-03-16T23:59:59+07:00"),
  });

  assert.equal(result.ok, true);
  assert.equal(result.images[0], base64);
});

test("rejects base64 images after grace cutoff", () => {
  const base64 = "data:image/png;base64,ZmFrZQ==";
  const result = validateReviewImages([base64], {
    now: new Date("2026-03-17T00:00:00+07:00"),
    base64GraceUntil: new Date("2026-03-16T23:59:59+07:00"),
  });

  assert.equal(result.ok, false);
  assert.match(result.message, /no longer supported/i);
});

test("validates cloudinary helper strictly for HTTPS host/path", () => {
  assert.equal(
    isCloudinaryImageUrl(
      "https://res.cloudinary.com/demo/image/upload/v1/reviews/images/2026/03/sample.webp"
    ),
    true
  );
  assert.equal(
    isCloudinaryImageUrl(
      "http://res.cloudinary.com/demo/image/upload/v1/reviews/images/2026/03/sample.webp"
    ),
    false
  );
  assert.equal(
    isCloudinaryImageUrl(
      "https://res.cloudinary.com/demo/video/upload/v1/reviews/videos/clip.mp4"
    ),
    false
  );
});
