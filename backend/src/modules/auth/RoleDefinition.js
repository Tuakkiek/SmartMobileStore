import mongoose from "mongoose";

const roleDefinitionSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    scope: {
      type: String,
      enum: ["SYSTEM", "BRANCH", "TASK"],
      required: true,
    },
    permissions: [
      {
        type: String,
        required: true,
      },
    ],
    restrictions: [
      {
        type: String,
      },
    ],
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

roleDefinitionSchema.index({ scope: 1, active: 1 });

export default mongoose.models.RoleDefinition ||
  mongoose.model("RoleDefinition", roleDefinitionSchema);
