-- Add email_verified column to profiles
-- Default true so existing users are not locked out
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT true;
