// backend/src/models/Attribute.js
import mongoose from "mongoose";

const attributeSchema = new mongoose.Schema({
  name: { type: String, required: true },  
  values: [{ type: String }], 
});

export default mongoose.model("Attribute", attributeSchema);