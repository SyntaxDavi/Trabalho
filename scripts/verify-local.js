'use strict';
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const { X509Certificate } = require('node:crypto');
const Database = require('better-sqlite3');
const root = path.join(__dirname, '..');
async function verify() {
  const report = { checkedAt: new Date().toISOString(), url: 'https://blog-grupo.com:3000', checks: [] };
  function check(name, passed) {
    report.checks.push({ name, passed: Boolean(passed) });
    console.log(`${passed ? 'OK' : 'FALHOU'}: ${name}`);
  }
  const cert = fs.readFileSync(path.join(root, 'certs', 'blog-cert.pem'));
  const x509 = new X509Certificate(cert);
  check('Certificado válido na data atual', Date.now() >= Date.parse(x509.validFrom) && Date.now() < Date.parse(x509.validTo));
  check('Certificado corresponde a blog-grupo.com', x509.checkHost('blog-grupo.com') === 'blog-grupo.com');
  const db = new Database(path.join(root, 'data', 'blog.sqlite'), { readonly: true, fileMustExist: true });
  try {
    check('Integridade SQLite', db.pragma('integrity_check', { simple: true }) === 'ok');
    const users = db.prepare('SELECT perfil_id, senha_hash FROM usuarios').all();
    check('Contas dos dois perfis cadastradas', ['biologia', 'matematica'].every(area => users.some(user => user.perfil_id === area)));
    check('Senhas armazenadas no formato scrypt esperado', users.length > 0 && users.every(user => /^scrypt\$131072\$8\$1\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(user.senha_hash)));
    check('Posts nas duas áreas', ['biologia', 'matematica'].every(area => db.prepare('SELECT count(*) AS n FROM posts WHERE perfil_id = ?').get(area).n > 0));
  } finally { db.close(); }
  const request = route => new Promise((resolve, reject) => {
    const req = https.get(report.url + route, { ca: cert, timeout: 10000, agent: false }, res => {
      const result = { status: res.statusCode, protocol: res.socket.getProtocol(), authorized: res.socket.authorized, address: res.socket.remoteAddress };
      res.resume(); res.on('end', () => resolve(result));
    });
    req.on('timeout', () => req.destroy(new Error('Tempo limite excedido.')));
    req.on('error', reject);
  });
  const home = await request('/');
  check('Nome resolve para o servidor local', home.address === '127.0.0.1');
  check('Página responde por HTTPS com certificado validado', home.status === 200 && home.authorized);
  check('Conexão usa TLS 1.2 ou superior', ['TLSv1.2', 'TLSv1.3'].includes(home.protocol));
  check('Artigos bloqueados sem autenticação', (await request('/api/posts')).status === 401);
  check('Chave privada não está disponível na web', (await request('/certs/blog-key.pem')).status === 404);
  report.scope = 'Verificação local somente leitura. Confiança TLS explícita no certificado; não verifica o repositório de confiança do navegador. Testes de login e autorização estão em npm test.';
  fs.writeFileSync(path.join(root, 'docs', 'verificacao-local.json'), JSON.stringify(report, null, 2) + '\n');
  if (report.checks.some(item => !item.passed)) process.exitCode = 1;
}
verify().catch(error => { console.error('Verificação incompleta. Confirme npm start, o banco, as contas e a configuração HTTPS.', error.code || error.message); process.exitCode = 1; });
