import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Package, RefreshCw, CheckCircle, User } from "lucide-react";
import { orderAPI } from "@/lib/api";

const getImageUrl = (path) => {
  if (!path) return "https://via.placeholder.com/100?text=No+Image";
  if (path.startsWith("http")) return path;
  const baseUrl = String(import.meta.env.VITE_API_URL || "").replace(/\/api\/?$/, "");
  return `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
};

const POSOrderHandover = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadOrder = async () => {
      try {
        setLoading(true);
        const response = await orderAPI.getById(orderId);
        setOrder(response?.data?.order || null);
      } catch (error) {
        toast.error("Cannot load order details");
        navigate("/pos/dashboard");
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderId, navigate]);

  const handleChangeDevice = async () => {
    const reason = window.prompt(
      "Enter change reason:\n\nExamples:\n- Wrong color\n- Defective unit\n- Customer changed mind"
    );
    if (!reason?.trim()) {
      return;
    }

    try {
      setSubmitting(true);
      await orderAPI.updateStatus(orderId, {
        status: "CONFIRMED",
        note: `EXCHANGE REQUEST: ${reason.trim()}. Return to warehouse for new unit.`,
      });
      toast.success("Change request created. Order sent back to warehouse.");
      navigate("/pos/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.message || "Cannot create change request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmReceived = async () => {
    if (!window.confirm("Confirm customer received device?")) {
      return;
    }

    try {
      setSubmitting(true);
      await orderAPI.updateStatus(orderId, {
        status: "PENDING_PAYMENT",
        note: "Customer confirmed receipt, sent to cashier",
      });
      toast.success("Order sent to cashier");
      navigate("/CASHIER/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.message || "Cannot confirm customer receipt");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-3 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-600">Order not found</p>
            <Button className="mt-4" onClick={() => navigate("/pos/dashboard")}>
              Back to POS Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pickerName = order?.pickerInfo?.pickerName || "Warehouse Manager";

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            POS Handover Confirmation - Order #{order.orderNumber}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="rounded-lg border bg-blue-50 p-4">
            <p className="text-sm font-medium flex items-center gap-2">
              <User className="w-4 h-4" />
              Warehouse Manager
            </p>
            <p className="mt-1 text-sm">{pickerName}</p>
            {order?.pickerInfo?.pickedAt && (
              <p className="mt-1 text-xs text-gray-600">
                Ready at: {new Date(order.pickerInfo.pickedAt).toLocaleString("vi-VN")}
              </p>
            )}
          </div>

          <div className="space-y-3">
            {order.items?.map((item, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <img
                      src={getImageUrl(item.images?.[0] || item.image)}
                      alt={item.productName}
                      className="w-24 h-24 rounded object-cover"
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/100?text=No+Image";
                      }}
                    />
                    <div className="flex-1">
                      <p className="font-semibold">{item.productName}</p>
                      <p className="text-sm text-gray-600">
                        {[item.variantColor, item.variantStorage, item.variantName]
                          .filter(Boolean)
                          .join(" • ")}
                      </p>
                      <p className="text-sm mt-1">SKU: {item.variantSku}</p>
                      <p className="text-sm">Quantity: {item.quantity}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleChangeDevice}
              disabled={submitting}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Change Device
            </Button>
            <Button
              onClick={handleConfirmReceived}
              disabled={submitting}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirm Customer Received Device
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default POSOrderHandover;
