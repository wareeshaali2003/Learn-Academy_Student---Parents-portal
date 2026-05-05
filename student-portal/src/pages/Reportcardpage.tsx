// Reportcardpage.tsx
// Learn Academy – Parents Portal – Report Card (ERPNext Assessment Result API)
// Includes Print / Save PDF + View Report Card Preview functionality

import React, { useEffect, useRef, useState, FC, CSSProperties } from "react";
import { useUser } from "../context/UserContext";
import { motion, AnimatePresence } from "motion/react";
import { Printer, Eye, X } from "lucide-react";

// ─── ERPNext Base URL ─────────────────────────────────────────────────────────
const BASE = ""; // same-origin; adjust if needed e.g. "http://your-erp.local"

// ─── Types ────────────────────────────────────────────────────────────────────
interface AssessmentDetail {
  assessment_criteria: string;
  maximum_score: number;
  score: number;
  grade: string;
}

interface AssessmentResult {
  name: string;
  course: string;
  academic_year: string;
  academic_term: string;
  student_name: string;
  student_group: string;
  assessment_plan: string;
  assessment_group: string;
  maximum_score: number;
  total_score: number;
  grade: string;
  details: AssessmentDetail[];
  teacher_comment?: string;
}

// ─── Colour Tokens ────────────────────────────────────────────────────────────
const C = {
  brand:         "#1D9E75",
  brandDark:     "#0F6E56",
  brandLight:    "#E1F5EE",
  brandMid:      "#9FE1CB",
  white:         "#ffffff",
  bg:            "#F4FAF7",
  surface:       "#ffffff",
  border:        "#C8E6DA",
  textPrimary:   "#1a2e28",
  textSecondary: "#4a6b60",
  textMuted:     "#7a9e94",
  error:         "#E24B4A",
  errorBg:       "#FCEBEB",
  success:       "#2E7D32",
  successBg:     "#E8F5E9",
  warning:       "#BA7517",
  warningBg:     "#FAEEDA",
  tableHead:     "#085041",
  tableRow:      "#f0faf5",
} as const;

// ─── Personal & Social Development Objectives ─────────────────────────────────
const PSD_OBJECTIVES = [
  "Is enthusiastic and resourceful learner",
  "Self-disciplined and resolves difficulties in mature ways",
  "Enjoys excellent relationship with peers and teachers",
  "Is genuine, empathetic and respectful towards others",
  "Punctual to school and lessons",
  "Contributes actively to school and wider community",
  "Exhibits excellent work ethic, is creative and leads confidence",
];

// ─── Grade Colour Helper ──────────────────────────────────────────────────────
function gradeColor(g: string): { bg: string; color: string } {
  if (!g) return { bg: C.border, color: C.textMuted };
  const u = g.toUpperCase();
  if (u.startsWith("A")) return { bg: "#DCFCE7", color: "#166534" };
  if (u.startsWith("B")) return { bg: "#DBEAFE", color: "#1E40AF" };
  if (u.startsWith("C")) return { bg: "#FEF9C3", color: "#854D0E" };
  if (u.startsWith("D")) return { bg: C.warningBg, color: C.warning };
  return { bg: C.errorBg, color: C.error };
}

// ─── Tiny UI Helpers ──────────────────────────────────────────────────────────
const GradeBadge: FC<{ grade: string; large?: boolean }> = ({ grade, large }) => {
  const gc = gradeColor(grade);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      padding: large ? "6px 18px" : "2px 10px",
      borderRadius: 20,
      fontSize: large ? 18 : 12,
      fontWeight: 800,
      letterSpacing: "0.04em",
      ...gc,
    }}>
      {grade || "—"}
    </span>
  );
};

const ProgressBar: FC<{ value: number; max: number; color?: string }> = ({ value, max, color = C.brand }) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ height: 6, borderRadius: 4, background: "#E5E7EB", overflow: "hidden", width: "100%" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width .6s ease" }} />
    </div>
  );
};

