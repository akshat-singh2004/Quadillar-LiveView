import { hasSupabaseConfig, supabase } from "@/app/lib/supabase";
import { seedFullProjectDemo } from "@/lib/seed/demoData";

export async function populateLiveViewDemo() {
  const seeded = await seedFullProjectDemo();
  const now = new Date().toISOString();
  const cdeItems = Array.from({ length: 12 }, (_, index) => ({ id: `cde-master-${index + 1}`, project_id: "proj-1", title: `GFC Drawing Revision ${String(index + 1).padStart(2, "0")}`, container: "CDE/Project/Issued", state: "Published", status: "Approved", revision: index + 1, is_latest: index === 11, approved: true, created_at: now, updated_at: now, submitted_by: "Demo Design Team" }));
  const rfis = Array.from({ length: 6 }, (_, index) => ({ id: `rfi-master-${index + 1}`, project_id: "proj-1", title: `Spatial coordination query ${index + 1}`, description: "Demo spatially pinned clarification for coordinated delivery.", submitted_by: "Site Engineer", submitted_at: now, due_at: new Date(Date.now() + (index + 1) * 86400000).toISOString(), current_owner: "Design Consultant", ball_in_court: "Consultant", status: "Open", contract_impact: "Time", risk_score: 55 + index * 5, spatial_pin: { x: 10 + index, y: 20 + index, z: 3 } }));
  const clashes = Array.from({ length: 8 }, (_, index) => ({ id: `clash-master-${index + 1}`, project_id: "proj-1", title: `Demo BIM clash ${index + 1}`, description: "Seeded coordination issue.", discipline: index % 2 ? "MEP" : "Structural", severity: index < 2 ? "Critical" : "Moderate", status: "Open", x: index * 8, y: index * 6, z: 3, created_at: now }));
  const sensors = ["Wind Anemometer", "Concrete Cure Temperature", "Noise", "Air Quality PM2.5", "Air Quality PM10"].map((metric, index) => ({ id: `iot-master-${index + 1}`, project_id: "proj-1", metric, location: "Demo site zone", value: [31, 27, 68, 22, 48][index], unit: index === 0 ? "km/h" : index === 1 ? "°C" : index < 3 ? "dB" : "µg/m³", threshold: [38, 30, 85, 90, 150][index], status: "Healthy", timestamp: now, trend: [18, 22, 25, 29, 31] }));
  const tables = [{ name: "cde_items", rows: cdeItems, conflict: "id" }, { name: "rfis", rows: rfis, conflict: "id" }, { name: "bim_clashes", rows: clashes, conflict: "id" }, { name: "iot_sensor_telemetry", rows: sensors, conflict: "id" }];
  const result: Record<string, unknown> = { base: seeded };
  for (const table of tables) { if (!hasSupabaseConfig || !supabase) { result[table.name] = table.rows; continue; } const { data, error } = await supabase.from(table.name).upsert(table.rows as unknown as Record<string, unknown>[], { onConflict: table.conflict }).select(); if (error) console.warn(`Master seed failed for ${table.name}:`, error.message); result[table.name] = data ?? table.rows; }
  return result;
}
