import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import RoleDefinition from "../modules/auth/RoleDefinition.js";
import { ROLE_PERMISSIONS, SYSTEM_ROLES, BRANCH_ROLES, TASK_ROLES } from "../authz/actions.js";
import { connectDB } from "../config/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

const resolveScope = (role) => {
  if (SYSTEM_ROLES.includes(role)) return "SYSTEM";
  if (TASK_ROLES.includes(role)) return "TASK";
  if (BRANCH_ROLES.includes(role)) return "BRANCH";
  return "BRANCH";
};

const seed = async () => {
  await connectDB();

  const roles = Object.keys(ROLE_PERMISSIONS);
  for (const role of roles) {
    await RoleDefinition.updateOne(
      { key: role },
      {
        $set: {
          key: role,
          scope: resolveScope(role),
          permissions: ROLE_PERMISSIONS[role] || [],
          restrictions: [],
          active: true,
        },
      },
      { upsert: true }
    );
  }

  console.log(`Seeded ${roles.length} role definitions`);
  await mongoose.disconnect();
};

seed().catch(async (error) => {
  console.error("Seed role definitions failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
