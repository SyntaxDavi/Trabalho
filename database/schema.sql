CREATE TABLE IF NOT EXISTS perfis (
  id TEXT PRIMARY KEY CHECK (id IN ('biologia', 'matematica')),
  nome TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY,
  nome TEXT NOT NULL CHECK (length(trim(nome)) > 0),
  login TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK (length(trim(login)) > 0),
  senha_hash TEXT NOT NULL CHECK (length(senha_hash) >= 32),
  perfil_id TEXT NOT NULL REFERENCES perfis(id),
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  perfil_id TEXT NOT NULL REFERENCES perfis(id),
  titulo TEXT NOT NULL CHECK (length(trim(titulo)) > 0),
  resumo TEXT NOT NULL,
  simbolo TEXT NOT NULL,
  tempo_leitura TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  ordem INTEGER NOT NULL,
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE INDEX IF NOT EXISTS idx_posts_perfil_ordem ON posts(perfil_id, ordem);

CREATE TABLE IF NOT EXISTS sessoes (
  token_hash TEXT PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  expira_em INTEGER NOT NULL
) STRICT;
CREATE INDEX IF NOT EXISTS idx_sessoes_expira ON sessoes(expira_em);
