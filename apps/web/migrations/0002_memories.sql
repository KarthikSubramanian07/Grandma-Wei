-- Encrypted descriptions of photos she has already read, so the same photo
-- gets the same reading. Never the photo itself. The id and the AES key are
-- both derived from the photo, so an entry is unreadable without it.
-- Entries older than 30 days are ignored and swept on write.
CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  created INTEGER NOT NULL,
  blob TEXT NOT NULL
);
