-- Update existing subscription plans with AI responses limits
-- This script updates the existing plans without causing conflicts

-- Update Starter plan
UPDATE public.subscription_plans 
SET 
    features = '{"analytics": "basic", "support": "email", "api_access": false, "max_ai_responses": 100}'
WHERE plan_name = 'Starter';

-- Update Pro plan
UPDATE public.subscription_plans 
SET 
    features = '{"analytics": "advanced", "support": "priority", "api_access": false, "custom_keywords": true, "max_ai_responses": 500}'
WHERE plan_name = 'Pro';

-- Update Enterprise plan
UPDATE public.subscription_plans 
SET 
    features = '{"analytics": "full", "support": "24/7", "api_access": true, "custom_integrations": true, "max_ai_responses": 2000}'
WHERE plan_name = 'Enterprise';

-- Update Upgrade to Pro plan
UPDATE public.subscription_plans 
SET 
    features = '{"analytics": "advanced", "support": "priority", "api_access": false, "custom_keywords": true, "max_ai_responses": 500}'
WHERE plan_name = 'Upgrade to Pro';

-- Update Upgrade to Enterprise plan
UPDATE public.subscription_plans 
SET 
    features = '{"analytics": "full", "support": "24/7", "api_access": true, "custom_integrations": true, "max_ai_responses": 2000}'
WHERE plan_name = 'Upgrade to Enterprise';

-- Verify the updates
SELECT plan_name, features FROM public.subscription_plans ORDER BY plan_name;
