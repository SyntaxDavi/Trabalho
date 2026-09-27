# Etapa 3 prática — Autenticação, sessões e autorização

## Executar

1. Execute `npm run users:init` uma vez para criar `leitor.bio` e `leitor.mat`. As senhas aleatórias aparecem no terminal somente na criação; guarde-as. Executar novamente preserva contas e senhas existentes.
2. Execute `npm start` (pare uma versão anterior com Ctrl+C antes).
3. Acesse `http://127.0.0.1:3000` e entre com uma das contas.
4. Para sair, use o botão Sair no cabeçalho.

## Controles implementados

- Senhas com scrypt nativo do Node: N=131072, r=8, p=1, salt aleatório de 16 bytes e resultado de 64 bytes. Criação aceita de 15 a 128 caracteres; a comparação usa `timingSafeEqual`.
- O servidor não registra credenciais de login. Somente o comando de criação exibe a senha inicial, uma vez. O banco guarda o hash e seus parâmetros.
- Mensagem genérica para senha incorreta ou usuário inexistente. Usuário inexistente também executa uma derivação scrypt.
- Até 10 solicitações de login por IP em 15 minutos, contando solicitações bem-sucedidas e inválidas. Limite em memória, reiniciado ao reiniciar o servidor. Até duas verificações simultâneas de senha para limitar uso de memória.
- Sessões com token aleatório de 32 bytes. O SQLite guarda somente SHA-256 do token, usuário e expiração absoluta de 30 minutos.
- Cookie HttpOnly, SameSite=Strict e Max-Age de 1800 segundos. Um login bem-sucedido substitui e invalida a sessão apresentada anteriormente. Logout remove a sessão do banco e expira o cookie.
- Origem obrigatoriamente igual à do servidor em login e logout, para bloquear requisições de outros sites. Host limitado aos nomes locais configurados.
- Autorização no backend usa o perfil do banco, ignorando qualquer perfil enviado pelo cliente. Uma sessão só recebe os posts da própria área. Acesso a outra categoria ou ID de outra área retorna 403 sem conteúdo.
- Respostas sem cache; política CSP; textos do banco escapados no frontend. O navegador revalida a sessão na navegação, ao retornar à aba e periodicamente enquanto aberto.

## Endpoints

| Método e caminho | Comportamento |
|---|---|
| POST `/api/login` | Recebe JSON com `username` e `password`; cria cookie de sessão |
| GET `/api/session` | Retorna dados públicos do usuário autenticado; sem sessão retorna 401 |
| POST `/api/logout` | Invalida a sessão apresentada |
| GET `/api/posts` | Lista somente os posts do perfil autenticado |
| GET `/api/posts?area=biologia` | Exige que a área corresponda ao perfil |
| GET `/api/posts/{id}` | Verifica categoria do artigo antes de devolver seu conteúdo |

O HTML público é apenas a estrutura da interface. Nenhum conteúdo de artigo é embutido nele. Os artigos vêm da API autenticada.

## Próxima etapa e limites

HTTPS, certificado digital e nome local ainda não foram configurados. Nesta etapa o servidor permanece restrito a 127.0.0.1 e HTTP; use somente as contas de teste. O atributo Secure do cookie é ativado quando a conexão é TLS direta, mas não está ativo no HTTP atual. O trabalho ainda não atende ao requisito final de transporte criptografado. A próxima etapa deve ajustar também os hosts/origens permitidos para o nome nominal escolhido.

Não há cadastro público, recuperação de senha nem edição de usuários pela interface. Os testes usam bancos temporários e senhas fictícias; não alteram as contas do blog.

## Verificação

`npm run check` valida a sintaxe. `npm test` cobre persistência, restrições de banco, hash e salt, login inválido, autorização dos dois perfis, IDs diretos, renovação e expiração de sessão, logout, origem indevida, limite de tentativas e arquivos privados.

Referências: [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) e [Node.js Crypto](https://nodejs.org/api/crypto.html).
