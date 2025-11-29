import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button"; // Giả sử bạn dùng component Button của shadcn
import  { useNavigate } from "react-router-dom";
/**
 * Trang 404 - Không tìm thấy
 * Hiển thị khi người dùng truy cập một đường dẫn không tồn tại.
 */
const page404 = () => {

  const navigate = useNavigate();
  return (
    <div className="flex items-center justify-center min-h-screen bg-background text-center p-6 bg-cover bg-center relative" style={{ backgroundImage: "url('/page_404.png')" }}>
      <div className="absolute bottom-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
        Quay lại
      </Button>
      </div>
    </div>
  );
};

export default page404;
