// Enhanced Activity Tracking with Full Name Support
const TRACKING_API_URL = "https://script.google.com/macros/s/AKfycbx855bvwL5GABW5Xfmuytas3FbBikE1R44I7vNuhXNhfTly-MGMonkqPfeSngIt-7OMNA/exec";

class ActivityTracker {
    constructor() {
        this.debounceTimers = {};
        this.initialized = false;
    }

    initialize() {
        if (this.initialized) return;
        
        // Log initial page view
        this.logActivity(`Viewed ${document.title}`);
        
        // Track user interactions
        this.setupInteractionTracking();
        
        // Track visibility changes
        this.setupVisibilityTracking();
        
        // Keep session alive
        this.setupSessionKeepAlive();
        
        this.initialized = true;
        console.log('Activity tracking initialized');
    }

    // Get actor (Full Name if available, otherwise Username)
    getActor() {
        return localStorage.getItem('staffName') || 
               localStorage.getItem('username') || 
               'Unknown';
    }

    // Get username
    getUsername() {
        return localStorage.getItem('username') || 'Unknown';
    }

    // Log activity to server
    async logActivity(action, details = '') {
        const username = this.getUsername();
        const actor = this.getActor();
        
        if (username === 'Unknown' || !localStorage.getItem('loggedIn')) {
            return; // Don't log if not logged in
        }
        
        try {
            const formData = new FormData();
            formData.append('action', 'logActivity');
            formData.append('username', username);
            formData.append('actor', actor);
            formData.append('action', action);
            if (details) {
                formData.append('details', details);
            }
            
            // Use fetch with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            await fetch(TRACKING_API_URL, {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
        } catch (error) {
            // Silently fail - don't interrupt user experience
            console.log('Activity logging failed (server unreachable)');
        }
    }

    // Setup interaction tracking
    setupInteractionTracking() {
        // Track form submissions
        document.querySelectorAll('form').forEach(form => {
            form.addEventListener('submit', () => {
                const formName = form.getAttribute('name') || form.id || 'Form';
                this.logActivity(`Submitted ${formName}`);
            });
        });

        // Track important button clicks
        const importantButtons = [
            '#logoutBtn', '#saveBtn', '#submitBtn', 
            '#deleteBtn', '#exportBtn', '#printBtn',
            '.delete-record', '.edit-record', '.save-record'
        ];
        
        importantButtons.forEach(selector => {
            document.querySelectorAll(selector).forEach(button => {
                button.addEventListener('click', () => {
                    const buttonText = button.textContent.trim() || 
                                      button.getAttribute('id') || 
                                      button.getAttribute('class') || 
                                      'Button';
                    this.logActivity(`Clicked ${buttonText}`);
                });
            });
        });

        // Track general interactions with debounce
        const debouncedLog = this.debounce(() => {
            this.logActivity('User Interaction');
        }, 30000); // 30 seconds debounce

        ['click', 'keydown', 'scroll'].forEach(eventType => {
            document.addEventListener(eventType, debouncedLog, { passive: true });
        });
    }

    // Setup visibility tracking
    setupVisibilityTracking() {
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.logActivity('Page Became Visible');
            }
        });
    }

    // Setup session keep-alive
    setupSessionKeepAlive() {
        // Log activity every 5 minutes
        setInterval(() => {
            if (localStorage.getItem('loggedIn') === 'true') {
                this.logActivity('Active Session');
            }
        }, 5 * 60 * 1000);
    }

    // Debounce helper
    debounce(func, wait) {
        return (...args) => {
            clearTimeout(this.debounceTimers[func]);
            this.debounceTimers[func] = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Enhanced logout with activity logging
    async enhancedLogout() {
        const actor = this.getActor();
        
        try {
            await this.logActivity('User Logout', `Logged out from ${window.location.pathname}`);
        } catch (error) {
            // Ignore errors on logout
        } finally {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = 'index.html?logout=true&t=' + Date.now();
        }
    }
}

// Create global instance
window.activityTracker = new ActivityTracker();

// Auto-initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('loggedIn') === 'true') {
        window.activityTracker.initialize();
    }
});

// Add logout button handler
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.activityTracker.enhancedLogout();
        });
    }
});
