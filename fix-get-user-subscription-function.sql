-- Fix get_user_subscription function to include digistore_order_id
-- This allows the upgrade URL to use the real order ID instead of placeholder

-- Drop the existing function first (PostgreSQL requires this when changing return type)
DROP FUNCTION IF EXISTS public.get_user_subscription(UUID);

-- Create the function with the new return type
CREATE FUNCTION public.get_user_subscription(user_uuid UUID)
RETURNS TABLE (
    subscription_id UUID,
    plan_name TEXT,
    plan_code TEXT,
    status TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    max_campaigns INTEGER,
    max_refreshes_per_campaign INTEGER,
    max_refreshes_per_month INTEGER,
    features JSONB,
    digistore_order_id TEXT,
    digistore_transaction_id TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        us.id,
        sp.plan_name,
        sp.plan_code,
        us.status,
        us.expires_at,
        sp.max_campaigns,
        sp.max_refreshes_per_campaign,
        sp.max_refreshes_per_month,
        sp.features,
        us.digistore_order_id,
        us.digistore_transaction_id
    FROM public.user_subscriptions us
    JOIN public.subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = user_uuid 
    AND us.status = 'active'
    AND (us.expires_at IS NULL OR us.expires_at > NOW())
    ORDER BY us.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
