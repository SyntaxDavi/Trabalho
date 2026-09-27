'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { openDatabase, listPosts } = require('../database');
const { createServer } = require('../server');

test('inicialização preserva conteúdo persistido e não duplica os dados', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-db-test-'));
  const filename = path.join(directory, 'test.sqlite');
  let db;
  try {
    db = openDatabase(filename);
    assert.equal(listPosts(db).length, 4);
    assert.equal(db.prepare('SELECT count(*) AS n FROM perfis').get().n, 2);
    assert.equal(db.prepare('SELECT count(*) AS n FROM usuarios').get().n, 0);
    db.prepare('UPDATE posts SET titulo = ? WHERE id = ?').run('Título persistido', 'celulas');
    db.close();
    db = openDatabase(filename);
    assert.equal(listPosts(db).length, 4);
    assert.equal(listPosts(db).find(post => post.id === 'celulas').title, 'Título persistido');
    assert.equal(db.pragma('integrity_check', { simple: true }), 'ok');
  } finally {
    if (db?.open) db.close();
    fs.rmSync(directory, { recursive: true });
  }
});

test('banco rejeita perfis inexistentes, login duplicado e hash ausente', () => {
  const db = openDatabase(':memory:');
  try {
    const insert = db.prepare('INSERT INTO usuarios (nome, login, senha_hash, perfil_id) VALUES (?, ?, ?, ?)');
    insert.run('Pessoa de teste', 'teste', 'x'.repeat(64), 'biologia');
    assert.throws(() => insert.run('Outro', 'TESTE', 'x'.repeat(64), 'matematica'), /UNIQUE/);
    assert.throws(() => insert.run('Outro', 'outro', 'x'.repeat(64), 'inexistente'), /FOREIGN KEY/);
    assert.throws(() => insert.run('Outro', 'outro', null, 'biologia'), /NOT NULL/);
    assert.throws(() => insert.run('Outro', 'outro', 'curto', 'biologia'), /CHECK/);
    assert.deepEqual(listPosts(db, "biologia' OR 1=1 --"), []);
  } finally { db.close(); }
});

test('API lê o banco, filtra áreas, trata erros e não expõe arquivos privados', async () => {
  const db = openDatabase(':memory:');
  const server = createServer(db);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const { createSession } = require('../auth');
    db.prepare('INSERT INTO usuarios (nome, login, senha_hash, perfil_id) VALUES (?, ?, ?, ?)').run('Teste', 'api', 'x'.repeat(64), 'biologia');
    let cookie;
    createSession(db, { headers: {}, socket: {} }, { setHeader: (name, value) => { cookie = value.split(';')[0]; } }, 1);
    const request = (url, options = {}) => fetch(url, { ...options, headers: { Cookie: cookie, ...options.headers } });
    db.prepare('UPDATE posts SET titulo = ? WHERE id = ?').run('Título vindo do banco', 'celulas');
    const all = await (await request(`${base}/api/posts`)).json();
    assert.equal(all.posts.length, 2);
    assert.equal(all.posts[0].title, 'Título vindo do banco');
    for (const area of ['biologia', 'matematica']) {
      db.prepare('UPDATE usuarios SET perfil_id = ? WHERE id = 1').run(area);
      const result = await (await request(`${base}/api/posts?area=${area}`)).json();
      assert.equal(result.posts.length, 2);
      assert.ok(result.posts.every(post => post.area === area));
    }
    assert.equal((await request(`${base}/api/posts?area=invalida`)).status, 400);
    assert.equal((await fetch(`${base}/api/posts`, { method: 'POST' })).status, 405);
    for (const resource of ['/data/blog.sqlite', '/database/posts.json', '/database/schema.sql', '/api/usuarios']) {
      assert.equal((await fetch(base + resource)).status, 404);
    }
    for (const resource of ['/', '/app.js', '/styles.css']) assert.equal((await fetch(base + resource)).status, 200);
    db.exec('DELETE FROM posts');
    assert.deepEqual(await (await request(`${base}/api/posts`)).json(), { posts: [] });
  } finally {
    await new Promise(resolve => server.close(resolve));
    db.close();
  }
});
