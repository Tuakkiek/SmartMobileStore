import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { reviewAPI } from "@/lib/api";
import { toast } from "sonner";
import {
  Star,
  MessageSquare,
  ThumbsUp,
  ImageIcon,
  ShoppingBag,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, getNameInitials } from "@/lib/utils";
import ReviewImageUploader from "@/components/product/ReviewImageUploader";
import ImageModal from "@/components/product/ImageModal";

export const ReviewsTab = ({ productId, product }) => {
  const { user, isAuthenticated } = useAuthStore();
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showImagesOnly, setShowImagesOnly] = useState(false);

  // Review form state
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviewImages, setReviewImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Purchase verification
  const [canReview, setCanReview] = useState(false);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [checkingPurchase, setCheckingPurchase] = useState(false);

  const isAdmin = user?.role === "ADMIN";
  const isCustomer = user?.role === "CUSTOMER";

  useEffect(() => {
    fetchReviews();
  }, [productId, showImagesOnly]);

  // ✅ Check if user can review
  useEffect(() => {
    if (isAuthenticated && isCustomer) {
      checkCanReview();
    }
  }, [isAuthenticated, isCustomer, productId]);

  const checkCanReview = async () => {
    try {
      setCheckingPurchase(true);
      const response = await reviewAPI.canReview(productId);
      const data = response.data.data;

      setCanReview(data.canReview);
      setAvailableOrders(data.orders || []);

      if (data.orders && data.orders.length > 0) {
        setSelectedOrderId(data.orders[0]._id);
      }
    } catch (error) {
      console.error("Error checking review eligibility:", error);
    } finally {
      setCheckingPurchase(false);
    }
  };

  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      const response = await reviewAPI.getByProduct(productId, {
        hasImages: showImagesOnly ? "true" : undefined,
      });
      setReviews(response.data.data.reviews || []);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      toast.error("Không thể tải đánh giá");
    } finally {
      setIsLoading(false);
    }
  };

  const ratingDistribution = {
    5: reviews.filter((r) => r.rating === 5).length,
    4: reviews.filter((r) => r.rating === 4).length,
    3: reviews.filter((r) => r.rating === 3).length,
    2: reviews.filter((r) => r.rating === 2).length,
    1: reviews.filter((r) => r.rating === 1).length,
  };

  const maxCount = Math.max(...Object.values(ratingDistribution), 1);

  const filteredReviews =
    activeFilter === "all"
      ? reviews
      : reviews.filter((r) => r.rating === parseInt(activeFilter));

  const handleSubmitReview = async () => {
    if (!isAuthenticated) {
      toast.error("Vui lòng đăng nhập để đánh giá");
      return;
    }

    if (!canReview) {
      toast.error("Bạn cần mua sản phẩm để đánh giá");
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

    if (!selectedOrderId) {
      toast.error("Vui lòng chọn đơn hàng");
      return;
    }

    const productModelMap = {
      iPhone: "IPhone",
      iPad: "IPad",
      Mac: "Mac",
      AirPods: "AirPods",
      AppleWatch: "AppleWatch",
      Accessory: "Accessory",
    };

    const payload = {
      productId,
      productModel: productModelMap[product.category] || product.category,
      orderId: selectedOrderId,
      rating,
      comment: comment.trim(),
      images: reviewImages,
    };

    try {
      setIsSubmitting(true);
      await reviewAPI.create(payload);
      toast.success("Đánh giá thành công!");
      setRating(0);
      setComment("");
      setReviewImages([]);
      setShowReviewForm(false);
      fetchReviews();
      checkCanReview();
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error(error.response?.data?.message || "Không thể gửi đánh giá");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Review Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white border rounded-2xl p-6 sticky top-4">
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
                        width: `${
                          (ratingDistribution[star] / maxCount) * 100
                        }%`,
                      }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-8 text-right">
                    {ratingDistribution[star]}
                  </span>
                </div>
              ))}
            </div>

            {/* Review Button */}
            {isAuthenticated && isCustomer && (
              <div className="space-y-3">
                {checkingPurchase ? (
                  <div className="text-center text-sm text-gray-500">
                    Đang kiểm tra...
                  </div>
                ) : canReview ? (
                  <Button
                    onClick={() => setShowReviewForm(!showReviewForm)}
                    className="w-full bg-red-600 hover:bg-red-700"
                  >
                    {showReviewForm ? "Đóng form" : "Đánh giá sản phẩm"}
                  </Button>
                ) : (
                  // <div className="text-center p-4 bg-gray-50 rounded-lg border">
                  //   <Lock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  //   <p className="text-sm text-gray-600 font-medium mb-1">
                  //     Chưa thể đánh giá
                  //   </p>
                  //   <p className="text-xs text-gray-500">
                  //     Bạn cần mua và nhận sản phẩm trước khi đánh giá
                  //   </p>
                  // </div>
                  <div></div>
                )}
              </div>
            )}

            {!isAuthenticated && (
              <div className="text-center p-4 bg-gray-50 rounded-lg border">
                <Lock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  Đăng nhập để đánh giá sản phẩm
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Reviews List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
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
                variant={
                  activeFilter === star.toString() ? "default" : "outline"
                }
                size="sm"
                onClick={() => setActiveFilter(star.toString())}
                className={activeFilter === star.toString() ? "bg-red-600" : ""}
              >
                {star} <Star className="w-3 h-3 ml-1" /> (
                {ratingDistribution[star]})
              </Button>
            ))}

            {/* Filter by images */}
            <Button
              variant={showImagesOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowImagesOnly(!showImagesOnly)}
              className={`ml-auto gap-2 ${showImagesOnly ? "bg-red-600" : ""}`}
            >
              <ImageIcon className="w-4 h-4" />
              Có hình ảnh
            </Button>
          </div>

          {/* Review Form */}
          {showReviewForm && canReview && (
            <div className="bg-white border rounded-2xl p-6">
              <h3 className="font-bold text-lg mb-4">Viết đánh giá của bạn</h3>

              {/* Order Selection */}
              {/* {availableOrders.length > 1 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Chọn đơn hàng <span className="text-red-600">*</span>
                  </label>
                  <Select
                    value={selectedOrderId}
                    onValueChange={setSelectedOrderId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn đơn hàng" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableOrders.map((order) => (
                        <SelectItem key={order._id} value={order._id}>
                          <div className="flex items-center gap-2">
                            <ShoppingBag className="w-4 h-4" />
                            {order.orderNumber}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )} */}

              {/* Rating */}
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

              {/* Image Upload */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Thêm hình ảnh (Tùy chọn)
                </label>
                <ReviewImageUploader
                  images={reviewImages}
                  onChange={setReviewImages}
                  maxImages={5}
                />
              </div>

              {/* Submit */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowReviewForm(false);
                    setRating(0);
                    setComment("");
                    setReviewImages([]);
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

          {/* Reviews */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="text-center py-12 bg-white border rounded-2xl">
              <p className="text-gray-500">
                {showImagesOnly
                  ? "Chưa có đánh giá nào với hình ảnh"
                  : activeFilter === "all"
                  ? "Chưa có đánh giá nào"
                  : `Chưa có đánh giá ${activeFilter} sao`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReviews.map((review) => (
                <ReviewItem
                  key={review._id}
                  review={review}
                  isAdmin={isAdmin}
                  isCustomer={isCustomer}
                  currentUserId={user?._id}
                  onUpdate={fetchReviews}
                  isAuthenticated={isAuthenticated}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Review Item Component (simplified for brevity)
const ReviewItem = ({ review, isAuthenticated, currentUserId, onUpdate }) => {
  const [localHelpful, setLocalHelpful] = useState(review.helpful || 0);
  const [hasLiked, setHasLiked] = useState(
    Array.isArray(review.likedBy) &&
      review.likedBy.some((id) => id.toString() === currentUserId?.toString())
  );
  const [isLiking, setIsLiking] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const customerName = review.customerId?.fullName || "Người dùng";

  const handleLike = async () => {
    if (!isAuthenticated) {
      toast.error("Vui lòng đăng nhập để thích đánh giá");
      return;
    }

    try {
      setIsLiking(true);
      const newHasLiked = !hasLiked;
      const newHelpful = hasLiked ? localHelpful - 1 : localHelpful + 1;

      setHasLiked(newHasLiked);
      setLocalHelpful(newHelpful);

      const response = await reviewAPI.likeReview(review._id);

      if (response.data.success) {
        setLocalHelpful(response.data.data.helpful);
        setHasLiked(response.data.data.hasLiked);
      }
    } catch (error) {
      setHasLiked(hasLiked);
      setLocalHelpful(localHelpful);
      toast.error("Không thể thích đánh giá");
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <div className="bg-white border rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-start gap-4 mb-3">
        <Avatar className="w-10 h-10">
          {review.customerId?.avatar && (
            <AvatarImage src={review.customerId.avatar} alt={customerName} />
          )}
          <AvatarFallback className="bg-red-100 text-red-600 font-semibold">
            {getNameInitials(customerName)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold">{customerName}</span>
            {review.purchaseVerified && (
              <Badge
                variant="secondary"
                className="text-xs bg-green-100 text-green-700"
              >
                ✓ Đã mua hàng
              </Badge>
            )}
            <span className="text-xs text-gray-500">
              {formatDate(review.createdAt)}
            </span>
          </div>

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
      <p className="text-gray-700 whitespace-pre-wrap mb-4">{review.comment}</p>

      {/* Images */}
      {review.images && review.images.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-4">
          {review.images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => {
                setSelectedImageIndex(idx);
                setShowImageModal(true);
              }}
              className="aspect-square rounded-lg overflow-hidden border hover:border-red-500 transition-colors"
            >
              <img
                src={img}
                alt={`Review ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && (
        <ImageModal
          images={review.images}
          selectedIndex={selectedImageIndex}
          onClose={() => setShowImageModal(false)}
          onNext={() => {
            setSelectedImageIndex((prev) =>
              prev < review.images.length - 1 ? prev + 1 : 0
            );
          }}
          onPrev={() => {
            setSelectedImageIndex((prev) =>
              prev > 0 ? prev - 1 : review.images.length - 1
            );
          }}
        />
      )}

      {/* Like Button */}
      <div className="flex items-center gap-4 pt-3 border-t">
        <button
          onClick={handleLike}
          disabled={isLiking}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            hasLiked
              ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
              : "bg-gray-50 text-gray-600 hover:bg-gray-100"
          } ${isLiking ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <ThumbsUp
            className={`w-4 h-4 transition-all ${
              hasLiked ? "fill-blue-600" : ""
            }`}
          />
          <span className="text-sm font-medium">
            {localHelpful > 0 && `${localHelpful} `}
            Hữu ích
          </span>
        </button>
      </div>
    </div>
  );
};

export default ReviewsTab;
