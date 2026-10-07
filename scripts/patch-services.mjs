import fs from "fs";
import path from "path";

const targetPath = path.resolve(process.cwd(), "app/lib/services.ts");

if (!fs.existsSync(targetPath)) {
    console.error("Could not find app/lib/services.ts");
    process.exit(1);
}

let content = fs.readFileSync(targetPath, "utf-8");

// 1. Replace the obsolete table reads and order query
const oldSelect = `.from("measurement_book_entries").select("*").order("measured_at", { ascending: false, nullsFirst: false });`;
const newSelect = `.from("digital_measurement_book_entries").select("*").order("created_at", { ascending: false });`;

// 2. Replace the upsert query target
const oldUpsert = `.from("measurement_book_entries").upsert([{ ...item }], { onConflict: "id" }).select().single();`;
const newUpsert = `.from("digital_measurement_book_entries").upsert([{ ...item }], { onConflict: "id" }).select().single();`;

let modified = false;

if (content.includes(oldSelect)) {
    content = content.replace(oldSelect, newSelect);
    modified = true;
} else if (content.includes('.from("measurement_book_entries")')) {
    content = content.replaceAll('.from("measurement_book_entries")', '.from("digital_measurement_book_entries")');
    content = content.replaceAll('"measured_at"', '"created_at"');
    modified = true;
}

if (modified) {
    fs.writeFileSync(targetPath, content, "utf-8");
    console.log("Successfully patched app/lib/services.ts to use digital_measurement_book_entries!");
} else {
    console.log("No obsolete measurement_book_entries targets found or already patched.");
}