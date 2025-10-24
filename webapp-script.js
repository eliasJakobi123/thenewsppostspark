// Webapp JavaScript with Supabase Integration

// Handle Reddit OAuth callback
async function handleRedditCallback() {
    console.log('=== REDDIT CALLBACK HANDLER STARTED ===');
    console.log('Current URL:', window.location.href);
    console.log('URL search params:', window.location.search);
    
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');
    
    console.log('URL parameters found:', { 
        hasCode: !!code, 
        hasState: !!state, 
        hasError: !!error,
        codeLength: code ? code.length : 0,
        stateLength: state ? state.length : 0
    });
    
    if (error) {
        console.error('Reddit OAuth error:', error);
        showNotification('Reddit authorization failed: ' + error, 'error');
        return;
    }
    
    if (code && state) {
        try {
            console.log('=== PROCESSING REDDIT CALLBACK ===');
            console.log('Code received:', code.substring(0, 20) + '...');
            console.log('State received:', state);
            
            // Parse state data
            const stateData = JSON.parse(state);
            console.log('Reddit OAuth callback received:', { 
                code: code.substring(0, 20) + '...', 
                stateData,
                userId: stateData.userId
            });
            
            // Store the code for later use - we'll process it after login
            sessionStorage.setItem('reddit_auth_code', code);
            sessionStorage.setItem('reddit_auth_state', state);
            
            console.log('Reddit OAuth code stored in sessionStorage');
            console.log('SessionStorage check:', {
                hasCode: !!sessionStorage.getItem('reddit_auth_code'),
                hasState: !!sessionStorage.getItem('reddit_auth_state')
            });
            
            // Clean up URL immediately
            const newUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
            
            console.log('URL cleaned up, new URL:', newUrl);
            console.log('Reddit OAuth code stored, will process after login');
            
            // Show notification that we received the code
            showNotification('Reddit authorization received! Processing...', 'info');
            
        } catch (error) {
            console.error('Error handling Reddit callback:', error);
            showNotification('Error processing Reddit authorization', 'error');
        }
    } else {
        console.log('No Reddit callback parameters found in URL');
    }
    
    console.log('=== REDDIT CALLBACK HANDLER FINISHED ===');
}

// Process stored Reddit OAuth code after login
async function processStoredRedditCode() {
    console.log('=== PROCESSING STORED REDDIT CODE ===');
    
    const code = sessionStorage.getItem('reddit_auth_code');
    const state = sessionStorage.getItem('reddit_auth_state');
    
    console.log('Checking for stored Reddit code:', { 
        hasCode: !!code, 
        hasState: !!state, 
        hasPostSparkDB: !!postSparkDB, 
        hasUser: !!(postSparkDB && postSparkDB.user),
        userId: postSparkDB?.user?.id
    });
    
    if (code && state && postSparkDB && postSparkDB.user) {
        try {
            console.log('=== FOUND STORED REDDIT CODE - PROCESSING ===');
            console.log('Processing stored Reddit OAuth code...');
            console.log('Code:', code.substring(0, 10) + '...');
            console.log('State:', state);
            
            const result = await postSparkDB.handleRedditCallback(code, state);
            
            console.log('Reddit callback result:', result);
            
            if (result.success) {
                console.log('=== REDDIT CONNECTION SUCCESSFUL ===');
                showNotification('Reddit account connected successfully!', 'success');
                
                // Clear stored data
                sessionStorage.removeItem('reddit_auth_code');
                sessionStorage.removeItem('reddit_auth_state');
                console.log('Cleared stored Reddit data from sessionStorage');
                
                // Refresh the connection status
                setTimeout(async () => {
                    console.log('Refreshing Reddit connection status...');
                    await updateRedditConnectionStatus();
                }, 1000);
                
                // Navigate to return URL if available
                if (result.returnUrl) {
                    console.log('Redirecting to:', result.returnUrl);
                    if (window.router) {
                        window.router.navigate(result.returnUrl);
                    } else {
                        window.location.href = result.returnUrl;
                    }
                }
            } else {
                console.error('Reddit callback failed:', result);
                showNotification('Failed to connect Reddit account', 'error');
            }
        } catch (error) {
            console.error('Error processing stored Reddit code:', error);
            showNotification('Error connecting Reddit account: ' + error.message, 'error');
        }
    } else {
        console.log('No stored Reddit code or user not ready:', {
            hasCode: !!code,
            hasState: !!state,
            hasPostSparkDB: !!postSparkDB,
            hasUser: !!(postSparkDB && postSparkDB.user)
        });
    }
    
    console.log('=== FINISHED PROCESSING STORED REDDIT CODE ===');
}

// Update Reddit connection status in the UI
async function updateRedditConnectionStatus() {
    try {
        console.log('Updating Reddit connection status...');
        const isConnected = await postSparkDB.isRedditConnected();
        console.log('Reddit connection status update result:', isConnected);
        
        // Update UI elements - try both ID and class selectors
        const statusElement = document.getElementById('reddit-status-text') || document.querySelector('.reddit-status');
        const connectBtn = document.getElementById('connect-reddit-btn') || document.querySelector('.reddit-connect-btn');
        const sendBtn = document.getElementById('send-comment') || document.querySelector('.send-comment-btn');
        const connectionInfo = document.querySelector('.connection-info');
        
        console.log('UI elements found:', {
            statusElement: !!statusElement,
            connectBtn: !!connectBtn,
            sendBtn: !!sendBtn,
            connectionInfo: !!connectionInfo
        });
        
        if (statusElement && connectBtn && sendBtn && connectionInfo) {
            if (isConnected) {
                statusElement.textContent = 'Reddit account connected';
                connectionInfo.classList.add('connected');
                connectionInfo.classList.remove('error');
                connectBtn.style.display = 'none';
                sendBtn.disabled = false;
            } else {
                statusElement.textContent = 'Reddit account not connected';
                connectionInfo.classList.add('error');
                connectionInfo.classList.remove('connected');
                connectBtn.style.display = 'block';
                sendBtn.disabled = true;
            }
        } else {
            console.warn('Some UI elements not found for Reddit connection status update');
        }
    } catch (error) {
        console.error('Error updating Reddit connection status:', error);
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    // Check for Reddit OAuth callback first
    await handleRedditCallback();
    
    // Initialize PostSparkDB first
    postSparkDB = new PostSparkSupabase();
    
    // Initialize authentication
    const isAuthenticated = await postSparkDB.initializeAuth();
    
    if (!isAuthenticated) {
        // Redirect to login if not authenticated
        console.log('Not authenticated, redirecting to login...');
        window.location.href = '/login';
        return;
    }
    
    // Process any stored Reddit OAuth code after successful login
    await processStoredRedditCode();
    
    // Load user data and initialize the app
    await initializeApp();
    
    // Check Reddit connection status after app initialization
    await checkRedditConnection();
});

// Initialize the application
async function initializeApp() {
    try {
        // Load campaigns from Supabase
        await loadCampaigns();
        
        // Load dashboard data
        await loadDashboardData();
        
        // Update user info in sidebar
        updateUserInfo();
        
        // Initialize router navigation
        initializeRouterNavigation();
        
        // Initialize all other functionality
        initializeNavigation();
        initializeCampaigns();
        initializeSettings();
        initializeAnimations();
        initializeRippleEffects();
        
    } catch (error) {
        console.error('Error initializing app:', error);
        showNotification('Error loading application data', 'error');
    }
}

// Load campaigns from Supabase
async function loadCampaigns() {
    try {
        const campaigns = await postSparkDB.getCampaigns();
        
        // Calculate stats for each campaign
        for (const campaign of campaigns) {
            try {
                const posts = await postSparkDB.getPosts(campaign.id);
                campaign.stats = {
                    totalPosts: posts.length,
                    highPotential: posts.filter(post => post.score >= 85).length,
                    contacted: posts.filter(post => post.is_contacted).length
                };
            } catch (error) {
                console.error(`Error loading posts for campaign ${campaign.id}:`, error);
                campaign.stats = { totalPosts: 0, highPotential: 0, contacted: 0 };
            }
        }
        
        renderCampaigns(campaigns);
    } catch (error) {
        console.error('Error loading campaigns:', error);
        showNotification('Error loading campaigns', 'error');
    }
}

