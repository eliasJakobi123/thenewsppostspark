-- Fix RLS policies for subscription_usage table
-- Run this in Supabase SQL Editor

-- Add INSERT policy for subscription_usage
DROP POLICY IF EXISTS "Users can insert own usage" ON public.subscription_usage;
CREATE POLICY "Users can insert own usage" ON public.subscription_usage
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add UPDATE policy for subscription_usage
DROP POLICY IF EXISTS "Users can update own usage" ON public.subscription_usage;
CREATE POLICY "Users can update own usage" ON public.subscription_usage
    FOR UPDATE USING (auth.uid() = user_id);
