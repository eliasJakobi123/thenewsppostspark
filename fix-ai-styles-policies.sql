-- Fix AI Response Styles policies (drop existing ones first)
DROP POLICY IF EXISTS "Users can view own AI response styles" ON public.ai_response_styles;
DROP POLICY IF EXISTS "Users can insert own AI response styles" ON public.ai_response_styles;
DROP POLICY IF EXISTS "Users can update own AI response styles" ON public.ai_response_styles;
DROP POLICY IF EXISTS "Users can delete own AI response styles" ON public.ai_response_styles;

-- Create new policies
CREATE POLICY "Users can view own AI response styles" ON public.ai_response_styles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI response styles" ON public.ai_response_styles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AI response styles" ON public.ai_response_styles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own AI response styles" ON public.ai_response_styles
    FOR DELETE USING (auth.uid() = user_id);

