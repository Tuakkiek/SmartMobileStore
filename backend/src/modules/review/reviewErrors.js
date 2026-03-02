export class ReviewServiceError extends Error {
  constructor({
    message,
    code = "REVIEW_VALIDATION_ERROR",
    status = 400,
    details = null,
  }) {
    super(message);
    this.name = "ReviewServiceError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const isReviewServiceError = (error) =>
  error instanceof ReviewServiceError;
