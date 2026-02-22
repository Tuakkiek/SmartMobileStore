import mongoose from "mongoose";
import dotenv from "dotenv";
import Store from "../modules/store/Store.js";
import User from "../modules/auth/User.js";
import { connectDB } from "../config/db.js";

import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

const migrateBranches = async () => {
  try {
    await connectDB();
    console.log("✅ Database connected");

    const branches = [
      {
        code: "CT001",
        name: "Cần Thơ",
        address: {
          province: "Cần Thơ",
          district: "Ninh Kiều",
          ward: "Xuân Khánh",
          street: "Đường 3/2",
        },
        phone: "0123456789",
        email: "cantho@smartmobilestore.com",
        status: "ACTIVE",
        isHeadquarters: true,
      },
      {
        code: "HN001",
        name: "Hà Nội",
        address: {
          province: "Hà Nội",
          district: "Hoàn Kiếm",
          ward: "Hàng Trống",
          street: "Hàng Trống",
        },
        phone: "0987654321",
        email: "hanoi@smartmobilestore.com",
        status: "ACTIVE",
      },
      {
        code: "HCM001",
        name: "Hồ Chí Minh",
        address: {
          province: "Hồ Chí Minh",
          district: "Quận 1",
          ward: "Bến Nghé",
          street: "Nguyễn Huệ",
        },
        phone: "0909090909",
        email: "hcm@smartmobilestore.com",
        status: "ACTIVE",
      },
    ];

    let canThoStore = null;

    for (const branch of branches) {
      let store = await Store.findOne({ code: branch.code });
      if (!store) {
        store = await Store.create(branch);
        console.log(`✅ Created branch: ${branch.name}`);
      } else {
        // Update existing store to ensure correct name (diacritics) and email
        store.name = branch.name;
        store.address = branch.address; // ensure address is also updated
        if (branch.email) store.email = branch.email; // Update email
        await store.save();
        console.log(`✅ Updated existing branch: ${branch.name}`);
      }

      if (branch.code === "CT001") {
        canThoStore = store;
      }
    }

    if (canThoStore) {
      console.log(`📍 Assigning all users to 'Cần Thơ' (${canThoStore._id})...`);
      
      const result = await User.updateMany(
        {}, 
        { $set: { storeLocation: canThoStore._id.toString() } }
      );

      console.log(`✅ Updated ${result.modifiedCount} users to 'Cần Thơ'`);
    } else {
      console.error("❌ Critical Error: 'Cần Thơ' branch not found or created.");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
};

migrateBranches();
