-- turkish lexicon initial schema
-- run via wrangler d1 migrations

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category_type TEXT NOT NULL,
  description TEXT,
  icon_key TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE TABLE IF NOT EXISTS words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word TEXT NOT NULL,
  arabic_translation TEXT NOT NULL,
  word_icon_key TEXT,
  turkish_sentence TEXT,
  arabic_sentence TEXT,
  difficulty_level TEXT,
  vowel_harmony_rule TEXT,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL,
  updated_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE TABLE IF NOT EXISTS word_tags (
  word_id INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  PRIMARY KEY (word_id, tag)
) STRICT;

CREATE INDEX IF NOT EXISTS idx_words_category ON words(category_id);
CREATE INDEX IF NOT EXISTS idx_words_difficulty ON words(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_words_vowel ON words(vowel_harmony_rule);
