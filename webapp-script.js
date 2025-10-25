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
            
            // Store connection date
            localStorage.setItem('reddit_connection_date', new Date().toISOString());
            
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
            
            // Update settings UI after successful connection
            setTimeout(async () => {
                await updateRedditSettingsStatus();
            }, 1000);
            
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
                
                // Store connection date
                localStorage.setItem('reddit_connection_date', new Date().toISOString());
                
                // Refresh the connection status
                setTimeout(async () => {
                    console.log('Refreshing Reddit connection status...');
                    await updateRedditConnectionStatus();
                    await updateRedditSettingsStatus();
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
        
        // Update comment popup Reddit status if popup is open
        await updateCommentPopupRedditStatus();
        
    } catch (error) {
        console.error('Error updating Reddit connection status:', error);
    }
}

// Update Reddit status in comment popup
async function updateCommentPopupRedditStatus() {
    try {
        const popup = document.getElementById('comment-popup');
        if (!popup || !popup.classList.contains('active')) {
            return; // Popup not open
        }
        
        const isConnected = await postSparkDB.isRedditConnected();
        const statusDot = document.getElementById('reddit-status-dot');
        const statusText = document.getElementById('reddit-status-text');
        const statusSubtitle = document.getElementById('reddit-status-subtitle');
        const connectBtn = document.getElementById('connect-reddit-btn');
        const disconnectBtn = document.getElementById('disconnect-reddit-btn');
        
        // Update Reddit connection status in comment popup
        const redditStatus = document.querySelector('.reddit-connection-status');
        if (redditStatus) {
            const statusIndicator = redditStatus.querySelector('.reddit-status-indicator');
            const statusText = redditStatus.querySelector('.reddit-status-text');
            const statusSubtitle = redditStatus.querySelector('.reddit-status-subtitle');
            const statusDot = redditStatus.querySelector('.status-dot');
            const connectBtn = redditStatus.querySelector('.connect-btn');
            const disconnectBtn = redditStatus.querySelector('.disconnect-btn');
            
            if (isConnected) {
                // Connected state - hide indicator completely
                if (statusIndicator) {
                    statusIndicator.style.display = 'none';
                }
                if (statusText) {
                    statusText.textContent = 'Reddit account connected';
                    statusText.className = 'reddit-status-text connected';
                }
                if (statusSubtitle) {
                    statusSubtitle.textContent = 'Ready to post comments on Reddit';
                }
                if (statusDot) {
                    statusDot.className = 'status-dot connected';
                }
                if (connectBtn) {
                    connectBtn.style.display = 'none';
                }
                if (disconnectBtn) {
                    disconnectBtn.style.display = 'inline-flex';
                }
            } else {
                // Disconnected state - hide indicator completely
                if (statusIndicator) {
                    statusIndicator.style.display = 'none';
                }
                if (statusText) {
                    statusText.textContent = 'Reddit account not connected';
                    statusText.className = 'reddit-status-text disconnected';
                }
                if (statusSubtitle) {
                    statusSubtitle.textContent = 'Connect your Reddit account to post comments';
                }
                if (statusDot) {
                    statusDot.className = 'status-dot disconnected';
                }
                if (connectBtn) {
                    connectBtn.style.display = 'inline-flex';
                }
                if (disconnectBtn) {
                    disconnectBtn.style.display = 'none';
                }
            }
        }
        
        console.log('Comment popup Reddit status updated:', isConnected);
        
    } catch (error) {
        console.error('Error updating comment popup Reddit status:', error);
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    // Check for Reddit OAuth callback first
    await handleRedditCallback();
    
    // Initialize PostSparkDB first
    postSparkDB = new PostSparkSupabase();
    
    // Rate limiting for comments
    const COMMENT_RATE_LIMIT = 10; // 10 comments per minute
    const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds
    let commentTimestamps = [];
    
    // Rate limiting functions
    function checkCommentRateLimit() {
        const now = Date.now();
        // Remove timestamps older than 1 minute
        commentTimestamps = commentTimestamps.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
        
        // Check if user has exceeded the limit
        if (commentTimestamps.length >= COMMENT_RATE_LIMIT) {
            return false; // Rate limit exceeded
        }
        
        // Add current timestamp
        commentTimestamps.push(now);
        return true; // Rate limit not exceeded
    }
    
    function getRateLimitMessage() {
        const now = Date.now();
        const oldestTimestamp = Math.min(...commentTimestamps);
        const timeRemaining = Math.ceil((RATE_LIMIT_WINDOW - (now - oldestTimestamp)) / 1000);
        return `It seems like you're commenting a lot. Please wait ${timeRemaining} seconds before commenting again.`;
    }
    
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

// Show loading overlay
function showLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        overlay.style.display = 'flex';
    }
}

// Hide loading overlay
function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 500);
    }
}

// Update loading step
function updateLoadingStep(stepId, status) {
    const step = document.getElementById(stepId);
    if (step) {
        step.className = `loading-step ${status}`;
    }
}

