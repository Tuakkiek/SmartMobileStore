import mongoose from "mongoose";

const tradeInSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    oldProduct: {
      category: String,
      brand: String,
      model: String,
      year: Number,
      storage: String,
      color: String,
      imei: String,
    },

    condition: {
      screen: {
        type: String,
        enum: ["PERFECT", "GOOD", "SCRATCHED", "CRACKED"],
      },
      body: {
        type: String,
        enum: ["PERFECT", "GOOD", "SCRATCHED", "DENTED"],
      },
      battery: {
        type: String,
        enum: ["EXCELLENT", "GOOD", "FAIR", "POOR"],
      },
      health: Number,
      functionalIssues: [String],
      accessories: {
        box: Boolean,
        charger: Boolean,
        earphones: Boolean,
        cable: Boolean,
      },
    },

    images: [String],

    estimatedValue: {
      type: Number,
      default: 0,
      min: 0,
    },

    finalValue: {
      type: Number,
      default: 0,
      min: 0,
    },

    evaluatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    evaluatedAt: Date,
    evaluationNotes: String,

    status: {
      type: String,
      enum: [
        "PENDING_EVALUATION",
        "EVALUATED",
        "ACCEPTED",
        "REJECTED",
        "COMPLETED",
      ],
      default: "PENDING_EVALUATION",
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
  },
  { timestamps: true }
);

tradeInSchema.index({ customerId: 1, createdAt: -1 });
tradeInSchema.index({ status: 1, createdAt: -1 });
tradeInSchema.index({ orderId: 1 });

export default mongoose.models.TradeIn || mongoose.model("TradeIn", tradeInSchema);
