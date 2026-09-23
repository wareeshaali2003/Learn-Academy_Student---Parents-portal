import { Router } from 'express';
import {
  buildAuthUrl,
  decodeState,
  exchangeCodeForTokens,
  fetchGoogleProfile,
} from '../googleAuth.js';
import { saveGoogleLink, disconnectGoogleLink } from '../tokenStore.js';

const router = Router();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// GET /auth/google?studentId=STU-2026-00125
// Redirects the browser straight to Google's consent screen.
router.get('/google', (req, res) => {
  const { studentId } = req.query;
  if (!studentId) return res.status(400).json({ error: 'studentId is required' });

  try {
    const url = buildAuthUrl(String(studentId));
    res.redirect(url);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /auth/google/callback?code=...&state=...
router.get('/google/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`${FRONTEND_URL}/classroom?connected=0&reason=${encodeURIComponent(String(error))}`);
  }

  const decoded = decodeState(String(state || ''));
  if (!decoded?.studentId || !code) {
    return res.redirect(`${FRONTEND_URL}/classroom?connected=0&reason=invalid_state`);
  }

  try {
    const { oauth2Client, tokens } = await exchangeCodeForTokens(String(code));
    const profile = await fetchGoogleProfile(oauth2Client);
    saveGoogleLink(decoded.studentId, profile, tokens);
    res.redirect(`${FRONTEND_URL}/classroom?connected=1`);
  } catch (err) {
    console.error('[auth/google/callback] error:', err?.message);
    res.redirect(`${FRONTEND_URL}/classroom?connected=0&reason=token_exchange_failed`);
  }
});

// POST /auth/google/disconnect  { studentId }
router.post('/google/disconnect', (req, res) => {
  const { studentId } = req.body || {};
  if (!studentId) return res.status(400).json({ error: 'studentId is required' });
  disconnectGoogleLink(studentId);
  res.json({ ok: true });
});

export default router;
