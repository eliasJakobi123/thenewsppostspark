// Vercel API Route for Reddit commenting
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
        const { accessToken, postId, commentText } = req.body;

        if (!accessToken || !postId || !commentText) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        console.log('Reddit comment request:', { postId, commentText: commentText.substring(0, 50) + '...' });

        // Make request to Reddit API
        const response = await fetch('https://oauth.reddit.com/api/comment', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'PostSpark/1.0'
            },
            body: new URLSearchParams({
                thing_id: postId,
                text: commentText,
                api_type: 'json'
            })
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
        console.log('Reddit comment posted successfully');
        
        return res.status(200).json({ 
            success: true, 
            data: result 
        });

    } catch (error) {
        console.error('Error in reddit-comment API:', error);
        return res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message 
        });
    }
}
