# Etapa 2 prática — Banco de dados e integração

## Implementado

O servidor Node.js usa SQLite por meio de `better-sqlite3`. O banco fica em `data/blog.sqlite`, fora da pasta pública. O arquivo é criado automaticamente no primeiro `npm start` ou por `npm run db:init`.

| Tabela | Finalidade |
|---|---|
| `perfis` | Papéis Biologia e Matemática |
| `usuarios` | Nome, login único sem distinção de maiúsculas, hash de senha e referência ao perfil |
| `posts` | Título, resumo, conteúdo, categoria, símbolo, tempo de leitura e ordem |

O esquema está em `database/schema.sql`. Os artigos iniciais estão em `database/posts.json`. A inicialização usa uma transação e insere somente os registros cujos IDs ainda não existem. Reiniciar não duplica dados nem sobrescreve alterações nos registros existentes. Registros iniciais removidos serão recriados no próximo início.

A tabela de usuários está preparada, mas vazia. As contas e os hashes reais serão criados na etapa de autenticação. A restrição de comprimento do campo `senha_hash` não comprova que um valor seja um hash seguro; a próxima etapa deve gerar e verificar hashes com uma biblioteca apropriada.

## Fluxo de leitura

Navegador → `GET /api/posts` → servidor Node.js → consulta SQLite → resposta JSON → páginas do blog.

O filtro opcional `GET /api/posts?area=biologia` ou `?area=matematica` usa parâmetro SQL. Valores desconhecidos retornam 400 e métodos diferentes de GET retornam 405. Não há endpoint de escrita ou de consulta de usuários.

O frontend trata carregamento, erro com nova tentativa e lista vazia. Os textos recebidos são escapados; o corpo do artigo aceita apenas tags `p` e `h2` sem atributos. O servidor só entrega os três arquivos públicos explicitamente permitidos.

## Limites desta etapa

Os artigos continuam públicos para demonstração. Filtrar por área não constitui autorização. O login ainda é visual. Autenticação, hashes reais, sessões, permissões e HTTPS ainda serão implementados. Não usar esta versão para dados privados.

## Execução e verificação

1. Instale as dependências com `npm ci` (ou `npm install` na preparação inicial).
2. Execute `npm start`. Caso a versão anterior esteja aberta no terminal, pare-a com Ctrl+C antes.
3. Acesse `http://127.0.0.1:3000` e atualize a página.
4. Use `npm run db:info` para conferir as contagens das tabelas.
5. Execute `npm run check` e `npm test` para verificar sintaxe, persistência, integridade, restrições e API.

Agora o blog depende da API: abrir `dist/index.html` diretamente não carrega os artigos.

Referência da biblioteca: https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md
