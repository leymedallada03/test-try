// coordination.js - Coordinates between different modules
class AppCoordinator {
    constructor() {
        this.modules = {
            dashboard: false,
            sessionManager: false,
            headerSession: false,
            activityTracking: false
        };
    }
    
    registerModule(moduleName) {
        this.modules[moduleName] = true;
        console.log(`Module registered: ${moduleName}`);
    }
    
    async initializeAll() {
        // Check if we have the minimum required modules
        if (!this.modules.sessionManager) {
            console.error("Session manager not loaded!");
            return false;
        }
        
        // Initialize in order
        if (this.modules.sessionManager) {
            await window.sessionManager.initialize();
        }
        
        if (this.modules.headerSession) {
            await window.headerSessionManager.initialize();
        }
        
        // Initialize dashboard last
        if (window.initializeDashboard) {
            await window.initializeDashboard();
        }
        
        return true;
    }
}

// Create global coordinator
window.appCoordinator = new AppCoordinator();
