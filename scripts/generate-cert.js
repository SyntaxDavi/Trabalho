'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { X509Certificate } = require('node:crypto');
const directory = path.join(__dirname, '..', 'certs');
fs.mkdirSync(directory, { recursive: true });
const key = path.join(directory, 'blog-key.pem');
const cert = path.join(directory, 'blog-cert.pem');
if (fs.existsSync(key) && fs.existsSync(cert) && (() => {
  try { return new X509Certificate(fs.readFileSync(cert)).checkHost('blog-grupo.com') === 'blog-grupo.com'; } catch { return false; }
})()) {
  console.log('Certificado existente preservado.');
} else {
  if (fs.existsSync(key)) fs.unlinkSync(key);
  if (fs.existsSync(cert)) fs.unlinkSync(cert);
  const bundled = 'C:\\Program Files\\Git\\usr\\bin\\openssl.exe';
  const executable = fs.existsSync(bundled) ? bundled : 'openssl';
  const result = spawnSync(executable, ['req', '-x509', '-newkey', 'rsa:3072', '-sha256', '-nodes', '-days', '365', '-keyout', key, '-out', cert,
    '-subj', '/CN=blog-grupo.com/O=Blog Saber Seguro Local',
    '-addext', 'subjectAltName=DNS:blog-grupo.com,DNS:localhost,IP:127.0.0.1',
    '-addext', 'basicConstraints=critical,CA:FALSE',
    '-addext', 'keyUsage=critical,digitalSignature,keyEncipherment',
    '-addext', 'extendedKeyUsage=serverAuth'], { encoding: 'utf8', windowsHide: true });
  if (result.error || result.status !== 0) throw new Error('Falha ao gerar certificado. Instale OpenSSL (incluído no Git for Windows) e tente novamente.');
  console.log('Certificado local criado: certs/blog-cert.pem. Validade: 365 dias.');
}
