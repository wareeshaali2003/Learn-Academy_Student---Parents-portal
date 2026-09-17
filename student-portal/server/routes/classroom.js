import { Router } from 'express';
import { getGoogleLink } from '../tokenStore.js';
import { oauthClientFromLink } from '../googleAuth.js';
import { getDashboardForStudent, getCourseDetail } from '../classroomLive.js';

const router = Router();

function requireLink(req, res) {
  const studentId = String(req.query.studentId || req.body?.studentId || '');
  if (!studentId) {
    res.status(400).json({ error: 'studentId is required' });
    return null;
  }
  const link = getGoogleLink(studentId);
  if (!link) {
    res.status(404).json({ error: 'not_connected', message: 'Student has not connected Google Classroom yet.' });
    return null;
  }
  return { studentId, link };
}

// GET /api/classroom/status?studentId=...
router.get('/status', (req, res) => {
  const studentId = String(req.query.studentId || '');
  if (!studentId) return res.status(400).json({ error: 'studentId is required' });

  const link = getGoogleLink(studentId);
  res.json({
    connected: !!link,
    googleEmail: link?.googleEmail || null,
    googleProfileName: link?.googleProfileName || null,
  });
});

// GET /api/classroom/dashboard?studentId=...
// Hits the Google Classroom API live — courses, coursework and submissions are
// fetched fresh on every call. Nothing is cached or written to disk.
router.get('/dashboard', async (req, res) => {
  const ctx = requireLink(req, res);
  if (!ctx) return;
  try {
    const client = oauthClientFromLink(ctx.studentId, ctx.link);
    const courses = await getDashboardForStudent(client);
    res.json({ courses });
  } catch (err) {
    console.error('[classroom/dashboard] error:', err?.message);
    res.status(502).json({ error: 'classroom_fetch_failed', message: err?.message || 'Failed to reach Google Classroom' });
  }
});

// GET /api/classroom/courses/:classroomCourseId?studentId=...
router.get('/courses/:classroomCourseId', async (req, res) => {
  const ctx = requireLink(req, res);
  if (!ctx) return;
  try {
    const client = oauthClientFromLink(ctx.studentId, ctx.link);
    const detail = await getCourseDetail(client, req.params.classroomCourseId);
    if (!detail) return res.status(404).json({ error: 'course_not_found' });
    res.json(detail);
  } catch (err) {
    console.error('[classroom/courses/:id] error:', err?.message);
    res.status(502).json({ error: 'classroom_fetch_failed', message: err?.message || 'Failed to reach Google Classroom' });
  }
});

export default router;
