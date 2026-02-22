import mongoose from "mongoose";

const authzAuditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    action: { type: String, required: true, trim: true, index: true },
    decision: { type: String, enum: ["ALLOW", "DENY"], required: true, index: true },
    reasonCode: { type: String, trim: true, index: true },
    scopeMode: { type: String, trim: true },
    activeBranchId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", index: true },
    simulatedBranchId: { type: mongoose.Schema.Types.ObjectId, ref: "Store" },
    resourceType: { type: String, trim: true },
    resourceId: { type: String, trim: true },
    requestId: { type: String, trim: true, index: true },
    method: { type: String, trim: true },
    path: { type: String, trim: true },
    ip: { type: String, trim: true },
    userAgent: { type: String, trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

authzAuditLogSchema.index({ createdAt: -1, action: 1, decision: 1 });

export default mongoose.models.AuthzAuditLog ||
  mongoose.model("AuthzAuditLog", authzAuditLogSchema);
