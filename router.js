// Simple URL Router for PostSpark
class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.init();
    }

    init() {
        // Listen for URL changes
        window.addEventListener('popstate', (e) => {
            this.handleRoute();
        });

        // Handle initial route
        this.handleRoute();
    }

    // Add route
    addRoute(path, handler) {
        this.routes.set(path, handler);
    }

    // Navigate to route
    navigate(path, data = null) {
        if (path.startsWith('/')) {
            window.history.pushState(data, '', path);
        } else {
            window.history.pushState(data, '', '/' + path);
        }
        this.handleRoute();
    }

    // Handle current route
    handleRoute() {
        const path = window.location.pathname;
        const hash = window.location.hash.substring(1);
        
        // Handle hash-based routing (legacy support)
        if (hash) {
            this.handleHashRoute(hash);
            return;
        }

        // Handle path-based routing
        this.handlePathRoute(path);
        
        // If we're on webapp.html, try to extract route from path
        if (window.location.pathname === '/webapp.html' || window.location.pathname.endsWith('/webapp.html')) {
            // Try to get route from referrer or default to campaigns
            this.showPage('campaigns');
        }
    }

    // Handle hash routes (legacy)
    handleHashRoute(hash) {
        const routes = {
            'campaigns': () => this.showPage('campaigns'),
            'create-campaign': () => this.showPage('create-campaign'),
            'campaign-posts': () => this.showPage('campaign-posts'),
            'settings': () => this.showPage('settings')
        };

        if (routes[hash]) {
            routes[hash]();
        } else {
            this.showPage('campaigns'); // Default
        }
    }

    // Handle path routes
    handlePathRoute(path) {
        // Remove leading slash
        const cleanPath = path.startsWith('/') ? path.substring(1) : path;
        
        // Handle specific routes
        if (cleanPath === '' || cleanPath === 'home') {
            this.redirectToWebsite();
        } else if (cleanPath === 'dashboard') {
            this.showPage('campaigns');
        } else if (cleanPath === 'campaigns') {
            this.showPage('campaigns');
        } else if (cleanPath === 'create-campaign') {
            this.showPage('create-campaign');
        } else if (cleanPath === 'settings') {
            this.showPage('settings');
        } else if (cleanPath === 'login') {
            this.redirectToAuth('login');
        } else if (cleanPath === 'register') {
            this.redirectToAuth('register');
        } else if (cleanPath.startsWith('campaigns/')) {
            // Handle campaign-specific routes
            const campaignId = cleanPath.split('/')[1];
            this.showCampaignPosts(campaignId);
        } else if (cleanPath === 'webapp.html') {
            // Handle direct webapp.html access
            this.showPage('campaigns');
        } else {
            // Default to campaigns
            this.showPage('campaigns');
        }
    }

    // Show specific page
    showPage(pageId) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Show target page
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        // Update navigation
        this.updateNavigation(pageId);
    }

    // Show campaign posts
    showCampaignPosts(campaignId) {
        this.showPage('campaign-posts');
        
        // Load campaign posts if function exists
        if (typeof window.showCampaignPosts === 'function') {
            window.showCampaignPosts(campaignId);
        }
    }

    // Redirect to authentication pages
    redirectToAuth(page) {
        if (page === 'login') {
            window.location.href = 'login.html';
        } else if (page === 'register') {
            window.location.href = 'register.html';
        }
    }

    // Redirect to website
    redirectToWebsite() {
        window.location.href = '/home';
    }

    // Update navigation state
    updateNavigation(activePage) {
        // Update nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        // Activate current nav link
        const activeLink = document.querySelector(`[data-page="${activePage}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    // Get current route
    getCurrentRoute() {
        return window.location.pathname;
    }

    // Get route parameters
    getParams() {
        const path = window.location.pathname;
        const segments = path.split('/').filter(segment => segment);
        return segments;
    }
}

// Initialize router
const router = new Router();

// Export for global use
window.router = router;
