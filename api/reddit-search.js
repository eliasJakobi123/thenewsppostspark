// Helper function to extract topics/themes from text
function extractTopics(text) {
    const topics = [];
    const lowerText = text.toLowerCase();
    
    // Topic mapping for thematic relevance
    const topicMap = {
        'productivity': ['productivity', 'efficient', 'time management', 'organization', 'workflow', 'automation'],
        'marketing': ['marketing', 'advertising', 'promotion', 'brand', 'campaign', 'social media', 'seo'],
        'business': ['business', 'company', 'startup', 'entrepreneur', 'revenue', 'profit', 'growth'],
        'design': ['design', 'graphic', 'logo', 'visual', 'creative', 'art', 'branding'],
        'development': ['code', 'develop', 'programming', 'tech', 'software', 'build', 'app'],
        'finance': ['finance', 'money', 'budget', 'investment', 'cost', 'revenue', 'profit'],
        'health': ['health', 'fitness', 'workout', 'exercise', 'diet', 'nutrition', 'wellness'],
        'education': ['education', 'learning', 'course', 'training', 'skill', 'study', 'tutorial'],
        'communication': ['communication', 'email', 'message', 'chat', 'social', 'contact'],
        'management': ['management', 'leadership', 'team', 'project', 'task', 'coordination'],
        'analytics': ['analytics', 'data', 'metrics', 'reporting', 'insights', 'tracking'],
        'sales': ['sales', 'selling', 'customer', 'client', 'lead', 'conversion', 'revenue', 'outreach', 'prospecting', 'cold call', 'cold email'],
        'lead_generation': ['lead generation', 'lead finder', 'prospecting', 'finding leads', 'lead hunting', 'prospect discovery'],
        'outreach': ['outreach', 'cold outreach', 'cold email', 'cold calling', 'prospecting', 'initial contact', 'first contact']
    };
    
    for (const [topic, keywords] of Object.entries(topicMap)) {
        for (const keyword of keywords) {
            if (lowerText.includes(keyword)) {
                topics.push(topic);
                break; // Avoid duplicates
            }
        }
    }
    
    return [...new Set(topics)]; // Remove duplicates
}

// Helper function to check if topics are related
function areRelatedTopics(topic1, topic2) {
    const relatedTopics = {
        'business': ['marketing', 'finance', 'management', 'sales'],
        'marketing': ['business', 'design', 'communication', 'analytics'],
        'development': ['design', 'productivity', 'management'],
        'finance': ['business', 'analytics', 'management'],
        'productivity': ['management', 'development', 'education'],
        'design': ['marketing', 'development', 'communication'],
        'communication': ['marketing', 'management', 'sales'],
        'analytics': ['finance', 'marketing', 'business'],
        'management': ['business', 'productivity', 'leadership'],
        'sales': ['marketing', 'business', 'communication'],
        'lead_generation': ['sales', 'marketing', 'business'],
        'outreach': ['sales', 'marketing', 'communication']
    };
    
    return relatedTopics[topic1]?.includes(topic2) || relatedTopics[topic2]?.includes(topic1) || false;
}

// Helper function to calculate thematic relevance
function calculateThematicRelevance(postText, offerText) {
    const postTopics = extractTopics(postText);
    const offerTopics = extractTopics(offerText);
    
    if (postTopics.length === 0 || offerTopics.length === 0) {
        return 0;
    }
    
    let relevance = 0;
    for (const postTopic of postTopics) {
        for (const offerTopic of offerTopics) {
            if (postTopic === offerTopic) {
                relevance += 0.5; // High relevance for exact match
            } else if (areRelatedTopics(postTopic, offerTopic)) {
                relevance += 0.3; // Moderate relevance for related topics
            }
        }
    }
    
    return Math.min(relevance, 1.0);
}

// Helper function to extract semantic context from offer - DEEP ANALYSIS
function extractOfferContext(offerText) {
    const contextKeywords = [];
    const lowerOffer = offerText.toLowerCase();
    
    // Extract key nouns and important words from offer
    const importantWords = lowerOffer.match(/\b[a-z]{4,}\b/g) || [];
    contextKeywords.push(...importantWords);
    
    // Detect solution types with more context
    const solutionMap = {
        'app': ['app', 'application', 'mobile app', 'software', 'iphone', 'android', 'smartphone'],
        'software': ['software', 'tool', 'platform', 'solution', 'system', 'program'],
        'tool': ['tool', 'software', 'platform', 'solution', 'utility', 'instrument'],
        'service': ['service', 'help', 'support', 'assistance', 'consulting', 'coaching'],
        'course': ['course', 'learn', 'training', 'education', 'tutorial', 'class', 'lesson', 'skill'],
        'book': ['book', 'guide', 'resource', 'material', 'ebook', 'manual'],
        'saas': ['saas', 'software', 'platform', 'cloud', 'online', 'webapp', 'web application'],
        'website': ['website', 'site', 'web', 'online', 'webapp'],
        'plugin': ['plugin', 'extension', 'addon', 'widget'],
        'integration': ['integration', 'connect', 'sync', 'api', 'automation']
    };
    
    for (const [key, values] of Object.entries(solutionMap)) {
        if (lowerOffer.includes(key)) {
            contextKeywords.push(...values);
        }
    }
    
    // Detect problem/solution keywords with MORE variations
    const problemMap = {
        'productivity': ['productivity', 'productive', 'efficiency', 'efficient', 'time management', 'save time', 'faster'],
        'automate': ['automate', 'automatic', 'streamline', 'workflow', 'no manual', 'eliminate manual'],
        'track': ['track', 'tracking', 'monitor', 'monitoring', 'follow', 'watch', 'oversee'],
        'manage': ['manage', 'management', 'organize', 'organization', 'administer', 'coordinate'],
        'save': ['save', 'money', 'budget', 'cost', 'affordable', 'cheap', 'reduce cost', 'cut cost'],
        'grow': ['grow', 'growth', 'scale', 'expand', 'increase', 'boost'],
        'improve': ['improve', 'better', 'enhance', 'optimize', 'upgrade'],
        'learn': ['learn', 'learning', 'knowledge', 'skill', 'educate', 'understand'],
        'build': ['build', 'create', 'make', 'develop', 'construct'],
        'find': ['find', 'search', 'locate', 'discover'],
        'schedule': ['schedule', 'calendar', 'plan', 'organize time', 'time management'],
        'collaborate': ['collaborate', 'team', 'work together', 'share', 'cooperate'],
        'secure': ['secure', 'security', 'protect', 'safe', 'encrypt'],
        'backup': ['backup', 'save data', 'store', 'preserve'],
        'analyze': ['analyze', 'analysis', 'insight', 'report', 'data', 'metrics'],
        'communicate': ['communicate', 'message', 'chat', 'talk', 'contact'],
        'delegate': ['delegate', 'assign', 'outsource', 'hand off'],
        'focus': ['focus', 'concentrate', 'attention', 'distraction-free']
    };
    
    for (const [key, values] of Object.entries(problemMap)) {
        if (lowerOffer.includes(key)) {
            contextKeywords.push(...values);
        }
    }
    
    // Add specific industry/niche keywords if found
    const nicheMap = {
        'ecommerce': ['store', 'shop', 'sell', 'product', 'cart', 'checkout', 'inventory'],
        'marketing': ['marketing', 'promote', 'advertise', 'campaign', 'lead', 'customer'],
        'finance': ['finance', 'money', 'pay', 'invoice', 'billing', 'payment', 'transaction'],
        'health': ['health', 'fitness', 'workout', 'exercise', 'diet', 'nutrition', 'wellness'],
        'education': ['school', 'student', 'teacher', 'learn', 'study', 'exam', 'course'],
        'design': ['design', 'graphic', 'logo', 'visual', 'creative', 'art', 'brand'],
        'development': ['code', 'develop', 'programming', 'tech', 'software', 'build', 'deploy'],
        'customer service': ['customer', 'client', 'support', 'help', 'service', 'care'],
        'social media': ['social', 'media', 'instagram', 'facebook', 'twitter', 'linkedin', 'post'],
        'email': ['email', 'mail', 'send', 'message', 'newsletter', 'campaign'],
        'seo': ['seo', 'search', 'google', 'rank', 'traffic', 'visitor', 'organic'],
        'crm': ['crm', 'customer', 'relationship', 'manage', 'contact', 'database']
    };
    
    for (const [key, values] of Object.entries(nicheMap)) {
        if (lowerOffer.includes(key)) {
            contextKeywords.push(...values);
        }
    }
    
    return contextKeywords;
}

