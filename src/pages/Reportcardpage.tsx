// pages/ReportCardPage.tsx
import React, { useEffect, useState, FC, CSSProperties } from "react";
import { useUser } from "../context/UserContext";
import { motion, AnimatePresence } from "motion/react";
import { Printer, Eye, X, Users, AlertCircle } from "lucide-react";

const BASE = "";

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

interface FilterState {
  year: string;
  term: string;
  group: string;
}

type TermFilter = "mid" | "final" | "both";

// ─── useReportCard Hook ───────────────────────────────────────────────────────
function useReportCard(studentId: string | null | undefined) {
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) {
      setIsLoading(false);
      setResults([]);
      return;
    }

    let cancelled = false;

    const fetchResults = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const listRes = await fetch(
          `${BASE}/api/resource/Assessment Result?filters=[["student","=","${studentId}"]]&fields=["name"]&limit=200`,
          { credentials: "include" }
        );
        if (!listRes.ok) throw new Error("Assessment results fetch nahi hue. Network check karein.");

        const listData = await listRes.json();
        const names: string[] = (listData.data || []).map((r: any) => r.name);

        if (names.length === 0) {
          if (!cancelled) setResults([]);
          return;
        }

        const details = await Promise.all(
          names.map((name) =>
            fetch(`${BASE}/api/resource/Assessment Result/${name}`, { credentials: "include" })
              .then((r) => {
                if (!r.ok) throw new Error(`${name} load nahi hua`);
                return r.json();
              })
              .then((d) => d.data as AssessmentResult)
              .catch(() => null)
          )
        );

        if (!cancelled) {
          setResults(details.filter(Boolean) as AssessmentResult[]);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Kuch problem ho gayi. Dobara try karein.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchResults();
    return () => { cancelled = true; };
  }, [studentId]);

  return { results, isLoading, error };
}