// Render campaigns in the UI
function renderCampaigns(campaigns) {
    const campaignsContainer = document.querySelector('.campaigns-grid');
    if (!campaignsContainer) return;

    campaignsContainer.innerHTML = '';

    if (campaigns.length === 0) {
        campaignsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-rocket"></i>
                <h3>No campaigns yet</h3>
                <p>Create your first campaign to start finding leads on Reddit</p>
                <button class="btn btn-primary" onclick="showCreateCampaign()">Create Campaign</button>
            </div>
        `;
        return;
    }

    campaigns.forEach(campaign => {
        const campaignCard = createCampaignCard(campaign);
        campaignsContainer.appendChild(campaignCard);
    });
}

// Create campaign card element
function createCampaignCard(campaign) {
    const card = document.createElement('div');
    card.className = 'campaign-card';
    card.setAttribute('data-campaign', campaign.id);
    
    // Get campaign stats (this will be calculated when posts are loaded)
    const stats = campaign.stats || { totalPosts: 0, highPotential: 0, contacted: 0 };
    
    card.innerHTML = `
        <div class="campaign-header">
            <h3>${campaign.name}</h3>
            <div class="campaign-status ${campaign.status}">${campaign.status}</div>
        </div>
        <div class="campaign-stats">
            <div class="stat">
                <span class="stat-number">${stats.totalPosts}</span>
                <span class="stat-label">Leads Found</span>
            </div>
            <div class="stat">
                <span class="stat-number">${stats.highPotential}</span>
                <span class="stat-label">High Potential</span>
            </div>
        </div>
        <div class="campaign-content">
            <p>${campaign.description || 'No description'}</p>
            <div class="campaign-keywords">
                ${campaign.keywords ? renderKeywordsWithTruncation(campaign.keywords) : ''}
            </div>
        </div>
        <div class="campaign-actions">
            <button class="btn btn-primary campaign-view-btn" data-campaign="${campaign.id}">
                <i class="fas fa-eye"></i> View Posts
            </button>
        </div>
    `;
    
    return card;
}

// Update user info in sidebar
function updateUserInfo() {
    if (!postSparkDB.userData) return;
    
    const userNameElement = document.querySelector('.user-name');
    const userRoleElement = document.querySelector('.user-role');
    
    if (userNameElement) {
        userNameElement.textContent = postSparkDB.userData.full_name || 'User';
    }
    
    if (userRoleElement) {
        userRoleElement.textContent = postSparkDB.userData.subscription_plan || 'starter';
    }
}

// Initialize navigation
function initializeNavigation() {
    // Navigation functionality
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');
    
    // Handle navigation clicks
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all nav items
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Hide all pages (except registration which is handled separately)
            pages.forEach(page => {
                if (page.id !== 'registration') {
                    page.classList.remove('active');
                }
            });
            
            // Show selected page
            const targetPage = this.getAttribute('data-page');
            const targetPageElement = document.getElementById(targetPage);
            if (targetPageElement) {
                targetPageElement.classList.add('active');
                
                // Load page-specific data
                if (targetPage === 'dashboard') {
                    loadDashboardData();
                } else if (targetPage === 'campaigns') {
                    loadCampaigns();
                } else if (targetPage === 'settings') {
                    loadUserSettings();
                }
            }
        });
    });
    
    // Campaign view functionality
    document.addEventListener('click', function(e) {
        if (e.target.closest('.campaign-view-btn')) {
            e.stopPropagation();
            const campaignId = e.target.closest('.campaign-view-btn').getAttribute('data-campaign');
            showCampaignPosts(campaignId);
        }
    });
    
    // Campaign card click functionality
    const campaignCards = document.querySelectorAll('.campaign-card');
    
    campaignCards.forEach(card => {
        card.addEventListener('click', function(e) {
            // Don't trigger if clicking on buttons or status
            if (e.target.closest('.campaign-actions') || e.target.closest('.campaign-status')) return;
            
            const campaignName = this.getAttribute('data-campaign');
            showCampaignPosts(campaignName);
        });
    });
    
    // Campaign status toggle functionality
    const campaignStatuses = document.querySelectorAll('.campaign-status');
    
    campaignStatuses.forEach(status => {
        status.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleCampaignStatus(this);
        });
    });
    
    // Back button functionality
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', function() {
            // Hide campaign posts page and show campaigns page
            document.getElementById('campaign-posts').classList.remove('active');
            document.getElementById('campaigns').classList.add('active');
            
            // Update navigation
            navItems.forEach(nav => nav.classList.remove('active'));
            document.querySelector('[data-page="campaigns"]').classList.add('active');
        });
    }
    
    // Refresh button functionality
    const refreshBtn = document.querySelector('.refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            refreshCampaignPosts();
        });
    }
    
    // Filter dropdown functionality
    const filterBtn = document.getElementById('filter-btn');
    const filterMenu = document.getElementById('filter-menu');
    const filterOptions = document.querySelectorAll('.filter-option');
    
    if (filterBtn && filterMenu) {
        // Toggle dropdown
        filterBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            filterMenu.classList.toggle('active');
            filterBtn.classList.toggle('active');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!filterBtn.contains(e.target) && !filterMenu.contains(e.target)) {
                filterMenu.classList.remove('active');
                filterBtn.classList.remove('active');
            }
        });
        
        // Handle filter option clicks
        filterOptions.forEach(option => {
            option.addEventListener('click', function() {
                const filter = this.getAttribute('data-filter');
                
                // Update active state
                filterOptions.forEach(opt => opt.classList.remove('active'));
                this.classList.add('active');
                
                // Apply filter
                applyPostFilter(filter);
                
                // Close dropdown
                filterMenu.classList.remove('active');
                filterBtn.classList.remove('active');
                
                // Update button text
                updateFilterButtonText(this.textContent.trim());
            });
        });
    }
    
    // Post action buttons
    const commentBtns = document.querySelectorAll('.post-actions .btn-primary');
    const viewBtns = document.querySelectorAll('.post-actions .btn-secondary');
    
    commentBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            
            // Simulate comment action
            const postCard = this.closest('.post-card');
            const postTitle = postCard.querySelector('.post-content h3').textContent;
            
            showNotification(`Commenting on: ${postTitle}`, 'success');
        });
    });
    
    viewBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            
            // Simulate view action
            const postCard = this.closest('.post-card');
            const postTitle = postCard.querySelector('.post-content h3').textContent;
            
            showNotification(`Opening: ${postTitle}`, 'info');
        });
    });
    
    // Mobile menu toggle (for future mobile implementation)
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('open');
        });
    }
    
    // Delete campaign functionality
    const deleteCampaignBtn = document.querySelector('.delete-campaign-btn');
    if (deleteCampaignBtn) {
        deleteCampaignBtn.addEventListener('click', function() {
            showDeleteConfirmation();
        });
    }
    
    // Create campaign functionality
    const createCampaignBtns = document.querySelectorAll('.create-campaign-btn');
    createCampaignBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Create campaign button clicked'); // Debug log
            showCreateCampaign();
        });
    });
    
    // Back to campaigns functionality
    const backToCampaignsBtn = document.querySelector('.back-to-campaigns-btn');
    if (backToCampaignsBtn) {
        console.log('Back to campaigns button found, adding event listener');
        backToCampaignsBtn.addEventListener('click', function() {
            console.log('Back to campaigns button clicked');
            showCampaigns();
        });
    } else {
        console.error('Back to campaigns button not found!');
    }
    
    // Campaign creation flow
    initializeCampaignCreation();
    
    // Settings functionality
    initializeSettings();
    
    // Initialize animations
    initializeAnimations();
    
    // Initialize ripple effects
    initializeRippleEffects();
    
    // Registration functionality
    initializeRegistration();
    
    // Check for registration hash
    if (window.location.hash === '#registration') {
        showNotification('Registration page would open here', 'info');
    }
    
    // Handle Reddit callback
    handleRedditCallback();
}

// Show campaign posts function
async function showCampaignPosts(campaignId) {
    try {
        // Set current campaign ID for refresh functionality
        window.currentCampaignId = campaignId;
        
        // Update URL if router is available
        if (window.router) {
            window.router.navigate(`/campaigns/${campaignId}`);
        }
        
        // Get campaign data from database
        const campaign = postSparkDB.campaigns.find(c => c.id === campaignId);
        if (!campaign) {
            showNotification('Campaign not found', 'error');
            return;
        }
        
        // Get posts for this campaign
        console.log('Loading posts for campaign:', campaignId);
        const posts = await postSparkDB.getPosts(campaignId);
        console.log('Loaded posts:', posts.length, posts);
        
        // Calculate stats
        const totalPosts = posts.length;
        const highPotential = posts.filter(post => post.score >= 85).length;
        const contacted = posts.filter(post => post.is_contacted).length;
        
        console.log('Campaign stats:', { totalPosts, highPotential, contacted });
        
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        
        // Show campaign posts page
        document.getElementById('campaign-posts').classList.add('active');
        
        // Update page title
        document.getElementById('campaign-posts-title').textContent = `${campaign.name} Posts`;
        
        // Update stats
        document.getElementById('total-posts').textContent = totalPosts;
        document.getElementById('high-potential-posts').textContent = highPotential;
        document.getElementById('contacted-posts').textContent = contacted;
        
        // Render posts
        renderCampaignPosts(posts);
        
        // Posts loaded successfully (no notification needed)
        
    } catch (error) {
        console.error('Error loading campaign posts:', error);
        showNotification('Error loading campaign posts: ' + error.message, 'error');
    }
}

// Render campaign posts
function renderCampaignPosts(posts) {
    console.log('Rendering campaign posts:', posts.length, posts);
    const postsGrid = document.getElementById('campaign-posts-grid');
    
    if (!postsGrid) {
        console.error('Campaign posts grid element not found!');
        return;
    }
    
    postsGrid.innerHTML = '';
    
    if (posts.length === 0) {
        console.log('No posts to render, showing empty state');
        postsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>No posts found yet</h3>
                <p>Posts matching your campaign criteria will appear here</p>
            </div>
        `;
        return;
    }
    
    console.log('Rendering', posts.length, 'posts');
    
    posts.forEach(post => {
        const postCard = document.createElement('div');
        postCard.className = `post-card ${post.score >= 85 ? 'high-potential' : post.score >= 70 ? 'medium-potential' : 'low-potential'}`;
        postCard.setAttribute('data-post-id', post.id);
        postCard.setAttribute('data-subreddit', post.subreddit);
        postCard.setAttribute('data-created-at', post.created_at);
        
        // Add Reddit post ID for commenting
        if (post.reddit_post_id) {
            postCard.setAttribute('data-reddit-post-id', post.reddit_post_id);
            console.log('Added Reddit post ID to card:', post.reddit_post_id);
        } else if (post.reddit_id) {
            const redditPostId = `t3_${post.reddit_id}`;
            postCard.setAttribute('data-reddit-post-id', redditPostId);
            console.log('Constructed Reddit post ID for card:', redditPostId);
        } else {
            console.warn('No Reddit post ID found for post:', post.id);
        }
        
        // Format time
        const timeAgo = formatTimeAgo(new Date(post.created_at));
        console.log('Post time debug:', { 
            created_at: post.created_at, 
            timeAgo: timeAgo,
            postId: post.id 
        });
        
        // Add contacted badge if applicable
        const contactedBadge = post.is_contacted ? '<span class="contacted-badge">Contacted</span>' : '';
        
        postCard.innerHTML = `
            <div class="post-header">
                <div class="post-meta">
                    <span class="platform">r/${post.subreddit}</span>
                    <span class="time">${timeAgo}</span>
                    ${contactedBadge}
                </div>
                <div class="post-score">
                    <i class="fas fa-star"></i>
                    <span>${post.score}%</span>
                </div>
            </div>
            <div class="post-content">
                <h3>${post.title}</h3>
                <div class="post-text-container">
                    <p class="post-text">${post.content || 'No content available'}</p>
                </div>
            </div>
                <div class="post-actions">
                    <button class="btn btn-primary" onclick="writeComment('${post.id}', '${post.subreddit}', '${(post.title || '').replace(/'/g, "\\'")}', '${(post.content || '').replace(/'/g, "\\'")}', '${post.created_at}')">
                        <i class="fas fa-comment"></i>
                        Comment
                    </button>
                    <button class="btn btn-secondary" onclick="showRedditPost('${post.reddit_id}', '${post.subreddit}')">
                        <i class="fas fa-external-link-alt"></i>
                        Show
                    </button>
                    <button class="btn btn-tertiary" onclick="togglePostExpansion(this)">
                        <i class="fas fa-expand-arrows-alt"></i>
                        Show All
                    </button>
                </div>
        `;
        postsGrid.appendChild(postCard);
    });
    
    // Add event listeners to new post action buttons
    addPostActionListeners();
    
    // Read more functionality removed
}

// Toggle post expansion functionality
function togglePostExpansion(button) {
    const postCard = button.closest('.post-card');
    const postText = postCard.querySelector('.post-text');
    const icon = button.querySelector('i');
    
    if (postCard.classList.contains('expanded')) {
        // Collapse
        postCard.classList.remove('expanded');
        postText.style.maxHeight = '4.5em';
        icon.className = 'fas fa-expand-arrows-alt';
        button.innerHTML = '<i class="fas fa-expand-arrows-alt"></i> Show All';
    } else {
        // Expand
        postCard.classList.add('expanded');
        postText.style.maxHeight = 'none';
        icon.className = 'fas fa-compress-arrows-alt';
        button.innerHTML = '<i class="fas fa-compress-arrows-alt"></i> Show Less';
    }
}

// Format time ago
function formatTimeAgo(date) {
    if (!date || isNaN(new Date(date).getTime())) {
        return 'Unknown time';
    }
    
    const now = new Date();
    const postDate = new Date(date);
    const diffInSeconds = Math.floor((now - postDate) / 1000);
    
    if (diffInSeconds < 60) {
        return 'Just now';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 604800) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
        const weeks = Math.floor(diffInSeconds / 604800);
        return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    }
}

// Add post action listeners
function addPostActionListeners() {
    const commentBtns = document.querySelectorAll('#campaign-posts-grid .post-actions .btn-primary');
    const viewBtns = document.querySelectorAll('#campaign-posts-grid .post-actions .btn-secondary');
    
    commentBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const postCard = this.closest('.post-card');
            showCommentPopup(postCard);
        });
    });
    
    viewBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const postTitle = this.closest('.post-card').querySelector('.post-content h3').textContent;
            showNotification(`Opening: ${postTitle}`, 'info');
        });
    });
}

// Show comment popup
function showCommentPopup(postCard) {
    const popup = document.getElementById('comment-popup');
    const postPreview = document.getElementById('post-preview');
    
    // Get post data
    const title = postCard.querySelector('.post-content h3').textContent;
    const content = postCard.querySelector('.post-content p').textContent;
    const platform = postCard.querySelector('.platform').textContent;
    const time = postCard.querySelector('.time').textContent;
    const score = postCard.querySelector('.post-score span').textContent;
    
    // Create post preview HTML
    postPreview.innerHTML = `
        <div class="post-header">
            <div class="post-meta">
                <span class="platform">${platform}</span>
                <span class="time">${time}</span>
            </div>
            <div class="post-score">
                <i class="fas fa-star"></i>
                <span>${score}</span>
            </div>
        </div>
        <div class="post-content">
            <h4>${title}</h4>
            <p>${content}</p>
        </div>
    `;
    
    // Show popup
    popup.classList.add('active');
    
    // Add event listeners
    setupCommentPopupListeners();
}