// Filter subreddits based on keyword and offer relevance
function filterSubredditsByRelevance(subreddits, keywords, offer) {
    const relevantSubreddits = [];
    const keywordLower = keywords.map(k => k.toLowerCase());
    const offerLower = offer ? offer.toLowerCase() : '';
    
    // Subreddit relevance mapping
    const subredditRelevance = {
        // Business & Entrepreneurship
        'business': ['business', 'company', 'startup', 'entrepreneur', 'marketing', 'sales', 'revenue', 'profit'],
        'startups': ['startup', 'founder', 'funding', 'investor', 'venture', 'scale', 'growth'],
        'entrepreneur': ['entrepreneur', 'business', 'startup', 'founder', 'success', 'money'],
        'smallbusiness': ['small business', 'local', 'owner', 'shop', 'store', 'service'],
        'marketing': ['marketing', 'advertising', 'promotion', 'brand', 'campaign', 'social media'],
        'digital_marketing': ['digital marketing', 'online', 'seo', 'ppc', 'email', 'content'],
        'ecommerce': ['ecommerce', 'online store', 'shopify', 'amazon', 'selling', 'products'],
        'dropship': ['dropship', 'dropshipping', 'supplier', 'inventory', 'fulfillment'],
        
        // Finance & Money
        'personalfinance': ['money', 'finance', 'budget', 'saving', 'investing', 'debt'],
        'financialindependence': ['fire', 'retirement', 'passive income', 'wealth', 'freedom'],
        'investing': ['investing', 'stocks', 'portfolio', 'returns', 'dividends'],
        'cryptocurrency': ['crypto', 'bitcoin', 'ethereum', 'blockchain', 'trading'],
        
        // Productivity & Self-Improvement
        'productivity': ['productivity', 'efficient', 'time management', 'organization', 'workflow'],
        'selfimprovement': ['self improvement', 'better', 'growth', 'development', 'skills'],
        'motivation': ['motivation', 'motivated', 'inspiration', 'drive', 'goals'],
        'lifehacks': ['life hacks', 'tips', 'tricks', 'efficiency', 'optimization'],
        
        // Health & Fitness
        'fitness': ['fitness', 'workout', 'exercise', 'gym', 'health', 'training'],
        'nutrition': ['nutrition', 'diet', 'food', 'healthy', 'eating', 'supplements'],
        'health': ['health', 'wellness', 'medical', 'doctor', 'treatment'],
        
        // Tech & Development
        'programming': ['programming', 'coding', 'developer', 'software', 'tech'],
        'webdev': ['web development', 'website', 'frontend', 'backend', 'full stack'],
        'saas': ['saas', 'software as a service', 'subscription', 'platform', 'app'],
        'nocode': ['no code', 'nocode', 'automation', 'tools', 'platform'],
        
        // Career & Work
        'careeradvice': ['career', 'job', 'work', 'profession', 'advancement'],
        'freelance': ['freelance', 'freelancing', 'contractor', 'gig', 'remote work'],
        'remotework': ['remote work', 'work from home', 'telecommute', 'distributed'],
        
        // Education & Learning
        'education': ['education', 'learning', 'study', 'course', 'training', 'skill'],
        'learnprogramming': ['learn programming', 'coding bootcamp', 'tutorial', 'course'],
        
        // Social Media & Content
        'socialmedia': ['social media', 'instagram', 'facebook', 'twitter', 'linkedin'],
        'youtube': ['youtube', 'video', 'content creation', 'channel', 'subscriber'],
        'contentcreators': ['content creator', 'influencer', 'creator', 'monetization'],
        
        // New Self-Improvement Subreddits
        'selfgrowth': ['self growth', 'personal development', 'improvement', 'better'],
        'improveyourself': ['improve yourself', 'self improvement', 'better', 'growth'],
        'selfdevelopment': ['self development', 'personal growth', 'improvement', 'skills'],
        'personalgrowth': ['personal growth', 'development', 'improvement', 'better'],
        'confidencebuilding': ['confidence', 'self confidence', 'self esteem', 'self worth'],
        'atomicHabits': ['habits', 'atomic habits', 'routine', 'discipline'],
        'mindset': ['mindset', 'mental', 'attitude', 'thinking'],
        'motivation': ['motivation', 'motivated', 'inspiration', 'drive'],
        'discipline': ['discipline', 'self discipline', 'willpower', 'control'],
        'productivity': ['productivity', 'efficient', 'time management', 'organization'],
        
        // New Business & Startup Subreddits
        'saasfounders': ['saas', 'founder', 'startup', 'software'],
        'saasgrowth': ['saas', 'growth', 'scaling', 'startup'],
        'startupgrowth': ['startup growth', 'scaling', 'expansion', 'growth'],
        'bootstrapstartups': ['bootstrap', 'startup', 'funding', 'self funded'],
        'startupmarketing': ['startup marketing', 'growth', 'acquisition', 'customers'],
        'venturecapital': ['venture capital', 'vc', 'funding', 'investment'],
        'angelinvesting': ['angel investor', 'funding', 'investment', 'startup'],
        'startupfunding': ['startup funding', 'investment', 'capital', 'money'],
        'productlaunch': ['product launch', 'launch', 'release', 'product'],
        'customersuccess': ['customer success', 'retention', 'satisfaction', 'support'],
        
        // New Fitness Subreddits
        'fitgoals': ['fitness goals', 'workout', 'exercise', 'training'],
        'bodytransformation': ['body transformation', 'fitness', 'weight loss', 'muscle'],
        'fitnessjourney': ['fitness journey', 'workout', 'exercise', 'progress'],
        'strengthtraining': ['strength training', 'weightlifting', 'powerlifting', 'muscle'],
        'musclebuilding': ['muscle building', 'hypertrophy', 'strength', 'gains'],
        'nutritiontips': ['nutrition', 'diet', 'food', 'healthy eating'],
        'workoutroutines': ['workout routine', 'exercise', 'training', 'fitness'],
        'fitnessscience': ['fitness science', 'exercise science', 'research', 'evidence'],
        
        // New Sports Subreddits
        'sportsdiscussion': ['sports', 'athletes', 'competition', 'performance'],
        'athletes': ['athletes', 'sports', 'performance', 'training'],
        'sportstraining': ['sports training', 'athletic training', 'performance', 'conditioning'],
        'sportsperformance': ['sports performance', 'athletic performance', 'training', 'conditioning'],
        'sportsscience': ['sports science', 'exercise science', 'research', 'performance'],
        'sportspsychology': ['sports psychology', 'mental training', 'mindset', 'performance'],
        'strengthandconditioning': ['strength and conditioning', 'athletic training', 'performance', 'fitness']
    };
    
    for (const subreddit of subreddits) {
        let relevanceScore = 0;
        
        // Check keyword matches in subreddit name
        for (const keyword of keywordLower) {
            if (subreddit.toLowerCase().includes(keyword)) {
                relevanceScore += 50; // High score for direct name match
            }
        }
        
        // Check offer context matches
        if (offerLower) {
            const offerWords = offerLower.split(' ').filter(word => word.length > 3);
            for (const word of offerWords) {
                if (subreddit.toLowerCase().includes(word)) {
                    relevanceScore += 40; // High score for offer match
                }
            }
        }
        
        // Check predefined relevance mapping
        if (subredditRelevance[subreddit]) {
            for (const relevantTerm of subredditRelevance[subreddit]) {
                for (const keyword of keywordLower) {
                    if (relevantTerm.includes(keyword) || keyword.includes(relevantTerm)) {
                        relevanceScore += 30;
                    }
                }
                
                if (offerLower && relevantTerm.split(' ').some(term => offerLower.includes(term))) {
                    relevanceScore += 25;
                }
            }
        }
        
        // Include subreddits with minimal relevance to keywords (very inclusive)
        if (relevanceScore >= 5) { // Further reduced to be very inclusive
            relevantSubreddits.push(subreddit);
        }
    }
    
    // If no subreddits are relevant enough, return top 20 most general ones
    if (relevantSubreddits.length === 0) {
        const generalSubreddits = [
            'selfimprovement', 'productivity', 'motivation', 'business', 'entrepreneur',
            'smallbusiness', 'marketing', 'personalfinance', 'careeradvice', 'lifehacks',
            'advice', 'askreddit', 'life', 'success', 'goals', 'habits', 'discipline',
            'freelance', 'remotework', 'startups'
        ];
        return generalSubreddits.filter(sub => subreddits.includes(sub)).slice(0, 20);
    }
    
    return relevantSubreddits;
}