// Initialize the application
async function initializeApp() {
    try {
        console.log('🚀 Initializing PostSpark application...');
        
        // Show loading overlay
        showLoadingOverlay();
        
        // Update loading step - user profile
        updateLoadingStep('step-user', 'completed');
        
        // Load campaigns from Supabase
        updateLoadingStep('step-campaigns', 'active');
        await loadCampaigns();
        updateLoadingStep('step-campaigns', 'completed');
        
        // Preload dashboard data immediately after login
        updateLoadingStep('step-posts', 'active');
        await preloadDashboardData();
        updateLoadingStep('step-posts', 'completed');
        
        // Update user info in sidebar
        updateUserInfo();
        
        // Update loading step - dashboard
        updateLoadingStep('step-dashboard', 'active');
        
        // Initialize router navigation
        initializeRouterNavigation();
        
        // Initialize all other functionality
        initializeNavigation();
        initializeCampaigns();
        initializeSettings();
        initializeAnimations();
        initializeRippleEffects();
        
        // Complete loading
        updateLoadingStep('step-dashboard', 'completed');
        
        // Hide loading overlay after a short delay
        setTimeout(() => {
            hideLoadingOverlay();
        }, 3000); // Increased to 3 seconds to ensure loading is complete
        
        // Fallback: Force hide loading overlay after 10 seconds
        setTimeout(() => {
            hideLoadingOverlay();
        }, 10000);
        
        console.log('✅ PostSpark application initialized successfully');
        
    } catch (error) {
        console.error('Error initializing app:', error);
        showNotification('Error loading application data', 'error');
        hideLoadingOverlay();
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
            <div class="stat">
                <span class="stat-number">${stats.contacted}</span>
                <span class="stat-label">Contacted</span>
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
    if (!postSparkDB.userData) {
        // Show loading state for user info
        const userInfo = document.querySelector('.user-info');
        if (userInfo) {
            userInfo.classList.add('loading');
        }
        return;
    }
    
    const userNameElement = document.querySelector('.user-name');
    const userRoleElement = document.querySelector('.user-role');
    const userInfo = document.querySelector('.user-info');
    
    // Remove loading state
    if (userInfo) {
        userInfo.classList.remove('loading');
    }
    
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
            
            // Show selected page immediately
            const targetPage = this.getAttribute('data-page');
            const targetPageElement = document.getElementById(targetPage);
            if (targetPageElement) {
                targetPageElement.classList.add('active');
                
                // Load page-specific data asynchronously
                setTimeout(async () => {
                    try {
                        if (targetPage === 'dashboard') {
                            await loadDashboardData();
                        } else if (targetPage === 'campaigns') {
                            await loadCampaigns();
                        } else if (targetPage === 'settings') {
                            await loadUserSettings();
                        }
                    } catch (error) {
                        console.error(`Error loading ${targetPage}:`, error);
                    }
                }, 100); // Small delay to ensure page is visible first
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
            console.log('Back button clicked');
            // Hide campaign posts page and show campaigns page
            document.getElementById('campaign-posts').classList.remove('active');
            document.getElementById('campaigns').classList.add('active');
            
            // Update navigation
            navItems.forEach(nav => nav.classList.remove('active'));
            const campaignsNav = document.querySelector('[data-page="campaigns"]');
            if (campaignsNav) {
                campaignsNav.classList.add('active');
            }
            
            // Reload campaigns to refresh stats
            loadCampaigns();
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
        btn.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Create campaign button clicked'); // Debug log
            
            // Check subscription limits before showing create campaign
            if (window.subscriptionManager) {
                const canCreate = await window.subscriptionManager.checkAndEnforceLimits('create_campaign');
                if (!canCreate) {
                    console.log('Create campaign blocked by subscription limits');
                    return;
                }
            }
            
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

// Refresh campaign posts with new leads
async function refreshCampaignPosts(campaignId) {
    try {
        console.log('🔄 Refreshing campaign posts for:', campaignId);
        
        // Check subscription limits before refreshing campaign
        if (window.subscriptionManager) {
            const canRefresh = await window.subscriptionManager.checkAndEnforceLimits('refresh_campaign', campaignId);
            if (!canRefresh) {
                console.log('Campaign refresh blocked by subscription limits');
                return;
            }
        }
        
        // Get campaign data
        const campaign = postSparkDB.campaigns.find(c => c.id === campaignId);
        if (!campaign) {
            showNotification('Campaign not found', 'error');
            return;
        }
        
        // Show loading state
        const postsGrid = document.getElementById('campaign-posts-grid');
        if (postsGrid) {
            postsGrid.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <h3>Finding new posts...</h3>
                    <p>Searching for fresh leads with your keywords</p>
                </div>
            `;
        }
        
        // Find new Reddit leads using the same keywords and offer
        console.log('🔍 Finding Reddit leads for campaign:', campaignId);
        const newPosts = await postSparkDB.findRedditLeads(campaignId);
        console.log('📊 Found posts from findRedditLeads:', newPosts.length);
        
        if (newPosts.length > 0) {
            console.log(`📝 Found ${newPosts.length} new posts for campaign ${campaignId}`);
            
            // Wait a moment for database to be updated
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Force reload the campaign posts to show new ones at the top
            console.log('🔄 Reloading campaign posts to show new ones...');
            await showCampaignPosts(campaignId);
            
            // Update campaign stats
            await loadCampaigns();
            
            showNotification(`Found ${newPosts.length} new posts!`, 'success');
        } else {
            console.log('No new posts found');
            showNotification('No new posts found. Try different keywords or check back later.', 'info');
            
            // Still reload to show current posts
            await showCampaignPosts(campaignId);
        }
        
        // Track usage
        if (window.subscriptionManager && typeof window.subscriptionManager.trackUsage === 'function') {
            try {
                await window.subscriptionManager.trackUsage('refreshes', 1);
                console.log('✅ Tracked refresh usage');
            } catch (error) {
                console.error('Error tracking refresh usage:', error);
            }
        } else {
            console.log('⚠️ Subscription manager not available for tracking refresh usage');
        }
        
    } catch (error) {
        console.error('Error refreshing campaign posts:', error);
        showNotification('Error refreshing posts: ' + error.message, 'error');
        // Reload current posts on error
        await showCampaignPosts(campaignId);
    }
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
        console.log('🔄 Loading posts for campaign:', campaignId);
        const posts = await postSparkDB.getPosts(campaignId);
        console.log('📊 Loaded posts:', posts.length, posts);
        
        // Sort posts by created_at (newest first) to show new posts at the top
        posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        console.log('📊 Posts sorted by created_at (newest first)');
        
        // Debug: Check if posts have correct campaign_id
        if (posts.length > 0) {
            console.log('🔍 First post campaign_id:', posts[0].campaign_id);
            console.log('🔍 Expected campaign_id:', campaignId);
            console.log('🔍 All posts campaign_ids:', posts.map(p => p.campaign_id));
            console.log('🔍 Post creation dates:', posts.slice(0, 3).map(p => ({ title: p.title.substring(0, 30), created_at: p.created_at })));
        } else {
            console.log('⚠️ No posts found for campaign:', campaignId);
        }
        
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
        
        // Add refresh button functionality
        const refreshBtn = document.getElementById('refresh-campaign-posts');
        if (refreshBtn) {
            refreshBtn.onclick = () => refreshCampaignPosts(campaignId);
        }
        
        // Render posts
        console.log('🎨 Rendering posts in UI...');
        renderCampaignPosts(posts);
        
        // Posts loaded successfully (no notification needed)
        console.log('✅ Campaign posts loaded and rendered successfully');
        
    } catch (error) {
        console.error('Error loading campaign posts:', error);
        showNotification('Error loading campaign posts: ' + error.message, 'error');
    }
}

// Render campaign posts
function renderCampaignPosts(posts) {
    console.log('🎨 Rendering campaign posts:', posts.length, posts);
    const postsGrid = document.getElementById('campaign-posts-grid');
    
    if (!postsGrid) {
        console.error('❌ Campaign posts grid element not found!');
        return;
    }
    
    console.log('📋 Found posts grid, clearing existing posts...');
    postsGrid.innerHTML = '';
    
    if (posts.length === 0) {
        console.log('⚠️ No posts to render, showing empty state');
        postsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>No posts found yet</h3>
                <p>Posts matching your campaign criteria will appear here</p>
            </div>
        `;
        return;
    }
    
    console.log(`📝 Rendering ${posts.length} posts...`);
    
    posts.forEach((post, index) => {
        try {
            console.log(`📝 Processing post ${index + 1}/${posts.length}:`, post);
            
            const postCard = document.createElement('div');
            postCard.className = `post-card ${post.score >= 85 ? 'high-potential' : post.score >= 70 ? 'medium-potential' : 'low-potential'}`;
            postCard.setAttribute('data-post-id', post.id);
            postCard.setAttribute('data-subreddit', post.subreddit || 'unknown');
            postCard.setAttribute('data-created-at', post.created_at || new Date().toISOString());
        
        // Add Reddit post ID for commenting
        let redditPostId = null;
        if (post.reddit_post_id) {
            redditPostId = post.reddit_post_id;
            postCard.setAttribute('data-reddit-id', redditPostId);
            console.log('Added Reddit post ID to card:', redditPostId);
        } else if (post.reddit_id) {
            redditPostId = `t3_${post.reddit_id}`;
            postCard.setAttribute('data-reddit-id', redditPostId);
            console.log('Constructed Reddit post ID for card:', redditPostId);
        } else {
            console.warn('No Reddit post ID found for post:', post.id);
        }
        
        // Format time
        let timeAgo = 'Unknown time';
        try {
            timeAgo = formatTimeAgo(new Date(post.created_at));
        } catch (error) {
            console.error('Error formatting time for post:', post.id, error);
        }
        console.log('Post time debug:', { 
            created_at: post.created_at, 
            timeAgo: timeAgo,
            postId: post.id 
        });
        
        // Add contacted badge if applicable
        const contactedBadge = post.is_contacted ? '<span class="contacted-badge">Contacted</span>' : '';
        
        // Safely escape strings for HTML
        const safeTitle = (post.title || 'No title').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const safeContent = (post.content || 'No content available').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const safeSubreddit = (post.subreddit || 'unknown').replace(/'/g, "\\'");
        const safeCreatedAt = (post.created_at || new Date().toISOString()).replace(/'/g, "\\'");
        
        postCard.innerHTML = `
            <div class="post-header">
                <div class="post-meta">
                    <span class="platform">r/${safeSubreddit}</span>
                    ${contactedBadge}
                </div>
                <div class="post-score">
                    <i class="fas fa-star"></i>
                    <span>${post.score || 0}%</span>
                </div>
            </div>
            <div class="post-content">
                <h3>${safeTitle}</h3>
                <div class="post-text-container">
                    <p class="post-text">${safeContent}</p>
                </div>
            </div>
            <div class="post-actions">
                <button class="btn btn-primary" onclick="writeComment('${post.id}', '${safeSubreddit}', '${safeTitle}', '${safeContent}', '${safeCreatedAt}', '${redditPostId || ''}')">
                    <i class="fas fa-comment"></i>
                    Comment
                </button>
                <button class="btn btn-secondary" onclick="showRedditPost('${post.reddit_id || ''}', '${safeSubreddit}')">
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
        console.log(`✅ Successfully added post ${index + 1} to UI`);
        
        } catch (error) {
            console.error(`❌ Error rendering post ${index + 1}:`, error, post);
            // Create a simple error card
            const errorCard = document.createElement('div');
            errorCard.className = 'post-card error-card';
            errorCard.innerHTML = `
                <div class="post-content">
                    <h3>Error loading post</h3>
                    <p>Post ID: ${post.id || 'Unknown'}</p>
                    <p>Error: ${error.message}</p>
                </div>
            `;
            postsGrid.appendChild(errorCard);
        }
    });
    
    // Add event listeners to new post action buttons
    addPostActionListeners();
    
    console.log(`🎉 Successfully rendered ${posts.length} posts in UI`);
    
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

// Extract Reddit post ID from URL (robust function)
function extractRedditPostId(url) {
    if (!url) return null;

    // 1️⃣ Normale Reddit-URL mit /comments/<id>/
    const matchComments = url.match(/comments\/([a-z0-9]+)\//i);
    if (matchComments) return `t3_${matchComments[1]}`;

    // 2️⃣ Kurzlink-Format redd.it/<id>
    const matchShort = url.match(/redd\.it\/([a-z0-9]+)/i);
    if (matchShort) return `t3_${matchShort[1]}`;

    // 3️⃣ Alternative Pattern für Reddit URLs
    const matchAlt = url.match(/\/r\/\w+\/comments\/([a-z0-9]+)\//i);
    if (matchAlt) return `t3_${matchAlt[1]}`;

    // 4️⃣ Direkte Post ID am Ende der URL
    const matchEnd = url.match(/\/([a-z0-9]+)\/?$/i);
    if (matchEnd) return `t3_${matchEnd[1]}`;

    return null;
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
async function showCommentPopup(postCard) {
    const popup = document.getElementById('comment-popup');
    const postPreview = document.getElementById('post-preview');
    
    // Get post data
    const title = postCard.querySelector('.post-content h3').textContent;
    const content = postCard.querySelector('.post-content p').textContent;
    const platform = postCard.querySelector('.platform').textContent;
    const time = 'Recent'; // Time display removed, use fallback
    const score = postCard.querySelector('.post-score span').textContent;
    
    // Get Reddit post ID from the post card
    const redditPostId = postCard.getAttribute('data-reddit-id');
    console.log('Reddit post ID from post card:', redditPostId);
    
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
    
    // Always initialize currentPostData to ensure it's never null
    currentPostData = {
        id: postCard.getAttribute('data-post-id'),
        title: title,
        content: content,
        subreddit: postCard.getAttribute('data-subreddit') || 'unknown',
        created_at: postCard.getAttribute('data-created-at') || new Date().toISOString(),
        reddit_post_id: redditPostId || null,
        reddit_id: redditPostId ? redditPostId.replace('t3_', '') : null,
        url: redditPostId ? `https://reddit.com/r/${postCard.getAttribute('data-subreddit') || 'unknown'}/comments/${redditPostId.replace('t3_', '')}/` : null
    };
    console.log('✅ Initialized currentPostData with all fields:', currentPostData);
    
    // Set Reddit post ID for commenting
    if (redditPostId) {
        postPreview.setAttribute('data-reddit-id', redditPostId);
        window.currentRedditPostId = redditPostId;
        console.log('✅ Set Reddit post ID for commenting:', redditPostId);
        
        // Update currentPostData with Reddit post ID for commenting
        currentPostData.reddit_post_id = redditPostId;
        currentPostData.reddit_id = redditPostId.replace('t3_', '');
        currentPostData.url = `https://reddit.com/r/${currentPostData.subreddit || 'unknown'}/comments/${redditPostId.replace('t3_', '')}/`;
        console.log('✅ Updated currentPostData with Reddit ID:', currentPostData);
    } else {
        console.warn('⚠️ No Reddit post ID found for commenting');
    }
    
    // Show popup
    popup.classList.add('active');
    
    // Update Reddit status in popup
    await updateCommentPopupRedditStatus();
    
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
        
        // Check rate limit
        if (!checkCommentRateLimit()) {
            showNotification(getRateLimitMessage(), 'warning');
            return;
        }
        
        // Show loading state
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        sendBtn.disabled = true;
        sendBtn.style.background = 'linear-gradient(135deg, #6b7280, #4b5563)';
        
        // Store original button text outside try-catch
        const originalText = sendBtn.innerHTML;
        
        try {
            // Get the post ID from the current post data (more reliable approach)
            const postPreview = document.getElementById('post-preview');
            console.log('Post preview element:', postPreview);
            
            // Try to get Reddit post ID from multiple sources
            let postId = null;
            
            console.log('🔍 Debugging Reddit post ID sources:');
            console.log('window.currentRedditPostId:', window.currentRedditPostId);
            console.log('currentPostData:', currentPostData);
            console.log('currentPostData.reddit_post_id:', currentPostData?.reddit_post_id);
            console.log('currentPostData.reddit_id:', currentPostData?.reddit_id);
            console.log('currentPostData.url:', currentPostData?.url);
            console.log('postPreview:', postPreview);
            console.log('postPreview dataset:', postPreview?.dataset);
            
            // First, try to get from the actualRedditPostId parameter passed to writeComment
            if (window.currentRedditPostId) {
                postId = window.currentRedditPostId;
                console.log('✅ Found Reddit post ID from window.currentRedditPostId:', postId);
            } else if (currentPostData && currentPostData.reddit_post_id) {
                postId = currentPostData.reddit_post_id;
                console.log('✅ Found Reddit post ID in currentPostData:', postId);
            } else if (currentPostData && currentPostData.reddit_id) {
                postId = `t3_${currentPostData.reddit_id}`;
                console.log('✅ Constructed Reddit post ID from currentPostData:', postId);
            } else if (currentPostData && currentPostData.url) {
                postId = extractRedditPostId(currentPostData.url);
                if (postId) {
                    console.log('✅ Extracted Reddit post ID from currentPostData URL:', postId);
                } else {
                    console.log('❌ Could not extract from currentPostData URL:', currentPostData.url);
                }
            } else if (postPreview) {
                // Fallback to attribute
                postId = postPreview.getAttribute('data-reddit-id');
                console.log('Reddit post ID from element attribute:', postId);
            }
            
            if (!postId) {
                console.error('❌ No Reddit post ID found in any source');
                console.log('Available data:', {
                    window_currentRedditPostId: window.currentRedditPostId,
                    currentPostData: currentPostData,
                    postPreview: postPreview
                });
                showNotification('Post ID not found - please try again', 'error');
                return;
            }
            
            // Show loading state
            sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            sendBtn.disabled = true;
            
            // Ensure close button remains clickable during loading
            const closeBtn = document.getElementById('popup-close');
            if (closeBtn) {
                closeBtn.disabled = false;
                closeBtn.style.pointerEvents = 'auto';
            }
            
            // Extract Reddit post ID from multiple sources with comprehensive fallbacks
            let redditPostId = null;
            try {
                console.log('🔍 Extracting Reddit post ID from multiple sources:');
                console.log('currentPostData:', currentPostData);
                console.log('window.currentRedditPostId:', window.currentRedditPostId);
                
                // Try multiple approaches to get Reddit post ID
                if (currentPostData && currentPostData.reddit_post_id) {
                    redditPostId = currentPostData.reddit_post_id;
                    console.log('✅ Found reddit_post_id in currentPostData:', redditPostId);
                } else if (currentPostData && currentPostData.reddit_id) {
                    redditPostId = `t3_${currentPostData.reddit_id}`;
                    console.log('✅ Constructed from reddit_id in currentPostData:', redditPostId);
                } else if (window.currentRedditPostId) {
                    redditPostId = window.currentRedditPostId;
                    console.log('✅ Using window.currentRedditPostId:', redditPostId);
                } else {
                    // Try to get from post preview element
                    const postPreview = document.getElementById('post-preview');
                    if (postPreview) {
                        const dataRedditId = postPreview.getAttribute('data-reddit-id');
                        if (dataRedditId) {
                            redditPostId = dataRedditId;
                            console.log('✅ Found data-reddit-id from post preview:', redditPostId);
                        }
                    }
                }
                
                // If still no Reddit post ID, try to extract from currentPostData URL
                if (!redditPostId && currentPostData && currentPostData.url) {
                    redditPostId = extractRedditPostId(currentPostData.url);
                    if (redditPostId) {
                        console.log('✅ Extracted from URL in currentPostData:', redditPostId);
                    }
                }
                
                // Last resort: try to use currentPostData.id if it looks like a Reddit ID
                if (!redditPostId && currentPostData && currentPostData.id && !currentPostData.id.includes('-')) {
                    redditPostId = `t3_${currentPostData.id}`;
                    console.log('✅ Using currentPostData.id as Reddit ID:', redditPostId);
                }
                
                if (!redditPostId) {
                    console.error('Could not determine Reddit post ID from any source');
                    throw new Error('Could not determine Reddit post ID. Please ensure the post has valid Reddit data. Try refreshing the page and clicking the comment button again.');
                }
                } catch (error) {
                    console.error('Error getting Reddit post ID:', error);
                    showNotification('Error: Could not determine Reddit post ID. Please ensure the post has valid Reddit data.', 'error');
                    return;
                }

            // Post comment to Reddit using the correct Reddit post ID
            await postSparkDB.postRedditComment(redditPostId, comment);
            
            console.log('✅ Comment posted successfully to Reddit');
            
            // Show success state on button immediately
            sendBtn.innerHTML = '<i class="fas fa-check"></i> Comment Posted!';
            sendBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
            sendBtn.style.color = '#ffffff';
            sendBtn.disabled = false; // Re-enable button for success state
            
            // Show success notification
            showNotification('Comment posted successfully!', 'success');
            
            // Auto-mark post as contacted after successful comment
            try {
                let postId = null;
                
                // Try to get post ID from multiple sources
                if (currentPostData && currentPostData.id) {
                    postId = currentPostData.id;
                } else {
                    // Try to get from post preview element
                    const postPreview = document.getElementById('post-preview');
                    if (postPreview) {
                        const dataPostId = postPreview.getAttribute('data-post-id');
                        if (dataPostId) {
                            postId = dataPostId;
                        }
                    }
                }
                
                if (postId) {
                    await postSparkDB.markPostAsContacted(postId);
                    console.log('✅ Post automatically marked as contacted:', postId);
                    
                    // Update UI elements
                    await updateContactedStats();
                    await refreshPostCards();
                } else {
                    console.warn('Cannot auto-mark as contacted: postId not available from any source');
                }
            } catch (contactError) {
                console.warn('Could not auto-mark post as contacted:', contactError);
                // Don't show error to user as comment was successful
            }
            
            // Show enhanced success message
            showCommentSuccessMessage();
            
            // Wait a moment to show success state, then close popup
            setTimeout(() => {
                // Reset button state before closing
                sendBtn.innerHTML = originalText;
                sendBtn.disabled = false;
                sendBtn.style.background = '';
                sendBtn.style.color = '';
                
                closeCommentPopup();
            }, 2000); // Show success for 2 seconds
            
        } catch (error) {
            console.error('Error posting comment:', error);
            
            // Reset button state on error
            sendBtn.innerHTML = originalText;
            sendBtn.disabled = false;
            sendBtn.style.background = '';
            sendBtn.style.color = '';
            
            // Provide more specific error messages
            let errorMessage = 'Error posting comment: ';
            if (error.message.includes('Reddit account not connected')) {
                errorMessage = 'Please connect your Reddit account first.';
            } else if (error.message.includes('token') || error.message.includes('403') || error.message.includes('permissions') || error.message.includes('Insufficient permissions')) {
                errorMessage = 'Reddit permissions issue. Your account is connected but lacks comment permissions.';
                // Show error message without automatic reconnect prompt
                showNotification(errorMessage, 'error');
                
                // Add a button to manually reconnect if needed
                setTimeout(() => {
                    if (confirm('Your Reddit account is connected but needs comment permissions. Would you like to reconnect to grant these permissions?\n\nThis will redirect you to Reddit to authorize comment posting.')) {
                        postSparkDB.connectRedditAccount();
                    }
                }, 2000);
                return;
            } else if (error.message.includes('Reddit API error')) {
                errorMessage = 'Reddit API error. Please try again or reconnect your account.';
            } else if (error.message.includes('scope')) {
                errorMessage = 'Reddit token permissions issue. Please reconnect your Reddit account.';
                // Add a button to reconnect Reddit
                showNotification(errorMessage, 'error');
                setTimeout(() => {
                    if (confirm('Would you like to reconnect your Reddit account now?')) {
                        postSparkDB.connectRedditAccount();
                    }
                }, 2000);
                return;
            } else {
                errorMessage += error.message;
            }
            
            showNotification(errorMessage, 'error');
        } finally {
            // Reset button state only if not in success state
            if (!sendBtn.innerHTML.includes('Comment Posted!')) {
                sendBtn.innerHTML = originalText;
                sendBtn.disabled = false;
                sendBtn.style.background = '';
                sendBtn.style.color = '';
            }
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

    // Test Reddit connection button (if exists)
    const testRedditBtn = document.getElementById('test-reddit-btn');
    if (testRedditBtn) {
        testRedditBtn.addEventListener('click', async function() {
            try {
                const btn = this;
                const originalText = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
                btn.disabled = true;
                
                await postSparkDB.testRedditConnection();
                showNotification('Reddit connection is working!', 'success');
            } catch (error) {
                console.error('Reddit connection test failed:', error);
                showNotification('Reddit connection failed. Please reconnect your account.', 'error');
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
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
        
        // Check subscription limits before refreshing campaign
        if (window.subscriptionManager) {
            const canRefresh = await window.subscriptionManager.checkAndEnforceLimits('refresh_campaign', currentCampaignId);
            if (!canRefresh) {
                console.log('Campaign refresh blocked by subscription limits');
                // Reset button state
                icon.classList.remove('fa-spin');
                refreshBtn.disabled = false;
                return;
            }
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
        
        // Track usage
        if (window.subscriptionManager && typeof window.subscriptionManager.trackUsage === 'function') {
            try {
                await window.subscriptionManager.trackUsage('refreshes', 1);
                console.log('✅ Tracked refresh usage');
            } catch (error) {
                console.error('Error tracking refresh usage:', error);
            }
        } else {
            console.log('⚠️ Subscription manager not available for tracking refresh usage');
        }
        
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
            offer: offer, // Store offer separately for AI comment generation
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
        // Check subscription limits before creating campaign
        if (window.subscriptionManager) {
            const canCreate = await window.subscriptionManager.checkAndEnforceLimits('create_campaign');
            if (!canCreate) {
                console.log('Campaign creation blocked by subscription limits');
                return null;
            }
        }
        
        const campaign = await postSparkDB.createCampaign(campaignData);
        
        // Track usage
        if (window.subscriptionManager && typeof window.subscriptionManager.trackUsage === 'function') {
            try {
                await window.subscriptionManager.trackUsage('campaigns', 1);
                console.log('✅ Tracked campaign usage');
            } catch (error) {
                console.error('Error tracking campaign usage:', error);
            }
        } else {
            console.log('⚠️ Subscription manager not available for tracking campaign usage');
        }
        
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
    
    // Set Reddit post ID for commenting functionality
    if (post.reddit_post_id) {
        card.setAttribute('data-reddit-id', post.reddit_post_id);
        console.log('✅ Set data-reddit-id attribute:', post.reddit_post_id);
    } else if (post.reddit_id) {
        const redditPostId = `t3_${post.reddit_id}`;
        card.setAttribute('data-reddit-id', redditPostId);
        console.log('✅ Set data-reddit-id attribute from reddit_id:', redditPostId);
    } else {
        console.warn('⚠️ No Reddit post ID found for post:', post.id);
    }
    
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
            <button class="btn btn-primary" onclick="writeComment('${post.id}', '${post.subreddit}', '${(post.title || '').replace(/'/g, "\\'")}', '${(post.content || '').replace(/'/g, "\\'")}', '${post.created_at}', '${post.reddit_post_id || (post.reddit_id ? `t3_${post.reddit_id}` : '')}')">
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
            const redditPostId = postCard.getAttribute('data-reddit-id');
            actions.innerHTML = `
                <button class="btn btn-primary" onclick="openCommentForPost('${postId}')">
                    <i class="fas fa-comment"></i> Write Comment
                </button>
            `;
        }
        
        // Update contacted stats
        await updateContactedStats();
        await refreshPostCards();
        
    } catch (error) {
        console.error('Error marking post as contacted:', error);
        showNotification('Error marking post as contacted: ' + error.message, 'error');
    }
}

// Preload dashboard data immediately after login
async function preloadDashboardData() {
    try {
        console.log('🔄 Preloading dashboard data...');
        const startTime = performance.now();
        
        // Load campaigns to get real data with timeout
        let campaigns;
        try {
            campaigns = await Promise.race([
                postSparkDB.getCampaigns(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
            ]);
        } catch (error) {
            if (error.message === 'Timeout') {
                console.log('⚠️ Dashboard preload timeout, using fallback');
                campaigns = [];
            } else {
                throw error;
            }
        }
        
        if (campaigns.length === 0) {
            // No campaigns, cache empty state
            window.dashboardCache = {
                totalPosts: 0,
                contactedPosts: 0,
                highPotential: 0,
                highPotentialPosts: [],
                lastUpdated: new Date().toISOString()
            };
            console.log('📊 Dashboard cache initialized (empty)');
            return;
        }
        
        // Calculate real stats from campaigns with parallel loading
        let totalPosts = 0;
        let contactedPosts = 0;
        let highPotential = 0;
        let allHighPotentialPosts = [];
        
        // Load all posts in parallel instead of sequentially
        const postsPromises = campaigns.map(campaign => postSparkDB.getPosts(campaign.id));
        const allPostsResults = await Promise.all(postsPromises);
        
        // Process results
        allPostsResults.forEach((posts, index) => {
            const campaign = campaigns[index];
            totalPosts += posts.length;
            contactedPosts += posts.filter(post => post.is_contacted).length;
            const campaignHighPotential = posts.filter(post => post.score >= 85);
            highPotential += campaignHighPotential.length;
            
            // Add campaign info to high potential posts
            campaignHighPotential.forEach(post => {
                allHighPotentialPosts.push({
                    ...post,
                    campaignName: campaign.name,
                    campaignId: campaign.id
                });
            });
        });
        
        // Cache dashboard data
        window.dashboardCache = {
            totalPosts,
            contactedPosts,
            highPotential,
            highPotentialPosts: allHighPotentialPosts.sort((a, b) => b.score - a.score).slice(0, 6),
            lastUpdated: new Date().toISOString()
        };
        
        const endTime = performance.now();
        console.log(`✅ Dashboard data preloaded in ${(endTime - startTime).toFixed(2)}ms`);
        console.log('📊 Cached data:', window.dashboardCache);
        
        // Immediately show dashboard if we're on the dashboard page
        if (document.getElementById('dashboard').classList.contains('active')) {
            console.log('🚀 Dashboard is active, showing preloaded data immediately');
            await showDashboardDataImmediately();
        }
        
    } catch (error) {
        console.error('Error preloading dashboard data:', error);
        // Initialize empty cache on error
        window.dashboardCache = {
            totalPosts: 0,
            contactedPosts: 0,
            highPotential: 0,
            highPotentialPosts: [],
            lastUpdated: new Date().toISOString()
        };
    }
}

// Show dashboard data immediately when available
async function showDashboardDataImmediately() {
    try {
        if (window.dashboardCache) {
            console.log('⚡ Showing dashboard data immediately');
            
            // Update stats immediately
            updateDashboardStats({
                total_posts: window.dashboardCache.totalPosts,
                contacted_posts: window.dashboardCache.contactedPosts,
                high_potential: window.dashboardCache.highPotential
            });
            
            // Load high potential posts immediately
            await loadDashboardHighPotentialPosts(window.dashboardCache.highPotentialPosts);
            
            console.log('✅ Dashboard data shown immediately');
        }
    } catch (error) {
        console.error('Error showing dashboard data immediately:', error);
    }
}

// Load dashboard data with cache optimization
async function loadDashboardData() {
    try {
        console.log('🚀 Loading dashboard data...');
        const startTime = performance.now();
        
        // Check if we have cached data
        if (window.dashboardCache && window.dashboardCache.lastUpdated) {
            const cacheAge = Date.now() - new Date(window.dashboardCache.lastUpdated).getTime();
            const maxCacheAge = 2 * 60 * 1000; // 2 minutes (reduced for fresher data)
            
            if (cacheAge < maxCacheAge) {
                console.log('📊 Using cached dashboard data (age:', Math.round(cacheAge / 1000), 'seconds)');
                
                // Use cached data
                updateDashboardStats({
                    total_posts: window.dashboardCache.totalPosts,
                    contacted_posts: window.dashboardCache.contactedPosts,
                    high_potential: window.dashboardCache.highPotential
                });
                
                await loadDashboardHighPotentialPosts(window.dashboardCache.highPotentialPosts);
                
                const endTime = performance.now();
                console.log(`✅ Dashboard loaded from cache in ${(endTime - startTime).toFixed(2)}ms`);
                return;
            } else {
                console.log('📊 Cache expired, refreshing data...');
            }
        }
        
        // Show loading state for fresh data
        showDashboardLoadingState();
        
        // Load campaigns to get real data
        const campaigns = await postSparkDB.getCampaigns();
        
        if (campaigns.length === 0) {
            // No campaigns, show empty state
            updateDashboardStats({ total_posts: 0, contacted_posts: 0, high_potential: 0 });
            await loadDashboardHighPotentialPosts([]);
            hideDashboardLoadingState();
            return;
        }
        
        // Calculate real stats from campaigns with parallel loading
        let totalPosts = 0;
        let contactedPosts = 0;
        let highPotential = 0;
        let allHighPotentialPosts = [];
        
        // Load all posts in parallel instead of sequentially
        const postsPromises = campaigns.map(campaign => postSparkDB.getPosts(campaign.id));
        const allPostsResults = await Promise.all(postsPromises);
        
        // Process results
        allPostsResults.forEach((posts, index) => {
            const campaign = campaigns[index];
            totalPosts += posts.length;
            contactedPosts += posts.filter(post => post.is_contacted).length;
            const campaignHighPotential = posts.filter(post => post.score >= 85);
            highPotential += campaignHighPotential.length;
            
            // Add campaign info to high potential posts
            campaignHighPotential.forEach(post => {
                allHighPotentialPosts.push({
                    ...post,
                    campaignName: campaign.name,
                    campaignId: campaign.id
                });
            });
        });
        
        // Update cache
        window.dashboardCache = {
            totalPosts,
            contactedPosts,
            highPotential,
            highPotentialPosts: allHighPotentialPosts.sort((a, b) => b.score - a.score).slice(0, 6),
            lastUpdated: new Date().toISOString()
        };
        
        // Update dashboard stats with real data
        console.log('Dashboard data:', { totalPosts, contactedPosts, highPotential });
        updateDashboardStats({
            total_posts: totalPosts,
            contacted_posts: contactedPosts,
            high_potential: highPotential
        });
        
        // Load high potential posts for dashboard
        await loadDashboardHighPotentialPosts(allHighPotentialPosts);
        
        // Hide loading state
        hideDashboardLoadingState();
        
        const endTime = performance.now();
        console.log(`✅ Dashboard loaded in ${(endTime - startTime).toFixed(2)}ms`);
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        hideDashboardLoadingState();
        // Show empty state if no data
        updateDashboardStats({
            total_posts: 0,
            contacted_posts: 0,
            high_potential: 0
        });
    }
}

// Load high potential posts for dashboard
async function loadDashboardHighPotentialPosts(highPotentialPosts) {
    try {
        const postsGrid = document.getElementById('dashboard-high-potential-posts');
        if (!postsGrid) {
            console.error('Dashboard high potential posts grid not found');
            return;
        }
        
        if (highPotentialPosts.length === 0) {
            postsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>No high potential posts found</h3>
                    <p>Create your first campaign to start finding leads on Reddit</p>
                    <button class="btn btn-primary" onclick="showCreateCampaign()">Create Campaign</button>
                </div>
            `;
            return;
        }
        
        // Sort by score (highest first) and take top 6
        const sortedPosts = highPotentialPosts
            .sort((a, b) => b.score - a.score)
            .slice(0, 6);
        
        // Clear existing content
        postsGrid.innerHTML = '';
        
        // Render high potential posts
        sortedPosts.forEach(post => {
            const postCard = createDashboardPostCard(post);
            postsGrid.appendChild(postCard);
        });
        
        console.log(`Loaded ${sortedPosts.length} high potential posts for dashboard`);
        
    } catch (error) {
        console.error('Error loading dashboard high potential posts:', error);
    }
}

// Create dashboard post card
function createDashboardPostCard(post) {
    const card = document.createElement('div');
    card.className = `post-card ${post.score >= 85 ? 'high-potential' : post.score >= 70 ? 'medium-potential' : 'low-potential'}`;
    card.setAttribute('data-post-id', post.id);
    card.setAttribute('data-campaign-id', post.campaignId);
    
    // Set Reddit post ID for commenting
    if (post.reddit_post_id) {
        card.setAttribute('data-reddit-id', post.reddit_post_id);
    } else if (post.reddit_id) {
        const redditPostId = `t3_${post.reddit_id}`;
        card.setAttribute('data-reddit-id', redditPostId);
    }
    
    const contactedClass = post.is_contacted ? 'contacted' : '';
    const contactedBadge = post.is_contacted ? '<span class="contacted-badge">Contacted</span>' : '';
    
    // Format time
    let timeAgo = 'Unknown time';
    try {
        timeAgo = formatTimeAgo(new Date(post.created_at));
    } catch (e) {
        console.warn('Error formatting time for post:', post.id);
    }
    
    card.innerHTML = `
        <div class="post-header">
            <h3>${post.title || 'No title'}</h3>
            ${contactedBadge}
        </div>
        <div class="post-meta">
            <span class="post-author">u/${post.author || 'unknown'}</span>
            <span class="post-subreddit">r/${post.subreddit || 'unknown'}</span>
            <span class="post-score">${post.score || 0} points</span>
        </div>
        <div class="post-content">
            <p>${post.content || 'No content available'}</p>
        </div>
                <div class="post-actions">
                    <button class="btn btn-secondary" onclick="showCampaignPosts('${post.campaignId}')">
                        <i class="fas fa-eye"></i> Show in Campaign
                    </button>
                </div>
        <div class="post-footer">
            <span class="campaign-info">From: ${post.campaignName || 'Unknown Campaign'}</span>
        </div>
    `;
    
    return card;
}

// Show dashboard loading state
function showDashboardLoadingState() {
    const postsGrid = document.getElementById('dashboard-high-potential-posts');
    if (postsGrid) {
        postsGrid.innerHTML = `
            <div class="dashboard-loading-state">
                <div class="loading-spinner"></div>
                <h3>Loading your high potential posts...</h3>
                <p>Analyzing campaigns and finding the best leads</p>
            </div>
        `;
    }
}

// Hide dashboard loading state
function hideDashboardLoadingState() {
    // Loading state will be replaced by actual content
    console.log('Dashboard loading state hidden');
}

// Show enhanced comment success message
function showCommentSuccessMessage() {
    // Create success notification with enhanced styling
    const notification = document.createElement('div');
    notification.className = 'notification success enhanced';
    notification.innerHTML = `
        <div class="success-content">
            <div class="success-icon">
                <i class="fas fa-check-circle"></i>
            </div>
            <div class="success-text">
                <h4>Comment sent successfully!</h4>
                <p>Your comment has been posted to Reddit and the post has been marked as contacted.</p>
            </div>
        </div>
    `;
    
    // Add to body
    document.body.appendChild(notification);
    
    // Show with animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
    
    console.log('✅ Comment success message shown');
}

// Update contacted stats across the app
async function updateContactedStats() {
    try {
        console.log('Updating contacted stats...');
        
        // Invalidate dashboard cache when stats change
        if (window.dashboardCache) {
            window.dashboardCache.lastUpdated = null;
            console.log('📊 Dashboard cache invalidated due to stats change');
        }
        
        // Get all campaigns and calculate stats
        const campaigns = await postSparkDB.getCampaigns();
        let totalContacted = 0;
        let totalPosts = 0;
        let highPotential = 0;
        
        for (const campaign of campaigns) {
            const posts = await postSparkDB.getPosts(campaign.id);
            totalPosts += posts.length;
            totalContacted += posts.filter(post => post.is_contacted).length;
            highPotential += posts.filter(post => post.score >= 85).length;
        }
        
        // Update dashboard stats
        updateDashboardStats({
            total_posts: totalPosts,
            contacted_posts: totalContacted,
            high_potential: highPotential
        });
        
        // Update campaign cards stats
        await updateCampaignCardsStats();
        
        // Update campaign detail stats if on campaign page
        const campaignPostsPage = document.getElementById('campaign-posts');
        if (campaignPostsPage && campaignPostsPage.classList.contains('active')) {
            const currentCampaignId = window.currentCampaignId;
            if (currentCampaignId) {
                const currentCampaignPosts = await postSparkDB.getPosts(currentCampaignId);
                const currentContacted = currentCampaignPosts.filter(post => post.is_contacted).length;
                const currentHighPotential = currentCampaignPosts.filter(post => post.score >= 85).length;
                const currentTotal = currentCampaignPosts.length;
                
                // Update all campaign stats
                const contactedElement = document.getElementById('contacted-posts');
                const highPotentialElement = document.getElementById('high-potential-posts');
                const totalElement = document.getElementById('total-posts');
                
                if (contactedElement) contactedElement.textContent = currentContacted;
                if (highPotentialElement) highPotentialElement.textContent = currentHighPotential;
                if (totalElement) totalElement.textContent = currentTotal;
                
                console.log('Updated campaign stats:', { currentContacted, currentHighPotential, currentTotal });
            }
        }
        
        console.log('Contacted stats updated:', { totalContacted, totalPosts, highPotential });
        
    } catch (error) {
        console.error('Error updating contacted stats:', error);
    }
}

// Refresh post cards after status change
async function refreshPostCards() {
    try {
        console.log('Refreshing post cards...');
        
        // Refresh dashboard high potential posts
        const dashboardPage = document.getElementById('dashboard');
        if (dashboardPage && dashboardPage.classList.contains('active')) {
            await loadDashboardData();
        }
        
        // Refresh campaign posts if on campaign page
        const campaignPostsPage = document.getElementById('campaign-posts');
        if (campaignPostsPage && campaignPostsPage.classList.contains('active')) {
            const currentCampaignId = window.currentCampaignId;
            if (currentCampaignId) {
                await showCampaignPosts(currentCampaignId);
            }
        }
        
        console.log('Post cards refreshed');
        
    } catch (error) {
        console.error('Error refreshing post cards:', error);
    }
}

// Update campaign cards stats
async function updateCampaignCardsStats() {
    try {
        console.log('Updating campaign cards stats...');
        
        // Get all campaigns and update their stats
        const campaigns = await postSparkDB.getCampaigns();
        
        for (const campaign of campaigns) {
            try {
                const posts = await postSparkDB.getPosts(campaign.id);
                const totalPosts = posts.length;
                const highPotential = posts.filter(post => post.score >= 85).length;
                const contacted = posts.filter(post => post.is_contacted).length;
                
                // Update campaign card stats in the UI
                const campaignCard = document.querySelector(`[data-campaign="${campaign.id}"]`);
                if (campaignCard) {
                    const statsContainer = campaignCard.querySelector('.campaign-stats');
                    if (statsContainer) {
                        statsContainer.innerHTML = `
                            <div class="stat">
                                <span class="stat-number">${totalPosts}</span>
                                <span class="stat-label">Leads Found</span>
                            </div>
                            <div class="stat">
                                <span class="stat-number">${highPotential}</span>
                                <span class="stat-label">High Potential</span>
                            </div>
                            <div class="stat">
                                <span class="stat-number">${contacted}</span>
                                <span class="stat-label">Contacted</span>
                            </div>
                        `;
                    }
                }
            } catch (error) {
                console.error(`Error updating stats for campaign ${campaign.id}:`, error);
            }
        }
        
        console.log('Campaign cards stats updated');
        
    } catch (error) {
        console.error('Error updating campaign cards stats:', error);
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
    
    // Initialize Reddit integration
    initializeRedditIntegration();
    
    // Bind Reddit integration buttons
    const connectRedditBtn = document.getElementById('connect-reddit-btn');
    const disconnectRedditBtn = document.getElementById('disconnect-reddit-btn');
    
    if (connectRedditBtn) {
        connectRedditBtn.addEventListener('click', function() {
            connectRedditAccount();
        });
    }
    
    if (disconnectRedditBtn) {
        disconnectRedditBtn.addEventListener('click', function() {
            disconnectRedditAccount();
        });
    }
    
    // Bind danger zone buttons
    const exportDataBtn = document.getElementById('export-data-btn');
    const deleteAccountBtn = document.getElementById('delete-account-btn');
    
    if (exportDataBtn) {
        exportDataBtn.addEventListener('click', function() {
            exportUserData();
        });
    }
    
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', function() {
            deleteUserAccount();
        });
    }
    
    // Bind comment popup Reddit buttons
    const commentPopupConnectBtn = document.getElementById('connect-reddit-btn');
    const commentPopupDisconnectBtn = document.getElementById('disconnect-reddit-btn');
    
    if (commentPopupConnectBtn) {
        commentPopupConnectBtn.addEventListener('click', function() {
            connectRedditAccount();
        });
    }
    
    if (commentPopupDisconnectBtn) {
        commentPopupDisconnectBtn.addEventListener('click', function() {
            disconnectRedditAccount();
        });
    }
}

async function loadUserSettings() {
    if (!postSparkDB.userData) return;
    
    console.log('🔄 Loading user settings...');
    const startTime = performance.now();
    
    // Populate settings form with user data
    const nameInput = document.getElementById('profile-name');
    const emailInput = document.getElementById('profile-email');
    const companyInput = document.getElementById('profile-company');
    
    if (nameInput) nameInput.value = postSparkDB.userData.full_name || '';
    if (emailInput) emailInput.value = postSparkDB.userData.email || '';
    if (companyInput) companyInput.value = postSparkDB.userData.company || '';
    
    // Load subscription data
    loadSubscriptionData();
    
    // Load Reddit connection status automatically
    await updateRedditSettingsStatus();
    
    const endTime = performance.now();
    console.log(`✅ User settings loaded in ${(endTime - startTime).toFixed(2)}ms`);
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
    
    // Get the actual Reddit post ID from the element
    const actualRedditPostId = postElement.getAttribute('data-reddit-id');
    console.log('Actual Reddit post ID from element:', actualRedditPostId);
    
    // Set currentPostData for AI generation with Reddit post ID
    currentPostData = {
        ...postData,
        reddit_post_id: actualRedditPostId,
        reddit_id: actualRedditPostId ? actualRedditPostId.replace('t3_', '') : null,
        url: actualRedditPostId ? `https://reddit.com/r/${postData.subreddit}/comments/${actualRedditPostId.replace('t3_', '')}/` : null
    };
    console.log('Post data set for AI with Reddit ID:', currentPostData); // Debug log
    
    // Use the actual Reddit post ID instead of database ID
    if (actualRedditPostId) {
        console.log('Using Reddit post ID for commenting:', actualRedditPostId);
        await writeComment(postId, postData.subreddit, postData.title, postData.content, postData.created_at, actualRedditPostId);
    } else {
        console.error('No Reddit post ID found for commenting');
        showNotification('Reddit post ID not found. Cannot comment.', 'error');
    }
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
            url: actualRedditPostId ? `https://reddit.com/r/${subreddit}/comments/${actualRedditPostId.replace('t3_', '')}/` : `https://reddit.com/r/${subreddit}/comments/${postId}/`,
            reddit_id: actualRedditPostId ? actualRedditPostId.replace('t3_', '') : postId, // Store the Reddit ID for commenting
            reddit_post_id: actualRedditPostId || `t3_${postId}` // Use the actual Reddit post ID if provided
        };
        
        console.log('🔍 Updated currentPostData:', currentPostData);
        console.log('Post data stored for AI in writeComment:', currentPostData); // Debug log
        
        // Show comment popup
        const popup = document.getElementById('comment-popup');
        const postPreview = document.getElementById('post-preview');
        
        // Ensure currentPostData is set before showing popup
        if (!currentPostData) {
            console.warn('currentPostData was null, re-initializing from parameters');
            currentPostData = {
                id: postId,
                title: title,
                content: content,
                subreddit: subreddit,
                url: actualRedditPostId ? `https://reddit.com/r/${subreddit}/comments/${actualRedditPostId.replace('t3_', '')}/` : `https://reddit.com/r/${subreddit}/comments/${postId}/`,
                reddit_id: actualRedditPostId ? actualRedditPostId.replace('t3_', '') : postId,
                reddit_post_id: actualRedditPostId || `t3_${postId}`
            };
        }
        
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
        if (actualRedditPostId && actualRedditPostId !== '') {
            redditPostId = actualRedditPostId;
            console.log('✅ Using provided Reddit post ID:', redditPostId);
        } else if (postId && postId.startsWith('t3_') && !postId.includes('-')) {
            // If postId is already a Reddit post ID (not a UUID), use it directly
            redditPostId = postId;
            console.log('✅ Using postId as Reddit post ID:', redditPostId);
        } else if (currentPostData && currentPostData.reddit_post_id) {
            redditPostId = currentPostData.reddit_post_id;
            console.log('✅ Found Reddit post ID in currentPostData:', redditPostId);
        } else if (currentPostData && currentPostData.reddit_id) {
            redditPostId = `t3_${currentPostData.reddit_id}`;
            console.log('✅ Constructed Reddit post ID from reddit_id:', redditPostId);
        } else if (currentPostData && currentPostData.url) {
            // Try to extract Reddit post ID from URL using robust function
            redditPostId = extractRedditPostId(currentPostData.url);
            if (redditPostId) {
                console.log('✅ Extracted Reddit post ID from currentPostData URL:', redditPostId);
            } else {
                console.log('❌ Could not extract Reddit post ID from URL:', currentPostData.url);
            }
        } else {
            // Try to extract Reddit post ID from the post URL or title
            console.log('❌ No Reddit post ID found, trying to extract from post data...');
            console.log('Available data for debugging:', {
                actualRedditPostId: actualRedditPostId,
                postId: postId,
                currentPostData: currentPostData
            });
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
        
        console.log('Reddit post ID for commenting:', redditPostId);
        
        // Show warning if we don't have a real Reddit post ID
        if (redditPostId === 't3_placeholder') {
            showNotification('Warning: No Reddit post ID found. Commenting may not work.', 'warning');
        }
        
        // Store Reddit post ID for commenting
        if (redditPostId) {
            postPreview.setAttribute('data-reddit-id', redditPostId);
            // Also store in window for easy access
            window.currentRedditPostId = redditPostId;
            console.log('✅ Stored Reddit post ID in window.currentRedditPostId:', redditPostId);
        } else {
            console.error('❌ No Reddit post ID to store for commenting');
            console.log('Available data for debugging:', {
                actualRedditPostId: actualRedditPostId,
                postId: postId,
                currentPostData: currentPostData
            });
        }
        
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

// Initialize Reddit integration settings
async function initializeRedditIntegration() {
    try {
        console.log('Initializing Reddit integration settings...');
        
        // Check Reddit connection status first
        const isConnected = await postSparkDB.isRedditConnected();
        console.log('Reddit connection status:', isConnected);
        
        // Update settings status with current connection state
        await updateRedditSettingsStatus();
        
    } catch (error) {
        console.error('Error initializing Reddit integration:', error);
    }
}

// Update Reddit settings status
async function updateRedditSettingsStatus() {
    try {
        console.log('🔄 Updating Reddit settings status...');
        const startTime = performance.now();
        
        const statusDot = document.getElementById('reddit-status-dot');
        const statusText = document.getElementById('reddit-connection-text');
        const connectionDetails = document.getElementById('reddit-connection-details');
        const connectBtn = document.getElementById('connect-reddit-btn');
        const disconnectBtn = document.getElementById('disconnect-reddit-btn');
        const username = document.getElementById('reddit-username');
        const connectionDate = document.getElementById('reddit-connection-date');
        const permissions = document.getElementById('reddit-permissions');
        
        // Show loading state immediately
        if (statusText) {
            statusText.textContent = 'Checking connection...';
            statusText.className = 'status-text loading';
        }
        if (statusDot) {
            statusDot.className = 'status-dot loading';
        }
        
        // Check if Reddit is connected - use proper API check
        const isConnected = await postSparkDB.isRedditConnected();
        const redditToken = localStorage.getItem('reddit_access_token');
        const redditUser = localStorage.getItem('reddit_user_info');
        const connectionDateStored = localStorage.getItem('reddit_connection_date');
        
        console.log('Settings Reddit status check:', { 
            isConnected, 
            redditToken: !!redditToken, 
            redditUser: !!redditUser,
            tokenLength: redditToken ? redditToken.length : 0,
            userInfo: redditUser ? JSON.parse(redditUser) : null
        });
        
        // Check if we have valid Reddit connection data
        const hasValidToken = redditToken && redditToken.length > 10;
        const hasValidUser = redditUser && redditUser.length > 10;
        const isActuallyConnected = isConnected || (hasValidToken && hasValidUser);
        
        console.log('Connection validation:', {
            isConnected,
            hasValidToken,
            hasValidUser,
            isActuallyConnected
        });
        
        if (isActuallyConnected) {
            // Connected state
            console.log('✅ Reddit account is connected');
            statusDot.className = 'status-dot connected';
            statusText.textContent = 'Reddit account connected';
            statusText.className = 'status-text connected';
            connectionDetails.style.display = 'none'; // Hide connection details
            connectBtn.style.display = 'none';
            disconnectBtn.style.display = 'inline-flex';
            
            // Connection details are now hidden - no need to populate them
        } else {
            // Disconnected state
            console.log('❌ Reddit account is not connected');
            statusDot.className = 'status-dot disconnected';
            statusText.textContent = 'Reddit account not connected';
            statusText.className = 'status-text disconnected';
            connectionDetails.style.display = 'none';
            connectBtn.style.display = 'inline-flex';
            disconnectBtn.style.display = 'none';
            
            // Connection details are hidden - no need to clear them
        }
        
        const endTime = performance.now();
        console.log(`✅ Reddit settings status updated in ${(endTime - startTime).toFixed(2)}ms`);
    } catch (error) {
        console.error('Error updating Reddit settings status:', error);
        // Show error state
        const statusDot = document.getElementById('reddit-status-dot');
        const statusText = document.getElementById('reddit-connection-text');
        const connectBtn = document.getElementById('connect-reddit-btn');
        const disconnectBtn = document.getElementById('disconnect-reddit-btn');
        
        if (statusDot) statusDot.className = 'status-dot error';
        if (statusText) {
            statusText.textContent = 'Error checking connection';
            statusText.className = 'status-text error';
        }
        if (connectBtn) connectBtn.style.display = 'inline-flex';
        if (disconnectBtn) disconnectBtn.style.display = 'none';
    }
}

// Disconnect Reddit account
async function disconnectRedditAccount() {
    try {
        // Show confirmation dialog
        const confirmed = confirm('Are you sure you want to disconnect your Reddit account? This will prevent you from commenting on Reddit posts through PostSpark.');
        
        if (!confirmed) {
            return;
        }
        
        console.log('Disconnecting Reddit account...');
        
        // Clear Reddit data from localStorage
        localStorage.removeItem('reddit_access_token');
        localStorage.removeItem('reddit_refresh_token');
        localStorage.removeItem('reddit_user_info');
        localStorage.removeItem('reddit_auth_code');
        localStorage.removeItem('reddit_auth_state');
        localStorage.removeItem('reddit_connection_date');
        
        // Update UI
        await updateRedditSettingsStatus();
        
        // Show success message
        showNotification('Reddit account disconnected successfully', 'success');
        
        console.log('Reddit account disconnected successfully');
        
    } catch (error) {
        console.error('Error disconnecting Reddit account:', error);
        showNotification('Error disconnecting Reddit account: ' + error.message, 'error');
    }
}

// Export user data
async function exportUserData() {
    try {
        console.log('Exporting user data...');
        showNotification('Preparing data export...', 'info');
        
        // Get all user data
        const userData = {
            profile: postSparkDB.userData,
            campaigns: [],
            posts: [],
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        // Get campaigns
        const campaigns = await postSparkDB.getCampaigns();
        userData.campaigns = campaigns;
        
        // Get posts for each campaign
        for (const campaign of campaigns) {
            try {
                const posts = await postSparkDB.getPosts(campaign.id);
                userData.posts.push({
                    campaignId: campaign.id,
                    campaignName: campaign.name,
                    posts: posts
                });
            } catch (error) {
                console.error(`Error loading posts for campaign ${campaign.id}:`, error);
            }
        }
        
        // Create and download JSON file
        const dataStr = JSON.stringify(userData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `postspark-data-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showNotification('Data exported successfully!', 'success');
        console.log('User data exported successfully');
        
    } catch (error) {
        console.error('Error exporting user data:', error);
        showNotification('Error exporting data: ' + error.message, 'error');
    }
}

// Delete user account
async function deleteUserAccount() {
    try {
        // Show confirmation dialog
        const confirmed = confirm('Are you sure you want to delete your account? This action is irreversible and will delete all your data including campaigns, posts, and settings.');
        
        if (!confirmed) {
            return;
        }
        
        // Show second confirmation
        const doubleConfirmed = confirm('This will permanently delete your account and all data. Type "DELETE" to confirm (this is case-sensitive).');
        
        if (!doubleConfirmed) {
            return;
        }
        
        // Ask for confirmation text
        const confirmationText = prompt('Please type "DELETE" to confirm account deletion:');
        
        if (confirmationText !== 'DELETE') {
            showNotification('Account deletion cancelled. Confirmation text did not match.', 'warning');
            return;
        }
        
        console.log('Deleting user account...');
        showNotification('Deleting account...', 'info');
        
        // Delete account from Supabase
        await postSparkDB.deleteAccount();
        
        // Clear all local data
        localStorage.clear();
        sessionStorage.clear();
        
        // Show success message
        showNotification('Account deleted successfully', 'success');
        
        // Redirect to login page
        setTimeout(() => {
            window.location.href = '/login';
        }, 2000);
        
        console.log('User account deleted successfully');
        
    } catch (error) {
        console.error('Error deleting user account:', error);
        showNotification('Error deleting account: ' + error.message, 'error');
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
        
        // Store connection date
        localStorage.setItem('reddit_connection_date', new Date().toISOString());
        
        // Update settings UI after successful connection
        setTimeout(async () => {
            await updateRedditSettingsStatus();
        }, 1000);
        
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
        // Check subscription limits before finding more leads
        if (window.subscriptionManager) {
            const canRefresh = await window.subscriptionManager.checkAndEnforceLimits('refresh_campaign', campaignId);
            if (!canRefresh) {
                console.log('Finding more leads blocked by subscription limits');
                return;
            }
        }
        
        showNotification('Searching for more leads...', 'info');
        
        const redditPosts = await postSparkDB.findRedditLeads(campaignId);
        
        if (redditPosts.length > 0) {
            // Refresh the campaign posts if we're viewing them
            if (document.getElementById('campaign-posts').classList.contains('active')) {
                showCampaignPosts(campaignId);
            }
            
            // Track usage
            if (window.subscriptionManager && typeof window.subscriptionManager.trackUsage === 'function') {
                try {
                    await window.subscriptionManager.trackUsage('refreshes', 1);
                    console.log('✅ Tracked refresh usage');
                } catch (error) {
                    console.error('Error tracking refresh usage:', error);
                }
            } else {
                console.log('⚠️ Subscription manager not available for tracking refresh usage');
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
        if (window.router && window.router.showPage) {
            window.router.showPage(page);
        } else {
            console.error('Router not available for page:', page);
        }
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
    
    // Show campaign offer if available
    showCampaignOfferPreview();
    
    // Show popup
    const popup = document.getElementById('ai-style-popup');
    popup.classList.add('active');
    
    // Add event listeners for new buttons
    setupAIPopupEventListeners();
}

function showCampaignOfferPreview() {
    const campaignId = window.currentCampaignId;
    const campaign = campaignId ? postSparkDB.campaigns.find(c => c.id === campaignId) : null;
    const customOfferTextarea = document.getElementById('custom-offer');
    
    if (customOfferTextarea && campaign?.offer) {
        // Set the campaign offer as the value in the textarea
        customOfferTextarea.value = campaign.offer;
        customOfferTextarea.placeholder = `Campaign Offer: ${campaign.offer}`;
    }
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
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        generateBtn.disabled = true;
        
        // Generate AI response
        await generateAIResponse();
        
    } catch (error) {
        console.error('Error generating AI response:', error);
        showNotification('Error generating response: ' + error.message, 'error');
    } finally {
        // Remove loading state
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
        
        // Get campaign data for display
        const campaignId = window.currentCampaignId;
        const campaign = campaignId ? postSparkDB.campaigns.find(c => c.id === campaignId) : null;
        
        aiStylePreview.innerHTML = `
            <div class="style-detail">
                <strong>Tone:</strong> ${toneNames[style.tone] || style.tone}
            </div>
            <div class="style-detail">
                <strong>Sales Approach:</strong> ${salesNames[style.salesStrength - 1] || style.salesStrength}
            </div>
            ${style.includeWebsite && campaign?.website_url ? `<div class="style-detail"><strong>Website:</strong> ${campaign.website_url}</div>` : ""}
            ${style.customOffer ? `<div class="style-detail"><strong>Custom Offer:</strong> ${style.customOffer}</div>` : (campaign?.offer ? `<div class="style-detail"><strong>Campaign Offer:</strong> ${campaign.offer}</div>` : "")}
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
    
    // Check subscription limits before generating AI response
    if (window.subscriptionManager) {
        const canGenerate = await window.subscriptionManager.checkAndEnforceLimits('ai_response');
        if (!canGenerate) {
            console.log('AI response generation blocked by subscription limits');
            return;
        }
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
                offer: style.customOffer || campaign.offer || campaign.description,
                websiteUrl: style.includeWebsite ? (campaign.website_url || "") : "",
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
            
            // Track usage
            if (window.subscriptionManager && typeof window.subscriptionManager.trackUsage === 'function') {
                try {
                    await window.subscriptionManager.trackUsage('ai_responses', 1);
                    console.log('✅ Tracked AI response usage');
                } catch (error) {
                    console.error('Error tracking AI response usage:', error);
                }
            } else {
                console.log('⚠️ Subscription manager not available for tracking AI response usage');
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

// Subscription Management Functions
async function initializeSubscriptionManagement() {
    console.log('Initializing subscription management...');
    
    // Add event listeners for subscription buttons
    const upgradeBtn = document.getElementById('upgrade-plan-btn');
    const manageBtn = document.getElementById('manage-subscription-btn');
    
    if (upgradeBtn) {
        upgradeBtn.addEventListener('click', handleUpgradePlan);
    }
    
    if (manageBtn) {
        manageBtn.addEventListener('click', handleManageSubscription);
    }
    
    // Update subscription UI when settings page loads
    if (window.subscriptionManager) {
        try {
            await window.subscriptionManager.updateSettingsPage();
            updateSubscriptionButtons();
            console.log('✅ Subscription UI updated successfully');
        } catch (error) {
            console.error('❌ Error updating subscription UI:', error);
        }
    } else {
        console.log('⚠️ Subscription manager not available during initialization');
    }
}

function updateSubscriptionButtons() {
    const upgradeBtn = document.getElementById('upgrade-plan-btn');
    const manageBtn = document.getElementById('manage-subscription-btn');
    
    if (!window.subscriptionManager) return;
    
    const hasSubscription = window.subscriptionManager.hasActiveSubscription();
    const currentPlan = window.subscriptionManager.getSubscriptionPlan();
    
    if (hasSubscription) {
        // User has subscription - show manage button
        if (upgradeBtn) upgradeBtn.style.display = 'none';
        if (manageBtn) manageBtn.style.display = 'inline-flex';
        
        // Update button text based on plan
        if (upgradeBtn && currentPlan !== 'enterprise') {
            upgradeBtn.style.display = 'inline-flex';
            upgradeBtn.innerHTML = '<i class="fas fa-arrow-up"></i> Upgrade Plan';
        }
    } else {
        // No subscription - show upgrade button
        if (upgradeBtn) upgradeBtn.style.display = 'inline-flex';
        if (manageBtn) manageBtn.style.display = 'none';
    }
}

function handleUpgradePlan() {
    if (!window.subscriptionManager) {
        showNotification('Subscription manager not available', 'error');
        return;
    }
    
    const currentPlan = window.subscriptionManager.getSubscriptionPlan();
    const upgradeUrl = window.subscriptionManager.getUpgradeUrl(currentPlan);
    
    if (upgradeUrl) {
        window.open(upgradeUrl, '_blank');
    } else {
        showNotification('Upgrade URL not available', 'error');
    }
}

function handleManageSubscription() {
    if (!window.subscriptionManager) {
        showNotification('Subscription manager not available', 'error');
        return;
    }
    
    const currentPlan = window.subscriptionManager.getSubscriptionPlan();
    const upgradeUrl = window.subscriptionManager.getUpgradeUrl(currentPlan);
    
    if (upgradeUrl) {
        // For now, redirect to upgrade page
        // In a full implementation, this would go to a subscription management page
        window.open(upgradeUrl, '_blank');
    } else {
        showNotification('Subscription management not available', 'error');
    }
}

// Check subscription status and show paywall if needed
async function checkSubscriptionAndShowPaywall() {
    if (!window.subscriptionManager) {
        console.log('⚠️ Subscription manager not available');
        return;
    }
    
    try {
        await window.subscriptionManager.initialize();
        console.log('✅ Subscription manager initialized successfully');
        
        if (!window.subscriptionManager.hasActiveSubscription()) {
            console.log('No active subscription found, showing paywall');
            window.subscriptionManager.showPaywall('no_subscription');
        } else {
            console.log('✅ Active subscription found');
        }
    } catch (error) {
        console.error('❌ Error initializing subscription manager:', error);
    }
}

// Initialize subscription management when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize subscription management after a short delay to ensure other scripts are loaded
    setTimeout(async () => {
        try {
            await initializeSubscriptionManagement();
            await checkSubscriptionAndShowPaywall();
            console.log('✅ Subscription management initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing subscription management:', error);
        }
    }, 1000);
});
