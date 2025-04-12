CREATE TABLE gods (
  token_id INTEGER NOT NULL PRIMARY KEY,
  holder TEXT NOT NULL,
  type TEXT NOT NULL,
  gender TEXT NOT NULL,
  parts TEXT NOT NULL,
  image TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER
);

CREATE INDEX idx_gods_holder ON gods (holder);
