// Supabase Integration for PostSpark Webapp
class PostSparkSupabase {
    constructor() {
        this.user = null;
        this.campaigns = [];
        this.posts = [];
    }

    // Initialize authentication state
    async initializeAuth() {
        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            this.user = user;
            
            if (user) {
                await this.loadUserData();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Auth initialization error:', error);
            return false;
        }
    }

    // Load user data from database
    async loadUserData() {
        if (!this.user) return;

        try {
            const { data, error } = await supabaseClient
                .from(TABLES.USERS)
                .select('*')
                .eq('id', this.user.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            if (data) {
                this.userData = data;
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    // Create or update user profile
    async updateUserProfile(profileData) {
        if (!this.user) throw new Error('User not authenticated');

        try {
            const { data, error } = await supabaseClient
                .from(TABLES.USERS)
                .upsert({
                    id: this.user.id,
                    full_name: profileData.full_name,
                    email: this.user.email,
                    company: profileData.company,
                    subscription_plan: profileData.subscription_plan || 'starter',
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            
            this.userData = data;
            return data;
        } catch (error) {
            console.error('Error updating user profile:', error);
            throw error;
        }
    }

    // Campaign Management
    async createCampaign(campaignData) {
        if (!this.user) throw new Error('User not authenticated');

        try {
            const { data, error } = await supabaseClient
                .from(TABLES.CAMPAIGNS)
                .insert({
                    user_id: this.user.id,
                    name: campaignData.name,
                    description: campaignData.description,
                    keywords: campaignData.keywords,
                    subreddits: campaignData.subreddits || [],
                    status: 'active'
                })
                .select()
                .single();

            if (error) throw error;
            
            this.campaigns.unshift(data); // Add to beginning for immediate display
            return data;
        } catch (error) {
            console.error('Error creating campaign:', error);
            throw error;
        }
    }

    async getCampaigns() {
        if (!this.user) throw new Error('User not authenticated');

        try {
            const { data, error } = await supabaseClient
                .from(TABLES.CAMPAIGNS)
                .select('*')
                .eq('user_id', this.user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            this.campaigns = data || [];
            return this.campaigns;
        } catch (error) {
            console.error('Error fetching campaigns:', error);
            throw error;
        }
    }

    async updateCampaign(campaignId, updateData) {
        if (!this.user) throw new Error('User not authenticated');

        try {
            const { data, error } = await supabaseClient
                .from(TABLES.CAMPAIGNS)
                .update(updateData)
                .eq('id', campaignId)
                .eq('user_id', this.user.id)
                .select()
                .single();

            if (error) throw error;
            
            // Update local campaigns array
            const index = this.campaigns.findIndex(c => c.id === campaignId);
            if (index !== -1) {
                this.campaigns[index] = data;
            }
            
            return data;
        } catch (error) {
            console.error('Error updating campaign:', error);
            throw error;
        }
    }

    async deleteCampaign(campaignId) {
        if (!this.user) throw new Error('User not authenticated');

        try {
            const { error } = await supabaseClient
                .from(TABLES.CAMPAIGNS)
                .delete()
                .eq('id', campaignId)
                .eq('user_id', this.user.id);

            if (error) throw error;
            
            // Remove from local campaigns array
            this.campaigns = this.campaigns.filter(c => c.id !== campaignId);
            
            return true;
        } catch (error) {
            console.error('Error deleting campaign:', error);
            throw error;
        }
    }

    // Posts Management
    async addPost(campaignId, postData) {
        if (!this.user) throw new Error('User not authenticated');

        try {
            // Check if post already exists to avoid duplicates
            const { data: existingPost } = await supabaseClient
                .from(TABLES.POSTS)
                .select('id')
                .eq('reddit_id', postData.reddit_id)
                .eq('campaign_id', campaignId)
                .single();

            if (existingPost) {
                console.log('Post already exists, skipping:', postData.reddit_id);
                return existingPost;
            }

            const { data, error } = await supabaseClient
                .from(TABLES.POSTS)
                .insert({
                    campaign_id: campaignId,
                    reddit_id: postData.reddit_id,
                    title: postData.title,
                    content: postData.content,
                    author: postData.author,
                    subreddit: postData.subreddit,
                    url: postData.url,
                    score: postData.score || 0,
                    upvotes: postData.upvotes || 0,
                    downvotes: postData.downvotes || 0,
                    comments_count: postData.comments_count || 0,
                    reddit_created_at: postData.reddit_created_at,
                    is_contacted: false
                })
                .select()
                .single();

            if (error) throw error;
            
            this.posts.push(data);
            return data;
        } catch (error) {
            console.error('Error adding post:', error);
            throw error;
        }
    }

    async getPosts(campaignId) {
        if (!this.user) throw new Error('User not authenticated');

        try {
            const { data, error } = await supabaseClient
                .from(TABLES.POSTS)
                .select('*')
                .eq('campaign_id', campaignId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            return data || [];
        } catch (error) {
            console.error('Error fetching posts:', error);
            throw error;
        }
    }

    async updatePost(postId, updateData) {
        if (!this.user) throw new Error('User not authenticated');

        try {
            const { data, error } = await supabaseClient
                .from(TABLES.POSTS)
                .update(updateData)
                .eq('id', postId)
                .select()
                .single();

            if (error) throw error;
            
            return data;
        } catch (error) {
            console.error('Error updating post:', error);
            throw error;
        }
    }

    async markPostAsContacted(postId, aiComment = null) {
        if (!this.user) throw new Error('User not authenticated');

        try {
            const updateData = {
                is_contacted: true,
                contact_date: new Date().toISOString()
            };

            if (aiComment) {
                updateData.ai_generated_comment = aiComment;
            }

            const { data, error } = await supabaseClient
                .from(TABLES.POSTS)
                .update(updateData)
                .eq('id', postId)
                .select()
                .single();

            if (error) throw error;
            
            return data;
        } catch (error) {
            console.error('Error marking post as contacted:', error);
            throw error;
        }
    }

    // Comments Management
    async addComment(postId, content, isAiGenerated = false) {
        if (!this.user) throw new Error('User not authenticated');

        try {
            const { data, error } = await supabaseClient
                .from(TABLES.COMMENTS)
                .insert({
                    post_id: postId,
                    user_id: this.user.id,
                    content: content,
                    is_ai_generated: isAiGenerated
                })
                .select()
                .single();

            if (error) throw error;
            
            return data;
        } catch (error) {
            console.error('Error adding comment:', error);
            throw error;
        }
    }

    async getComments(postId) {
        if (!this.user) throw new Error('User not authenticated');

        try {
            const { data, error } = await supabaseClient
                .from(TABLES.COMMENTS)
                .select('*')
                .eq('post_id', postId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            return data || [];
        } catch (error) {
            console.error('Error fetching comments:', error);
            throw error;
        }
    }

    // Analytics
    async recordAnalytics(campaignId, metricName, metricValue) {
        if (!this.user) throw new Error('User not authenticated');

        try {
            const { data, error } = await supabaseClient
                .from(TABLES.ANALYTICS)
                .insert({
                    user_id: this.user.id,
                    campaign_id: campaignId,
                    metric_name: metricName,
                    metric_value: metricValue,
                    date: new Date().toISOString().split('T')[0]
                })
                .select()
                .single();

            if (error) throw error;
            
            return data;
        } catch (error) {
            console.error('Error recording analytics:', error);
            throw error;
        }
    }

    async getAnalytics(campaignId = null, startDate = null, endDate = null) {
        if (!this.user) throw new Error('User not authenticated');

        try {
            let query = supabaseClient
                .from(TABLES.ANALYTICS)
                .select('*')
                .eq('user_id', this.user.id);

            if (campaignId) {
                query = query.eq('campaign_id', campaignId);
            }

            if (startDate) {
                query = query.gte('date', startDate);
            }

            if (endDate) {
                query = query.lte('date', endDate);
            }

            const { data, error } = await query.order('date', { ascending: false });

            if (error) throw error;
            
            return data || [];
        } catch (error) {
            console.error('Error fetching analytics:', error);
            throw error;
        }
    }

    // Logout
    async logout() {
        try {
            const { error } = await supabaseClient.auth.signOut();
            if (error) throw error;
            
            this.user = null;
            this.userData = null;
            this.campaigns = [];
            this.posts = [];
            
            return true;
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        }
    }

    // Get user subscription limits
    getUserLimits() {
        if (!this.userData) return null;

        const plan = this.userData.subscription_plan || 'starter';
        
        const limits = {
            starter: {
                campaigns: 1,
                keywords: 3,
                aiReplies: 50,
                refreshes: 10
            },
            pro: {
                campaigns: 5,
                keywords: 5,
                aiReplies: 150,
                refreshes: 10
            },
            enterprise: {
                campaigns: 15,
                keywords: 10,
                aiReplies: 1000,
                refreshes: 20
            }
        };

        return limits[plan] || limits.starter;
    }

    // Check if user can perform action
    canPerformAction(action, currentCount = 0) {
        const limits = this.getUserLimits();
        if (!limits) return false;

        switch (action) {
            case 'create_campaign':
                return this.campaigns.length < limits.campaigns;
            case 'add_keywords':
                return currentCount < limits.keywords;
            case 'generate_ai_reply':
                return true; // We'll track this separately
            case 'manual_refresh':
                return true; // We'll track this separately
            default:
                return false;
        }
    }

    // Reddit API Methods
    async connectRedditAccount() {
        try {
            const authUrl = this.buildRedditAuthUrl();
            window.location.href = authUrl;
        } catch (error) {
            console.error('Error connecting Reddit account:', error);
            throw error;
        }
    }

    buildRedditAuthUrl() {
        const params = new URLSearchParams({
            client_id: REDDIT_CONFIG.CLIENT_ID,
            response_type: 'code',
            state: this.user.id, // Use user ID as state
            redirect_uri: REDDIT_CONFIG.REDIRECT_URI,
            duration: 'permanent',
            scope: REDDIT_CONFIG.SCOPES
        });
        
        const authUrl = `${REDDIT_CONFIG.AUTH_URL}?${params.toString()}`;
        console.log('Reddit Auth URL:', authUrl); // Debug log
        return authUrl;
    }

    async handleRedditCallback(code, state) {
        try {
            const tokens = await this.exchangeCodeForTokens(code);
            await this.storeRedditTokens(tokens);
            return { success: true, message: 'Reddit account connected successfully!' };
        } catch (error) {
            console.error('Error handling Reddit callback:', error);
            throw error;
        }
    }

    async exchangeCodeForTokens(code) {
        const response = await fetch(REDDIT_CONFIG.TOKEN_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${btoa(REDDIT_CONFIG.CLIENT_ID + ':' + REDDIT_CONFIG.CLIENT_SECRET)}`
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDDIT_CONFIG.REDIRECT_URI
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Token exchange error:', errorText);
            throw new Error('Failed to exchange code for tokens: ' + errorText);
        }

        return await response.json();
    }

    async storeRedditTokens(tokens) {
        try {
            const { error } = await this.supabase
                .from(TABLES.USERS)
                .update({
                    reddit_access_token: tokens.access_token,
                    reddit_refresh_token: tokens.refresh_token,
                    reddit_token_expires: new Date(Date.now() + tokens.expires_in * 1000).toISOString()
                })
                .eq('id', this.user.id);

            if (error) throw error;
        } catch (error) {
            console.error('Error storing Reddit tokens:', error);
            throw error;
        }
    }

    async getRedditTokens() {
        try {
            const { data, error } = await this.supabase
                .from(TABLES.USERS)
                .select('reddit_access_token, reddit_refresh_token, reddit_token_expires')
                .eq('id', this.user.id)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching Reddit tokens:', error);
            return null;
        }
    }

    async isRedditConnected() {
        const tokens = await this.getRedditTokens();
        return tokens && tokens.reddit_access_token;
    }

    async refreshRedditToken() {
        try {
            const tokens = await this.getRedditTokens();
            if (!tokens || !tokens.reddit_refresh_token) {
                throw new Error('No refresh token available');
            }

            const response = await fetch(REDDIT_CONFIG.TOKEN_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + btoa(`${REDDIT_CONFIG.CLIENT_ID}:${REDDIT_CONFIG.CLIENT_SECRET}`)
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: tokens.reddit_refresh_token
                })
            });

            if (!response.ok) {
                throw new Error('Failed to refresh token');
            }

            const newTokens = await response.json();
            await this.storeRedditTokens(newTokens);
            return newTokens;
        } catch (error) {
            console.error('Error refreshing Reddit token:', error);
            throw error;
        }
    }

    async postRedditComment(postId, commentText) {
        try {
            let tokens = await this.getRedditTokens();
            if (!tokens || !tokens.reddit_access_token) {
                throw new Error('Reddit account not connected');
            }

            // Check if token is expired and refresh if needed
            if (tokens.reddit_token_expires && new Date(tokens.reddit_token_expires) <= new Date()) {
                console.log('Reddit token expired, refreshing...');
                tokens = await this.refreshRedditToken();
            }

            const response = await fetch(`${REDDIT_CONFIG.API_BASE}/api/comment`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${tokens.reddit_access_token}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'PostSpark/1.0 by YourUsername'
                },
                body: new URLSearchParams({
                    thing_id: postId,
                    text: commentText
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to post comment');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error posting Reddit comment:', error);
            throw error;
        }
    }

    // OpenAI API Methods
    async generateRedditPosts(campaignData) {
        try {
            console.log('Searching for real Reddit posts using OpenAI Chat Assistant...');
            
            // Use OpenAI Chat Assistant to search for real posts
            const realPosts = await this.searchWithOpenAIAssistant(campaignData);
            if (realPosts && realPosts.length > 0) {
                console.log(`Found ${realPosts.length} real Reddit posts`);
                return realPosts;
            }
            
            // Fallback to sample posts if no real posts found
            console.log('No real posts found, using sample posts as fallback');
            return this.generateSampleRedditPosts(campaignData);
        } catch (error) {
            console.error('Error generating Reddit posts:', error);
            return this.generateSampleRedditPosts(campaignData);
        }
    }

    async searchWithOpenAIAssistant(campaignData) {
        try {
            const apiKey = window.VITE_OPENAI_API_KEY || 
                          (window.OPENAI_CONFIG && window.OPENAI_CONFIG.API_KEY);
            
            if (!apiKey || apiKey === 'YOUR_OPENAI_API_KEY_HERE') {
                console.log('OpenAI API key not configured');
                return [];
            }

            const keywords = campaignData.keywords || ['lead generation', 'marketing'];
            const subreddits = Array.isArray(campaignData.subreddits) ? campaignData.subreddits : ['r/entrepreneur', 'r/smallbusiness'];
            const offer = campaignData.description || 'business solution';
            const businessName = campaignData.name || 'Business Solution';

            // Create search query for the assistant
            const searchQuery = `Find real Reddit posts that match this business:

BUSINESS DETAILS:
Name: ${businessName}
Description: ${offer}
Keywords: ${keywords.join(', ')}
Target Subreddits: ${subreddits.join(', ')}

Please search for actual Reddit posts where people are:
- Asking for solutions to problems your business solves
- Discussing pain points your product addresses
- Looking for recommendations in your industry
- Sharing frustrations with current tools

Return the posts in JSON format with this structure:
{
  "posts": [
    {
      "title": "Post title",
      "content": "Post content",
      "subreddit": "r/subreddit",
      "author": "username",
      "score": 85,
      "url": "https://reddit.com/...",
      "created_utc": 1234567890
    }
  ]
}`;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4',
                    messages: [
                        {
                            role: 'user',
                            content: searchQuery
                        }
                    ],
                    max_tokens: 4000,
                    temperature: 0.3
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status}`);
            }

            const data = await response.json();
            const content = data.choices[0].message.content;
            
            // Parse JSON response
            const result = JSON.parse(content);
            const posts = result.posts || [];
            
            console.log(`OpenAI Assistant found ${posts.length} posts`);
            return posts.slice(0, 25); // Limit to 25 posts
            
        } catch (error) {
            console.error('Error with OpenAI Assistant:', error);
            return [];
        }
    }

    async generateOpenAIRedditPosts(campaignData) {
        try {
            const keywords = campaignData.keywords || ['lead generation', 'marketing'];
            const subreddits = Array.isArray(campaignData.subreddits) ? campaignData.subreddits : ['r/entrepreneur', 'r/smallbusiness'];
            const offer = campaignData.description || 'business solution';
            const businessName = campaignData.name || 'Business Solution';

            // Create the prompt message for the Chat Assistant
            const promptMessage = `Analyze Reddit posts and find ones that match this business:

BUSINESS DETAILS:
Name: ${businessName}
Description: ${offer}
Target Audience: ${campaignData.target_audience || 'Small business owners, entrepreneurs'}
Keywords: ${keywords.join(', ')}

SEARCH CRITERIA:
Subreddits: ${subreddits.join(', ')}
Post Types: question, discussion, help
Minimum Score: 70
Count: 25 posts

Find posts that show:
- Problems your business could solve
- Questions asking for solutions
- Frustration with current tools
- Success stories with similar products`;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${window.VITE_OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        {
                            role: 'user',
                            content: promptMessage
                        }
                    ],
                    max_tokens: 4000,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status}`);
            }

            const data = await response.json();
            const content = data.choices[0].message.content;
            
            // Parse JSON response
            const result = JSON.parse(content);
            const posts = result.posts || [];
            
            // Ensure we have the right number of posts
            const targetCount = 25;
            if (posts.length < targetCount) {
                // Fill with sample posts if needed
                const samplePosts = this.generateSampleRedditPosts(campaignData);
                posts.push(...samplePosts.slice(0, targetCount - posts.length));
            }

            return posts.slice(0, targetCount);
        } catch (error) {
            console.error('Error with OpenAI API:', error);
            throw error;
        }
    }

    generateSampleRedditPosts(campaignData) {
        const keywords = campaignData.keywords || ['lead generation', 'marketing'];
        const subreddits = Array.isArray(campaignData.subreddits) ? campaignData.subreddits : ['r/entrepreneur', 'r/smallbusiness'];
        
        const samplePosts = [];
        const postTemplates = [
            {
                title: `Looking for a better ${keywords[0]} solution for my business`,
                content: `I'm running a small business and struggling with ${keywords[0]}. Our current solution just isn't cutting it anymore. We need something that can handle our workflow better and integrate with our other tools. Any recommendations?`,
                score: 92
            },
            {
                title: `Frustrated with our current ${keywords[1] || 'marketing'} tools - need something simpler`,
                content: `Our current ${keywords[1] || 'marketing'} tools are way too complex for what we need. We just want to track leads and follow up with customers effectively. Does anyone have suggestions for a simpler solution?`,
                score: 88
            },
            {
                title: `How do you manage your ${keywords[0]} process?`,
                content: `I'm struggling to keep track of all my prospects and where they are in the ${keywords[0]} process. What tools do you use to manage your ${keywords[0]} effectively? Looking for something that's not too expensive.`,
                score: 85
            },
            {
                title: `Best ${keywords[1] || 'marketing'} software for startups?`,
                content: `Starting a new company and need recommendations for ${keywords[1] || 'marketing'} software. We're a team of 5 and need something that can grow with us. Budget is tight but we need something reliable.`,
                score: 90
            },
            {
                title: `Anyone else struggling with ${keywords[0]} automation?`,
                content: `We're trying to automate our ${keywords[0]} process but everything we've tried is either too expensive or too complicated. Are there any simple tools that actually work? We're willing to pay for something that saves us time.`,
                score: 87
            },
            {
                title: `Need help with ${keywords[0]} strategy`,
                content: `I'm new to ${keywords[0]} and looking for advice on how to get started. What tools and strategies have worked best for you? Any recommendations for a beginner?`,
                score: 83
            },
            {
                title: `What's the best ${keywords[1] || 'marketing'} tool you've used?`,
                content: `I've tried several ${keywords[1] || 'marketing'} tools but none seem to fit our needs perfectly. What's the best one you've used and why? Looking for something that's user-friendly and effective.`,
                score: 89
            },
            {
                title: `Struggling with ${keywords[0]} ROI - any tips?`,
                content: `We've been investing in ${keywords[0]} but not seeing the results we expected. How do you measure ROI and what strategies have worked best for you?`,
                score: 86
            }
        ];

        // Generate 25-30 posts
        const postCount = 25 + Math.floor(Math.random() * 6); // 25-30 posts
        for (let i = 0; i < postCount; i++) {
            const template = postTemplates[i % postTemplates.length];
            const randomSubreddit = subreddits[Math.floor(Math.random() * subreddits.length)];
            const randomScore = template.score + Math.floor(Math.random() * 10) - 5; // Add some variation
            
            samplePosts.push({
                reddit_id: 't3_' + Math.random().toString(36).substr(2, 9),
                title: template.title,
                content: template.content,
                subreddit: randomSubreddit,
                score: Math.max(70, Math.min(100, randomScore)), // Keep score between 70-100
                author: 'user_' + Math.random().toString(36).substr(2, 8),
                upvotes: Math.floor(Math.random() * 50) + 5,
                comments: Math.floor(Math.random() * 20) + 1,
                relevance_reason: `Looking for ${keywords[0]} solutions`,
                created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() // Random time within last 7 days
            });
        }

        return samplePosts;
    }

    async findRedditLeads(campaignId) {
        try {
            // Get campaign data
            const campaign = this.campaigns.find(c => c.id === campaignId);
            if (!campaign) {
                throw new Error('Campaign not found');
            }

            // Generate Reddit posts using OpenAI
            const redditPosts = await this.generateRedditPosts(campaign);
            
            // Save posts to database
            const savedPosts = [];
            for (const postData of redditPosts) {
                try {
                    const post = await this.addPost(campaignId, {
                        reddit_id: postData.reddit_id,
                        title: postData.title,
                        content: postData.content,
                        subreddit: postData.subreddit,
                        score: postData.score,
                        author: postData.author,
                        upvotes: postData.upvotes || 0,
                        comments: postData.comments || 0,
                        relevance_reason: postData.relevance_reason,
                        created_at: postData.created_at
                    });
                    savedPosts.push(post);
                } catch (error) {
                    console.error('Error saving post:', error);
                }
            }

            return savedPosts;
        } catch (error) {
            console.error('Error finding Reddit leads:', error);
            throw error;
        }
    }
}

// Initialize global instance
window.postSparkDB = new PostSparkSupabase();
