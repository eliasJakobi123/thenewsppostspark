-- Add missing website_url column to campaigns table
-- Run this in Supabase SQL Editor

-- Add website_url column to campaigns table if it doesn't exist
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS website_url TEXT;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'campaigns' 
AND table_schema = 'public'
AND column_name = 'website_url';
