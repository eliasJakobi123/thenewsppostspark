// Registration Page JavaScript
// Use global supabaseClient from supabase-config.js

document.addEventListener('DOMContentLoaded', function() {
    initializeRegistration();
});

function initializeRegistration() {
    const registrationForm = document.getElementById('registration-form');

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
    
    if (isValid) {
        // Show loading state
        const submitBtn = document.querySelector('.simple-submit');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
        submitBtn.disabled = true;
        
        // Register with Supabase
        registerUser(name, email, password, submitBtn, originalText);
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

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isStrongPassword(password) {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    
    return hasUpperCase && hasLowerCase && hasNumbers;
}

async function registerUser(name, email, password, submitBtn, originalText) {
    try {
        // Register user with Supabase Auth
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: name
                }
            }
        });
        
        if (error) {
            throw error;
        }
        
        if (data.user) {
            showNotification('Account created successfully! Please check your email to verify your account.', 'success');
            
            // Redirect to dashboard after successful registration
            setTimeout(() => {
                showNotification('Redirecting to your dashboard...', 'info');
                window.location.href = '/dashboard';
            }, 3000);
        }
        
    } catch (error) {
        console.error('Registration error:', error);
        showNotification(error.message || 'Registration failed. Please try again.', 'error');
    } finally {
        // Reset button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function showLoginForm() {
    showNotification('Login form would open here', 'info');
    // In a real app, this would show a login modal or redirect to login page
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
    
    // Remove after 4 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 4000);
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
    
    // Animate feature items
    const featureItems = document.querySelectorAll('.feature-item');
    featureItems.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateX(-20px)';
        
        setTimeout(() => {
            item.style.transition = 'all 0.6s ease';
            item.style.opacity = '1';
            item.style.transform = 'translateX(0)';
        }, 600 + (index * 100));
    });
});