// Setup comment popup listeners
function setupCommentPopupListeners() {
    const popup = document.getElementById('comment-popup');
    const closeBtn = document.getElementById('popup-close');
    const sendBtn = document.getElementById('send-comment');
    const aiBtn = document.getElementById('write-with-ai');
    const textarea = document.getElementById('comment-text');
    
    // Close popup
    closeBtn.addEventListener('click', closeCommentPopup);
    popup.querySelector('.popup-overlay').addEventListener('click', closeCommentPopup);
    
    // Send comment
    sendBtn.addEventListener('click', async function() {
        const comment = textarea.value.trim();
        if (!comment) {
            showNotification('Please write a comment first', 'warning');
            return;
        }
        
        // Store original button text outside try-catch
        const originalText = sendBtn.innerHTML;
        
        try {
            // Get the post ID from the current post
            const postPreview = document.getElementById('post-preview');
            console.log('Post preview element:', postPreview);
            console.log('Post preview attributes:', postPreview ? Object.fromEntries(Array.from(postPreview.attributes).map(attr => [attr.name, attr.value])) : 'No element found');
            
            const postId = postPreview ? postPreview.getAttribute('data-reddit-id') : null;
            console.log('Reddit post ID from element:', postId);
            
            if (!postId) {
                console.error('No Reddit post ID found in data-reddit-id attribute');
                showNotification('Post ID not found - please try again', 'error');
                return;
            }
            
            // Show loading state
            sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            sendBtn.disabled = true;
            
            // Post comment to Reddit
            await postSparkDB.postRedditComment(postId, comment);
            
            showNotification('Comment posted to Reddit successfully!', 'success');
            closeCommentPopup();
            
        } catch (error) {
            console.error('Error posting comment:', error);
            showNotification('Error posting comment: ' + error.message, 'error');
        } finally {
            // Reset button state
            sendBtn.innerHTML = originalText;
            sendBtn.disabled = false;
        }
    });
    
    // Write with AI
    aiBtn.addEventListener('click', async function() {
        console.log('AI Button clicked, currentPostData:', currentPostData); // Debug log
        
        if (!currentPostData) {
            console.error('No currentPostData available, trying to get from DOM'); // Debug log
            
            // Try to get post data from the current comment popup
            const postPreview = document.getElementById('post-preview');
            console.log('Post preview element:', postPreview); // Debug log
            
            if (postPreview) {
                const titleElement = postPreview.querySelector('h4');
                const contentElement = postPreview.querySelector('p');
                
                console.log('Title element:', titleElement); // Debug log
                console.log('Content element:', contentElement); // Debug log
                
                if (titleElement && contentElement) {
                    currentPostData = {
                        id: 'unknown',
                        title: titleElement.textContent,
                        content: contentElement.textContent,
                        subreddit: 'unknown'
                    };
                    console.log('Post data recovered from DOM:', currentPostData);
                } else {
                    console.log('Could not find title or content elements in post preview');
                }
            } else {
                console.log('Post preview element not found');
            }
            
            if (!currentPostData) {
                showNotification('No post data available for AI generation. Please select a post first.', 'error');
                return;
            }
        }
        
        // Check if we have a saved AI style for this campaign
        const campaignId = window.currentCampaignId;
        if (!campaignId) {
            showNotification('No campaign selected. Please select a campaign first.', 'error');
            return;
        }
        
        // Check if user has saved writing style for this campaign
        console.log('Campaign ID:', campaignId);
        
        try {
            const savedStyle = WritingStyleManager.getStyle(campaignId);
            console.log('Saved style:', savedStyle);
            
            if (savedStyle) {
                // Use saved style and show info
                console.log('Using saved style');
                showAIStyleInfoNew(savedStyle);
                await generateAIResponseWithSavedStyleNew(savedStyle);
            } else {
                // Show AI style popup for first time setup
                console.log('No saved style, showing popup');
                showAIStylePopup();
            }
        } catch (error) {
            console.error('Error in AI button logic:', error);
            showNotification('Error: ' + error.message, 'error');
        }
    });
    
    // Edit AI Style button
    const editAIStyleBtn = document.getElementById('edit-ai-style');
    if (editAIStyleBtn) {
        editAIStyleBtn.addEventListener('click', async function() {
            // Load saved style settings and show popup
            console.log('Edit AI style button clicked');
            await loadStyleSettings();
            
            // Wait a bit for DOM to be ready
            setTimeout(() => {
                const aiPopup = document.getElementById('ai-style-popup');
                console.log('Looking for ai-style-popup element for editing:', aiPopup);
                
                if (aiPopup) {
                    aiPopup.style.display = 'flex';
                    console.log('AI style popup displayed for editing');
                } else {
                    console.error('AI style popup element not found for editing');
                    showNotification('AI style popup not found. Please refresh the page.', 'error');
                }
            }, 100);
        });
    }
    
    // Connect Reddit button
    const connectRedditBtn = document.getElementById('connect-reddit-btn');
    if (connectRedditBtn) {
        connectRedditBtn.addEventListener('click', function() {
            connectRedditAccount();
        });
    }
    
    // Clear textarea when popup opens
    textarea.value = '';
}

// Close comment popup
function closeCommentPopup() {
    const popup = document.getElementById('comment-popup');
    popup.classList.remove('active');
}

// Apply post filter
function applyPostFilter(filter) {
    const postsGrid = document.getElementById('campaign-posts-grid');
    const posts = Array.from(postsGrid.querySelectorAll('.post-card'));
    
    // Store original posts if not already stored
    if (!postsGrid.dataset.originalPosts) {
        postsGrid.dataset.originalPosts = JSON.stringify(posts.map(post => ({
            html: post.outerHTML,
            score: parseInt(post.querySelector('.post-score span').textContent)
        })));
    }
    
    const originalPosts = JSON.parse(postsGrid.dataset.originalPosts);
    
    let filteredPosts = [...originalPosts];
    
    switch(filter) {
        case 'high':
            filteredPosts = originalPosts.filter(post => post.score >= 90);
            break;
        case 'medium':
            filteredPosts = originalPosts.filter(post => post.score >= 70 && post.score < 90);
            break;
        case 'low':
            filteredPosts = originalPosts.filter(post => post.score < 70);
            break;
        case 'high-low':
            filteredPosts.sort((a, b) => b.score - a.score);
            break;
        case 'low-high':
            filteredPosts.sort((a, b) => a.score - b.score);
            break;
        case 'all':
        default:
            // Show all posts
            break;
    }
    
    // Clear and re-render posts
    postsGrid.innerHTML = '';
    filteredPosts.forEach(post => {
        const postElement = document.createElement('div');
        postElement.innerHTML = post.html;
        postsGrid.appendChild(postElement.firstElementChild);
    });
    
    // Re-add event listeners to new posts
    addPostActionListeners();
    
    // Show notification
    const filterNames = {
        'all': 'All Posts',
        'high': 'High Potential Only',
        'medium': 'Medium Potential Only',
        'low': 'Low Potential Only',
        'high-low': 'High to Low',
        'low-high': 'Low to High'
    };
    
    showNotification(`Filtered: ${filterNames[filter]}`, 'info');
}

// Update filter button text
function updateFilterButtonText(text) {
    const filterBtn = document.getElementById('filter-btn');
    const filterIcon = filterBtn.querySelector('i:first-child');
    const chevronIcon = filterBtn.querySelector('i:last-child');
    
    filterBtn.innerHTML = `
        ${filterIcon.outerHTML}
        ${text}
        ${chevronIcon.outerHTML}
    `;
}

// Toggle campaign status
function toggleCampaignStatus(statusElement) {
    const isActive = statusElement.classList.contains('active');
    const campaignCard = statusElement.closest('.campaign-card');
    const campaignName = campaignCard.getAttribute('data-campaign');
    
    if (isActive) {
        // Deactivate campaign
        statusElement.classList.remove('active');
        statusElement.classList.add('inactive');
        statusElement.textContent = 'Inactive';
        
        showNotification(`Campaign "${campaignName}" deactivated`, 'warning');
    } else {
        // Activate campaign
        statusElement.classList.remove('inactive');
        statusElement.classList.add('active');
        statusElement.textContent = 'Active';
        
        showNotification(`Campaign "${campaignName}" activated`, 'success');
    }
}

// Refresh campaign posts
async function refreshCampaignPosts() {
    const refreshBtn = document.querySelector('.refresh-btn');
    const icon = refreshBtn.querySelector('i');
    
    // Add spinning animation
    icon.classList.add('fa-spin');
    refreshBtn.disabled = true;
    
    showNotification('Searching for new posts...', 'info');
    
    try {
        // Get current campaign ID from the URL or global variable
        const currentCampaignId = window.currentCampaignId;
        if (!currentCampaignId) {
            throw new Error('No campaign selected');
        }
        
        // Get current post count before refresh
        const currentPosts = await postSparkDB.getPosts(currentCampaignId);
        const currentPostCount = currentPosts.length;
        
        console.log('Refreshing campaign posts with current data...');
        
        // Find new Reddit leads for the current campaign using latest campaign data
        await postSparkDB.findRedditLeads(currentCampaignId);
        
        // Get new post count after refresh
        const newPosts = await postSparkDB.getPosts(currentCampaignId);
        const newPostCount = newPosts.length;
        const newLeadsFound = newPostCount - currentPostCount;
        
        // Reload the campaign posts
        await showCampaignPosts(currentCampaignId);
        
        // Update campaign stats
        await loadCampaigns();
        
        showNotification('Campaign refreshed successfully!', 'success');
        
    } catch (error) {
        console.error('Error refreshing posts:', error);
        showNotification('Error refreshing posts: ' + error.message, 'error');
    } finally {
        // Reset button state
        icon.classList.remove('fa-spin');
        refreshBtn.disabled = false;
    }
}

// Show delete confirmation
function showDeleteConfirmation() {
    if (confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
        showNotification('Campaign deleted successfully!', 'success');
        // In a real app, this would delete the campaign
        setTimeout(() => {
            showCampaigns();
        }, 1000);
    }
}

// Show create campaign page
function showCreateCampaign() {
    console.log('showCreateCampaign called'); // Debug log
    
    // Always use direct page switching for local development
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    
    // Show create campaign page
    const createCampaignPage = document.getElementById('create-campaign');
    if (createCampaignPage) {
        createCampaignPage.classList.add('active');
        console.log('Create campaign page activated'); // Debug log
    } else {
        console.error('Create campaign page not found'); // Debug log
    }
    
    // Reset to step 1 (use modern version)
    resetModernCampaignCreation();
}

// Show campaigns page
function showCampaigns() {
    // Always use direct page switching for local development
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    
    // Show campaigns page
    document.getElementById('campaigns').classList.add('active');
    
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    document.querySelector('[data-page="campaigns"]').classList.add('active');
}

// Initialize modern campaign creation flow
function initializeCampaignCreation() {
    // Modern step navigation
    const modernNextStepBtns = document.querySelectorAll('.next-step-btn');
    modernNextStepBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const nextStep = this.getAttribute('data-next');
            goToModernStep(nextStep);
        });
    });
    
    // Modern campaign setup (now direct to manual)
    
    // Modern manual campaign creation
    const modernCreateManualBtn = document.querySelector('.create-manual-campaign-btn');
    if (modernCreateManualBtn) {
        modernCreateManualBtn.addEventListener('click', function() {
            createModernManualCampaign();
        });
    }
    
    // Modern keywords input functionality
    initializeModernKeywordsInput();
    
    // Modern find leads button
    const modernFindLeadsBtn = document.querySelector('.find-leads-btn');
    if (modernFindLeadsBtn) {
        modernFindLeadsBtn.addEventListener('click', function() {
            findModernLeadsOnReddit();
        });
    }
    
    // Legacy support for old campaign creation
    const legacyNextStepBtns = document.querySelectorAll('.next-step-btn:not([data-next])');
    legacyNextStepBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const nextStep = this.getAttribute('data-next');
            goToStep(nextStep);
        });
    });
    
    const legacyCampaignOptions = document.querySelectorAll('.campaign-option:not([data-type])');
    legacyCampaignOptions.forEach(option => {
        option.addEventListener('click', function() {
            const type = this.getAttribute('data-type');
            selectCampaignType(type);
        });
    });
    
    const legacyAnalyzeBtn = document.querySelector('.analyze-website-btn:not(.modern-btn)');
    // Legacy website analysis removed
    
    const legacyCreateManualBtn = document.querySelector('.create-manual-campaign-btn:not(.modern-btn)');
    if (legacyCreateManualBtn) {
        legacyCreateManualBtn.addEventListener('click', function() {
            createManualCampaign();
        });
    }
    
    initializeKeywordsInput();
    
    const legacyFindLeadsBtn = document.querySelector('.find-leads-btn:not(.modern-btn)');
    if (legacyFindLeadsBtn) {
        legacyFindLeadsBtn.addEventListener('click', function() {
            findLeadsOnReddit();
        });
    }
}

// Modern step navigation
function goToModernStep(stepNumber) {
    // Update progress indicator
    document.querySelectorAll('.progress-step').forEach(step => {
        step.classList.remove('active', 'completed');
    });
    
    // Mark previous steps as completed
    for (let i = 1; i < stepNumber; i++) {
        const prevStep = document.querySelector(`.progress-step[data-step="${i}"]`);
        if (prevStep) {
            prevStep.classList.add('completed');
        }
    }
    
    // Mark current step as active
    const currentStep = document.querySelector(`.progress-step[data-step="${stepNumber}"]`);
    if (currentStep) {
        currentStep.classList.add('active');
    }
    
    // Update form steps
    document.querySelectorAll('.form-step').forEach(step => step.classList.remove('active'));
    const targetStep = document.getElementById(`modern-step-${stepNumber}`);
    if (targetStep) {
        targetStep.classList.add('active');
    }
    
    // Add smooth transition
    if (targetStep) {
        targetStep.style.opacity = '0';
        targetStep.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            targetStep.style.transition = 'all 0.3s ease';
            targetStep.style.opacity = '1';
            targetStep.style.transform = 'translateY(0)';
        }, 50);
    }
}

// Modern campaign setup (simplified - no AI analysis needed)

