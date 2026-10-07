import fs from "fs";
import path from "path";

const targetPath = path.resolve(process.cwd(), "components/auth/PersonnelAuthGate.tsx");
if (fs.existsSync(targetPath)) {
  let content = fs.readFileSync(targetPath, "utf-8");

  // Replace static DEFAULT_PROJECT_ID initialization with active project fallback
  content = content.replace(
    /const \[projectId, setProjectId\] = useState\(DEFAULT_PROJECT_ID\);/g,
    'const [projectId, setProjectId] = useState("GOMTI-NAGAR-PH1-FITOUT");'
  );
  content = content.replace(
    /const DEFAULT_PROJECT_ID = [^;]+;/g,
    'const DEFAULT_PROJECT_ID = "GOMTI-NAGAR-PH1-FITOUT";'
  );

  fs.writeFileSync(targetPath, content, "utf-8");
  console.log("✓ Corrected PersonnelAuthGate.tsx to match GOMTI-NAGAR-PH1-FITOUT.");
}
