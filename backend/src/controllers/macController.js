// backend/src/controllers/macController.js
import { Mac, MacVariant } from "../models/Mac.js";

export const create = async (req, res) => {
  try {
    const { variants, ...productData } = req.body;
    const product = new Mac(productData);
    if (variants && variants.length > 0) {
      const createdVariants = await Promise.all(
        variants.map(async (v) => {
          const variant = new MacVariant({ ...v, productId: product._id });
          await variant.save();
          return variant._id;
        })
      );
      product.variants = createdVariants;
    }
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const findAll = async (req, res) => {
  try {
    const products = await Mac.find(req.query).populate("variants");
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const findOne = async (req, res) => {
  try {
    const product = await Mac.findById(req.params.id).populate("variants");
    if (!product) return res.status(404).json({ message: "Not found" });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const { variants, ...productData } = req.body;
    const product = await Mac.findByIdAndUpdate(req.params.id, productData, {
      new: true,
    });
    if (!product) return res.status(404).json({ message: "Not found" });
    if (variants) {
      await MacVariant.deleteMany({ productId: product._id });
      const createdVariants = await Promise.all(
        variants.map(async (v) => {
          const variant = new MacVariant({ ...v, productId: product._id });
          await variant.save();
          return variant._id;
        })
      );
      product.variants = createdVariants;
      await product.save();
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteMac = async (req, res) => {
  try {
    const product = await Mac.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Not found" });
    await MacVariant.deleteMany({ productId: product._id });
    await product.deleteOne();
    res.json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getVariants = async (req, res) => {
  try {
    const variants = await MacVariant.find({ productId: req.params.id });
    res.json(variants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};