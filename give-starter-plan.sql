-- Give Starter Plan to User
-- Run this script in Supabase SQL Editor

-- First, get the user ID for the email
DO $$
DECLARE
    user_uuid UUID;
    plan_id INTEGER;
    expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get user ID by email
    SELECT id INTO user_uuid 
    FROM auth.users 
    WHERE email = 'cwe@gmail.com';
    
    IF user_uuid IS NULL THEN
        RAISE EXCEPTION 'User with email cwe@gmail.com not found';
    END IF;
    
    -- Get starter plan ID
    SELECT id INTO plan_id 
    FROM public.subscription_plans 
    WHERE plan_code = 'starter';
    
    IF plan_id IS NULL THEN
        RAISE EXCEPTION 'Starter plan not found';
    END IF;
    
    -- Set expiration date to 1 month from now
    expires_at := NOW() + INTERVAL '1 month';
    
    -- Check if user already has a subscription
    IF EXISTS (SELECT 1 FROM public.user_subscriptions WHERE user_id = user_uuid AND status = 'active') THEN
        -- Update existing subscription
        UPDATE public.user_subscriptions 
        SET 
            plan_id = plan_id,
            status = 'active',
            expires_at = expires_at,
            updated_at = NOW()
        WHERE user_id = user_uuid AND status = 'active';
        
        RAISE NOTICE 'Updated existing subscription for user %', user_uuid;
    ELSE
        -- Create new subscription
        INSERT INTO public.user_subscriptions (
            user_id,
            plan_id,
            digistore_order_id,
            digistore_transaction_id,
            status,
            billing_cycle,
            started_at,
            expires_at,
            created_at,
            updated_at
        ) VALUES (
            user_uuid,
            plan_id,
            'DEV_STARTER_' || EXTRACT(EPOCH FROM NOW())::TEXT,
            'DEV_TXN_' || EXTRACT(EPOCH FROM NOW())::TEXT,
            'active',
            'monthly',
            NOW(),
            expires_at,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Created new subscription for user %', user_uuid;
    END IF;
    
    -- Update user's subscription status
    UPDATE public.users 
    SET 
        subscription_status = 'active',
        subscription_expires_at = expires_at,
        updated_at = NOW()
    WHERE id = user_uuid;
    
    RAISE NOTICE 'Starter plan successfully assigned to user %', user_uuid;
    
END $$;

-- Verify the subscription was created
SELECT 
    u.email,
    u.subscription_status,
    u.subscription_expires_at,
    sp.plan_name,
    sp.plan_code,
    us.status as subscription_status,
    us.expires_at
FROM public.users u
JOIN public.user_subscriptions us ON u.id = us.user_id
JOIN public.subscription_plans sp ON us.plan_id = sp.id
WHERE u.email = 'cwe@gmail.com';
