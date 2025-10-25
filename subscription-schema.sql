-- PostSpark Subscription Schema Extension
-- Digistore24 Integration

-- Subscription Plans Table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id SERIAL PRIMARY KEY,
    plan_name TEXT UNIQUE NOT NULL,
    plan_code TEXT UNIQUE NOT NULL,
    digistore_product_id TEXT UNIQUE NOT NULL,
    price_monthly INTEGER NOT NULL, -- in cents
    price_yearly INTEGER, -- in cents
    max_campaigns INTEGER NOT NULL,
    max_refreshes_per_campaign INTEGER NOT NULL,
    max_refreshes_per_month INTEGER NOT NULL,
    features JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Subscriptions Table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    plan_id INTEGER REFERENCES public.subscription_plans(id),
    digistore_order_id TEXT UNIQUE,
    digistore_transaction_id TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),
    billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscription Usage Tracking
CREATE TABLE IF NOT EXISTS public.subscription_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.user_subscriptions(id) ON DELETE CASCADE,
    usage_type TEXT NOT NULL CHECK (usage_type IN ('campaigns', 'refreshes', 'api_calls', 'ai_responses')),
    usage_count INTEGER DEFAULT 0,
    reset_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- IPN Logs for debugging
CREATE TABLE IF NOT EXISTS public.ipn_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    raw_data JSONB NOT NULL,
    event_type TEXT,
    order_id TEXT,
    user_id UUID REFERENCES public.users(id),
    processed BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert or update default subscription plans
INSERT INTO public.subscription_plans (plan_name, plan_code, digistore_product_id, price_monthly, max_campaigns, max_refreshes_per_campaign, max_refreshes_per_month, features) VALUES
('Starter', 'starter', '643746', 900, 1, 10, 10, '{"analytics": "basic", "support": "email", "api_access": false, "max_ai_responses": 100}'),
('Pro', 'pro', '643752', 1900, 5, 10, 50, '{"analytics": "advanced", "support": "priority", "api_access": false, "custom_keywords": true, "max_ai_responses": 500}'),
('Enterprise', 'enterprise', '643754', 4900, 10, 10, 150, '{"analytics": "full", "support": "24/7", "api_access": true, "custom_integrations": true, "max_ai_responses": 2000}')
ON CONFLICT (plan_name) DO UPDATE SET
    plan_code = EXCLUDED.plan_code,
    digistore_product_id = EXCLUDED.digistore_product_id,
    price_monthly = EXCLUDED.price_monthly,
    max_campaigns = EXCLUDED.max_campaigns,
    max_refreshes_per_campaign = EXCLUDED.max_refreshes_per_campaign,
    max_refreshes_per_month = EXCLUDED.max_refreshes_per_month,
    features = EXCLUDED.features;

-- Upgrade Products
INSERT INTO public.subscription_plans (plan_name, plan_code, digistore_product_id, price_monthly, max_campaigns, max_refreshes_per_campaign, max_refreshes_per_month, features, is_active) VALUES
('Upgrade to Pro', 'upgrade_pro', '1322890', 0, 5, 10, 50, '{"analytics": "advanced", "support": "priority", "api_access": false, "custom_keywords": true, "max_ai_responses": 500}', false),
('Upgrade to Enterprise', 'upgrade_enterprise', '1322889', 0, 10, 10, 150, '{"analytics": "full", "support": "24/7", "api_access": true, "custom_integrations": true, "max_ai_responses": 2000}', false)
ON CONFLICT (plan_name) DO UPDATE SET
    plan_code = EXCLUDED.plan_code,
    digistore_product_id = EXCLUDED.digistore_product_id,
    price_monthly = EXCLUDED.price_monthly,
    max_campaigns = EXCLUDED.max_campaigns,
    max_refreshes_per_campaign = EXCLUDED.max_refreshes_per_campaign,
    max_refreshes_per_month = EXCLUDED.max_refreshes_per_month,
    features = EXCLUDED.features,
    is_active = EXCLUDED.is_active;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_user_id ON public.subscription_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_type ON public.subscription_usage(usage_type);
CREATE INDEX IF NOT EXISTS idx_ipn_logs_order_id ON public.ipn_logs(order_id);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ipn_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_plans (public read)
DROP POLICY IF EXISTS "Anyone can view subscription plans" ON public.subscription_plans;
CREATE POLICY "Anyone can view subscription plans" ON public.subscription_plans
    FOR SELECT USING (is_active = true);

