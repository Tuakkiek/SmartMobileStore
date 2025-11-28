import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/shared/Loading";
import { CheckCircle, XCircle } from "lucide-react";
import { vnpayAPI } from "@/lib/api";

const VNPayReturnPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("loading");
  const [orderData, setOrderData] = useState(null);

  useEffect(() => {
    const handleReturn = async () => {
      try {
        const params = Object.fromEntries(searchParams.entries());
        const response = await vnpayAPI.returnHandler(params);

        if (response.data?.success) {
          setStatus("success");
          setOrderData({
            orderId: response.data.orderId,
            orderNumber: response.data.orderNumber,
            message: response.data.message,
          });
        } else {
          setStatus("failed");
          setOrderData({
            message: response.data?.message || "Thanh toán thất bại",
          });
        }
      } catch (error) {
        console.error("VNPay return error:", error);
        setStatus("error");
        setOrderData({
          message:
            error.response?.data?.message || error.message || "Lỗi hệ thống",
        });
      }
    };

    handleReturn();
  }, [searchParams]);

  if (status === "loading") {
    return <Loading />;
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <Card className="max-w-md mx-auto">
        <CardContent className="p-8 text-center">
          {status === "success" ? (
            <>
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">
                Thanh toán thành công!
              </h2>
              <p className="text-muted-foreground mb-6">
                Đơn hàng #{orderData?.orderNumber} đã được thanh toán
              </p>
              <Button onClick={() => navigate(`/orders/${orderData?.orderId}`)}>
                Xem chi tiết đơn hàng
              </Button>
            </>
          ) : (
            <>
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Thanh toán thất bại</h2>
              <p className="text-muted-foreground mb-6">
                {orderData?.message || "Vui lòng thử lại"}
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => navigate("/cart")}>
                  Quay lại giỏ hàng
                </Button>
                {orderData?.orderId && (
                  <Button
                    onClick={() => navigate(`/orders/${orderData.orderId}`)}
                  >
                    Xem đơn hàng
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VNPayReturnPage;
