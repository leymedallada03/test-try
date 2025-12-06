// session-monitor.js - Add this to your dashboard.html
class SessionMonitor {
    constructor(apiUrl, checkInterval = 10000) {
        this.apiUrl = apiUrl;
        this.checkInterval = checkInterval;
        this.monitorInterval = null;
        this.lastRequestId = "none";
        this.username = localStorage.getItem("username") || "";
    }
    
    start() {
        if (!this.username) {
            console.error("No username found for session monitoring");
            return;
        }
        
        // Start monitoring
        this.monitorInterval = setInterval(() => this.checkSession(), this.checkInterval);
        
        // Also check when page becomes visible
        document.addEventListener("visibilitychange", () => {
            if (!document.hidden) {
                this.checkSession();
            }
        });
        
        // Initial check
        this.checkSession();
        
        console.log("Session monitoring started for user:", this.username);
    }
    
    stop() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
    }
    
    async checkSession() {
        try {
            const formData = new FormData();
            formData.append("action", "checkForLogout");
            formData.append("username", this.username);
            formData.append("clientRequestId", this.lastRequestId);
            
            const response = await fetch(this.apiUrl, {
                method: "POST",
                body: formData
            });
            
            const data = await response.json();
            
            if (data.needsLogout) {
                console.log("Session terminated by server");
                this.onSessionTerminated(data.message);
                return false;
            }
            
            // Update last request ID if provided
            if (data.requestId) {
                this.lastRequestId = data.requestId;
            }
            
            return true;
        } catch (error) {
            console.error("Session check failed:", error);
            return true; // Don't logout on network errors
        }
    }
    
    onSessionTerminated(message) {
        // Stop monitoring
        this.stop();
        
        // Show notification
        if (confirm(`${message}\n\nYou have been logged out from another device. Click OK to go to login page.`)) {
            this.logout();
        } else {
            this.logout();
        }
    }
    
    logout() {
        // Clear all storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Redirect to login
        window.location.href = "index.html";
    }
}

// Usage in dashboard.html:
// <script src="session-monitor.js"></script>
// <script>
// document.addEventListener('DOMContentLoaded', () => {
//     const monitor = new SessionMonitor(API_URL, 5000); // Check every 5 seconds
//     monitor.start();
// });
// </script>
