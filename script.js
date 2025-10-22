// FAQ Toggle Functionality
document.addEventListener('DOMContentLoaded', function() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            // Close all other FAQ items
            faqItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                }
            });
            
            // Toggle current item
            if (isActive) {
                item.classList.remove('active');
            } else {
                item.classList.add('active');
            }
        });
    });
    
    // Registration Button Handlers
    initializeRegistrationButtons();
});

// Initialize registration button handlers
function initializeRegistrationButtons() {
    // Get Started buttons
    const navGetStarted = document.getElementById('nav-get-started');
    const heroStartTrial = document.getElementById('hero-start-trial');
    const pricingFreeGetStarted = document.getElementById('pricing-free-get-started');
    const pricingProChoose = document.getElementById('pricing-pro-choose');
    const pricingEnterpriseContact = document.getElementById('pricing-enterprise-contact');
    
    // Add click handlers
    if (navGetStarted) {
        navGetStarted.addEventListener('click', (e) => {
            e.preventDefault();
            redirectToRegistration();
        });
    }
    if (heroStartTrial) {
        // Hero button is already a link, no need to prevent default
        console.log('Hero button found:', heroStartTrial);
    }
    if (pricingFreeGetStarted) {
        pricingFreeGetStarted.addEventListener('click', (e) => {
            e.preventDefault();
            redirectToRegistration();
        });
    }
    if (pricingProChoose) {
        pricingProChoose.addEventListener('click', (e) => {
            e.preventDefault();
            redirectToRegistration();
        });
    }
    if (pricingEnterpriseContact) {
        pricingEnterpriseContact.addEventListener('click', (e) => {
            e.preventDefault();
            redirectToRegistration();
        });
    }
}

// Redirect to registration page
function redirectToRegistration() {
    // Redirect to register.html
    window.location.href = 'register.html';
}

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe elements for animation
document.addEventListener('DOMContentLoaded', function() {
    const animatedElements = document.querySelectorAll('.audience-card, .step, .stat-item, .pricing-card, .faq-item, .comparison-card');
    
    animatedElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
        observer.observe(el);
    });
    
    // Add staggered animation for comparison cards
    const comparisonCards = document.querySelectorAll('.comparison-card');
    comparisonCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.2}s`;
        card.classList.add('animate-in');
    });
});

// Parallax effect for hero section
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const heroVisual = document.querySelector('.hero-visual');
    
    if (heroVisual) {
        const rate = scrolled * -0.5;
        heroVisual.style.transform = `translateY(${rate}px)`;
    }
});

// Add floating animation to cards
document.addEventListener('DOMContentLoaded', function() {
    const floatingCards = document.querySelectorAll('.floating-card, .audience-card, .pricing-card');
    
    floatingCards.forEach((card, index) => {
        // Add random delay to create wave effect
        card.style.animationDelay = `${index * 0.1}s`;
    });
});

// Button hover effects
document.addEventListener('DOMContentLoaded', function() {
    const buttons = document.querySelectorAll('button');
    
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
});

// Subtle scroll-triggered animations
document.addEventListener('DOMContentLoaded', function() {
    // Remove typing effect for cleaner experience
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
        heroTitle.style.opacity = '1';
    }
});

// Subtle hover effects for orange elements
document.addEventListener('DOMContentLoaded', function() {
    const orangeElements = document.querySelectorAll('.card-icon, .step-number, .stat-number');
    
    orangeElements.forEach(element => {
        element.addEventListener('mouseenter', function() {
            this.style.boxShadow = '0 0 15px rgba(255, 107, 53, 0.3)';
        });
        
        element.addEventListener('mouseleave', function() {
            this.style.boxShadow = 'none';
        });
    });
});

// Add ripple effect to buttons
document.addEventListener('DOMContentLoaded', function() {
    const buttons = document.querySelectorAll('button');
    
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple');
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
});

// Case Studies Filter Functionality
document.addEventListener('DOMContentLoaded', function() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const caseStudyCards = document.querySelectorAll('.case-study-card');
    const quoteElement = document.querySelector('.case-study-quote p');
    
    // Quote texts for each category
    const quotes = {
        'b2b': "I need a CRM solution for our B2B SaaS company.",
        'health': "I'm looking for a meditation app with sleep tracking.",
        'sport': "I'm looking for a running app with GPS tracking.",
        'b2c': "I'm looking for a personal finance web app."
    };
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            
            // Get category from button text
            const buttonText = this.textContent.trim().toLowerCase();
            let category = '';
            
            if (buttonText.includes('b2b')) category = 'b2b';
            else if (buttonText.includes('health')) category = 'health';
            else if (buttonText.includes('sport')) category = 'sport';
            else if (buttonText.includes('b2c')) category = 'b2c';
            
            // Show/hide cards based on category
            caseStudyCards.forEach(card => {
                if (card.getAttribute('data-category') === category) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
            
            // Update quote
            if (quotes[category]) {
                quoteElement.textContent = quotes[category];
            }
        });
    });
});

// Simple animations for step cards
document.addEventListener('DOMContentLoaded', function() {
    const stepCards = document.querySelectorAll('.step-card');
    
    stepCards.forEach((card, index) => {
        // Simple fade-in animation
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = `all 0.3s ease ${index * 0.1}s`;
        
        // Add intersection observer for entrance animation
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, { threshold: 0.1 });
        
        observer.observe(card);
    });
});

// Add CSS for enhanced animations
const style = document.createElement('style');
style.textContent = `
    button {
        position: relative;
        overflow: hidden;
    }
    
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transform: scale(0);
        animation: ripple-animation 0.6s linear;
        pointer-events: none;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    .animate-in {
        animation: fadeInUp 0.6s ease-out forwards;
    }
    
    .pricing-card.featured {
        animation: subtleGlow 4s ease-in-out infinite;
    }
    
    @keyframes subtleGlow {
        0%, 100% {
            box-shadow: 0 20px 40px rgba(255, 107, 53, 0.15);
        }
        50% {
            box-shadow: 0 25px 45px rgba(255, 107, 53, 0.25);
        }
    }
    
    .float-animation {
        animation: float 3s ease-in-out infinite;
    }
    
    @keyframes float {
        0%, 100% {
            transform: translateY(0px);
        }
        50% {
            transform: translateY(-5px);
        }
    }
    
`;
document.head.appendChild(style);
