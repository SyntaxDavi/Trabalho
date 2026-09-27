'use strict';
const { openDatabase } = require('./index');
const db = openDatabase();
try {
  console.table({
    perfis: db.prepare('SELECT count(*) AS total FROM perfis').get(),
    usuarios: db.prepare('SELECT count(*) AS total FROM usuarios').get(),
    posts: db.prepare('SELECT count(*) AS total FROM posts').get()
  });
} finally { db.close(); }
