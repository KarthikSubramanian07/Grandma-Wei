-- Rate-limit counters. Keys are salted hashes, never IP addresses.
CREATE TABLE IF NOT EXISTS hits (
  key TEXT NOT NULL,
  bucket INTEGER NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, bucket)
);

-- Shared scorecards: text only. No photos, no room sketches.
CREATE TABLE IF NOT EXISTS shares (
  id TEXT PRIMARY KEY,
  created INTEGER NOT NULL,
  delete_hash TEXT NOT NULL,
  payload TEXT NOT NULL
);
