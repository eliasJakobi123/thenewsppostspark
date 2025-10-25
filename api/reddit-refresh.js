// Vercel API Route for Reddit token refresh
export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ error: 'Missing refresh token' });
        }

        console.log('Refreshing Reddit token...');

        // Reddit API credentials from environment variables
        const clientId = process.env.VITE_REDDIT_CLIENT_ID;
        const clientSecret = process.env.VITE_REDDIT_CLIENT_SECRET;
        const userAgent = 'PostSpark/1.0 by PostSparkApp';

        if (!clientId || !clientSecret) {
            throw new Error('Reddit API credentials not configured');
        }

        // Refresh the token with Reddit API
        const response = await fetch('https://www.reddit.com/api/v1/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
                'User-Agent': userAgent
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken
            })
        });

        console.log('Token refresh response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Token refresh error:', errorText);
            return res.status(response.status).json({ 
                error: 'Token refresh failed', 
                details: errorText 
            });
        }

        const result = await response.json();
        console.log('Token refresh successful');
        
        return res.status(200).json({ 
            success: true, 
            data: result 
        });

    } catch (error) {
        console.error('Error in reddit-refresh API:', error);
        return res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message 
        });
    }
}
