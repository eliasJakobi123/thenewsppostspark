-- Add Reddit OAuth columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS reddit_access_token TEXT,
ADD COLUMN IF NOT EXISTS reddit_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS reddit_token_expires TIMESTAMP WITH TIME ZONE;

