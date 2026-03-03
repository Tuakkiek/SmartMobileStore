import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_CONNECTIONSTRING || process.env.MONGO_URI);
    const stores = await mongoose.connection.db.collection('stores').find({}).toArray();
    console.log("All stores in DB:", JSON.stringify(stores, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
run();
