// Supabase Configuration
const SUPABASE_URL = window.VITE_SUPABASE_URL || 'https://ntutkssgqzqgmbvuwjqu.supabase.co';
const SUPABASE_ANON_KEY = window.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50dXRrc3NncXpxZ21idnV3anF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2NzIwODcsImV4cCI6MjA3NjI0ODA4N30.7sVEt76VK0INektXVqB5xsDnfQolW7Bzz0MeJ63CevE';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50dXRrc3NncXpxZ21idnV3anF1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDY3MjA4NywiZXhwIjoyMDc2MjQ4MDg3fQ.nDzSF1uVNVVhGOHIaIts-tKQLY_zOuB8u024W27pW_0';

// Initialize Supabase client
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Database Tables
const TABLES = {
    USERS: 'users',
    CAMPAIGNS: 'campaigns',
    POSTS: 'posts',
    COMMENTS: 'comments',
    ANALYTICS: 'analytics'
};

// Reddit API Configuration
const REDDIT_CONFIG = {
    CLIENT_ID: window.VITE_REDDIT_CLIENT_ID || 'xnfBBEUETLqctZnhAka0DA',
    CLIENT_SECRET: window.VITE_REDDIT_CLIENT_SECRET || 'uLXMyoHsE8uQyZGhYW3ZMpbJ65BdHA',
    REDIRECT_URI: window.VITE_REDDIT_REDIRECT_URI || 'http://localhost:8080',
    AUTH_URL: 'https://www.reddit.com/api/v1/authorize',
    TOKEN_URL: 'https://www.reddit.com/api/v1/access_token',
    API_BASE: 'https://oauth.reddit.com',
    SCOPES: 'identity submit edit read'
};

// OpenAI API Configuration
const OPENAI_CONFIG = {
    PROMPT_ID: 'pmpt_68f8d8289b30819581a9aa70a071dcfa0b01db2d8e8856af',
    VERSION: '3',
    API_KEY: window.VITE_OPENAI_API_KEY || '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'
};

window.REDDIT_CONFIG = REDDIT_CONFIG;
window.OPENAI_CONFIG = OPENAI_CONFIG;

// Export for use in other files
window.supabaseClient = supabaseClient;
window.TABLES = TABLES;
