import mongoose from "mongoose";

const installmentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },

    provider: {
      type: String,
      enum: ["HD_SAISON", "FE_CREDIT", "HOME_CREDIT", "KREDIVO"],
      required: true,
    },

    customerName: String,
    customerIdCard: String,
    customerPhone: String,
    customerEmail: String,

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    downPayment: {
      type: Number,
      default: 0,
      min: 0,
    },
    loanAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    months: {
      type: Number,
      enum: [3, 6, 9, 12, 18, 24],
      required: true,
    },
    interestRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    monthlyPayment: {
      type: Number,
      required: true,
      min: 0,
    },

    applicationId: String,
    applicationDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"],
      default: "PENDING",
    },
    approvedAt: Date,
    rejectedAt: Date,
    rejectionReason: String,

    documents: [
      {
        type: {
          type: String,
          enum: ["ID_CARD", "INCOME_PROOF", "HOUSEHOLD_REGISTRATION"],
        },
        url: String,
        uploadedAt: Date,
      },
    ],

    paymentSchedule: [
      {
        month: Number,
        dueDate: Date,
        amount: Number,
        status: {
          type: String,
          enum: ["PENDING", "PAID", "OVERDUE"],
          default: "PENDING",
        },
        paidAt: Date,
        paidAmount: Number,
      },
    ],
  },
  { timestamps: true }
);

installmentSchema.index({ orderId: 1 });
installmentSchema.index({ provider: 1, status: 1 });
installmentSchema.index({ applicationId: 1 });

export default
  mongoose.models.Installment ||
  mongoose.model("Installment", installmentSchema);
