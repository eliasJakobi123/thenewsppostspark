// Set Environment Variables for local testing only
// Only set if not already set by Vercel environment variables
if (!window.VITE_SUPABASE_URL) {
    window.VITE_SUPABASE_URL = 'https://ntutkssgqzqgmbvuwjqu.supabase.co';
}
if (!window.VITE_SUPABASE_ANON_KEY) {
    window.VITE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50dXRrc3NncXpxZ21idnV3anF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2NzIwODcsImV4cCI6MjA3NjI0ODA4N30.7sVEt76VK0INektXVqB5xsDnfQolW7Bzz0MeJ63CevE';
}
if (!window.VITE_REDDIT_CLIENT_ID) {
    window.VITE_REDDIT_CLIENT_ID = 'xnfBBEUETLqctZnhAka0DA';
}
if (!window.VITE_REDDIT_CLIENT_SECRET) {
    window.VITE_REDDIT_CLIENT_SECRET = 'uLXMyoHsE8uQyZGhYW3ZMpbJ65BdHA';
}
if (!window.VITE_REDDIT_REDIRECT_URI) {
    window.VITE_REDDIT_REDIRECT_URI = 'http://localhost:8080';
}
if (!window.VITE_OPENAI_API_KEY) {
    // Add your OpenAI API key here for local development
    // In production, this should be set by Vercel environment variables
    window.VITE_OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY_HERE';
}
