CREATE TABLE IF NOT EXISTS annotations (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  exact_quote TEXT NOT NULL,
  prefix_quote TEXT,
  suffix_quote TEXT,
  note_text TEXT NOT NULL,
  tags_json TEXT NOT NULL DEFAULT '[]',
  visibility TEXT NOT NULL CHECK (visibility IN ('private', 'public')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS annotations_slug_created
  ON annotations (slug, created_at);

CREATE TABLE IF NOT EXISTS annotation_requests (
  request_key TEXT PRIMARY KEY,
  annotation_id TEXT NOT NULL,
  response_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
