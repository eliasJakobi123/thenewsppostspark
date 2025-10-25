// PostSpark Subscription Manager
// Handles subscription limits, validation, and user experience

class SubscriptionManager {
    constructor() {
        this.currentUser = null;
        this.currentSubscription = null;
        this.subscriptionLimits = null;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            // Get current user
            const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
            if (userError || !user) {
                console.log('No authenticated user found');
                return false;
            }

            this.currentUser = user;
            
            // Get user's subscription
            await this.loadUserSubscription();
            
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('Error initializing subscription manager:', error);
            return false;
        }
    }

    async loadUserSubscription() {
        try {
            if (!this.currentUser) return;

            const { data, error } = await supabaseClient
                .rpc('get_user_subscription', { user_uuid: this.currentUser.id });

            if (error) {
                console.error('Error loading user subscription:', error);
                this.currentSubscription = null;
                this.subscriptionLimits = null;
                return;
            }

            if (data && data.length > 0) {
                this.currentSubscription = data[0];
                this.subscriptionLimits = {
                    maxCampaigns: this.currentSubscription.max_campaigns,
                    maxRefreshesPerCampaign: this.currentSubscription.max_refreshes_per_campaign,
                    maxRefreshesPerMonth: this.currentSubscription.max_refreshes_per_month,
                    features: this.currentSubscription.features
                };
            } else {
                this.currentSubscription = null;
                this.subscriptionLimits = null;
            }
        } catch (error) {
            console.error('Error loading user subscription:', error);
            this.currentSubscription = null;
            this.subscriptionLimits = null;
        }
    }

    hasActiveSubscription() {
        return this.currentSubscription && 
               this.currentSubscription.status === 'active' &&
               (!this.currentSubscription.expires_at || new Date(this.currentSubscription.expires_at) > new Date());
    }

    getSubscriptionPlan() {
        if (!this.hasActiveSubscription()) {
            return 'none';
        }
        return this.currentSubscription.plan_code;
    }

    getSubscriptionFeatures() {
        if (!this.hasActiveSubscription()) {
            return {};
        }
        return this.currentSubscription.features || {};
    }

    async canCreateCampaign() {
        if (!this.hasActiveSubscription()) {
            return { allowed: false, reason: 'no_subscription' };
        }

        try {
            const { data, error } = await supabaseClient
                .rpc('can_user_create_campaign', { user_uuid: this.currentUser.id });

            if (error) {
                console.error('Error checking campaign creation:', error);
                return { allowed: false, reason: 'error' };
            }

            return { allowed: data, reason: data ? 'allowed' : 'limit_reached' };
        } catch (error) {
            console.error('Error checking campaign creation:', error);
            return { allowed: false, reason: 'error' };
        }
    }

    async canRefreshCampaign(campaignId) {
        if (!this.hasActiveSubscription()) {
            return { allowed: false, reason: 'no_subscription' };
        }

        try {
            const { data, error } = await supabaseClient
                .rpc('can_user_refresh_campaign', { 
                    user_uuid: this.currentUser.id, 
                    campaign_uuid: campaignId 
                });

            if (error) {
                console.error('Error checking campaign refresh:', error);
                return { allowed: false, reason: 'error' };
            }

            return { allowed: data, reason: data ? 'allowed' : 'limit_reached' };
        } catch (error) {
            console.error('Error checking campaign refresh:', error);
            return { allowed: false, reason: 'error' };
        }
    }

    async canGenerateAIResponse() {
        if (!this.hasActiveSubscription()) {
            return { allowed: false, reason: 'no_subscription' };
        }

        try {
            // Get current AI response count for this month
            const { data: usage, error: usageError } = await supabaseClient
                .from('subscription_usage')
                .select('usage_count')
                .eq('user_id', this.currentUser.id)
                .eq('usage_type', 'ai_responses')
                .gte('reset_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

            if (usageError) {
                console.error('Error fetching AI response usage:', usageError);
                return { allowed: false, reason: 'error' };
            }

            const currentUsage = usage?.reduce((sum, item) => sum + item.usage_count, 0) || 0;
            const maxAIResponses = this.getSubscriptionFeatures().max_ai_responses || 0;

            return { 
                allowed: currentUsage < maxAIResponses, 
                reason: currentUsage < maxAIResponses ? 'allowed' : 'limit_reached',
                currentUsage,
                maxUsage: maxAIResponses
            };
        } catch (error) {
            console.error('Error checking AI response limits:', error);
            return { allowed: false, reason: 'error' };
        }
    }

    async trackUsage(usageType, count = 1) {
        if (!this.hasActiveSubscription()) {
            console.log('No active subscription, skipping usage tracking');
            return;
        }

        try {
            console.log(`Tracking usage: ${usageType} +${count}`);
            
            // Get current month's usage record
            const currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            
            const { data: existingUsage, error: fetchError } = await supabaseClient
                .from('subscription_usage')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .eq('usage_type', usageType)
                .gte('reset_date', currentMonth.toISOString())
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') {
                console.error('Error fetching existing usage:', fetchError);
                return;
            }

            if (existingUsage) {
                // Update existing usage
                const { error: updateError } = await supabaseClient
                    .from('subscription_usage')
                    .update({ 
                        usage_count: existingUsage.usage_count + count,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingUsage.id);

                if (updateError) {
                    console.error('Error updating usage:', updateError);
                } else {
                    console.log(`Updated usage: ${usageType} = ${existingUsage.usage_count + count}`);
                }
            } else {
                // Create new usage record
                const { error: insertError } = await supabaseClient
                    .from('subscription_usage')
                    .insert({
                        user_id: this.currentUser.id,
                        usage_type: usageType,
                        usage_count: count,
                        reset_date: currentMonth.toISOString(),
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });

                if (insertError) {
                    console.error('Error creating usage record:', insertError);
                } else {
                    console.log(`Created usage record: ${usageType} = ${count}`);
                }
            }

            // Refresh limits display after tracking
            this.updateLimitsDisplay();
            this.updateSettingsLimitsDisplay();

        } catch (error) {
            console.error('Error tracking usage:', error);
        }
    }

    getUpgradeUrl(currentPlan = null) {
        const baseUrl = 'https://www.checkout-ds24.com/upgrade/13809-2qUXXN8CJg9P/';
        
        if (!currentPlan) {
            currentPlan = this.getSubscriptionPlan();
        }

        switch (currentPlan) {
            case 'starter':
                return baseUrl + '1322890'; // Upgrade to Pro
            case 'pro':
                return baseUrl + '1322889'; // Upgrade to Enterprise
            default:
                return baseUrl + '643746'; // Default to Starter
        }
    }

    getPlanLimits() {
        if (!this.hasActiveSubscription()) {
            return {
                campaigns: 0,
                refreshesPerCampaign: 0,
                refreshesPerMonth: 0,
                features: {}
            };
        }

        return {
            campaigns: this.subscriptionLimits.maxCampaigns,
            refreshesPerCampaign: this.subscriptionLimits.maxRefreshesPerCampaign,
            refreshesPerMonth: this.subscriptionLimits.maxRefreshesPerMonth,
            features: this.subscriptionLimits.features
        };
    }

    getPlanDisplayName() {
        if (!this.hasActiveSubscription()) {
            return 'No Subscription';
        }

        const planNames = {
            'starter': 'Starter',
            'pro': 'Pro',
            'enterprise': 'Enterprise'
        };

        return planNames[this.currentSubscription.plan_code] || 'Unknown Plan';
    }

    getUserInitials() {
        if (!this.currentUser || !this.currentUser.email) {
            return 'U';
        }

        // Try to get name from user metadata or email
        const fullName = this.currentUser.user_metadata?.full_name || 
                        this.currentUser.user_metadata?.name || 
                        this.currentUser.email.split('@')[0];
        
        if (fullName && fullName !== this.currentUser.email.split('@')[0]) {
            // If we have a real name, use first two letters
            const nameParts = fullName.trim().split(' ');
            if (nameParts.length >= 2) {
                return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
            } else {
                return fullName.substring(0, 2).toUpperCase();
            }
        } else {
            // Fallback to first two letters of email username
            const emailUsername = this.currentUser.email.split('@')[0];
            return emailUsername.substring(0, 2).toUpperCase();
        }
    }

    showPaywall(reason = 'no_subscription') {
        // Create and show paywall overlay
        const paywallHTML = this.createPaywallHTML(reason);
        
        // Remove existing paywall if any
        const existingPaywall = document.getElementById('subscription-paywall');
        if (existingPaywall) {
            existingPaywall.remove();
        }

        // Add paywall to body
        document.body.insertAdjacentHTML('beforeend', paywallHTML);
        
        // Add event listeners
        this.attachPaywallEventListeners();
        
        // Show dev skip button in development
        this.showDevSkipButton();
    }

    createPaywallHTML(reason) {
        const reasonMessages = {
            'no_subscription': 'You need an active subscription to use this feature.',
            'limit_reached': 'You\'ve reached your plan limits. Upgrade to continue.',
            'campaign_limit': 'You\'ve reached your campaign limit. Upgrade to create more campaigns.',
            'refresh_limit': 'You\'ve reached your refresh limit. Upgrade to refresh more campaigns.'
        };

        // Get user initials for profile picture
        const userInitials = this.getUserInitials();

        return `
            <div id="subscription-paywall" class="paywall-overlay">
                <div class="paywall-content">
                    <div class="paywall-header">
                        <div class="paywall-user-info">
                            <div class="paywall-profile-picture">
                                <span class="profile-initials">${userInitials}</span>
                            </div>
                            <div class="paywall-user-details">
                                <h2><i class="fas fa-crown"></i> Subscription Required</h2>
                                <p>${reasonMessages[reason] || reasonMessages['no_subscription']}</p>
                            </div>
                        </div>
                        <button class="paywall-expand-btn" id="paywall-expand-btn">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    </div>
                    
                    <div class="paywall-expandable-section" id="paywall-expandable-section" style="display: none;">
                        <div class="paywall-user-actions">
                            <button class="paywall-action-btn" id="export-data-btn">
                                <i class="fas fa-download"></i>
                                Export Data
                            </button>
                            <button class="paywall-action-btn danger" id="delete-account-btn">
                                <i class="fas fa-trash"></i>
                                Delete Account
                            </button>
                        </div>
                    </div>
                    
                    <div class="paywall-plans">
                        <div class="plan-card">
                            <div class="plan-header">
                                <h3>Starter</h3>
                                <div class="plan-price">
                                    <span class="currency">€</span>
                                    <span class="amount">9</span>
                                    <span class="period">/month</span>
                                </div>
                            </div>
                            <div class="plan-features">
                                <ul>
                                    <li><i class="fas fa-check"></i> 1 Campaign</li>
                                    <li><i class="fas fa-check"></i> 10 Refreshes per month</li>
                                    <li><i class="fas fa-check"></i> 100 AI Responses</li>
                                    <li><i class="fas fa-check"></i> Up to 10 Keywords</li>
                                </ul>
                            </div>
                            <button class="plan-button" data-plan="starter">
                                Start 7 days free trial
                            </button>
                        </div>
                        
                        <div class="plan-card featured">
                            <div class="plan-header">
                                <h3>Pro</h3>
                                <div class="plan-price">
                                    <span class="currency">€</span>
                                    <span class="amount">19</span>
                                    <span class="period">/month</span>
                                </div>
                            </div>
                            <div class="plan-features">
                                <ul>
                                    <li><i class="fas fa-check"></i> 5 Campaigns</li>
                                    <li><i class="fas fa-check"></i> 10 Refreshes per campaign</li>
                                    <li><i class="fas fa-check"></i> 500 AI Responses</li>
                                    <li><i class="fas fa-check"></i> Up to 10 Keywords</li>
                                </ul>
                            </div>
                            <button class="plan-button primary" data-plan="pro">
                                Start 7 days free trial
                            </button>
                        </div>
                        
                        <div class="plan-card">
                            <div class="plan-header">
                                <h3>Enterprise</h3>
                                <div class="plan-price">
                                    <span class="currency">€</span>
                                    <span class="amount">49</span>
                                    <span class="period">/month</span>
                                </div>
                            </div>
                            <div class="plan-features">
                                <ul>
                                    <li><i class="fas fa-check"></i> 10 Campaigns</li>
                                    <li><i class="fas fa-check"></i> 10 Refreshes per campaign</li>
                                    <li><i class="fas fa-check"></i> 2000 AI Responses</li>
                                    <li><i class="fas fa-check"></i> Up to 10 Keywords</li>
                                </ul>
                            </div>
                            <button class="plan-button" data-plan="enterprise">
                                Start 7 days free trial
                            </button>
                        </div>
                    </div>
                    
                    <div class="paywall-footer">
                        <button class="paywall-close" id="paywall-close">
                            <i class="fas fa-times"></i>
                            Maybe Later
                        </button>
                        <button class="dev-skip-btn" id="dev-skip-btn" style="display: none;">
                            <i class="fas fa-code"></i>
                            Dev Skip Paywall
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    attachPaywallEventListeners() {
        // Close button
        const closeBtn = document.getElementById('paywall-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hidePaywall();
            });
        }

        // Expand/collapse button
        const expandBtn = document.getElementById('paywall-expand-btn');
        const expandableSection = document.getElementById('paywall-expandable-section');
        if (expandBtn && expandableSection) {
            expandBtn.addEventListener('click', () => {
                const isExpanded = expandableSection.style.display !== 'none';
                if (isExpanded) {
                    expandableSection.style.display = 'none';
                    expandBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
                } else {
                    expandableSection.style.display = 'block';
                    expandBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
                }
            });
        }

        // Export data button
        const exportBtn = document.getElementById('export-data-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportUserData();
            });
        }

        // Delete account button
        const deleteBtn = document.getElementById('delete-account-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.deleteUserAccount();
            });
        }

        // Dev skip button
        const devSkipBtn = document.getElementById('dev-skip-btn');
        if (devSkipBtn) {
            devSkipBtn.addEventListener('click', () => {
                this.devSkipPaywall();
            });
        }

        // Plan selection buttons
        const planButtons = document.querySelectorAll('.plan-button');
        planButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const plan = e.target.getAttribute('data-plan');
                this.selectPlan(plan);
            });
        });

        // Close on overlay click
        const overlay = document.getElementById('subscription-paywall');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.hidePaywall();
                }
            });
        }
    }

    selectPlan(plan) {
        const productIds = {
            'starter': '643746',
            'pro': '643752',
            'enterprise': '643754'
        };

        const productId = productIds[plan];
        if (!productId) {
            console.error('Invalid plan selected:', plan);
            return;
        }

        // Redirect to Digistore24 checkout
        const checkoutUrl = `https://www.checkout-ds24.com/checkout/${productId}`;
        window.location.href = checkoutUrl;
    }

    hidePaywall() {
        const paywall = document.getElementById('subscription-paywall');
        if (paywall) {
            paywall.remove();
        }
    }

    showDevSkipButton() {
        // Show dev skip button in development (localhost or dev environment)
        const isDevelopment = window.location.hostname === 'localhost' || 
                             window.location.hostname === '127.0.0.1' ||
                             window.location.hostname.includes('vercel.app') ||
                             window.location.search.includes('dev=true');
        
        const devSkipBtn = document.getElementById('dev-skip-btn');
        if (devSkipBtn && isDevelopment) {
            devSkipBtn.style.display = 'inline-flex';
        }
    }

    async devSkipPaywall() {
        try {
            console.log('Dev Skip Paywall activated');
            
            // Hide paywall
            this.hidePaywall();
            
            // Show notification
            if (window.showNotification) {
                window.showNotification('Dev mode: Paywall skipped', 'info');
            }
            
            // Reload subscription status
            await this.loadUserSubscription();
            this.updateUI();
            
        } catch (error) {
            console.error('Error in dev skip paywall:', error);
        }
    }

    async checkAndEnforceLimits(action, campaignId = null) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (!this.hasActiveSubscription()) {
            this.showPaywall('no_subscription');
            return false;
        }

        let canProceed = false;
        let reason = '';

        switch (action) {
            case 'create_campaign':
                const campaignCheck = await this.canCreateCampaign();
                canProceed = campaignCheck.allowed;
                reason = campaignCheck.reason;
                break;
                
            case 'refresh_campaign':
                if (!campaignId) {
                    console.error('Campaign ID required for refresh check');
                    return false;
                }
                const refreshCheck = await this.canRefreshCampaign(campaignId);
                canProceed = refreshCheck.allowed;
                reason = refreshCheck.reason;
                break;
                
            case 'ai_response':
                const aiCheck = await this.canGenerateAIResponse();
                canProceed = aiCheck.allowed;
                reason = aiCheck.reason;
                break;
                
            default:
                console.error('Unknown action:', action);
                return false;
        }

        if (!canProceed) {
            if (reason === 'limit_reached') {
                this.showPaywall('limit_reached');
            } else {
                this.showPaywall(reason);
            }
            return false;
        }

        return true;
    }

    // Method to update UI based on subscription status
    updateUI() {
        // Update sidebar user info
        const userRoleElement = document.querySelector('.user-role');
        if (userRoleElement) {
            userRoleElement.textContent = this.getPlanDisplayName();
        }

        // Update settings page subscription info
        this.updateSettingsPage();
        
        // Update limits display
        this.updateLimitsDisplay();
        
        // Update settings limits display
        this.updateSettingsLimitsDisplay();
    }

    updateSettingsPage() {
        const planNameElement = document.getElementById('current-plan-name');
        const planPriceElement = document.getElementById('plan-price');
        const planPeriodElement = document.getElementById('plan-period');
        const planStatusElement = document.getElementById('plan-status');

        if (planNameElement) {
            planNameElement.textContent = this.getPlanDisplayName();
        }

        if (this.hasActiveSubscription()) {
            const prices = {
                'starter': '9',
                'pro': '19',
                'enterprise': '49'
            };
            
            if (planPriceElement) {
                planPriceElement.textContent = `€${prices[this.currentSubscription.plan_code] || '0'}`;
            }
            
            if (planPeriodElement) {
                planPeriodElement.textContent = '/month';
            }
            
            if (planStatusElement) {
                planStatusElement.innerHTML = '<i class="fas fa-check"></i> Active';
                planStatusElement.className = 'status-badge active';
            }
        } else {
            if (planPriceElement) {
                planPriceElement.textContent = '€0';
            }
            
            if (planPeriodElement) {
                planPeriodElement.textContent = '/month';
            }
            
            if (planStatusElement) {
                planStatusElement.innerHTML = '<i class="fas fa-times"></i> No Subscription';
                planStatusElement.className = 'status-badge inactive';
            }
        }
    }

    async updateLimitsDisplay() {
        const limitsContainer = document.getElementById('subscription-limits');
        const sidebarPlanName = document.getElementById('sidebar-plan-name');
        const upgradeBtn = document.getElementById('sidebar-upgrade-btn');
        
        if (!limitsContainer) return;

        // Update sidebar plan name
        if (sidebarPlanName) {
            sidebarPlanName.textContent = this.getPlanDisplayName();
        }

        if (!this.hasActiveSubscription()) {
            limitsContainer.style.display = 'none';
            return;
        }

        // Show limits container
        limitsContainer.style.display = 'block';

        try {
            // Get current usage
            const usage = await this.getCurrentUsage();
            const limits = this.getPlanLimits();

            // Update campaigns usage
            const campaignsUsage = document.getElementById('campaigns-usage');
            const campaignsProgress = document.getElementById('campaigns-progress');
            
            if (campaignsUsage && campaignsProgress) {
                const campaignsUsed = usage.campaigns || 0;
                const campaignsMax = limits.campaigns;
                const campaignsPercent = Math.min((campaignsUsed / campaignsMax) * 100, 100);
                
                campaignsUsage.textContent = `${campaignsUsed}/${campaignsMax}`;
                campaignsProgress.style.width = `${campaignsPercent}%`;
                
                // Update progress bar color based on usage
                campaignsProgress.className = 'limit-progress';
                if (campaignsPercent >= 90) {
                    campaignsProgress.classList.add('danger');
                } else if (campaignsPercent >= 70) {
                    campaignsProgress.classList.add('warning');
                }
            }

            // Update refreshes usage
            const refreshesUsage = document.getElementById('refreshes-usage');
            const refreshesProgress = document.getElementById('refreshes-progress');
            
            if (refreshesUsage && refreshesProgress) {
                const refreshesUsed = usage.refreshes || 0;
                const refreshesMax = limits.refreshesPerMonth;
                const refreshesPercent = Math.min((refreshesUsed / refreshesMax) * 100, 100);
                
                refreshesUsage.textContent = `${refreshesUsed}/${refreshesMax}`;
                refreshesProgress.style.width = `${refreshesPercent}%`;
                
                // Update progress bar color based on usage
                refreshesProgress.className = 'limit-progress';
                if (refreshesPercent >= 90) {
                    refreshesProgress.classList.add('danger');
                } else if (refreshesPercent >= 70) {
                    refreshesProgress.classList.add('warning');
                }
            }

            // Update AI responses usage
            const aiResponsesUsage = document.getElementById('ai-responses-usage');
            const aiResponsesProgress = document.getElementById('ai-responses-progress');
            
            if (aiResponsesUsage && aiResponsesProgress) {
                const aiResponsesUsed = usage.aiResponses || 0;
                const aiResponsesMax = this.getSubscriptionFeatures().max_ai_responses || 0;
                const aiResponsesPercent = aiResponsesMax > 0 ? Math.min((aiResponsesUsed / aiResponsesMax) * 100, 100) : 0;
                
                aiResponsesUsage.textContent = `${aiResponsesUsed}/${aiResponsesMax}`;
                aiResponsesProgress.style.width = `${aiResponsesPercent}%`;
                
                // Update progress bar color based on usage
                aiResponsesProgress.className = 'limit-progress';
                if (aiResponsesPercent >= 90) {
                    aiResponsesProgress.classList.add('danger');
                } else if (aiResponsesPercent >= 70) {
                    aiResponsesProgress.classList.add('warning');
                }
            }

            // Show/hide upgrade button
            if (upgradeBtn) {
                const currentPlan = this.getSubscriptionPlan();
                if (currentPlan !== 'enterprise') {
                    upgradeBtn.style.display = 'flex';
                    upgradeBtn.onclick = () => this.handleUpgrade();
                } else {
                    upgradeBtn.style.display = 'none';
                }
            }

        } catch (error) {
            console.error('Error updating limits display:', error);
        }
    }

    async getCurrentUsage() {
        if (!this.currentUser) {
            return { campaigns: 0, refreshes: 0, aiResponses: 0 };
        }

        try {
            // Get current campaign count
            const { data: campaigns, error: campaignsError } = await supabaseClient
                .from('campaigns')
                .select('id')
                .eq('user_id', this.currentUser.id)
                .eq('status', 'active');

            if (campaignsError) {
                console.error('Error fetching campaigns:', campaignsError);
            }

            // Get current month's refresh count
            const { data: refreshesUsage, error: refreshesError } = await supabaseClient
                .from('subscription_usage')
                .select('usage_count')
                .eq('user_id', this.currentUser.id)
                .eq('usage_type', 'refreshes')
                .gte('reset_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

            if (refreshesError) {
                console.error('Error fetching refreshes usage:', refreshesError);
            }

            // Get current month's AI responses count
            const { data: aiResponsesUsage, error: aiResponsesError } = await supabaseClient
                .from('subscription_usage')
                .select('usage_count')
                .eq('user_id', this.currentUser.id)
                .eq('usage_type', 'ai_responses')
                .gte('reset_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

            if (aiResponsesError) {
                console.error('Error fetching AI responses usage:', aiResponsesError);
            }

            return {
                campaigns: campaigns?.length || 0,
                refreshes: refreshesUsage?.reduce((sum, item) => sum + item.usage_count, 0) || 0,
                aiResponses: aiResponsesUsage?.reduce((sum, item) => sum + item.usage_count, 0) || 0
            };
        } catch (error) {
            console.error('Error getting current usage:', error);
            return { campaigns: 0, refreshes: 0, aiResponses: 0 };
        }
    }

    async updateSettingsLimitsDisplay() {
        const limitsContainer = document.getElementById('usage-limits');
        
        if (!limitsContainer) return;

        if (!this.hasActiveSubscription()) {
            limitsContainer.style.display = 'none';
            return;
        }

        // Show limits container
        limitsContainer.style.display = 'block';

        try {
            // Get current usage
            const usage = await this.getCurrentUsage();
            const limits = this.getPlanLimits();

            // Update campaigns usage in settings
            const campaignsUsage = document.getElementById('settings-campaigns-usage');
            const campaignsProgress = document.getElementById('settings-campaigns-progress');
            
            if (campaignsUsage && campaignsProgress) {
                const campaignsUsed = usage.campaigns || 0;
                const campaignsMax = limits.campaigns;
                const campaignsPercent = Math.min((campaignsUsed / campaignsMax) * 100, 100);
                
                campaignsUsage.textContent = `${campaignsUsed}/${campaignsMax}`;
                campaignsProgress.style.width = `${campaignsPercent}%`;
                
                // Update progress bar color based on usage
                campaignsProgress.className = 'limit-progress';
                if (campaignsPercent >= 90) {
                    campaignsProgress.classList.add('danger');
                } else if (campaignsPercent >= 70) {
                    campaignsProgress.classList.add('warning');
                }
            }

            // Update refreshes usage in settings
            const refreshesUsage = document.getElementById('settings-refreshes-usage');
            const refreshesProgress = document.getElementById('settings-refreshes-progress');
            
            if (refreshesUsage && refreshesProgress) {
                const refreshesUsed = usage.refreshes || 0;
                const refreshesMax = limits.refreshesPerMonth;
                const refreshesPercent = Math.min((refreshesUsed / refreshesMax) * 100, 100);
                
                refreshesUsage.textContent = `${refreshesUsed}/${refreshesMax}`;
                refreshesProgress.style.width = `${refreshesPercent}%`;
                
                // Update progress bar color based on usage
                refreshesProgress.className = 'limit-progress';
                if (refreshesPercent >= 90) {
                    refreshesProgress.classList.add('danger');
                } else if (refreshesPercent >= 70) {
                    refreshesProgress.classList.add('warning');
                }
            }

            // Update AI responses usage in settings
            const aiResponsesUsage = document.getElementById('settings-ai-responses-usage');
            const aiResponsesProgress = document.getElementById('settings-ai-responses-progress');
            
            if (aiResponsesUsage && aiResponsesProgress) {
                const aiResponsesUsed = usage.aiResponses || 0;
                const aiResponsesMax = this.getSubscriptionFeatures().max_ai_responses || 0;
                const aiResponsesPercent = aiResponsesMax > 0 ? Math.min((aiResponsesUsed / aiResponsesMax) * 100, 100) : 0;
                
                aiResponsesUsage.textContent = `${aiResponsesUsed}/${aiResponsesMax}`;
                aiResponsesProgress.style.width = `${aiResponsesPercent}%`;
                
                // Update progress bar color based on usage
                aiResponsesProgress.className = 'limit-progress';
                if (aiResponsesPercent >= 90) {
                    aiResponsesProgress.classList.add('danger');
                } else if (aiResponsesPercent >= 70) {
                    aiResponsesProgress.classList.add('warning');
                }
            }

        } catch (error) {
            console.error('Error updating settings limits display:', error);
        }
    }

    handleUpgrade() {
        const upgradeUrl = this.getUpgradeUrl();
        if (upgradeUrl) {
            window.open(upgradeUrl, '_blank');
        }
    }

    async exportUserData() {
        try {
            if (!this.currentUser) {
                throw new Error('No user logged in');
            }

            // Show loading state
            const exportBtn = document.getElementById('export-data-btn');
            if (exportBtn) {
                exportBtn.disabled = true;
                exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
            }

            // Collect user data
            const userData = {
                user: {
                    id: this.currentUser.id,
                    email: this.currentUser.email,
                    created_at: this.currentUser.created_at,
                    user_metadata: this.currentUser.user_metadata
                },
                subscription: this.currentSubscription,
                limits: this.subscriptionLimits,
                export_date: new Date().toISOString()
            };

            // Get campaigns data
            try {
                const { data: campaigns, error: campaignsError } = await supabaseClient
                    .from('campaigns')
                    .select('*')
                    .eq('user_id', this.currentUser.id);
                
                if (!campaignsError) {
                    userData.campaigns = campaigns;
                }
            } catch (error) {
                console.error('Error fetching campaigns:', error);
            }

            // Get posts data
            try {
                const { data: posts, error: postsError } = await supabaseClient
                    .from('posts')
                    .select('*')
                    .eq('user_id', this.currentUser.id);
                
                if (!postsError) {
                    userData.posts = posts;
                }
            } catch (error) {
                console.error('Error fetching posts:', error);
            }

            // Get usage data
            try {
                const { data: usage, error: usageError } = await supabaseClient
                    .from('subscription_usage')
                    .select('*')
                    .eq('user_id', this.currentUser.id);
                
                if (!usageError) {
                    userData.usage = usage;
                }
            } catch (error) {
                console.error('Error fetching usage:', error);
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

            // Reset button
            if (exportBtn) {
                exportBtn.disabled = false;
                exportBtn.innerHTML = '<i class="fas fa-download"></i> Export Data';
            }

            // Show success notification
            this.showNotification('Data exported successfully!', 'success');

        } catch (error) {
            console.error('Error exporting data:', error);
            
            // Reset button
            const exportBtn = document.getElementById('export-data-btn');
            if (exportBtn) {
                exportBtn.disabled = false;
                exportBtn.innerHTML = '<i class="fas fa-download"></i> Export Data';
            }

            this.showNotification('Error exporting data: ' + error.message, 'error');
        }
    }

    async deleteUserAccount() {
        try {
            if (!this.currentUser) {
                throw new Error('No user logged in');
            }

            // Show confirmation dialog
            const confirmed = confirm(
                'Are you sure you want to delete your account? This action cannot be undone.\n\n' +
                'This will permanently delete:\n' +
                '- Your account and profile\n' +
                '- All campaigns and posts\n' +
                '- All subscription data\n' +
                '- All usage history\n\n' +
                'Type "DELETE" to confirm:'
            );

            if (!confirmed) {
                return;
            }

            // Show loading state
            const deleteBtn = document.getElementById('delete-account-btn');
            if (deleteBtn) {
                deleteBtn.disabled = true;
                deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
            }

            // Delete user data from Supabase
            const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(this.currentUser.id);
            
            if (deleteError) {
                throw new Error('Failed to delete user: ' + deleteError.message);
            }

            // Show success message and redirect
            this.showNotification('Account deleted successfully. Redirecting to login...', 'success');
            
            // Redirect to login page after a short delay
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 2000);

        } catch (error) {
            console.error('Error deleting account:', error);
            
            // Reset button
            const deleteBtn = document.getElementById('delete-account-btn');
            if (deleteBtn) {
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete Account';
            }

            this.showNotification('Error deleting account: ' + error.message, 'error');
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Show notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // Remove notification after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }
}

// Create global instance
window.subscriptionManager = new SubscriptionManager();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    if (window.subscriptionManager) {
        await window.subscriptionManager.initialize();
        window.subscriptionManager.updateUI();
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SubscriptionManager;
}
