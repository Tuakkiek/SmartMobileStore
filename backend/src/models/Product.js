import mongoose from "mongoose";
import IPhone from "./IPhone.js";
import IPad from "./IPad.js";
import Mac from "./Mac.js";
import AirPods from "./AirPods.js";
import AppleWatch from "./AppleWatch.js";
import Accessory from "./Accessory.js";

const PRODUCT_MODELS = {
  iPhone: IPhone,
  iPad: IPad,
  Mac: Mac,
  AirPods: AirPods,
  AppleWatch: AppleWatch,
  Accessory: Accessory,
};

export const findProductById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  for (const [category, Model] of Object.entries(PRODUCT_MODELS)) {
    const product = await Model.findById(id);
    if (product) {
      return product;
    }
  }
  return null;
};

export const findProductsByCategory = async (category) => {
  const Model = PRODUCT_MODELS[category];
  if (!Model) {
    throw new Error(`Unknown category: ${category}`);
  }
  return await Model.find();
};

export const aggregateProducts = async (pipeline) => {
  const results = [];
  
  for (const [category, Model] of Object.entries(PRODUCT_MODELS)) {
    try {
      const products = await Model.aggregate(pipeline);
      results.push(...products);
    } catch (error) {
      console.error(`Error aggregating ${category}:`, error);
    }
  }
  
  return results;
};

export { PRODUCT_MODELS };
