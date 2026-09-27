'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { openDatabase } = require('../database');
const { createServer } = require('../server');
const { hashPassword, verifyPassword, cookie } = require('../auth');
const password = 'Senha-apenas-para-testes-2026';
let sharedHash;
async function fixture(run) {
  sharedHash ||= await hashPassword(password);
  const db = openDatabase(':memory:');
  const insert = db.prepare('INSERT INTO usuarios (nome, login, senha_hash, perfil_id) VALUES (?, ?, ?, ?)');
  insert.run('Bio', 'bio', sharedHash, 'biologia');
  insert.run('Mat', 'mat', sharedHash, 'matematica');
  const server = createServer(db);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (route, options = {}) => fetch(base + route, options);
  const login = (username, pass = password, token) => request('/api/login', { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json', ...(token ? { Cookie: token } : {}) }, body: JSON.stringify({ username, password: pass, perfil: 'matematica' }) });
  try { await run({ db, base, request, login }); }
  finally { await new Promise(resolve => server.close(resolve)); db.close(); }
}
const tokenOf = response => response.headers.get('set-cookie').split(';')[0];
test('rejeita sessão forjada, Host indevido e formato incorreto de login', async () => fixture(async ({ request, base, login, db }) => {
  assert.equal((await request('/api/posts', { headers: { Cookie: 'blog_session=' + 'a'.repeat(64) } })).status, 401);
  const hostStatus = await new Promise((resolve, reject) => {
    const req = require('node:http').get(base, { headers: { Host: 'site-externo.test' } }, res => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
    req.on('error', reject);
  });
  assert.equal(hostStatus, 400);
  assert.equal((await request('/api/login', { method: 'POST', headers: { Origin: base, 'Content-Type': 'text/plain' }, body: '{}' })).status, 415);
  const response = await login('bio');
  const headers = { Cookie: tokenOf(response) };
  db.prepare('UPDATE usuarios SET perfil_id = ? WHERE login = ?').run('matematica', 'bio');
  assert.equal((await request('/api/posts/celulas', { headers })).status, 403);
  assert.equal((await request('/api/posts/equacoes', { headers })).status, 200);
  db.prepare('DELETE FROM usuarios WHERE login = ?').run('bio');
  assert.equal((await request('/api/posts', { headers })).status, 401);
}));
test('hashes têm salt único, verificam senha e rejeitam hashes inválidos', async () => {
  const one = await hashPassword(password);
  const two = await hashPassword(password);
  assert.notEqual(one, two);
  assert.ok(!one.includes(password));
  assert.equal(await verifyPassword(password, one), true);
  assert.equal(await verifyPassword('errada', one), false);
  assert.equal(await verifyPassword(password, 'hash-invalido'), false);
  assert.match(cookie({ socket: { encrypted: true } }, 'token', 1800), /; Secure/);
});
test('login, permissões dos dois papéis, ID direto e arquivos privados', async () => fixture(async ({ request, login, db }) => {
  assert.equal((await request('/api/posts')).status, 401);
  assert.equal((await request('/api/posts/celulas')).status, 401);
  const invalid = await login('bio', 'errada');
  const unknown = await login('inexistente', 'errada');
  assert.equal(invalid.status, 401);
  assert.deepEqual(await invalid.json(), await unknown.json());
  assert.equal((await login("' OR 1=1 --")).status, 401);
  for (const [name, area, own, other] of [['bio', 'biologia', 'celulas', 'equacoes'], ['mat', 'matematica', 'equacoes', 'celulas']]) {
    const response = await login(name);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('set-cookie'), /HttpOnly; SameSite=Strict; Max-Age=1800/);
    const token = tokenOf(response);
    const body = await response.json();
    assert.equal(body.user.perfil, area);
    assert.equal(body.user.senha_hash, undefined);
    const headers = { Cookie: token };
    const posts = await (await request('/api/posts', { headers })).json();
    assert.equal(posts.posts.length, 2);
    assert.ok(posts.posts.every(post => post.area === area));
    assert.equal((await request('/api/posts/' + own, { headers })).status, 200);
    const denied = await request('/api/posts/' + other, { headers });
    assert.equal(denied.status, 403);
    assert.equal((await denied.json()).post, undefined);
    assert.equal((await request('/api/posts?area=' + (area === 'biologia' ? 'matematica' : 'biologia'), { headers })).status, 403);
    assert.equal((await request('/api/posts/ausente', { headers })).status, 404);
    assert.ok(!db.prepare('SELECT token_hash FROM sessoes').all().some(row => token.includes(row.token_hash)));
  }
  for (const route of ['/database/posts.json', '/data/blog.sqlite', '/auth.js', '/api/usuarios', '/__proto__']) assert.equal((await request(route)).status, 404);
}));
test('sessão é renovada, logout invalida token, expiração exige login e origem é validada', async () => fixture(async ({ db, base, request, login }) => {
  const first = tokenOf(await login('bio'));
  const second = tokenOf(await login('bio', password, first));
  assert.notEqual(first, second);
  assert.equal((await request('/api/session', { headers: { Cookie: first } })).status, 401);
  assert.equal((await request('/api/logout', { method: 'POST', headers: { Cookie: second, Origin: 'https://outro.example' } })).status, 403);
  assert.equal((await request('/api/session', { headers: { Cookie: second } })).status, 200);
  const logout = await request('/api/logout', { method: 'POST', headers: { Cookie: second, Origin: base } });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal((await request('/api/posts', { headers: { Cookie: second } })).status, 401);
  const third = tokenOf(await login('bio'));
  db.prepare('UPDATE sessoes SET expira_em = ?').run(Date.now() - 1);
  assert.equal((await request('/api/posts', { headers: { Cookie: third } })).status, 401);
  assert.equal((await request('/api/login', { method: 'POST' })).status, 403);
  assert.equal((await request('/api/login')).status, 405);
  assert.equal((await request('/api/login', { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: '{' })).status, 400);
}));
test('limita tentativas repetidas de login', async () => fixture(async ({ request, base, login }) => {
  for (let i = 0; i < 10; i++) {
    assert.equal((await request('/api/login', { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: '{}' })).status, 400);
  }
  const response = await login('bio');
  assert.equal(response.status, 429);
  assert.ok(Number(response.headers.get('retry-after')) > 0);
}));
