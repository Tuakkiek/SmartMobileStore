import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import User from "../modules/auth/User.js";
import Brand from "../modules/brand/Brand.js";
import ProductType from "../modules/productType/ProductType.js";
import UniversalProduct from "../modules/product/UniversalProduct.js";
import Order from "../modules/order/Order.js";
import Review from "../modules/review/Review.js";
import ReviewHistory from "../modules/review/ReviewHistory.js";
import {
  createReview,
  getVerifiedProductReviews,
  updateReview,
} from "../modules/review/reviewService.js";
import { ReviewServiceError } from "../modules/review/reviewErrors.js";

let mongoServer;
let userSeed = 1;
let orderSeed = 1;
let productSeed = 1;

const buildPhoneNumber = () => `0${String(userSeed++).padStart(9, "0")}`;
const nextOrderNumber = () => `ORD-REV-${String(orderSeed++).padStart(6, "0")}`;
const nextProductSlug = () => `review-product-${String(productSeed++).padStart(6, "0")}`;

const createCustomer = async (overrides = {}) => {
  const phoneNumber = overrides.phoneNumber || buildPhoneNumber();

  return User.create({
    role: "CUSTOMER",
    fullName: overrides.fullName || "Customer Review",
    phoneNumber,
    email: overrides.email || `customer.${phoneNumber}@example.com`,
    password: "Password1!",
    ...overrides,
  });
};

const createProduct = async ({ ownerId }) => {
  const brand = await Brand.create({
    name: `Brand ${productSeed}`,
    createdBy: ownerId,
  });

  const productType = await ProductType.create({
    name: `Type ${productSeed}`,
    createdBy: ownerId,
  });

  return UniversalProduct.create({
    name: `Review Product ${productSeed}`,
    model: `Model ${productSeed}`,
    baseSlug: nextProductSlug(),
    brand: brand._id,
    productType: productType._id,
    createdBy: ownerId,
    status: "AVAILABLE",
    lifecycleStage: "ACTIVE",
  });
};

const createOrder = async ({ userId, productId, status = "COMPLETED" }) => {
  return Order.create({
    orderNumber: nextOrderNumber(),
    orderSource: "ONLINE",
    fulfillmentType: "HOME_DELIVERY",
    userId,
    customerId: userId,
    items: [
      {
        productId,
        price: 1000,
        quantity: 1,
      },
    ],
    paymentMethod: "COD",
    paymentStatus: "PAID",
    status,
  });
};

const expectServiceError = (error, expectedCode) => {
  assert.equal(error instanceof ReviewServiceError, true);
  assert.equal(error.code, expectedCode);
};

before(
  async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "review-rules-integration-test",
    });

    await Review.syncIndexes();
    await ReviewHistory.syncIndexes();
  },
  { timeout: 120000 }
);

beforeEach(async () => {
  const collections = Object.values(mongoose.connection.collections);
  for (const collection of collections) {
    await collection.deleteMany({});
  }
});

after(
  async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  },
  { timeout: 120000 }
);

test("creates verified review for completed purchase and updates product rating", async () => {
  const customer = await createCustomer();
  const product = await createProduct({ ownerId: customer._id });
  const order = await createOrder({ userId: customer._id, productId: product._id });

  const review = await createReview({
    userId: customer._id,
    productId: product._id,
    orderId: order._id,
    rating: 5,
    comment: "Excellent product",
  });

  assert.equal(String(review.userId._id), String(customer._id));
  assert.equal(String(review.productId), String(product._id));
  assert.equal(String(review.orderId._id), String(order._id));
  assert.equal(review.isVerified, true);
  assert.equal(review.rating, 5);

  const updatedProduct = await UniversalProduct.findById(product._id).lean();
  assert.equal(updatedProduct.averageRating, 5);
  assert.equal(updatedProduct.totalReviews, 1);
});

test("rejects review when order is not COMPLETED", async () => {
  const customer = await createCustomer();
  const product = await createProduct({ ownerId: customer._id });
  const deliveredOrder = await createOrder({
    userId: customer._id,
    productId: product._id,
    status: "DELIVERED",
  });

  await assert.rejects(
    () =>
      createReview({
        userId: customer._id,
        productId: product._id,
        orderId: deliveredOrder._id,
        rating: 4,
        comment: "Should fail",
      }),
    (error) => {
      expectServiceError(error, "REVIEW_ORDER_NOT_ELIGIBLE");
      return true;
    }
  );
});

