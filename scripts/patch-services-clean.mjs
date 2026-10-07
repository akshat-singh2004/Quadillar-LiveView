import fs from "fs";
import path from "path";

const servicesPath = path.resolve(process.cwd(), "app/lib/services.ts");
if (fs.existsSync(servicesPath)) {
  let content = fs.readFileSync(servicesPath, "utf-8");

  content = content.replace(
    /return fallbackMeasurementBookEntries\.filter\([^)]*\);/g,
    "return [];"
  );

  fs.writeFileSync(servicesPath, content, "utf-8");
  console.log("✓ Successfully patched measurement book fallbacks in app/lib/services.ts");
}
