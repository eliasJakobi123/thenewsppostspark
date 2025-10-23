-- Add AI Response Styles table for storing user's AI response preferences
-- This table stores the AI response style settings for each campaign

CREATE TABLE IF NOT EXISTS public.ai_response_styles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
    tone TEXT DEFAULT 'friendly' CHECK (tone IN ('friendly', 'professional', 'casual', 'expert')),
    sales_strength INTEGER DEFAULT 2 CHECK (sales_strength >= 1 AND sales_strength <= 4),
    custom_offer TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure only one default style per user
    UNIQUE(user_id, is_default) DEFERRABLE INITIALLY DEFERRED
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_response_styles_user_id ON public.ai_response_styles(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_response_styles_campaign_id ON public.ai_response_styles(campaign_id);

-- Enable RLS
ALTER TABLE public.ai_response_styles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for AI Response Styles
DROP POLICY IF EXISTS "Users can view own AI response styles" ON public.ai_response_styles;
CREATE POLICY "Users can view own AI response styles" ON public.ai_response_styles
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own AI response styles" ON public.ai_response_styles;
CREATE POLICY "Users can insert own AI response styles" ON public.ai_response_styles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own AI response styles" ON public.ai_response_styles;
CREATE POLICY "Users can update own AI response styles" ON public.ai_response_styles
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own AI response styles" ON public.ai_response_styles;
CREATE POLICY "Users can delete own AI response styles" ON public.ai_response_styles
    FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_ai_response_styles_updated_at ON public.ai_response_styles;
CREATE TRIGGER update_ai_response_styles_updated_at BEFORE UPDATE ON public.ai_response_styles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to ensure only one default style per user
CREATE OR REPLACE FUNCTION public.ensure_single_default_ai_style()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting a new default style, unset all other default styles for this user
    IF NEW.is_default = TRUE THEN
        UPDATE public.ai_response_styles 
        SET is_default = FALSE 
        WHERE user_id = NEW.user_id 
        AND id != NEW.id 
        AND is_default = TRUE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to ensure only one default style per user
DROP TRIGGER IF EXISTS ensure_single_default_ai_style_trigger ON public.ai_response_styles;
CREATE TRIGGER ensure_single_default_ai_style_trigger
    BEFORE INSERT OR UPDATE ON public.ai_response_styles
    FOR EACH ROW EXECUTE FUNCTION public.ensure_single_default_ai_style();

