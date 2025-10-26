// Forgot Password Page JavaScript
// Use global supabaseClient from supabase-config.js

document.addEventListener('DOMContentLoaded', function() {
    initializeForgotPassword();
});

function initializeForgotPassword() {
    const resetForm = document.getElementById('reset-form');

    // Form submission
    if (resetForm) {
        resetForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleResetSubmit();
        });
    }

    // Real-time validation
    const emailInput = document.getElementById('reset-email');
    if (emailInput) {
        emailInput.addEventListener('blur', function() {
            validateEmailField(this);
        });

        emailInput.addEventListener('input', function() {
            clearFieldError(this);
        });
    }
}

function handleResetSubmit() {
    const form = document.getElementById('reset-form');
    const formData = new FormData(form);
    
    // Clear all previous errors
    clearAllErrors();
    
    // Validate email field
    const email = formData.get('email');
    if (!email || !isValidEmail(email)) {
        showFieldError('reset-email', 'Please enter a valid email address');
        return;
    }
    
    // Show loading state
    const submitBtn = document.querySelector('.simple-submit');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending Reset Link...';
    submitBtn.disabled = true;
    
    // Send password reset email
    sendPasswordResetEmail(email, submitBtn, originalText);
}

function validateEmailField(field) {
    const value = field.value.trim();
    
    if (!isValidEmail(value)) {
        showFieldError(field.id, 'Please enter a valid email address');
        return false;
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
    const errorInputs = document.querySelectorAll('.simple-input.error');
    
    errorMessages.forEach(error => {
        error.classList.remove('show');
        error.textContent = '';
    });
    
    errorInputs.forEach(input => {
        input.classList.remove('error');
    });
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

async function sendPasswordResetEmail(email, submitBtn, originalText) {
    try {
        // Send password reset email using Supabase Auth
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password.html`
        });
        
        if (error) {
            throw error;
        }
        
        // Show success message
        showNotification('Password reset link sent! Check your email inbox.', 'success');
        
        // Clear the form
        document.getElementById('reset-email').value = '';
        
        // Show additional instructions
        setTimeout(() => {
            showNotification('If you don\'t see the email, check your spam folder.', 'info');
        }, 2000);
        
    } catch (error) {
        console.error('Password reset error:', error);
        
        // Handle specific error cases
        if (error.message.includes('Invalid email')) {
            showNotification('Please enter a valid email address.', 'error');
        } else if (error.message.includes('rate limit')) {
            showNotification('Too many requests. Please wait a moment and try again.', 'error');
        } else {
            showNotification(error.message || 'Failed to send reset email. Please try again.', 'error');
        }
    } finally {
        // Reset button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
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
        max-width: 400px;
        word-wrap: break-word;
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 5000);
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

// Add smooth animations on page load
document.addEventListener('DOMContentLoaded', function() {
    // Animate marketing content
    const marketingContent = document.querySelector('.marketing-content');
    if (marketingContent) {
        marketingContent.style.opacity = '0';
        marketingContent.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
            marketingContent.style.transition = 'all 0.8s ease';
            marketingContent.style.opacity = '1';
            marketingContent.style.transform = 'translateY(0)';
        }, 200);
    }
    
    // Animate form
    const formContainer = document.querySelector('.form-container');
    if (formContainer) {
        formContainer.style.opacity = '0';
        formContainer.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
            formContainer.style.transition = 'all 0.8s ease';
            formContainer.style.opacity = '1';
            formContainer.style.transform = 'translateY(0)';
        }, 400);
    }
});

