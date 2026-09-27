'use strict';
const { randomBytes } = require('node:crypto');
const { openDatabase } = require('./index');
const { hashPassword } = require('../auth');
async function main() {
  const db = openDatabase();
  try {
    for (const [login, name, profile] of [['leitor.bio', 'Leitor de Biologia', 'biologia'], ['leitor.mat', 'Leitor de Matemática', 'matematica']]) {
      if (db.prepare('SELECT id FROM usuarios WHERE login = ?').get(login)) { console.log(`${login}: conta já existe; senha preservada.`); continue; }
      const password = randomBytes(15).toString('base64url');
      const hash = await hashPassword(password);
      db.prepare('INSERT INTO usuarios (nome, login, senha_hash, perfil_id) VALUES (?, ?, ?, ?)').run(name, login, hash, profile);
      console.log(`Usuário: ${login} | Senha inicial: ${password}`);
    }
    console.log('Guarde as senhas exibidas. Elas não são salvas em texto puro e não serão exibidas novamente.');
  } finally { db.close(); }
}
main().catch(() => { console.error('Não foi possível criar as contas.'); process.exitCode = 1; });
