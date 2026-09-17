import {
  listStudentCourses,
  listTopics,
  listCourseWork,
  listAllMySubmissionsForCourse,
  getUserProfile,
} from './classroomClient.js';

function dueDateToString(dueDate) {
  if (!dueDate?.year) return null;
  const { year, month, day } = dueDate;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function dueTimeToString(dueTime) {
  if (!dueTime) return null;
  const { hours = 23, minutes = 59 } = dueTime;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function statusLabel(cw, sub) {
  if (!sub) return cw.dueDateStr && new Date(cw.dueDateStr) < new Date() ? 'Missing' : 'Not Submitted';
  if (sub.state === 'RETURNED') return 'Returned';
  if (sub.state === 'TURNED_IN') return sub.late ? 'Late' : 'Submitted';
  return 'Not Submitted';
}

function toAssignmentView(cw, sub) {
  return {
    id: cw.id,
    title: cw.title || '',
    description: cw.description || '',
    workType: cw.workType || 'ASSIGNMENT',
    isQuiz: !!cw.workType && cw.workType.includes('QUESTION'),
    dueDate: dueDateToString(cw.dueDate),
    dueTime: dueTimeToString(cw.dueTime),
    maxPoints: cw.maxPoints ?? null,
    topicId: cw.topicId || null,
    classroomUrl: cw.alternateLink || null,
    status: statusLabel({ dueDateStr: dueDateToString(cw.dueDate) }, sub),
    assignedGrade: sub?.assignedGrade ?? null,
    submittedAt: sub?.updateTime ?? null,
    late: !!sub?.late,
  };
}

/**
 * Fetches one course's courseWork + this student's submissions, live.
 * Uses ONE wildcard call (courseWorkId: '-') to get every submission for this
 * student in the course, instead of one call per assignment — that per-assignment
 * pattern is what was exhausting Google's per-minute quota.
 */
async function fetchCourseWorkWithSubmissions(oauth2Client, courseId) {
  const [courseWork, submissions] = await Promise.all([
    listCourseWork(oauth2Client, courseId),
    listAllMySubmissionsForCourse(oauth2Client, courseId),
  ]);

  const submissionByCourseWorkId = new Map(submissions.map((s) => [s.courseWorkId, s]));

  return courseWork.map((cw) => toAssignmentView(cw, submissionByCourseWorkId.get(cw.id)));
}

/**
 * Runs async work over a list with limited concurrency, so we don't fire a burst of
 * requests across many courses at once and trip the per-minute rate limit.
 */
async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i], i);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** "My Learning" dashboard rows — one row per live Classroom course. */
export async function getDashboardForStudent(oauth2Client) {
  const courses = await listStudentCourses(oauth2Client);

  return mapWithConcurrency(courses, 3, async (course) => {
    const assignments = await fetchCourseWorkWithSubmissions(oauth2Client, course.id);
    const teacherProfile = course.ownerId ? await getUserProfile(oauth2Client, course.ownerId) : null;

    const now = new Date();
    const upcoming = assignments.filter(
      (a) => a.dueDate && new Date(a.dueDate) >= now && a.status !== 'Submitted' && a.status !== 'Returned'
    );

    const graded = assignments.filter((a) => a.assignedGrade != null && a.maxPoints);
    const obtained = graded.reduce((s, a) => s + a.assignedGrade, 0);
    const possible = graded.reduce((s, a) => s + a.maxPoints, 0);
    const marksPct = possible > 0 ? Math.round((obtained / possible) * 100) : null;

    return {
      classroomCourseId: course.id,
      portalCourseId: null, // no local mapping table anymore — nothing to link to
      name: course.name,
      section: course.section || null,
      classroomUrl: course.alternateLink || null,
      teacher: teacherProfile?.name?.fullName || null,
      assignmentsCount: assignments.length,
      upcomingCount: upcoming.length,
      marksPct,
      lastSyncedAt: new Date().toISOString(), // "as of right now" — nothing is cached
    };
  });
}

/** Course detail: topics (lesson plan), upcoming work, full coursework list — all live. */
export async function getCourseDetail(oauth2Client, classroomCourseId) {
  const [courses, topics, assignments] = await Promise.all([
    listStudentCourses(oauth2Client),
    listTopics(oauth2Client, classroomCourseId),
    fetchCourseWorkWithSubmissions(oauth2Client, classroomCourseId),
  ]);

  const course = courses.find((c) => c.id === classroomCourseId);
  if (!course) return null;

  const teacherProfile = course.ownerId ? await getUserProfile(oauth2Client, course.ownerId) : null;

  const lessonPlan = topics.map((t) => ({
    topicId: t.topicId,
    name: t.name,
    items: assignments.filter((a) => a.topicId === t.topicId),
  }));
  const untopicked = assignments.filter((a) => !a.topicId);
  if (untopicked.length) lessonPlan.push({ topicId: null, name: 'Other', items: untopicked });

  const now = new Date();
  const upcomingWork = assignments
    .filter((a) => a.dueDate && new Date(a.dueDate) >= now)
    .sort((a, b) => (a.dueDate > b.dueDate ? 1 : -1));

  return {
    classroomCourseId: course.id,
    portalCourseId: null,
    name: course.name,
    section: course.section || null,
    room: course.room || null,
    classroomUrl: course.alternateLink || null,
    teacher: teacherProfile?.name?.fullName || null,
    lessonPlan,
    upcomingWork,
    assignments,
  };
}
