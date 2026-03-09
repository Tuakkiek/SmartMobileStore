import mongoose from "mongoose";

const templatePermissionSchema = new mongoose.Schema(
  {
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PermissionTemplate",
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
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

templatePermissionSchema.index(
  { templateId: 1, permissionId: 1, scopeType: 1, scopeId: 1 },
  { unique: true }
);

export default mongoose.models.TemplatePermission ||
  mongoose.model("TemplatePermission", templatePermissionSchema);