// Modern manual campaign creation
function createModernManualCampaign() {
    const keywords = getModernKeywordsArray();
    const offer = document.getElementById('modern-offer').value;
    
    if (keywords.length === 0 || !offer) {
        showNotification('Please add keywords and describe your offer', 'warning');
        return;
    }
    
    showModernCampaignResults(keywords, offer);
}

// Modern keywords input functionality
function initializeModernKeywordsInput() {
    const keywordField = document.getElementById('modern-keyword-field');
    if (keywordField) {
        keywordField.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addModernKeyword(this.value.trim());
                this.value = '';
            }
        });
    }
}

// Add modern keyword
function addModernKeyword(keyword) {
    if (!keyword) return;
    
    const keywordsTags = document.getElementById('modern-keywords-tags');
    if (!keywordsTags) return;
    
    // Check if keyword already exists
    const existingKeywords = Array.from(keywordsTags.querySelectorAll('.keyword-tag')).map(tag => tag.dataset.keyword);
    if (existingKeywords.includes(keyword)) {
        showNotification('Keyword already exists', 'warning');
        return;
    }
    
    // Create keyword tag with animation
    const tag = document.createElement('div');
    tag.className = 'keyword-tag';
    tag.dataset.keyword = keyword;
    tag.innerHTML = `
        ${keyword}
        <button type="button" class="remove-keyword" onclick="removeModernKeyword(this)">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    tag.style.opacity = '0';
    tag.style.transform = 'scale(0.8)';
    keywordsTags.appendChild(tag);
    
    // Animate in
    setTimeout(() => {
        tag.style.transition = 'all 0.3s ease';
        tag.style.opacity = '1';
        tag.style.transform = 'scale(1)';
    }, 50);
}

// Remove modern keyword
function removeModernKeyword(button) {
    const tag = button.closest('.keyword-tag');
    if (tag) {
        tag.style.transition = 'all 0.3s ease';
        tag.style.opacity = '0';
        tag.style.transform = 'scale(0.8)';
        
        setTimeout(() => {
            tag.remove();
        }, 300);
    }
}

// Get modern keywords array
function getModernKeywordsArray() {
    const keywordsTags = document.getElementById('modern-keywords-tags');
    if (!keywordsTags) return [];
    
    return Array.from(keywordsTags.querySelectorAll('.keyword-tag')).map(tag => tag.dataset.keyword);
}

// Show modern campaign results
function showModernCampaignResults(keywords, offer) {
    // Update display elements
    const campaignNameDisplay = document.getElementById('modern-campaign-name-display');
    const keywordsDisplay = document.getElementById('modern-keywords-display');
    const offerDisplay = document.getElementById('modern-offer-display');
    
    if (campaignNameDisplay) {
        campaignNameDisplay.textContent = document.getElementById('modern-campaign-name').value || 'Untitled Campaign';
    }
    
    if (keywordsDisplay) {
        keywordsDisplay.innerHTML = keywords.map(keyword => 
            `<span class="keyword-tag">${keyword}</span>`
        ).join('');
    }
    
    if (offerDisplay) {
        offerDisplay.textContent = offer;
    }
    
    // Go to step 3
    goToModernStep('3');
}

// Modern find leads on Reddit
async function findModernLeadsOnReddit() {
    try {
        // Get campaign data from form
        const campaignName = document.getElementById('modern-campaign-name').value;
        const keywords = getModernKeywordsArray();
        const offer = document.getElementById('modern-offer').value;
        const websiteUrl = document.getElementById('website-url').value;
        
        if (!campaignName || keywords.length === 0 || !offer) {
            showNotification('Please fill in all required fields', 'warning');
            return;
        }
        
        // Show loading page
        showRedditSearchLoading();
        
        // Create campaign in database
        const campaignData = {
            name: campaignName,
            description: offer,
            keywords: keywords,
            website_url: websiteUrl,
            subreddits: ['r/entrepreneur', 'r/startups', 'r/smallbusiness', 'r/marketing'],
            target_audience: 'Small business owners, entrepreneurs, project managers'
        };
        
        // Simulate Reddit search with step progression
        setTimeout(() => {
            updateLoadingStep(1);
        }, 1000);
        
        setTimeout(() => {
            updateLoadingStep(2);
        }, 2000);
        
        setTimeout(() => {
            updateLoadingStep(3);
        }, 3000);
        
        setTimeout(async () => {
            updateLoadingStep(4);
            
            try {
                // Create campaign in database
                const campaign = await postSparkDB.createCampaign(campaignData);
                
                // Find Reddit leads using OpenAI
                const redditPosts = await postSparkDB.findRedditLeads(campaign.id);
                
                // Campaign created successfully (no notification needed)
                
                // Show rate limit warning if applicable
                if (window.redditRateLimitMessage) {
                    setTimeout(() => {
                        showNotification(window.redditRateLimitMessage, 'warning');
                        window.redditRateLimitMessage = null; // Clear after showing
                    }, 2000);
                }
                
                // Reload campaigns to show the new one
                await loadCampaigns();
                
                // Go back to campaigns
                setTimeout(() => {
                    showCampaigns();
                }, 1000);
                
            } catch (error) {
                console.error('Error creating campaign:', error);
                showNotification('Error creating campaign: ' + error.message, 'error');
            }
        }, 4000);
        
    } catch (error) {
        console.error('Error in findModernLeadsOnReddit:', error);
        showNotification('Error creating campaign: ' + error.message, 'error');
    }
}

// Reset modern campaign creation
function resetModernCampaignCreation() {
    // Reset progress indicator
    document.querySelectorAll('.progress-step').forEach(step => {
        step.classList.remove('active', 'completed');
    });
    document.querySelector('.progress-step[data-step="1"]').classList.add('active');
    
    // Reset form steps
    document.querySelectorAll('.form-step').forEach(step => step.classList.remove('active'));
    document.getElementById('modern-step-1').classList.add('active');
    
    // Clear forms
    const campaignNameInput = document.getElementById('modern-campaign-name');
    const websiteUrlInput = document.getElementById('modern-website-url');
    const keywordFieldInput = document.getElementById('modern-keyword-field');
    const offerInput = document.getElementById('modern-offer');
    
    if (campaignNameInput) campaignNameInput.value = '';
    if (websiteUrlInput) websiteUrlInput.value = '';
    if (keywordFieldInput) keywordFieldInput.value = '';
    if (offerInput) offerInput.value = '';
    
    // Clear keywords tags
    const keywordsTags = document.getElementById('modern-keywords-tags');
    if (keywordsTags) {
        keywordsTags.innerHTML = '';
    }
    
    // Hide setup forms
    const aiForm = document.getElementById('modern-ai-setup-form');
    const manualForm = document.getElementById('modern-manual-setup-form');
    
    if (aiForm) aiForm.style.display = 'none';
    if (manualForm) manualForm.style.display = 'none';
    
    // Reset options
    document.querySelectorAll('.setup-option').forEach(option => option.classList.remove('selected'));
}

// Reset campaign creation to step 1 (legacy)
function resetCampaignCreation() {
    // Reset steps
    document.querySelectorAll('.step').forEach(step => step.classList.remove('active'));
    document.querySelector('.step[data-step="1"]').classList.add('active');
    
    // Reset campaign steps
    document.querySelectorAll('.campaign-step').forEach(step => step.classList.remove('active'));
    document.getElementById('step-1').classList.add('active');
    
    // Clear forms
    document.getElementById('campaign-name').value = '';
    document.getElementById('website-url').value = '';
    document.getElementById('keyword-field').value = '';
    document.getElementById('offer').value = '';
    
    // Clear keywords tags
    const keywordsTags = document.getElementById('keywords-tags');
    if (keywordsTags) {
        keywordsTags.innerHTML = '';
    }
    
    // Hide setup forms
    document.getElementById('ai-setup-form').style.display = 'none';
    document.getElementById('manual-setup-form').style.display = 'none';
    
    // Reset options
    document.querySelectorAll('.campaign-option').forEach(option => option.classList.remove('selected'));
}

// Go to specific step
function goToStep(stepNumber) {
    // Update step indicator
    document.querySelectorAll('.step').forEach(step => step.classList.remove('active'));
    document.querySelector(`.step[data-step="${stepNumber}"]`).classList.add('active');
    
    // Update campaign steps
    document.querySelectorAll('.campaign-step').forEach(step => step.classList.remove('active'));
    document.getElementById(`step-${stepNumber}`).classList.add('active');
}

// Select campaign type
function selectCampaignType(type) {
    // Update option selection
    document.querySelectorAll('.campaign-option').forEach(option => option.classList.remove('selected'));
    document.querySelector(`[data-type="${type}"]`).classList.add('selected');
    
    // Show appropriate form
    if (type === 'ai') {
        document.getElementById('ai-setup-form').style.display = 'block';
        document.getElementById('manual-setup-form').style.display = 'none';
    } else if (type === 'manual') {
        document.getElementById('ai-setup-form').style.display = 'none';
        document.getElementById('manual-setup-form').style.display = 'block';
    }
}

// Website analysis removed - now using direct manual setup
function analyzeWebsite() {
    const websiteUrl = document.getElementById('website-url').value;
    if (!websiteUrl) {
        showNotification('Please enter a website URL', 'warning');
        return;
    }
    
    // Show loading page
    showWebsiteAnalysisLoading();
    
    // Simulate AI analysis with step progression
    setTimeout(() => {
        updateLoadingStep(1);
    }, 1000);
    
    setTimeout(() => {
        updateLoadingStep(2);
    }, 2000);
    
    setTimeout(() => {
        updateLoadingStep(3);
    }, 3000);
    
    setTimeout(() => {
        updateLoadingStep(4);
        // Simulate AI results
        const keywords = ['project management', 'task tracking', 'team collaboration', 'workflow automation', 'productivity tools'];
        const offer = 'A comprehensive project management solution that helps teams organize tasks, track progress, and collaborate effectively with advanced workflow automation features.';
        
        // Go back to create campaign page
        showCreateCampaign();
        
        // Show results after a short delay
        setTimeout(() => {
            showCampaignResults(keywords, offer);
            showNotification('AI analysis completed!', 'success');
        }, 500);
    }, 4000);
}

// Show website analysis loading page
function showWebsiteAnalysisLoading() {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    
    // Show loading page
    document.getElementById('website-analysis-loading').classList.add('active');
    
    // Reset loading steps
    resetLoadingSteps();
}

// Update loading step
function updateLoadingStep(stepNumber) {
    const steps = document.querySelectorAll('.loading-step');
    steps.forEach((step, index) => {
        step.classList.remove('active');
        if (index < stepNumber) {
            step.classList.add('active');
        }
    });
}

// Reset loading steps
function resetLoadingSteps() {
    const steps = document.querySelectorAll('.loading-step');
    steps.forEach((step, index) => {
        step.classList.remove('active');
        if (index === 0) {
            step.classList.add('active');
        }
    });
}

// Initialize keywords input functionality
function initializeKeywordsInput() {
    const keywordField = document.getElementById('keyword-field');
    if (keywordField) {
        keywordField.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addKeyword(this.value.trim());
                this.value = '';
            }
        });
    }
}

// Add keyword to the list
function addKeyword(keyword) {
    if (!keyword) return;
    
    const keywordsTags = document.getElementById('keywords-tags');
    if (!keywordsTags) return;
    
    // Check if keyword already exists
    const existingKeywords = Array.from(keywordsTags.querySelectorAll('.keyword-tag')).map(tag => tag.dataset.keyword);
    if (existingKeywords.includes(keyword)) {
        showNotification('Keyword already exists', 'warning');
        return;
    }
    
    // Create keyword tag
    const tag = document.createElement('div');
    tag.className = 'keyword-tag';
    tag.dataset.keyword = keyword;
    tag.innerHTML = `
        ${keyword}
        <button type="button" class="remove-keyword" onclick="removeKeyword(this)">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    keywordsTags.appendChild(tag);
}

// Remove keyword from the list
function removeKeyword(button) {
    const tag = button.closest('.keyword-tag');
    if (tag) {
        tag.remove();
    }
}

// Get all keywords as array
function getKeywordsArray() {
    const keywordsTags = document.getElementById('keywords-tags');
    if (!keywordsTags) return [];
    
    return Array.from(keywordsTags.querySelectorAll('.keyword-tag')).map(tag => tag.dataset.keyword);
}

// Create manual campaign
function createManualCampaign() {
    const keywords = getKeywordsArray();
    const offer = document.getElementById('offer').value;
    
    if (keywords.length === 0 || !offer) {
        showNotification('Please add keywords and describe your offer', 'warning');
        return;
    }
    
    showCampaignResults(keywords, offer);
}

