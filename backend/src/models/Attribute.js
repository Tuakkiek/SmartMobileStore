import mongoose from "mongoose";

const attributeSchema = new mongoose.Schema({
  name: { type: String, required: true },  // e.g., "Màu sắc", "Dung lượng"
  values: [{ type: String }],  // e.g., ["Black", "Blue", "128GB", "256GB"]
});

export default mongoose.model("Attribute", attributeSchema);