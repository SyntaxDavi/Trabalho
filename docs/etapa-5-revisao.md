# Etapa 5 — Revisão final e preparação da entrega

## Matriz de requisitos do enunciado

| Requisito | Implementação | Como demonstrar |
|---|---|---|
| Página com login e senha | Formulário e POST `/api/login` | Entrar com conta válida e tentar senha incorreta |
| Pelo menos dois papéis | Biologia e Matemática, vinculados ao usuário no banco | Mostrar conteúdo próprio e bloqueio do outro perfil |
| Senhas com hash no banco | scrypt com salt individual em `auth.js` | Explicar o formato e executar os testes de hash |
| Sessões seguras | Token aleatório, hash do token no SQLite, expiração de 30 minutos e logout | Mostrar flags do cookie e bloqueio após sair |
| HTTPS e certificado digital | Certificado autoassinado confiado localmente e TLS mínimo 1.2 | Abrir detalhes do certificado e executar testes TLS |
| URL nominal | `https://blog-grupo.com:3000` | Mostrar endereço e mapeamento local no hosts |
| Host local | Servidor vinculado a 127.0.0.1 | Executar o blog na máquina da apresentação |
| Grupo com 3 a 4 integrantes | Informação ainda não fornecida | Preencher integrantes antes da entrega |
| Apresentar e responder perguntas | Roteiro preparado | Ensaiar e apresentar ao professor |

## Controles adicionais revisados

Consultas com parâmetros; autorização por categoria e ID no servidor; validação de Origin para login/logout; limitação de login; bloqueio de Host desconhecido; CSP; cookies Secure/HttpOnly/SameSite; respostas sem cache; acesso restrito aos arquivos públicos.

Na revisão foi adicionado limite de espera de 15 segundos ao login e ao logout no navegador, com mensagem de falha de conexão. O encerramento do servidor também passou a tolerar chamadas repetidas durante falhas de inicialização.

Os testes adicionais verificam token forjado, Host indevido, tipo de conteúdo incorreto, mudança de perfil no banco com sessão existente e exclusão de usuário autenticado. As permissões são consultadas novamente em cada requisição.

## Evidências reproduzíveis

Resultado da revisão em 10/09/2026: sintaxe aprovada, 10 testes automatizados aprovados e 11 verificações locais aprovadas. O servidor foi reiniciado com as correções desta etapa.

1. `npm run check` — sintaxe.
2. `npm test` — testes automatizados com bancos temporários e validação TLS.
3. Com `npm start` aberto, `npm run verify` — configuração real, integridade do banco, contas, formato dos hashes, resolução do nome, HTTPS e bloqueio sem login.
4. `docs/verificacao-local.json` — resultado datado da última verificação local concluída, sem dados de credenciais.

A verificação TLS do Node confia explicitamente no certificado local; a confiança no Windows foi verificada na etapa 4 com resposta HTTPS 200 sem ignorar erros de certificado. A revisão automatizada não substitui ensaio visual no navegador; não foram feitas capturas de tela nesta etapa.

## Antes de entregar

- [ ] Informar nomes dos 3 a 4 integrantes e respectivas participações.
- [ ] Ensaiar o roteiro na máquina que será usada na apresentação.
- [ ] Guardar as senhas de teste para a demonstração, fora do código entregue.
- [ ] Se houver outra máquina, gerar o certificado e registrar o nome e a confiança nela.
- [ ] Capturar evidências visuais solicitadas pelo professor: login, bloqueio, certificado e cookies.
- [ ] Apresentar o trabalho e responder às perguntas.

## Limites conhecidos

O certificado é local e precisa ser confiado nas máquinas da demonstração; não é emitido por uma autoridade pública. O servidor atende apenas a própria máquina. O limite de login é por IP, em memória, e reinicia com o processo. Não há recuperação de senha nem painel de cadastro. A conformidade final com a avaliação depende também da apresentação e da composição do grupo.
