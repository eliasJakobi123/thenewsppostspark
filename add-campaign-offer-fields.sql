-- Add offer and website_url fields to campaigns table
-- Run this in Supabase SQL Editor

-- Add new columns to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS offer TEXT,
ADD COLUMN IF NOT EXISTS website_url TEXT;

-- Add comment to explain the fields
COMMENT ON COLUMN public.campaigns.offer IS 'The offer description for this campaign, used in AI comment generation';
COMMENT ON COLUMN public.campaigns.website_url IS 'The website URL for this campaign, used in AI comment generation';

-- Update existing campaigns to have empty values for new fields
UPDATE public.campaigns 
SET 
    offer = COALESCE(offer, ''),
    website_url = COALESCE(website_url, '')
WHERE offer IS NULL OR website_url IS NULL;
