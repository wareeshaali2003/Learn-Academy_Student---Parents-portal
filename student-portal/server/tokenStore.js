// No database of any kind here — just a plain JS Map living in server process memory.
// This means: no Classroom data is ever cached or written to disk. Every dashboard
// or course-detail request hits the live Google Classroom API directly.
//
// Trade-off: the OAuth tokens themselves have to live *somewhere* between "the student
// clicked Connect" and "the student loads their dashboard a minute later" — an in-memory
// Map is the simplest thing that isn't a database. It resets whenever the server
// process restarts, at which point the student just clicks "Connect Google Classroom"
// again. For a production deployment behind multiple server instances, this would need
// to move to a shared session store (e.g. Redis) — but that's still not a data DB, just
// session state.

const linksByStudentId = new Map();

export function saveGoogleLink(studentId, profile, tokens) {
  const existing = linksByStudentId.get(studentId) || {};
  linksByStudentId.set(studentId, {
    googleUserId: profile.id ?? existing.googleUserId ?? null,
    googleEmail: profile.email ?? existing.googleEmail ?? null,
    googleProfileName: profile.name ?? existing.googleProfileName ?? null,
    accessToken: tokens.access_token ?? existing.accessToken ?? null,
    // Google only sends a refresh_token the FIRST time a user consents (with
    // access_type=offline & prompt=consent) — keep the old one on later refreshes.
    refreshToken: tokens.refresh_token ?? existing.refreshToken ?? null,
    expiryDate: tokens.expiry_date ?? existing.expiryDate ?? null,
  });
}

/** Called automatically whenever google-auth-library silently refreshes the access token. */
export function updateTokens(studentId, tokens) {
  const existing = linksByStudentId.get(studentId);
  if (!existing) return;
  linksByStudentId.set(studentId, {
    ...existing,
    accessToken: tokens.access_token ?? existing.accessToken,
    refreshToken: tokens.refresh_token ?? existing.refreshToken,
    expiryDate: tokens.expiry_date ?? existing.expiryDate,
  });
}

export function getGoogleLink(studentId) {
  return linksByStudentId.get(studentId) || null;
}

export function disconnectGoogleLink(studentId) {
  linksByStudentId.delete(studentId);
}
