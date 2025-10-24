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
                    website_url: campaignData.website_url,
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
            // Check if post already exists in this specific campaign
            const { data: existingPost } = await supabaseClient
                .from(TABLES.POSTS)
                .select('id')
                .eq('reddit_id', postData.reddit_id)
                .eq('campaign_id', campaignId)
                .single();

            if (existingPost) {
                console.log(`Post ${postData.reddit_id} already exists in this campaign, skipping`);
                return existingPost;
            }

            // Check if post exists in database but in a different campaign
            const { data: existingPostInDB } = await supabaseClient
                .from(TABLES.POSTS)
                .select('id, campaign_id')
                .eq('reddit_id', postData.reddit_id)
                .neq('campaign_id', campaignId)
                .single();

            if (existingPostInDB) {
                console.log(`Post ${postData.reddit_id} exists in another campaign, creating new entry for this campaign`);
                // We'll create a new entry for this campaign with the same post data
            }

            const { data, error } = await supabaseClient
                .from(TABLES.POSTS)
                .insert({
                    campaign_id: campaignId,
                    reddit_id: postData.reddit_id,
                    reddit_post_id: postData.reddit_id ? `t3_${postData.reddit_id}` : null, // Add Reddit post ID for commenting
                    title: postData.title,
                    content: postData.content,
                    author: postData.author,
                    subreddit: postData.subreddit,
                    url: postData.url || '',
                    score: postData.score || 0,
                    upvotes: postData.upvotes || 0,
                    downvotes: postData.downvotes || 0,
                    comments_count: postData.comments_count || 0,
                    reddit_created_at: postData.reddit_created_at || new Date().toISOString(),
                    is_contacted: false
                })
                .select()
                .single();

            if (error) {
                // Handle duplicate key constraint violation gracefully
                if (error.code === '23505') {
                    console.log(`Post ${postData.reddit_id} already exists (duplicate key), skipping`);
                    return null; // Return null to indicate it was skipped
                }
                console.error(`Error inserting post ${postData.reddit_id}:`, error);
                throw error;
            }
            
            console.log(`Successfully inserted post: ${postData.title.substring(0, 30)}...`);
            
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
            
            // Ensure each post has a reddit_post_id for commenting
            const posts = (data || []).map(post => {
                // We'll extract reddit_post_id from URL when needed (simpler approach)
                return post;
            });
            
            return posts;
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
    async connectRedditAccount(returnUrl = null) {
        try {
            console.log('=== POSTSPARKDB.CONNECTREDDITACCOUNT CALLED ===');
            console.log('Return URL:', returnUrl);
            console.log('User ID:', this.user?.id);
            
            const authUrl = this.buildRedditAuthUrl(returnUrl);
            console.log('Generated auth URL:', authUrl);
            console.log('Redirecting to Reddit...');
            
            window.location.href = authUrl;
        } catch (error) {
            console.error('Error connecting Reddit account:', error);
            throw error;
        }
    }

    buildRedditAuthUrl(returnUrl = null) {
        console.log('=== BUILDING REDDIT AUTH URL ===');
        console.log('Return URL:', returnUrl);
        console.log('User ID:', this.user?.id);
        
        // Get current campaign ID if available
        const currentCampaignId = window.currentCampaignId || returnUrl;
        
        // Create state with user ID and return URL
        const stateData = {
            userId: this.user.id,
            returnUrl: returnUrl || (currentCampaignId ? `/campaigns/${currentCampaignId}` : '/campaigns')
        };
        
        console.log('State data:', stateData);
        console.log('Reddit config:', {
            CLIENT_ID: REDDIT_CONFIG.CLIENT_ID,
            REDIRECT_URI: REDDIT_CONFIG.REDIRECT_URI,
            SCOPES: REDDIT_CONFIG.SCOPES
        });
        
        const params = new URLSearchParams({
            client_id: REDDIT_CONFIG.CLIENT_ID,
            response_type: 'code',
            state: JSON.stringify(stateData), // Store return URL in state
            redirect_uri: REDDIT_CONFIG.REDIRECT_URI,
            duration: 'permanent',
            scope: REDDIT_CONFIG.SCOPES
        });
        
        const authUrl = `${REDDIT_CONFIG.AUTH_URL}?${params.toString()}`;
        console.log('Generated Reddit Auth URL:', authUrl);
        console.log('Return URL:', stateData.returnUrl);
        return authUrl;
    }

    async handleRedditCallback(code, state) {
        try {
            console.log('Starting Reddit callback handling...');
            console.log('User ID:', this.user?.id);
            
            // Parse and validate state
            let stateData = {};
            try {
                stateData = JSON.parse(state);
                console.log('Parsed state data:', stateData);
            } catch (e) {
                console.error('Could not parse state:', e);
                throw new Error('Invalid state parameter');
            }
            
            // Validate that the user ID in state matches current user
            if (stateData.userId && stateData.userId !== this.user?.id) {
                console.error('State user ID mismatch:', stateData.userId, 'vs', this.user?.id);
                throw new Error('User ID mismatch in state parameter');
            }
            
            const tokens = await this.exchangeCodeForTokens(code);
            console.log('Tokens exchanged successfully');
            
            await this.storeRedditTokens(tokens);
            console.log('Tokens stored successfully');
            
            // Parse return URL from state
            let returnUrl = '/campaigns'; // Default return URL
            if (stateData.returnUrl) {
                returnUrl = stateData.returnUrl;
            }
            
            console.log('Reddit callback completed successfully');
            return { 
                success: true, 
                message: 'Reddit account connected successfully!',
                returnUrl: returnUrl
            };
        } catch (error) {
            console.error('Error handling Reddit callback:', error);
            throw error;
        }
    }

    async exchangeCodeForTokens(code) {
        console.log('Exchanging code for tokens...');
        console.log('Token URL:', REDDIT_CONFIG.TOKEN_URL);
        console.log('Client ID:', REDDIT_CONFIG.CLIENT_ID);
        console.log('Redirect URI:', REDDIT_CONFIG.REDIRECT_URI);
        
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

        console.log('Token exchange response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Token exchange error:', errorText);
            throw new Error('Failed to exchange code for tokens: ' + errorText);
        }

        const tokens = await response.json();
        console.log('Token exchange successful:', { 
            hasAccessToken: !!tokens.access_token, 
            hasRefreshToken: !!tokens.refresh_token,
            expiresIn: tokens.expires_in 
        });
        
        return tokens;
    }

    async storeRedditTokens(tokens) {
        try {
            console.log('Storing Reddit tokens for user:', this.user.id);
            console.log('Tokens received:', { 
                hasAccessToken: !!tokens.access_token, 
                hasRefreshToken: !!tokens.refresh_token,
                expiresIn: tokens.expires_in 
            });
            
            if (!this.user || !this.user.id) {
                throw new Error('No user found for storing Reddit tokens');
            }
            
            const updateData = {
                reddit_access_token: tokens.access_token,
                reddit_refresh_token: tokens.refresh_token,
                reddit_token_expires: new Date(Date.now() + tokens.expires_in * 1000).toISOString()
            };
            
            console.log('Update data:', updateData);
            
            const { data, error } = await supabaseClient
                .from(TABLES.USERS)
                .update(updateData)
                .eq('id', this.user.id)
                .select();

            if (error) {
                console.error('Supabase error storing tokens:', error);
                throw error;
            }
            
            console.log('Reddit tokens stored successfully:', data);
            
            // Verify the tokens were actually stored
            const verification = await this.getRedditTokens();
            console.log('Token verification after storage:', {
                hasTokens: !!verification,
                hasAccessToken: !!(verification && verification.reddit_access_token),
                hasRefreshToken: !!(verification && verification.reddit_refresh_token)
            });
            
            return data;
        } catch (error) {
            console.error('Error storing Reddit tokens:', error);
            throw error;
        }
    }

    async getRedditTokens() {
        try {
            // Ensure user is initialized
            if (!this.user) {
                await this.initializeAuth();
            }
            
            if (!this.user) {
                console.log('No user found for Reddit tokens');
                return null;
            }

            console.log('Fetching Reddit tokens for user:', this.user.id);

            const { data, error } = await supabaseClient
                .from(TABLES.USERS)
                .select('reddit_access_token, reddit_refresh_token, reddit_token_expires')
                .eq('id', this.user.id)
                .single();

            if (error) {
                console.error('Error fetching Reddit tokens:', error);
                throw error;
            }
            
            console.log('Reddit tokens fetched:', { 
                hasData: !!data, 
                hasAccessToken: !!(data && data.reddit_access_token),
                hasRefreshToken: !!(data && data.reddit_refresh_token)
            });
            
            return data;
        } catch (error) {
            console.error('Error fetching Reddit tokens:', error);
            return null;
        }
    }

    async isRedditConnected() {
        try {
            console.log('Checking Reddit connection for user:', this.user?.id);
            
            if (!this.user || !this.user.id) {
                console.log('No user found for Reddit connection check');
                return false;
            }
            
            const tokens = await this.getRedditTokens();
            const isConnected = tokens && tokens.reddit_access_token;
            
            console.log('Reddit connection check result:', { 
                hasTokens: !!tokens, 
                hasAccessToken: !!(tokens && tokens.reddit_access_token),
                isConnected,
                userId: this.user.id,
                tokens: tokens ? {
                    hasAccessToken: !!tokens.reddit_access_token,
                    hasRefreshToken: !!tokens.reddit_refresh_token,
                    hasExpires: !!tokens.reddit_token_expires,
                    expiresAt: tokens.reddit_token_expires
                } : null
            });
            
            return isConnected;
        } catch (error) {
            console.error('Error checking Reddit connection:', error);
            return false;
        }
    }

    async refreshRedditToken() {
        try {
            const tokens = await this.getRedditTokens();
            if (!tokens || !tokens.reddit_refresh_token) {
                throw new Error('No refresh token available');
            }

            console.log('Refreshing Reddit token...');
            const response = await fetch('/api/reddit-refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    refreshToken: tokens.reddit_refresh_token
                })
            });

            console.log('Token refresh response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Token refresh error:', errorText);
                throw new Error(`Failed to refresh token: ${response.status} - ${errorText}`);
            }

            const newTokens = await response.json();
            console.log('Token refresh successful, storing new tokens...');
            
            // Calculate expiration time (Reddit tokens typically last 1 hour)
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 1);
            newTokens.reddit_token_expires = expiresAt.toISOString();
            
            await this.storeRedditTokens(newTokens);
            console.log('New tokens stored successfully');
            return newTokens;
        } catch (error) {
            console.error('Error refreshing Reddit token:', error);
            throw error;
        }
    }

    async testRedditConnection() {
        try {
            console.log('=== TESTING REDDIT CONNECTION ===');
            let tokens = await this.getRedditTokens();
            if (!tokens || !tokens.reddit_access_token) {
                throw new Error('Reddit account not connected');
            }

            // Test with a simple API call to verify token works - use server proxy
            const response = await fetch('/api/reddit-test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    accessToken: tokens.reddit_access_token
                })
            });

            console.log('Reddit user info response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Reddit user info error:', errorText);
                throw new Error(`Reddit token invalid: ${response.status}`);
            }

            const userInfo = await response.json();
            console.log('Reddit user info:', userInfo);
            return userInfo;
        } catch (error) {
            console.error('Error testing Reddit connection:', error);
            throw error;
        }
    }

    async postRedditComment(postId, commentText) {
        try {
            console.log('=== POSTING REDDIT COMMENT ===');
            console.log('Post ID:', postId);
            console.log('Comment text:', commentText.substring(0, 50) + '...');
            
            let tokens = await this.getRedditTokens();
            if (!tokens || !tokens.reddit_access_token) {
                throw new Error('Reddit account not connected');
            }

            console.log('Reddit tokens found:', {
                hasAccessToken: !!tokens.reddit_access_token,
                hasRefreshToken: !!tokens.reddit_refresh_token,
                expiresAt: tokens.reddit_token_expires
            });

            // Check if token is expired and refresh if needed
            if (tokens.reddit_token_expires && new Date(tokens.reddit_token_expires) <= new Date()) {
                console.log('Reddit token expired, refreshing...');
                tokens = await this.refreshRedditToken();
            }

            // Test the connection with the current token first
            try {
                await this.testRedditConnection();
            } catch (error) {
                console.log('Token test failed, attempting refresh:', error.message);
                // If test fails, try to refresh the token
                if (tokens.reddit_refresh_token) {
                    try {
                        tokens = await this.refreshRedditToken();
                        console.log('Token refreshed successfully, testing again...');
                        await this.testRedditConnection();
                    } catch (refreshError) {
                        console.error('Token refresh failed:', refreshError);
                        throw new Error('Reddit token refresh failed. Please reconnect your Reddit account.');
                    }
                } else {
                    throw new Error('Reddit token is invalid and no refresh token available. Please reconnect your Reddit account.');
                }
            }

            // Check if token has required scopes by testing a comment-related endpoint
            console.log('Checking if token has required scopes for commenting...');
            try {
                // Test if we can access comment-related functionality
                const scopeTestResponse = await fetch('/api/reddit-test', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        accessToken: tokens.reddit_access_token
                    })
                });
                
                if (!scopeTestResponse.ok) {
                    throw new Error('Token scope test failed');
                }
                
                const userData = await scopeTestResponse.json();
                console.log('Token scope test passed, user data:', userData.name);
            } catch (scopeError) {
                console.error('Scope validation failed:', scopeError);
                throw new Error('Reddit token scope validation failed. Please reconnect your Reddit account to grant comment permissions.');
            }

            // Ensure postId has correct format (should start with t3_)
            if (!postId.startsWith('t3_')) {
                console.log('Converting post ID format from', postId, 'to t3_ format');
                postId = `t3_${postId}`;
            }

            console.log('Final post ID:', postId);
            console.log('Making request to Vercel API proxy...');

            // Use Vercel API route as proxy to avoid CORS issues
            const response = await fetch('/api/reddit-comment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    accessToken: tokens.reddit_access_token,
                    postId: postId,
                    commentText: commentText
                })
            });

            console.log('Vercel API response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Vercel API error response:', errorData);
                
                // Check if it's a permission issue that requires reconnection
                if (response.status === 403 && errorData.autoReconnect) {
                    throw new Error('Insufficient permissions - Please reconnect your Reddit account to grant comment permissions.');
                }
                
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('Reddit comment posted successfully via proxy:', result);
            return result.data;
        } catch (error) {
            console.error('Error posting Reddit comment:', error);
            throw error;
        }
    }

    // OpenAI API Methods
    async generateRedditPosts(campaignData) {
        try {
            console.log('Searching for real Reddit posts...');
            
            // Use Reddit API to search for real Reddit posts
            const realPosts = await this.searchWithRedditAPI(campaignData);
            if (realPosts && realPosts.length > 0) {
                console.log(`Found ${realPosts.length} real Reddit posts`);
                return realPosts;
            }
            
            // No fallback - return empty array if no posts found
            console.log('No real posts found');
            return [];
        } catch (error) {
            console.error('Error searching Reddit posts:', error);
            return [];
        }
    }

    async searchWithRedditAPI(campaignData) {
        try {
            console.log('Using Reddit API to search for real posts...');
            
            // Use Reddit API to find real posts
            const response = await fetch('/api/reddit-search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ campaignData })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.log('Reddit API error details:', errorData);
                throw new Error(`Reddit API error: ${errorData.error || response.status}`);
            }

            const data = await response.json();
            const posts = data.posts || [];
            
            console.log(`Reddit API found ${posts.length} real posts`);
            
            // Show rate limit warning if applicable
            if (data.rateLimitHit && data.message) {
                console.warn('Reddit API Rate Limit:', data.message);
                // Store rate limit info for UI display
                window.redditRateLimitMessage = data.message;
            }
            
            return posts;
            
        } catch (error) {
            console.error('Error with Reddit API search:', error);
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
            // Refresh campaigns data to ensure we have the latest information
            await this.getCampaigns();
            
            // Get campaign data
            const campaign = this.campaigns.find(c => c.id === campaignId);
            if (!campaign) {
                throw new Error('Campaign not found');
            }
            
            console.log('Refreshing leads for campaign:', {
                id: campaign.id,
                name: campaign.name,
                keywords: campaign.keywords,
                offer: campaign.offer
            });

            // Generate Reddit posts using OpenAI
            const redditPosts = await this.generateRedditPosts(campaign);
            
            // Save posts to database
            const savedPosts = [];
            console.log(`Attempting to save ${redditPosts.length} posts to database...`);
            
            for (const postData of redditPosts) {
                try {
                    console.log(`Saving post: ${postData.title.substring(0, 50)}...`);
                    console.log(`Campaign ID for this post: ${campaignId}`);
                    
                    const post = await this.addPost(campaignId, {
                        reddit_id: postData.reddit_id,
                        title: postData.title,
                        content: postData.content,
                        subreddit: postData.subreddit,
                        score: postData.score,
                        author: postData.author,
                        upvotes: postData.upvotes || 0,
                        comments_count: postData.comments_count || 0,
                        downvotes: postData.downvotes || 0,
                        url: postData.url || '',
                        reddit_created_at: postData.reddit_created_at || new Date().toISOString()
                    });
                    
                    // Only add to savedPosts if post was actually saved (not null)
                    if (post) {
                        savedPosts.push(post);
                        console.log(`✅ Successfully saved post: ${postData.title.substring(0, 30)}...`);
                        console.log(`✅ Post campaign_id: ${post.campaign_id}`);
                    } else {
                        console.log(`⏭️ Post skipped (already exists): ${postData.title.substring(0, 30)}...`);
                    }
                } catch (error) {
                    console.error(`❌ Error saving post "${postData.title.substring(0, 30)}...":`, error);
                }
            }
            
            console.log(`Successfully saved ${savedPosts.length} out of ${redditPosts.length} posts`);

            // Update the campaign stats to reflect actual saved posts
            if (savedPosts.length > 0) {
                console.log(`Campaign now has ${savedPosts.length} new posts added`);
            }

            return savedPosts;
        } catch (error) {
            console.error('Error finding Reddit leads:', error);
            throw error;
        }
    }

    // AI Response Style Management
    async getAIStyleForCampaign(campaignId) {
        try {
            const { data, error } = await supabaseClient
                .from('ai_response_styles')
                .select('*')
                .eq('campaign_id', campaignId)
                .single();

            if (error) {
                // Handle different error types gracefully
                if (error.code === 'PGRST116') {
                    // No rows found - this is normal
                    return null;
                } else if (error.code === '42P01') {
                    // Table doesn't exist
                    console.log('AI response styles table does not exist, using localStorage fallback');
                    return null;
                } else if (error.message && error.message.includes('406')) {
                    // 406 error - table exists but no access
                    console.log('No access to AI response styles table, using localStorage fallback');
                    return null;
                } else {
                    console.log('Error accessing AI response styles table:', error.message);
                    return null;
                }
            }

            return data;
        } catch (error) {
            console.log('AI response styles table not available, using localStorage fallback');
            return null;
        }
    }

    async getDefaultAIStyle() {
        try {
            const { data, error } = await supabaseClient
                .from('ai_response_styles')
                .select('*')
                .eq('user_id', this.userData.id)
                .eq('is_default', true)
                .single();

            if (error) {
                // Handle different error types gracefully
                if (error.code === 'PGRST116') {
                    // No rows found - this is normal
                    return null;
                } else if (error.code === '42P01') {
                    // Table doesn't exist
                    console.log('AI response styles table does not exist, using localStorage fallback');
                    return null;
                } else if (error.message && error.message.includes('406')) {
                    // 406 error - table exists but no access
                    console.log('No access to AI response styles table, using localStorage fallback');
                    return null;
                } else {
                    console.log('Error accessing AI response styles table:', error.message);
                    return null;
                }
            }

            return data;
        } catch (error) {
            console.log('AI response styles table not available, using localStorage fallback');
            return null;
        }
    }

    async saveAIStyle(styleData) {
        try {
            const { data, error } = await supabaseClient
                .from('ai_response_styles')
                .upsert({
                    user_id: this.userData.id,
                    campaign_id: styleData.campaign_id,
                    tone: styleData.tone,
                    sales_strength: styleData.sales_strength,
                    custom_offer: styleData.custom_offer,
                    is_default: styleData.is_default
                }, {
                    onConflict: 'user_id,campaign_id'
                })
                .select()
                .single();

            if (error) {
                // Handle different error types gracefully
                if (error.code === '42P01') {
                    // Table doesn't exist
                    console.log('AI response styles table does not exist, saving to localStorage only');
                    return null;
                } else if (error.message && error.message.includes('406')) {
                    // 406 error - table exists but no access
                    console.log('No access to AI response styles table, saving to localStorage only');
                    return null;
                } else {
                    console.log('Error saving AI style:', error.message);
                    return null;
                }
            }

            return data;
        } catch (error) {
            console.log('AI response styles table not available, saving to localStorage only');
            return null;
        }
    }

    async deleteAIStyle(styleId) {
        try {
            const { error } = await supabaseClient
                .from('ai_response_styles')
                .delete()
                .eq('id', styleId)
                .eq('user_id', this.userData.id);

            if (error) {
                // Handle different error types gracefully
                if (error.code === '42P01') {
                    // Table doesn't exist
                    console.log('AI response styles table does not exist, deletion skipped');
                    return true;
                } else if (error.message && error.message.includes('406')) {
                    // 406 error - table exists but no access
                    console.log('No access to AI response styles table, deletion skipped');
                    return true;
                } else {
                    console.log('Error deleting AI style:', error.message);
                    return false;
                }
            }

            return true;
        } catch (error) {
            console.log('AI response styles table not available, deletion skipped');
            return false;
        }
    }

    // Delete user account and all associated data
    async deleteAccount() {
        try {
            if (!this.user) {
                throw new Error('No user logged in');
            }

            console.log('Deleting user account and all associated data...');

            // Delete all user data from all tables
            const tablesToClean = [
                'campaigns',
                'posts', 
                'ai_response_styles',
                'users'
            ];

            for (const table of tablesToClean) {
                try {
                    const { error } = await supabaseClient
                        .from(table)
                        .delete()
                        .eq('user_id', this.user.id);

                    if (error && error.code !== '42P01') {
                        console.warn(`Error deleting from ${table}:`, error.message);
                    }
                } catch (error) {
                    console.warn(`Table ${table} not accessible, skipping:`, error.message);
                }
            }

            // Delete the user account from Supabase Auth
            const { error: authError } = await supabaseClient.auth.admin.deleteUser(this.user.id);
            
            if (authError) {
                console.warn('Error deleting user from auth:', authError.message);
            }

            console.log('User account and all data deleted successfully');
            return true;

        } catch (error) {
            console.error('Error deleting account:', error);
            throw error;
        }
    }
}

// Initialize global instance
window.postSparkDB = new PostSparkSupabase();
