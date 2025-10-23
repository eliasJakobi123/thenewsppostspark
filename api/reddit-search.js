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
            // Core self-improvement and life
            'selfimprovement', 'motivation', 'productivity', 'lifehacks', 
            'mentalhealth', 'advice', 'AskReddit', 'getmotivated', 
            'DecidingToBeBetter', 'selfhelp', 'selfconfidence', 'life',
            'careeradvice', 'personalfinance', 'goals', 'habits', 
            'discipline', 'focus', 'mindfulness', 'meditation',
            
            // Health and fitness
            'fitness', 'loseit', 'gainit', 'bodybuilding', 'running',
            'gym', 'health', 'nutrition', 'keto', 'cooking',
            'recipes', 'food', 'weightloss', 'fitness', 'workout',
            
            // Business and career
            'entrepreneur', 'smallbusiness', 'startups', 'marketing',
            'business', 'freelance', 'work', 'jobs', 'careerguidance',
            'investing', 'stocks', 'cryptocurrency', 'bitcoin',
            
            // Technology and digital
            'technology', 'gadgets', 'android', 'iphone', 'apple',
            'programming', 'webdev', 'coding', 'software', 'computers',
            'gaming', 'pcgaming', 'gamedev', 'indiegaming',
            
            // Lifestyle and hobbies
            'travel', 'solotravel', 'backpacking', 'digitalnomad', 'wanderlust',
            'photography', 'art', 'design', 'music', 'listentothis',
            'books', 'booksuggestions', 'bookclub', 'reading', 'literature',
            'movies', 'television', 'netflix', 'streaming', 'entertainment',
            
            // Home and DIY
            'homeimprovement', 'DIY', 'woodworking', 'gardening', 'plants',
            'pets', 'dogs', 'cats', 'aquariums', 'reptiles',
            'cars', 'automotive', 'motorcycles', 'bicycling', 'cycling',
            
            // Relationships and social
            'relationships', 'dating', 'marriage', 'parenting', 'family',
            'socialskills', 'communication', 'friendship', 'loneliness',
            
            // Education and learning
            'education', 'college', 'university', 'studying', 'academic',
            'science', 'askscience', 'explainlikeimfive', 'todayilearned',
            'languagelearning', 'spanish', 'french', 'german',
            
            // News and current events
            'worldnews', 'news', 'politics', 'europe', 'canada',
            'unitedkingdom', 'australia', 'india', 'japan',
            
            // Entertainment and fun
            'funny', 'jokes', 'memes', 'dankmemes', 'wholesomememes',
            'showerthoughts', 'mildlyinfuriating', 'oddlysatisfying', 'perfectfit',
            'unpopularopinion', 'changemyview', 'amitheasshole',
            
            // Specialized communities
            'zen', 'buddhism', 'spirituality', 'meditation', 'mindfulness',
            'minimalism', 'simpleliving', 'frugal', 'budgeting',
            'cryptocurrency', 'bitcoin', 'ethereum', 'investing',
            'stocks', 'wallstreetbets', 'investing', 'personalfinance'
        ];

        // Search in each subreddit with higher limits
        for (const subreddit of subreddits) {
            try {
                // Create search query focusing on exact keyword matches
                const searchQuery = searchKeywords.join(' OR ');
                const searchUrl = `https://oauth.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(searchQuery)}&sort=relevance&limit=50&t=all`;

                console.log(`Searching r/${subreddit} for: ${searchQuery} (limit: 50)`);

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
                        
                        // Filter out stickied posts, ads, and reposts
                        if (postData.stickied || postData.promoted || 
                            postData.is_self === false || postData.crosspost_parent_list ||
                            postData.title.toLowerCase().includes('[removed]') ||
                            postData.title.toLowerCase().includes('[deleted]') ||
                            postData.selftext === '[removed]' || postData.selftext === '[deleted]') continue;
                        
                        // Calculate relevance score based on keywords and offer
                        const title = postData.title.toLowerCase();
                        const selftext = (postData.selftext || '').toLowerCase();
                        const combinedText = `${title} ${selftext}`;
                        
                        let relevanceScore = 0;
                        
                        // Score based on keywords - MUST match at least one keyword
                        let keywordMatches = 0;
                        for (const keyword of searchKeywords) {
                            const keywordLower = keyword.toLowerCase();
                            // Check for exact match
                            if (combinedText.includes(keywordLower)) {
                                keywordMatches++;
                                relevanceScore += 30;
                            } else {
                                // Check for partial matches (word parts)
                                const keywordWords = keywordLower.split(' ');
                                for (const word of keywordWords) {
                                    if (word.length > 3 && combinedText.includes(word)) {
                                        keywordMatches++;
                                        relevanceScore += 20; // Lower score for partial matches
                                        break;
                                    }
                                }
                            }
                        }
                        
                        // If no keywords match, skip this post entirely
                        if (keywordMatches === 0) {
                            console.log(`Post skipped - no keyword matches: "${postData.title.substring(0, 50)}..."`);
                            continue;
                        }
                        
                        // Score based on offer context (if available) - OPTIONAL for relevance
                        if (offer && offer !== 'No offer provided' && offer.trim() !== '') {
                            const offerWords = offer.toLowerCase().split(' ').filter(word => word.length > 3);
                            let offerMatches = 0;
                            
                            for (const word of offerWords) {
                                if (combinedText.includes(word)) {
                                    offerMatches++;
                                    relevanceScore += 20; // Lower weight for offer matches
                                }
                            }
                            
                            // OPTIONAL: Offer matches are nice but not required
                            if (offerMatches >= 1) {
                                relevanceScore += 10; // Bonus for offer matches
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
                        
                        // Boost for posts with engagement (comments, upvotes)
                        if (postData.num_comments > 5) relevanceScore += 10;
                        if (postData.ups > 10) relevanceScore += 5;
                        
                        // Boost for recent posts (within last 30 days)
                        const postDate = new Date(postData.created_utc * 1000);
                        const daysAgo = (Date.now() - postDate.getTime()) / (1000 * 60 * 60 * 24);
                        if (daysAgo < 30) relevanceScore += 10;
                        
                        // Very low threshold to find many posts
                        if (relevanceScore >= 20) {
                            console.log(`Post accepted - score: ${relevanceScore}, title: "${postData.title.substring(0, 50)}..."`);
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
                
                // Stop if we have enough high-quality posts
                if (posts.length >= 100) {
                    console.log('Reached target of 100+ high-quality posts, stopping search');
                    break;
                }
                
            } catch (error) {
                console.error(`Error searching r/${subreddit}:`, error);
                continue;
            }
        }

        // Sort by relevance score and limit to 100 high-quality posts
        const sortedPosts = posts
            .sort((a, b) => b.score - a.score)
            .slice(0, 100);

        console.log(`Reddit API search completed: ${sortedPosts.length} posts found`);

        res.status(200).json({ posts: sortedPosts });

    } catch (error) {
        console.error('Error with Reddit search:', error);
        res.status(500).json({ error: error.message });
    }
}