// Show campaign results
function showCampaignResults(keywords, offer) {
    // Update results
    const keywordsList = document.getElementById('keywords-list');
    keywordsList.innerHTML = keywords.map(keyword => 
        `<span class="keyword-tag">${keyword}</span>`
    ).join('');
    
    document.getElementById('offer-text').textContent = offer;
    
    // Go to step 3
    goToStep('3');
}

// Find leads on Reddit
function findLeadsOnReddit() {
    // Show loading page
    showRedditSearchLoading();
    
    // Simulate Reddit search with step progression
    setTimeout(() => {
        updateLoadingStep(1);
    }, 1000);
    
    setTimeout(() => {
        updateLoadingStep(2);
    }, 2000);
    
    setTimeout(() => {
        updateLoadingStep(3);
    }, 3000);
    
    setTimeout(() => {
        updateLoadingStep(4);
        // Campaign created successfully (no notification needed)
        
        // Go back to campaigns
        setTimeout(() => {
            showCampaigns();
        }, 1000);
    }, 4000);
}

// Show Reddit search loading page
function showRedditSearchLoading() {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    
    // Show loading page
    document.getElementById('reddit-search-loading').classList.add('active');
    
    // Reset loading steps
    resetLoadingSteps();
}

// Initialize settings functionality
function initializeSettings() {
    // Profile form save
    const saveProfileBtn = document.querySelector('.profile-form .btn-primary');
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', function() {
            saveProfile();
        });
    }
    
    // Cancel subscription
    const cancelSubscriptionBtn = document.querySelector('.subscription-actions .btn-danger');
    if (cancelSubscriptionBtn) {
        cancelSubscriptionBtn.addEventListener('click', function() {
            cancelSubscription();
        });
    }
    
    // Upgrade plan
    const upgradePlanBtn = document.querySelector('.subscription-actions .btn-primary');
    if (upgradePlanBtn) {
        upgradePlanBtn.addEventListener('click', function() {
            upgradePlan();
        });
    }
}

// Save profile changes
function saveProfile() {
    const name = document.getElementById('profile-name').value;
    const email = document.getElementById('profile-email').value;
    
    if (!name || !email) {
        showNotification('Please fill in all fields', 'warning');
        return;
    }
    
    if (!isValidEmail(email)) {
        showNotification('Please enter a valid email address', 'warning');
        return;
    }
    
    // Show loading state
    const saveBtn = document.querySelector('.profile-form .btn-primary');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    saveBtn.disabled = true;
    
    // Simulate save process
    setTimeout(() => {
        showNotification('Profile updated successfully!', 'success');
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }, 1500);
}

// Validate email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Cancel subscription
function cancelSubscription() {
    if (confirm('Are you sure you want to cancel your subscription? You will lose access to all premium features.')) {
        // Show loading state
        const cancelBtn = document.querySelector('.subscription-actions .btn-danger');
        const originalText = cancelBtn.innerHTML;
        cancelBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cancelling...';
        cancelBtn.disabled = true;
        
        // Simulate cancellation process
        setTimeout(() => {
            showNotification('Subscription cancelled. You can reactivate anytime.', 'warning');
            cancelBtn.innerHTML = originalText;
            cancelBtn.disabled = false;
        }, 2000);
    }
}

// Upgrade plan
function upgradePlan() {
    // Show loading state
    const upgradeBtn = document.querySelector('.subscription-actions .btn-primary');
    const originalText = upgradeBtn.innerHTML;
    upgradeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Redirecting...';
    upgradeBtn.disabled = true;
    
    // Simulate redirect process
    setTimeout(() => {
        showNotification('Redirecting to upgrade page...', 'info');
        upgradeBtn.innerHTML = originalText;
        upgradeBtn.disabled = false;
        // In a real app, this would redirect to billing/upgrade page
    }, 1000);
}

// Notification system
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 2rem;
        right: 2rem;
        background: ${getNotificationColor(type)};
        color: #ffffff;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || icons.info;
}

function getNotificationColor(type) {
    const colors = {
        success: 'linear-gradient(135deg, #4ade80, #22c55e)',
        error: 'linear-gradient(135deg, #ef4444, #dc2626)',
        warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
        info: 'linear-gradient(135deg, #3b82f6, #2563eb)'
    };
    return colors[type] || colors.info;
}

// Initialize animations
function initializeAnimations() {
    // Animate stats cards on load
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.6s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
    
    // Animate post cards
    const postCards = document.querySelectorAll('.post-card');
    postCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.6s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, (index * 100) + 300);
    });
    
    // Animate campaign cards
    const campaignCards = document.querySelectorAll('.campaign-card');
    campaignCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.6s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, (index * 100) + 600);
    });
    
    // Animate navigation items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateX(-20px)';
        
        setTimeout(() => {
            item.style.transition = 'all 0.4s ease';
            item.style.opacity = '1';
            item.style.transform = 'translateX(0)';
        }, index * 50);
    });
}

