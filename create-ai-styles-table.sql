-- Create AI Response Styles table
CREATE TABLE IF NOT EXISTS public.ai_response_styles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    tone TEXT DEFAULT 'friendly' CHECK (tone IN ('friendly', 'professional', 'casual', 'expert')),
    sales_strength INTEGER DEFAULT 2 CHECK (sales_strength >= 1 AND sales_strength <= 4),
    custom_offer TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ai_response_styles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own AI response styles" ON public.ai_response_styles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI response styles" ON public.ai_response_styles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AI response styles" ON public.ai_response_styles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own AI response styles" ON public.ai_response_styles
    FOR DELETE USING (auth.uid() = user_id);

