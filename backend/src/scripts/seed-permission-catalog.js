import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "../config/db.js";
import { ensurePermissionCatalogSeeded } from "../authz/permissionCatalog.js";
import { ensurePermissionTemplatesSeeded } from "../authz/permissionTemplateService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

const run = async () => {
  await connectDB();

  const catalogCount = await ensurePermissionCatalogSeeded();
  const templateCount = await ensurePermissionTemplatesSeeded();

  console.log("Permission seed complete", {
    catalogDefinitionsUpserted: catalogCount,
    systemTemplatesUpserted: templateCount,
  });

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Permission seed failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
