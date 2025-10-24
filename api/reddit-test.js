// Vercel API Route for Reddit token testing
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
        const { accessToken } = req.body;

        if (!accessToken) {
            return res.status(400).json({ error: 'Missing access token' });
        }

        console.log('Testing Reddit token validity...');

        // Test the token with Reddit API
        const response = await fetch('https://oauth.reddit.com/api/v1/me', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'User-Agent': 'PostSpark/1.0 (by Available-Rest2392)'
            }
        });

        console.log('Reddit API response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Reddit API error:', errorText);
            return res.status(response.status).json({ 
                error: 'Reddit API error', 
                details: errorText 
            });
        }

        const result = await response.json();
        console.log('Reddit token test successful');
        
        return res.status(200).json({ 
            success: true, 
            data: result 
        });

    } catch (error) {
        console.error('Error in reddit-test API:', error);
        return res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message 
        });
    }
}