const Spinner: FC = () => (
  <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
    <div style={{
      width: 40, height: 40,
      border: `4px solid ${C.brandLight}`,
      borderTopColor: C.brand,
      borderRadius: "50%",
      animation: "spin 0.8s linear infinite",
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// ─── Print Helper ─────────────────────────────────────────────────────────────
function buildPrintHTML(
  results: AssessmentResult[],
  studentName: string,
  filters: FilterState
): string {
  const courseMap: Record<string, { mid?: AssessmentResult; final?: AssessmentResult }> = {};
  results.forEach(r => {
    const cn = r.course?.split("-").pop() || r.course;
    if (!courseMap[cn]) courseMap[cn] = {};
    const term = (r.academic_term || "").toLowerCase();
    if (term.includes("mid")) courseMap[cn].mid = r;
    else courseMap[cn].final = r;
  });

  const midResults   = results.filter(r => (r.academic_term || "").toLowerCase().includes("mid"));
  const finalResults = results.filter(r => !(r.academic_term || "").toLowerCase().includes("mid"));
  const midTotal     = midResults.reduce((s, r) => s + r.total_score, 0);
  const midMax       = midResults.reduce((s, r) => s + r.maximum_score, 0);
  const finalTotal   = finalResults.reduce((s, r) => s + r.total_score, 0);
  const finalMax     = finalResults.reduce((s, r) => s + r.maximum_score, 0);

  const teacherComment = results.find(r => r.teacher_comment)?.teacher_comment || "";
  const year  = results[0]?.academic_year || "";
  const group = results[0]?.student_group || "";
  const hasFinal = finalResults.length > 0;

  const subjectRows = Object.entries(courseMap).map(([cn, { mid, final }]) => `
    <tr>
      <td>${cn.toUpperCase()}</td>
      <td style="text-align:center">${mid ? mid.total_score : ""}</td>
      ${hasFinal ? `<td style="text-align:center">${final ? final.total_score : ""}</td>` : ""}
    </tr>
  `).join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Progress Report – ${studentName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; background: #fff; color: #111; font-size: 13px; }
    .page { max-width: 720px; margin: 20px auto; padding: 24px; border: 1px solid #ccc; }
    .header { text-align: center; margin-bottom: 16px; }
    .header h1 { font-size: 28px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; font-family: Georgia, serif; }
    .header .logo-sub { color: #1D9E75; font-size: 12px; margin: 2px 0 4px; }
    .header .contact { font-size: 11px; color: #555; line-height: 1.6; }
    .header .title { font-size: 20px; font-style: italic; font-weight: 700; margin-top: 8px; color: #111; }
    .re { font-size: 11px; position: absolute; top: 24px; right: 24px; color: #888; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; margin: 12px 0; font-size: 12px; }
    .meta-row { display: flex; gap: 6px; border-bottom: 1px solid #aaa; padding: 3px 0; }
    .meta-label { color: #555; min-width: 90px; }
    .meta-value { font-weight: 600; flex: 1; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px; }
    th { background: #1a2e28; color: #fff; padding: 6px 10px; text-align: center; font-weight: 600; text-transform: uppercase; font-size: 11px; }
    th.left { text-align: left; }
    td { padding: 5px 10px; border: 1px solid #ccc; }
    tr:nth-child(even) { background: #f7faf8; }
    .total-row td { font-weight: 700; background: #e8f5e9; }
    .term-table th, .term-table td { text-align: center; }
    .term-table td:first-child { text-align: left; }
    .psd-table th { font-size: 11px; }
    .psd-table td { font-size: 11px; }
    .psd-table .obj { text-align: left; }
    .psd-table .val { text-align: center; color: #0F6E56; font-weight: 600; }
    .promoted { border: 1px solid #ccc; padding: 6px 12px; font-size: 12px; font-weight: 600; margin: 10px 0; }
    .sig-row { display: flex; justify-content: space-between; margin-top: 32px; }
    .sig-block { text-align: center; min-width: 180px; }
    .sig-line { border-top: 1px solid #555; margin-bottom: 4px; }
    .sig-label { font-size: 11px; color: #555; text-transform: uppercase; letter-spacing: 0.5px; }
    @media print { body { margin: 0; } .page { border: none; margin: 0; padding: 16px; } }
  </style>
</head>
<body>
<div class="page" style="position:relative">
  <div class="re">RE: 71765B7-S</div>
  <div class="header">
    <h1>Learn Academy</h1>
    <div class="logo-sub">&#9650; learn</div>
    <div class="contact">0318-1142457 · 0311-1724725<br>info.learnschool@gmail.com</div>
    <div class="title"><i>Progress Report</i></div>
  </div>
  <div class="meta-grid">
    <div class="meta-row"><span class="meta-label">Name of student:</span><span class="meta-value">${studentName}</span></div>
    <div class="meta-row"><span class="meta-label">Roll No.:</span><span class="meta-value">&nbsp;</span></div>
    <div class="meta-row"><span class="meta-label">Year:</span><span class="meta-value">${year}</span></div>
    <div class="meta-row"><span class="meta-label">Grade:</span><span class="meta-value">${group}</span></div>
    <div class="meta-row"><span class="meta-label">Date:</span><span class="meta-value">&nbsp;</span></div>
  </div>
  <table class="term-table">
    <thead>
      <tr>
        <th class="left">Subject</th>
        <th>Mid Term</th>
        ${hasFinal ? "<th>Final Term</th>" : ""}
      </tr>
    </thead>
    <tbody>
      ${subjectRows}
      <tr class="total-row">
        <td>Obtained Marks</td>
        <td style="text-align:center">${midTotal > 0 ? `${midTotal} / ${midMax}` : "— / 400"}</td>
        ${hasFinal ? `<td style="text-align:center">${finalTotal > 0 ? `${finalTotal} / ${finalMax}` : "— / 400"}</td>` : ""}
      </tr>
    </tbody>
  </table>
  <table class="term-table" style="margin-top:8px">
    <thead>
      <tr><th class="left">Term</th><th>Percentage</th><th>Grade</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>Mid Term</td>
        <td style="text-align:center">${midMax > 0 ? Math.round((midTotal / midMax) * 100) + "%" : ""}</td>
        <td style="text-align:center">${midResults[0]?.grade || ""}</td>
      </tr>
      ${hasFinal ? `<tr>
        <td>Final Term</td>
        <td style="text-align:center">${finalMax > 0 ? Math.round((finalTotal / finalMax) * 100) + "%" : ""}</td>
        <td style="text-align:center">${finalResults[0]?.grade || ""}</td>
      </tr>` : ""}
    </tbody>
  </table>
  <table style="margin-top:10px">
    <thead><tr><th colspan="2" class="left">Teacher's Comment</th></tr></thead>
    <tbody><tr><td style="min-height:80px; padding:12px; font-size:12px; line-height:1.7;">${teacherComment || "&nbsp;"}</td></tr></tbody>
  </table>
  <table class="psd-table" style="margin-top:14px">
    <thead>
      <tr><th colspan="${hasFinal ? 3 : 2}" class="left">Personal and Social Development</th></tr>
      <tr style="background:#1a2e28">
        <th class="left obj">Objective</th>
        <th>Mid Term</th>
        ${hasFinal ? "<th>Final Term</th>" : ""}
      </tr>
    </thead>
    <tbody>
      ${PSD_OBJECTIVES.map(obj => `
        <tr>
          <td class="obj">${obj}</td>
          <td class="val">OFTEN</td>
          ${hasFinal ? '<td class="val">OFTEN</td>' : ""}
        </tr>
      `).join("")}
    </tbody>
  </table>
  <div class="promoted">Promoted To Grade: ___________________________</div>
  <div class="sig-row">
    <div class="sig-block">
      <div style="height:40px"></div>
      <div class="sig-line"></div>
      <div class="sig-label">Class Teacher's Signature</div>
    </div>
    <div class="sig-block">
      <div style="height:40px"></div>
      <div class="sig-line"></div>
      <div class="sig-label">Principal's Signature</div>
    </div>
  </div>
</div>
</body>
</html>`;
}

// ─── Report Card Preview Modal ────────────────────────────────────────────────
const ReportCardPreview: FC<{
  results: AssessmentResult[];
  studentName: string;
  filters: FilterState;
  onClose: () => void;
  onPrint: () => void;
}> = ({ results, studentName, filters, onClose, onPrint }) => {

  const courseMap: Record<string, { mid?: AssessmentResult; final?: AssessmentResult }> = {};
  results.forEach(r => {
    const cn = r.course?.split("-").pop() || r.course;
    if (!courseMap[cn]) courseMap[cn] = {};
    const term = (r.academic_term || "").toLowerCase();
    if (term.includes("mid")) courseMap[cn].mid = r;
    else courseMap[cn].final = r;
  });

  const midResults   = results.filter(r => (r.academic_term || "").toLowerCase().includes("mid"));
  const finalResults = results.filter(r => !(r.academic_term || "").toLowerCase().includes("mid"));
  const midTotal     = midResults.reduce((s, r) => s + r.total_score, 0);
  const midMax       = midResults.reduce((s, r) => s + r.maximum_score, 0);
  const finalTotal   = finalResults.reduce((s, r) => s + r.total_score, 0);
  const finalMax     = finalResults.reduce((s, r) => s + r.maximum_score, 0);

  const teacherComment = results.find(r => r.teacher_comment)?.teacher_comment || "";
  const year  = results[0]?.academic_year || "";
  const group = results[0]?.student_group || "";
  const hasFinal = finalResults.length > 0;

  const tableStyle: CSSProperties = { width: "100%", borderCollapse: "collapse", marginBottom: 12, fontSize: 12 };
  const thStyle: CSSProperties    = { background: "#1a2e28", color: "#fff", padding: "6px 10px", textAlign: "center", fontWeight: 600, textTransform: "uppercase", fontSize: 11 };
  const tdStyle: CSSProperties    = { padding: "5px 10px", border: "1px solid #ccc" };

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.6)",
          display: "flex", alignItems: "flex-start", justifyContent: "center",
          padding: "20px 16px",
          overflowY: "auto",
        }}
      >
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ type: "spring", damping: 22, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
          style={{
            background: C.white,
            borderRadius: 16,
            width: "100%",
            maxWidth: 780,
            overflow: "hidden",
            boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
          }}
        >
          {/* Modal Header */}
          <div style={{
            background: `linear-gradient(135deg, ${C.brandDark} 0%, ${C.brand} 100%)`,
            padding: "16px 20px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Eye size={18} color={C.white} />
              <span style={{ color: C.white, fontWeight: 700, fontSize: 16 }}>Report Card Preview</span>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={onPrint}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 14px", background: C.white,
                  color: C.brandDark, border: "none", borderRadius: 8,
                  fontWeight: 700, fontSize: 12, cursor: "pointer",
                }}
              >
                <Printer size={13} /> Print / Save PDF
              </button>
              <button
                onClick={onClose}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 32, height: 32,
                  background: "rgba(255,255,255,0.2)",
                  border: "none", borderRadius: 8,
                  cursor: "pointer", color: C.white,
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Report Card Body */}
          <div style={{ padding: "24px 28px", fontFamily: "Arial, Helvetica, sans-serif", color: "#111", fontSize: 13 }}>

            {/* RE number */}
            <div style={{ textAlign: "right", fontSize: 11, color: "#888", marginBottom: 4 }}>RE: 71765B7-S</div>

            {/* School Header */}
            <div style={{ textAlign: "center", marginBottom: 16, borderBottom: "2px solid #1a2e28", paddingBottom: 12 }}>
              <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase", fontFamily: "Georgia, serif" }}>
                Learn Academy
              </div>
              <div style={{ color: C.brand, fontSize: 12, margin: "2px 0 4px" }}>▲ learn</div>
              <div style={{ fontSize: 11, color: "#555", lineHeight: 1.6 }}>
                0318-1142457 · 0311-1724725<br />
                info.learnschool@gmail.com
              </div>
              <div style={{ fontSize: 18, fontStyle: "italic", fontWeight: 700, marginTop: 8, color: "#111" }}>
                <i>Progress Report</i>
              </div>
            </div>

            {/* Meta Fields */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 24px", marginBottom: 16, fontSize: 12 }}>
              {[
                ["Name of student", studentName],
                ["Roll No.", ""],
                ["Year", year],
                ["Grade", group],
                ["Date", ""],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", gap: 6, borderBottom: "1px solid #aaa", padding: "3px 0" }}>
                  <span style={{ color: "#555", minWidth: 110 }}>{label}:</span>
                  <span style={{ fontWeight: 600 }}>{value || "\u00a0"}</span>
                </div>
              ))}
            </div>

            {/* Subject Marks Table */}
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: "left" }}>Subject</th>
                  <th style={thStyle}>Mid Term</th>
                  {hasFinal && <th style={thStyle}>Final Term</th>}
                </tr>
              </thead>
              <tbody>
                {Object.entries(courseMap).map(([cn, { mid, final }], i) => (
                  <tr key={cn} style={{ background: i % 2 === 0 ? "#f7faf8" : "#fff" }}>
                    <td style={tdStyle}>{cn.toUpperCase()}</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{mid ? mid.total_score : "—"}</td>
                    {hasFinal && <td style={{ ...tdStyle, textAlign: "center" }}>{final ? final.total_score : "—"}</td>}
                  </tr>
                ))}
                <tr style={{ background: "#e8f5e9", fontWeight: 700 }}>
                  <td style={tdStyle}>Obtained Marks</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    {midTotal > 0 ? `${midTotal} / ${midMax}` : "— / 400"}
                  </td>
                  {hasFinal && (
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      {finalTotal > 0 ? `${finalTotal} / ${finalMax}` : "— / 400"}
                    </td>
                  )}
                </tr>
              </tbody>
            </table>

            {/* Term Summary Table */}
            <table style={{ ...tableStyle, marginTop: 8 }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: "left" }}>Term</th>
                  <th style={thStyle}>Percentage</th>
                  <th style={thStyle}>Grade</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={tdStyle}>Mid Term</td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    {midMax > 0 ? Math.round((midTotal / midMax) * 100) + "%" : "—"}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center", fontWeight: 700 }}>
                    {midResults[0]?.grade || "—"}
                  </td>
                </tr>
                {hasFinal && (
                  <tr style={{ background: "#f7faf8" }}>
                    <td style={tdStyle}>Final Term</td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      {finalMax > 0 ? Math.round((finalTotal / finalMax) * 100) + "%" : "—"}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center", fontWeight: 700 }}>
                      {finalResults[0]?.grade || "—"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Teacher Comment */}
            <table style={{ ...tableStyle, marginTop: 10 }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: "left" }}>Teacher's Comment</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ ...tdStyle, minHeight: 80, padding: 12, lineHeight: 1.7 }}>
                    {teacherComment || <span style={{ color: "#aaa" }}>No comment added.</span>}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Personal & Social Development */}
            <table style={{ ...tableStyle, marginTop: 14 }}>
              <thead>
                <tr>
                  <th colSpan={hasFinal ? 3 : 2} style={{ ...thStyle, textAlign: "left" }}>
                    Personal and Social Development
                  </th>
                </tr>
                <tr style={{ background: "#1a2e28" }}>
                  <th style={{ ...thStyle, textAlign: "left", fontSize: 11 }}>Objective</th>
                  <th style={{ ...thStyle, fontSize: 11 }}>Mid Term</th>
                  {hasFinal && <th style={{ ...thStyle, fontSize: 11 }}>Final Term</th>}
                </tr>
              </thead>
              <tbody>
                {PSD_OBJECTIVES.map((obj, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#f7faf8" : "#fff" }}>
                    <td style={{ ...tdStyle, fontSize: 11 }}>{obj}</td>
                    <td style={{ ...tdStyle, textAlign: "center", color: C.brandDark, fontWeight: 600, fontSize: 11 }}>OFTEN</td>
                    {hasFinal && <td style={{ ...tdStyle, textAlign: "center", color: C.brandDark, fontWeight: 600, fontSize: 11 }}>OFTEN</td>}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Promoted */}
            <div style={{ border: "1px solid #ccc", padding: "6px 12px", fontSize: 12, fontWeight: 600, margin: "12px 0" }}>
              Promoted To Grade: ___________________________
            </div>

            {/* Signatures */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32, paddingTop: 8 }}>
              {["Class Teacher's Signature", "Principal's Signature"].map(label => (
                <div key={label} style={{ textAlign: "center", minWidth: 180 }}>
                  <div style={{ height: 40 }} />
                  <div style={{ borderTop: "1px solid #555", marginBottom: 4 }} />
                  <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ─── Subject Card (on-screen) ──────────────────────────────────────────────────
const SubjectCard: FC<{ result: AssessmentResult; index: number }> = ({ result, index }) => {
  const [open, setOpen] = useState(false);
  const pct = result.maximum_score > 0
    ? Math.round((result.total_score / result.maximum_score) * 100)
    : 0;

  const courseName = result.course?.split("-").pop() || result.course;
  const gc = gradeColor(result.grade);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 12,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px",
          cursor: "pointer",
          background: open ? C.brandLight : C.surface,
          transition: "background .2s",
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: gc.bg, color: gc.color,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 900, fontSize: 13,
            }}>
              {courseName.charAt(0)}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary }}>{courseName}</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>{result.student_group} · {result.academic_year} · {result.academic_term}</div>
            </div>
          </div>
          <div style={{ marginTop: 8, paddingLeft: 46 }}>
            <ProgressBar value={result.total_score} max={result.maximum_score} color={gc.color} />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginLeft: 16 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.brandDark }}>
              {result.total_score}<span style={{ fontSize: 12, color: C.textMuted, fontWeight: 400 }}>/{result.maximum_score}</span>
            </div>
            <div style={{ fontSize: 11, color: C.textMuted }}>{pct}%</div>
          </div>
          <GradeBadge grade={result.grade} large />
          <span style={{ color: C.textMuted, fontSize: 12, transition: "transform .2s", transform: open ? "rotate(180deg)" : "none", display: "inline-block" }}>▼</span>
        </div>
      </div>

      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          style={{ borderTop: `1px solid ${C.border}` }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.tableHead, color: C.white }}>
                <th style={{ padding: "8px 18px", textAlign: "left", fontWeight: 600 }}>Criteria</th>
                <th style={{ padding: "8px 12px", textAlign: "center", width: 120 }}>Score</th>
                <th style={{ padding: "8px 12px", textAlign: "center", width: 80 }}>Grade</th>
              </tr>
            </thead>
            <tbody>
              {result.details.map((d, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? C.tableRow : C.surface, borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "9px 18px", color: C.textPrimary, fontWeight: 500, textTransform: "capitalize" }}>{d.assessment_criteria}</td>
                  <td style={{ padding: "9px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.brandDark }}>{d.score}<span style={{ fontSize: 11, color: C.textMuted, fontWeight: 400 }}>/{d.maximum_score}</span></div>
                    <ProgressBar value={d.score} max={d.maximum_score} color={gradeColor(d.grade).color} />
                  </td>
                  <td style={{ padding: "9px 12px", textAlign: "center" }}><GradeBadge grade={d.grade} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}
    </motion.div>
  );
};

// ─── Summary Stats Bar ────────────────────────────────────────────────────────
const SummaryBar: FC<{ results: AssessmentResult[] }> = ({ results }) => {
  if (!results.length) return null;
  const totalObt = results.reduce((s, r) => s + r.total_score, 0);
  const totalMax = results.reduce((s, r) => s + r.maximum_score, 0);
  const overallPct = totalMax > 0 ? Math.round((totalObt / totalMax) * 100) : 0;

  const gradeCount: Record<string, number> = {};
  results.forEach(r => { gradeCount[r.grade[0]] = (gradeCount[r.grade[0]] || 0) + 1; });

  const stats = [
    { label: "Subjects", value: results.length.toString() },
    { label: "Total Marks", value: `${totalObt}/${totalMax}` },
    { label: "Overall %", value: `${overallPct}%` },
    { label: "Best Grade", value: Object.keys(gradeCount).sort()[0] || "—" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginBottom: 20 }}>
      {stats.map(({ label, value }) => (
        <div key={label} style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: "14px 16px", textAlign: "center",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.brandDark }}>{value}</div>
          <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
        </div>
      ))}
    </div>
  );
};

// ─── Filters ─────────────────────────────────────────────────────────────────
interface FilterState { year: string; term: string; group: string; }

const Filters: FC<{
  results: AssessmentResult[];
  filters: FilterState;
  onChange: (f: FilterState) => void;
}> = ({ results, filters, onChange }) => {
  const years  = [...new Set(results.map(r => r.academic_year))];
  const terms  = [...new Set(results.map(r => r.academic_term))];
  const groups = [...new Set(results.map(r => r.student_group))];

  const sel: CSSProperties = {
    padding: "7px 10px", border: `1px solid ${C.border}`,
    borderRadius: 8, fontSize: 13, color: C.textPrimary,
    background: C.white, cursor: "pointer",
  };

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
      <select style={sel} value={filters.year} onChange={e => onChange({ ...filters, year: e.target.value })}>
        <option value="">All Years</option>
        {years.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
      <select style={sel} value={filters.term} onChange={e => onChange({ ...filters, term: e.target.value })}>
        <option value="">All Terms</option>
        {terms.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <select style={sel} value={filters.group} onChange={e => onChange({ ...filters, group: e.target.value })}>
        <option value="">All Groups</option>
        {groups.map(g => <option key={g} value={g}>{g}</option>)}
      </select>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const ReportCardPage: FC = () => {
  // ── UPDATED: studentId aur studentName dono UserContext se aate hain ──────
  // studentId = guardian ke liye bhi student ka ID hoga (jaise SchedulePage mein)
  const { studentId, studentName: ctxStudentName } = useUser() as any;
  const studentName: string = ctxStudentName || "Student";

  const [results, setResults]         = useState<AssessmentResult[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [filters, setFilters]         = useState<FilterState>({ year: "", term: "", group: "" });
  const [showPreview, setShowPreview] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!studentId) { setLoading(false); return; }

    const fetchResults = async () => {
      setLoading(true);
      setError("");
      try {
        const listRes = await fetch(
          `${BASE}/api/resource/Assessment Result?filters=[["student","=","${studentId}"]]&fields=["name"]&limit=100`,
          { credentials: "include" }
        );
        if (!listRes.ok) throw new Error("Failed to fetch assessment list");
        const listData = await listRes.json();
        const names: string[] = (listData.data || []).map((r: any) => r.name);

        const details = await Promise.all(
          names.map((name) =>
            fetch(`${BASE}/api/resource/Assessment Result/${name}`, { credentials: "include" })
              .then(r => r.json())
              .then(d => d.data as AssessmentResult)
              .catch(() => null)
          )
        );
        setResults(details.filter(Boolean) as AssessmentResult[]);
      } catch (err: any) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [studentId]);

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = results.filter(r =>
    (!filters.year  || r.academic_year  === filters.year)  &&
    (!filters.term  || r.academic_term  === filters.term)  &&
    (!filters.group || r.student_group  === filters.group)
  );

  const activeResults = filtered.length ? filtered : results;

  // ── Print Handler ──────────────────────────────────────────────────────────
  const handlePrint = () => {
    const html = buildPrintHTML(activeResults, studentName, filters);
    const win = window.open("", "_blank", "width=820,height=1000");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Segoe UI', Tahoma, sans-serif", color: C.textPrimary }}>

      {/* Preview Modal */}
      {showPreview && (
        <ReportCardPreview
          results={activeResults}
          studentName={studentName}
          filters={filters}
          onClose={() => setShowPreview(false)}
          onPrint={handlePrint}
        />
      )}

      {/* Page Header */}
      <div style={{
        background: `linear-gradient(135deg, ${C.brandDark} 0%, ${C.brand} 100%)`,
        padding: "24px 24px 32px",
        marginBottom: -20,
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: "rgba(255,255,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22,
              }}>📊</div>
              <div>
                <h2 style={{ margin: 0, color: C.white, fontWeight: 800, fontSize: 20 }}>Report Card</h2>
                <p style={{ margin: 0, color: C.brandMid, fontSize: 13 }}>
                  {studentName}'s Assessment Results
                </p>
              </div>
            </div>

            {/* ── Action Buttons ── */}
            {!loading && results.length > 0 && (
              <div style={{ display: "flex", gap: 10 }}>
                {/* View Report Card Button */}
                <button
                  onClick={() => setShowPreview(true)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "9px 18px",
                    background: "rgba(255,255,255,0.15)",
                    color: C.white,
                    border: `1.5px solid rgba(255,255,255,0.5)`,
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                    backdropFilter: "blur(4px)",
                    transition: "background .2s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.25)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
                >
                  <Eye size={15} />
                  View Report Card
                </button>

                {/* Print Button */}
                <button
                  onClick={handlePrint}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "9px 18px",
                    background: C.white,
                    color: C.brandDark,
                    border: "none",
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                    transition: "opacity .2s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                  onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                >
                  <Printer size={15} />
                  Print / Save PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 16px 40px" }}>

        {error && (
          <div style={{ background: C.errorBg, border: `1px solid ${C.error}`, borderRadius: 8, padding: "10px 14px", color: C.error, fontSize: 13, marginBottom: 16 }}>
            ⚠ {error}
          </div>
        )}

        {loading && <Spinner />}

        {!loading && !error && (
          <>
            {results.length > 0 && (
              <Filters results={results} filters={filters} onChange={setFilters} />
            )}

            <SummaryBar results={filtered} />

            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 16px", color: C.textMuted }}>
                <div style={{ fontSize: 48, marginBottom: 10 }}>📂</div>
                <p style={{ fontSize: 15 }}>
                  {results.length === 0
                    ? "Koi assessment result nahi mila."
                    : "Is filter ke liye koi result nahi."}
                </p>
              </div>
            ) : (
              filtered.map((r, i) => (
                <SubjectCard key={r.name} result={r} index={i} />
              ))
            )}
          </>
        )}

        {!loading && !error && !studentId && (
          <div style={{ textAlign: "center", padding: 60, color: C.textMuted }}>
            <div style={{ fontSize: 40 }}>🔒</div>
            <p>Student ID nahi mila. Please login karein.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportCardPage;