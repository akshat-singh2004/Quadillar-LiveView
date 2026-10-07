export interface ScheduleActivity {
  id: string;
  durationDays: number;
  predecessors: string[];
}

export class CpmTopologicalSortEngine {
  static computeCriticalPathFloat(activities: ScheduleActivity[]): {
    projectDurationDays: number;
    criticalActivityIds: string[];
  } {
    const earlyFinish = new Map<string, number>();

    activities.forEach((act) => {
      let maxPredEf = 0;
      act.predecessors.forEach((pid) => {
        maxPredEf = Math.max(maxPredEf, earlyFinish.get(pid) || 0);
      });
      earlyFinish.set(act.id, maxPredEf + act.durationDays);
    });

    const projectDuration = Math.max(...Array.from(earlyFinish.values()), 0);
    return {
      projectDurationDays: projectDuration,
      criticalActivityIds: activities.map((a) => a.id),
    };
  }
}
