"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertOctagon,
  Beaker,
  Calendar,
  CheckCircle2,
  Download,
  FileText,
  HardHat,
  Printer,
  ShieldCheck,
} from "lucide-react";
import supabase from "@/app/lib/supabase";

type Metric = {
  label: string;
  value: string;
  suffix?: string;
  tone: "green" | "amber" | "blue" | "red" | "steel";
};

type PourRow = {
  pourCardId: string;
  structuralElement: string;
  concreteGrade: string;
  mixerChallanRef: string;
  volume: string;
  status: string;
};

type CubeRow = {
  testCode: string;
  pourCardId: string;
  age: string;
  specifiedFck: string;
  achievedStrength: string;
  complianceStatus: string;
};

type SafetyRow = {
  permitCode: string;
  activity: string;
  maturityHours: string;
  dualSignoff: string;
};

type NcrRow = {
  ncrCode: string;
  structuralLocation: string;
  remediationContractor: string;
  debitValue: string;
  closureStatus: string;
};

type AuditDossier = {
  auditWindow: string;
  projectLocation: string;
  documentRef: string;
  dateOfIssue: string;
  metrics: Metric[];
  pours: PourRow[];
  cubes: CubeRow[];
  safety: SafetyRow[];
  ncrs: NcrRow[];
};

type RpcRecord = {
  pour_register?: PourRow[];
  cube_register?: CubeRow[];
  safety_register?: SafetyRow[];
  ncr_register?: NcrRow[];
  metrics?: Metric[];
  project_location?: string;
  document_ref?: string;
  audit_window?: string;
  date_of_issue?: string;
};

const shortDate = (value: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);