test("enforces one review per user-product-order at app and db levels", async () => {
  const customer = await createCustomer();
  const product = await createProduct({ ownerId: customer._id });
  const order = await createOrder({ userId: customer._id, productId: product._id });

  await createReview({
    userId: customer._id,
    productId: product._id,
    orderId: order._id,
    rating: 5,
    comment: "First review",
  });

  await assert.rejects(
    () =>
      createReview({
        userId: customer._id,
        productId: product._id,
        orderId: order._id,
        rating: 4,
        comment: "Second review",
      }),
    (error) => {
      expectServiceError(error, "REVIEW_DUPLICATE");
      return true;
    }
  );

  await assert.rejects(
    () =>
      Review.create({
        userId: customer._id,
        productId: product._id,
        orderId: order._id,
        rating: 3,
        comment: "DB duplicate",
        isVerified: true,
      }),
    (error) => {
      assert.equal(error?.code, 11000);
      return true;
    }
  );
});

test("allows one update within 7 days and stores review history", async () => {
  const customer = await createCustomer();
  const product = await createProduct({ ownerId: customer._id });
  const order = await createOrder({ userId: customer._id, productId: product._id });

  const review = await createReview({
    userId: customer._id,
    productId: product._id,
    orderId: order._id,
    rating: 5,
    comment: "Initial comment",
  });

  const updated = await updateReview({
    reviewId: review._id,
    userId: customer._id,
    rating: 4,
    comment: "Updated comment",
  });

  assert.equal(updated.rating, 4);
  assert.equal(updated.comment, "Updated comment");
  assert.equal(updated.editCount, 1);
  assert.ok(updated.lastEditedAt instanceof Date);

  const histories = await ReviewHistory.find({ reviewId: review._id })
    .sort({ editedAt: -1 })
    .lean();

  assert.equal(histories.length, 1);
  assert.equal(histories[0].oldRating, 5);
  assert.equal(histories[0].oldComment, "Initial comment");

  await assert.rejects(
    () =>
      updateReview({
        reviewId: review._id,
        userId: customer._id,
        rating: 3,
        comment: "Second edit should fail",
      }),
    (error) => {
      expectServiceError(error, "REVIEW_EDIT_LIMIT_REACHED");
      return true;
    }
  );
});

test("blocks edits by non-authors and after 7-day window", async () => {
  const author = await createCustomer();
  const attacker = await createCustomer();
  const product = await createProduct({ ownerId: author._id });
  const order = await createOrder({ userId: author._id, productId: product._id });

  const review = await createReview({
    userId: author._id,
    productId: product._id,
    orderId: order._id,
    rating: 5,
    comment: "Author review",
  });

  await assert.rejects(
    () =>
      updateReview({
        reviewId: review._id,
        userId: attacker._id,
        rating: 4,
        comment: "Illegal edit",
      }),
    (error) => {
      expectServiceError(error, "REVIEW_EDIT_FORBIDDEN");
      return true;
    }
  );

  const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
  await Review.collection.updateOne(
    { _id: review._id },
    { $set: { createdAt: eightDaysAgo } }
  );

  await assert.rejects(
    () =>
      updateReview({
        reviewId: review._id,
        userId: author._id,
        rating: 4,
        comment: "Too late edit",
      }),
    (error) => {
      expectServiceError(error, "REVIEW_EDIT_WINDOW_EXPIRED");
      return true;
    }
  );
});

test("fetches verified reviews only", async () => {
  const customer = await createCustomer();
  const product = await createProduct({ ownerId: customer._id });
  const order = await createOrder({ userId: customer._id, productId: product._id });

  await createReview({
    userId: customer._id,
    productId: product._id,
    orderId: order._id,
    rating: 5,
    comment: "Verified review",
  });

  const secondOrder = await createOrder({ userId: customer._id, productId: product._id });

  await Review.create({
    userId: customer._id,
    productId: product._id,
    orderId: secondOrder._id,
    rating: 1,
    comment: "Unverified review",
    isVerified: false,
  });

  const result = await getVerifiedProductReviews({
    productId: product._id,
    page: 1,
    limit: 10,
  });

  assert.equal(result.reviews.length, 1);
  assert.equal(result.reviews[0].comment, "Verified review");
  assert.equal(result.summary.total, 1);
  assert.equal(result.summary.average, 5);
  assert.equal(result.summary.byRating[5], 1);
});
