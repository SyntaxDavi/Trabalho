# Roteiro da apresentação — Blog Saber Seguro

Integrantes (preencher):

1. Nome e participação:
2. Nome e participação:
3. Nome e participação:
4. Nome e participação (se houver):

## Preparação

Abra `npm start`, tenha as duas senhas de teste disponíveis e acesse https://blog-grupo.com:3000. Execute `npm run verify` em outro terminal. Não compartilhe a chave privada nem mostre senhas durante a exposição do código.

## Demonstração sugerida — 8 a 10 minutos

1. **Objetivo:** “Criamos um blog educacional em que cada leitor acessa apenas os conteúdos de sua área. Nosso foco é autenticação, autorização e proteção da conexão.”
2. **Arquitetura:** mostre navegador → HTTPS → Node.js → SQLite. Explique que o navegador não abre o banco diretamente.
3. **Certificado:** abra as informações de segurança do navegador e mostre o nome blog-grupo.com e a validade do certificado. Explique que ele é autoassinado e foi confiado somente para o ambiente local.
4. **Login inválido:** tente uma senha incorreta uma vez. Mostre a mensagem genérica. Não repita dez vezes durante o roteiro, pois isso ativa o limite de tentativas.
5. **Perfil Biologia:** entre como `leitor.bio`; abra um artigo. O navegador recebe somente posts de Biologia.
6. **Tentativa indevida:** digite `https://blog-grupo.com:3000/#matematica`. Mostre o acesso negado. Para comprovar a proteção no backend, abra `https://blog-grupo.com:3000/api/posts/equacoes` e mostre a resposta sem conteúdo (403 nas ferramentas de rede).
7. **Logout:** volte ao blog, clique em Sair e tente abrir `https://blog-grupo.com:3000/api/posts`. A resposta exige autenticação (401).
8. **Perfil Matemática:** entre como `leitor.mat`, abra Equações e tente `https://blog-grupo.com:3000/api/posts/celulas`. Mostre o bloqueio inverso.
9. **Senhas e sessões:** mostre as funções em `auth.js`, sem exibir credenciais reais. Explique salt, hash de senha, token aleatório, hash do token no banco e expiração de 30 minutos. Nas ferramentas do navegador, mostre apenas as flags Secure, HttpOnly e SameSite do cookie; não exponha o valor.
10. **Testes:** execute `npm test` e mostre os resultados. Os testes de expiração ajustam apenas bancos temporários, evitando esperar 30 minutos ou alterar o banco da demonstração.

## Perguntas para ensaiar

**Autenticação e autorização são a mesma coisa?** Não. Autenticação verifica quem entrou; autorização verifica o que essa pessoa pode acessar.

**Por que esconder o link não resolve?** A pessoa pode digitar a URL. Por isso o backend verifica o perfil em cada pedido de conteúdo.

**É possível recuperar a senha a partir do banco?** O sistema não guarda a senha original. Ele deriva um hash e compara o resultado na autenticação. Isso dificulta ataques, mas não dispensa senhas fortes.

**Por que há um salt?** Para que senhas iguais não produzam o mesmo hash e para dificultar o uso de tabelas previamente calculadas.

**Para que serve o certificado?** Participa da identificação do servidor na conexão TLS. O navegador verifica o nome e a confiança no certificado antes de aceitar a conexão.

**O HTTPS controla os perfis?** Não. Ele protege o transporte. As regras de acesso são verificadas pelo backend.

**Por que SQLite?** É um banco relacional em arquivo, suficiente para este blog local, sem exigir um serviço de banco separado.

**Por que a porta 3000?** As portas tentadas anteriormente foram bloqueadas neste Windows. O HTTPS também funciona em outras portas; o protocolo continua sendo TLS.

**O que acontece ao sair?** O servidor remove a sessão e manda expirar o cookie. Reutilizar o token antigo deixa de autorizar acesso.
