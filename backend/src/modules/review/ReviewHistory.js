import mongoose from "mongoose";

const reviewHistorySchema = new mongoose.Schema(
  {
    reviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductReview",
      required: true,
      index: true,
    },
    oldRating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: "Old rating must be an integer between 1 and 5.",
      },
    },
    oldComment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
    editedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
  },
  {
    collection: "product_review_histories",
    versionKey: false,
  }
);

reviewHistorySchema.index({ reviewId: 1, editedAt: -1 });

const ReviewHistory =
  mongoose.models.ProductReviewHistory ||
  mongoose.model("ProductReviewHistory", reviewHistorySchema);

export default ReviewHistory;
