export const getImageUrl = (imagePath) => {
  if (!imagePath) return "/placeholder.png";
  
  // Nếu đã là full URL
  if (imagePath.startsWith('http')) return imagePath;
  
  // Lấy base URL (bỏ /api nếu có)
  const getBaseUrl = () => {
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL.replace('/api', '');
    }
    // Fallback cho dev
    return 'http://localhost:5000';
  };
  
  const baseUrl = getBaseUrl();
  
  // Đảm bảo path bắt đầu bằng /
  const path = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  
  // Trả về absolute URL cho tất cả ảnh
  return `${baseUrl}${path}`;
};

/**
 * Check if image is from uploads folder
 */
export const isUploadedImage = (imagePath) => {
  return imagePath?.includes('/uploads/');
};