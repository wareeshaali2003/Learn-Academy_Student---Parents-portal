// ─── Google Classroom integration types ────────────────────────────────────
// Mirrors the shapes returned by server/classroomLive.js (live Google Classroom API calls)

export interface ClassroomStatus {
  connected: boolean;
  googleEmail: string | null;
  googleProfileName: string | null;
}

export type AssignmentStatus =
  | 'Not Submitted'
  | 'Submitted'
  | 'Late'
  | 'Returned'
  | 'Missing';

export interface ClassroomAssignment {
  id: string;
  title: string;
  description?: string;
  workType: string;
  isQuiz: boolean;
  dueDate: string | null;
  dueTime: string | null;
  maxPoints: number | null;
  topicId: string | null;
  classroomUrl: string | null;
  status: AssignmentStatus;
  assignedGrade: number | null;
  submittedAt: string | null;
  late: boolean;
}

export interface ClassroomDashboardCourse {
  classroomCourseId: string;
  portalCourseId: string | null;
  name: string;
  section: string | null;
  classroomUrl: string | null;
  teacher: string | null;
  assignmentsCount: number;
  upcomingCount: number;
  marksPct: number | null;
  lastSyncedAt: string | null;
}

export interface ClassroomLessonPlanTopic {
  topicId: string | null;
  name: string;
  items: ClassroomAssignment[];
}

export interface ClassroomCourseDetail {
  classroomCourseId: string;
  portalCourseId: string | null;
  name: string;
  section: string | null;
  room: string | null;
  classroomUrl: string | null;
  teacher: string | null;
  lessonPlan: ClassroomLessonPlanTopic[];
  upcomingWork: ClassroomAssignment[];
  assignments: ClassroomAssignment[];
}
