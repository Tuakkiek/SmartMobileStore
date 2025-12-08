import React, { useState } from "react";
import { toast } from "sonner";
import { Star, ThumbsUp, Edit2, Trash2, X, Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ReviewImageUploader from "@/components/product/ReviewImageUploader";
import ImageModal from "@/components/product/ImageModal";
import { reviewAPI } from "@/lib/api";

// Helper function
const getNameInitials = (name) => {
  if (!name) return "U";
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now - date;
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return "Hôm nay";
  if (diffInDays === 1) return "Hôm qua";
  if (diffInDays < 7) return `${diffInDays} ngày trước`;
  
  return date.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const ReviewItem = ({ 
  review, 
  isAuthenticated, 
  currentUserId, 
  onUpdate,
  isCustomer 
}) => {
  // States
  const [localHelpful, setLocalHelpful] = useState(review.helpful || 0);
  const [hasLiked, setHasLiked] = useState(
    Array.isArray(review.likedBy) &&
      review.likedBy.some((id) => id.toString() === currentUserId?.toString())
  );
  const [isLiking, setIsLiking] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editRating, setEditRating] = useState(review.rating);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [editComment, setEditComment] = useState(review.comment);
  const [editImages, setEditImages] = useState(review.images || []);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const customerName = review.customerId?.fullName || "Người dùng";
  const isOwner = currentUserId && review.customerId?._id.toString() === currentUserId.toString();

  // Like handler
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

  // Edit handlers
  const handleStartEdit = () => {
    setEditRating(review.rating);
    setEditComment(review.comment);
    setEditImages(review.images || []);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditRating(review.rating);
    setEditComment(review.comment);
    setEditImages(review.images || []);
    setHoveredRating(0);
  };

  const handleSaveEdit = async () => {
    if (editRating === 0) {
      toast.error("Vui lòng chọn số sao");
      return;
    }

    if (!editComment.trim()) {
      toast.error("Vui lòng nhập nội dung đánh giá");
      return;
    }

    try {
      setIsUpdating(true);
      
      const payload = {
        rating: editRating,
        comment: editComment.trim(),
        images: editImages,
      };

      const response = await reviewAPI.update(review._id, payload);

      if (response.data.success) {
        toast.success("Cập nhật đánh giá thành công!");
        setIsEditing(false);
        onUpdate(); // Refresh reviews list
      }
    } catch (error) {
      console.error("Error updating review:", error);
      toast.error(error.response?.data?.message || "Không thể cập nhật đánh giá");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Bạn có chắc muốn xóa đánh giá này?")) {
      return;
    }

    try {
      setIsDeleting(true);
      const response = await reviewAPI.delete(review._id);

      if (response.data.success) {
        toast.success("Đã xóa đánh giá");
        onUpdate(); // Refresh reviews list
      }
    } catch (error) {
      console.error("Error deleting review:", error);
      toast.error(error.response?.data?.message || "Không thể xóa đánh giá");
    } finally {
      setIsDeleting(false);
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
          <div className="flex items-center gap-2 mb-1 flex-wrap">
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
            
            {/* Owner Actions */}
            {isOwner && !isEditing && (
              <div className="flex items-center gap-1 ml-auto">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleStartEdit}
                  className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <Edit2 className="w-4 h-4 mr-1" />
                  Sửa
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Xóa
                </Button>
              </div>
            )}
          </div>

          {/* Rating - View Mode */}
          {!isEditing && (
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
          )}
        </div>
      </div>

      {/* Edit Mode */}
      {isEditing ? (
        <div className="space-y-4 mt-4">
          {/* Edit Rating */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Đánh giá của bạn <span className="text-red-600">*</span>
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setEditRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= (hoveredRating || editRating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Edit Comment */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Nội dung đánh giá <span className="text-red-600">*</span>
            </label>
            <Textarea
              value={editComment}
              onChange={(e) => setEditComment(e.target.value)}
              placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..."
              maxLength={3000}
              rows={5}
              className="resize-none"
            />
            <div className="text-xs text-gray-500 mt-1 text-right">
              {editComment.length}/3000
            </div>
          </div>

          {/* Edit Images */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Hình ảnh đánh giá
            </label>
            <ReviewImageUploader
              images={editImages}
              onChange={setEditImages}
              maxImages={5}
            />
          </div>

          {/* Edit Actions */}
          <div className="flex gap-3 pt-3 border-t">
            <Button
              variant="outline"
              onClick={handleCancelEdit}
              disabled={isUpdating}
              className="gap-2"
            >
              <X className="w-4 h-4" />
              Hủy
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={isUpdating || editRating === 0 || !editComment.trim()}
              className="bg-red-600 hover:bg-red-700 gap-2"
            >
              <Check className="w-4 h-4" />
              {isUpdating ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* View Mode - Comment */}
          <p className="text-gray-700 whitespace-pre-wrap mb-4">
            {review.comment}
          </p>

          {/* View Mode - Images */}
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
        </>
      )}
    </div>
  );
};

export default ReviewItem;