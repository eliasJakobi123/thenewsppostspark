// Reddit API integration for finding real posts
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { campaignData } = req.body;
        const { businessName, offer, keywords } = campaignData;

        console.log('Reddit API search started:', {
            businessName,
            keywords: keywords.join(', '),
            offer: offer.substring(0, 100) + '...'
        });

        // Reddit API credentials from environment variables
        const clientId = process.env.VITE_REDDIT_CLIENT_ID;
        const clientSecret = process.env.VITE_REDDIT_CLIENT_SECRET;
        const userAgent = 'PostSpark/1.0 by PostSparkApp';

        if (!clientId || !clientSecret) {
            throw new Error('Reddit API credentials not configured');
        }

        // Get Reddit access token
        const tokenResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': userAgent
            },
            body: 'grant_type=client_credentials'
        });

        if (!tokenResponse.ok) {
            throw new Error(`Reddit auth failed: ${tokenResponse.status}`);
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        console.log('Reddit access token obtained');

        // Search for posts using Reddit API
        const posts = [];
        const subreddits = [
            'selfimprovement', 'motivation', 'productivity', 'lifehacks', 
            'mentalhealth', 'advice', 'AskReddit', 'getmotivated', 
            'DecidingToBeBetter', 'selfhelp', 'careeradvice', 'personalfinance'
        ];

        // Search in each subreddit
        for (const subreddit of subreddits) {
            try {
                // Create search query from keywords
                const searchQuery = keywords.join(' OR ');
                const searchUrl = `https://oauth.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(searchQuery)}&sort=relevance&limit=10&t=month`;

                console.log(`Searching r/${subreddit} for: ${searchQuery}`);

                const searchResponse = await fetch(searchUrl, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'User-Agent': userAgent
                    }
                });

                if (!searchResponse.ok) {
                    console.log(`Search failed for r/${subreddit}: ${searchResponse.status}`);
                    continue;
                }

                const searchData = await searchResponse.json();
                
                if (searchData.data && searchData.data.children) {
                    for (const post of searchData.data.children) {
                        const postData = post.data;
                        
                        // Filter out stickied posts and ads
                        if (postData.stickied || postData.promoted) continue;
                        
                        // Calculate relevance score based on keywords
                        const title = postData.title.toLowerCase();
                        const selftext = (postData.selftext || '').toLowerCase();
                        const combinedText = `${title} ${selftext}`;
                        
                        let relevanceScore = 0;
                        for (const keyword of keywords) {
                            if (combinedText.includes(keyword.toLowerCase())) {
                                relevanceScore += 20;
                            }
                        }
                        
                        // Boost score for posts asking for help
                        if (combinedText.includes('help') || combinedText.includes('advice') || 
                            combinedText.includes('struggling') || combinedText.includes('problem')) {
                            relevanceScore += 15;
                        }
                        
                        // Only include posts with decent relevance
                        if (relevanceScore >= 20) {
                            posts.push({
                                reddit_id: postData.id,
                                title: postData.title,
                                content: postData.selftext || '',
                                subreddit: `r/${subreddit}`,
                                score: Math.min(relevanceScore, 100),
                                created_at: new Date(postData.created_utc * 1000).toISOString(),
                                author: postData.author,
                                upvotes: postData.ups || 0,
                                comments: postData.num_comments || 0,
                                relevance_reason: `Found in r/${subreddit} with ${relevanceScore} relevance score`,
                                url: `https://reddit.com${postData.permalink}`
                            });
                        }
                    }
                }
                
                console.log(`Found ${posts.length} posts so far`);
                
            } catch (error) {
                console.error(`Error searching r/${subreddit}:`, error);
                continue;
            }
        }

        // Sort by relevance score and limit to 30 posts
        const sortedPosts = posts
            .sort((a, b) => b.score - a.score)
            .slice(0, 30);

        console.log(`Reddit API search completed: ${sortedPosts.length} posts found`);

        res.status(200).json({ posts: sortedPosts });

    } catch (error) {
        console.error('Error with Reddit search:', error);
        res.status(500).json({ error: error.message });
    }
}
