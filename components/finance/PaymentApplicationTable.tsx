"use client";

import type { PaymentApplication } from "@/types/construction";
import { formatIndianCurrency } from "@/app/lib/services";

export interface PaymentApplicationTableProps {
  applications: PaymentApplication[];
  onStatusChange?: (applicationId: string, nextStatus: PaymentApplication["status"]) => void;
}

export function PaymentApplicationTable({ applications, onStatusChange }: PaymentApplicationTableProps) {
  return (
    <div style={{ overflowX: "auto", borderRadius: 20, border: "1px solid rgba(148,163,184,0.22)", background: "rgba(15,23,42,0.86)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
        <thead>
          <tr style={{ background: "rgba(15,23,42,0.95)" }}>
            {[
              "RA ID",
              "Trade",
              "Scheduled Value",
              "Current Work",
              "Stored Materials",
              "Retainage",
              "CPI",
              "Status",
              "Actions",
            ].map((heading) => (
              <th key={heading} style={{ padding: "14px 16px", textAlign: "left", color: "#94a3b8", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", borderBottom: "1px solid rgba(148,163,184,0.18)" }}>
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {applications.map((application) => {
            const earnedValue = application.currentWorkCompleted + application.storedMaterials;
            const actualCost = application.actualCost || 1;
            const cpi = actualCost > 0 ? earnedValue / actualCost : 1;
            const retainage = (application.scheduledValue + application.storedMaterials) * (application.retainageRate ?? 0.05);

            return (
              <tr key={application.paymentApplicationId} style={{ borderBottom: "1px solid rgba(148,163,184,0.12)" }}>
                <td style={{ padding: "14px 16px", color: "#f8fafc", fontWeight: 700 }}>{application.paymentApplicationId}</td>
                <td style={{ padding: "14px 16px", color: "#e2e8f0" }}>{application.tradePackage}</td>
                <td style={{ padding: "14px 16px", color: "#e2e8f0" }}>{formatIndianCurrency(application.scheduledValue)}</td>
                <td style={{ padding: "14px 16px", color: "#e2e8f0" }}>{formatIndianCurrency(application.currentWorkCompleted)}</td>
                <td style={{ padding: "14px 16px", color: "#e2e8f0" }}>{formatIndianCurrency(application.storedMaterials)}</td>
                <td style={{ padding: "14px 16px", color: "#e2e8f0" }}>{formatIndianCurrency(retainage)}</td>
                <td style={{ padding: "14px 16px", color: cpi < 1 ? "#fbbf24" : "#4ade80", fontWeight: 700 }}>{cpi.toFixed(2)}</td>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "6px 10px", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", border: "1px solid rgba(148,163,184,0.2)", background: application.status === "Held" ? "rgba(245,158,11,0.12)" : application.status === "Approved" ? "rgba(34,197,94,0.12)" : "rgba(59,130,246,0.12)", color: application.status === "Held" ? "#fbbf24" : application.status === "Approved" ? "#4ade80" : "#8ec5ff" }}>
                    {application.status}
                  </span>
                </td>
                <td style={{ padding: "14px 16px" }}>
                  {onStatusChange ? (
                    <select
                      aria-label={`Update status for ${application.paymentApplicationId}`}
                      value={application.status}
                      onChange={(event) => onStatusChange(application.paymentApplicationId, event.target.value as PaymentApplication["status"])}
                      style={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(148,163,184,0.18)", color: "#f8fafc", borderRadius: 10, padding: "8px 10px" }}
                    >
                      {[
                        "Draft",
                        "Submitted",
                        "Certified",
                        "Approved",
                        "Paid",
                        "Held",
                        "Released",
                      ].map((option) => (
                        <option key={option} value={option} style={{ background: "#0f172a" }}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <span style={{ color: "#cbd5e1" }}>View</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
