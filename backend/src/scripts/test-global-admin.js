
import "dotenv/config";
import mongoose from "mongoose";
import User from "../modules/auth/User.js";
import { restrictTo } from "../middleware/authMiddleware.js";

const runTest = async () => {
  try {
    const uri = process.env.MONGODB_CONNECTIONSTRING;
    console.log("Connecting to DB...");
    if (!uri) {
      throw new Error("MONGODB_CONNECTIONSTRING is not defined in .env");
    }
    await mongoose.connect(uri);
    console.log("Connected.");
    
    // 1. Create GLOBAL_ADMIN user
    const phone = "0999999999";
    await User.deleteOne({ phoneNumber: phone });
    
    console.log("Creating Global Admin user...");
    const user = await User.create({
      fullName: "Global Admin Test",
      phoneNumber: phone,
      email: "global@admin.com",
      password: "Password@123",
      role: "GLOBAL_ADMIN",
      province: "Hanoi",
      ward: "Ba Dinh",
      detailAddress: "123 Test St",
      status: "ACTIVE"
    });
    
    console.log("User created:", user.role);

    // 2. Test Middleware Logic Directly
    console.log("Testing restrictTo('ADMIN') with GLOBAL_ADMIN user...");
    
    const req = {
      user: {
        role: "GLOBAL_ADMIN",
        _id: user._id
      }
    };
    
    const res = {
      status: (code) => ({
        json: (data) => console.log(`Response ${code}:`, data)
      })
    };
    
    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };
    
    // Test 1: access restricted to ADMIN
    restrictTo("ADMIN")(req, res, next);
    
    if (nextCalled) {
      console.log("✅ GLOBAL_ADMIN passed restrictTo('ADMIN')");
    } else {
      console.error("❌ GLOBAL_ADMIN failed restrictTo('ADMIN')");
      process.exit(1);
    }
    
    // Test 2: access restricted to WAREHOUSE_MANAGER
    nextCalled = false;
    console.log("Testing restrictTo('WAREHOUSE_MANAGER')...");
    restrictTo("WAREHOUSE_MANAGER")(req, res, next);
    
    if (nextCalled) {
        console.log("✅ GLOBAL_ADMIN passed restrictTo('WAREHOUSE_MANAGER')");
    } else {
        console.error("❌ GLOBAL_ADMIN failed restrictTo('WAREHOUSE_MANAGER')");
        process.exit(1);
    }

    // Cleanup
    await User.deleteOne({ _id: user._id });
    console.log("Test Complete. User cleaned up.");
    process.exit(0);

  } catch (error) {
    console.error("Test Failed:", error);
    process.exit(1);
  }
};

runTest();