// Add hover effects for interactive elements
function initializeRippleEffects() {
    // Add ripple effect to buttons
    const buttons = document.querySelectorAll('.btn');
    
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                transform: scale(0);
                animation: ripple 0.6s ease-out;
                pointer-events: none;
            `;
            
            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
    
    // Add CSS for ripple animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes ripple {
            to {
                transform: scale(2);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

// Global functions for registration
function initializeRegistration() {
    const registrationForm = document.getElementById('registration-form');
    const passwordToggle = document.getElementById('password-toggle');
    const confirmPasswordToggle = document.getElementById('confirm-password-toggle');
    const loginLink = document.getElementById('login-link');
    
    // Password toggle functionality
    if (passwordToggle) {
        passwordToggle.addEventListener('click', function() {
            togglePasswordVisibility('reg-password', this);
        });
    }
    
    if (confirmPasswordToggle) {
        confirmPasswordToggle.addEventListener('click', function() {
            togglePasswordVisibility('reg-confirm-password', this);
        });
    }
    
    // Form submission
    if (registrationForm) {
        registrationForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleRegistrationSubmit();
        });
    }
    
    // Real-time validation
    const inputs = registrationForm?.querySelectorAll('input[required]');
    inputs?.forEach(input => {
        input.addEventListener('blur', function() {
            validateField(this);
        });
        
        input.addEventListener('input', function() {
            clearFieldError(this);
        });
    });
    
    // Login link
    if (loginLink) {
        loginLink.addEventListener('click', function(e) {
            e.preventDefault();
            showLoginForm();
        });
    }
}

function togglePasswordVisibility(inputId, button) {
    const input = document.getElementById(inputId);
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

function handleRegistrationSubmit() {
    const form = document.getElementById('registration-form');
    const formData = new FormData(form);
    
    // Clear all previous errors
    clearAllErrors();
    
    // Validate all fields
    let isValid = true;
    
    // Name validation
    const name = formData.get('name');
    if (!name || name.trim().length < 2) {
        showFieldError('reg-name', 'Name must be at least 2 characters long');
        isValid = false;
    }
    
    // Email validation
    const email = formData.get('email');
    if (!email || !isValidEmail(email)) {
        showFieldError('reg-email', 'Please enter a valid email address');
        isValid = false;
    }
    
    // Password validation
    const password = formData.get('password');
    if (!password || password.length < 8) {
        showFieldError('reg-password', 'Password must be at least 8 characters long');
        isValid = false;
    } else if (!isStrongPassword(password)) {
        showFieldError('reg-password', 'Password must contain at least one uppercase letter, one lowercase letter, and one number');
        isValid = false;
    }
    
    // Confirm password validation
    const confirmPassword = formData.get('confirmPassword');
    if (password !== confirmPassword) {
        showFieldError('reg-confirm-password', 'Passwords do not match');
        isValid = false;
    }
    
    // Terms validation
    const terms = formData.get('terms');
    if (!terms) {
        showFieldError('reg-terms', 'You must agree to the terms and conditions');
        isValid = false;
    }
    
    if (isValid) {
        // Show loading state
        const submitBtn = document.querySelector('.registration-submit');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
        submitBtn.disabled = true;
        
        // Simulate registration process
        setTimeout(() => {
            showNotification('Account created successfully! Welcome to PostSpark!', 'success');
            
            // Reset form
            form.reset();
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            
            // Redirect to dashboard (simulate)
            setTimeout(() => {
                showNotification('Redirecting to dashboard...', 'info');
                // In a real app, this would redirect to the dashboard
            }, 2000);
        }, 2000);
    }
}

function validateField(field) {
    const value = field.value.trim();
    const fieldName = field.name;
    
    switch (fieldName) {
        case 'name':
            if (value.length < 2) {
                showFieldError(field.id, 'Name must be at least 2 characters long');
                return false;
            }
            break;
            
        case 'email':
            if (!isValidEmail(value)) {
                showFieldError(field.id, 'Please enter a valid email address');
                return false;
            }
            break;
            
        case 'password':
            if (value.length < 8) {
                showFieldError(field.id, 'Password must be at least 8 characters long');
                return false;
            } else if (value.length >= 8 && !isStrongPassword(value)) {
                showFieldError(field.id, 'Password must contain at least one uppercase letter, one lowercase letter, and one number');
                return false;
            }
            break;
            
        case 'confirmPassword':
            const password = document.getElementById('reg-password').value;
            if (value !== password) {
                showFieldError(field.id, 'Passwords do not match');
                return false;
            }
            break;
    }
    
    clearFieldError(field);
    return true;
}

function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorElement = document.getElementById(fieldId + '-error');
    
    if (field) {
        field.classList.add('error');
    }
    
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.add('show');
    }
}

function clearFieldError(field) {
    const fieldId = field.id;
    const errorElement = document.getElementById(fieldId + '-error');
    
    field.classList.remove('error');
    
    if (errorElement) {
        errorElement.classList.remove('show');
        errorElement.textContent = '';
    }
}

function clearAllErrors() {
    const errorMessages = document.querySelectorAll('.error-message');
    const errorInputs = document.querySelectorAll('.modern-input.error');
    
    errorMessages.forEach(error => {
        error.classList.remove('show');
        error.textContent = '';
    });
    
    errorInputs.forEach(input => {
        input.classList.remove('error');
    });
}

function isStrongPassword(password) {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    
    return hasUpperCase && hasLowerCase && hasNumbers;
}

function showLoginForm() {
    showNotification('Login form would open here', 'info');
    // In a real app, this would show a login modal or redirect to login page
}

// Campaign Management Functions
async function createCampaign(campaignData) {
    try {
        const campaign = await postSparkDB.createCampaign(campaignData);
        // Campaign created successfully (no notification needed)
        await loadCampaigns(); // Reload campaigns
        return campaign;
    } catch (error) {
        console.error('Error creating campaign:', error);
        showNotification('Error creating campaign: ' + error.message, 'error');
    }
}

async function deleteCampaign(campaignId) {
    if (!confirm('Are you sure you want to delete this campaign?')) {
        return;
    }
    
    try {
        await postSparkDB.deleteCampaign(campaignId);
        showNotification('Campaign deleted successfully!', 'success');
        await loadCampaigns(); // Reload campaigns
    } catch (error) {
        console.error('Error deleting campaign:', error);
        showNotification('Error deleting campaign: ' + error.message, 'error');
    }
}

function createPostCard(post) {
    const card = document.createElement('div');
    card.className = 'post-card';
    card.setAttribute('data-post-id', post.id);
    
    const contactedClass = post.is_contacted ? 'contacted' : '';
    const contactedBadge = post.is_contacted ? '<span class="contacted-badge">Contacted</span>' : '';
    
    card.innerHTML = `
        <div class="post-header">
            <h3>${post.title}</h3>
            ${contactedBadge}
        </div>
        <div class="post-meta">
            <span class="post-author">u/${post.author}</span>
            <span class="post-subreddit">r/${post.subreddit}</span>
            <span class="post-score">${post.score} points</span>
        </div>
        <div class="post-content">
            <p>${post.content || 'No content available'}</p>
        </div>
        <div class="post-actions">
            <button class="btn btn-primary" onclick="writeComment('${post.id}', '${post.subreddit}', '${(post.title || '').replace(/'/g, "\\'")}', '${(post.content || '').replace(/'/g, "\\'")}', '${post.created_at}')">
                <i class="fas fa-comment"></i> Write Comment
            </button>
            ${!post.is_contacted ? `
                <button class="btn btn-secondary" onclick="markAsContacted('${post.id}')">
                    <i class="fas fa-check"></i> Mark as Contacted
                </button>
            ` : ''}
        </div>
    `;
    
    return card;
}

async function markAsContacted(postId) {
    try {
        await postSparkDB.markPostAsContacted(postId);
        showNotification('Post marked as contacted!', 'success');
        
        // Update the UI
        const postCard = document.querySelector(`[data-post-id="${postId}"]`);
        if (postCard) {
            postCard.classList.add('contacted');
            const actions = postCard.querySelector('.post-actions');
            actions.innerHTML = `
                <button class="btn btn-primary" onclick="openCommentForPost('${postId}')">
                    <i class="fas fa-comment"></i> Write Comment
                </button>
            `;
        }
    } catch (error) {
        console.error('Error marking post as contacted:', error);
        showNotification('Error marking post as contacted: ' + error.message, 'error');
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        // Load campaigns to get real data
        const campaigns = await postSparkDB.getCampaigns();
        
        // Calculate real stats from campaigns
        let totalPosts = 0;
        let contactedPosts = 0;
        let highPotential = 0;
        
        for (const campaign of campaigns) {
            const posts = await postSparkDB.getPosts(campaign.id);
            totalPosts += posts.length;
            contactedPosts += posts.filter(post => post.is_contacted).length;
            highPotential += posts.filter(post => post.score >= 85).length;
        }
        
        // Update dashboard stats with real data
        console.log('Dashboard data:', { totalPosts, contactedPosts, highPotential });
        updateDashboardStats({
            total_posts: totalPosts,
            contacted_posts: contactedPosts,
            high_potential: highPotential
        });
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        // Show empty state if no data
        updateDashboardStats({
            total_posts: 0,
            contacted_posts: 0,
            high_potential: 0
        });
    }
}

function updateDashboardStats(data) {
    let totalPosts, contactedPosts, highPotential;
    
    // Handle both analytics array and direct data object
    if (Array.isArray(data)) {
        totalPosts = data.find(a => a.metric_name === 'total_posts')?.metric_value || 0;
        contactedPosts = data.find(a => a.metric_name === 'contacted_posts')?.metric_value || 0;
        highPotential = data.find(a => a.metric_name === 'high_potential')?.metric_value || 0;
    } else {
        // Direct data object
        totalPosts = data.total_posts || 0;
        contactedPosts = data.contacted_posts || 0;
        highPotential = data.high_potential || 0;
    }
    
    // Update the stats cards
    const statCards = document.querySelectorAll('.stat-card');
    if (statCards.length >= 3) {
        statCards[0].querySelector('h3').textContent = totalPosts.toLocaleString();
        statCards[1].querySelector('h3').textContent = contactedPosts.toLocaleString();
        statCards[2].querySelector('h3').textContent = highPotential.toLocaleString();
    }
}

// Initialize campaigns functionality
function initializeCampaigns() {
    // This will be called after the DOM is loaded
    // Campaign functionality is already handled by event delegation
}

// Initialize settings functionality
function initializeSettings() {
    // Load user settings and bind form handlers
    loadUserSettings();
    
    // Bind save profile button
    const saveProfileBtn = document.querySelector('.save-profile-btn');
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', function() {
            saveProfile();
        });
    }
}

async function loadUserSettings() {
    if (!postSparkDB.userData) return;
    
    // Populate settings form with user data
    const nameInput = document.getElementById('profile-name');
    const emailInput = document.getElementById('profile-email');
    const companyInput = document.getElementById('profile-company');
    
    if (nameInput) nameInput.value = postSparkDB.userData.full_name || '';
    if (emailInput) emailInput.value = postSparkDB.userData.email || '';
    if (companyInput) companyInput.value = postSparkDB.userData.company || '';
    
    // Load subscription data
    loadSubscriptionData();
}

function loadSubscriptionData() {
    if (!postSparkDB.userData) return;
    
    const plan = postSparkDB.userData.subscription_plan || 'starter';
    
    // Update plan name
    const planNameElement = document.getElementById('current-plan-name');
    if (planNameElement) {
        planNameElement.textContent = plan.charAt(0).toUpperCase() + plan.slice(1) + ' Plan';
    }
    
    // Update plan price based on subscription
    const planPriceElement = document.getElementById('plan-price');
    const planPeriodElement = document.getElementById('plan-period');
    
    if (planPriceElement && planPeriodElement) {
        switch (plan) {
            case 'starter':
                planPriceElement.textContent = '€0';
                planPeriodElement.textContent = '/month';
                break;
            case 'pro':
                planPriceElement.textContent = '€19';
                planPeriodElement.textContent = '/month';
                break;
            case 'enterprise':
                planPriceElement.textContent = '€49';
                planPeriodElement.textContent = '/month';
                break;
            default:
                planPriceElement.textContent = '€0';
                planPeriodElement.textContent = '/month';
        }
    }
    
    // Update plan features based on subscription
    updatePlanFeatures(plan);
}

function updatePlanFeatures(plan) {
    const featuresContainer = document.querySelector('.plan-features');
    if (!featuresContainer) return;
    
    let features = [];
    
    switch (plan) {
        case 'starter':
            features = [
                '5 Campaigns per Month',
                '100 Leads per Month',
                'Basic Analytics',
                'Email Support'
            ];
            break;
        case 'pro':
            features = [
                'Unlimited Campaigns',
                '1,000 Leads per Month',
                'Advanced Analytics',
                'Priority Support'
            ];
            break;
        case 'enterprise':
            features = [
                'Unlimited Campaigns',
                '10,000 Leads per Month',
                'Advanced Analytics',
                'Priority Support',
                'Custom Integrations'
            ];
            break;
        default:
            features = [
                '5 Campaigns per Month',
                '100 Leads per Month',
                'Basic Analytics',
                'Email Support'
            ];
    }
    
    featuresContainer.innerHTML = features.map(feature => 
        `<div class="feature-item">
            <i class="fas fa-check"></i>
            <span>${feature}</span>
        </div>`
    ).join('');
}

// Save profile settings
async function saveProfile() {
    const name = document.getElementById('profile-name')?.value;
    const company = document.getElementById('profile-company')?.value;
    
    if (!name) {
        showNotification('Name is required', 'error');
        return;
    }
    
    // Show loading state
    const saveBtn = document.querySelector('.save-profile-btn');
    if (saveBtn) {
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        saveBtn.disabled = true;
        
        try {
            await postSparkDB.updateUserProfile({
                full_name: name,
                company: company
            });
            
            showNotification('Profile updated successfully!', 'success');
            updateUserInfo(); // Update sidebar
            
        } catch (error) {
            console.error('Error updating profile:', error);
            showNotification('Error updating profile: ' + error.message, 'error');
        } finally {
            // Reset button state
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }
}

// Open comment for post (when only postId is available)
async function openCommentForPost(postId) {
    // Find the post data from the current campaign posts
    const postElement = document.querySelector(`[data-post-id="${postId}"]`);
    if (!postElement) {
        showNotification('Post not found', 'error');
        return;
    }
    
    const titleElement = postElement.querySelector('h3');
    const contentElement = postElement.querySelector('.post-text');
    const subreddit = postElement.getAttribute('data-subreddit') || 'unknown';
    const created_at = postElement.getAttribute('data-created-at') || new Date().toISOString();
    
    const postData = {
        id: postId,
        title: titleElement ? titleElement.textContent : '',
        content: contentElement ? contentElement.textContent : '',
        subreddit: subreddit,
        created_at: created_at
    };
    
    // Set currentPostData for AI generation
    currentPostData = postData;
    console.log('Post data set for AI:', currentPostData); // Debug log
    
    // Call writeComment with the extracted data
    // We need to get the actual Reddit post ID from the database
    const actualRedditPostId = postCard.getAttribute('data-reddit-post-id') || postCard.getAttribute('data-reddit-id');
    console.log('Actual Reddit post ID from element:', actualRedditPostId);
    
    await writeComment(postData.id, postData.subreddit, postData.title, postData.content, postData.created_at, actualRedditPostId);
}

// Write comment function
async function writeComment(postId, subreddit, title, content, created_at, actualRedditPostId = null) {
    try {
        // Always update current post data for AI generation
        currentPostData = {
            id: postId,
            title: title,
            content: content,
            subreddit: subreddit,
            url: `https://reddit.com/r/${subreddit}/comments/${postId}/`, // Construct Reddit URL
            reddit_id: postId, // Store the Reddit ID for commenting
            reddit_post_id: `t3_${postId}` // Store the Reddit post ID for commenting
        };
        console.log('Post data stored for AI in writeComment:', currentPostData); // Debug log
        
        // Show comment popup
        const popup = document.getElementById('comment-popup');
        const postPreview = document.getElementById('post-preview');
        
        // Create post preview HTML
        const safeTitle = (title || '').replace(/['"`]/g, '');
        const safeContent = (content || 'No content available').replace(/['"`]/g, '');
        
        postPreview.innerHTML = `
            <div class="post-header">
                <div class="post-meta">
                    <span class="platform">r/${subreddit}</span>
                    <span class="time">${formatTimeAgo(new Date(created_at))}</span>
                </div>
                <div class="post-score">
                    <i class="fas fa-star"></i>
                    <span>85%</span>
                </div>
            </div>
            <div class="post-content">
                <h4>${safeTitle}</h4>
                <p>${safeContent}</p>
            </div>
        `;
        
        // Extract Reddit post ID from the post data
        // The postId parameter is the database ID, we need to find the actual Reddit post
        let redditPostId = null;
        
        // Use the actual Reddit post ID if provided
        if (actualRedditPostId) {
            redditPostId = actualRedditPostId;
            console.log('Using provided Reddit post ID:', redditPostId);
        } else if (currentPostData && currentPostData.reddit_post_id) {
            redditPostId = currentPostData.reddit_post_id;
            console.log('Found Reddit post ID in currentPostData:', redditPostId);
        } else if (currentPostData && currentPostData.reddit_id) {
            redditPostId = `t3_${currentPostData.reddit_id}`;
            console.log('Constructed Reddit post ID from reddit_id:', redditPostId);
        } else {
            // Try to extract Reddit post ID from the post URL or title
            console.log('No Reddit post ID found, trying to extract from post data...');
            
            // Look for Reddit post ID in the post data
            if (currentPostData && currentPostData.url) {
                const url = currentPostData.url;
                // Extract Reddit post ID from URL like: https://reddit.com/r/subreddit/comments/abc123/title/
                const match = url.match(/\/comments\/([a-zA-Z0-9]+)\//);
                if (match) {
                    redditPostId = `t3_${match[1]}`;
                    console.log('Extracted Reddit post ID from URL:', redditPostId);
                }
            }
            
            // If we still don't have a Reddit ID, try to use the postId as Reddit ID
            if (!redditPostId && postId && postId.length > 5) {
                // Check if postId looks like a Reddit ID (alphanumeric)
                if (/^[a-zA-Z0-9]+$/.test(postId)) {
                    redditPostId = `t3_${postId}`;
                    console.log('Using postId as Reddit post ID:', redditPostId);
                }
            }
            
            // If still no Reddit ID, use placeholder
            if (!redditPostId) {
                redditPostId = 't3_placeholder';
                console.log('Could not extract Reddit post ID, using placeholder');
            }
        }
        
        console.log('Reddit post ID for commenting:', redditPostId);
        
        // Show warning if we don't have a real Reddit post ID
        if (redditPostId === 't3_placeholder') {
            showNotification('Warning: No Reddit post ID found. Commenting may not work.', 'warning');
        }
        
        // Store Reddit post ID for commenting
        postPreview.setAttribute('data-reddit-id', redditPostId);
        
        // Show popup
        popup.classList.add('active');
        
        // Add event listeners
        setupCommentPopupListeners();
        
        // Check Reddit connection status
        await checkRedditConnection();
        
    } catch (error) {
        console.error('Error opening comment popup:', error);
        showNotification('Error opening comment popup: ' + error.message, 'error');
    }
}

// Logout function
async function logout() {
    try {
        await postSparkDB.logout();
        window.location.href = '/login';
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Error logging out', 'error');
    }
}

// Check Reddit connection status
async function checkRedditConnection() {
    try {
        console.log('Checking Reddit connection...');
        await updateRedditConnectionStatus();
    } catch (error) {
        console.error('Error checking Reddit connection:', error);
        // Fallback to manual status update
        const statusElement = document.getElementById('reddit-status-text');
        const connectBtn = document.getElementById('connect-reddit-btn');
        const sendBtn = document.getElementById('send-comment');
        const connectionInfo = document.querySelector('.connection-info');
        
        if (statusElement && connectBtn && sendBtn && connectionInfo) {
            statusElement.textContent = 'Error checking connection';
            connectionInfo.classList.add('error');
            connectionInfo.classList.remove('connected');
            connectBtn.style.display = 'block';
            sendBtn.disabled = true;
        }
    }
}

// Connect Reddit account
async function connectRedditAccount() {
    try {
        console.log('=== CONNECT REDDIT BUTTON CLICKED ===');
        console.log('User ID:', postSparkDB?.user?.id);
        console.log('PostSparkDB available:', !!postSparkDB);
        
        // Get current URL as return URL
        const currentUrl = window.location.pathname;
        console.log('Connecting Reddit with return URL:', currentUrl);
        
        console.log('Calling postSparkDB.connectRedditAccount...');
        await postSparkDB.connectRedditAccount(currentUrl);
        console.log('postSparkDB.connectRedditAccount completed');
    } catch (error) {
        console.error('Error connecting Reddit account:', error);
        showNotification('Error connecting Reddit account', 'error');
    }
}

// Handle Reddit callback
// This function is now handled by the main handleRedditCallback() at the top of the file

// Find more leads for existing campaign
async function findMoreLeads(campaignId) {
    try {
        showNotification('Searching for more leads...', 'info');
        
        const redditPosts = await postSparkDB.findRedditLeads(campaignId);
        
        if (redditPosts.length > 0) {
            // Refresh the campaign posts if we're viewing them
            if (document.getElementById('campaign-posts').classList.contains('active')) {
                showCampaignPosts(campaignId);
            }
        } else {
            showNotification('No new leads found. Try different keywords or subreddits.', 'warning');
        }
        
    } catch (error) {
        console.error('Error finding more leads:', error);
        showNotification('Error finding leads: ' + error.message, 'error');
    }
}

// Render keywords with truncation for campaign cards
function renderKeywordsWithTruncation(keywords) {
    if (!keywords || keywords.length === 0) return '';
    
    // Show first 6 keywords (approximately 2 rows)
    const maxVisible = 6;
    const visibleKeywords = keywords.slice(0, maxVisible);
    const hasMore = keywords.length > maxVisible;
    
    let html = visibleKeywords.map(keyword => `<span class="keyword-tag">${keyword}</span>`).join('');
    
    if (hasMore) {
        html += `<span class="keyword-more">+${keywords.length - maxVisible} more</span>`;
    }
    
    return html;
}

// Show Reddit post in new tab
function showRedditPost(redditId, subreddit = 'SideProject') {
    if (!redditId) {
        showNotification('Reddit post ID not found', 'error');
        return;
    }
    
    // Convert t3_xxxxx to reddit URL
    const postId = redditId.replace('t3_', '');
    // Remove 'r/' prefix if present
    const cleanSubreddit = subreddit.replace('r/', '');
    const redditUrl = `https://www.reddit.com/r/${cleanSubreddit}/comments/${postId}/`;
    
    // Open in new tab
    window.open(redditUrl, '_blank');
}

// Router Navigation Functions
function initializeRouterNavigation() {
    // Add click handlers for navigation links
    document.querySelectorAll('.nav-item').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            if (page) {
                navigateToPage(page);
            }
        });
    });
}

