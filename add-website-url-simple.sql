-- Add website_url column to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS website_url TEXT;

