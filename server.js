'use strict';
const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const { openDatabase, listPosts } = require('./database');
const auth = require('./auth');
const files = new Map(Object.entries({ '/': ['index.html', 'text/html'], '/index.html': ['index.html', 'text/html'], '/styles.css': ['styles.css', 'text/css'], '/app.js': ['app.js', 'text/javascript'] }));
function json(res, status, data) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); }
async function readJson(req) {
  if (req.headers['content-type']?.split(';')[0].trim() !== 'application/json') throw Object.assign(new Error(), { status: 415 });
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 4096) throw Object.assign(new Error(), { status: 413 });
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks).toString('utf8');
  try { return JSON.parse(body); } catch { throw Object.assign(new Error(), { status: 400 }); }
}
function createServer(db, tlsOptions) {
  const attempts = new Map();
  let activeLogins = 0;
  const transport = tlsOptions ? https : http;
  return transport.createServer(tlsOptions ? { ...tlsOptions, minVersion: 'TLSv1.2' } : {}, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try {
      const port = req.socket.localPort;
      const names = ['127.0.0.1', 'localhost', 'blog-grupo.com'];
      const allowed = names.flatMap(name => port === (req.socket.encrypted ? 443 : 80) ? [name, `${name}:${port}`] : [`${name}:${port}`]);
      if (!allowed.includes(req.headers.host)) return json(res, 400, { error: 'Endereço inválido.' });
      const url = new URL(req.url, `http://${req.headers.host}`);
      if (!url.pathname.startsWith('/api/')) {
        const file = files.get(url.pathname);
        if (!file || !['GET', 'HEAD'].includes(req.method)) return json(res, 404, { error: 'Não encontrado.' });
        const data = await fs.promises.readFile(path.join(__dirname, 'dist', file[0]));
        res.writeHead(200, { 'Content-Type': `${file[1]}; charset=utf-8` });
        return res.end(req.method === 'HEAD' ? undefined : data);
      }
      const method = ['/api/login', '/api/logout'].includes(url.pathname) ? 'POST' : 'GET';
      const known = ['/api/login', '/api/logout', '/api/session', '/api/posts'].includes(url.pathname) || /^\/api\/posts\/[a-z0-9-]+$/.test(url.pathname);
      if (!known) return json(res, 404, { error: 'Não encontrado.' });
      if (req.method !== method) { res.setHeader('Allow', method); return json(res, 405, { error: 'Método não permitido.' }); }
      if (method === 'POST' && req.headers.origin !== `${req.socket.encrypted ? 'https' : 'http'}://${req.headers.host}`) return json(res, 403, { error: 'Origem não permitida.' });
      if (url.pathname === '/api/login') {
        const now = Date.now();
        for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
        const key = req.socket.remoteAddress;
        const attempt = attempts.get(key) || { count: 0, until: now + 15 * 60 * 1000 };
        if (attempt.count >= 10 || activeLogins >= 2) {
          res.setHeader('Retry-After', String(Math.max(1, Math.ceil((attempt.until - now) / 1000))));
          return json(res, 429, { error: 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.' });
        }
        attempt.count++; attempts.set(key, attempt);
        const body = await readJson(req);
        if (!body || typeof body.username !== 'string' || typeof body.password !== 'string' || !body.username.trim() || body.username.length > 100 || body.password.length > 128 || !body.password.length) return json(res, 400, { error: 'Informe usuário e senha válidos.' });
        if (activeLogins >= 2) { res.setHeader('Retry-After', '2'); return json(res, 429, { error: 'Aguarde alguns segundos e tente novamente.' }); }
        const user = db.prepare('SELECT * FROM usuarios WHERE login = ?').get(body.username.trim());
        activeLogins++;
        let valid;
        try { valid = await auth.verifyPassword(body.password, user?.senha_hash); } finally { activeLogins--; }
        if (!valid || !user) return json(res, 401, { error: 'Usuário ou senha inválidos.' });
        auth.createSession(db, req, res, user.id);
        return json(res, 200, { user: { id: user.id, nome: user.nome, login: user.login, perfil: user.perfil_id } });
      }
      if (url.pathname === '/api/logout') {
        auth.revoke(db, req);
        res.setHeader('Set-Cookie', auth.cookie(req, '', 0));
        return json(res, 200, { ok: true });
      }
      const user = auth.sessionUser(db, req);
      if (!user) return json(res, 401, { error: 'Faça login para continuar.' });
      if (url.pathname === '/api/session') return json(res, 200, { user });
      if (url.pathname === '/api/posts') {
        const area = url.searchParams.get('area');
        if (area !== null && !['biologia', 'matematica'].includes(area)) return json(res, 400, { error: 'Área inválida.' });
        if (area !== null && area !== user.perfil) return json(res, 403, { error: 'Seu perfil não tem acesso a esta área.' });
        return json(res, 200, { posts: listPosts(db, user.perfil) });
      }
      const id = url.pathname.split('/').pop();
      const record = db.prepare('SELECT perfil_id FROM posts WHERE id = ?').get(id);
      if (!record) return json(res, 404, { error: 'Artigo não encontrado.' });
      if (record.perfil_id !== user.perfil) return json(res, 403, { error: 'Seu perfil não tem acesso a este artigo.' });
      return json(res, 200, { post: listPosts(db, user.perfil).find(post => post.id === id) });
    } catch (error) {
      if (!res.headersSent) json(res, error.status || 500, { error: error.status ? 'Requisição inválida.' : 'Não foi possível concluir a solicitação.' });
      else res.end();
    }
  });
}
function createRedirectServer() {
  return http.createServer((req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    // Nunca processar ou encaminhar credenciais enviadas por HTTP.
    if (!['GET', 'HEAD'].includes(req.method)) return json(res, 400, { error: 'Use HTTPS para enviar dados.' });
    res.writeHead(308, { Location: 'https://blog-grupo.com:3000/' });
    res.end();
  });
}
module.exports = { createServer, createRedirectServer };
if (require.main === module) {
  try {
    const tlsOptions = {
      key: fs.readFileSync(path.join(__dirname, 'certs', 'blog-key.pem')),
      cert: fs.readFileSync(path.join(__dirname, 'certs', 'blog-cert.pem'))
    };
    const db = openDatabase();
    const servers = [createServer(db, tlsOptions), createRedirectServer()];
    const ports = [3000, 8080];
    let stopped = false;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      for (const server of servers) { server.close(); server.closeAllConnections(); }
      db.close();
    };
    for (const [index, server] of servers.entries()) {
      server.on('error', error => { console.error(`Falha na porta ${ports[index]}: ${error.code}. Pare o servidor anterior e tente novamente.`); stop(); process.exitCode = 1; });
      server.listen(ports[index], '127.0.0.1', () => console.log(index === 0 ? 'Blog Saber Seguro: https://blog-grupo.com:3000' : `HTTP ${ports[index]}: redirecionamento para HTTPS`));
    }
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { stop(); process.exit(0); });
  } catch { console.error('Não foi possível iniciar HTTPS. Execute npm run tls:generate e confira os arquivos do certificado.'); process.exitCode = 1; }
}
