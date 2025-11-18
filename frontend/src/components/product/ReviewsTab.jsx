import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { reviewAPI } from "@/lib/api";
import { toast } from "sonner";
import { Star, ThumbsUp, Reply, Upload, X, Image as ImageIcon, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export const ReviewsTab = ({ productId, product }) => {
  const { user, isAuthenticated } = useAuthStore();
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [showReviewForm, setShowReviewForm] = useState(false);

  // Review form state
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch reviews
  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      const response = await reviewAPI.getByProduct(productId);
      setReviews(response.data.data.reviews || []);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      toast.error("Không thể tải đánh giá");
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate rating distribution
  const ratingDistribution = {
    5: reviews.filter((r) => r.rating === 5).length,
    4: reviews.filter((r) => r.rating === 4).length,
    3: reviews.filter((r) => r.rating === 3).length,
    2: reviews.filter((r) => r.rating === 2).length,
    1: reviews.filter((r) => r.rating === 1).length,
  };

  const maxCount = Math.max(...Object.values(ratingDistribution), 1);

  // Filter reviews
  const filteredReviews =
    activeFilter === "all"
      ? reviews
      : reviews.filter((r) => r.rating === parseInt(activeFilter));

  // Submit review
  const handleSubmitReview = async () => {
    if (!isAuthenticated) {
      toast.error("Vui lòng đăng nhập để đánh giá");
      return;
    }

    if (rating === 0) {
      toast.error("Vui lòng chọn số sao");
      return;
    }

    if (!comment.trim()) {
      toast.error("Vui lòng nhập nội dung đánh giá");
      return;
    }

    try {
      setIsSubmitting(true);
      await reviewAPI.create({
        productId,
        rating,
        comment: comment.trim(),
      });

      toast.success("Đánh giá thành công!");
      setRating(0);
      setComment("");
      setShowReviewForm(false);
      fetchReviews();

      // Reload page để cập nhật rating
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error(error.response?.data?.message || "Không thể gửi đánh giá");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canReview = isAuthenticated && user?.role === "CUSTOMER";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Review Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white border rounded-2xl p-6 sticky top-4">
            {/* Average Rating */}
            <div className="text-center mb-6">
              <div className="text-5xl font-bold text-gray-900 mb-2">
                {product.averageRating?.toFixed(1) || 0}
              </div>
              <div className="flex justify-center mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-6 h-6 ${
                      star <= Math.round(product.averageRating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-gray-600">
                {product.totalReviews || 0} lượt đánh giá
              </p>
            </div>

            {/* Rating Distribution */}
            <div className="space-y-2 mb-6">
              {[5, 4, 3, 2, 1].map((star) => (
                <div key={star} className="flex items-center gap-3">
                  <span className="text-sm w-8 flex items-center gap-1">
                    {star}
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  </span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-600 transition-all"
                      style={{
                        width: `${(ratingDistribution[star] / maxCount) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-8 text-right">
                    {ratingDistribution[star]}
                  </span>
                </div>
              ))}
            </div>

            {/* Write Review Button */}
            {canReview && (
              <Button
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                {showReviewForm ? "Đóng form" : "Đánh giá sản phẩm"}
              </Button>
            )}
          </div>
        </div>

        {/* RIGHT: Reviews List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("all")}
              className={activeFilter === "all" ? "bg-red-600" : ""}
            >
              Tất cả ({reviews.length})
            </Button>
            {[5, 4, 3, 2, 1].map((star) => (
              <Button
                key={star}
                variant={activeFilter === star.toString() ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter(star.toString())}
                className={activeFilter === star.toString() ? "bg-red-600" : ""}
              >
                {star} <Star className="w-3 h-3 ml-1" /> ({ratingDistribution[star]})
              </Button>
            ))}
          </div>

          {/* Review Form */}
          {showReviewForm && canReview && (
            <div className="bg-white border rounded-2xl p-6">
              <h3 className="font-bold text-lg mb-4">Viết đánh giá của bạn</h3>

              {/* Star Rating */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Đánh giá của bạn <span className="text-red-600">*</span>
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= (hoveredRating || rating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Nội dung đánh giá <span className="text-red-600">*</span>
                </label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..."
                  maxLength={3000}
                  rows={5}
                  className="resize-none"
                />
                <div className="text-xs text-gray-500 mt-1 text-right">
                  {comment.length}/3000
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowReviewForm(false);
                    setRating(0);
                    setComment("");
                  }}
                  disabled={isSubmitting}
                >
                  Hủy
                </Button>
                <Button
                  onClick={handleSubmitReview}
                  disabled={isSubmitting || rating === 0 || !comment.trim()}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isSubmitting ? "Đang gửi..." : "Gửi đánh giá"}
                </Button>
              </div>
            </div>
          )}

          {/* Reviews List */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="text-center py-12 bg-white border rounded-2xl">
              <p className="text-gray-500">
                {activeFilter === "all"
                  ? "Chưa có đánh giá nào"
                  : `Chưa có đánh giá ${activeFilter} sao`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReviews.map((review) => (
                <ReviewItem key={review._id} review={review} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Review Item Component
const ReviewItem = ({ review }) => {
  const customerName = review.customerId?.fullName || "Người dùng";
  const initials = customerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="bg-white border rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-start gap-4 mb-3">
        <Avatar className="w-10 h-10">
          <AvatarFallback className="bg-red-100 text-red-600 font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold">{customerName}</span>
            <span className="text-xs text-gray-500">
              {formatDate(review.createdAt)}
            </span>
          </div>

          {/* Stars */}
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${
                  star <= review.rating
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Comment */}
      <p className="text-gray-700 whitespace-pre-wrap">{review.comment}</p>
    </div>
  );
};

export default ReviewsTab;