-- Radiology Defense: saved runs and the ranking behind them.
--
-- The ranking shows an ALIAS, never a name, an email or a hospital. A board
-- that named people would turn a study game into a comparison between named
-- radiologists, visible to whoever opens the tab — which is the one thing the
-- productivity rules in this product exist to prevent. An alias keeps the
-- competition and drops the surveillance: the user picks it, and the API
-- never returns a user_id to the browser.
--
-- Safe to run twice: everything is IF NOT EXISTS and the policies are dropped
-- by name before being recreated.

CREATE TABLE IF NOT EXISTS game_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  alias text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT game_profiles_alias_len CHECK (char_length(alias) BETWEEN 2 AND 24)
);

CREATE TABLE IF NOT EXISTS game_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Snapshot of the alias at the time of the run, so renaming yourself does
  -- not silently rewrite the history of a board other people have seen.
  alias text NOT NULL,
  score integer NOT NULL CHECK (score >= 0),
  correct integer NOT NULL DEFAULT 0 CHECK (correct >= 0),
  -- How far the base held. Shown next to the score, because surviving to
  -- wave 9 with fewer points says more than wave 3 with a lucky streak.
  wave integer NOT NULL DEFAULT 0 CHECK (wave >= 0),
  integrity integer NOT NULL DEFAULT 0 CHECK (integrity >= 0),
  duration_s integer NOT NULL DEFAULT 0 CHECK (duration_s >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- The board reads the best score per player, newest first on a tie.
CREATE INDEX IF NOT EXISTS game_scores_score_idx ON game_scores (score DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS game_scores_user_idx ON game_scores (user_id, score DESC);

ALTER TABLE game_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_scores ENABLE ROW LEVEL SECURITY;

-- A player reaches only their own rows. The leaderboard is assembled server
-- side with the service client and returns aliases and scores alone, so no
-- browser ever receives another player's user_id.
DROP POLICY IF EXISTS game_profiles_own ON game_profiles;
CREATE POLICY game_profiles_own ON game_profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS game_scores_own_read ON game_scores;
CREATE POLICY game_scores_own_read ON game_scores
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS game_scores_own_insert ON game_scores;
CREATE POLICY game_scores_own_insert ON game_scores
  FOR INSERT WITH CHECK (auth.uid() = user_id);
