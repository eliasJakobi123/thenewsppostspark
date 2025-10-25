-- Fix usage_type constraint to allow 'ai_responses'
-- Run this in Supabase SQL Editor

-- Drop the existing constraint
ALTER TABLE public.subscription_usage 
DROP CONSTRAINT IF EXISTS subscription_usage_usage_type_check;

-- Add the new constraint with correct values
ALTER TABLE public.subscription_usage 
ADD CONSTRAINT subscription_usage_usage_type_check 
CHECK (usage_type IN ('campaigns', 'refreshes', 'ai_responses'));