function navigateToPage(page) {
    // Use router for navigation (with loop prevention)
    if (window.router && !window.router.isNavigating) {
        if (page === 'dashboard') {
            window.router.navigate('/dashboard');
        } else if (page === 'campaigns') {
            window.router.navigate('/campaigns');
        } else if (page === 'settings') {
            window.router.navigate('/settings');
        } else if (page === 'create-campaign') {
            window.router.navigate('/create-campaign');
        }
    } else {
        // Fallback to hash routing
        showPage(page);
    }
}

function navigateToCampaign(campaignId) {
    if (window.router) {
        window.router.navigate(`/campaigns/${campaignId}`);
    } else {
        // Fallback to hash routing
        showCampaignPosts(campaignId);
    }
}

// AI Response Generation Functions
let currentPostData = null;

// Writing Style Management
class WritingStyleManager {
    static getStyle(campaignId) {
        const key = `writingStyle_${campaignId}`;
        const style = localStorage.getItem(key);
        return style ? JSON.parse(style) : null;
    }
    
    static saveStyle(campaignId, style) {
        const key = `writingStyle_${campaignId}`;
        localStorage.setItem(key, JSON.stringify(style));
    }
    
    static getDefaultStyle() {
        return {
            tone: 'friendly',
            salesStrength: 2,
            includeWebsite: true,
            customOffer: ''
        };
    }
}

function showAIStylePopup() {
    // Load saved style settings
    loadStyleSettings();
    
    // Show popup
    const popup = document.getElementById('ai-style-popup');
    popup.classList.add('active');
    
    // Add event listeners for new buttons
    setupAIPopupEventListeners();
}

function openAIStylePopup(postData) {
    currentPostData = postData;
    showAIStylePopup();
}

function closeAIStylePopup() {
    const popup = document.getElementById('ai-style-popup');
    popup.classList.remove('active');
    currentPostData = null;
}

function setupAIPopupEventListeners() {
    // Close button
    const closeBtn = document.getElementById('ai-popup-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeAIStylePopup);
    }
    
    // Cancel button
    const cancelBtn = document.getElementById('ai-cancel-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeAIStylePopup);
    }
    
    // Save Style button
    const saveStyleBtn = document.getElementById('ai-save-style-btn');
    if (saveStyleBtn) {
        saveStyleBtn.addEventListener('click', saveAIStyleAndClose);
    }
    
    // Generate Response button
    const generateBtn = document.getElementById('ai-generate-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateAIResponseWithLoading);
    }
    
    // Tone selection
    setupToneSelection();
    
    // Length selection
    setupLengthSelection();
    
    // Load campaign data
    loadCampaignData();
    
    // Close on overlay click
    const overlay = document.querySelector('.ai-style-popup .popup-overlay');
    if (overlay) {
        overlay.addEventListener('click', closeAIStylePopup);
    }
}

function setupToneSelection() {
    const toneOptions = document.querySelectorAll('.tone-option');
    const hiddenInput = document.getElementById('tone-select');
    
    toneOptions.forEach(option => {
        option.addEventListener('click', () => {
            // Remove selected class from all options
            toneOptions.forEach(opt => opt.classList.remove('selected'));
            
            // Add selected class to clicked option
            option.classList.add('selected');
            
            // Update hidden input
            const tone = option.getAttribute('data-tone');
            hiddenInput.value = tone;
        });
    });
    
    // Set default selection
    const defaultOption = document.querySelector('.tone-option[data-tone="friendly"]');
    if (defaultOption) {
        defaultOption.classList.add('selected');
    }
}

function setupLengthSelection() {
    const lengthOptions = document.querySelectorAll('.length-option');
    const hiddenInput = document.getElementById('response-length');
    
    lengthOptions.forEach(option => {
        option.addEventListener('click', () => {
            // Remove selected class from all options
            lengthOptions.forEach(opt => opt.classList.remove('selected'));
            
            // Add selected class to clicked option
            option.classList.add('selected');
            
            // Update hidden input
            const length = option.getAttribute('data-length');
            hiddenInput.value = length;
        });
    });
    
    // Set default selection
    const defaultOption = document.querySelector('.length-option[data-length="medium"]');
    if (defaultOption) {
        defaultOption.classList.add('selected');
    }
}

async function loadCampaignData() {
    const campaignId = window.currentCampaignId;
    if (!campaignId) return;
    
    try {
        // Load campaign data
        const campaign = postSparkDB.campaigns.find(c => c.id === campaignId);
        if (campaign) {
            // Load website URL
            const websiteUrl = campaign.website_url || '';
            if (websiteUrl) {
                // You can display the website URL somewhere in the UI if needed
                console.log('Campaign website URL:', websiteUrl);
            }
            
            // Load saved style if exists
            const savedStyle = WritingStyleManager.getStyle(campaignId);
            if (savedStyle) {
                loadSavedStyleSettings(savedStyle);
            }
        }
    } catch (error) {
        console.error('Error loading campaign data:', error);
    }
}

function loadSavedStyleSettings(style) {
    // Set tone
    const toneInput = document.getElementById('tone-select');
    if (toneInput && style.tone) {
        toneInput.value = style.tone;
        
        // Update visual selection
        const toneOptions = document.querySelectorAll('.tone-option');
        toneOptions.forEach(option => {
            option.classList.remove('selected');
            if (option.getAttribute('data-tone') === style.tone) {
                option.classList.add('selected');
            }
        });
    }
    
    // Set sales strength
    const salesStrengthInput = document.getElementById('sales-strength');
    if (salesStrengthInput && style.salesStrength) {
        salesStrengthInput.value = style.salesStrength;
    }
    
    // Set response length
    const lengthInput = document.getElementById('response-length');
    if (lengthInput && style.responseLength) {
        lengthInput.value = style.responseLength;
        
        // Update visual selection
        const lengthOptions = document.querySelectorAll('.length-option');
        lengthOptions.forEach(option => {
            option.classList.remove('selected');
            if (option.getAttribute('data-length') === style.responseLength) {
                option.classList.add('selected');
            }
        });
    }
    
    // Set custom offer
    const customOfferInput = document.getElementById('custom-offer');
    if (customOfferInput && style.customOffer) {
        customOfferInput.value = style.customOffer;
    }
    
    // Set checkboxes
    const includeWebsiteInput = document.getElementById('include-website');
    if (includeWebsiteInput) {
        includeWebsiteInput.checked = style.includeWebsite !== false; // Default to true
    }
    
    const saveStyleInput = document.getElementById('save-style');
    if (saveStyleInput) {
        saveStyleInput.checked = style.saveStyle !== false; // Default to true
    }
}

async function showAIStyleInfo() {
    const aiStyleInfo = document.getElementById('ai-style-info');
    const aiStylePreview = document.getElementById('ai-style-preview');
    
    if (aiStyleInfo) {
        aiStyleInfo.style.display = 'block';
        
        // Load and display style details
        try {
            const dbStyle = await loadAIStyleFromDatabase();
            if (dbStyle && aiStylePreview) {
                const toneNames = {
                    'friendly': 'Friendly & Warm',
                    'professional': 'Professional',
                    'casual': 'Casual & Relaxed',
                    'expert': 'Expert & Authoritative'
                };
                
                const salesNames = ['Subtle', 'Moderate', 'Direct', 'Aggressive'];
                
                aiStylePreview.innerHTML = `
                    <div class="style-detail">
                        <span class="style-label">Tone:</span>
                        <span class="style-value">${toneNames[dbStyle.tone] || dbStyle.tone}</span>
                    </div>
                    <div class="style-detail">
                        <span class="style-label">Sales:</span>
                        <span class="style-value">${salesNames[dbStyle.sales_strength - 1] || 'Moderate'}</span>
                    </div>
                    ${dbStyle.custom_offer ? `
                        <div class="style-detail">
                            <span class="style-label">Custom Offer:</span>
                            <span class="style-value">${dbStyle.custom_offer.substring(0, 50)}${dbStyle.custom_offer.length > 50 ? '...' : ''}</span>
                        </div>
                    ` : ''}
                `;
            }
        } catch (error) {
            console.error('Error loading AI style details:', error);
            if (aiStylePreview) {
                aiStylePreview.innerHTML = '<span class="style-value">Style loaded</span>';
            }
        }
    }
}

function hideAIStyleInfo() {
    const aiStyleInfo = document.getElementById('ai-style-info');
    if (aiStyleInfo) {
        aiStyleInfo.style.display = 'none';
    }
}

// Load AI style settings from database
async function loadAIStyleFromDatabase() {
    // Disabled to avoid 406 errors - using localStorage only
    return null;
}

// Save AI style to database
async function saveAIStyleToDatabase(styleData, isDefault = false) {
    try {
        const campaignId = window.currentCampaignId;
        if (!campaignId) return;
        
        await postSparkDB.saveAIStyle({
            campaign_id: campaignId,
            tone: styleData.tone,
            sales_strength: styleData.salesStrength,
            custom_offer: styleData.customOffer,
            is_default: isDefault
        });
        
        console.log('AI style saved to database:', styleData);
        
    } catch (error) {
        console.error('Error saving AI style to database:', error);
        showNotification('Error saving AI style: ' + error.message, 'error');
    }
}

async function loadStyleSettings() {
    try {
        // First try to load from database
        const dbStyle = await loadAIStyleFromDatabase();
        if (dbStyle) {
            document.getElementById('tone-select').value = dbStyle.tone || 'friendly';
            document.getElementById('sales-strength').value = dbStyle.sales_strength || 2;
            document.getElementById('custom-offer').value = dbStyle.custom_offer || '';
            document.getElementById('save-style').checked = true;
            
            console.log('AI style settings loaded from database:', dbStyle);
            return;
        }
        
        // Fallback to localStorage
        const campaignId = window.currentCampaignId;
        let savedSettings = null;
        
        if (campaignId) {
            savedSettings = localStorage.getItem(`aiResponseStyle_campaign_${campaignId}`);
        }
        
        // Fallback to global settings if no campaign-specific settings
        if (!savedSettings) {
            savedSettings = localStorage.getItem('aiResponseStyle');
        }
        
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            
            document.getElementById('tone-select').value = settings.tone || 'friendly';
            document.getElementById('sales-strength').value = settings.salesStrength || 2;
            document.getElementById('custom-offer').value = settings.customOffer || '';
            document.getElementById('save-style').checked = settings.saveStyle !== false;
            
            console.log('AI style settings loaded from localStorage:', settings);
        }
    } catch (error) {
        console.error('Error loading style settings:', error);
    }
}

