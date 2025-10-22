import { IPhone, IPhoneVariant } from '../models/IPhone.js';


exports.create = async (req, res) => {
  try {
    const { variants, ...productData } = req.body;
    const product = new IPhone(productData);
    if (variants && variants.length > 0) {
      const createdVariants = await Promise.all(variants.map(async (v) => {
        const variant = new IPhoneVariant({ ...v, productId: product._id });
        await variant.save();
        return variant._id;
      }));
      product.variants = createdVariants;
    }
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.findAll = async (req, res) => {
  try {
    const products = await IPhone.find(req.query).populate('variants');
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.findOne = async (req, res) => {
  try {
    const product = await IPhone.findById(req.params.id).populate('variants');
    if (!product) return res.status(404).json({ message: 'Not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { variants, ...productData } = req.body;
    const product = await IPhone.findByIdAndUpdate(req.params.id, productData, { new: true });
    if (!product) return res.status(404).json({ message: 'Not found' });
    // Handle variant updates (simplified: delete old, create new)
    if (variants) {
      await IPhoneVariant.deleteMany({ productId: product._id });
      const createdVariants = await Promise.all(variants.map(async (v) => {
        const variant = new IPhoneVariant({ ...v, productId: product._id });
        await variant.save();
        return variant._id;
      }));
      product.variants = createdVariants;
      await product.save();
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const product = await IPhone.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Not found' });
    await IPhoneVariant.deleteMany({ productId: product._id });
    await product.deleteOne();
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getVariants = async (req, res) => {
  try {
    const variants = await IPhoneVariant.find({ productId: req.params.id });
    res.json(variants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};