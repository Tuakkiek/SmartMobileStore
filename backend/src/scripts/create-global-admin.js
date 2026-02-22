
import "dotenv/config";
import mongoose from "mongoose";
import User from "../modules/auth/User.js";

const run = async () => {
  try {
    const uri = process.env.MONGODB_CONNECTIONSTRING;
    if (!uri) {
      throw new Error("MONGODB_CONNECTIONSTRING is not defined in .env");
    }
    await mongoose.connect(uri);
    console.log("Connected to DB.");

    const phone = "0999888888"; // Distinctive phone number
    const password = "Password@123";

    // Check if user exists
    let user = await User.findOne({ phoneNumber: phone });

    if (user) {
      console.log("User found, updating role to GLOBAL_ADMIN...");
      user.role = "GLOBAL_ADMIN";
      user.password = password; // Reset password just in case
      await user.save();
    } else {
      console.log("Creating new GLOBAL_ADMIN user...");
      user = await User.create({
        fullName: "Super Global Admin",
        phoneNumber: phone,
        email: "super.global@admin.com",
        password: password,
        role: "GLOBAL_ADMIN",
        province: "Hanoi",
        ward: "Ba Dinh",
        detailAddress: "HQ",
        status: "ACTIVE"
      });
    }

    console.log("✅ Global Admin User Ready:");
    console.log(`Phone: ${phone}`);
    console.log(`Password: ${password}`);
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

run();
