// common-utils.js - Common utility functions for all protected pages

/* FIXED: Ensure user role is properly set before UI updates */
function ensureUserRole() {
    // Get user role with fallback
    let role = localStorage.getItem('userRole');
    
    // If role is not set, try to get it from session manager
    if (!role && window.sessionManager && window.sessionManager.getSessionInfo) {
        const sessionInfo = window.sessionManager.getSessionInfo();
        role = sessionInfo.role;
        if (role) {
            localStorage.setItem('userRole', role);
        }
    }
    
    // If still no role, default to 'Staff'
    if (!role) {
        role = 'Staff';
        localStorage.setItem('userRole', role);
    }
    
    console.log("User role ensured:", role);
    return role;
}

/* Common UI update for admin status - uses CSS classes to prevent flash */
function updateAdminUI() {
    const role = localStorage.getItem('userRole') || 'Staff';
    const isAdmin = role.toLowerCase() === 'admin';
    
    console.log("Updating admin UI, role:", role, "isAdmin:", isAdmin);
    
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
        document.querySelectorAll('.admin-only').forEach(item => {
            if (isAdmin) {
                item.classList.add('admin-visible');
            } else {
                item.classList.remove('admin-visible');
            }
        });
    });
}

/* Setup auto-logout for inactivity - Common across all pages */
function setupAutoLogout() {
    let inactivityTimer;
    
    function resetTimer() {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
            // Show warning 1 minute before logout (29 minutes of inactivity)
            if (confirm("You've been inactive for 29 minutes. Click OK to stay logged in, or Cancel to logout.")) {
                resetTimer();
            } else {
                if (window.enhancedLogout) {
                    window.enhancedLogout();
                } else if (window.handleLogout) {
                    window.handleLogout(new Event('click'));
                }
            }
        }, 29 * 60 * 1000); // 29 minutes
    }
    
    // Reset timer on user activity
    ['click', 'keypress', 'mousemove', 'scroll'].forEach(event => {
        document.addEventListener(event, resetTimer);
    });
    
    // Start the timer
    resetTimer();
}

/* Make functions available globally */
window.ensureUserRole = ensureUserRole;
window.updateAdminUI = updateAdminUI;
window.setupAutoLogout = setupAutoLogout;

// Auto-run on DOM load for all protected pages
document.addEventListener('DOMContentLoaded', function() {
    // Only run on protected pages (not index.html)
    if (!window.location.pathname.includes('index.html')) {
        console.log("Common utils: Initializing...");
        
        // Ensure user role is set
        ensureUserRole();
        
        // Update admin UI with a small delay to ensure DOM is ready
        setTimeout(updateAdminUI, 50);
        
        // Setup auto-logout (if not already done by page-specific code)
        if (!window.autoLogoutSetup) {
            setupAutoLogout();
            window.autoLogoutSetup = true;
        }
    }
});

// Also update when page becomes visible
document.addEventListener('visibilitychange', function() {
    if (!document.hidden && !window.location.pathname.includes('index.html')) {
        setTimeout(updateAdminUI, 100);
    }
});
