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

        console.log('Reddit comment request:', { 
            postId, 
            commentText: commentText.substring(0, 50) + '...',
            accessTokenLength: accessToken.length,
            accessTokenPrefix: accessToken.substring(0, 10) + '...'
        });

        // First, test the token with a simple API call
        console.log('Testing Reddit token validity...');
        const testResponse = await fetch('https://oauth.reddit.com/api/v1/me', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'User-Agent': 'PostSpark/1.0 (by Available-Rest2392)'
            }
        });

        console.log('Token test response status:', testResponse.status);
        
        if (!testResponse.ok) {
            const testErrorText = await testResponse.text();
            console.error('Token test failed:', testErrorText);
            return res.status(401).json({ 
                error: 'Invalid Reddit token', 
                details: testErrorText,
                suggestion: 'Please reconnect your Reddit account'
            });
        }

        // Check if token has required scopes
        const userInfo = await testResponse.json();
        console.log('User info:', userInfo);
        
        // Check token scopes by making a request to get token info
        console.log('Checking token scopes...');
        const scopeResponse = await fetch('https://oauth.reddit.com/api/v1/me', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'User-Agent': 'PostSpark/1.0'
            }
        });
        
        if (!scopeResponse.ok) {
            console.error('Scope check failed');
        }

        console.log('Token is valid, proceeding with comment...');

        // Make request to Reddit API - using correct endpoint
        console.log('Making comment request to Reddit API...');
        console.log('Request details:', {
            url: 'https://oauth.reddit.com/api/comment',
            postId: postId,
            commentLength: commentText.length
        });
        
        const response = await fetch('https://oauth.reddit.com/api/comment', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'PostSpark/1.0 (by Available-Rest2392)'
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
            
            // Check if it's a scope/permission issue
            if (response.status === 403) {
                return res.status(403).json({ 
                    error: 'Insufficient permissions', 
                    details: errorText,
                    status: response.status,
                    suggestion: 'Your Reddit account is connected but lacks comment permissions. Please reconnect to grant these permissions.',
                    autoReconnect: false,
                    reason: 'missing_comment_scopes'
                });
            }
            
            return res.status(response.status).json({ 
                error: 'Reddit API error', 
                details: errorText,
                status: response.status
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
