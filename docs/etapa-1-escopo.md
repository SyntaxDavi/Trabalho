# Etapa 1 — Escopo e funcionamento

## Tema e objetivo

**Nome:** Blog Saber Seguro.

Blog educacional com conteúdos de Biologia e Matemática. Cada usuário possui um papel e pode ler apenas os conteúdos da sua área. O projeto demonstra autenticação, autorização por papéis, sessões seguras e comunicação HTTPS em um servidor local.

## Papéis

| Papel | Permissão |
|---|---|
| Leitor de Biologia (`biologia`) | Listar e ler posts de Biologia |
| Leitor de Matemática (`matematica`) | Listar e ler posts de Matemática |

Cada usuário terá exatamente um papel. Os usuários serão cadastrados previamente no banco. O visitante não poderá escolher ou alterar seu papel no login.

## Páginas e ações

| Página ou ação | Rota proposta | Funcionamento |
|---|---|---|
| Entrada | `/` | Encaminha ao login ou ao início conforme a sessão |
| Login | `/login` | Formulário de usuário e senha |
| Início | `/inicio` | Boas-vindas, perfil e link para a área autorizada |
| Biologia | `/biologia` | Lista dos posts de Biologia |
| Matemática | `/matematica` | Lista dos posts de Matemática |
| Post | `/posts/{id}` | Conteúdo completo, sujeito à permissão da categoria |
| Sair | `POST /logout` | Invalida a sessão e encaminha ao login |

Acesso negado será uma resposta com status HTTP 403 exibida na solicitação bloqueada. As páginas autenticadas terão um botão Sair. As rotas são uma proposta para orientar a implementação.

## Matriz de acesso

| Recurso | Sem login | Biologia | Matemática |
|---|---|---|---|
| Login | Permitido | Encaminhar ao início | Encaminhar ao início |
| Início | Exigir login | Permitido | Permitido |
| Lista de Biologia | Exigir login | Permitido | Negar (403) |
| Post de Biologia | Exigir login | Permitido | Negar (403) |
| Lista de Matemática | Exigir login | Negar (403) | Permitido |
| Post de Matemática | Exigir login | Negar (403) | Permitido |

O backend deve verificar a sessão e a permissão em cada solicitação. Esconder links não substitui essa verificação. Alterar a URL ou o ID de um post não poderá liberar conteúdo de outro papel. Uma solicitação bloqueada não deverá incluir o conteúdo protegido na resposta.

## Dados de demonstração

Dois usuários iniciais, um de cada papel: `leitor.bio` e `leitor.mat`. As senhas serão definidas durante a preparação dos dados e armazenadas somente como hash apropriado para senhas. Não registrar senhas reais no repositório.

| Categoria | Título do post |
|---|---|
| Biologia | Células: diferenças entre procariontes e eucariontes |
| Biologia | Fotossíntese: como as plantas produzem seu alimento |
| Matemática | Equações do primeiro grau |
| Matemática | Teorema de Pitágoras e suas aplicações |

## Fluxo principal

1. O visitante abre o endereço nominal do blog por HTTPS.
2. O sistema apresenta o login.
3. Credenciais incorretas resultam em uma mensagem genérica de erro.
4. Credenciais corretas iniciam uma sessão e encaminham ao início.
5. O usuário acessa sua área e abre um post.
6. Uma tentativa de acessar a outra área, inclusive pela URL direta, é bloqueada.
7. Ao sair, a sessão é invalidada.
8. Um novo acesso a conteúdo protegido exige autenticação. Uma sessão expirada também exige novo login.

## Escopo da entrega

- Login com usuário e senha e armazenamento de senha com hash apropriado.
- Dois papéis com autorização aplicada no backend.
- Página inicial, duas listas e quatro posts previamente cadastrados.
- Sessões seguras, expiração e logout.
- Execução em host local.
- Acesso por domínio nominal do grupo: `https://blog-grupo.com`.
- HTTPS com certificado correspondente ao nome e TLS 1.2 ou superior.
- Testes e apresentação dos controles implementados por um grupo de 3 a 4 integrantes.

O nome proposto é local e dependerá de configuração de resolução de nomes nas máquinas da demonstração. A configuração do servidor e do certificado pertence à etapa 7.

Cadastro público, comentários, edição de posts pela interface, recuperação de senha e painel administrativo ficam fora da primeira versão. OAuth2/OIDC não faz parte do fluxo escolhido; será utilizada autenticação local com hash de senha.

## Critérios de aceitação para a implementação

- Os dois usuários conseguem entrar com suas credenciais válidas.
- Credenciais inválidas não criam uma sessão autenticada.
- Visitantes sem sessão não recebem conteúdos protegidos.
- Cada papel consegue listar e ler somente os posts da própria categoria.
- URLs diretas e alterações do ID de um post respeitam a mesma autorização.
- Logout e expiração impedem novos acessos autenticados com a sessão anterior.
- O banco não contém senhas em texto puro.
- O blog abre no host local por nome, com HTTPS, certificado correspondente e TLS 1.2 ou superior.

Esses critérios são requisitos futuros, ainda não implementados nem testados.

## Próxima etapa

Escolher as tecnologias de interface, backend, banco e servidor HTTPS; identificar os integrantes e distribuir responsabilidades. Nenhuma tecnologia foi fixada nesta etapa.
