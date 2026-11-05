PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS oauth_states (
  state_hash TEXT PRIMARY KEY,
  code_verifier TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS google_connections (
  id TEXT PRIMARY KEY,
  google_sub TEXT NOT NULL UNIQUE,
  refresh_token_ciphertext TEXT NOT NULL,
  scopes TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS oauth_tickets (
  ticket_hash TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL REFERENCES google_connections(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_oauth_states_expiry ON oauth_states(expires_at);
CREATE INDEX IF NOT EXISTS idx_oauth_tickets_expiry ON oauth_tickets(expires_at);
