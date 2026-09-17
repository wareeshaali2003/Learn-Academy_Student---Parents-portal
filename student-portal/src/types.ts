// ─── Portal User (Union) ──────────────────────────────────────────────────────
export type PortalUser = Student | Guardian;

// ─── User Context ─────────────────────────────────────────────────────────────
export interface UserContextType {
  user: PortalUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  erpnextUrl: string;
  studentId: string | null;
  role: 'student' | 'guardian' | null;
  activeStudentId: string | null;
}
export interface AssignmentDetail {
  name: string;
  owner: string;
  creation: string;
  modified: string;
  modified_by: string;
  docstatus: number;
  idx: number;
  course: string;
  link_gdbv: string;
  heading: string;
  description: string;
  doctype: string;
}
// ─── Student ──────────────────────────────────────────────────────────────────
export interface Student {
  name: string;
  student_name: string;
  role?: 'student' | 'guardian';

  // Contact
  email?: string;
  studentId?: string;
  student_email_id?: string;
  student_mobile_number?: string;

  // Personal
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  city?: string;
  country?: string;
  file?: string;
  image?: string;

  // Academic
  joining_date?: string;
  custom_student_id_number?: string;
  custom_serial_no?: string;
  custom_batch?: string;
  custom_previous_school_record?: string;

  // Status
  enabled?: number;

  // Relations
  guardians?: GuardianEntry[];
  siblings?: any[];
  guardian_email?: string;
}
export interface QuizQuestion {
  name: string;
  question_link: string;
  question: string; // HTML content
  idx: number;
}
export interface Quiz {
  name: string;
  title: string;
  passing_score: number;
  max_attempts: number;
  grading_basis: 'Latest Attempt' | 'Highest Score' | string;
  is_time_bound: 0 | 1;
  duration: number;
  question: QuizQuestion[];
  creation: string;
  modified: string; // original field, ab optional/base rakhein
}

export interface QuizSubmission {
  name: string;
  quiz: string;
  student: string;
  score: number;
  status: 'Completed' | 'In Progress' | 'Not Started';
  attempt: number;
  submitted_on?: string;
}

// FIX: Omit both 'status' AND 'score' before overriding them
export interface QuizWithAttempt extends Omit<Quiz, 'status' | 'score'> {
  status: 'Completed' | 'Not Started';
  score: number | null;
  date: string;
}
// ─── Guardian ─────────────────────────────────────────────────────────────────
export interface Guardian {
  name: string;
  guardian_name: string;
  role?: 'student' | 'guardian';

  // Contact
  email_address?: string;
  mobile_number?: string;
  user?: string;

  // Linked children
  students?: { student: string; student_name: string }[];

  // ── ProfilePage compatibility fields ──────────────────────────────────────
  
  student_name?: string;
  student_email_id?: string;
  student_mobile_number?: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  city?: string;
  country?: string;
  image?: string;
  joining_date?: string;
  custom_student_id_number?: string;
  custom_serial_no?: string;
  custom_batch?: string;
  custom_previous_school_record?: string;
  enabled?: number;
}

// ─── Guardian Entry (inside Student.guardians) ────────────────────────────────
export interface GuardianEntry {
  guardian: string;
  guardian_name: string;
  relation?: string;
}

// ─── Attendance ───────────────────────────────────────────────────────────────
export interface Attendance {
  name: string;
  student: string;
  student_name: string;
  attendance_date: string;
  status: 'Present' | 'Absent' | 'On Leave' | 'Half Day';
  course_schedule: string;
  student_group?: string;
  date: string;
}

// ─── Fee ──────────────────────────────────────────────────────────────────────
export interface Fee {
  name: string;
  grand_total: number;
  total_paid: number;
  outstanding_amount: number;
  status: 'Paid' | 'Unpaid' | 'Overdue' | 'Partially Paid';
}

// ─── Course Schedule ──────────────────────────────────────────────────────────
export interface CourseScheduleEntry {
  name: string;
  course: string;
  course_name: string;
  instructor: string;
  instructor_name: string;
  room: string;
  schedule_date: string;
  from_time: string;
  to_time: string;
  student_group: string;
  color?: string;
  class_schedule_color?: string;
  title?: string;
  program?: string;
  studentId?: string;
  startDate?: string;
  endDate?: string;
}

// ─── Program Enrollment ───────────────────────────────────────────────────────
export interface ProgramEnrollment {
  name: string;
  program: string;
  student: string;
  student_name: string;
  enrollment_date: string;
  academic_year: string;
  academic_term: string;
  student_batch_name: string;
  docstatus: number;
}

// ─── Course Enrollment ────────────────────────────────────────────────────────
export interface CourseEnrollment {
  name: string;
  course: string;
  course_name?: string;
  program: string;
  student: string;
  student_name: string;
  enrollment_date: string;
  program_enrollment: string;
}

// ─── Assignment ───────────────────────────────────────────────────────────────
export interface Assignment {
  name: string;
  student: string;
  student_name: string;
  assignment_name: string;
  due_date: string;
  status: 'Pending' | 'Submitted' | 'Evaluated';
  marks_obtained?: number;
  total_marks?: number;
}

// ─── Result ───────────────────────────────────────────────────────────────────
export interface Result {
  name: string;
  assessment_plan: string;
  student: string;
  student_name?: string;
  grade?: string;
  total_score: number;
  total_weightage: number;
  maximum_score?: number;
  assessment_name?: string;
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────
export interface Quiz {
  name: string;
  quiz_name: string;
  course_name: string;
  total_marks: number;
  date: string;
  status: 'Pending' | 'Completed';
  score?: number;
}