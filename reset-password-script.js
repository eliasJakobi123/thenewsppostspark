// Reset Password Page JavaScript
// Use global supabaseClient from supabase-config.js

document.addEventListener('DOMContentLoaded', function() {
    initializeResetPassword();
});

function initializeResetPassword() {
    const resetForm = document.getElementById('reset-form');

    // Form submission
    if (resetForm) {
        resetForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleResetSubmit();
        });
    }

    // Real-time validation
    const inputs = resetForm?.querySelectorAll('input[required]');
    inputs?.forEach(input => {
        input.addEventListener('blur', function() {
            validateField(this);
        });

        input.addEventListener('input', function() {
            clearFieldError(this);
        });
    });
}

function handleResetSubmit() {
    const form = document.getElementById('reset-form');
    const formData = new FormData(form);
    
    // Clear all previous errors
    clearAllErrors();
    
    // Validate all fields
    let isValid = true;
    
    // Password validation
    const password = formData.get('password');
    if (!password || password.length < 8) {
        showFieldError('reset-password', 'Password must be at least 8 characters long');
        isValid = false;
    } else if (!isStrongPassword(password)) {
        showFieldError('reset-password', 'Password must contain at least one uppercase letter, one lowercase letter, and one number');
        isValid = false;
    }
    
    // Confirm password validation
    const confirmPassword = formData.get('confirmPassword');
    if (password !== confirmPassword) {
        showFieldError('reset-confirm-password', 'Passwords do not match');
        isValid = false;
    }
    
    if (isValid) {
        // Show loading state
        const submitBtn = document.querySelector('.simple-submit');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating Password...';
        submitBtn.disabled = true;
        
        // Update password with Supabase
        updatePassword(password, submitBtn, originalText);
    }
}

function validateField(field) {
    const value = field.value.trim();
    const fieldName = field.name;
    
    switch (fieldName) {
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
            const password = document.getElementById('reset-password').value;
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
    const errorInputs = document.querySelectorAll('.simple-input.error');
    
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

async function updatePassword(newPassword, submitBtn, originalText) {
    try {
        // Update password using Supabase Auth
        const { error } = await supabaseClient.auth.updateUser({
            password: newPassword
        });
        
        if (error) {
            throw error;
        }
        
        // Show success message
        showNotification('Password updated successfully! Redirecting to login...', 'success');
        
        // Clear the form
        document.getElementById('reset-password').value = '';
        document.getElementById('reset-confirm-password').value = '';
        
        // Redirect to login page after successful update
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 2000);
        
    } catch (error) {
        console.error('Password update error:', error);
        
        // Handle specific error cases
        if (error.message.includes('Password should be at least')) {
            showNotification('Password must be at least 6 characters long.', 'error');
        } else if (error.message.includes('Invalid password')) {
            showNotification('Password does not meet security requirements.', 'error');
        } else if (error.message.includes('session')) {
            showNotification('Reset link has expired. Please request a new one.', 'error');
        } else {
            showNotification(error.message || 'Failed to update password. Please try again.', 'error');
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