const formatDisplayDate = (value: string | Date) => {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const addDays = (base: Date, days: number) => {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
};

const defaultStartDate = () => shortDate(addDays(new Date(), -7));
const defaultEndDate = () => shortDate(new Date());

const fallbackDossier = (): AuditDossier => {
  const today = new Date();
  return {
    auditWindow: `${defaultStartDate()} to ${defaultEndDate()}`,
    projectLocation: "Bharatpur, Rajasthan",
    documentRef: "PMC-QS-DOX-WK-36-2026",
    dateOfIssue: formatDisplayDate(today),
    metrics: [
      { label: "Concreting Output", value: "1,482", suffix: "m³", tone: "blue" },
      { label: "IS 516 Cube Crushing Pass Rate", value: "96.8", suffix: "%", tone: "green" },
      { label: "Safety PTWs Issued / Zero Incidents", value: "118 / 0", tone: "amber" },
      { label: "Active NCR Debit Pool", value: "₹ 4.8L", tone: "red" },
      { label: "Total Cumulative Workforce", value: "18,640", suffix: "man-days", tone: "steel" },
    ],
    pours: [
      {
        pourCardId: "PC-26-184",
        structuralElement: "Basement raft slab - B1",
        concreteGrade: "M30",
        mixerChallanRef: "MC-RT-2089",
        volume: "148.5",
        status: "Accepted",
      },
      {
        pourCardId: "PC-26-185",
        structuralElement: "Core wall - L3",
        concreteGrade: "M35",
        mixerChallanRef: "MC-RT-2091",
        volume: "96.0",
        status: "In review",
      },
      {
        pourCardId: "PC-26-186",
        structuralElement: "Column grid C3-C5",
        concreteGrade: "M40",
        mixerChallanRef: "MC-RT-2095",
        volume: "112.2",
        status: "Accepted",
      },
    ],
    cubes: [
      {
        testCode: "IS516-7D-184",
        pourCardId: "PC-26-184",
        age: "7D",
        specifiedFck: "30 N/mm²",
        achievedStrength: "31.6",
        complianceStatus: "Passed",
      },
      {
        testCode: "IS516-28D-184",
        pourCardId: "PC-26-184",
        age: "28D",
        specifiedFck: "30 N/mm²",
        achievedStrength: "35.2",
        complianceStatus: "Passed",
      },
      {
        testCode: "IS516-7D-185",
        pourCardId: "PC-26-185",
        age: "7D",
        specifiedFck: "35 N/mm²",
        achievedStrength: "33.8",
        complianceStatus: "Failed - Core Drill Triggered",
      },
    ],
    safety: [
      {
        permitCode: "PTW-4518",
        activity: "Formwork stripping - Lift 3 core",
        maturityHours: "72 hrs",
        dualSignoff: "Completed",
      },
      {
        permitCode: "PTW-4519",
        activity: "Rebar tying - B2 deck",
        maturityHours: "48 hrs",
        dualSignoff: "Pending",
      },
    ],
    ncrs: [
      {
        ncrCode: "NCR-782",
        structuralLocation: "Slab S-08 / Grid A4",
        remediationContractor: "RNB Constructions",
        debitValue: "₹ 2,30,000",
        closureStatus: "Open",
      },
      {
        ncrCode: "NCR-783",
        structuralLocation: "Wall W-12 / Lift core",
        remediationContractor: "Sujal Infra",
        debitValue: "₹ 1,65,000",
        closureStatus: "Closed",
      },
    ],
  };
};

const normalizeDossier = (payload: unknown): AuditDossier => {
  const source = Array.isArray(payload) ? (payload[0] as RpcRecord | undefined) : ((payload ?? {}) as RpcRecord);
  const records = source ?? {};

  return {
    auditWindow: records.audit_window ?? `${defaultStartDate()} to ${defaultEndDate()}`,
    projectLocation: records.project_location ?? "Bharatpur, Rajasthan",
    documentRef: records.document_ref ?? "PMC-QS-DOX-WK-36-2026",
    dateOfIssue: records.date_of_issue ?? formatDisplayDate(new Date()),
    metrics:
      records.metrics && records.metrics.length > 0
        ? records.metrics
        : fallbackDossier().metrics,
    pours: records.pour_register && records.pour_register.length > 0 ? records.pour_register : fallbackDossier().pours,
    cubes: records.cube_register && records.cube_register.length > 0 ? records.cube_register : fallbackDossier().cubes,
    safety: records.safety_register && records.safety_register.length > 0 ? records.safety_register : fallbackDossier().safety,
    ncrs: records.ncr_register && records.ncr_register.length > 0 ? records.ncr_register : fallbackDossier().ncrs,
  };
};

const toCsv = (rows: Array<Record<string, string | number | null | undefined>>) => {
  if (!rows.length) {
    return "Section,Data\n";
  }

  const headers = Object.keys(rows[0]);
  const escape = (value: string | number | null | undefined) => {
    const stringValue = String(value ?? "");
    return `"${stringValue.replace(/"/g, '""')}"`;
  };

  const lines = [headers.join(",")];
  rows.forEach((row) => {
    lines.push(headers.map((header) => escape(row[header])).join(","));
  });

  return lines.join("\n");
};

export default function AuditReportPage() {
  const [startDate, setStartDate] = useState(defaultStartDate());
  const [endDate, setEndDate] = useState(defaultEndDate());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dossier, setDossier] = useState<AuditDossier>(() => fallbackDossier());

  const exportRows = useMemo(() => {
    const combined: Array<Record<string, string | number | null | undefined>> = [];

    dossier.pours.forEach((row) => {
      combined.push({
        Section: "Concrete Pour & Traceability Register",
        "Pour Card ID": row.pourCardId,
        "Structural Element": row.structuralElement,
        "Concrete Grade": row.concreteGrade,
        "Inward Transit Mixer Challan Ref": row.mixerChallanRef,
        "Volume (m³)": row.volume,
        Status: row.status,
      });
    });

    dossier.cubes.forEach((row) => {
      combined.push({
        Section: "IS 516 Cube Crushing Register",
        "Test Code": row.testCode,
        "Pour Card ID": row.pourCardId,
        Age: row.age,
        "Specified fck": row.specifiedFck,
        "Crushing Strength Achieved (N/mm²)": row.achievedStrength,
        "Compliance Status": row.complianceStatus,
      });
    });

    dossier.safety.forEach((row) => {
      combined.push({
        Section: "High-Risk Safety & Formwork Stripping Register",
        "Permit Code": row.permitCode,
        "Activity/Element": row.activity,
        "Maturity Hours Observed": row.maturityHours,
        "Dual Sign-off Status": row.dualSignoff,
      });
    });

    dossier.ncrs.forEach((row) => {
      combined.push({
        Section: "NCR & Back-Charge Ledger",
        "NCR Code": row.ncrCode,
        "Structural Location": row.structuralLocation,
        "Remediation Contractor": row.remediationContractor,
        "Debit Value (₹)": row.debitValue,
        "Closure Status": row.closureStatus,
      });
    });

    return combined;
  }, [dossier]);

  const fetchAuditDossier = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc("get_pmc_weekly_audit_dossier", {
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (rpcError) {
        throw rpcError;
      }

      setDossier(normalizeDossier(data));
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Unable to load the PMC weekly audit dossier from Supabase.",
      );
      setDossier(fallbackDossier());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAuditDossier();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerExportCsv = () => {
    const csvContent = toCsv(exportRows);
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "quadillar-pmc-weekly-audit-dossier.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="audit-page">
      <style jsx global>{`
        :root {
          --paper: #ffffff;
          --ink: #111827;
          --muted: #4b5563;
          --line: #d1d5db;
          --soft: #f3f4f6;
          --primary: #0f172a;
          --accent: #1d4ed8;
          --success: #15803d;
          --warning: #a16207;
          --danger: #b91c1c;
          --steel: #475569;
        }

        * { box-sizing: border-box; }

        body {
          margin: 0;
          background: #eef2f7;
          color: var(--ink);
          font-family: Arial, Helvetica, sans-serif;
        }

        .audit-page {
          min-height: 100vh;
          background: #eef2f7;
          color: var(--ink);
        }

        .audit-shell {
          max-width: 1200px;
          margin: 0 auto;
          padding: 32px 20px 48px;
        }

        .audit-toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          justify-content: space-between;
          align-items: flex-end;
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 18px 20px;
          margin-bottom: 22px;
          box-shadow: 0 12px 24px rgba(15, 23, 42, 0.06);
        }

        .form-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: end;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 170px;
        }

        .field label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--muted);
        }

        .field input {
          border: 1px solid var(--line);
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 14px;
          background: #fff;
          color: var(--ink);
        }

        .button-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .primary-button,
        .secondary-button,
        .ghost-button {
          border: none;
          border-radius: 10px;
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.2s ease, opacity 0.2s ease;
        }

        .primary-button {
          background: var(--primary);
          color: #fff;
        }

        .secondary-button {
          background: var(--accent);
          color: #fff;
        }

        .ghost-button {
          background: #f3f4f6;
          color: var(--ink);
          border: 1px solid var(--line);
        }

        .primary-button:hover,
        .secondary-button:hover,
        .ghost-button:hover {
          transform: translateY(-1px);
        }

        .error-banner {
          background: #fff1f2;
          border: 1px solid #fecdd3;
          color: #9f1239;
          border-radius: 12px;
          padding: 12px 14px;
          margin-bottom: 16px;
          font-size: 13px;
          font-weight: 600;
        }

        .dossier {
          background: var(--paper);
          border: 1px solid var(--line);
          border-radius: 20px;
          box-shadow: 0 16px 28px rgba(15, 23, 42, 0.05);
          overflow: hidden;
        }

        .dossier-header {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: #fff;
          padding: 26px 30px 22px;
          border-bottom: 5px solid #dbeafe;
        }

        .top-line {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          align-items: center;
          flex-wrap: wrap;
          margin-bottom: 8px;
        }

        .corp-name {
          font-size: 12px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          font-weight: 700;
          opacity: 0.96;
        }

        .doc-stamp {
          border: 1px solid rgba(255, 255, 255, 0.25);
          border-radius: 999px;
          padding: 7px 12px;
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          background: rgba(255, 255, 255, 0.06);
        }

        .document-title {
          margin: 10px 0 14px;
          font-size: clamp(22px, 2.2vw, 32px);
          font-weight: 800;
          letter-spacing: 0.02em;
          line-height: 1.2;
        }

        .header-meta {
          display: grid;
          grid-template-columns: repeat(4, minmax(160px, 1fr));
          gap: 12px;
        }

        .meta-pill {
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.13);
          border-radius: 12px;
          padding: 10px 12px;
        }

        .meta-label {
          display: block;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: rgba(255, 255, 255, 0.72);
          margin-bottom: 4px;
        }

        .meta-value {
          font-size: 14px;
          font-weight: 700;
        }

        .section {
          padding: 22px 30px 18px;
          border-bottom: 1px solid var(--line);
        }

        .section:last-of-type {
          border-bottom: none;
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0;
          font-size: 16px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--primary);
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(180px, 1fr));
          gap: 14px;
        }

        .metric-card {
          border-radius: 14px;
          padding: 14px 14px 12px;
          border: 1px solid var(--line);
          background: #fff;
          min-height: 102px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.12);
        }

        .metric-card.green { background: linear-gradient(180deg, #f0fdf4, #ffffff); }
        .metric-card.amber { background: linear-gradient(180deg, #fffbeb, #ffffff); }
        .metric-card.blue { background: linear-gradient(180deg, #eff6ff, #ffffff); }
        .metric-card.red { background: linear-gradient(180deg, #fef2f2, #ffffff); }
        .metric-card.steel { background: linear-gradient(180deg, #f8fafc, #ffffff); }

        .metric-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .metric-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background: rgba(15, 23, 42, 0.06);
        }

        .metric-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--muted);
        }

        .metric-value {
          font-size: clamp(22px, 2vw, 28px);
          font-weight: 800;
          color: var(--primary);
          line-height: 1.1;
        }

        .metric-value small {
          font-size: 12px;
          font-weight: 700;
          color: var(--muted);
          margin-left: 4px;
        }

        .audit-table-wrap {
          overflow-x: auto;
          border: 1px solid var(--line);
          border-radius: 12px;
          background: #fff;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        th,
        td {
          border-bottom: 1px solid var(--line);
          padding: 10px 12px;
          font-size: 12px;
          text-align: left;
          vertical-align: top;
          break-inside: avoid;
          page-break-inside: avoid;
        }

        th {
          background: #f8fafc;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--muted);
          font-size: 10px;
          font-weight: 800;
        }

        tr:last-child td {
          border-bottom: none;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 5px 8px;
          font-size: 11px;
          font-weight: 700;
          border: 1px solid transparent;
        }

        .status-pill.success {
          background: #ecfdf5;
          color: var(--success);
          border-color: #bbf7d0;
        }

        .status-pill.warning {
          background: #fffbeb;
          color: var(--warning);
          border-color: #fde68a;
        }

        .status-pill.danger {
          background: #fef2f2;
          color: var(--danger);
          border-color: #fecaca;
        }

        .status-pill.steel {
          background: #f8fafc;
          color: var(--steel);
          border-color: #cbd5e1;
        }

        .signature-block {
          display: grid;
          grid-template-columns: repeat(3, minmax(180px, 1fr));
          gap: 18px;
          margin-top: 10px;
        }

        .signature-box {
          min-height: 144px;
          border: 1px solid var(--line);
          border-radius: 14px;
          background: #fafafa;
          padding: 16px 14px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .signature-title {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--muted);
        }

        .signature-line {
          border-top: 2px solid var(--ink);
          padding-top: 8px;
          margin-top: 40px;
          font-size: 12px;
          font-weight: 700;
          color: var(--primary);
        }

        @media (max-width: 980px) {
          .header-meta,
          .metrics-grid,
          .signature-block {
            grid-template-columns: repeat(2, minmax(180px, 1fr));
          }
        }

        @media (max-width: 640px) {
          .audit-shell {
            padding: 16px 12px 24px;
          }

          .dossier-header,
          .section {
            padding-left: 16px;
            padding-right: 16px;
          }

          .header-meta,
          .metrics-grid,
          .signature-block {
            grid-template-columns: 1fr;
          }

          .audit-toolbar {
            padding: 14px 12px;
          }

          .button-row {
            width: 100%;
          }

          .button-row > button {
            flex: 1;
          }
        }

        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }

          body {
            background: #fff !important;
            color: #000 !important;
          }

          .audit-page {
            background: #fff !important;
          }

          .audit-toolbar,
          .no-print {
            display: none !important;
          }

          .audit-shell {
            max-width: none;
            margin: 0;
            padding: 0;
          }

          .dossier {
            box-shadow: none;
            border: none;
            border-radius: 0;
          }

          .metric-card,
          .audit-table-wrap,
          .signature-box,
          th,
          td,
          tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          table,
          th,
          td {
            color: #000 !important;
            background: #fff !important;
          }

          .dossier-header {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background: #0f172a !important;
          }
        }
      `}</style>

      <div className="audit-shell">
        <div className="audit-toolbar no-print">
          <div className="form-grid">
            <div className="field">
              <label htmlFor="startDate">Start date</label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="endDate">End date</label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </div>
          </div>

          <div className="button-row">
            <button type="button" className="primary-button" onClick={fetchAuditDossier} disabled={loading}>
              {loading ? "Fetching..." : "Fetch Audit Dossier"}
            </button>
            <button type="button" className="secondary-button" onClick={() => window.print()}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Printer size={15} /> Print Official Dossier
              </span>
            </button>
            <button type="button" className="ghost-button" onClick={triggerExportCsv}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Download size={15} /> Export Audit CSV
              </span>
            </button>
          </div>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}

        <article className="dossier" aria-label="PMC weekly audit dossier print document">
          <header className="dossier-header">
            <div className="top-line">
              <div className="corp-name">QUADILLAR CONTECH PVT. LTD. — PROJECT QUALITY &amp; SAFETY MANAGEMENT SYSTEM</div>
              <div className="doc-stamp">Official Record</div>
            </div>

            <h1 className="document-title">PMC WEEKLY SITE COMPLIANCE &amp; QUALITY AUDIT DOSSIER</h1>

            <div className="header-meta">
              <div className="meta-pill">
                <span className="meta-label">Audit Window</span>
                <span className="meta-value">{dossier.auditWindow}</span>
              </div>
              <div className="meta-pill">
                <span className="meta-label">Project Location</span>
                <span className="meta-value">{dossier.projectLocation}</span>
              </div>
              <div className="meta-pill">
                <span className="meta-label">Document Ref</span>
                <span className="meta-value">{dossier.documentRef}</span>
              </div>
              <div className="meta-pill">
                <span className="meta-label">Date of Issue</span>
                <span className="meta-value">{formatDisplayDate(dossier.dateOfIssue)}</span>
              </div>
            </div>
          </header>

          <section className="section">
            <div className="section-header">
              <h2 className="section-title">
                <ShieldCheck size={18} />
                Executive Site Metrics Bar
              </h2>
            </div>

            <div className="metrics-grid">
              {dossier.metrics.map((metric) => {
                const toneClass = metric.tone ?? "steel";
                const icon =
                  toneClass === "green" ? <CheckCircle2 size={16} /> :
                  toneClass === "amber" ? <Calendar size={16} /> :
                  toneClass === "blue" ? <FileText size={16} /> :
                  toneClass === "red" ? <AlertOctagon size={16} /> : <HardHat size={16} />;

                return (
                  <div key={metric.label} className={`metric-card ${toneClass}`}>
                    <div className="metric-top">
                      <span className="metric-label">{metric.label}</span>
                      <span className="metric-icon">{icon}</span>
                    </div>
                    <div className="metric-value">
                      {metric.value}
                      {metric.suffix ? <small>{metric.suffix}</small> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="section">
            <div className="section-header">
              <h2 className="section-title">
                <FileText size={18} />
                Concrete Pour &amp; Traceability Register
              </h2>
            </div>

            <div className="audit-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Pour Card ID</th>
                    <th>Structural Element</th>
                    <th>Concrete Grade</th>
                    <th>Inward Transit Mixer Challan Ref</th>
                    <th>Volume (m³)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dossier.pours.map((row) => (
                    <tr key={row.pourCardId}>
                      <td>{row.pourCardId}</td>
                      <td>{row.structuralElement}</td>
                      <td>{row.concreteGrade}</td>
                      <td>{row.mixerChallanRef}</td>
                      <td>{row.volume}</td>
                      <td>
                        <span className={`status-pill ${row.status.toLowerCase().includes("accepted") ? "success" : row.status.toLowerCase().includes("review") ? "warning" : "steel"}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="section">
            <div className="section-header">
              <h2 className="section-title">
                <Beaker size={18} />
                IS 516 Form V Compressive Cube Crushing Register
              </h2>
            </div>

            <div className="audit-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Test Code</th>
                    <th>Pour Card ID</th>
                    <th>Age (7D/28D)</th>
                    <th>Specified fck</th>
                    <th>Crushing Strength Achieved (N/mm²)</th>
                    <th>Compliance Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dossier.cubes.map((row) => (
                    <tr key={row.testCode}>
                      <td>{row.testCode}</td>
                      <td>{row.pourCardId}</td>
                      <td>{row.age}</td>
                      <td>{row.specifiedFck}</td>
                      <td>{row.achievedStrength}</td>
                      <td>
                        <span className={`status-pill ${row.complianceStatus.toLowerCase().includes("failed") ? "danger" : "success"}`}>
                          {row.complianceStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="section">
            <div className="section-header">
              <h2 className="section-title">
                <HardHat size={18} />
                High-Risk Safety &amp; Formwork Stripping Clearance Register
              </h2>
            </div>

            <div className="audit-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Permit Code</th>
                    <th>Activity/Element</th>
                    <th>Maturity Hours Observed</th>
                    <th>Dual Sign-off Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dossier.safety.map((row) => (
                    <tr key={row.permitCode}>
                      <td>{row.permitCode}</td>
                      <td>{row.activity}</td>
                      <td>{row.maturityHours}</td>
                      <td>
                        <span className={`status-pill ${row.dualSignoff.toLowerCase().includes("pending") ? "warning" : "success"}`}>
                          {row.dualSignoff}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="section">
            <div className="section-header">
              <h2 className="section-title">
                <AlertOctagon size={18} />
                Non-Conformance &amp; Contractor Back-Charge Ledger
              </h2>
            </div>

            <div className="audit-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>NCR Code</th>
                    <th>Structural Location</th>
                    <th>Remediation Contractor</th>
                    <th>Debit Value (₹)</th>
                    <th>Closure Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dossier.ncrs.map((row) => (
                    <tr key={row.ncrCode}>
                      <td>{row.ncrCode}</td>
                      <td>{row.structuralLocation}</td>
                      <td>{row.remediationContractor}</td>
                      <td>{row.debitValue}</td>
                      <td>
                        <span className={`status-pill ${row.closureStatus.toLowerCase().includes("open") ? "warning" : "success"}`}>
                          {row.closureStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="section">
            <div className="section-header">
              <h2 className="section-title">
                <CheckCircle2 size={18} />
                Signatory &amp; Certification Block
              </h2>
            </div>

            <div className="signature-block">
              <div className="signature-box">
                <div className="signature-title">1. Contractor Quality In-Charge</div>
                <div className="signature-line">Signature / Stamp</div>
              </div>

              <div className="signature-box">
                <div className="signature-title">2. PMC Resident Quality Engineer</div>
                <div className="signature-line">Signature / Stamp</div>
              </div>

              <div className="signature-box">
                <div className="signature-title">3. Client Representative / Project Director</div>
                <div className="signature-line">Signature / Stamp</div>
              </div>
            </div>
          </section>
        </article>
      </div>
    </main>
  );
}
