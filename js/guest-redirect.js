// guest-redirect.js - Ensure guests only access dashboard

(function() {
    'use strict';
    
    // Run immediately
    enforceGuestRedirect();
    
    // Also run after DOM loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', enforceGuestRedirect);
    } else {
        enforceGuestRedirect();
    }
    
    function enforceGuestRedirect() {
        // Check if user is guest
        const isGuest = localStorage.getItem('isGuest') === 'true';
        
        if (!isGuest) return; // Not a guest, do nothing
        
        const currentPath = window.location.pathname;
        const currentFile = currentPath.split('/').pop() || 'dashboard.html';
        
        console.log('Guest redirect check - Current file:', currentFile);
        
        // List of allowed pages for guests (ONLY dashboard)
        const allowedPages = ['dashboard.html', 'index.html'];
        
        // If current page is not allowed, redirect to dashboard
        if (!allowedPages.includes(currentFile) && !currentFile.includes('dashboard')) {
            console.log('Guest trying to access restricted page:', currentFile);
            console.log('Redirecting to dashboard.html');
            
            // Show a quick message before redirect
            const msg = document.createElement('div');
            msg.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: #ff9800;
                color: white;
                text-align: center;
                padding: 10px;
                z-index: 9999;
                font-weight: bold;
            `;
            msg.textContent = 'Guests can only access the Dashboard. Redirecting...';
            document.body.appendChild(msg);
            
            // Redirect after a brief moment
            setTimeout(() => {
                window.location.replace('dashboard.html');
            }, 500);
        }
    }
})();