// activity-tracking.js - Enhanced with Full Name support
// Remove duplicate API_URL declaration

class ActivityTracker {
    constructor() {
        this.initialized = false;
    }

    initialize() {
        if (this.initialized) return;
        
        // Only track if logged in
        if (localStorage.getItem('loggedIn') !== 'true') return;
        
        // Log initial page view
        this.logActivity(`Viewed ${document.title}`);
        
        // Track interactions
        this.setupInteractionTracking();
        
        // Keep session alive
        this.setupSessionKeepAlive();
        
        this.initialized = true;
    }

    // Get actor with Full Name
    getActor() {
        return localStorage.getItem('staffName') || 
               localStorage.getItem('username') || 
               'Unknown';
    }

    // Log activity
    async logActivity(action) {
        const username = localStorage.getItem('username');
        const actor = this.getActor();
        
        if (!username || username === 'Unknown') return;
        
        try {
            const API_URL = window.API_URL || "https://script.google.com/macros/s/AKfycbx855bvwL5GABW5Xfmuytas3FbBikE1R44I7vNuhXNhfTly-MGMonkqPfeSngIt-7OMNA/exec";
            
            const formData = new FormData();
            formData.append('action', 'logActivity');
            formData.append('username', username);
            formData.append('actor', actor);
            formData.append('action', action);
            
            // Use fetch with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            await fetch(API_URL, {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
        } catch (error) {
            console.log('Activity logging failed:', error.message);
        }
    }

    setupInteractionTracking() {
        // Track form submissions
        document.querySelectorAll('form').forEach(form => {
            form.addEventListener('submit', () => {
                const formName = form.getAttribute('name') || form.id || 'Form';
                this.logActivity(`Submitted ${formName}`);
            });
        });

        // Track button clicks
        const importantButtons = ['#logoutBtn', '#saveBtn', '#submitBtn', '#deleteBtn'];
        importantButtons.forEach(selector => {
            document.querySelectorAll(selector).forEach(button => {
                button.addEventListener('click', () => {
                    const buttonText = button.textContent.trim() || 
                                      button.getAttribute('id') || 'Button';
                    this.logActivity(`Clicked ${buttonText}`);
                });
            });
        });
    }

    setupSessionKeepAlive() {
        // Log activity every 5 minutes
        setInterval(() => {
            if (localStorage.getItem('loggedIn') === 'true') {
                this.logActivity('Active Session');
            }
        }, 5 * 60 * 1000);
    }
}

// Create global instance
window.activityTracker = new ActivityTracker();

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
    window.activityTracker.initialize();
});
