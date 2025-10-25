-- Clean Subscription Schema
-- Use this instead of the main subscription-schema.sql if there are syntax errors

-- Subscription Usage Tracking
CREATE TABLE IF NOT EXISTS public.subscription_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.user_subscriptions(id) ON DELETE CASCADE,
    usage_type TEXT NOT NULL CHECK (usage_type IN ('campaigns', 'refreshes', 'ai_responses')),
    usage_count INTEGER DEFAULT 0,
    reset_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
