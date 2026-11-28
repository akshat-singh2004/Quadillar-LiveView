/**
 * Single Source of Truth Correlated Dataset for Project Vanguard Commercial Hub (VANGUARD-LKO-01).
 * Every figure reconciles across DPR #084 (66 workers, 4 active plant units, 102.5 L diesel),
 * Weighbridge (47.51 MT), BBS (8.02 MT rebar), Pour Card BIT-4-TG03 (M40 cube/maturity hold),
 * Measurement Book <-> RA Bill #14 (₹2,40,80,000 gross / ₹62,00,000 frozen escrow), and BSA Sec 63 Vault.
 */

const PROJECT_ID = "VANGUARD-LKO-01";
const PROJECT_NAME = "Project Vanguard Commercial Hub";

export const VANGUARD_CORRELATED_DATASET = {
  projectId: PROJECT_ID,
  projectName: PROJECT_NAME,

  // 1. Geotechnical Telemetry (/engineering/geotechnical)
  geotechnicalTelemetryReadings: [
    {
      id: "geo-inc-01",
      project_id: PROJECT_ID,
      sensor_code: "INC-SHORING-N01",
      sensor_type: "INCLINOMETER",
      zone: "Basement B2 North Diaphragm Wall",
      wall_deflection_mm: 8.4,
      max_permissible_deflection_mm: 15.0,
      piezometer_level_m: 6.2,
      groundwater_table_m: 6.2,
      settlement_mm: 3.1,
      status: "NOMINAL",
      recorded_at: "2026-11-28T07:30:00Z",
      created_at: "2026-11-28T07:30:00Z",
    },
    {
      id: "geo-inc-02",
      project_id: PROJECT_ID,
      sensor_code: "INC-SHORING-E04",
      sensor_type: "INCLINOMETER",
      zone: "Tower A Core Raft East Secant Pile",
      wall_deflection_mm: 13.8,
      max_permissible_deflection_mm: 15.0,
      piezometer_level_m: 5.4,
      groundwater_table_m: 5.4,
      settlement_mm: 6.9,
      status: "WARNING",
      recorded_at: "2026-11-28T08:15:00Z",
      created_at: "2026-11-28T08:15:00Z",
    },
    {
      id: "geo-pzm-03",
      project_id: PROJECT_ID,
      sensor_code: "PZM-DEWATER-02",
      sensor_type: "PIEZOMETER",
      zone: "Podium Sump Dewatering Well #2",
      wall_deflection_mm: 4.2,
      max_permissible_deflection_mm: 15.0,
      piezometer_level_m: 7.1,
      groundwater_table_m: 7.1,
      settlement_mm: 1.8,
      status: "NOMINAL",
      recorded_at: "2026-11-28T09:00:00Z",
      created_at: "2026-11-28T09:00:00Z",
    },
  ],

  // 2. Concrete Maturity Nodes & Readings (/engineering/concrete-maturity — linked to BIT-4-TG03 PTW hold)
  concreteMaturityNodes: [
    {
      id: "mat-node-01",
      project_id: PROJECT_ID,
      node_tag: "MAT-TG03-CORE-01",
      structural_element: "Transfer Girder BIT-4-TG03 (L04)",
      element_type: "TRANSFER_GIRDER",
      mix_design_grade: "M40",
      target_maturity_c_hr: 2450,
      current_maturity_c_hr: 1680,
      maturity_index: 1680,
      estimated_strength_mpa: 26.4,
      target_strength_mpa: 40.0,
      core_temp_c: 58.6,
      surface_temp_c: 34.2,
      thermal_gradient_c: 24.4,
      stripping_permitted: false,
      status: "HOLD_THERMAL_GRADIENT",
      created_at: "2026-11-26T10:00:00Z",
    },
    {
      id: "mat-node-02",
      project_id: PROJECT_ID,
      node_tag: "MAT-SLAB-L04-S02",
      structural_element: "Typical Slab SLAB-L04-S02",
      element_type: "SLAB",
      mix_design_grade: "M35",
      target_maturity_c_hr: 1900,
      current_maturity_c_hr: 2140,
      maturity_index: 2140,
      estimated_strength_mpa: 37.8,
      target_strength_mpa: 35.0,
      core_temp_c: 36.1,
      surface_temp_c: 27.9,
      thermal_gradient_c: 8.2,
      stripping_permitted: true,
      status: "CLEARED_FOR_STRIPPING",
      created_at: "2026-11-24T09:30:00Z",
    },
    {
      id: "mat-node-03",
      project_id: PROJECT_ID,
      node_tag: "MAT-COL-L03-C04",
      structural_element: "Shear Column COL-L03-C04",
      element_type: "COLUMN",
      mix_design_grade: "M50",
      target_maturity_c_hr: 2800,
      current_maturity_c_hr: 2910,
      maturity_index: 2910,
      estimated_strength_mpa: 51.2,
      target_strength_mpa: 50.0,
      core_temp_c: 41.0,
      surface_temp_c: 31.4,
      thermal_gradient_c: 9.6,
      stripping_permitted: true,
      status: "CLEARED_FOR_STRIPPING",
      created_at: "2026-11-22T14:00:00Z",
    },
  ],

  concreteMaturityReadings: [
    { id: "mr-1", project_id: PROJECT_ID, node_id: "mat-node-01", node_tag: "MAT-TG03-CORE-01", maturity_index: 1120, temperature_c: 61.2, core_temp_c: 61.2, surface_temp_c: 35.1, estimated_strength_mpa: 21.8, recorded_at: "2026-11-27T08:00:00Z", created_at: "2026-11-27T08:00:00Z" },
    { id: "mr-2", project_id: PROJECT_ID, node_id: "mat-node-01", node_tag: "MAT-TG03-CORE-01", maturity_index: 1680, temperature_c: 58.6, core_temp_c: 58.6, surface_temp_c: 34.2, estimated_strength_mpa: 26.4, recorded_at: "2026-11-28T08:00:00Z", created_at: "2026-11-28T08:00:00Z" },
    { id: "mr-3", project_id: PROJECT_ID, node_id: "mat-node-02", node_tag: "MAT-SLAB-L04-S02", maturity_index: 2140, temperature_c: 36.1, core_temp_c: 36.1, surface_temp_c: 27.9, estimated_strength_mpa: 37.8, recorded_at: "2026-11-28T08:00:00Z", created_at: "2026-11-28T08:00:00Z" },
  ],

  // 3. BOCW Labor Muster (/site/labor — reconciles with DPR #084 active crew)
  bocwWorkmenRegistry: [
    { id: "wk-01", project_id: PROJECT_ID, worker_pin: "BOCW-LKO-1041", full_name: "Ramesh Kumar Yadav", contractor_agency: "Anandeshwar Civil Infra", trade_package: "Bar Bending & Steel Fixing", skill_tier: "SKILLED", daily_wage_inr: 920, uan_number: "101482910411", esic_number: "3120948101", status: "ACTIVE", created_at: "2026-10-01T06:00:00Z" },
    { id: "wk-02", project_id: PROJECT_ID, worker_pin: "BOCW-LKO-1042", full_name: "Suresh Prasad Verma", contractor_agency: "Anandeshwar Civil Infra", trade_package: "Shuttering & Formwork", skill_tier: "HIGHLY_SKILLED", daily_wage_inr: 1080, uan_number: "101482910412", esic_number: "3120948102", status: "ACTIVE", created_at: "2026-10-01T06:00:00Z" },
    { id: "wk-03", project_id: PROJECT_ID, worker_pin: "BOCW-LKO-1043", full_name: "Mohammad Irfan Ali", contractor_agency: "Awadh Structural Works", trade_package: "Tower Crane Rigging", skill_tier: "HIGHLY_SKILLED", daily_wage_inr: 1150, uan_number: "101482910413", esic_number: "3120948103", status: "ACTIVE", created_at: "2026-10-02T06:00:00Z" },
    { id: "wk-04", project_id: PROJECT_ID, worker_pin: "BOCW-LKO-1044", full_name: "Dinesh Chandra Tiwari", contractor_agency: "Awadh Structural Works", trade_package: "RMC Concreting & Vibrator", skill_tier: "SKILLED", daily_wage_inr: 880, uan_number: "101482910414", esic_number: "3120948104", status: "ACTIVE", created_at: "2026-10-03T06:00:00Z" },
    { id: "wk-05", project_id: PROJECT_ID, worker_pin: "BOCW-LKO-1045", full_name: "Vikram Singh Chauhan", contractor_agency: "Gomti MEP Systems", trade_package: "HT Electrical & Earthing", skill_tier: "HIGHLY_SKILLED", daily_wage_inr: 1120, uan_number: "101482910415", esic_number: "3120948105", status: "ACTIVE", created_at: "2026-10-05T06:00:00Z" },
    { id: "wk-06", project_id: PROJECT_ID, worker_pin: "BOCW-LKO-1046", full_name: "Ajay Kumar Maurya", contractor_agency: "Anandeshwar Civil Infra", trade_package: "General Helper & Curing", skill_tier: "SEMI_SKILLED", daily_wage_inr: 720, uan_number: "101482910416", esic_number: "3120948106", status: "ACTIVE", created_at: "2026-10-06T06:00:00Z" },
  ],

  biometricTurnstileEvents: [
    { id: "bio-01", project_id: PROJECT_ID, worker_pin: "BOCW-LKO-1041", full_name: "Ramesh Kumar Yadav", terminal_id: "GATE-01-FACE-IN", event_type: "CHECK_IN", ppe_verified: true, recorded_at: "2026-11-28T07:42:00Z", created_at: "2026-11-28T07:42:00Z" },
    { id: "bio-02", project_id: PROJECT_ID, worker_pin: "BOCW-LKO-1042", full_name: "Suresh Prasad Verma", terminal_id: "GATE-01-FACE-IN", event_type: "CHECK_IN", ppe_verified: true, recorded_at: "2026-11-28T07:44:00Z", created_at: "2026-11-28T07:44:00Z" },
    { id: "bio-03", project_id: PROJECT_ID, worker_pin: "BOCW-LKO-1043", full_name: "Mohammad Irfan Ali", terminal_id: "GATE-02-RFID-IN", event_type: "CHECK_IN", ppe_verified: true, recorded_at: "2026-11-28T07:49:00Z", created_at: "2026-11-28T07:49:00Z" },
    { id: "bio-04", project_id: PROJECT_ID, worker_pin: "BOCW-LKO-1044", full_name: "Dinesh Chandra Tiwari", terminal_id: "GATE-01-FACE-IN", event_type: "CHECK_IN", ppe_verified: true, recorded_at: "2026-11-28T07:53:00Z", created_at: "2026-11-28T07:53:00Z" },
  ],

  // 4. Plant & Machinery Fleet (/operations/plant-machinery — matches DPR #084: 4 units, 102.5 L diesel)
  equipmentFleetTelematics: [
    { id: "eq-01", project_id: PROJECT_ID, equipment_code: "TC-VGD-01", equipment_name: "Tower Crane #1 (65m Jib)", make_and_model: "Potain MC 125", operator_name: "M. Irfan Ali", status: "ACTIVE", engine_hours: 1428.5, fuel_issued_liters: 34.0, fuel_variance_pct: 1.2, fitness_certificate_expiry: "2027-04-15", created_at: "2026-09-10T08:00:00Z" },
    { id: "eq-02", project_id: PROJECT_ID, equipment_code: "BP-VGD-01", equipment_name: "Batching Plant CP-60", make_and_model: "Schwing Stetter CP60", operator_name: "R. K. Mishra", status: "ACTIVE", engine_hours: 1184.0, fuel_issued_liters: 28.5, fuel_variance_pct: 2.1, fitness_certificate_expiry: "2027-03-30", created_at: "2026-09-10T08:00:00Z" },
    { id: "eq-03", project_id: PROJECT_ID, equipment_code: "CP-VGD-02", equipment_name: "Static Concrete Pump", make_and_model: "Putzmeister BSA 1407", operator_name: "S. K. Pandey", status: "ACTIVE", engine_hours: 892.3, fuel_issued_liters: 24.0, fuel_variance_pct: 8.4, fitness_certificate_expiry: "2027-02-20", created_at: "2026-09-12T08:00:00Z" },
    { id: "eq-04", project_id: PROJECT_ID, equipment_code: "DG-VGD-250", equipment_name: "250 kVA Silent DG Set", make_and_model: "Cummins C250D5P", operator_name: "A. Verma", status: "ACTIVE", engine_hours: 615.2, fuel_issued_liters: 16.0, fuel_variance_pct: 0.8, fitness_certificate_expiry: "2027-06-01", created_at: "2026-09-14T08:00:00Z" },
  ],

  equipmentShiftLogs: [
    { id: "sl-01", project_id: PROJECT_ID, equipment_code: "TC-VGD-01", shift_date: "2026-11-28", hours_operated: 7.5, fuel_issued_liters: 34.0, fuel_variance_pct: 1.2, operator_name: "M. Irfan Ali", created_at: "2026-11-28T10:00:00Z" },
    { id: "sl-02", project_id: PROJECT_ID, equipment_code: "BP-VGD-01", shift_date: "2026-11-28", hours_operated: 6.8, fuel_issued_liters: 28.5, fuel_variance_pct: 2.1, operator_name: "R. K. Mishra", created_at: "2026-11-28T10:00:00Z" },
    { id: "sl-03", project_id: PROJECT_ID, equipment_code: "CP-VGD-02", shift_date: "2026-11-28", hours_operated: 5.2, fuel_issued_liters: 24.0, fuel_variance_pct: 8.4, operator_name: "S. K. Pandey", created_at: "2026-11-28T10:00:00Z" },
    { id: "sl-04", project_id: PROJECT_ID, equipment_code: "DG-VGD-250", shift_date: "2026-11-28", hours_operated: 4.0, fuel_issued_liters: 16.0, fuel_variance_pct: 0.8, operator_name: "A. Verma", created_at: "2026-11-28T10:00:00Z" },
  ],

  // 5. Digital Measurement Book (/finance/measurement-book — reconciles with RA Bill #14 ₹2,40,80,000 gross)
  digitalMeasurementBookEntries: [
    { id: "mb-01", project_id: PROJECT_ID, mb_entry_number: "MB-VGD-014-001", boq_item_code: "RCC-M40-TG", description: "M40 RCC Transfer Girder BIT-4-TG03 (Held under NCR-2026-042)", unit: "m³", calculated_quantity: 142.5, net_quantity: 142.5, rate_inr: 11200, amount_inr: 1596000, ae_test_checked: false, status: "FROZEN_NCR_HOLD", measured_at: "2026-11-26T16:00:00Z", created_at: "2026-11-26T16:00:00Z" },
    { id: "mb-02", project_id: PROJECT_ID, mb_entry_number: "MB-VGD-014-002", boq_item_code: "RCC-M35-SLB", description: "M35 Post-Tensioned Podium Slab SLAB-L04-S02", unit: "m³", calculated_quantity: 685.0, net_quantity: 685.0, rate_inr: 9600, amount_inr: 6576000, ae_test_checked: true, status: "CERTIFIED", measured_at: "2026-11-24T17:15:00Z", created_at: "2026-11-24T17:15:00Z" },
    { id: "mb-03", project_id: PROJECT_ID, mb_entry_number: "MB-VGD-014-003", boq_item_code: "STL-FE550D", description: "Fe-550D TMT Reinforcement Cutting, Bending & Placing (L03–L04)", unit: "MT", calculated_quantity: 148.0, net_quantity: 148.0, rate_inr: 78500, amount_inr: 11618000, ae_test_checked: true, status: "CERTIFIED", measured_at: "2026-11-25T15:00:00Z", created_at: "2026-11-25T15:00:00Z" },
    { id: "mb-04", project_id: PROJECT_ID, mb_entry_number: "MB-VGD-014-004", boq_item_code: "FW-ALU-L04", description: "System Aluminium Formwork Staging & Deshuttering (L04 Core)", unit: "m²", calculated_quantity: 3900.0, net_quantity: 3900.0, rate_inr: 1100, amount_inr: 4290000, ae_test_checked: true, status: "CERTIFIED", measured_at: "2026-11-27T14:30:00Z", created_at: "2026-11-27T14:30:00Z" },
  ],

  // 6. Material Reconciliation & Rebar Cutting (/materials/reconciliation — matches BBS 8.02 MT & Weighbridge 47.51 MT)
  materialReconciliationRecords: [
    { id: "mat-rec-01", project_id: PROJECT_ID, reconciliation_code: "RECON-CEM-NOV26", material_type: "OPC 53 Grade Cement", structural_element: "Transfer Girder BIT-4-TG03", theoretical_qty: 42.5, actual_consumed_qty: 47.51, excess_consumption_qty: 5.01, unit: "MT", is_compliant: false, penal_recovery_inr: 95190, created_at: "2026-11-27T18:00:00Z" },
    { id: "mat-rec-02", project_id: PROJECT_ID, reconciliation_code: "RECON-STL-NOV26", material_type: "Fe-550D TMT Rebar", structural_element: "L04 Slab & Beams (BBS-L04)", theoretical_qty: 8.02, actual_consumed_qty: 8.21, excess_consumption_qty: 0.19, unit: "MT", is_compliant: true, penal_recovery_inr: 0, created_at: "2026-11-27T18:10:00Z" },
    { id: "mat-rec-03", project_id: PROJECT_ID, reconciliation_code: "RECON-AGG-NOV26", material_type: "20mm Crushed Stone Aggregate", structural_element: "Batching Plant CP-60 Silo", theoretical_qty: 195.0, actual_consumed_qty: 198.4, excess_consumption_qty: 3.4, unit: "MT", is_compliant: true, penal_recovery_inr: 0, created_at: "2026-11-27T18:20:00Z" },
  ],

  rebarCuttingSchedules: [
    { id: "rcs-01", project_id: PROJECT_ID, schedule_code: "BBS-TG03-25MM", bar_diameter_mm: 25, billets_required_count: 68, salvaged_offcut_m: 14.2, total_waste_m: 4.8, created_at: "2026-11-25T11:00:00Z" },
    { id: "rcs-02", project_id: PROJECT_ID, schedule_code: "BBS-SLAB-12MM", bar_diameter_mm: 12, billets_required_count: 144, salvaged_offcut_m: 26.5, total_waste_m: 7.1, created_at: "2026-11-26T11:30:00Z" },
  ],

  // 7. Governed Milestones (/milestones)
  governedMilestoneLedger: [
    { id: "ms-01", project_id: PROJECT_ID, project_name: PROJECT_NAME, sequence_number: 1, sequence_label: "MS-01", work_scope: "Deep Excavation, Diaphragm Wall & Raft Foundation", trade_name: "Civil Substructure", contractor_name: "Anandeshwar Civil Infra", contractor_allocated_inr: 142000000, total_milestone_value_inr: 165000000, target_date: "2026-08-30", status: "CERTIFIED_RELEASED", financial_condition_cleared: true, certified_by: "Principal Director", certified_at: "2026-08-29T16:00:00Z", hold_gates: [{ label: "Geotech Pile Load Test (IS 2911)", is_mandatory: true, cleared: true, spec_ref: "IS 2911-4", verified_by: "QA Lead", verified_at: "2026-08-27" }] },
    { id: "ms-02", project_id: PROJECT_ID, project_name: PROJECT_NAME, sequence_number: 2, sequence_label: "MS-02", work_scope: "Podium Levels B2–L03 Structural Framing", trade_name: "RCC Superstructure", contractor_name: "Anandeshwar Civil Infra", contractor_allocated_inr: 198000000, total_milestone_value_inr: 224000000, target_date: "2026-10-31", status: "CERTIFIED_RELEASED", financial_condition_cleared: true, certified_by: "Principal Director", certified_at: "2026-11-02T11:20:00Z", hold_gates: [{ label: "28-Day M50 Column Cube Certification", is_mandatory: true, cleared: true, spec_ref: "IS 456:2000", verified_by: "QA Lead", verified_at: "2026-11-01" }] },
    { id: "ms-03", project_id: PROJECT_ID, project_name: PROJECT_NAME, sequence_number: 3, sequence_label: "MS-03", work_scope: "Level 04 Transfer Girder (BIT-4-TG03) & Core Shear Wall", trade_name: "Heavy RCC Transfer", contractor_name: "Awadh Structural Works", contractor_allocated_inr: 62000000, total_milestone_value_inr: 84000000, target_date: "2026-11-30", status: "LOCKED_HOLD_GATE", financial_condition_cleared: false, certified_by: null, certified_at: null, hold_gates: [{ label: "NCR-2026-042 Diamond Core Verification (IS 456 Cl. 17.4.3)", is_mandatory: true, cleared: false, spec_ref: "IS 456 Cl 17.4", verified_by: null, verified_at: null }] },
  ],

  // 8. Contract Variations (/contracts/variations)
  contractVariations: [
    { id: "vo-01", project_id: PROJECT_ID, vo_number: "VO-VGD-001", variation_number: "VO-001", scope_description: "Upgrade Podium Transfer Girder Stirrups from Fe-500 to Fe-550D (Seismic Zone III Audit)", status: "APPROVED", cost_impact_inr: 4850000, schedule_impact_days: 4, time_impact_days: 4, created_at: "2026-10-14T10:00:00Z" },
    { id: "vo-02", project_id: PROJECT_ID, vo_number: "VO-VGD-002", variation_number: "VO-002", scope_description: "Additional Acoustic Chiller Enclosure & Roof Vibration Isolators (Tower A)", status: "UNDER_REVIEW", cost_impact_inr: 3120000, schedule_impact_days: 6, time_impact_days: 6, created_at: "2026-11-18T12:00:00Z" },
  ],

  // 9. Claims & Disputes (/contracts/claims-disputes)
  contractClaimsDisputes: [
    { id: "clm-01", project_id: PROJECT_ID, project_name: PROJECT_NAME, claim_code: "CLM-VGD-2026-01", work_order_ref: "WO-STR-042", contractor_name: "Awadh Structural Works", trade_package: "RCC Transfer Structure", category: "EOT_HINDRANCE", status: "ENGINEER_ASSESSMENT", event_occurrence_date: "2026-11-10", days_to_notice: 12, is_time_barred: false, time_extension_claimed_days: 14, engineer_assessed_eot_days: 5, claimed_amount_inr: 6200000, engineer_assessed_amount_inr: 1450000, liquidated_damages_levied_inr: 420000, unjustified_delay_weeks: 1, linked_hindrance_code: "HND-WIND-019", dab_referral_date: null, dab_decision_due_date: null, dab_decision_summary: null, lead_arbiter_name: "Er. S. N. Tripathi (CE Retd.)", seor_assessor_name: "Quadillar QS Desk", settled_at: null, created_at: "2026-11-22T09:00:00Z" },
  ],

  // 10. RERA Compliance Artifacts (/compliance/rera)
  projectComplianceArtifacts: [
    { id: "comp-01", project_id: PROJECT_ID, artifact_type: "UP-RERA Project Registration", authority_reference: "UPRERAPRJ784210", status: "VERIFIED_ACTIVE", valid_from: "2026-04-01", valid_until: "2029-03-31", created_at: "2026-04-02T10:00:00Z" },
    { id: "comp-02", project_id: PROJECT_ID, artifact_type: "LDA Sanctioned Building Map", authority_reference: "LDA/BP/2026/GNE-409", status: "VERIFIED_ACTIVE", valid_from: "2026-03-18", valid_until: "2029-03-17", created_at: "2026-03-19T10:00:00Z" },
    { id: "comp-03", project_id: PROJECT_ID, artifact_type: "UPPCB Consent to Establish (CTE)", authority_reference: "UPPCB/LKO/CTE/2026/1184", status: "VERIFIED_ACTIVE", valid_from: "2026-04-10", valid_until: "2028-04-09", created_at: "2026-04-11T10:00:00Z" },
    { id: "comp-04", project_id: PROJECT_ID, artifact_type: "Fire Department Provisional NOC", authority_reference: "UPFS/LKO/2026/PNOC-092", status: "VERIFIED_ACTIVE", valid_from: "2026-05-01", valid_until: "2027-04-30", created_at: "2026-05-02T10:00:00Z" },
  ],

  // 11. Handover Punch List & TOC (/handover/punch-list)
  projectPunchListItems: [
    { id: "pl-01", project_id: PROJECT_ID, project_name: PROJECT_NAME, snag_code: "SNAG-L02-001", location: "Tower A Level 02 Lift Lobby", description: "Hairline plaster shrinkage crack near fire-shaft frame", assigned_trade: "Finishing & Masonry", severity: "MINOR", status: "OPEN", target_closeout_date: "2026-12-08", verified_at: null, created_at: "2026-11-24T11:00:00Z", updated_at: "2026-11-24T11:00:00Z" },
    { id: "pl-02", project_id: PROJECT_ID, project_name: PROJECT_NAME, snag_code: "SNAG-B1-002", location: "Basement B1 Pump Room", description: "Hydro-pressure gauge calibration tag missing on jockey pump", assigned_trade: "MEP Fire Fighting", severity: "MAJOR", status: "IN_PROGRESS", target_closeout_date: "2026-12-04", verified_at: null, created_at: "2026-11-25T15:30:00Z", updated_at: "2026-11-26T10:00:00Z" },
    { id: "pl-03", project_id: PROJECT_ID, project_name: PROJECT_NAME, snag_code: "SNAG-L01-003", location: "Podium Entry Canopy", description: "Silicone weather-sealant touch-up on glazing mullion #4", assigned_trade: "Facade & Glazing", severity: "MINOR", status: "CLOSED_VERIFIED", target_closeout_date: "2026-11-27", verified_at: "2026-11-27T16:45:00Z", created_at: "2026-11-20T09:00:00Z", updated_at: "2026-11-27T16:45:00Z" },
  ],

  // 12. BSA Section 63 Audit Dossiers (/closeout/audit-vault)
  statutoryAuditDossiers: [
    {
      id: "dos-vgd-01",
      project_id: PROJECT_ID,
      project_name: PROJECT_NAME,
      dossier_code: "BSA63-VGD-2026-NOV-01",
      dossier_category: "MONTHLY_GOVERNANCE_AND_ESCROW_SEAL",
      included_records_summary: "4 MB Entries, RA Bill #14 (₹62L Frozen Hold), NCR-2026-042, Hash-Chained Governor Ledger",
      total_artifacts_count: 14,
      merkle_root_sha256: "4729e17cc8857862a9b41d0f22c8e9104f1e6c2b8a3910f7d55e1a0c9b412e88",
      custody_chain_officer: "Akshat Singh Rathore (CEO / Director)",
      certifying_role: "DIRECTOR",
      statutory_declaration_text: "Certified electronic record bundle generated under Bharatiya Sakshya Adhiniyam (BSA) Section 63(4) with deterministic SHA-256 hash-chain verification.",
      sealed_at: "2026-11-28T09:00:00Z",
      created_at: "2026-11-28T09:00:00Z",
    },
  ],

  evidentiaryArtifactHashes: [
    { id: "art-01", dossier_id: "dos-vgd-01", artifact_category: "MEASUREMENT_BOOK", source_table: "digital_measurement_book_entries", source_record_id: "MB-VGD-014-001", sha256_hash: "8c3f9a1b0d72e4c51a99f221b8e30d4c11a8f92e4b77c201d9e4a31f8c20b114", recorded_timestamp: "2026-11-26T16:00:00Z" },
    { id: "art-02", dossier_id: "dos-vgd-01", artifact_category: "RA_BILL_ESCROW", source_table: "running_account_bills", source_record_id: "RA-BILL-14", sha256_hash: "2d71b4f8c9e03a51f602b8d4e19c7a33d51f8e2a0c94b716e3a8c50d1f29a472", recorded_timestamp: "2026-11-27T12:10:00Z" },
    { id: "art-03", dossier_id: "dos-vgd-01", artifact_category: "QUALITY_NCR", source_table: "quality_ncr_register", source_record_id: "NCR-2026-042", sha256_hash: "9e44c2d1f7a8b035e612c9a4d80f1b27a35c8e91d40b6f22c7a1e83d5b90f618", recorded_timestamp: "2026-11-27T14:00:00Z" },
  ],
} as const;