// ─── Merge duplicate course+term entries ─────────────────────────────────────
function deduplicateResults(results: AssessmentResult[]): AssessmentResult[] {
  const map = new Map<string, AssessmentResult>();
  for (const r of results) {
    const key = `${getCourseName(r.course)}__${r.academic_term}__${r.academic_year}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, r);
    } else {
      if (r.total_score > existing.total_score) map.set(key, r);
    }
  }
  return Array.from(map.values());
}

function buildReportCardResults(
  results: AssessmentResult[],
  filters: FilterState,
  termFilter: TermFilter = "both"
): AssessmentResult[] {
  let filtered = results.filter(r =>
    (!filters.year  || r.academic_year === filters.year) &&
    (!filters.group || r.student_group === filters.group)
  );

  if (termFilter === "mid")   filtered = filtered.filter(r => isMidTerm(r.academic_term));
  if (termFilter === "final") filtered = filtered.filter(r => !isMidTerm(r.academic_term));

  const base = filtered.length ? filtered : results.filter(r => {
    if (termFilter === "mid")   return isMidTerm(r.academic_term);
    if (termFilter === "final") return !isMidTerm(r.academic_term);
    return true;
  });

  return deduplicateResults(base);
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

const PSD_OBJECTIVES = [
  "Is enthusiastic and resourceful learner",
  "Self-disciplined and resolves difficulties in mature ways",
  "Enjoys excellent relationship with peers and teachers",
  "Is genuine, empathetic and respectful towards others",
  "Punctual to school and lessons",
  "Contributes actively to school and wider community",
  "Exhibits excellent work ethic, is creative and leads confidence",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function gradeColor(g: string): { bg: string; color: string } {
  if (!g) return { bg: C.border, color: C.textMuted };
  const u = g.toUpperCase();
  if (u.startsWith("A")) return { bg: "#DCFCE7", color: "#166534" };
  if (u.startsWith("B")) return { bg: "#DBEAFE", color: "#1E40AF" };
  if (u.startsWith("C")) return { bg: "#FEF9C3", color: "#854D0E" };
  if (u.startsWith("D")) return { bg: C.warningBg, color: C.warning };
  return { bg: C.errorBg, color: C.error };
}

function getCourseName(course: string): string {
  return course?.split("-").pop() || course || "Unknown";
}

function isMidTerm(term: string): boolean {
  return (term || "").toLowerCase().includes("mid");
}

function termFilterLabel(tf: TermFilter): string {
  if (tf === "mid")   return "Mid Term";
  if (tf === "final") return "Final Term";
  return "Both Terms";
}

// ─── Tiny Components ──────────────────────────────────────────────────────────
const GradeBadge: FC<{ grade: string; large?: boolean }> = ({ grade, large }) => {
  const gc = gradeColor(grade);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      padding: large ? "6px 18px" : "2px 10px",
      borderRadius: 20,
      fontSize: large ? 18 : 12,
      fontWeight: 800,
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
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 0", gap: 12 }}>
    <div style={{
      width: 36, height: 36,
      border: `4px solid ${C.brandLight}`,
      borderTopColor: C.brand,
      borderRadius: "50%",
      animation: "spin 0.8s linear infinite",
    }} />
    <p style={{ fontSize: 13, color: C.textMuted, fontWeight: 500 }}>Loading results…</p>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// ─── Summary Stats Bar ────────────────────────────────────────────────────────
const SummaryBar: FC<{ results: AssessmentResult[] }> = ({ results }) => {
  if (!results.length) return null;
  const totalObt = results.reduce((s, r) => s + r.total_score, 0);
  const totalMax = results.reduce((s, r) => s + r.maximum_score, 0);
  const pct = totalMax > 0 ? Math.round((totalObt / totalMax) * 100) : 0;
  const grades = results.map(r => r.grade).sort();

  const stats = [
    { label: "Subjects",    value: results.length.toString() },
    { label: "Total Marks", value: `${totalObt}/${totalMax}` },
    { label: "Overall %",   value: `${pct}%` },
    { label: "Best Grade",  value: grades[0] || "—" },
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

// ─── Filters ──────────────────────────────────────────────────────────────────
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
        <option value="">All Terms (Cards)</option>
        {terms.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <select style={sel} value={filters.group} onChange={e => onChange({ ...filters, group: e.target.value })}>
        <option value="">All Groups</option>
        {groups.map(g => <option key={g} value={g}>{g.replace(/^LB-/, "")}</option>)}
      </select>
    </div>
  );
};

// ─── Subject Card ─────────────────────────────────────────────────────────────
const SubjectCard: FC<{ result: AssessmentResult; index: number }> = ({ result, index }) => {
  const [open, setOpen] = useState(false);
  const pct = result.maximum_score > 0
    ? Math.round((result.total_score / result.maximum_score) * 100)
    : 0;
  const cn = getCourseName(result.course);
  const gc = gradeColor(result.grade);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 12, overflow: "hidden", marginBottom: 12,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px", cursor: "pointer",
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
              {cn.charAt(0)}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary }}>{cn}</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>
                {result.student_group.replace(/^LB-/, "")} · {result.academic_year} · {result.academic_term}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 8, paddingLeft: 46 }}>
            <ProgressBar value={result.total_score} max={result.maximum_score} color={gc.color} />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginLeft: 16 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.brandDark }}>
              {result.total_score}
              <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 400 }}>/{result.maximum_score}</span>
            </div>
            <div style={{ fontSize: 11, color: C.textMuted }}>{pct}%</div>
          </div>
          <GradeBadge grade={result.grade} large />
          <span style={{
            color: C.textMuted, fontSize: 12,
            transition: "transform .2s",
            transform: open ? "rotate(180deg)" : "none",
            display: "inline-block",
          }}>▼</span>
        </div>
      </div>

      <AnimatePresence>
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
                    <td style={{ padding: "9px 18px", color: C.textPrimary, fontWeight: 500, textTransform: "capitalize" }}>
                      {d.assessment_criteria}
                    </td>
                    <td style={{ padding: "9px 12px", textAlign: "center" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.brandDark }}>
                        {d.score}<span style={{ fontSize: 11, color: C.textMuted, fontWeight: 400 }}>/{d.maximum_score}</span>
                      </div>
                      <ProgressBar value={d.score} max={d.maximum_score} color={gradeColor(d.grade).color} />
                    </td>
                    <td style={{ padding: "9px 12px", textAlign: "center" }}>
                      <GradeBadge grade={d.grade} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Build courseMap ──────────────────────────────────────────────────────────
function buildCourseMap(results: AssessmentResult[]) {
  const map: Record<string, { mid?: AssessmentResult; final?: AssessmentResult }> = {};
  for (const r of results) {
    const cn = getCourseName(r.course);
    if (!map[cn]) map[cn] = {};
    if (isMidTerm(r.academic_term)) {
      if (!map[cn].mid || r.total_score > map[cn].mid!.total_score) map[cn].mid = r;
    } else {
      if (!map[cn].final || r.total_score > map[cn].final!.total_score) map[cn].final = r;
    }
  }
  return map;
}

// ─── Print HTML Builder ───────────────────────────────────────────────────────
function buildPrintHTML(
  reportResults: AssessmentResult[],
  studentName: string,
  termFilter: TermFilter = "both"
): string {
  const courseMap = buildCourseMap(reportResults);

  const midResults   = reportResults.filter(r => isMidTerm(r.academic_term));
  const finalResults = reportResults.filter(r => !isMidTerm(r.academic_term));
  const midTotal     = midResults.reduce((s, r) => s + r.total_score, 0);
  const midMax       = midResults.reduce((s, r) => s + r.maximum_score, 0);
  const finalTotal   = finalResults.reduce((s, r) => s + r.total_score, 0);
  const finalMax     = finalResults.reduce((s, r) => s + r.maximum_score, 0);

  const hasMid   = termFilter !== "final" && midResults.length > 0;
  const hasFinal = termFilter !== "mid"   && finalResults.length > 0;

  const teacherComment = reportResults.find(r => r.teacher_comment)?.teacher_comment || "";
  const year  = reportResults[0]?.academic_year || "";
  const group = reportResults[0]?.student_group || "";

  const subjectRows = Object.entries(courseMap).map(([cn, { mid, final: fin }]) => `
    <tr>
      <td>${cn.toUpperCase()}</td>
      ${hasMid   ? `<td style="text-align:center">${mid ? mid.total_score : "—"}</td>` : ""}
      ${hasFinal ? `<td style="text-align:center">${fin ? fin.total_score : "—"}</td>` : ""}
    </tr>
  `).join("");

  const midPct   = midMax   > 0 ? Math.round((midTotal   / midMax)   * 100) + "%" : "—";
  const finalPct = finalMax > 0 ? Math.round((finalTotal / finalMax) * 100) + "%" : "—";
  const midGrade   = midResults.sort((a, b) => b.total_score - a.total_score)[0]?.grade || "—";
  const finalGrade = finalResults.sort((a, b) => b.total_score - a.total_score)[0]?.grade || "—";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Progress Report – ${studentName} (${termFilterLabel(termFilter)})</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; background: #fff; color: #111; font-size: 13px; }
    .page { max-width: 720px; margin: 20px auto; padding: 24px; border: 1px solid #ccc; position: relative; }
    .header { text-align: center; margin-bottom: 16px; border-bottom: 2px solid #1a2e28; padding-bottom: 12px; }
    .header h1 { font-size: 28px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; font-family: Georgia, serif; }
    .header .logo-sub { color: #1D9E75; font-size: 12px; margin: 2px 0 4px; }
    .header .contact { font-size: 11px; color: #555; line-height: 1.6; }
    .header .title { font-size: 20px; font-style: italic; font-weight: 700; margin-top: 8px; }
    .re { font-size: 11px; position: absolute; top: 24px; right: 24px; color: #888; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; margin: 12px 0; font-size: 12px; }
    .meta-row { display: flex; gap: 6px; border-bottom: 1px solid #aaa; padding: 3px 0; }
    .meta-label { color: #555; min-width: 100px; }
    .meta-value { font-weight: 600; flex: 1; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px; }
    th { background: #1a2e28; color: #fff; padding: 6px 10px; text-align: center; font-weight: 600; font-size: 11px; text-transform: uppercase; }
    th.left { text-align: left; }
    td { padding: 5px 10px; border: 1px solid #ccc; }
    tr:nth-child(even) { background: #f7faf8; }
    .total-row td { font-weight: 700; background: #e8f5e9; }
    .psd-table .val { text-align: center; color: #0F6E56; font-weight: 600; }
    .promoted { border: 1px solid #ccc; padding: 6px 12px; font-size: 12px; font-weight: 600; margin: 10px 0; }
    .sig-row { display: flex; justify-content: space-between; margin-top: 32px; }
    .sig-block { text-align: center; min-width: 180px; }
    .sig-line { border-top: 1px solid #555; margin-bottom: 4px; }
    .sig-label { font-size: 11px; color: #555; text-transform: uppercase; letter-spacing: 0.5px; }
    @media print { .page { border: none; margin: 0; padding: 16px; } }
  </style>
</head>
<body>
<div class="page">
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
  <table>
    <thead>
      <tr>
        <th class="left">Subject</th>
        ${hasMid   ? "<th>Mid Term</th>"   : ""}
        ${hasFinal ? "<th>Final Term</th>" : ""}
      </tr>
    </thead>
    <tbody>
      ${subjectRows}
      <tr class="total-row">
        <td>Obtained Marks</td>
        ${hasMid   ? `<td style="text-align:center">${midMax   > 0 ? `${midTotal} / ${midMax}`     : "— / —"}</td>` : ""}
        ${hasFinal ? `<td style="text-align:center">${finalMax > 0 ? `${finalTotal} / ${finalMax}` : "— / —"}</td>` : ""}
      </tr>
    </tbody>
  </table>
  <table style="margin-top:8px">
    <thead><tr><th class="left">Term</th><th>Percentage</th><th>Grade</th></tr></thead>
    <tbody>
      ${hasMid ? `<tr><td>Mid Term</td><td style="text-align:center">${midPct}</td><td style="text-align:center">${midGrade}</td></tr>` : ""}
      ${hasFinal ? `<tr><td>Final Term</td><td style="text-align:center">${finalPct}</td><td style="text-align:center">${finalGrade}</td></tr>` : ""}
    </tbody>
  </table>
  <table style="margin-top:10px">
    <thead><tr><th colspan="2" class="left">Teacher's Comment</th></tr></thead>
    <tbody><tr><td style="min-height:80px;padding:12px;line-height:1.7">${teacherComment || "&nbsp;"}</td></tr></tbody>
  </table>
  <table class="psd-table" style="margin-top:14px">
    <thead>
      <tr><th colspan="${(hasMid ? 1 : 0) + (hasFinal ? 1 : 0) + 1}" class="left">Personal and Social Development</th></tr>
      <tr>
        <th class="left">Objective</th>
        ${hasMid   ? "<th>Mid Term</th>"   : ""}
        ${hasFinal ? "<th>Final Term</th>" : ""}
      </tr>
    </thead>
    <tbody>
      ${PSD_OBJECTIVES.map(obj => `
        <tr>
          <td>${obj}</td>
          ${hasMid   ? '<td class="val">OFTEN</td>' : ""}
          ${hasFinal ? '<td class="val">OFTEN</td>' : ""}
        </tr>
      `).join("")}
    </tbody>
  </table>
  <div class="promoted">Promoted To Grade: ___________________________</div>
  <div class="sig-row">
    <div class="sig-block"><div style="height:40px"></div><div class="sig-line"></div><div class="sig-label">Class Teacher's Signature</div></div>
    <div class="sig-block"><div style="height:40px"></div><div class="sig-line"></div><div class="sig-label">Principal's Signature</div></div>
  </div>
</div>
</body>
</html>`;
}

// ─── Report Card Preview Modal ────────────────────────────────────────────────
const ReportCardPreview: FC<{
  reportResults: AssessmentResult[];
  studentName: string;
  termFilter: TermFilter;
  onClose: () => void;
  onPrint: () => void;
}> = ({ reportResults, studentName, termFilter, onClose, onPrint }) => {
  const courseMap = buildCourseMap(reportResults);

  const midResults   = reportResults.filter(r => isMidTerm(r.academic_term));
  const finalResults = reportResults.filter(r => !isMidTerm(r.academic_term));
  const midTotal     = midResults.reduce((s, r) => s + r.total_score, 0);
  const midMax       = midResults.reduce((s, r) => s + r.maximum_score, 0);
  const finalTotal   = finalResults.reduce((s, r) => s + r.total_score, 0);
  const finalMax     = finalResults.reduce((s, r) => s + r.maximum_score, 0);

  const hasMid   = termFilter !== "final" && midResults.length > 0;
  const hasFinal = termFilter !== "mid"   && finalResults.length > 0;

  const teacherComment = reportResults.find(r => r.teacher_comment)?.teacher_comment || "";
  const year  = reportResults[0]?.academic_year || "";
  const group = reportResults[0]?.student_group || "";

  const midGrade   = [...midResults].sort((a, b) => b.total_score - a.total_score)[0]?.grade || "—";
  const finalGrade = [...finalResults].sort((a, b) => b.total_score - a.total_score)[0]?.grade || "—";

  const tbl: CSSProperties = { width: "100%", borderCollapse: "collapse", marginBottom: 12, fontSize: 12 };
  const th:  CSSProperties = { background: "#1a2e28", color: "#fff", padding: "6px 10px", textAlign: "center", fontWeight: 600, textTransform: "uppercase", fontSize: 11 };
  const td:  CSSProperties = { padding: "5px 10px", border: "1px solid #ccc" };
  const colSpan = 1 + (hasMid ? 1 : 0) + (hasFinal ? 1 : 0);

  const termBadgeColor = termFilter === "mid" ? "#3B82F6" : termFilter === "final" ? "#8B5CF6" : C.brand;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.6)",
          display: "flex", alignItems: "flex-start", justifyContent: "center",
          padding: "20px 16px", overflowY: "auto",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ type: "spring", damping: 22, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
          style={{
            background: C.white, borderRadius: 16,
            width: "100%", maxWidth: 780,
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
              <span style={{
                background: termBadgeColor, color: "#fff",
                fontSize: 11, fontWeight: 700,
                padding: "2px 10px", borderRadius: 20, letterSpacing: "0.04em",
              }}>
                {termFilterLabel(termFilter)}
              </span>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onPrint} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", background: C.white,
                color: C.brandDark, border: "none", borderRadius: 8,
                fontWeight: 700, fontSize: 12, cursor: "pointer",
              }}>
                <Printer size={13} /> Print / Save PDF
              </button>
              <button onClick={onClose} style={{
                width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(255,255,255,0.2)", border: "none",
                borderRadius: 8, cursor: "pointer", color: C.white,
              }}>
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Report Card Body */}
          <div style={{ padding: "24px 28px", fontFamily: "Arial, Helvetica, sans-serif", color: "#111", fontSize: 13 }}>
            <div style={{ textAlign: "right", fontSize: 11, color: "#888", marginBottom: 4 }}>RE: 71765B7-S</div>
            <div style={{ textAlign: "center", marginBottom: 16, borderBottom: "2px solid #1a2e28", paddingBottom: 12 }}>
              <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase", fontFamily: "Georgia, serif" }}>Learn Academy</div>
              <div style={{ color: C.brand, fontSize: 12, margin: "2px 0 4px" }}>▲ learn</div>
              <div style={{ fontSize: 11, color: "#555", lineHeight: 1.6 }}>0318-1142457 · 0311-1724725<br />info.learnschool@gmail.com</div>
              <div style={{ fontSize: 18, fontStyle: "italic", fontWeight: 700, marginTop: 8 }}><i>Progress Report</i></div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 24px", marginBottom: 16, fontSize: 12 }}>
              {[["Name of student", studentName], ["Roll No.", ""], ["Year", year], ["Grade", group], ["Date", ""]].map(([label, value]) => (
                <div key={label} style={{ display: "flex", gap: 6, borderBottom: "1px solid #aaa", padding: "3px 0" }}>
                  <span style={{ color: "#555", minWidth: 110 }}>{label}:</span>
                  <span style={{ fontWeight: 600 }}>{value || "\u00a0"}</span>
                </div>
              ))}
            </div>

            <table style={tbl}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: "left" }}>Subject</th>
                  {hasMid   && <th style={th}>Mid Term</th>}
                  {hasFinal && <th style={th}>Final Term</th>}
                </tr>
              </thead>
              <tbody>
                {Object.entries(courseMap).map(([cn, { mid, final: fin }], i) => (
                  <tr key={cn} style={{ background: i % 2 === 0 ? "#f7faf8" : "#fff" }}>
                    <td style={td}>{cn.toUpperCase()}</td>
                    {hasMid   && <td style={{ ...td, textAlign: "center" }}>{mid  ? mid.total_score  : "—"}</td>}
                    {hasFinal && <td style={{ ...td, textAlign: "center" }}>{fin  ? fin.total_score  : "—"}</td>}
                  </tr>
                ))}
                <tr style={{ background: "#e8f5e9", fontWeight: 700 }}>
                  <td style={td}>Obtained Marks</td>
                  {hasMid   && <td style={{ ...td, textAlign: "center" }}>{midMax   > 0 ? `${midTotal} / ${midMax}`     : "— / —"}</td>}
                  {hasFinal && <td style={{ ...td, textAlign: "center" }}>{finalMax > 0 ? `${finalTotal} / ${finalMax}` : "— / —"}</td>}
                </tr>
              </tbody>
            </table>

            <table style={{ ...tbl, marginTop: 8 }}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: "left" }}>Term</th>
                  <th style={th}>Percentage</th>
                  <th style={th}>Grade</th>
                </tr>
              </thead>
              <tbody>
                {hasMid && (
                  <tr>
                    <td style={td}>Mid Term</td>
                    <td style={{ ...td, textAlign: "center" }}>{midMax > 0 ? Math.round((midTotal / midMax) * 100) + "%" : "—"}</td>
                    <td style={{ ...td, textAlign: "center", fontWeight: 700 }}>{midGrade}</td>
                  </tr>
                )}
                {hasFinal && (
                  <tr style={{ background: "#f7faf8" }}>
                    <td style={td}>Final Term</td>
                    <td style={{ ...td, textAlign: "center" }}>{finalMax > 0 ? Math.round((finalTotal / finalMax) * 100) + "%" : "—"}</td>
                    <td style={{ ...td, textAlign: "center", fontWeight: 700 }}>{finalGrade}</td>
                  </tr>
                )}
              </tbody>
            </table>

            <table style={{ ...tbl, marginTop: 10 }}>
              <thead><tr><th style={{ ...th, textAlign: "left" }}>Teacher's Comment</th></tr></thead>
              <tbody>
                <tr>
                  <td style={{ ...td, minHeight: 80, padding: 12, lineHeight: 1.7 }}>
                    {teacherComment || <span style={{ color: "#aaa" }}>No comment added.</span>}
                  </td>
                </tr>
              </tbody>
            </table>

            <table style={{ ...tbl, marginTop: 14 }}>
              <thead>
                <tr><th colSpan={colSpan} style={{ ...th, textAlign: "left" }}>Personal and Social Development</th></tr>
                <tr style={{ background: "#1a2e28" }}>
                  <th style={{ ...th, textAlign: "left", fontSize: 11 }}>Objective</th>
                  {hasMid   && <th style={{ ...th, fontSize: 11 }}>Mid Term</th>}
                  {hasFinal && <th style={{ ...th, fontSize: 11 }}>Final Term</th>}
                </tr>
              </thead>
              <tbody>
                {PSD_OBJECTIVES.map((obj, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#f7faf8" : "#fff" }}>
                    <td style={{ ...td, fontSize: 11 }}>{obj}</td>
                    {hasMid   && <td style={{ ...td, textAlign: "center", color: C.brandDark, fontWeight: 600, fontSize: 11 }}>OFTEN</td>}
                    {hasFinal && <td style={{ ...td, textAlign: "center", color: C.brandDark, fontWeight: 600, fontSize: 11 }}>OFTEN</td>}
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ border: "1px solid #ccc", padding: "6px 12px", fontSize: 12, fontWeight: 600, margin: "12px 0" }}>
              Promoted To Grade: ___________________________
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32 }}>
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

