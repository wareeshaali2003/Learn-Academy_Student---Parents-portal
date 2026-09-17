// useReportCard.ts
// Learn Academy - Custom Hook for Report Card (TypeScript)

import { useState, useEffect, useCallback } from "react";
import {
  fetchStudents,
  fetchReportCard,
  fetchClassReportCards,
  fetchAcademicYears,
  saveReportCard,
  getReportCardTemplate,
  getSubjectsByTemplate,
  calculateGrade,
  PSD_OBJECTIVES,
  GRADES,
  TERMS,
  type Student,
  type SubjectMark,
  type PSDRow,
  type PSDOption,
  type ReportCardDoc,
  type ClassListCard,
  type TemplateType,
  type TermType,
  type ComputedStats,
} from "../services/erpService";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActiveView = "form" | "list";

export interface FormState {
  name: string | null;
  student: string;
  student_name: string;
  roll_no: string;
  academic_year: string;
  grade: string;
  term: TermType;
  date: string;
  subject_marks: SubjectMark[];
  teacher_comment: string;
  psd: PSDRow[];
  promoted_to_grade: string;
}

export interface UseReportCardReturn {
  // State
  form: FormState;
  students: Student[];
  academicYears: string[];
  classReportCards: ClassListCard[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  success: string | null;
  activeView: ActiveView;
  // Derived
  template: TemplateType;
  subjects: string[];
  totalPossible: number;
  computedStats: () => ComputedStats;
  PSD_OBJECTIVES: string[];
  GRADES: string[];
  TERMS: TermType[];
  // Handlers
  handleChange: <K extends keyof FormState>(field: K, value: FormState[K]) => void;
  handleStudentChange: (studentId: string) => void;
  handleMarkChange: (index: number, termField: "mid_term" | "final_term", value: string) => void;
  handlePSDChange: (index: number, termField: "mid_term" | "final_term", value: PSDOption) => void;
  handleSave: () => Promise<void>;
  handlePrint: () => void;
  resetForm: () => void;
  setActiveView: (view: ActiveView) => void;
  openCardFromList: (card: ClassListCard) => void;
  loadClassList: () => Promise<void>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MARKS_PER_SUBJECT = 100;

const buildEmptySubjectMarks = (subjects: string[]): SubjectMark[] =>
  subjects.map((sub) => ({ subject: sub, mid_term: "", final_term: "" }));

const buildEmptyPSD = (): PSDRow[] =>
  PSD_OBJECTIVES.map((obj) => ({
    objective: obj,
    mid_term: "Often" as PSDOption,
    final_term: "Often" as PSDOption,
  }));

const today = (): string => new Date().toISOString().split("T")[0];

const initialFormState: FormState = {
  name: null,
  student: "",
  student_name: "",
  roll_no: "",
  academic_year: "",
  grade: "",
  term: "Mid Term",
  date: today(),
  subject_marks: [],
  teacher_comment: "",
  psd: buildEmptyPSD(),
  promoted_to_grade: "",
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useReportCard = (): UseReportCardReturn => {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [students, setStudents] = useState<Student[]>([]);
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [classReportCards, setClassReportCards] = useState<ClassListCard[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>("form");

  // Derived
  const template: TemplateType = getReportCardTemplate(form.grade || "");
  const subjects: string[] = getSubjectsByTemplate(template);
  const totalPossible: number = subjects.length * MARKS_PER_SUBJECT;

  // ── Computed Stats ──────────────────────────────────────────────────────────
  const computedStats = useCallback((): ComputedStats => {
    const termField = form.term === "Mid Term" ? "mid_term" : "final_term";
    const obtained = form.subject_marks.reduce((sum, sm) => {
      const v = parseFloat(String(sm[termField]));
      return sum + (isNaN(v) ? 0 : v);
    }, 0);
    const pct = totalPossible > 0 ? (obtained / totalPossible) * 100 : 0;
    return {
      obtained,
      totalPossible,
      percentage: pct.toFixed(1),
      grade: calculateGrade(pct),
    };
  }, [form.subject_marks, form.term, totalPossible]);

  // ── Loaders ─────────────────────────────────────────────────────────────────
  const loadAcademicYears = useCallback(async (): Promise<void> => {
    try {
      const years = await fetchAcademicYears();
      setAcademicYears(years);
      if (years.length > 0) {
        setForm((f) => ({ ...f, academic_year: f.academic_year || years[0] }));
      }
    } catch {
      setError("Academic years load karne mein masla hua.");
    }
  }, []);

  const loadStudents = useCallback(async (grade: string): Promise<void> => {
    if (!grade) return;
    setLoading(true);
    try {
      const list = await fetchStudents({ grade });
      setStudents(list);
    } catch {
      setError("Students load karne mein masla hua.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadExistingCard = useCallback(
    async (studentId: string, year: string, term: TermType, grade: string): Promise<void> => {
      if (!studentId || !year || !term || !grade) return;
      setLoading(true);
      try {
        const card = await fetchReportCard(studentId, year, term, grade);
        if (card) {
          setForm((f) => ({
            ...f,
            name: card.name ?? null,
            student_name: card.student_name || f.student_name,
            roll_no: card.roll_no || "",
            date: card.date || f.date,
            subject_marks: (card.subject_marks?.length ? card.subject_marks : buildEmptySubjectMarks(subjects)),
            teacher_comment: card.teacher_comment || "",
            psd: card.psd?.length ? card.psd : buildEmptyPSD(),
            promoted_to_grade: card.promoted_to_grade || "",
          }));
        } else {
          setForm((f) => ({
            ...f,
            name: null,
            subject_marks: buildEmptySubjectMarks(subjects),
            teacher_comment: "",
            psd: buildEmptyPSD(),
            promoted_to_grade: "",
          }));
        }
      } catch {
        setError("Report card load karne mein masla hua.");
      } finally {
        setLoading(false);
      }
    },
    [subjects]
  );

  const loadClassList = useCallback(async (): Promise<void> => {
    if (!form.grade || !form.academic_year || !form.term) return;
    setLoading(true);
    try {
      const cards = await fetchClassReportCards(form.grade, form.academic_year, form.term);
      setClassReportCards(cards);
    } catch {
      setError("Class list load karne mein masla hua.");
    } finally {
      setLoading(false);
    }
  }, [form.grade, form.academic_year, form.term]);

  // ── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => { loadAcademicYears(); }, [loadAcademicYears]);

  useEffect(() => {
    if (form.grade) loadStudents(form.grade);
  }, [form.grade, loadStudents]);

  useEffect(() => {
    if (form.student && form.academic_year && form.term && form.grade) {
      loadExistingCard(form.student, form.academic_year, form.term, form.grade);
    }
  }, [form.student, form.academic_year, form.term, form.grade, loadExistingCard]);

  useEffect(() => {
    if (activeView === "list") loadClassList();
  }, [activeView, loadClassList]);

  // ── Form Handlers ────────────────────────────────────────────────────────────
  const handleChange = <K extends keyof FormState>(field: K, value: FormState[K]): void => {
    setForm((f) => ({ ...f, [field]: value }));
    setError(null);
    setSuccess(null);
  };

  const handleStudentChange = (studentId: string): void => {
    const student = students.find((s) => s.name === studentId);
    setForm((f) => ({
      ...f,
      student: studentId,
      student_name: student?.student_name || "",
    }));
  };

  const handleMarkChange = (
    index: number,
    termField: "mid_term" | "final_term",
    value: string
  ): void => {
    if (value !== "") {
      const num = parseFloat(value);
      if (isNaN(num) || num < 0 || num > MARKS_PER_SUBJECT) return;
    }
    setForm((f) => {
      const updated = [...f.subject_marks];
      updated[index] = { ...updated[index], [termField]: value };
      return { ...f, subject_marks: updated };
    });
  };

  const handlePSDChange = (
    index: number,
    termField: "mid_term" | "final_term",
    value: PSDOption
  ): void => {
    setForm((f) => {
      const updated = [...f.psd];
      updated[index] = { ...updated[index], [termField]: value };
      return { ...f, psd: updated };
    });
  };

  const resetForm = (): void => {
    setForm((f) => ({
      ...initialFormState,
      grade: f.grade,
      academic_year: f.academic_year,
      term: f.term,
      subject_marks: buildEmptySubjectMarks(subjects),
      psd: buildEmptyPSD(),
      date: today(),
    }));
    setError(null);
    setSuccess(null);
  };

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = async (): Promise<void> => {
    if (!form.student || !form.grade || !form.academic_year) {
      setError("Student, Grade aur Academic Year zaroor fill karein.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const stats = computedStats();
      const payload: ReportCardDoc = {
        name: form.name ?? undefined,
        doctype: "Student Report Card",
        student: form.student,
        student_name: form.student_name,
        roll_no: form.roll_no,
        academic_year: form.academic_year,
        grade: form.grade,
        term: form.term,
        date: form.date,
        report_template: template,
        subject_marks: form.subject_marks,
        obtained_marks: stats.obtained,
        total_marks: stats.totalPossible,
        percentage: stats.percentage,
        overall_grade: stats.grade,
        teacher_comment: form.teacher_comment,
        psd: form.psd,
        promoted_to_grade: form.promoted_to_grade,
      };
      const result = await saveReportCard(payload);
      setForm((f) => ({ ...f, name: result.data?.name ?? f.name }));
      setSuccess("Report card successfully save ho gai!");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Save karne mein masla hua.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = (): void => window.print();

  const openCardFromList = (card: ClassListCard): void => {
    setForm((f) => ({
      ...f,
      student: card.student,
      student_name: card.student_name,
      grade: card.grade,
      academic_year: card.academic_year,
      term: card.term,
    }));
    setActiveView("form");
  };

  return {
    form,
    students,
    academicYears,
    classReportCards,
    loading,
    saving,
    error,
    success,
    activeView,
    template,
    subjects,
    totalPossible,
    computedStats,
    PSD_OBJECTIVES,
    GRADES,
    TERMS,
    handleChange,
    handleStudentChange,
    handleMarkChange,
    handlePSDChange,
    handleSave,
    handlePrint,
    resetForm,
    setActiveView,
    openCardFromList,
    loadClassList,
  };
};