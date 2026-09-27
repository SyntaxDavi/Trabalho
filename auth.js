'use strict';
const { randomBytes, scrypt, timingSafeEqual, createHash } = require('node:crypto');
const { promisify } = require('node:util');
const derive = promisify(scrypt);
const options = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
const SESSION_MS = 30 * 60 * 1000;
const dummy = `scrypt$131072$8$1$${'00'.repeat(16)}$${'00'.repeat(64)}`;
async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 15 || password.length > 128) throw new Error('A senha deve ter entre 15 e 128 caracteres.');
  const salt = randomBytes(16).toString('hex');
  const hash = await derive(password, salt, 64, options);
  return `scrypt$131072$8$1$${salt}$${hash.toString('hex')}`;
}
async function verifyPassword(password, stored = dummy) {
  const valid = typeof stored === 'string' && /^scrypt\$131072\$8\$1\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(stored);
  const parts = (valid ? stored : dummy).split('$');
  const result = await derive(password, parts[4], 64, options);
  return timingSafeEqual(result, Buffer.from(parts[5], 'hex')) && valid;
}
const digest = token => createHash('sha256').update(token).digest('hex');
function sessionToken(req) {
  const value = (req.headers.cookie || '').split(';').map(item => item.trim()).find(item => item.startsWith('blog_session='))?.slice(13);
  return value && /^[a-f0-9]{64}$/.test(value) ? value : null;
}
function sessionUser(db, req) {
  db.prepare('DELETE FROM sessoes WHERE expira_em <= ?').run(Date.now());
  const token = sessionToken(req);
  return token ? db.prepare(`SELECT u.id, u.nome, u.login, u.perfil_id AS perfil FROM sessoes s
    JOIN usuarios u ON u.id = s.usuario_id WHERE s.token_hash = ? AND s.expira_em > ?`).get(digest(token), Date.now()) : undefined;
}
function revoke(db, req) {
  const token = sessionToken(req);
  if (token) db.prepare('DELETE FROM sessoes WHERE token_hash = ?').run(digest(token));
}
function cookie(req, token, seconds) {
  return `blog_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${seconds}${req.socket.encrypted ? '; Secure' : ''}`;
}
function createSession(db, req, res, userId) {
  const token = randomBytes(32).toString('hex');
  db.transaction(() => {
    revoke(db, req);
    db.prepare('INSERT INTO sessoes (token_hash, usuario_id, expira_em) VALUES (?, ?, ?)').run(digest(token), userId, Date.now() + SESSION_MS);
  })();
  res.setHeader('Set-Cookie', cookie(req, token, SESSION_MS / 1000));
}
module.exports = { hashPassword, verifyPassword, sessionUser, revoke, cookie, createSession };
