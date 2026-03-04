import mongoose from "mongoose";

const userPermissionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    permissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Permission",
      required: true,
      index: true,
    },
    scopeType: {
      type: String,
      enum: ["GLOBAL", "BRANCH", "SELF"],
      required: true,
      index: true,
    },
    scopeId: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "REVOKED"],
      default: "ACTIVE",
      index: true,
    },
    grantedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    grantedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    revokeReason: {
      type: String,
      trim: true,
      default: "",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

userPermissionSchema.index(
  { userId: 1, permissionId: 1, scopeType: 1, scopeId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "ACTIVE" },
  }
);
userPermissionSchema.index({ userId: 1, status: 1, grantedAt: -1 });

export default mongoose.models.UserPermission ||
  mongoose.model("UserPermission", userPermissionSchema);
