'use strict';
const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');
const seed = require('./posts.json');

function openDatabase(filename = path.join(__dirname, '..', 'data', 'blog.sqlite')) {
  if (filename !== ':memory:') fs.mkdirSync(path.dirname(filename), { recursive: true });
  const db = new Database(filename);
  try {
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');
    db.transaction(() => {
      db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
      const profile = db.prepare('INSERT INTO perfis (id, nome) VALUES (?, ?) ON CONFLICT(id) DO NOTHING');
      profile.run('biologia', 'Leitor de Biologia');
      profile.run('matematica', 'Leitor de Matemática');
      const insert = db.prepare(`INSERT INTO posts
        (id, perfil_id, titulo, resumo, simbolo, tempo_leitura, conteudo, ordem)
        VALUES (@id, @area, @title, @summary, @symbol, @time, @body, @order)
        ON CONFLICT(id) DO NOTHING`);
      seed.forEach((post, order) => insert.run({ ...post, order }));
    })();
    db.pragma('optimize');
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

function listPosts(db, area) {
  const columns = `id, perfil_id AS area, titulo AS title, resumo AS summary,
    simbolo AS symbol, tempo_leitura AS time, conteudo AS body`;
  return area === undefined
    ? db.prepare(`SELECT ${columns} FROM posts ORDER BY ordem, id`).all()
    : db.prepare(`SELECT ${columns} FROM posts WHERE perfil_id = ? ORDER BY ordem, id`).all(area);
}

module.exports = { openDatabase, listPosts };

if (require.main === module) {
  const db = openDatabase();
  console.log('Banco inicializado: data/blog.sqlite');
  console.log(`Perfis: ${db.prepare('SELECT count(*) AS total FROM perfis').get().total}; posts: ${listPosts(db).length}`);
  db.close();
}
