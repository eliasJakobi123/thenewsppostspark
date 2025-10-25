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
        let rateLimitHit = false;
        const subreddits = [
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
            'CareerGuidance', 'MoneyTalks', 'Philosophy', 'SelfReliance', 'LifeLessons'
        ];

        // Randomly shuffle subreddits to get different results each time
        const shuffledSubreddits = subreddits.sort(() => Math.random() - 0.5);
        
        // Search in each subreddit with higher limits
        for (const subreddit of shuffledSubreddits) {
            try {
                // Create search query focusing on exact keyword matches
                // Add keyword variations to find different posts
                const keywordVariations = [
                    ...searchKeywords,
                    ...searchKeywords.map(k => k + ' help'),
                    ...searchKeywords.map(k => k + ' advice'),
                    ...searchKeywords.map(k => k + ' tips'),
                    ...searchKeywords.map(k => k + ' guide'),
                    ...searchKeywords.map(k => k + ' recommendations')
                ];
                
                // Randomly select a subset of keywords for this search
                const selectedKeywords = keywordVariations
                    .sort(() => Math.random() - 0.5)
                    .slice(0, Math.min(3, keywordVariations.length));
                
                const searchQuery = selectedKeywords.join(' OR ');
                
                // Add time variation to get different results
                const timeVariations = ['all', 'year', 'month', 'week', 'day'];
                const timeVariation = timeVariations[Math.floor(Math.random() * timeVariations.length)];
                
                // Add sort variation to get different results
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
                                    relevanceScore += 30; // Increased weight
                                }
                            }
                            
                            // Semantic matching - check if post content relates to offer context
                            const offerContext = extractOfferContext(offerLower);
                            for (const context of offerContext) {
                                if (combinedText.includes(context)) {
                                    semanticMatches++;
                                    relevanceScore += 35; // Increased weight
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
                        
                        // Boost score for posts asking for help or showing problems
                        if (combinedText.includes('help') || combinedText.includes('advice') || 
                            combinedText.includes('struggling') || combinedText.includes('problem') ||
                            combinedText.includes('question') || combinedText.includes('recommend') ||
                            combinedText.includes('stuck') || combinedText.includes('difficult') ||
                            combinedText.includes('challenge') || combinedText.includes('issue')) {
                            relevanceScore += 25;  // Erhöht von 20
                        }
                        
                        // Boost for posts showing buying intent or need for solutions
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
                            relevanceScore += 30;  // Erhöht von 25
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
                        
                        // Higher threshold for better quality - require strong offer match AND minimum connection to offer
                        const minRequiredScore = 60; // Increased to require much better matches
                        const requiresOfferMatch = offer && offer !== 'No offer provided' && offer.trim() !== '';
                        
                        // Only accept posts that have a strong offer match OR a very high overall score
                        const hasStrongOfferConnection = hasOfferMatch && relevanceScore >= 50;
                        const hasVeryHighScore = relevanceScore >= 80;
                        
                        if ((hasStrongOfferConnection || hasVeryHighScore) && relevanceScore >= minRequiredScore) {
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


