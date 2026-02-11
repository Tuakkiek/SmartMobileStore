// Delete old iPhone 17 Pro Max
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const cleanup = async () => {
  try {
    const mongoURI = process.env.MONGODB_CONNECTIONSTRING;
    console.log("🔗 Connecting...");
    await mongoose.connect(mongoURI);
    console.log("✅ Connected");

    // Delete using mongoose connection directly
    await mongoose.connection.db.collection('universalproducts').deleteMany({ baseSlug: "iphone-17-pro-max" });
    await mongoose.connection.db.collection('universalvariants').deleteMany({});
    console.log("🗑️  Deleted old iPhone 17 Pro Max and variants");

    mongoose.connection.close();
    console.log("✅ Done!");
  } catch (error) {
    console.error("❌", error.message);
    process.exit(1);
  }
};

cleanup();
