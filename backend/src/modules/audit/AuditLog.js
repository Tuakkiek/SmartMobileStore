import mongoose from "mongoose";

const actorSchema = new mongoose.Schema(
  {
    actorType: {
      type: String,
      enum: ["USER", "SYSTEM"],
      required: true,
      default: "SYSTEM",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      default: null,
    },
    role: {
      type: String,
      trim: true,
      default: "",
    },
    source: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const requestContextSchema = new mongoose.Schema(
  {
    requestId: { type: String, trim: true, default: "" },
    method: { type: String, trim: true, default: "" },
    path: { type: String, trim: true, default: "" },
    ip: { type: String, trim: true, default: "" },
    userAgent: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const failureContextSchema = new mongoose.Schema(
  {
    httpStatus: { type: Number },
    errorCode: { type: String, trim: true, default: "" },
    errorMessage: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const auditLogSchema = new mongoose.Schema(
  {
    entityType: { type: String, required: true, trim: true, index: true },
    entityId: { type: String, required: true, trim: true, index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", index: true, default: null },
    actionType: { type: String, required: true, trim: true, index: true },
    outcome: {
      type: String,
      enum: ["SUCCESS", "FAILED"],
      required: true,
      index: true,
    },
    actor: { type: actorSchema, required: true, default: () => ({ actorType: "SYSTEM" }) },
    oldValues: { type: mongoose.Schema.Types.Mixed, default: {} },
    newValues: { type: mongoose.Schema.Types.Mixed, default: {} },
    changedPaths: [{ type: String, trim: true }],
    note: { type: String, trim: true, default: "" },
    reason: { type: String, trim: true, default: "" },
    requestContext: { type: requestContextSchema, default: () => ({}) },
    failureContext: { type: failureContextSchema, default: () => ({}) },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ orderId: 1, createdAt: -1 });
auditLogSchema.index({ "actor.userId": 1, createdAt: -1 });
auditLogSchema.index({ branchId: 1, createdAt: -1 });
auditLogSchema.index({ actionType: 1, createdAt: -1 });
auditLogSchema.index({ outcome: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ changedPaths: 1 });

const APPEND_ONLY_ERROR_CODE = "AUDIT_LOG_APPEND_ONLY";
const APPEND_ONLY_ERROR_MESSAGE = "Audit logs are append-only and cannot be modified or deleted";

const createAppendOnlyError = () => {
  const error = new Error(APPEND_ONLY_ERROR_MESSAGE);
  error.code = APPEND_ONLY_ERROR_CODE;
  return error;
};

auditLogSchema.pre("save", function appendOnlySave(next) {
  if (!this.isNew) {
    return next(createAppendOnlyError());
  }
  return next();
});

for (const hook of [
  "updateOne",
  "updateMany",
  "findOneAndUpdate",
  "replaceOne",
  "deleteOne",
  "deleteMany",
  "findOneAndDelete",
  "findOneAndRemove",
]) {
  auditLogSchema.pre(hook, function appendOnlyHook(next) {
    return next(createAppendOnlyError());
  });
}

export const AUDIT_LOG_APPEND_ONLY_ERROR_CODE = APPEND_ONLY_ERROR_CODE;

export default mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);