-- RLS Policies for user_subscriptions
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.user_subscriptions;
CREATE POLICY "Users can view own subscriptions" ON public.user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for subscription_usage
DROP POLICY IF EXISTS "Users can view own usage" ON public.subscription_usage;
CREATE POLICY "Users can view own usage" ON public.subscription_usage
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own usage" ON public.subscription_usage;
CREATE POLICY "Users can insert own usage" ON public.subscription_usage
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own usage" ON public.subscription_usage;
CREATE POLICY "Users can update own usage" ON public.subscription_usage
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for ipn_logs (admin only)
DROP POLICY IF EXISTS "Admin can view ipn logs" ON public.ipn_logs;
CREATE POLICY "Admin can view ipn logs" ON public.ipn_logs
    FOR SELECT USING (false); -- Only accessible via service role

-- Function to get user's current subscription
CREATE OR REPLACE FUNCTION public.get_user_subscription(user_uuid UUID)
RETURNS TABLE (
    subscription_id UUID,
    plan_name TEXT,
    plan_code TEXT,
    status TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    max_campaigns INTEGER,
    max_refreshes_per_campaign INTEGER,
    max_refreshes_per_month INTEGER,
    features JSONB
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
        sp.features
    FROM public.user_subscriptions us
    JOIN public.subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = user_uuid 
    AND us.status = 'active'
    AND (us.expires_at IS NULL OR us.expires_at > NOW())
    ORDER BY us.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can create campaign
CREATE OR REPLACE FUNCTION public.can_user_create_campaign(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_campaigns INTEGER;
    max_campaigns INTEGER;
    user_subscription RECORD;
BEGIN
    -- Get user's current subscription
    SELECT * INTO user_subscription FROM public.get_user_subscription(user_uuid);
    
    -- If no active subscription, return false
    IF user_subscription IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Get current campaign count
    SELECT COUNT(*) INTO current_campaigns
    FROM public.campaigns 
    WHERE user_id = user_uuid AND status = 'active';
    
    -- Check if user can create more campaigns
    RETURN current_campaigns < user_subscription.max_campaigns;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can refresh campaign
CREATE OR REPLACE FUNCTION public.can_user_refresh_campaign(user_uuid UUID, campaign_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_refreshes INTEGER;
    max_refreshes INTEGER;
    user_subscription RECORD;
BEGIN
    -- Get user's current subscription
    SELECT * INTO user_subscription FROM public.get_user_subscription(user_uuid);
    
    -- If no active subscription, return false
    IF user_subscription IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Get current refresh count for this campaign this month
    SELECT COALESCE(SUM(usage_count), 0) INTO current_refreshes
    FROM public.subscription_usage
    WHERE user_id = user_uuid 
    AND usage_type = 'refreshes'
    AND reset_date >= DATE_TRUNC('month', CURRENT_DATE);
    
    -- Check if user can refresh
    RETURN current_refreshes < user_subscription.max_refreshes_per_month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track usage
CREATE OR REPLACE FUNCTION public.track_subscription_usage(
    user_uuid UUID,
    usage_type_param TEXT,
    usage_count_param INTEGER DEFAULT 1
)
RETURNS VOID AS $$
DECLARE
    current_usage RECORD;
    subscription_id UUID;
BEGIN
    -- Get user's active subscription
    SELECT id INTO subscription_id
    FROM public.user_subscriptions
    WHERE user_id = user_uuid 
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- If no subscription, don't track
    IF subscription_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Get or create usage record
    SELECT * INTO current_usage
    FROM public.subscription_usage
    WHERE user_id = user_uuid 
    AND usage_type = usage_type_param
    AND reset_date = CURRENT_DATE;
    
    IF current_usage IS NULL THEN
        -- Create new usage record
        INSERT INTO public.subscription_usage (user_id, subscription_id, usage_type, usage_count)
        VALUES (user_uuid, subscription_id, usage_type_param, usage_count_param);
    ELSE
        -- Update existing usage record
        UPDATE public.subscription_usage
        SET usage_count = usage_count + usage_count_param,
            updated_at = NOW()
        WHERE id = current_usage.id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update users table to include subscription info
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE;

-- Function to update user subscription status
CREATE OR REPLACE FUNCTION public.update_user_subscription_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user's subscription status based on their active subscription
    UPDATE public.users 
    SET 
        subscription_status = CASE 
            WHEN NEW.status = 'active' THEN NEW.status
            ELSE 'none'
        END,
        subscription_expires_at = NEW.expires_at
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update user subscription status
DROP TRIGGER IF EXISTS update_user_subscription_trigger ON public.user_subscriptions;
CREATE TRIGGER update_user_subscription_trigger
    AFTER INSERT OR UPDATE ON public.user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_user_subscription_status();
