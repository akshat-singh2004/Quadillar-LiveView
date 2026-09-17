import type { PaymentApplication } from "@/types/construction";

function lakhs(value: number) { return `₹${(value / 100000).toFixed(2)} Lakh`; }

export function SurveyBillingTelemetry({ applications = [] }: { applications?: PaymentApplication[] }) {
  const certified = applications.filter((item) => ["Certified", "Approved", "Paid", "Released"].includes(item.status)).reduce((sum, item) => sum + item.currentWorkCompleted + item.storedMaterials - (item.currentWorkCompleted + item.storedMaterials) * .05, 0) || 43.56 * 100000;
  const disbursed = 31.2 * 100000;
  const disbursedPercent = Math.min(100, Math.round((disbursed / certified) * 100));
  return <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, margin: "22px 0" }}><div style={panelStyle}><div style={eyebrowStyle}>Billing & cash inflow meter</div><div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 14 }}><div><div style={labelStyle}>Certified net</div><strong style={valueStyle}>{lakhs(certified)}</strong></div><div style={{ textAlign: "right" }}><div style={labelStyle}>Disbursed</div><strong style={{ ...valueStyle, color: "#a7f3d0" }}>{lakhs(disbursed)}</strong></div></div><div style={{ height: 9, background: "#111827", borderRadius: 99, overflow: "hidden", marginTop: 15 }}><div style={{ height: "100%", width: `${disbursedPercent}%`, background: "#34d399" }} /></div><div style={mutedStyle}>{disbursedPercent}% of certified net released against UTR references</div></div><div style={panelStyle}><div style={eyebrowStyle}>Site earthwork progress</div><div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginTop: 14 }}><div><div style={labelStyle}>Cut excavated this cycle</div><strong style={valueStyle}>18,420 m³</strong></div><div style={{ textAlign: "right", color: "#fb923c", fontSize: 13, fontWeight: 800 }}>83.7% of target<br /><span style={{ color: "#94a3b8", fontSize: 11, fontWeight: 400 }}>Fill placed: 6,920 m³</span></div></div><a href="/site/drone-surveys" style={{ display: "inline-block", marginTop: 13, color: "#67e8f9", fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em", textDecoration: "none" }}>Open survey console →</a></div></section>;
}

const panelStyle: React.CSSProperties = { background: "#0b1220", border: "1px solid #1e293b", borderRadius: 14, padding: 18 };
const eyebrowStyle: React.CSSProperties = { color: "#67e8f9", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", fontWeight: 700 };
const labelStyle: React.CSSProperties = { color: "#94a3b8", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase" };
const valueStyle: React.CSSProperties = { display: "block", marginTop: 7, fontSize: 25, color: "#f8fafc" };
const mutedStyle: React.CSSProperties = { color: "#94a3b8", fontSize: 11, marginTop: 7 };
