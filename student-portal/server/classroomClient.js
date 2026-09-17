import { google } from 'googleapis';

function classroomFor(oauth2Client) {
  return google.classroom({ version: 'v1', auth: oauth2Client });
}

function isRateLimitError(err) {
  const status = err?.code ?? err?.response?.status;
  return status === 429 || status === 403 && /quota|rate/i.test(err?.message || '');
}

/** Retries a Classroom API call with exponential backoff if Google returns a rate-limit error. */
async function withRetry(fn, { retries = 4, baseDelayMs = 600 } = {}) {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (err) {
      if (!isRateLimitError(err) || attempt >= retries) throw err;
      const delay = baseDelayMs * 2 ** attempt + Math.floor(Math.random() * 250);
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempt += 1;
    }
  }
}

/** Courses where the authenticated Google user is enrolled as a student. */
export async function listStudentCourses(oauth2Client) {
  const classroom = classroomFor(oauth2Client);
  const courses = [];
  let pageToken;
  do {
    const { data } = await withRetry(() =>
      classroom.courses.list({
        studentId: 'me',
        courseStates: ['ACTIVE', 'ARCHIVED'],
        pageToken,
        pageSize: 100,
      })
    );
    courses.push(...(data.courses || []));
    pageToken = data.nextPageToken;
  } while (pageToken);
  return courses;
}

export async function listTopics(oauth2Client, courseId) {
  const classroom = classroomFor(oauth2Client);
  try {
    const { data } = await withRetry(() => classroom.courses.topics.list({ courseId, pageSize: 200 }));
    return data.topic || [];
  } catch (err) {
    if (err?.code === 404 || err?.code === 403) return [];
    throw err;
  }
}

export async function listCourseWork(oauth2Client, courseId) {
  const classroom = classroomFor(oauth2Client);
  const work = [];
  let pageToken;
  do {
    const { data } = await withRetry(() =>
      classroom.courses.courseWork.list({
        courseId,
        courseWorkStates: ['PUBLISHED'],
        orderBy: 'dueDate desc',
        pageToken,
        pageSize: 100,
      })
    );
    work.push(...(data.courseWork || []));
    pageToken = data.nextPageToken;
  } while (pageToken);
  return work;
}

/**
 * All of the current user's submissions across every piece of courseWork in a course,
 * fetched in ONE call (courseWorkId: '-' is a Classroom API wildcard for "all coursework
 * in this course"). This avoids firing a separate request per assignment, which is what
 * was blowing through the per-minute quota.
 */
export async function listAllMySubmissionsForCourse(oauth2Client, courseId) {
  const classroom = classroomFor(oauth2Client);
  const submissions = [];
  let pageToken;
  do {
    const { data } = await withRetry(() =>
      classroom.courses.courseWork.studentSubmissions.list({
        courseId,
        courseWorkId: '-',
        userId: 'me',
        pageToken,
        pageSize: 100,
      })
    );
    submissions.push(...(data.studentSubmissions || []));
    pageToken = data.nextPageToken;
  } while (pageToken);
  return submissions;
}

export async function getCourseWorkMaterials(oauth2Client, courseId) {
  const classroom = classroomFor(oauth2Client);
  const materials = [];
  let pageToken;
  do {
    const { data } = await withRetry(() =>
      classroom.courses.courseWorkMaterials.list({ courseId, pageToken, pageSize: 100 })
    );
    materials.push(...(data.courseWorkMaterial || []));
    pageToken = data.nextPageToken;
  } while (pageToken);
  return materials;
}

/** Resolves a Classroom userId (e.g. a course's ownerId) to a display name. */
export async function getUserProfile(oauth2Client, userId) {
  const classroom = classroomFor(oauth2Client);
  try {
    const { data } = await withRetry(() => classroom.userProfiles.get({ userId }));
    return data; // { id, name: { fullName }, emailAddress }
  } catch {
    return null;
  }
}
