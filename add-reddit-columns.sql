-- Add missing Reddit OAuth columns to users table
-- Run this in Supabase SQL Editor

-- Add Reddit OAuth columns to users table if they don't exist
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS reddit_access_token TEXT,
ADD COLUMN IF NOT EXISTS reddit_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS reddit_token_expires TIMESTAMP WITH TIME ZONE;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
AND column_name LIKE 'reddit_%';
