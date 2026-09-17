import { hasSupabaseConfig, supabase } from "@/app/lib/supabase";

export async function seedFullProjectDemo() {
  const project = {
    id: "proj-1",
    name: "Quadillar Residential Tower 01",
    appointing_party: "Quadillar Real Estate Developers",
    lead_gc: "Apex Infrastructure Ltd.",
    summary: "Full end-to-end construction lifecycle demo for executive and operational review.",
    status: "Active",
    created_at: new Date().toISOString(),
  };

  const tables = [
    { name: "projects", rows: [project] },
    { name: "cde_items", conflict: "id", rows: [
      { id: "cde-demo-1", project_id: "proj-1", title: "GFC Structural Grid - Level 02", container: "CDE/Project/Structural", state: "Published", status: "Approved", revision: 3, is_latest: true, approved: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), submitted_by: "Structural Lead", metadata: { uniclass: "EF_20_10", retentionPeriodMet: true } },
      { id: "cde-demo-2", project_id: "proj-1", title: "MEP Coordination GFC Pack", container: "CDE/Project/MEP", state: "Published", status: "Approved", revision: 2, is_latest: true, approved: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), submitted_by: "MEP Lead", metadata: { uniclass: "Pr_70_65", retentionPeriodMet: true } },
    ] },
    { name: "rfis", conflict: "id", rows: [
      { id: "rfi-demo-101", project_id: "proj-1", title: "Curtain wall anchor detail", description: "Clarify anchor capacity at façade edge panel.", submitted_by: "Site Engineer", submitted_at: new Date().toISOString(), due_at: new Date(Date.now() + 3600000 * 24).toISOString(), current_owner: "Design Consultant", ball_in_court: "Consultant", status: "PendingResponse", contract_impact: "CostAndTime", risk_score: 80 },
      { id: "rfi-demo-102", project_id: "proj-1", title: "MEP sleeve penetration", description: "Confirm sleeve layout at plant room wall.", submitted_by: "Site Engineer", submitted_at: new Date().toISOString(), due_at: new Date(Date.now() + 3600000 * 16).toISOString(), current_owner: "MEP Consultant", ball_in_court: "Consultant", status: "Open", contract_impact: "Time", risk_score: 66 },
      { id: "rfi-demo-103", project_id: "proj-1", title: "Concrete pour sequence", description: "Confirm pour sequence for slab strips.", submitted_by: "Site Engineer", submitted_at: new Date().toISOString(), due_at: new Date(Date.now() + 3600000 * 30).toISOString(), current_owner: "Structural Engineer", ball_in_court: "Designer", status: "PendingResponse", contract_impact: "Cost", risk_score: 58 },
    ] },
    { name: "change_orders", conflict: "id", rows: [
      { id: "co-demo-1", project_id: "proj-1", title: "Facade Interface Revision", description: "Additional glazing interface adjustment.", rfc_id: "rfc-demo-1", status: "AwaitingApproval", amount: 1450000, time_impact_days: 10, created_at: new Date().toISOString(), approval_due_at: new Date(Date.now() + 3600000 * 72).toISOString() },
      { id: "co-demo-2", project_id: "proj-1", title: "Roof Access Route Amendment", description: "Temporary access route change for crane lift sequencing.", rfc_id: "rfc-demo-2", status: "AwaitingApproval", amount: 820000, time_impact_days: 4, created_at: new Date().toISOString(), approval_due_at: new Date(Date.now() + 3600000 * 48).toISOString() },
    ] },
    { name: "custom_milestones", conflict: "milestone_id", rows: [
      { milestone_id: "ms-001", project_id: "proj-1", title: "Core Shell Structural Completion", description: "Complete the reinforced concrete core shell and obtain consultant signoff.", sequence_order: 1, target_completion_date: "2026-09-15", allocated_budget_inr: 4200000, status: "In_Progress" },
      { milestone_id: "ms-002", project_id: "proj-1", title: "MEP Rough-in Ready for Inspection", description: "Coordinate the MEP rough-in and complete mandatory testing gates.", sequence_order: 2, target_completion_date: "2026-09-30", allocated_budget_inr: 3100000, status: "Under_Verification" },
    ] },
    { name: "contractor_milestone_allocations", conflict: "allocation_id", rows: [
      { allocation_id: "alloc-001", project_id: "proj-1", milestone_id: "ms-001", contractor_name: "Narmada Concrete Works", trade_specialization: "Concrete", assigned_contract_value_inr: 2100000, performance_status: "Active_On_Site" },
      { allocation_id: "alloc-002", project_id: "proj-1", milestone_id: "ms-001", contractor_name: "Metro Structural Consultants", trade_specialization: "Structural Design", assigned_contract_value_inr: 600000, performance_status: "Mobilized" },
      { allocation_id: "alloc-003", project_id: "proj-1", milestone_id: "ms-002", contractor_name: "Sundar MEP Services", trade_specialization: "MEP", assigned_contract_value_inr: 1850000, performance_status: "Active_On_Site" },
    ] },
    { name: "material_testing_logs", rows: [
      { id: "mat-demo-1", project_id: "proj-demo-01", grade: "M25", target_strength_mpa: 25, seven_day_strength: 16.5, twenty_eight_day_strength: 31.1, status: "Pass", tested_at: new Date().toISOString() },
      { id: "mat-demo-2", project_id: "proj-demo-01", grade: "M30", target_strength_mpa: 30, seven_day_strength: 20.4, twenty_eight_day_strength: 36.2, status: "Pass", tested_at: new Date().toISOString() },
      { id: "mat-demo-3", project_id: "proj-demo-01", grade: "M30", target_strength_mpa: 30, seven_day_strength: 19.1, twenty_eight_day_strength: 35.4, status: "Pass", tested_at: new Date().toISOString() },
      { id: "mat-demo-4", project_id: "proj-demo-01", grade: "M25", target_strength_mpa: 25, seven_day_strength: 15.7, twenty_eight_day_strength: 29.6, status: "Fail", tested_at: new Date().toISOString() },
    ] },
    { name: "punch_list_items", rows: [
      { punch_item_id: "punch-demo-1", project_id: "proj-demo-01", space_location_code: "FL-02 / Room 204", assigned_task_team_id: "Drywall", issue_description: "Patchwork crack at bathroom wall joint.", rectification_status: "Open", priority: "High Priority", created_at: new Date().toISOString() },
      { punch_item_id: "punch-demo-2", project_id: "proj-demo-01", space_location_code: "FL-03 / Corridor 3", assigned_task_team_id: "Painting", issue_description: "Touch-up scratches on lobby wall finish.", rectification_status: "Pending_Reinspection", priority: "Medium", created_at: new Date().toISOString() },
      { punch_item_id: "punch-demo-3", project_id: "proj-demo-01", space_location_code: "FL-05 / Stair Core", assigned_task_team_id: "Electrical", issue_description: "Loose conduit support near riser shaft.", rectification_status: "Open", priority: "High Priority", created_at: new Date().toISOString() },
      { punch_item_id: "punch-demo-4", project_id: "proj-demo-01", space_location_code: "FL-04 / Plant Room 1", assigned_task_team_id: "Plumbing", issue_description: "Pipe sleeve alignment mismatch.", rectification_status: "Closed", priority: "Medium", created_at: new Date().toISOString() },
      { punch_item_id: "punch-demo-5", project_id: "proj-demo-01", space_location_code: "FL-06 / Lobby", assigned_task_team_id: "Painting", issue_description: "Minor finish touch-up on wall edge.", rectification_status: "Open", priority: "Low", created_at: new Date().toISOString() },
    ] },
    { name: "cobie_types", conflict: "type_name", rows: [
      { type_name: "Water Cooled Chiller", type_category: "HVAC Equipment", type_description: "Primary cooling package for plant room and corridor zones.", manufacturer: "Trane", model: "RTAA 380", expected_life_years: 18, uniclass: "EF_40_20_30", created_at: new Date().toISOString(), source: "Approved Submittal" },
      { type_name: "Booster Pump Set", type_category: "Pumping System", type_description: "Domestic water pressure boosting unit.", manufacturer: "Grundfos", model: "CR 65-3", expected_life_years: 15, uniclass: "Pr_70_65", created_at: new Date().toISOString(), source: "Approved Submittal" },
      { type_name: "Diesel Generator Set", type_category: "Power Equipment", type_description: "Emergency standby generating set.", manufacturer: "Caterpillar", model: "DG 125", expected_life_years: 20, uniclass: "Pr_30_10", created_at: new Date().toISOString(), source: "Approved Submittal" },
    ] },
    { name: "cobie_components", conflict: "component_name", rows: [
      { component_name: "Water Cooled Chiller", component_type: "HVAC Equipment", location: "Plant Room 1", space_location_code: "PR1-CH-01", serial_number: "CH-TR-2026-101", manufacturer: "Trane", model_number: "RTAA 380", asset_id: "ASSET-CH-101", warranty_start_date: "2026-09-01", warranty_period: 24, status: "Installed", created_at: new Date().toISOString(), source: "Approved Submittal" },
      { component_name: "Booster Pump", component_type: "Pumping System", location: "STP Room", space_location_code: "STP-01", serial_number: "BP-GF-201", manufacturer: "Grundfos", model_number: "CR 65-3", asset_id: "ASSET-PUMP-201", warranty_start_date: "2026-09-05", warranty_period: 18, status: "Installed", created_at: new Date().toISOString(), source: "Approved Submittal" },
      { component_name: "Diesel Generator Set", component_type: "Power Equipment", location: "Generator Yard", space_location_code: "GEN-01", serial_number: "DG-CAT-301", manufacturer: "Caterpillar", model_number: "DG 125", asset_id: "ASSET-DG-301", warranty_start_date: "2026-09-10", warranty_period: 24, status: "Installed", created_at: new Date().toISOString(), source: "Approved Submittal" },
    ] },
  ];

  const inserted: Record<string, unknown[]> = {};

  for (const table of tables) {
    const rows = table.rows as Record<string, unknown>[];
    if (!hasSupabaseConfig) {
      inserted[table.name] = rows;
      continue;
    }

    const conflict = "conflict" in table ? table.conflict : undefined;
    const { data, error } = await supabase.from(table.name as string).upsert(rows as any, conflict ? { onConflict: conflict } : undefined).select();
    if (error) {
      console.warn(`Seed failed for ${table.name}:`, error.message);
    }
    inserted[table.name] = (data ?? []) as unknown[];
  }

  return inserted;
}
