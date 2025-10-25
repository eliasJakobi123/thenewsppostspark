-- Give Enterprise Plan to testtest@test.com
-- This script assigns the Enterprise subscription plan to the specified user

-- First, get the user ID for the email
DO $$
DECLARE
    user_uuid UUID;
    enterprise_plan_id INTEGER;
BEGIN
    -- Get user ID from auth.users table
    SELECT id INTO user_uuid 
    FROM auth.users 
    WHERE email = 'testtest@test.com';
    
    IF user_uuid IS NULL THEN
        RAISE NOTICE 'User with email testtest@test.com not found';
        RETURN;
    END IF;
    
    -- Get Enterprise plan ID
    SELECT id INTO enterprise_plan_id 
    FROM public.subscription_plans 
    WHERE plan_name = 'Enterprise';
    
    IF enterprise_plan_id IS NULL THEN
        RAISE NOTICE 'Enterprise plan not found';
        RETURN;
    END IF;
    
    -- Insert or update user subscription
    INSERT INTO public.user_subscriptions (
        user_id,
        plan_id,
        status,
        started_at,
        expires_at,
        created_at,
        updated_at
    ) VALUES (
        user_uuid,
        enterprise_plan_id,
        'active',
        NOW(),
        NOW() + INTERVAL '1 year',
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
        plan_id = enterprise_plan_id,
        status = 'active',
        started_at = NOW(),
        expires_at = NOW() + INTERVAL '1 year',
        updated_at = NOW();
    
    -- Initialize usage tracking for the user
    INSERT INTO public.subscription_usage (
        user_id,
        subscription_id,
        usage_type,
        usage_count,
        reset_date,
        created_at,
        updated_at
    ) VALUES 
        (user_uuid, (SELECT id FROM public.user_subscriptions WHERE user_id = user_uuid), 'campaigns', 0, CURRENT_DATE + INTERVAL '1 month', NOW(), NOW()),
        (user_uuid, (SELECT id FROM public.user_subscriptions WHERE user_id = user_uuid), 'refreshes', 0, CURRENT_DATE + INTERVAL '1 month', NOW(), NOW()),
        (user_uuid, (SELECT id FROM public.user_subscriptions WHERE user_id = user_uuid), 'ai_responses', 0, CURRENT_DATE + INTERVAL '1 month', NOW(), NOW())
    ON CONFLICT (user_id, usage_type) 
    DO UPDATE SET
        usage_count = 0,
        reset_date = CURRENT_DATE + INTERVAL '1 month',
        updated_at = NOW();
    
    RAISE NOTICE 'Successfully assigned Enterprise plan to user %', user_uuid;
    
END $$;
