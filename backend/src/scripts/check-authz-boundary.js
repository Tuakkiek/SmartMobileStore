import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const targetFiles = [
  path.join(projectRoot, "modules", "analytics", "analyticsController.js"),
];

const forbiddenPatterns = [
  /req\.user\.role/g,
  /req\.user\.storeLocation/g,
  /restrictTo\(/g,
];

let violations = 0;

for (const filePath of targetFiles) {
  const content = fs.readFileSync(filePath, "utf8");
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(content)) {
      violations += 1;
      console.error(`[AUTHZ-BOUNDARY] Forbidden pattern ${pattern} found in ${filePath}`);
    }
  }
}

if (violations > 0) {
  console.error(`[AUTHZ-BOUNDARY] Failed with ${violations} violation(s).`);
  process.exit(1);
}

console.log("[AUTHZ-BOUNDARY] Passed.");