// ─── Main Page ────────────────────────────────────────────────────────────────
const ReportCardPage: FC = () => {
  const { role, activeStudentId, studentId: ctxStudentId, user, linkedStudents } = useUser() as any;

  const resolvedStudentId: string | null =
    role === "guardian" ? (activeStudentId || null) : (ctxStudentId || null);

  // Guardian ka active child ka naam linkedStudents se aata hai;
  // Student apna naam user object se leta hai (Layout.tsx isi tareeqay se leta hai).
  const studentName: string =
    role === "guardian"
      ? (linkedStudents?.find?.((s: LinkedStudentLike) => s.student === activeStudentId)?.student_name || "Student")
      : ((user as any)?.student_name || "Student");

  const { results, isLoading, error } = useReportCard(resolvedStudentId);

  const [filters, setFilters]         = useState<FilterState>({ year: "", term: "", group: "" });
  const [previewTerm, setPreviewTerm] = useState<TermFilter | null>(null);

  const filteredCards = results.filter(r =>
    (!filters.year  || r.academic_year === filters.year)  &&
    (!filters.term  || r.academic_term === filters.term)  &&
    (!filters.group || r.student_group === filters.group)
  );

  const hasMidData   = results.some(r => isMidTerm(r.academic_term));
  const hasFinalData = results.some(r => !isMidTerm(r.academic_term));

  const reportResults = previewTerm
    ? buildReportCardResults(results, filters, previewTerm)
    : [];

  const handlePrint = (tf: TermFilter) => {
    const rr = buildReportCardResults(results, filters, tf);
    const html = buildPrintHTML(rr, studentName, tf);
    const win = window.open("", "_blank", "width=820,height=1000");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  if (role === "guardian" && !activeStudentId) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-center px-6">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-2">
          <Users className="w-7 h-7 text-blue-400" />
        </div>
        <p className="text-base font-bold text-gray-700">No Student is Selected</p>
        <p className="text-sm text-gray-400 max-w-xs">Select Your Child From Above Menu So You can View Result.</p>
      </div>
    );
  }

  if (!resolvedStudentId && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-center px-6">
        <div style={{ fontSize: 40 }}>🔒</div>
        <p className="text-base font-bold text-gray-700">Student ID Not Found</p>
        <p className="text-sm text-gray-400">Please login.</p>
      </div>
    );
  }

  if (isLoading) return <div style={{ minHeight: "100vh", background: C.bg }}><Spinner /></div>;

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100 m-4">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  type BtnDef = { tf: TermFilter; label: string; icon: string; show: boolean };
  const btnDefs: BtnDef[] = [
    { tf: "mid",   label: "Mid Term",   icon: "📋", show: hasMidData },
    { tf: "final", label: "Final Term", icon: "📄", show: hasFinalData },
    { tf: "both",  label: "Both Terms", icon: "📊", show: hasMidData && hasFinalData },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Segoe UI', Tahoma, sans-serif", color: C.textPrimary }}>

      {previewTerm && (
        <ReportCardPreview
          reportResults={reportResults}
          studentName={studentName}
          termFilter={previewTerm}
          onClose={() => setPreviewTerm(null)}
          onPrint={() => handlePrint(previewTerm)}
        />
      )}

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(135deg, ${C.brandDark} 0%, ${C.brand} 100%)`,
        padding: "24px 24px 32px",
        marginBottom: -20,
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{
            display: "flex", alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap", gap: 16,
          }}>

            {/* Title */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: "rgba(255,255,255,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22,
              }}>📊</div>
              <div>
                <h2 style={{ margin: 0, color: C.white, fontWeight: 800, fontSize: 20 }}>Report Card</h2>
                <p style={{ margin: 0, color: C.brandMid, fontSize: 13 }}>{studentName}'s Assessment Results</p>
              </div>
            </div>

            {/* ── Term Buttons — 3-column grid (label | View | Print) ─────── */}
            {results.length > 0 && (
              <div style={{
                display: "grid",
                gridTemplateColumns: "auto auto auto",
                gap: "8px 10px",
                alignItems: "center",
              }}>
                {btnDefs.filter(b => b.show).map(({ tf, label, icon }) => (
                  <React.Fragment key={tf}>

                    {/* Col 1 — Label */}
                    <span style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.85)",
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      textAlign: "right",
                      whiteSpace: "nowrap",
                    }}>
                      {icon} {label}
                    </span>

                    {/* Col 2 — View */}
                    <button
                      onClick={() => setPreviewTerm(tf)}
                      style={{
                        display: "flex", alignItems: "center",
                        justifyContent: "center", gap: 5,
                        padding: "7px 16px",
                        background: "rgba(255,255,255,0.15)",
                        color: C.white,
                        border: "1.5px solid rgba(255,255,255,0.45)",
                        borderRadius: 9, fontWeight: 700, fontSize: 12,
                        cursor: "pointer", backdropFilter: "blur(4px)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Eye size={13} /> View
                    </button>

                    {/* Col 3 — Print */}
                    <button
                      onClick={() => handlePrint(tf)}
                      style={{
                        display: "flex", alignItems: "center",
                        justifyContent: "center", gap: 5,
                        padding: "7px 16px",
                        background: C.white, color: C.brandDark,
                        border: "none", borderRadius: 9,
                        fontWeight: 700, fontSize: 12, cursor: "pointer",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Printer size={13} /> Print
                    </button>

                  </React.Fragment>
                ))}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 16px 40px" }}>

        {results.length > 0 && (
          <Filters results={results} filters={filters} onChange={setFilters} />
        )}

        <SummaryBar results={filteredCards.length ? filteredCards : results} />

        {results.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 16px", color: C.textMuted }}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>📂</div>
            <p style={{ fontSize: 15 }}>No Assessment Result Found.</p>
          </div>
        ) : filteredCards.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 16px", color: C.textMuted }}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>🔍</div>
            <p style={{ fontSize: 15 }}>NO Result For This Filter.</p>
          </div>
        ) : (
          filteredCards.map((r, i) => (
            <SubjectCard key={r.name} result={r} index={i} />
          ))
        )}
      </div>
    </div>
  );
};

interface LinkedStudentLike {
  student: string;
  student_name: string;
}

export default ReportCardPage;