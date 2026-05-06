-- Waitlist table for pre-launch signups
CREATE TABLE IF NOT EXISTS waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  country text NOT NULL,
  hospital text NOT NULL,
  role text NOT NULL CHECK (role IN ('attending', 'resident')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(email)
);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Approve gate on profiles: existing users are approved, new ones are not
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS approved boolean DEFAULT false;

-- Mark all existing profiles as approved
UPDATE profiles SET approved = true WHERE approved = false OR approved IS NULL;
