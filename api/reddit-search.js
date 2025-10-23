// Reddit API integration for finding real posts
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { campaignData } = req.body;
        const { businessName, offer, keywords } = campaignData;
        
        // Ensure keywords is an array
        const searchKeywords = Array.isArray(keywords) ? keywords : [keywords || 'general'];

        console.log('Reddit API search started:', {
            businessName,
            keywords: searchKeywords.join(', '),
            offer: offer ? offer.substring(0, 100) + '...' : 'No offer provided'
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
            'DecidingToBeBetter', 'selfhelp', 'careeradvice', 'personalfinance',
            'entrepreneur', 'smallbusiness', 'startups', 'marketing',
            'business', 'freelance', 'work', 'jobs', 'careerguidance',
            'productivity', 'organization', 'timemanagement', 'goals',
            'habits', 'discipline', 'focus', 'mindfulness', 'meditation'
        ];

        // Search in each subreddit with higher limits
        for (const subreddit of subreddits) {
            try {
                // Create search query from keywords
                const searchQuery = searchKeywords.join(' OR ');
                const searchUrl = `https://oauth.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(searchQuery)}&sort=relevance&limit=25&t=all`;

                console.log(`Searching r/${subreddit} for: ${searchQuery} (limit: 25)`);

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
                    console.log(`Found ${searchData.data.children.length} posts in r/${subreddit}`);
                    
                    for (const post of searchData.data.children) {
                        const postData = post.data;
                        
                        // Filter out stickied posts and ads
                        if (postData.stickied || postData.promoted) continue;
                        
                        // Calculate relevance score based on keywords and offer
                        const title = postData.title.toLowerCase();
                        const selftext = (postData.selftext || '').toLowerCase();
                        const combinedText = `${title} ${selftext}`;
                        
                        let relevanceScore = 0;
                        
                        // Score based on keywords
                        for (const keyword of searchKeywords) {
                            if (combinedText.includes(keyword.toLowerCase())) {
                                relevanceScore += 25;
                            }
                        }
                        
                        // Score based on offer context (if available)
                        if (offer && offer !== 'No offer provided') {
                            const offerWords = offer.toLowerCase().split(' ');
                            for (const word of offerWords) {
                                if (word.length > 3 && combinedText.includes(word)) {
                                    relevanceScore += 10;
                                }
                            }
                        }
                        
                        // Boost score for posts asking for help or showing problems
                        if (combinedText.includes('help') || combinedText.includes('advice') || 
                            combinedText.includes('struggling') || combinedText.includes('problem') ||
                            combinedText.includes('question') || combinedText.includes('recommend') ||
                            combinedText.includes('stuck') || combinedText.includes('difficult') ||
                            combinedText.includes('challenge') || combinedText.includes('issue')) {
                            relevanceScore += 20;
                        }
                        
                        // Boost for posts showing buying intent or need for solutions
                        if (combinedText.includes('looking for') || combinedText.includes('need') ||
                            combinedText.includes('want') || combinedText.includes('seeking') ||
                            combinedText.includes('searching for') || combinedText.includes('trying to find') ||
                            combinedText.includes('best') || combinedText.includes('recommendations') ||
                            combinedText.includes('suggestions') || combinedText.includes('alternatives') ||
                            combinedText.includes('budget') || combinedText.includes('price') ||
                            combinedText.includes('cost') || combinedText.includes('worth it') ||
                            combinedText.includes('worth the money') || combinedText.includes('investment')) {
                            relevanceScore += 25;
                        }
                        
                        // Boost for motivation/life related posts
                        if (combinedText.includes('motivation') || combinedText.includes('motivated') ||
                            combinedText.includes('life') || combinedText.includes('personal') ||
                            combinedText.includes('improve') || combinedText.includes('better') ||
                            combinedText.includes('goal') || combinedText.includes('success')) {
                            relevanceScore += 15;
                        }
                        
                        // Lower threshold to get more posts
                        if (relevanceScore >= 5) {
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
                
                console.log(`Total posts found so far: ${posts.length}`);
                
                // Stop if we have enough posts
                if (posts.length >= 50) {
                    console.log('Reached target of 50+ posts, stopping search');
                    break;
                }
                
            } catch (error) {
                console.error(`Error searching r/${subreddit}:`, error);
                continue;
            }
        }

        // Sort by relevance score and limit to 50 posts
        const sortedPosts = posts
            .sort((a, b) => b.score - a.score)
            .slice(0, 50);

        console.log(`Reddit API search completed: ${sortedPosts.length} posts found`);

        res.status(200).json({ posts: sortedPosts });

    } catch (error) {
        console.error('Error with Reddit search:', error);
        res.status(500).json({ error: error.message });
    }
}