// Reddit API integration for finding real posts
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { campaignData } = req.body;
        const { businessName, offer, keywords } = campaignData;
        
        // Ensure keywords is an array and properly split
        let searchKeywords;
        if (Array.isArray(keywords)) {
            searchKeywords = keywords;
        } else if (typeof keywords === 'string') {
            // Split keywords by common separators and clean them
            searchKeywords = keywords
                .split(/[\s,;|]+/) // Split by space, comma, semicolon, pipe
                .map(k => k.trim())
                .filter(k => k.length > 0)
                .filter(k => k !== 'general');
            
            // If no valid keywords found, use the original string
            if (searchKeywords.length === 0) {
                searchKeywords = [keywords || 'general'];
            }
        } else {
            searchKeywords = ['general'];
        }
        
        console.log('Processed keywords:', searchKeywords);

        console.log('🔍 Reddit API search started:', {
            businessName,
            keywords: searchKeywords.join(', '),
            offer: offer ? offer.substring(0, 100) + '...' : 'No offer provided'
        });
        console.log('📊 Search parameters:', {
            keywordCount: searchKeywords.length,
            hasOffer: !!offer,
            offerLength: offer ? offer.length : 0
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
        let rateLimitHit = false;
        
        // Get relevant subreddits based on keywords and offer
        const allSubreddits = [
            // Core self-improvement and life
            'selfimprovement', 'motivation', 'productivity', 'lifehacks', 
            'mentalhealth', 'advice', 'getmotivated', 
            'DecidingToBeBetter', 'selfhelp', 'selfconfidence', 'life',
            'careeradvice', 'goals', 'habits', 
            'discipline', 'focus', 'mindfulness', 'meditation',
            
            // Health and fitness
            'health', 'nutrition', 'keto', 'cooking',
            'recipes', 'food',
            
            // Business and career
            'smallbusiness', 'marketing', 'business', 'freelance', 'work', 'careerguidance',
            'bitcoin',
            
            // Technology and digital
            'gadgets', 'android', 'iphone', 'apple',
            'programming', 'webdev', 'coding', 'software',
            'gamedev', 'indiegaming',
            
            // Lifestyle and hobbies
            'travel', 'solotravel', 'backpacking', 'wanderlust',
            'music', 'listentothis',
            'booksuggestions', 'bookclub', 'reading', 'literature',
            'television', 'netflix', 'streaming', 'entertainment',
            
            // Home and DIY
            'homeimprovement', 'woodworking', 'gardening', 'plants',
            'pets', 'dogs', 'cats', 'aquariums', 'reptiles',
            'cars', 'automotive', 'motorcycles', 'bicycling', 'cycling',
            
            // Relationships and social
            'relationships', 'dating', 'marriage', 'parenting', 'family',
            'socialskills', 'communication', 'friendship', 'loneliness',
            
            // Education and learning
            'education', 'college', 'university', 'studying', 'academic',
            'askscience', 'languagelearning', 'spanish', 'french', 'german',
            
            // News and current events
            'worldnews', 'news', 'politics', 'europe', 'canada',
            'unitedkingdom', 'australia', 'india', 'japan',
            
            // Entertainment and fun
            'jokes', 'dankmemes', 'wholesomememes',
            'showerthoughts', 'mildlyinfuriating', 'perfectfit',
            'unpopularopinion', 'changemyview', 'amitheasshole',
            
            // Specialized communities
            'zen', 'buddhism', 'spirituality',
            'minimalism', 'simpleliving', 'frugal', 'budgeting',
            'ethereum', 'wallstreetbets',
            
            // Allgemein & Unterhaltung
            'all', 'popular', 'AskReddit', 'todayilearned', 'funny', 'pics', 
            'mildlyinteresting', 'memes', 'interestingasfuck', 'movies',
            
            // Technologie & Wissenschaft
            'technology', 'science', 'Futurology', 'space', 'MachineLearning', 
            'ArtificialIntelligence', 'Computers', 'engineering', 'Physics', 'CryptoCurrency',
            
            // Wirtschaft, Finanzen & Karriere
            'investing', 'stocks', 'personalfinance', 'Entrepreneur', 'jobs', 
            'digitalnomad', 'startups', 'Economics',
            
            // Gaming
            'gaming', 'pcgaming', 'PlayStation', 'Xbox', 'NintendoSwitch', 
            'Steam', 'Games', 'LeagueOfLegends', 'Minecraft',
            
            // Kunst, Design & Kreatives
            'Art', 'Design', 'GraphicDesign', 'photography', 'illustration', 
            'DIY', 'crafts',
            
            // Wissen, Bildung & Diskussion
            'books', 'history', 'AskHistorians', 'explainlikeimfive', 
            'philosophy', 'education',
            
            // Bonus (zusätzlich nützlich & beliebt)
            'LifeProTips', 'NoStupidQuestions', 'OutOfTheLoop', 'YouShouldKnow', 
            'dataisbeautiful', 'MapPorn', 'Documentaries', 'IAmA', 
            'OldSchoolCool', 'nextfuckinglevel',
            
            // 🏋️‍♂️ Fitness, Gym & Bodybuilding
            'Fitness', 'bodybuilding', 'GymMotivation', 'fitnesscirclejerk', 'xxfitness',
            'progresspics', 'gainit', 'loseit', 'Calisthenics', 'weightroom',
            'powerlifting', 'StrongCurves', 'naturalbodybuilding', 'veganfitness',
            'Running', 'Crossfit', 'FitnessMotivation', 'Supplements', 'Flexibility', 'yoga',
            
            // 💪 Self-Confidence, Mental Health & Self-Improvement
            'selfimprovement', 'GetDisciplined', 'productivity', 'DecidingToBeBetter', 'NoFap',
            'Meditation', 'selfhelp', 'Anxiety', 'Depression', 'happiness',
            'Stoicism', 'ZenHabits', 'confidence', 'socialskills', 'mentalhealth',
            'therapy', 'Mindfulness', 'sleep', 'Success', 'psychology',
            
            // 🚀 Startups, Entrepreneurship & Business
            'startups', 'Entrepreneur', 'smallbusiness', 'business', 'SideProject',
            'EntrepreneurRideAlong', 'IndieHackers', 'StartupsCircle', 'growmybusiness', 'JustStart',
            'LeanStartup', 'startup_ideas', 'Business_Ideas', 'marketing', 'AskMarketing',
            'digital_marketing', 'ecommerce', 'dropship', 'Shopify', 'AffiliateMarketing',
            
            // 💸 Finance, Passive Income & Wealth
            'FinancialIndependence', 'passive_income', 'fire', 'leanfire', 'sidehustle',
            'EntrepreneurshipFinance', 'dividends', 'realestateinvesting', 'investing', 'PersonalFinance',
            'wallstreetbets', 'CryptoCurrency', 'ethtrader', 'Bitcoin', 'degens',
            'stocks', 'options', 'wealth', 'Money', 'Frugal',
            
            // 🌐 Social Media, Branding & Content Creation
            'socialmedia', 'Instagram', 'TikTok', 'YouTube', 'YouTubers',
            'ContentCreators', 'InfluencerMarketing', 'personalbranding', 'SocialMediaMarketing', 'marketingautomation',
            'SEO', 'copywriting', 'marketinghacks', 'emailmarketing', 'FacebookAds',
            'AdOps', 'RedditMarketing', 'GrowthHacking', 'CreatorSuccess', 'EntrepreneurMemes',
            
            // 🚀 BUSINESS & ENTREPRENEURSHIP (25 Subreddits)
            'business', 'startups', 'Entrepreneur', 'smallbusiness', 'IndieHackers',
            'EntrepreneurRideAlong', 'Business_Ideas', 'StartupIdeas', 'SideProject', 'JustStart',
            'StartupsCircle', 'LeanStartup', 'Founders', 'YoungEntrepreneurs', 'FemaleEntrepreneurs',
            'TechStartups', 'growmybusiness', 'startup', 'foundersclub', 'buildinpublic',
            'Productivity', 'BusinessIntelligence', 'consulting', 'startupfounders', 'EntrepreneurMemes',
            
            // 📈 MARKETING, SALES & BRANDING (25 Subreddits)
            'marketing', 'digital_marketing', 'marketinghacks', 'AskMarketing', 'ContentMarketing',
            'marketingautomation', 'GrowthHacking', 'advertising', 'Copywriting', 'SocialMediaMarketing',
            'SEO', 'emailmarketing', 'FacebookAds', 'AdOps', 'Branding',
            'personalbranding', 'InfluencerMarketing', 'ContentCreators', 'YouTube', 'YouTubers',
            'Instagram', 'TikTok', 'SocialMedia', 'marketingresearch', 'UXDesign',
            
            // 💡 BUSINESS MODELS, SIDE HUSTLES & E-COMMERCE (20 Subreddits)
            'dropship', 'Shopify', 'ecommerce', 'AffiliateMarketing', 'FBA',
            'PrintOnDemand', 'SideHustle', 'smallbusinessowners', 'EntrepreneurshipFinance', 'BusinessHub',
            'SaaS', 'NoCode', 'WebApps', 'LowCode', 'Passive_Income',
            'OnlineBusiness', 'Wealth', 'WorkOnline', 'MoneyMaking', 'solopreneur',
            
            // 💸 FINANCE, INVESTING & MONEY (30 Subreddits)
            'Finance', 'personalfinance', 'FinancialIndependence', 'fire', 'leanfire',
            'fatfire', 'SideHustleFinance', 'investing', 'stocks', 'options',
            'RealEstate', 'RealEstateInvesting', 'dividends', 'Bogleheads', 'CryptoCurrency',
            'Bitcoin', 'Ethereum', 'cryptomarkets', 'defi', 'NFT',
            'StockMarket', 'Robinhood', 'Money', 'Frugal', 'FinancialPlanning',
            'wealthbuilding', 'financialliteracy', 'Economics', 'wallstreetbets', 'ValueInvesting',
            
            // 🧠 SELF-IMPROVEMENT, CONFIDENCE & LIFE (25 Subreddits)
            'selfimprovement', 'GetDisciplined', 'DecidingToBeBetter', 'selfhelp', 'Success',
            'happiness', 'zenhabits', 'Stoicism', 'Meditation', 'Mindfulness',
            'psychology', 'socialskills', 'confidence', 'productivity', 'motivation',
            'lifehacks', 'discipline', 'habits', 'lifeprotips', 'NoFap',
            'Anxiety', 'MentalHealth', 'Depression', 'therapy', 'DecideToBeBetter',
            
            // 🏋️‍♂️ FITNESS, GYM & SPORTS (25 Subreddits)
            'Fitness', 'GymMotivation', 'Bodybuilding', 'xxfitness', 'powerlifting',
            'weightroom', 'progresspics', 'StrongCurves', 'gainit', 'loseit',
            'FitnessCircleJerk', 'Running', 'CrossFit', 'yoga', 'FitnessMotivation',
            'Calisthenics', 'Supplements', 'naturalbodybuilding', 'health', 'Nutrition',
            'diet', 'HealthyFood', 'Sports', 'boxing', 'MMA',
            
            // 🌍 LIFESTYLE, PRODUCTIVITY & HABITS (20 Subreddits)
            'simpleliving', 'minimalism', 'slowliving', 'decoration', 'coolguides',
            'NonZeroDay', 'digitalminimalism', 'smartHome', 'frugalmalefashion', 'life',
            'GetMotivated', 'DecentWork', 'meditationpractice', 'SelfDiscipline', 'LearnUselessTalents',
            'learnprogramming', 'study', 'ProductivityApps', 'organization', 'timeManagement',
            
            // 💻 TECH, STARTUP TOOLS & CREATOR ECONOMY (25 Subreddits)
            'InternetIsBeautiful', 'WebDev', 'SaaSStartups', 'Design', 'UI_Design',
            'UXResearch', 'EntrepreneurTech', 'ProductDesign', 'AppIdeas', 'Programming',
            'Coding', 'NoCodeDevs', 'EntrepreneurTools', 'DevOps', 'TechNews',
            'freelance', 'freelancers', 'remotework', 'DigitalNomad', 'WorkOnline',
            'WorkFromHome', 'CareerSuccess', 'Resume', 'jobs', 'ProductManagement',
            
            // 📚 EDUCATION, IDEAS & LEARNING (20 Subreddits)
            'explainlikeimfive', 'AskAcademia', 'AskHistorians', 'learnmath', 'LearnEnglish',
            'LearnSpanish', 'science', 'Futurology', 'DataIsBeautiful', 'AskReddit',
            'AskMen', 'AskWomen', 'DecidingToBeBetter', 'CasualConversation', 'OutOfTheLoop',
            'IWantToLearn', 'LearnUselessTalents', 'StudyTips', 'LearnPython', 'Education',
            
            // 🧭 MOTIVATION, MINDSET & SUCCESS (20 Subreddits)
            'GetMotivated', 'Motivation', 'SelfDiscipline', 'NoExcuses', 'Discipline',
            'GoalSetting', 'SuccessStories', 'EntrepreneurMindset', 'NonZeroDay', 'HardWorkPaysOff',
            'Mindset', 'Improvement', 'PersonalDevelopment', 'DeepWork', 'MotivationMonday',
            'MakeItHappen', 'LearnToGrow', 'Focus', 'DecideToBeBetter', 'LearnNewThings',
            
            // 🧩 OTHER USEFUL / META & NETWORKING (15 Subreddits)
            'RedditMarketing', 'Subreddit', 'ModHelp', 'FindAPath', 'EntrepreneurRideAlong',
            'TechBiz', 'FinanceCareer', 'StartupsForGood', 'RemoteJobs', 'WorkFromHome',
            'CareerGuidance', 'MoneyTalks', 'Philosophy', 'SelfReliance', 'LifeLessons',
            
            // 🧠 Self-Improvement, Self-Confidence & Motivation (50)
            'selfgrowth', 'ImproveYourself', 'SelfDevelopment', 'PersonalGrowth', 'BetterEveryLoop',
            'LearnMindset', 'MindsetMatters', 'PowerOfHabits', 'FocusOnGrowth', 'BuildBetterHabits',
            'ConfidenceTips', 'PersonalEvolution', 'LifeProgress', 'DisciplineDaily', 'GrowthDaily',
            'BetterHumans', 'WinStreak', 'MindUpgrade', 'LearnToChange', 'Positivity',
            'MentalToughness', 'GoalCrushers', 'MorningRoutine', 'Visualization', 'AtomicHabits',
            'ImproveDaily', 'LifeEngineering', 'BehavioralScience', 'BecomeBetter', 'Reflect',
            'GrowthMindset', 'MotivationStation', 'ImprovementPill', 'MindGym', 'DailyMotivation',
            'UpgradeHumans', 'SelfCare', 'InnerStrength', 'SelfWorth', 'SelfEsteem',
            'ConfidenceBuilding', 'BeYourBest', 'LearnDiscipline', 'SuccessDriven', 'WinningMindset',
            'SelfConfidenceTips', 'BetterMen', 'BetterWomen', 'PositivePsychology', 'BuildYourCharacter',
            'LifeOptimization',
            
            // 💼 Entrepreneurship, Startups, Marketing & Social Media (50)
            'StartupSuccess', 'MarketingMind', 'AdTech', 'BrandStrategy', 'MarketResearch',
            'EntrepreneurIdeas', 'CreativeBusiness', 'StartupGrowth', 'StartupMarketing', 'SaaSFounders',
            'SaaSgrowth', 'BootstrapStartups', 'Bootstrapped', 'SmallBiz', 'StartupTools',
            'CustomerSuccess', 'InfluencerHub', 'DigitalBusiness', 'OnlineMarketing', 'EmailMarketers',
            'MarketingProfs', 'StartUpLife', 'VentureCapital', 'AngelInvesting', 'StartupFunding',
            'StartupCommunity', 'StartupFounders', 'ProductLaunch', 'BusinessStrategy', 'BrandBuilders',
            'CMO', 'SocialSelling', 'SocialGrowth', 'LinkedInGrowth', 'SocialMediaTips',
            'TikTokGrowth', 'InstagramMarketing', 'CreatorEconomy', 'OnlineEntrepreneurs', 'DigitalCreators',
            'Podcasting', 'StartupMarketingTips', 'GrowthMarketers', 'AdsGrowth', 'SEOmarketing',
            'ContentCreatorsHub', 'Copywriters', 'BusinessGrowth', 'AdTechStartups', 'BrandingDesign',
            'StartupFoundersClub',
            
            // 🏋️‍♂️ Sport, Gym & Fitness (50)
            'FitAndNatural', 'FitGoals', 'LiftHeavy', 'Powerbuilding', 'FitTips',
            'BodyTransformation', 'FitnessJourney', 'HealthyLifting', 'StrengthTraining', 'FitLifestyle',
            'FunctionalFitness', 'EnduranceTraining', 'FitCouples', 'MuscleBuilding', 'Hypertrophy',
            'FitOver30', 'FitOver40', 'FitnessOver50', 'AthleticTraining', 'PerformanceTraining',
            'BodyweightFitness', 'StreetLifting', 'FitnessOverhaul', 'NutritionTips', 'TrainingAdvice',
            'GymWorkouts', 'GymLife', 'LiftingMotivation', 'FitnessRoutines', 'CoachAdvice',
            'FitnessScience', 'Conditioning', 'FitWomen', 'FitMen', 'WorkoutRoutines',
            'FitnessAddiction', 'FitCheck', 'FitnessLifestyle', 'FitnessJourneyMen', 'GymCulture',
            'PowerAthletes', 'FitnessGear', 'FitnessSupplements', 'WeightliftingWomen', 'MobilityTraining',
            'FunctionalMovement', 'FitLifeGoals', 'FitnessCommunity', 'SportsPerformance', 'AthleticRecovery',
            'FitTalk',
            
            // ⚽ Sports (General / Competitive / Teams / Analysis) (50)
            'SportsDiscussion', 'SportsNews', 'Athletes', 'SportsTraining', 'RunningShoeGeeks',
            'Football', 'Basketball', 'Baseball', 'Tennis', 'Cycling',
            'Swimming', 'Climbing', 'Hiking', 'Skiing', 'Snowboarding',
            'Soccer', 'AmericanFootball', 'NFL', 'NBA', 'NHL',
            'MLB', 'UFC', 'BoxingTalk', 'Golf', 'Cricket',
            'Formula1', 'Motorsports', 'MountainBiking', 'TrackAndField', 'Triathlon',
            'Rugby', 'MMAFights', 'FitnessAthletes', 'FantasyFootball', 'CollegeBasketball',
            'CollegeFootball', 'Esports', 'SportsBetting', 'RunningCommunity', 'FitnessForAthletes',
            'OutdoorSports', 'SportsTech', 'SportsMedicine', 'SportsAnalytics', 'Coaching',
            'SportsPsychology', 'SportsScience', 'AthleticPerformance', 'Referees', 'StrengthAndConditioning',
            
            // 💻 SaaS, Startups & App Development (Core Targets)
            'SaaS', 'SaaSStartups', 'SaaSgrowth', 'startups', 'Entrepreneur',
            'Startup_Ideas', 'IndieHackers', 'BuildInPublic', 'SideProject', 'BootstrapStartups',
            'StartupGrowth', 'startup', 'TechStartups', 'NoCode', 'LowCode',
            'NoCodeDevs', 'WebApps', 'ProductManagement', 'AppIdeas', 'Programming',
            'learnprogramming', 'SoftwareDevelopment', 'EntrepreneurRideAlong', 'SmallBusiness', 'OnlineBusiness',
            'ProductivityTools',
            
            // 📈 Marketing, Launch & Growth
            'GrowthHacking', 'marketing', 'digital_marketing', 'ContentMarketing', 'StartupMarketing',
            'SocialMediaMarketing', 'ProductHunt', 'EmailMarketing', 'LinkedInGrowth', 'AdOps',
            'Branding', 'Copywriting', 'SEO', 'MarketingMind', 'GrowthMarketers',
            'MarketResearch', 'Business_Ideas', 'OnlineMarketing', 'CustomerSuccess', 'SaaSMarketing',
            'CreatorEconomy', 'Podcasting', 'InfluencerMarketing', 'MarketingProfs', 'Advertising',
            
            // 🧩 Product Feedback, Validation & User Research
            'UserExperience', 'ProductDesign', 'UXDesign', 'UXResearch', 'UI_Design',
            'AppFeedback', 'EntrepreneurTools', 'AskMarketing', 'AskEntrepreneurs', 'AskStartup',
            'ProductLaunch', 'SideHustle', 'CodingHelp', 'learnUX', 'CustomerDevelopment',
            'ProductStrategy', 'ProductFeedback', 'ProductTesting', 'AppDev', 'Frontend',
            'WebDesign', 'DevOps', 'SoftwareEngineering', 'SmallBusinessOwners', 'TechBiz',
            
            // 💰 Funding, Monetization & Business Models
            'VentureCapital', 'AngelInvesting', 'BusinessModels', 'StartupFunding', 'SaaSMonetization',
            'BusinessStrategy', 'EntrepreneurFinance', 'LeanStartup', 'bootstrapping', 'Finance',
            'FinancialIndependence', 'OnlineEntrepreneurs', 'Passive_Income', 'EntrepreneurshipFinance', 'StartUpLife',
            'Consulting', 'WealthBuilding', 'StartupCommunity', 'Founders', 'FemaleFounders',
            'BusinessGrowth', 'RevenueModels', 'NoCodeStartups', 'SaaSFounders', 'InvestorStartups'
        ];
        
        // Filter subreddits based on keyword/offer relevance
        const relevantSubreddits = filterSubredditsByRelevance(allSubreddits, searchKeywords, offer);
        console.log(`Filtered to ${relevantSubreddits.length} relevant subreddits out of ${allSubreddits.length} total`);
        
        // Prioritize high-quality subreddits for better results
        const highQualitySubreddits = [
            'entrepreneur', 'startups', 'smallbusiness', 'marketing', 'digital_marketing',
            'saas', 'business', 'productivity', 'selfimprovement', 'motivation',
            'personalfinance', 'investing', 'freelance', 'remotework', 'careeradvice',
            'webdev', 'programming', 'nocode', 'growthhacking', 'sales'
        ];
        
        // Sort subreddits to prioritize high-quality ones first
        const prioritizedSubreddits = [
            ...relevantSubreddits.filter(sub => highQualitySubreddits.includes(sub)),
            ...relevantSubreddits.filter(sub => !highQualitySubreddits.includes(sub))
        ];
        
        console.log(`📊 Prioritized subreddits: ${prioritizedSubreddits.length} total (${prioritizedSubreddits.filter(sub => highQualitySubreddits.includes(sub)).length} high-quality)`);

        // Randomly shuffle relevant subreddits to get different results each time
        const shuffledSubreddits = relevantSubreddits.sort(() => Math.random() - 0.5);
        
        // Search in each relevant subreddit with higher limits - continue until we have at least 20 posts
        let postsFound = 0;
        const minPostsRequired = 20;
        let searchAttempts = 0;
        const maxSearchAttempts = 5; // Maximum 5 search attempts
        
        // Main search loop - retry until we have enough posts
        while (postsFound < minPostsRequired && searchAttempts < maxSearchAttempts) {
            searchAttempts++;
            console.log(`🔍 Search attempt ${searchAttempts}/${maxSearchAttempts} - Current posts: ${postsFound}/${minPostsRequired}`);
            
            // Reset posts for new search attempt
            if (searchAttempts > 1) {
                posts = [];
                console.log('🔄 Starting new search attempt with fresh posts array');
            }
            
            // Shuffle subreddits for each attempt to get different results
            const currentSubreddits = prioritizedSubreddits.sort(() => Math.random() - 0.5);
            
            for (const subreddit of currentSubreddits) {
                // Stop if we have enough posts
                if (postsFound >= minPostsRequired) {
                    console.log(`✅ Found ${postsFound} posts, stopping search`);
                    break;
                }
            try {
                // Create search query focusing on exact keyword matches
                // Add keyword variations to find different posts - MORE VARIATIONS
                const keywordVariations = [
                    ...searchKeywords,
                    ...searchKeywords.map(k => k + ' help'),
                    ...searchKeywords.map(k => k + ' advice'),
                    ...searchKeywords.map(k => k + ' tips'),
                    ...searchKeywords.map(k => k + ' guide'),
                    ...searchKeywords.map(k => k + ' recommendations'),
                    ...searchKeywords.map(k => k + ' tool'),
                    ...searchKeywords.map(k => k + ' software'),
                    ...searchKeywords.map(k => k + ' solution'),
                    ...searchKeywords.map(k => k + ' problem'),
                    ...searchKeywords.map(k => k + ' struggling'),
                    ...searchKeywords.map(k => k + ' need'),
                    ...searchKeywords.map(k => k + ' looking for'),
                    ...searchKeywords.map(k => k + ' best'),
                    ...searchKeywords.map(k => k + ' alternative')
                ];
                
                // Randomly select a subset of keywords for this search
                const selectedKeywords = keywordVariations
                    .sort(() => Math.random() - 0.5)
                    .slice(0, Math.min(3, keywordVariations.length));
                
                const searchQuery = selectedKeywords.join(' OR ');
                
                // Add time variation to get different results - prioritize recent posts
                const timeVariations = ['week', 'month', 'year', 'all', 'day'];
                const timeVariation = timeVariations[Math.floor(Math.random() * timeVariations.length)];
                
                // Add sort variation to get different results - prioritize relevance and hot
                const sortVariations = ['relevance', 'hot', 'new', 'top'];
                const sortVariation = sortVariations[Math.floor(Math.random() * sortVariations.length)];
                
                const searchUrl = `https://oauth.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(searchQuery)}&sort=${sortVariation}&limit=50&t=${timeVariation}`;

                console.log(`Searching r/${subreddit} for: ${searchQuery} (limit: 50)`);

                const searchResponse = await fetch(searchUrl, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'User-Agent': userAgent
                    }
                });

                if (!searchResponse.ok) {
                    if (searchResponse.status === 429) {
                        console.log(`Rate limit reached for r/${subreddit}, skipping...`);
                        rateLimitHit = true;
                        continue;
                    }
                    console.log(`Search failed for r/${subreddit}: ${searchResponse.status}`);
                    continue;
                }

                const searchData = await searchResponse.json();
                
                if (searchData.data && searchData.data.children) {
                    console.log(`Found ${searchData.data.children.length} posts in r/${subreddit}`);
                    
                    for (const post of searchData.data.children) {
                        const postData = post.data;
                        
                        // Enhanced filtering for better quality
                        const titleLower = postData.title.toLowerCase();
                        const contentLower = (postData.selftext || '').toLowerCase();
                        
                        // Filter out stickied posts, ads, reposts, and removed content
                        if (postData.stickied || postData.promoted || 
                            postData.is_self === false || postData.crosspost_parent_list ||
                            titleLower.includes('[removed]') || titleLower.includes('[deleted]') ||
                            contentLower === '[removed]' || contentLower === '[deleted]') continue;
                        
                        // Enhanced spam and irrelevant content detection
                        const spamKeywords = [
                            'spam', 'bot', 'test', 'ignore', 'delete', 'remove', 'fake',
                            'scam', 'phishing', 'virus', 'malware', 'clickbait', 'nsfw',
                            'nsfl', 'gore', 'violence', 'hate', 'racist', 'sexist',
                            'karma', 'upvote', 'downvote', 'repost', 'reposting'
                        ];
                        
                        // Job posting detection - exclude these
                        const jobKeywords = [
                            'job', 'hiring', 'recruiting', 'career', 'employment', 'position',
                            'salary', 'wage', 'benefits', 'full-time', 'part-time', 'contract',
                            'remote job', 'work from home', 'apply now', 'candidate', 'resume',
                            'cv', 'interview', 'application', 'linkedin', 'indeed', 'glassdoor',
                            'director', 'manager', 'senior', 'junior', 'entry level', 'executive',
                            'annual', 'hourly', 'compensation', 'bonus', 'equity', 'stock options'
                        ];
                        
                        // Academic/education posts - exclude these
                        const academicKeywords = [
                            'school', 'university', 'college', 'degree', 'master', 'phd',
                            'student', 'studying', 'graduated', 'gpa', 'gre', 'toefl',
                            'application', 'admission', 'enrollment', 'semester', 'course',
                            'professor', 'lecture', 'assignment', 'exam', 'thesis', 'dissertation',
                            'ivy league', 'mim programs', 'business school', 'mba'
                        ];
                        
                        const isSpam = spamKeywords.some(keyword => 
                            titleLower.includes(keyword) || contentLower.includes(keyword)
                        );
                        
                        // Check for job postings - exclude these
                        const isJobPost = jobKeywords.some(keyword => 
                            titleLower.includes(keyword) || contentLower.includes(keyword)
                        );
                        
                        // Check for academic posts - exclude these
                        const isAcademicPost = academicKeywords.some(keyword => 
                            titleLower.includes(keyword) || contentLower.includes(keyword)
                        );
                        
        // Quality checks - moderate quality posts
        const isLowQuality = (
            postData.title.length < 10 || // Moderate minimum title length
            (postData.selftext && postData.selftext.length < 20) || // Moderate minimum content length
            postData.ups < -5 || // Skip heavily downvoted posts
            postData.num_comments < -2 // Skip posts with very negative comments
        );
                        
                        // Skip if spam, job post, academic post, or low quality
                        if (isSpam || isJobPost || isAcademicPost || isLowQuality) {
                            const reason = isSpam ? 'spam' : isJobPost ? 'job post' : isAcademicPost ? 'academic post' : 'low quality';
                            console.log(`Post skipped - ${reason}: "${postData.title.substring(0, 50)}..."`);
                            continue;
                        }
                        
                        // Calculate relevance score based on keywords and offer
                        const title = postData.title.toLowerCase();
                        const selftext = (postData.selftext || '').toLowerCase();
                        const combinedText = `${title} ${selftext}`;
                        
                        let relevanceScore = 0;
                        
                        // Score based on keywords - MUST match at least one keyword
                        let keywordMatches = 0;
                        
                        // Add synonyms for common keywords - EXTENSIVE LIST
                        const keywordSynonyms = {
                            'self confidence': ['confidence', 'self-esteem', 'self esteem', 'self worth', 'self-worth', 'self belief', 'self-belief', 'self respect', 'self-respect', 'self assurance', 'self-assurance', 'self trust', 'self-trust'],
                            'self improvement': ['self improvement', 'self-improvement', 'personal development', 'self development', 'self-development', 'self growth', 'self-growth', 'personal growth', 'self help', 'self-help', 'self care', 'self-care', 'improvement', 'development', 'growth', 'better', 'enhancement'],
                            'apps': ['app', 'application', 'software', 'tool', 'platform', 'program', 'service', 'solution', 'system', 'product', 'utility', 'widget', 'extension', 'plugin', 'addon'],
                            'cold leads': ['leads', 'prospects', 'potential customers', 'potential clients', 'sales leads', 'business leads', 'customers', 'clients', 'buyers', 'targets', 'contacts', 'opportunities', 'suspects', 'qualified leads', 'unqualified leads'],
                            'outreach': ['contact', 'reach out', 'approach', 'connect', 'message', 'email', 'cold email', 'sales', 'communication', 'networking', 'engagement', 'follow up', 'follow-up', 'touch base', 'reach', 'contacting', 'messaging', 'emailing'],
                            'ai': ['artificial intelligence', 'automation', 'automated', 'smart', 'intelligent', 'machine learning', 'ml', 'chatbot', 'bot', 'assistant', 'algorithm', 'data science', 'predictive', 'analytics'],
                            'sales': ['selling', 'sales process', 'sales team', 'sales strategy', 'revenue', 'business development', 'business', 'marketing', 'commerce', 'trade', 'deal', 'transaction', 'conversion', 'closing', 'prospecting'],
                            'cold call': ['cold calling', 'phone calls', 'telemarketing', 'sales calls', 'prospecting', 'calling', 'phone', 'telephone', 'dialing', 'ringing', 'contacting by phone'],
                            'cold outreach': ['cold outreach', 'cold email', 'cold messaging', 'outreach', 'prospecting', 'lead generation', 'cold contact', 'initial contact', 'first contact'],
                            'lead finder': ['lead finder', 'lead generation', 'prospect finder', 'lead hunting', 'finding leads', 'lead discovery', 'prospect discovery', 'lead research'],
                            'sales ai': ['sales ai', 'sales automation', 'ai sales', 'automated sales', 'sales intelligence', 'ai prospecting', 'smart sales', 'intelligent sales'],
                            'tool': ['software', 'app', 'application', 'platform', 'service', 'solution', 'system', 'utility', 'instrument', 'device', 'gadget', 'resource', 'helper'],
                            'business': ['company', 'enterprise', 'organization', 'firm', 'corporation', 'startup', 'venture', 'operation', 'establishment', 'institution'],
                            'marketing': ['advertising', 'promotion', 'branding', 'campaign', 'strategy', 'outreach', 'communication', 'publicity', 'promotion', 'selling'],
                            'productivity': ['efficiency', 'performance', 'output', 'results', 'effectiveness', 'optimization', 'improvement', 'enhancement', 'streamlining'],
                            'management': ['leadership', 'administration', 'supervision', 'coordination', 'organization', 'control', 'oversight', 'governance', 'direction'],
                            'tracking': ['monitoring', 'following', 'watching', 'observing', 'recording', 'logging', 'measuring', 'analyzing', 'supervising'],
                            'automation': ['automatic', 'automated', 'streamlined', 'simplified', 'efficient', 'systematic', 'mechanical', 'robotic', 'self-operating'],
                            'analytics': ['data', 'metrics', 'statistics', 'insights', 'reports', 'analysis', 'measurement', 'tracking', 'monitoring'],
                            'integration': ['connection', 'linking', 'combining', 'merging', 'unifying', 'synchronizing', 'coordinating', 'unifying'],
                            'workflow': ['process', 'procedure', 'method', 'system', 'routine', 'operation', 'sequence', 'pipeline', 'chain'],
                            'team': ['group', 'crew', 'staff', 'employees', 'workers', 'members', 'personnel', 'colleagues', 'associates'],
                            'project': ['task', 'assignment', 'job', 'work', 'initiative', 'undertaking', 'endeavor', 'venture', 'campaign'],
                            'customer': ['client', 'buyer', 'user', 'consumer', 'patron', 'subscriber', 'member', 'account', 'contact'],
                            'revenue': ['income', 'earnings', 'profit', 'sales', 'money', 'cash', 'funds', 'returns', 'proceeds'],
                            'growth': ['expansion', 'increase', 'development', 'progress', 'advancement', 'improvement', 'enhancement', 'scaling'],
                            'strategy': ['plan', 'approach', 'method', 'tactic', 'technique', 'system', 'framework', 'roadmap', 'blueprint'],
                            'leadership': ['management', 'guidance', 'direction', 'supervision', 'administration', 'control', 'oversight', 'governance'],
                            'innovation': ['creativity', 'invention', 'development', 'advancement', 'progress', 'breakthrough', 'discovery', 'improvement'],
                            'efficiency': ['productivity', 'performance', 'effectiveness', 'optimization', 'streamlining', 'simplification', 'improvement'],
                            'collaboration': ['cooperation', 'partnership', 'teamwork', 'coordination', 'alliance', 'joint effort', 'working together'],
                            'communication': ['messaging', 'contact', 'interaction', 'correspondence', 'dialogue', 'conversation', 'exchange', 'connection'],
                            'data': ['information', 'facts', 'figures', 'statistics', 'metrics', 'insights', 'records', 'details', 'content'],
                            'technology': ['tech', 'software', 'hardware', 'digital', 'computer', 'system', 'platform', 'tool', 'solution'],
                            'startup': ['new business', 'venture', 'company', 'enterprise', 'firm', 'organization', 'initiative', 'project'],
                            'entrepreneur': ['founder', 'business owner', 'startup founder', 'innovator', 'creator', 'builder', 'developer', 'leader'],
                            'funding': ['investment', 'capital', 'money', 'financing', 'backing', 'support', 'funds', 'resources', 'budget'],
                            'scaling': ['growth', 'expansion', 'scaling up', 'increasing', 'expanding', 'growing', 'developing', 'advancing'],
                            'metrics': ['measurements', 'kpis', 'analytics', 'data', 'statistics', 'insights', 'reports', 'tracking', 'monitoring'],
                            'roi': ['return on investment', 'profit', 'revenue', 'earnings', 'returns', 'benefits', 'value', 'outcomes'],
                            'conversion': ['converting', 'transformation', 'change', 'turnover', 'shift', 'transition', 'transformation', 'change'],
                            'retention': ['keeping', 'maintaining', 'holding', 'preserving', 'sustaining', 'continuing', 'persisting', 'enduring'],
                            'acquisition': ['gaining', 'obtaining', 'getting', 'securing', 'attaining', 'achieving', 'winning', 'earning'],
                            'engagement': ['involvement', 'participation', 'interaction', 'connection', 'relationship', 'communication', 'contact', 'outreach'],
                            'optimization': ['improvement', 'enhancement', 'optimizing', 'refinement', 'tuning', 'adjustment', 'fine-tuning', 'perfection'],
                            'personalization': ['customization', 'tailoring', 'individualization', 'adaptation', 'modification', 'adjustment', 'customizing'],
                            'segmentation': ['categorization', 'classification', 'grouping', 'division', 'separation', 'organization', 'structuring'],
                            'targeting': ['focusing', 'aiming', 'directing', 'concentrating', 'specializing', 'narrowing', 'refining', 'precision'],
                            'campaign': ['initiative', 'project', 'program', 'effort', 'drive', 'push', 'movement', 'operation', 'strategy'],
                            'content': ['material', 'information', 'data', 'text', 'media', 'assets', 'resources', 'materials', 'substance'],
                            'social media': ['social', 'facebook', 'twitter', 'instagram', 'linkedin', 'youtube', 'tiktok', 'social networking', 'social platforms'],
                            'email': ['mail', 'message', 'correspondence', 'communication', 'newsletter', 'bulk email', 'email marketing', 'email campaign'],
                            'seo': ['search engine optimization', 'search', 'google', 'ranking', 'visibility', 'organic', 'search marketing', 'search optimization'],
                            'ppc': ['pay per click', 'paid advertising', 'advertising', 'ads', 'google ads', 'facebook ads', 'paid search', 'sponsored'],
                            'crm': ['customer relationship management', 'customer management', 'contact management', 'sales management', 'client management'],
                            'saas': ['software as a service', 'cloud software', 'web application', 'online software', 'subscription software', 'cloud service'],
                            'api': ['application programming interface', 'integration', 'connection', 'interface', 'bridge', 'link', 'connector'],
                            'dashboard': ['control panel', 'interface', 'overview', 'summary', 'report', 'analytics', 'monitoring', 'tracking'],
                            'reporting': ['reports', 'analytics', 'insights', 'data analysis', 'metrics', 'statistics', 'tracking', 'monitoring'],
                            'scheduling': ['planning', 'timing', 'calendar', 'agenda', 'timetable', 'planning', 'organization', 'coordination'],
                            'invoicing': ['billing', 'invoices', 'payments', 'accounts', 'financial', 'money', 'charges', 'fees'],
                            'accounting': ['bookkeeping', 'finance', 'financial', 'money management', 'budgeting', 'expenses', 'revenue', 'profit'],
                            'inventory': ['stock', 'products', 'goods', 'merchandise', 'supplies', 'materials', 'assets', 'items'],
                            'ecommerce': ['online store', 'online shop', 'online selling', 'digital commerce', 'online business', 'web store', 'online retail'],
                            'dropshipping': ['dropship', 'fulfillment', 'shipping', 'logistics', 'supply chain', 'inventory management', 'order fulfillment'],
                            'affiliate': ['affiliate marketing', 'partnership', 'commission', 'referral', 'partner program', 'affiliate program', 'referral program'],
                            'fba': ['fulfillment by amazon', 'amazon fba', 'amazon fulfillment', 'amazon selling', 'amazon business', 'amazon marketplace'],
                            'shopify': ['shopify store', 'shopify platform', 'ecommerce platform', 'online store builder', 'shopify business'],
                            'wordpress': ['wp', 'website builder', 'cms', 'content management', 'blog platform', 'website platform', 'web development'],
                            'web design': ['website design', 'web development', 'website creation', 'web building', 'site design', 'web layout', 'website development'],
                            'graphic design': ['design', 'visual design', 'creative design', 'artwork', 'graphics', 'visuals', 'creative work', 'design work'],
                            'logo design': ['logo', 'branding', 'brand design', 'identity', 'visual identity', 'brand logo', 'company logo'],
                            'copywriting': ['writing', 'content writing', 'marketing copy', 'sales copy', 'advertising copy', 'text writing', 'content creation'],
                            'video': ['video production', 'video creation', 'video marketing', 'video content', 'youtube', 'video editing', 'video making'],
                            'podcast': ['podcasting', 'audio', 'radio', 'broadcast', 'audio content', 'podcast production', 'audio show'],
                            'photography': ['photo', 'pictures', 'images', 'visual content', 'photo editing', 'image editing', 'photography services'],
                            'fitness': ['exercise', 'workout', 'training', 'gym', 'health', 'wellness', 'physical fitness', 'bodybuilding'],
                            'nutrition': ['diet', 'food', 'eating', 'healthy eating', 'meal planning', 'diet planning', 'nutritional advice'],
                            'meditation': ['mindfulness', 'relaxation', 'stress relief', 'mental health', 'wellness', 'calm', 'peace', 'tranquility'],
                            'yoga': ['yoga practice', 'yoga classes', 'yoga instruction', 'yoga training', 'yoga sessions', 'yoga exercises'],
                            'travel': ['traveling', 'trip', 'vacation', 'journey', 'adventure', 'exploration', 'tourism', 'traveling'],
                            'cooking': ['food preparation', 'recipe', 'culinary', 'kitchen', 'food', 'meal preparation', 'cooking skills'],
                            'gardening': ['planting', 'plants', 'garden', 'horticulture', 'landscaping', 'growing', 'cultivation', 'farming'],
                            'music': ['musical', 'audio', 'sound', 'song', 'melody', 'rhythm', 'musical instrument', 'music production'],
                            'art': ['artistic', 'creative', 'painting', 'drawing', 'sculpture', 'visual art', 'creative work', 'artistic expression'],
                            'writing': ['authoring', 'content creation', 'blogging', 'article writing', 'creative writing', 'text creation', 'content writing'],
                            'reading': ['books', 'literature', 'text', 'study', 'learning', 'education', 'knowledge', 'information'],
                            'language': ['linguistics', 'communication', 'speech', 'dialect', 'tongue', 'linguistic', 'language learning', 'language study'],
                            'education': ['learning', 'teaching', 'school', 'university', 'college', 'academic', 'educational', 'instruction'],
                            'training': ['learning', 'development', 'skill building', 'education', 'instruction', 'coaching', 'mentoring', 'guidance'],
                            'coaching': ['mentoring', 'guidance', 'advice', 'support', 'help', 'assistance', 'training', 'development'],
                            'consulting': ['advice', 'guidance', 'expertise', 'professional advice', 'business advice', 'consultation', 'expert guidance'],
                            'freelancing': ['freelance work', 'independent work', 'contract work', 'gig work', 'self-employed', 'freelance services'],
                            'remote work': ['work from home', 'telecommuting', 'virtual work', 'online work', 'remote job', 'home office', 'distributed work'],
                            'productivity apps': ['productivity tools', 'productivity software', 'efficiency apps', 'time management apps', 'organization apps'],
                            'time management': ['time tracking', 'scheduling', 'planning', 'organization', 'efficiency', 'productivity', 'time optimization'],
                            'project management': ['project planning', 'project coordination', 'project organization', 'project tracking', 'project control'],
                            'task management': ['task tracking', 'task organization', 'task planning', 'task coordination', 'task control', 'task monitoring'],
                            'note taking': ['notes', 'note keeping', 'documentation', 'recording', 'writing down', 'note organization', 'note management'],
                            'calendar': ['scheduling', 'planning', 'appointment', 'meeting', 'event', 'schedule management', 'time planning'],
                            'email management': ['email organization', 'email handling', 'email processing', 'email sorting', 'email filtering'],
                            'file management': ['file organization', 'file storage', 'file handling', 'document management', 'file system'],
                            'backup': ['data backup', 'file backup', 'system backup', 'data protection', 'data security', 'data preservation'],
                            'security': ['protection', 'safety', 'privacy', 'data security', 'cybersecurity', 'information security', 'system security'],
                            'privacy': ['data privacy', 'personal privacy', 'confidentiality', 'secrecy', 'protection', 'security', 'data protection'],
                            'compliance': ['regulatory compliance', 'legal compliance', 'policy compliance', 'standards compliance', 'regulation adherence'],
                            'audit': ['auditing', 'review', 'inspection', 'examination', 'assessment', 'evaluation', 'analysis', 'check'],
                            'testing': ['quality testing', 'software testing', 'product testing', 'performance testing', 'user testing', 'beta testing'],
                            'deployment': ['launch', 'release', 'rollout', 'implementation', 'installation', 'setup', 'configuration', 'activation'],
                            'maintenance': ['upkeep', 'support', 'servicing', 'repair', 'fixing', 'updating', 'upgrading', 'improvement'],
                            'support': ['help', 'assistance', 'customer support', 'technical support', 'service', 'aid', 'guidance', 'help desk'],
                            'documentation': ['documentation', 'documenting', 'recording', 'writing', 'note taking', 'documentation creation'],
                            'tutorial': ['guide', 'instruction', 'lesson', 'training', 'education', 'learning', 'teaching', 'how-to'],
                            'guide': ['instruction', 'manual', 'handbook', 'tutorial', 'walkthrough', 'step-by-step', 'directions', 'instructions'],
                            'manual': ['handbook', 'guide', 'instruction', 'documentation', 'reference', 'instructions', 'directions'],
                            'help': ['assistance', 'support', 'aid', 'guidance', 'advice', 'service', 'helping', 'supporting'],
                            'faq': ['frequently asked questions', 'questions', 'answers', 'help', 'support', 'information', 'guidance'],
                            'community': ['group', 'forum', 'discussion', 'network', 'social group', 'user group', 'community forum'],
                            'forum': ['discussion board', 'message board', 'community', 'discussion', 'chat', 'conversation', 'communication'],
                            'blog': ['blogging', 'article', 'post', 'content', 'writing', 'publishing', 'online content', 'web content'],
                            'website': ['site', 'web site', 'webpage', 'page', 'online presence', 'web presence', 'internet site'],
                            'domain': ['website domain', 'web domain', 'internet domain', 'url', 'web address', 'site address'],
                            'hosting': ['web hosting', 'server hosting', 'website hosting', 'domain hosting', 'web server', 'hosting service'],
                            'server': ['web server', 'hosting server', 'computer server', 'data server', 'application server', 'database server'],
                            'database': ['data storage', 'data management', 'data system', 'information storage', 'data repository', 'data collection'],
                            'cloud': ['cloud computing', 'cloud storage', 'cloud service', 'online storage', 'remote storage', 'cloud platform'],
                            'storage': ['data storage', 'file storage', 'information storage', 'data repository', 'storage system', 'storage solution'],
                            'bandwidth': ['data transfer', 'internet speed', 'connection speed', 'data capacity', 'network capacity', 'transfer rate'],
                            'ssl': ['security certificate', 'encryption', 'secure connection', 'https', 'security protocol', 'data encryption'],
                            'cdn': ['content delivery network', 'content distribution', 'global distribution', 'content acceleration', 'delivery network'],
                            'mobile': ['mobile app', 'mobile application', 'smartphone', 'phone app', 'mobile device', 'portable', 'handheld'],
                            'responsive': ['mobile friendly', 'mobile responsive', 'adaptive design', 'flexible design', 'mobile optimized'],
                            'seo friendly': ['search engine friendly', 'seo optimized', 'search optimized', 'google friendly', 'search engine optimized'],
                            'fast loading': ['quick loading', 'fast performance', 'speed optimization', 'performance optimization', 'fast website'],
                            'user friendly': ['easy to use', 'intuitive', 'simple', 'user-friendly', 'easy interface', 'simple design'],
                            'intuitive': ['user-friendly', 'easy to use', 'simple', 'straightforward', 'logical', 'natural', 'easy'],
                            'customizable': ['customizable', 'configurable', 'adjustable', 'flexible', 'adaptable', 'modifiable', 'personalizable'],
                            'scalable': ['expandable', 'growable', 'scalable', 'flexible', 'adaptable', 'extensible', 'expandable'],
                            'reliable': ['dependable', 'trustworthy', 'stable', 'consistent', 'reliable', 'secure', 'safe', 'solid'],
                            'secure': ['safe', 'protected', 'secure', 'encrypted', 'safe', 'protected', 'secure', 'safe'],
                            'affordable': ['cheap', 'inexpensive', 'budget-friendly', 'cost-effective', 'economical', 'low-cost', 'value'],
                            'premium': ['high-end', 'luxury', 'premium', 'top-quality', 'best', 'superior', 'excellent', 'outstanding'],
                            'free': ['no cost', 'complimentary', 'gratis', 'free of charge', 'at no cost', 'without charge', 'freebie'],
                            'trial': ['test', 'demo', 'sample', 'preview', 'trial period', 'test drive', 'try before buy'],
                            'demo': ['demonstration', 'preview', 'sample', 'trial', 'test', 'showcase', 'presentation'],
                            'subscription': ['subscription service', 'monthly service', 'recurring service', 'membership', 'subscription plan'],
                            'one-time': ['single payment', 'one payment', 'lump sum', 'single purchase', 'one-time purchase', 'single fee'],
                            'monthly': ['monthly payment', 'monthly fee', 'monthly subscription', 'per month', 'monthly cost'],
                            'annual': ['yearly', 'annual payment', 'yearly fee', 'annual subscription', 'per year', 'yearly cost'],
                            'lifetime': ['lifetime access', 'permanent access', 'forever access', 'lifetime license', 'permanent license'],
                            'unlimited': ['unlimited use', 'unlimited access', 'no limits', 'unrestricted', 'boundless', 'infinite'],
                            'limited': ['restricted', 'limited use', 'limited access', 'restricted use', 'limited features', 'basic'],
                            'basic': ['simple', 'basic', 'standard', 'essential', 'fundamental', 'core', 'primary'],
                            'advanced': ['pro', 'professional', 'expert', 'advanced', 'premium', 'sophisticated', 'complex'],
                            'enterprise': ['business', 'corporate', 'company', 'organization', 'large scale', 'business grade'],
                            'small business': ['small company', 'startup', 'small enterprise', 'local business', 'small organization'],
                            'startup': ['new business', 'new company', 'emerging business', 'startup company', 'new venture'],
                            'enterprise': ['large business', 'corporation', 'big company', 'large organization', 'enterprise company'],
                            'solo': ['individual', 'personal', 'single user', 'one person', 'individual use', 'personal use'],
                            'team': ['group', 'team', 'multiple users', 'collaborative', 'team use', 'group use'],
                            'multi-user': ['multiple users', 'team use', 'group use', 'shared use', 'collaborative use'],
                            'single user': ['individual use', 'personal use', 'one user', 'solo use', 'individual'],
                            'collaborative': ['team work', 'group work', 'collaboration', 'working together', 'team collaboration'],
                            'real-time': ['live', 'instant', 'immediate', 'real-time', 'current', 'up-to-date', 'live data'],
                            'offline': ['offline mode', 'offline access', 'no internet', 'local', 'offline use', 'disconnected'],
                            'online': ['online mode', 'online access', 'internet required', 'web-based', 'online use', 'connected'],
                            'sync': ['synchronization', 'syncing', 'sync', 'updating', 'refreshing', 'updating', 'refreshing'],
                            'backup': ['backup', 'backing up', 'data backup', 'file backup', 'system backup', 'data protection'],
                            'restore': ['restoration', 'restoring', 'recovery', 'recovering', 'restoring data', 'data recovery'],
                            'import': ['importing', 'bringing in', 'loading', 'uploading', 'transferring in', 'adding data'],
                            'export': ['exporting', 'sending out', 'downloading', 'transferring out', 'extracting data', 'saving data'],
                            'integrate': ['integration', 'connecting', 'linking', 'combining', 'merging', 'unifying', 'joining'],
                            'connect': ['connection', 'linking', 'joining', 'attaching', 'binding', 'associating', 'relating'],
                            'disconnect': ['disconnection', 'unlinking', 'separating', 'detaching', 'unbinding', 'disassociating'],
                            'link': ['linking', 'connecting', 'joining', 'attaching', 'binding', 'associating', 'relating'],
                            'unlink': ['unlinking', 'disconnecting', 'separating', 'detaching', 'unbinding', 'disassociating'],
                            'merge': ['merging', 'combining', 'joining', 'unifying', 'consolidating', 'integrating', 'blending'],
                            'split': ['splitting', 'dividing', 'separating', 'breaking apart', 'dividing up', 'separating out'],
                            'combine': ['combining', 'merging', 'joining', 'unifying', 'consolidating', 'integrating', 'blending'],
                            'separate': ['separating', 'dividing', 'splitting', 'breaking apart', 'dividing up', 'separating out'],
                            'filter': ['filtering', 'screening', 'sorting', 'refining', 'narrowing down', 'selecting', 'choosing'],
                            'sort': ['sorting', 'organizing', 'arranging', 'ordering', 'categorizing', 'classifying', 'grouping'],
                            'search': ['searching', 'finding', 'looking for', 'seeking', 'hunting', 'locating', 'discovering'],
                            'find': ['finding', 'locating', 'discovering', 'searching for', 'looking for', 'seeking', 'hunting'],
                            'locate': ['locating', 'finding', 'discovering', 'searching for', 'looking for', 'seeking', 'hunting'],
                            'discover': ['discovering', 'finding', 'locating', 'searching for', 'looking for', 'seeking', 'hunting'],
                            'create': ['creating', 'making', 'building', 'constructing', 'developing', 'generating', 'producing'],
                            'build': ['building', 'constructing', 'creating', 'making', 'developing', 'generating', 'producing'],
                            'make': ['making', 'creating', 'building', 'constructing', 'developing', 'generating', 'producing'],
                            'develop': ['developing', 'creating', 'building', 'constructing', 'making', 'generating', 'producing'],
                            'generate': ['generating', 'creating', 'building', 'constructing', 'making', 'developing', 'producing'],
                            'produce': ['producing', 'creating', 'building', 'constructing', 'making', 'developing', 'generating'],
                            'design': ['designing', 'creating', 'planning', 'developing', 'constructing', 'building', 'making'],
                            'plan': ['planning', 'designing', 'creating', 'developing', 'constructing', 'building', 'making'],
                            'organize': ['organizing', 'arranging', 'structuring', 'systematizing', 'coordinating', 'managing', 'administering'],
                            'arrange': ['arranging', 'organizing', 'structuring', 'systematizing', 'coordinating', 'managing', 'administering'],
                            'structure': ['structuring', 'organizing', 'arranging', 'systematizing', 'coordinating', 'managing', 'administering'],
                            'systematize': ['systematizing', 'organizing', 'arranging', 'structuring', 'coordinating', 'managing', 'administering'],
                            'coordinate': ['coordinating', 'organizing', 'arranging', 'structuring', 'systematizing', 'managing', 'administering'],
                            'manage': ['managing', 'organizing', 'arranging', 'structuring', 'systematizing', 'coordinating', 'administering'],
                            'administer': ['administering', 'managing', 'organizing', 'arranging', 'structuring', 'systematizing', 'coordinating'],
                            'control': ['controlling', 'managing', 'directing', 'governing', 'regulating', 'supervising', 'overseeing'],
                            'direct': ['directing', 'controlling', 'managing', 'governing', 'regulating', 'supervising', 'overseeing'],
                            'govern': ['governing', 'controlling', 'managing', 'directing', 'regulating', 'supervising', 'overseeing'],
                            'regulate': ['regulating', 'controlling', 'managing', 'directing', 'governing', 'supervising', 'overseeing'],
                            'supervise': ['supervising', 'controlling', 'managing', 'directing', 'governing', 'regulating', 'overseeing'],
                            'oversee': ['overseeing', 'controlling', 'managing', 'directing', 'governing', 'regulating', 'supervising'],
                            'monitor': ['monitoring', 'watching', 'observing', 'tracking', 'following', 'supervising', 'overseeing'],
                            'watch': ['watching', 'monitoring', 'observing', 'tracking', 'following', 'supervising', 'overseeing'],
                            'observe': ['observing', 'watching', 'monitoring', 'tracking', 'following', 'supervising', 'overseeing'],
                            'track': ['tracking', 'monitoring', 'watching', 'observing', 'following', 'supervising', 'overseeing'],
                            'follow': ['following', 'tracking', 'monitoring', 'watching', 'observing', 'supervising', 'overseeing'],
                            'analyze': ['analyzing', 'examining', 'studying', 'investigating', 'evaluating', 'assessing', 'reviewing'],
                            'examine': ['examining', 'analyzing', 'studying', 'investigating', 'evaluating', 'assessing', 'reviewing'],
                            'study': ['studying', 'analyzing', 'examining', 'investigating', 'evaluating', 'assessing', 'reviewing'],
                            'investigate': ['investigating', 'analyzing', 'examining', 'studying', 'evaluating', 'assessing', 'reviewing'],
                            'evaluate': ['evaluating', 'analyzing', 'examining', 'studying', 'investigating', 'assessing', 'reviewing'],
                            'assess': ['assessing', 'analyzing', 'examining', 'studying', 'investigating', 'evaluating', 'reviewing'],
                            'review': ['reviewing', 'analyzing', 'examining', 'studying', 'investigating', 'evaluating', 'assessing'],
                            'compare': ['comparing', 'contrasting', 'evaluating', 'analyzing', 'examining', 'studying', 'investigating'],
                            'contrast': ['contrasting', 'comparing', 'evaluating', 'analyzing', 'examining', 'studying', 'investigating'],
                            'measure': ['measuring', 'quantifying', 'calculating', 'computing', 'evaluating', 'assessing', 'analyzing'],
                            'quantify': ['quantifying', 'measuring', 'calculating', 'computing', 'evaluating', 'assessing', 'analyzing'],
                            'calculate': ['calculating', 'measuring', 'quantifying', 'computing', 'evaluating', 'assessing', 'analyzing'],
                            'compute': ['computing', 'calculating', 'measuring', 'quantifying', 'evaluating', 'assessing', 'analyzing'],
                            'process': ['processing', 'handling', 'managing', 'dealing with', 'working with', 'operating', 'functioning'],
                            'handle': ['handling', 'processing', 'managing', 'dealing with', 'working with', 'operating', 'functioning'],
                            'deal with': ['dealing with', 'handling', 'processing', 'managing', 'working with', 'operating', 'functioning'],
                            'work with': ['working with', 'handling', 'processing', 'managing', 'dealing with', 'operating', 'functioning'],
                            'operate': ['operating', 'functioning', 'working', 'running', 'performing', 'executing', 'carrying out'],
                            'function': ['functioning', 'operating', 'working', 'running', 'performing', 'executing', 'carrying out'],
                            'work': ['working', 'functioning', 'operating', 'running', 'performing', 'executing', 'carrying out'],
                            'run': ['running', 'working', 'functioning', 'operating', 'performing', 'executing', 'carrying out'],
                            'perform': ['performing', 'executing', 'carrying out', 'doing', 'accomplishing', 'achieving', 'completing'],
                            'execute': ['executing', 'performing', 'carrying out', 'doing', 'accomplishing', 'achieving', 'completing'],
                            'carry out': ['carrying out', 'executing', 'performing', 'doing', 'accomplishing', 'achieving', 'completing'],
                            'do': ['doing', 'executing', 'performing', 'carrying out', 'accomplishing', 'achieving', 'completing'],
                            'accomplish': ['accomplishing', 'achieving', 'completing', 'finishing', 'succeeding', 'attaining', 'reaching'],
                            'achieve': ['achieving', 'accomplishing', 'completing', 'finishing', 'succeeding', 'attaining', 'reaching'],
                            'complete': ['completing', 'finishing', 'ending', 'concluding', 'finalizing', 'wrapping up', 'closing'],
                            'finish': ['finishing', 'completing', 'ending', 'concluding', 'finalizing', 'wrapping up', 'closing'],
                            'end': ['ending', 'finishing', 'completing', 'concluding', 'finalizing', 'wrapping up', 'closing'],
                            'conclude': ['concluding', 'ending', 'finishing', 'completing', 'finalizing', 'wrapping up', 'closing'],
                            'finalize': ['finalizing', 'concluding', 'ending', 'finishing', 'completing', 'wrapping up', 'closing'],
                            'wrap up': ['wrapping up', 'finalizing', 'concluding', 'ending', 'finishing', 'completing', 'closing'],
                            'close': ['closing', 'wrapping up', 'finalizing', 'concluding', 'ending', 'finishing', 'completing'],
                            'start': ['starting', 'beginning', 'initiating', 'launching', 'commencing', 'opening', 'introducing'],
                            'begin': ['beginning', 'starting', 'initiating', 'launching', 'commencing', 'opening', 'introducing'],
                            'initiate': ['initiating', 'starting', 'beginning', 'launching', 'commencing', 'opening', 'introducing'],
                            'launch': ['launching', 'starting', 'beginning', 'initiating', 'commencing', 'opening', 'introducing'],
                            'commence': ['commencing', 'starting', 'beginning', 'initiating', 'launching', 'opening', 'introducing'],
                            'open': ['opening', 'starting', 'beginning', 'initiating', 'launching', 'commencing', 'introducing'],
                            'introduce': ['introducing', 'starting', 'beginning', 'initiating', 'launching', 'commencing', 'opening'],
                            'stop': ['stopping', 'halting', 'ending', 'terminating', 'ceasing', 'discontinuing', 'pausing'],
                            'halt': ['halting', 'stopping', 'ending', 'terminating', 'ceasing', 'discontinuing', 'pausing'],
                            'terminate': ['terminating', 'stopping', 'halting', 'ending', 'ceasing', 'discontinuing', 'pausing'],
                            'cease': ['ceasing', 'stopping', 'halting', 'ending', 'terminating', 'discontinuing', 'pausing'],
                            'discontinue': ['discontinuing', 'stopping', 'halting', 'ending', 'terminating', 'ceasing', 'pausing'],
                            'pause': ['pausing', 'stopping', 'halting', 'ending', 'terminating', 'ceasing', 'discontinuing'],
                            'resume': ['resuming', 'continuing', 'restarting', 'renewing', 'proceeding', 'carrying on', 'going on'],
                            'continue': ['continuing', 'resuming', 'restarting', 'renewing', 'proceeding', 'carrying on', 'going on'],
                            'restart': ['restarting', 'resuming', 'continuing', 'renewing', 'proceeding', 'carrying on', 'going on'],
                            'renew': ['renewing', 'resuming', 'continuing', 'restarting', 'proceeding', 'carrying on', 'going on'],
                            'proceed': ['proceeding', 'continuing', 'resuming', 'restarting', 'renewing', 'carrying on', 'going on'],
                            'carry on': ['carrying on', 'continuing', 'resuming', 'restarting', 'renewing', 'proceeding', 'going on'],
                            'go on': ['going on', 'continuing', 'resuming', 'restarting', 'renewing', 'proceeding', 'carrying on']
                        };
                        
                        // Expand keywords with synonyms
                        const expandedKeywords = [...searchKeywords];
                        for (const keyword of searchKeywords) {
                            const keywordLower = keyword.toLowerCase();
                            if (keywordSynonyms[keywordLower]) {
                                expandedKeywords.push(...keywordSynonyms[keywordLower]);
                            }
                        }
                        
                        for (const keyword of expandedKeywords) {
                            const keywordLower = keyword.toLowerCase();
                            // Check for exact match
                            if (combinedText.includes(keywordLower)) {
                                keywordMatches++;
                                relevanceScore += 30;
                            } else {
                                // Check for partial matches (word parts) - more lenient
                                const keywordWords = keywordLower.split(' ');
                                let wordMatches = 0;
                                for (const word of keywordWords) {
                                    if (word.length > 2 && combinedText.includes(word)) { // Reduced from 3 to 2
                                        wordMatches++;
                                    }
                                }
                                // If at least 50% of words match, count as keyword match
                                if (wordMatches >= Math.ceil(keywordWords.length * 0.5)) {
                                    keywordMatches++;
                                    relevanceScore += 20; // Lower score for partial matches
                                }
                            }
                        }
                        
                        // Calculate thematic relevance as alternative to keyword matching
                        const thematicRelevance = calculateThematicRelevance(combinedText, offer || '');
                        
                        // MUCH MORE FLEXIBLE: Accept posts with ANY relevance
                        if (keywordMatches === 0) {
                            if (thematicRelevance >= 0.2) { // Lower threshold for thematic relevance
                                console.log(`Post accepted via thematic relevance (${thematicRelevance.toFixed(2)}): "${postData.title.substring(0, 50)}..."`);
                                relevanceScore += thematicRelevance * 40; // Higher score for thematic relevance
                            } else {
                                // Even if no thematic relevance, check for ANY keyword-like matches
                                const hasAnyRelevance = (
                                    combinedText.includes('tool') || combinedText.includes('software') || 
                                    combinedText.includes('app') || combinedText.includes('solution') ||
                                    combinedText.includes('help') || combinedText.includes('need') ||
                                    combinedText.includes('looking') || combinedText.includes('recommend')
                                );
                                
                                if (hasAnyRelevance) {
                                    console.log(`Post accepted via general relevance: "${postData.title.substring(0, 50)}..."`);
                                    relevanceScore += 15; // Give some score for general relevance
                                } else {
                                    console.log(`Post skipped - no relevance found: "${postData.title.substring(0, 50)}..."`);
                                    continue;
                                }
                            }
                        }
                        
                        // Score based on offer context - CRITICAL for better matches
                        let offerMatchScore = 0;
                        let hasOfferMatch = false;
                        
                        if (offer && offer !== 'No offer provided' && offer.trim() !== '') {
                            const offerLower = offer.toLowerCase();
                            const offerWords = offerLower.split(' ').filter(word => word.length > 3);
                            let offerWordMatches = 0;
                            let semanticMatches = 0;
                            let titleOfferMatches = 0;
                            let bodyOfferMatches = 0;
                            
                            // Direct word matches in offer - STRICT MATCHING
                            for (const word of offerWords) {
                                if (combinedText.includes(word)) {
                                    offerWordMatches++;
                                    relevanceScore += 40; // Higher weight for offer relevance
                                }
                            }
                            
                            // Semantic matching - check if post content relates to offer context
                            const offerContext = extractOfferContext(offerLower);
                            for (const context of offerContext) {
                                if (combinedText.includes(context)) {
                                    semanticMatches++;
                                    relevanceScore += 45; // Higher weight for semantic relevance
                                }
                            }
                            
                            // Title matching gets MASSIVE bonus points
                            for (const word of offerWords.slice(0, 3)) { // Check first 3 important words
                                if (title.includes(word)) {
                                    titleOfferMatches++;
                                }
                            }
                            if (titleOfferMatches >= 1) {
                                relevanceScore += 50; // Massive boost for title matches
                            } else if (titleOfferMatches >= 2) {
                                relevanceScore += 70; // Extra boost for multiple title matches
                            }
                            
                            // Text body matching - require STRONG match
                            if (selftext && selftext.length > 50) {
                                const bodyMatches = offerWords.filter(word => selftext.includes(word)).length;
                                const bodySemanticMatches = offerContext.filter(context => selftext.includes(context)).length;
                                
                                if (bodyMatches >= 2 || bodySemanticMatches >= 2) {
                                    relevanceScore += 50; // Strong body match
                                } else if (bodyMatches >= 1 || bodySemanticMatches >= 1) {
                                    relevanceScore += 30; // Moderate body match
                                }
                            }
                            
                            // Check if post has meaningful connection to offer
                            hasOfferMatch = (offerWordMatches >= 1 || semanticMatches >= 1 || titleOfferMatches >= 1);
                            
                            // MASSIVE penalty if no offer relation at all
                            if (!hasOfferMatch) {
                                relevanceScore -= 30; // Strong penalty
                            }
                        }
                        
                        // Advanced Topic Matching - Look for specific buying intent and problem-solving keywords
                        let topicMatchScore = 0;
                        
                        // Tool/Solution Seeking Keywords
                        const toolSeekingKeywords = [
                            'looking for tool', 'need a tool', 'recommend a tool', 'best tool for',
                            'tool recommendation', 'suggest a tool', 'what tool', 'which tool',
                            'tool that', 'tool to', 'find a tool', 'get a tool'
                        ];
                        
                        // SaaS/Software Seeking Keywords
                        const saasSeekingKeywords = [
                            'recommend a saas', 'best saas', 'saas recommendation', 'suggest a saas',
                            'looking for saas', 'need a saas', 'what saas', 'which saas',
                            'saas for', 'saas to', 'find a saas', 'get a saas',
                            'software recommendation', 'best software', 'recommend software',
                            'looking for software', 'need software', 'what software', 'which software'
                        ];
                        
                        // Management/Process Keywords (simplified)
                        const managementKeywords = [
                            'manage my', 'managing',
                            'handle my', 'handling',
                            'organize my', 'organizing',
                            'track my', 'tracking',
                            'automate my', 'automating'
                        ];
                        
                        // Problem/Solution Keywords (simplified)
                        const problemSolutionKeywords = [
                            'problem with', 'issue with', 'trouble with',
                            'difficulty with', 'challenge with',
                            'need help with', 'help me with', 'advice on', 'tips for',
                            'solution for', 'fix for', 'resolve', 'solve'
                        ];
                        
                        // Buying Intent Keywords - STRONGER detection
                        const buyingIntentKeywords = [
                            'budget for', 'price range', 'cost', 'affordable', 'cheap',
                            'expensive', 'worth it', 'worth the money', 'investment',
                            'pay for', 'buy', 'purchase', 'subscribe', 'subscription',
                            'free trial', 'demo', 'trial', 'test', 'looking to buy',
                            'need to purchase', 'ready to buy', 'comparing options',
                            'which should i buy', 'best option to buy', 'willing to pay',
                            'looking for recommendations', 'need a solution', 'problem i need solved',
                            'urgent need', 'struggling with', 'having trouble with',
                            'frustrated with', 'tired of', 'sick of', 'hate doing',
                            'manual process', 'by hand', 'tedious', 'time consuming'
                        ];
                        
                        // Check for tool seeking
                        for (const keyword of toolSeekingKeywords) {
                            if (combinedText.includes(keyword)) {
                                topicMatchScore += 25; // Moderate score for tool seeking
                                break;
                            }
                        }
                        
                        // Check for SaaS seeking
                        for (const keyword of saasSeekingKeywords) {
                            if (combinedText.includes(keyword)) {
                                topicMatchScore += 30; // Good score for SaaS seeking
                                break;
                            }
                        }
                        
                        // Check for management/process keywords
                        for (const keyword of managementKeywords) {
                            if (combinedText.includes(keyword)) {
                                topicMatchScore += 20; // Moderate score for management needs
                                break;
                            }
                        }
                        
                        // Check for problem/solution keywords
                        for (const keyword of problemSolutionKeywords) {
                            if (combinedText.includes(keyword)) {
                                topicMatchScore += 15; // Moderate score for problem solving
                                break;
                            }
                        }
                        
                        // Check for buying intent - HIGHER SCORE for better posts
                        for (const keyword of buyingIntentKeywords) {
                            if (combinedText.includes(keyword)) {
                                topicMatchScore += 35; // Higher score for buying intent
                                console.log(`High buying intent detected: "${keyword}" in "${postData.title.substring(0, 50)}..."`);
                                break;
                            }
                        }
                        
                        // Apply topic match score
                        relevanceScore += topicMatchScore;
                        
                        // Problem-Solution Matching - STRONGER detection
                        const problemSolutionPatterns = [
                            'struggling with', 'having trouble with', 'problem with', 'issue with',
                            'difficulty with', 'challenge with', 'frustrated with', 'tired of',
                            'sick of', 'hate doing', 'manual process', 'by hand', 'tedious',
                            'time consuming', 'inefficient', 'slow', 'complicated', 'confusing',
                            'need help with', 'help me with', 'advice on', 'tips for',
                            'solution for', 'fix for', 'resolve', 'solve', 'looking for',
                            'need', 'want', 'seeking', 'searching for', 'trying to find'
                        ];
                        
                        let problemSolutionScore = 0;
                        for (const pattern of problemSolutionPatterns) {
                            if (combinedText.includes(pattern)) {
                                problemSolutionScore += 20; // High score for problem-solution posts
                                console.log(`Problem-solution pattern detected: "${pattern}" in "${postData.title.substring(0, 50)}..."`);
                                break;
                            }
                        }
                        
                        relevanceScore += problemSolutionScore;
                        
                        // Legacy boost for posts showing buying intent (reduced since we have better topic matching)
                        if (combinedText.includes('looking for') || combinedText.includes('need') ||
                            combinedText.includes('want') || combinedText.includes('seeking') ||
                            combinedText.includes('searching for') || combinedText.includes('trying to find') ||
                            combinedText.includes('best') || combinedText.includes('recommendations') ||
                            combinedText.includes('suggestions') || combinedText.includes('alternatives') ||
                            combinedText.includes('budget') || combinedText.includes('price') ||
                            combinedText.includes('cost') || combinedText.includes('worth it') ||
                            combinedText.includes('worth the money') || combinedText.includes('investment') ||
                            combinedText.includes('looking') || combinedText.includes('which') ||
                            combinedText.includes('should i') || combinedText.includes('can someone')) {
                            relevanceScore += 15;  // Reduced from 30 since we have better topic matching now
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
                        
                        // MAJOR BOOST for very recent posts (last 7 days)
                        if (daysAgo <= 7) {
                            relevanceScore += 30;  // Starker Boost für neue Posts
                        } else if (daysAgo < 30) {
                            relevanceScore += 15;  // Normale Boost
                        } else if (daysAgo > 365) {
                            relevanceScore -= 20;  // Strafe für alte Posts
                        }
                        
                        // VERY FLEXIBLE threshold - accept almost anything relevant
                        const minRequiredScore = 5; // Very low threshold for maximum flexibility
                        const requiresOfferMatch = offer && offer !== 'No offer provided' && offer.trim() !== '';
                        
                        // ULTRA flexible matching - accept posts with ANY relevance
                        const hasAnyRelevance = (
                            keywordMatches >= 1 || 
                            thematicRelevance >= 0.2 || 
                            hasOfferMatch ||
                            relevanceScore >= 10
                        );
                        
                        // Accept posts with ULTRA flexible criteria
                        const isGoodFit = (
                            relevanceScore >= minRequiredScore && 
                            hasAnyRelevance
                        );
                        
                        if (isGoodFit) {
                            const acceptanceReason = [];
                            if (keywordMatches > 0) acceptanceReason.push(`${keywordMatches} keyword matches`);
                            if (thematicRelevance >= 0.2) acceptanceReason.push(`thematic relevance: ${thematicRelevance.toFixed(2)}`);
                            if (hasOfferMatch) acceptanceReason.push('offer match');
                            if (relevanceScore >= 10) acceptanceReason.push('high score');
                            
                            console.log(`✅ Post accepted - score: ${relevanceScore}, reason: ${acceptanceReason.join(', ')}, title: "${postData.title.substring(0, 50)}..."`);
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
                
                postsFound = posts.length;
                console.log(`Total posts found so far: ${postsFound}`);
                
                // Stop if we have enough high-quality posts
                if (postsFound >= minPostsRequired) {
                    console.log(`✅ Reached target of ${minPostsRequired}+ posts, stopping search`);
                    break;
                }
                
            } catch (error) {
                console.error(`Error searching r/${subreddit}:`, error);
                continue;
            }
            }
            
            // Update postsFound after each search attempt
            postsFound = posts.length;
            console.log(`📊 Search attempt ${searchAttempts} completed: ${postsFound}/${minPostsRequired} posts found`);
            
            // If we still don't have enough posts, try different search strategies
            if (postsFound < minPostsRequired && searchAttempts < maxSearchAttempts) {
                console.log(`🔄 Not enough posts found (${postsFound}/${minPostsRequired}), trying different search strategy...`);
                
                // Try different time ranges and sort orders for next attempt
                const timeVariations = ['week', 'month', 'year', 'all'];
                const sortVariations = ['hot', 'new', 'top', 'relevance'];
                
                // This will be used in the next iteration
                console.log(`⏭️ Next attempt will use different time/sort combinations`);
            }
        }
        
        // Final check - if we still don't have enough posts after all attempts
        if (postsFound < minPostsRequired) {
            console.log(`⚠️ Warning: Only found ${postsFound}/${minPostsRequired} posts after ${searchAttempts} attempts`);
        } else {
            console.log(`🎉 Success: Found ${postsFound} posts in ${searchAttempts} attempt(s)`);
        }

        // Sort by relevance score and limit to 100 high-quality posts
        const sortedPosts = posts
            .sort((a, b) => b.score - a.score)
            .slice(0, 100);

        console.log(`Reddit API search completed: ${sortedPosts.length} posts found`);

        // Return posts with rate limit info
        res.status(200).json({ 
            posts: sortedPosts,
            rateLimitHit: rateLimitHit,
            message: rateLimitHit ? 'Reddit API rate limit reached. Some subreddits were skipped. Try again in a few minutes.' : null
        });

    } catch (error) {
        console.error('Error with Reddit search:', error);
        res.status(500).json({ error: error.message });
    }
}


