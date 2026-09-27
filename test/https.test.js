'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const https = require('node:https');
const tls = require('node:tls');
const fs = require('node:fs');
const path = require('node:path');
const { openDatabase } = require('../database');
const { createServer, createRedirectServer } = require('../server');
const { hashPassword } = require('../auth');
const certPath = path.join(__dirname, '..', 'certs', 'blog-cert.pem');
test('HTTPS valida certificado, TLS 1.2/1.3, cookie Secure e bloqueia TLS antigo', async () => {
  assert.ok(fs.existsSync(certPath), 'Execute npm run tls:generate antes dos testes HTTPS.');
  const cert = fs.readFileSync(certPath);
  const key = fs.readFileSync(path.join(__dirname, '..', 'certs', 'blog-key.pem'));
  const db = openDatabase(':memory:');
  db.prepare('INSERT INTO usuarios (nome, login, senha_hash, perfil_id) VALUES (?, ?, ?, ?)').run('Teste', 'tls', await hashPassword('SenhaTesteHttps-2026'), 'biologia');
  const server = createServer(db, { cert, key });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  function request(route, options = {}, body) {
    return new Promise((resolve, reject) => {
      const req = https.request({ hostname: '127.0.0.1', port, servername: 'blog-grupo.com', ca: cert, path: route,
        ...options, headers: { Host: `blog-grupo.com:${port}`, ...options.headers } }, res => {
        let data = ''; res.on('data', chunk => { data += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, data }));
      });
      req.on('error', reject); req.end(body);
    });
  }
  try {
    for (const version of ['TLSv1.2', 'TLSv1.3']) assert.equal((await request('/', { minVersion: version, maxVersion: version })).status, 200);
    await assert.rejects(request('/', { servername: 'nome-incorreto.test' }), /Hostname\/IP does not match/);
    assert.equal((await request('/api/posts')).status, 401);
    const response = await request('/api/login', { method: 'POST', headers: { Origin: `https://blog-grupo.com:${port}`, 'Content-Type': 'application/json' } }, JSON.stringify({ username: 'tls', password: 'SenhaTesteHttps-2026' }));
    assert.equal(response.status, 200);
    assert.match(response.headers['set-cookie'][0], /; Secure/);
    const cookie = response.headers['set-cookie'][0].split(';')[0];
    assert.equal((await request('/api/posts', { headers: { Cookie: cookie } })).status, 200);
    assert.equal((await request('/api/posts?area=matematica', { headers: { Cookie: cookie } })).status, 403);
    for (const version of ['TLSv1', 'TLSv1.1']) {
      await assert.rejects(new Promise((resolve, reject) => {
        const socket = tls.connect({ host: '127.0.0.1', port, servername: 'blog-grupo.com', ca: cert, minVersion: version, maxVersion: version, ciphers: 'DEFAULT:@SECLEVEL=0' });
        socket.once('secureConnect', () => { socket.end(); resolve(); });
        socket.once('error', reject);
      }));
    }
    assert.equal((await request('/certs/blog-key.pem')).status, 404);
  } finally { await new Promise(resolve => server.close(resolve)); db.close(); }
});
test('HTTP somente redireciona leitura e recusa envio de credenciais', async () => {
  const server = createRedirectServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await fetch(base, { redirect: 'manual' });
    assert.equal(response.status, 308);
    assert.equal(response.headers.get('location'), 'https://blog-grupo.com:3000/');
    assert.equal((await fetch(base + '/api/login', { method: 'POST', body: '{}' })).status, 400);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
