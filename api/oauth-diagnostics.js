'use strict';

const PRODUCTION_HOST = 'chamah-portal.vercel.app';
const ALLOWED = new Set([
  'authorize_request_received', 'authorization_id_presence', 'redirect_uri', 'state_presence',
  'login_resume', 'consent_approval', 'final_redirect', 'oauth_error'
]);

module.exports = async function handler(req, res) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase();
  res.setHeader('Cache-Control', 'no-store');
  if (host === PRODUCTION_HOST || !host.endsWith('.vercel.app')) return res.status(404).json({ error: 'not_found' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body); } catch { return null; } })() : req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.step !== 'string' || !ALLOWED.has(body.step)) return res.status(400).json({ error: 'invalid_diagnostic' });
  const safe = { step: body.step, timestamp: new Date().toISOString() };
  for (const key of ['present', 'length', 'status', 'host', 'path', 'queryNames', 'pending']) {
    if (body[key] !== undefined && (typeof body[key] === 'string' || typeof body[key] === 'number' || typeof body[key] === 'boolean' || Array.isArray(body[key]))) safe[key] = body[key];
  }
  console.log('[oauth-diagnostic]', JSON.stringify(safe));
  return res.status(204).end();
};
