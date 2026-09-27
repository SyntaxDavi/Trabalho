# Etapa 4 — HTTPS e nome local

Endereço nominal: **https://blog-grupo.com:3000**. O blog continua hospedado nesta máquina, restrito a 127.0.0.1.

Neste Windows, as tentativas de escuta nas portas 443 e 8443 retornaram EACCES. Foi mantida a porta 3000, agora com TLS. O endereço antigo `http://127.0.0.1:3000` não deve mais ser usado: essa porta agora aceita apenas HTTPS. Para testar o redirecionamento, use `http://blog-grupo.com:8080`.

Configuração verificada nesta máquina: resposta HTTPS 200 com validação normal do certificado pelo Windows, sem ignorar erros TLS. Impressão digital do certificado instalado: `5E450EE843CCB46E6C6383A4F54BD14EAE739844`.

## Preparação em uma nova máquina Windows

1. Instale as dependências com `npm ci`.
2. Execute `npm run tls:generate`. O gerador usa OpenSSL, incluindo o fornecido pelo Git for Windows. Ele preserva um par de arquivos existente.
3. Abra PowerShell como administrador, entre na pasta do projeto e execute `powershell -ExecutionPolicy Bypass -File scripts/install-local-https.ps1`.
4. Execute `npm start` em um terminal comum. Acesse https://blog-grupo.com:3000. Se o navegador estava aberto durante a instalação da confiança, reinicie-o se necessário.

O instalador adiciona somente `127.0.0.1 blog-grupo.com` ao arquivo hosts, preservando entradas existentes. Assim, a URL tem formato de domínio próprio, mas continua apontando apenas para este computador e não depende de DNS público. Antes da primeira alteração, salva uma cópia em `certs/hosts-before-https.txt`. Também confia no certificado público do blog no repositório de raízes da máquina. Não instala a chave privada no Windows.

## Certificado e transporte

- Certificado autoassinado, permitido pelo enunciado, válido por 365 dias.
- RSA de 3072 bits e assinatura SHA-256; uso de autenticação de servidor, CA:FALSE.
- Nomes: blog-grupo.com, localhost e IP 127.0.0.1.
- Chave privada: `certs/blog-key.pem`; certificado público: `certs/blog-cert.pem`. A pasta inteira é ignorada pelo Git e não é servida pelo blog. Não compartilhe a chave privada.
- HTTPS na porta 3000 com versão mínima TLS 1.2. TLS 1.0 e 1.1 são rejeitados.
- HTTP nas porta 8080 apenas redireciona GET/HEAD para o endereço HTTPS fixo. Envios por HTTP são recusados; credenciais não são processadas nessa conexão.
- Cookies de sessão enviados pelo servidor HTTPS incluem Secure, HttpOnly e SameSite=Strict. A origem de login/logout deve corresponder ao endereço HTTPS utilizado.

O login e as senhas da etapa 3 continuam válidos. Entre novamente no novo endereço, pois cookies são vinculados ao nome do site.

## Verificação

`npm run check` e `npm test`. Gere o certificado antes dos testes em uma máquina nova.

Os testes HTTPS validam o certificado usando sua chave pública como confiança explícita, sem desabilitar a validação TLS; verificam o nome, as versões 1.2 e 1.3, rejeição de versões antigas, cookie Secure, autorização e redirecionamento HTTP. Os testes de confiança via Node não substituem o registro de confiança do Windows, verificado separadamente na instalação.

## Renovação e remoção

Para renovar, pare o servidor, mova o par antigo para um backup privado fora de `certs`, execute o gerador e instale a confiança no novo certificado. Remova do Windows o certificado antigo pelo identificador correto.

Para desfazer a configuração local, remova somente a linha identificada com `# Blog Saber Seguro` do arquivo hosts e o certificado com a impressão digital correspondente em `certlm.msc` → Autoridades de Certificação Raiz Confiáveis → Certificados. Não restaure o backup inteiro de hosts se outras entradas tiverem sido alteradas depois.

Referência: [TLS no Node.js](https://nodejs.org/api/tls.html).
