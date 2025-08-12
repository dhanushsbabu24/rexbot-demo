// Staff Registration JavaScript
class StaffRegistration {
    constructor() {
        this.registerForm = document.getElementById('registerForm');
        this.registerError = document.getElementById('registerError');
        this.registerSuccess = document.getElementById('registerSuccess');
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.registerForm.addEventListener('submit', (e) => this.handleRegistration(e));
    }

    async handleRegistration(e) {
        e.preventDefault();
        
        // Get form data
        const formData = new FormData(this.registerForm);
        const data = {
            name: formData.get('name'),
            email: formData.get('email'),
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword'),
            department: formData.get('department'),
            role: 'staff'
        };
        
        // Validate form
        const validation = this.validateForm(data);
        if (!validation.isValid) {
            this.showError(validation.message);
            return;
        }
        
        // Show loading state
        this.setLoadingState(true);
        
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Registration failed');
            }
            
            // Show success message
            this.showSuccess('Registration successful! Redirecting to login...');
            
            // Redirect to login page after 2 seconds
            setTimeout(() => {
                window.location.href = '/staff';
            }, 2000);
            
        } catch (error) {
            console.error('Registration error:', error);
            this.showError(error.message || 'Registration failed. Please try again.');
        } finally {
            this.setLoadingState(false);
        }
    }

    validateForm(data) {
        // Check if all fields are filled
        if (!data.name || !data.email || !data.password || !data.confirmPassword || !data.department) {
            return {
                isValid: false,
                message: 'Please fill in all fields.'
            };
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            return {
                isValid: false,
                message: 'Please enter a valid email address.'
            };
        }
        
        // Validate password length
        if (data.password.length < 6) {
            return {
                isValid: false,
                message: 'Password must be at least 6 characters long.'
            };
        }
        
        // Check if passwords match
        if (data.password !== data.confirmPassword) {
            return {
                isValid: false,
                message: 'Passwords do not match.'
            };
        }
        
        // Validate department selection
        if (data.department === '') {
            return {
                isValid: false,
                message: 'Please select a department.'
            };
        }
        
        return { isValid: true };
    }

    setLoadingState(isLoading) {
        const submitButton = this.registerForm.querySelector('button[type="submit"]');
        const buttonText = submitButton.querySelector('span') || submitButton;
        
        if (isLoading) {
            submitButton.disabled = true;
            buttonText.innerHTML = '<div class="loading"></div> Registering...';
        } else {
            submitButton.disabled = false;
            buttonText.innerHTML = '<i class="fas fa-user-plus"></i> Register';
        }
    }

    showError(message) {
        this.registerError.textContent = message;
        this.registerError.style.display = 'block';
        this.registerSuccess.style.display = 'none';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.registerError.style.display = 'none';
        }, 5000);
    }

    showSuccess(message) {
        this.registerSuccess.textContent = message;
        this.registerSuccess.style.display = 'block';
        this.registerError.style.display = 'none';
    }
}

// Initialize registration when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new StaffRegistration();
});
