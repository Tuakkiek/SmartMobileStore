
import mongoose from "mongoose";
import dotenv from "dotenv";
import UniversalProduct from "../modules/product/UniversalProduct.js";

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_CONNECTIONSTRING);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const run = async () => {
  await connectDB();

  const searchTerm = "test-phone-transfer";
  console.log(`Searching for products matching "${searchTerm}"...`);

  const products = await UniversalProduct.find({
    $or: [
      { name: { $regex: searchTerm, $options: "i" } },
      { slug: { $regex: searchTerm, $options: "i" } },
      { baseSlug: { $regex: searchTerm, $options: "i" } }
    ]
  });

  console.log(`Found ${products.length} products.`);
  console.log(JSON.stringify(products, null, 2));

  process.exit();
};

run();
