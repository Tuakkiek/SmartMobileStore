// ============================================
// FILE: backend/src/modules/warehouse/CycleCount.js
// Quản lý phiếu kiểm kê định kỳ
// ============================================

import mongoose from "mongoose";

const cycleCountSchema = new mongoose.Schema(
  {
    // Mã phiếu kiểm kê: KK-2025-001
    countNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Phạm vi kiểm kê
    scope: {
      warehouse: {
        type: String,
        required: true,
        default: "WH-HCM",
      },
      zone: {
        type: String,
        trim: true,
      },
      aisle: {
        type: String,
        trim: true,
      },
      // Nếu zone và aisle null => kiểm kê toàn kho
    },

    // Ngày kiểm kê
    countDate: {
      type: Date,
      required: true,
    },

    // Nhân viên thực hiện
    assignedTo: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        userName: {
          type: String,
          required: true,
        },
      },
    ],

    // Chi tiết kiểm kê
    items: [
      {
        locationId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "WarehouseLocation",
          required: true,
        },
        locationCode: {
          type: String,
          required: true,
        },
        sku: {
          type: String,
          required: true,
        },
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "UniversalProduct",
          required: true,
        },
        productName: {
          type: String,
          required: true,
        },
        systemQuantity: {
          type: Number,
          required: true, // Số lượng theo sổ sách
        },
        countedQuantity: {
          type: Number,
          required: true, // Số lượng thực tế đếm được
        },
        variance: {
          type: Number,
          required: true, // Chênh lệch
        },
        notes: {
          type: String,
          trim: true,
        },
        status: {
          type: String,
          enum: ["MATCHED", "VARIANCE", "INVESTIGATING"],
          default: "MATCHED",
        },
      },
    ],

    // Tổng kết
    summary: {
      totalLocations: {
        type: Number,
        default: 0,
      },
      matchedLocations: {
        type: Number,
        default: 0,
      },
      varianceLocations: {
        type: Number,
        default: 0,
      },
      totalVariance: {
        type: Number,
        default: 0,
      },
    },

    // Trạng thái
    status: {
      type: String,
      enum: ["DRAFT", "IN_PROGRESS", "COMPLETED", "APPROVED", "REJECTED"],
      default: "DRAFT",
    },

    // Người tạo
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    createdByName: {
      type: String,
      required: true,
    },

    // Người duyệt
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    approvedByName: {
      type: String,
    },

    approvedAt: {
      type: Date,
    },

    // Ghi chú
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
cycleCountSchema.index({ countNumber: 1 });
cycleCountSchema.index({ status: 1 });
cycleCountSchema.index({ countDate: -1 });
cycleCountSchema.index({ createdBy: 1 });
cycleCountSchema.index({ "scope.zone": 1, "scope.aisle": 1 });

export default mongoose.model("CycleCount", cycleCountSchema);
