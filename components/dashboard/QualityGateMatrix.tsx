type ConcreteTest = {
  grade: string;
  target7d: number;
  actual7d: number;
  target28d: number;
  actual28d: number;
};

const defaultTests: ConcreteTest[] = [
  { grade: "M25", target7d: 17, actual7d: 18.1, target28d: 31.5, actual28d: 33.4 },
  { grade: "M30", target7d: 20, actual7d: 19.4, target28d: 36.5, actual28d: 34.9 },
  { grade: "M35", target7d: 23, actual7d: 24.6, target28d: 43.5, actual28d: 46.1 },
];

function formatStrength(value: number) {
  return `${value.toFixed(1)} MPa`;
}

function getPassState(actual: number, target: number) {
  return actual >= target ? "PASS" : "FAIL";
}

export default function QualityGateMatrix({ tests = defaultTests }: { tests?: ConcreteTest[] }) {
  return (
    <div style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: 20, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: 22 }}>Concrete Cube Test (7 & 28 Day Strength)</h2>
        <span style={{ color: "#7dd3fc", fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase" }}>Quality gate</span>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {tests.map((test) => {
          const sevenDayState = getPassState(test.actual7d, test.target7d);
          const twentyEightDayState = getPassState(test.actual28d, test.target28d);

          return (
            <div key={test.grade} style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 14, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{test.grade}</div>
                <div style={{ color: "#cbd5e1", fontSize: 12 }}>Concrete Grade</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
                <div style={{ background: "#0f172a", borderRadius: 10, padding: 10 }}>
                  <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 6 }}>7 Day</div>
                  <div style={{ fontWeight: 700 }}>{formatStrength(test.actual7d)}</div>
                  <div style={{ color: "#94a3b8", fontSize: 12 }}>Target {formatStrength(test.target7d)}</div>
                  <div style={{ marginTop: 8, display: "inline-block", background: sevenDayState === "PASS" ? "#166534" : "#7f1d1d", color: "#f8fafc", borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 700 }}>{sevenDayState}</div>
                </div>

                <div style={{ background: "#0f172a", borderRadius: 10, padding: 10 }}>
                  <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 6 }}>28 Day</div>
                  <div style={{ fontWeight: 700 }}>{formatStrength(test.actual28d)}</div>
                  <div style={{ color: "#94a3b8", fontSize: 12 }}>Target {formatStrength(test.target28d)}</div>
                  <div style={{ marginTop: 8, display: "inline-block", background: twentyEightDayState === "PASS" ? "#166534" : "#7f1d1d", color: "#f8fafc", borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 700 }}>{twentyEightDayState}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
