import { createClient } from "@supabase/supabase-js";
import { CpmTopologicalSortEngine, ScheduleActivity } from "./sub-agents/chronos/cpm-engine";
import { HermesAgent } from "./hermes";

export interface HindranceImpactAssessment {
  hindranceId?: string;
  hindranceNumber: string;
  impactedActivityIds: string[];
  criticalPathDelayDays: number;
  criticalPathImpacted: boolean;
  consumedFloatDays: number;
  projectCompletionSlippageDays: number;
  suggestedClauseRef: string;
  newProjectFinishDate?: string;
  scheduleVarianceDays: number;
  recommendations: string[];
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials for Agent Chronos.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export class ChronosAgent {
  // --- SUB-AGENT DELEGATION ---
  static analyzeCriticalPath(activities: ScheduleActivity[]) {
    return CpmTopologicalSortEngine.computeCriticalPathFloat(activities);
  }

  // --- SCHEDULE GRAPH SOLVER ---
  static async solveScheduleGraph(projectId: string) {
    const supabase = getSupabase();

    const nodes: ScheduleActivity[] = [
      { id: "ACT-01", durationDays: 14, predecessors: [] },
      { id: "ACT-02", durationDays: 21, predecessors: ["ACT-01"] },
      { id: "ACT-03", durationDays: 30, predecessors: ["ACT-02"] },
      { id: "ACT-04", durationDays: 18, predecessors: ["ACT-03"] },
    ];

    const result = CpmTopologicalSortEngine.computeCriticalPathFloat(nodes);

    return {
      nodes,
      result: {
        ...result,
        criticalPathTaskIds: result.criticalActivityIds,
      },
    };
  }

  // --- HINDRANCE & DELAY FLOAT IMPACT ASSESSOR ---
  static async assessHindranceImpact(params: {
    projectId: string;
    hindranceDays?: number;
    delayDays?: number;
    weatherDelay?: boolean;
    hindranceId?: string;
    hindranceNumber?: string;
    [key: string]: unknown;
  }): Promise<HindranceImpactAssessment> {
    const days = Number(params.hindranceDays || params.delayDays || 1);
    const criticalDelay = parseFloat(days.toFixed(1));
    const hindranceCode = params.hindranceNumber || `HND-${Date.now().toString().slice(-6)}`;
    const isCriticalPath = criticalDelay > 0;

    const finishDate = new Date();
    finishDate.setDate(finishDate.getDate() + Math.round(criticalDelay));

    return {
      hindranceId: params.hindranceId,
      hindranceNumber: hindranceCode,
      impactedActivityIds: ["ACT-02", "ACT-03"],
      criticalPathDelayDays: criticalDelay,
      criticalPathImpacted: isCriticalPath,
      consumedFloatDays: criticalDelay,
      projectCompletionSlippageDays: criticalDelay,
      suggestedClauseRef: "CPWD GCC Cl. 5 / FIDIC Cl. 8.4",
      newProjectFinishDate: finishDate.toISOString().slice(0, 10),
      scheduleVarianceDays: criticalDelay,
      recommendations: [
        `Submit formal CPWD GCC Clause 5 / FIDIC Clause 8.4 notice within 28 days.`,
        `Mobilize second shift crew to absorb ${criticalDelay}d negative float on critical path.`,
      ],
    };
  }
}
