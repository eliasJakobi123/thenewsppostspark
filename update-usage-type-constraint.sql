-- Update subscription_usage table to allow ai_responses usage type
-- This script updates the existing CHECK constraint to include 'ai_responses'

-- First, drop the existing constraint
ALTER TABLE public.subscription_usage 
DROP CONSTRAINT IF EXISTS subscription_usage_usage_type_check;

-- Add the new constraint with ai_responses included
ALTER TABLE public.subscription_usage 
ADD CONSTRAINT subscription_usage_usage_type_check 
CHECK (usage_type IN ('campaigns', 'refreshes', 'api_calls', 'ai_responses'));

-- Verify the constraint was added
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'public.subscription_usage'::regclass 
AND conname = 'subscription_usage_usage_type_check';