async function saveStyleSettings() {
    const settings = {
        tone: document.getElementById('tone-select').value,
        salesStrength: parseInt(document.getElementById('sales-strength').value),
        customOffer: document.getElementById('custom-offer').value,
        saveStyle: document.getElementById('save-style').checked
    };
    
    // Save to localStorage as backup
    localStorage.setItem('aiResponseStyle', JSON.stringify(settings));
    
    // Save to database if saveStyle is checked
    if (settings.saveStyle) {
        try {
            await saveAIStyleToDatabase(settings, false);
        } catch (error) {
            console.error('Error saving to database:', error);
        }
    }
}

async function saveCampaignAIStyle() {
    const campaignId = window.currentCampaignId;
    if (!campaignId) return;
    
    const settings = {
        tone: document.getElementById('tone-select').value,
        salesStrength: parseInt(document.getElementById('sales-strength').value),
        customOffer: document.getElementById('custom-offer').value,
        saveStyle: document.getElementById('save-style').checked
    };
    
    // Save campaign-specific AI style to localStorage as backup
    localStorage.setItem(`aiResponseStyle_campaign_${campaignId}`, JSON.stringify(settings));
    
    // Save to database
    try {
        await saveAIStyleToDatabase(settings, false);
        console.log('AI style saved for campaign:', campaignId, settings);
    } catch (error) {
        console.error('Error saving campaign AI style:', error);
    }
}

async function generateAIResponseWithSavedStyle() {
    if (!currentPostData) {
        showNotification('No post data available', 'error');
        return;
    }
    
    // Load saved style settings from database first, then localStorage
    let settings = null;
    
    try {
        const dbStyle = await loadAIStyleFromDatabase();
        if (dbStyle) {
            settings = {
                tone: dbStyle.tone,
                salesStrength: dbStyle.sales_strength,
                customOffer: dbStyle.custom_offer
            };
        }
    } catch (error) {
        console.error('Error loading from database, trying localStorage:', error);
    }
    
    // Fallback to localStorage if database failed
    if (!settings) {
        const campaignId = window.currentCampaignId;
        const savedSettings = localStorage.getItem(`aiResponseStyle_campaign_${campaignId}`);
        
        if (!savedSettings) {
            showNotification('No saved AI style found', 'error');
            return;
        }
        
        settings = JSON.parse(savedSettings);
    }
    
    // Get current campaign data
    const campaign = postSparkDB.campaigns.find(c => c.id === campaignId);
    if (!campaign) {
        showNotification('Campaign not found', 'error');
        return;
    }
    
    // Get website URL from campaign
    let websiteUrl = campaign.website_url || '';
    if (!websiteUrl) {
        websiteUrl = prompt('Please enter your website URL:');
        if (!websiteUrl) {
            showNotification('Website URL is required for AI responses', 'error');
            return;
        }
    }
    
    try {
        showNotification('Generating AI response with saved style...', 'info');
        
        const response = await fetch('/api/ai-response', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                postContent: currentPostData.content,
                postTitle: currentPostData.title,
                offer: settings.customOffer || campaign.description,
                websiteUrl: websiteUrl,
                tone: settings.tone,
                salesStrength: settings.salesStrength,
                customOffer: settings.customOffer
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to generate AI response');
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Fill the comment textarea with AI response
            const textarea = document.getElementById('comment-text');
            if (textarea) {
                textarea.value = data.response;
                textarea.style.height = 'auto';
                textarea.style.height = textarea.scrollHeight + 'px';
            }
            
            // Enable the send button
            const sendBtn = document.getElementById('send-comment');
            if (sendBtn) {
                sendBtn.disabled = false;
            }
            
            showNotification('AI response generated with saved style!', 'success');
        } else {
            throw new Error(data.error || 'Failed to generate response');
        }
        
    } catch (error) {
        console.error('Error generating AI response:', error);
        showNotification('Error generating AI response: ' + error.message, 'error');
    }
}

async function saveAIStyleAndClose() {
    try {
        const campaignId = window.currentCampaignId;
        if (!campaignId) {
            showNotification('No campaign selected', 'error');
            return;
        }

        // Get style settings from form
        const style = {
            tone: document.getElementById('tone-select').value,
            salesStrength: parseInt(document.getElementById('sales-strength').value),
            responseLength: document.getElementById('response-length').value,
            customOffer: document.getElementById('custom-offer').value,
            includeWebsite: document.getElementById('include-website').checked,
            saveStyle: document.getElementById('save-style').checked
        };

        // Save style using WritingStyleManager
        WritingStyleManager.saveStyle(campaignId, style);
        showNotification('Writing style saved successfully!', 'success');

        // Close popup and return to comment popup
        closeAIStylePopup();
        
    } catch (error) {
        console.error('Error saving AI style:', error);
        showNotification('Error saving style: ' + error.message, 'error');
    }
}

async function generateAIResponseWithLoading() {
    const generateBtn = document.getElementById('ai-generate-btn');
    const originalText = generateBtn.innerHTML;
    
    try {
        // Add loading state
        generateBtn.classList.add('btn-ai-generate', 'loading');
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        generateBtn.disabled = true;
        
        // Generate AI response
        await generateAIResponse();
        
    } catch (error) {
        console.error('Error generating AI response:', error);
        showNotification('Error generating response: ' + error.message, 'error');
    } finally {
        // Remove loading state
        generateBtn.classList.remove('btn-ai-generate', 'loading');
        generateBtn.innerHTML = originalText;
        generateBtn.disabled = false;
    }
}

async function generateAIResponse() {
    if (!currentPostData) {
        showNotification('No post data available', 'error');
        return;
    }
    
    const campaignId = window.currentCampaignId;
    if (!campaignId) {
        showNotification('No campaign selected', 'error');
        return;
    }

    // Get style settings from form
    const style = {
        tone: document.getElementById('tone-select').value,
        salesStrength: parseInt(document.getElementById('sales-strength').value),
        responseLength: document.getElementById('response-length').value,
        customOffer: document.getElementById('custom-offer').value,
        includeWebsite: document.getElementById('include-website').checked,
        saveStyle: document.getElementById('save-style').checked
    };
    
    // Save style if requested
    if (style.saveStyle) {
        WritingStyleManager.saveStyle(campaignId, style);
    }
    
    // Get current campaign data
    const campaign = postSparkDB.campaigns.find(c => c.id === campaignId);
    if (!campaign) {
        showNotification('Campaign not found', 'error');
        return;
    }
    
    try {
        showNotification('Generating AI response...', 'info');
        
        const response = await fetch('/api/ai-response', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                postContent: currentPostData.content,
                postTitle: currentPostData.title,
                offer: style.customOffer || campaign.description,
                websiteUrl: style.includeWebsite ? (campaign.website_url || '') : '',
                tone: style.tone,
                salesStrength: style.salesStrength,
                responseLength: style.responseLength,
                customOffer: style.customOffer,
                subreddit: currentPostData.subreddit || ''
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to generate AI response');
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Fill the comment textarea with AI response
            const textarea = document.getElementById('comment-text');
            if (textarea) {
                textarea.value = data.response;
                textarea.style.height = 'auto';
                textarea.style.height = textarea.scrollHeight + 'px';
            }
            
            // Close the AI popup
            closeAIStylePopup();
            
            // Enable the send button
            const sendBtn = document.getElementById('send-comment');
            if (sendBtn) {
                sendBtn.disabled = false;
            }
            
            showNotification('AI response generated successfully!', 'success');
        } else {
            throw new Error(data.error || 'Failed to generate response');
        }
        
    } catch (error) {
        console.error('Error generating AI response:', error);
        showNotification('Error generating AI response: ' + error.message, 'error');
    }
}




// New simplified AI functions - duplicate function removed

function showAIStyleInfoNew(style) {
    const aiStyleInfo = document.getElementById("ai-style-info");
    const aiStylePreview = document.getElementById("ai-style-preview");
    
    if (aiStyleInfo && aiStylePreview) {
        const toneNames = {
            "friendly": "Friendly & Warm",
            "professional": "Professional",
            "casual": "Casual & Relaxed",
            "expert": "Expert & Authoritative"
        };
        
        const salesNames = ["Subtle", "Moderate", "Direct", "Aggressive"];
        
        aiStylePreview.innerHTML = `
            <div class="style-detail">
                <strong>Tone:</strong> ${toneNames[style.tone] || style.tone}
            </div>
            <div class="style-detail">
                <strong>Sales Approach:</strong> ${salesNames[style.salesStrength - 1] || style.salesStrength}
            </div>
            ${style.includeWebsite ? "<div class=\"style-detail\"><strong>Website:</strong> Included</div>" : ""}
            ${style.customOffer ? `<div class="style-detail"><strong>Custom Offer:</strong> ${style.customOffer}</div>` : ""}
        `;
        
        aiStyleInfo.style.display = "block";
    }
}

async function generateAIResponseWithSavedStyleNew(style) {
    if (!currentPostData) {
        showNotification("No post data available", "error");
        return;
    }
    
    const campaignId = window.currentCampaignId;
    if (!campaignId) {
        showNotification("No campaign selected", "error");
        return;
    }
    
    // Get campaign data
    const campaign = postSparkDB.campaigns.find(c => c.id === campaignId);
    if (!campaign) {
        showNotification("Campaign not found", "error");
        return;
    }
    
    try {
        showNotification("Generating AI response...", "info");
        
        const response = await fetch("/api/ai-response", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                postContent: currentPostData.content,
                postTitle: currentPostData.title,
                offer: style.customOffer || campaign.description,
                websiteUrl: style.includeWebsite ? campaign.website_url : "",
                tone: style.tone,
                salesStrength: style.salesStrength,
                customOffer: style.customOffer
            })
        });
        
        if (!response.ok) {
            throw new Error("Failed to generate AI response");
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Fill the comment textarea with AI response
            const textarea = document.getElementById("comment-text");
            if (textarea) {
                textarea.value = data.response;
                textarea.style.height = "auto";
                textarea.style.height = textarea.scrollHeight + "px";
            }
            
            // Enable the send button
            const sendBtn = document.getElementById("send-comment");
            if (sendBtn) {
                sendBtn.disabled = false;
            }
            
            showNotification("AI response generated successfully!", "success");
        } else {
            throw new Error(data.error || "Failed to generate response");
        }
        
    } catch (error) {
        console.error("Error generating AI response:", error);
        showNotification("Error generating AI response: " + error.message, "error");
    }
}


// Override old functions to avoid 406 errors
async function saveAIStyleToDatabase(styleData, isDefault = false) {
    // Disabled to avoid 406 errors - using localStorage only
    console.log("AI style saving disabled - using localStorage only");
}

async function loadStyleSettings() {
    // Disabled to avoid 406 errors - using localStorage only
    console.log("AI style loading disabled - using localStorage only");
}

async function generateAIResponseWithSavedStyleOld() {
    // This function is now handled by the new generateAIResponseWithSavedStyle(style) function
    console.log("Old function called - redirecting to new implementation");
    const campaignId = window.currentCampaignId;
    if (campaignId) {
        const style = WritingStyleManager.getStyle(campaignId);
        if (style) {
            await generateAIResponseWithSavedStyle(style);
        }
    }
}


// Override the old generateAIResponseWithSavedStyle function
async function generateAIResponseWithSavedStyle() {
    console.log("Old function called - redirecting to new implementation");
    const campaignId = window.currentCampaignId;
    if (campaignId) {
        const style = WritingStyleManager.getStyle(campaignId);
        if (style) {
            // Call the new function with style parameter
            await generateAIResponseWithSavedStyleNew(style);
        } else {
            showNotification("No saved writing style found. Please set up your writing style first.", "error");
        }
    }
}


// Override old showAIStyleInfo function
async function showAIStyleInfo() {
    console.log("Old showAIStyleInfo called - redirecting to new implementation");
    const campaignId = window.currentCampaignId;
    if (campaignId) {
        const style = WritingStyleManager.getStyle(campaignId);
        if (style) {
            showAIStyleInfoNew(style);
        }
    }
}

function hideAIStyleInfo() {
    const aiStyleInfo = document.getElementById("ai-style-info");
    if (aiStyleInfo) {
        aiStyleInfo.style.display = "none";
    }
}
