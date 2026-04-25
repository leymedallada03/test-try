// session-manager.js - Enhanced Session Manager with 30-minute inactivity timeout
// Features: 25-min warning modal, activity detection, heartbeat, single session
// Modal design matches login form style

class SessionManager {
    constructor() {
        this.inactivityTimer = null;
        this.warningTimer = null;
        this.heartbeatInterval = null;
        this.sessionCheckInterval = null;
        this.initialized = false;
        
        // Timeouts in milliseconds
        this.SESSION_TIMEOUT = 8 * 60 * 60 * 1000;      // 8 hours
        this.WARNING_TIMEOUT = 7.5 * 60 * 60 * 1000;    // 7.5 hours (warning 30 min before)
        this.HEARTBEAT_INTERVAL = 2 * 60 * 1000;        // 2 minutes
        this.SESSION_CHECK_INTERVAL = 30000;            // 30 seconds
        
        // Activity events to track
        this.activityEvents = [
            'click', 'mousedown', 'mousemove', 'keydown', 'keypress',
            'scroll', 'touchstart', 'touchmove', 'touchend', 'wheel'
        ];
        
        this.isWarningShowing = false;
        this.isExpiredShowing = false;
    }

    // ==================== INITIALIZATION ====================
    
    async initialize() {
        // Don't run on login page
        if (window.location.pathname.includes('index.html') || 
            window.location.pathname.includes('index')) {
            return;
        }
        
        if (this.initialized) return;
        
        console.log("Session Manager: Initializing with 8-hour inactivity timeout");
        
        // Set username immediately
        this.setUserNameImmediately();
        
        // Validate session
        const isValid = await this.validateSession();
        
        if (!isValid) {
            console.log("Session Manager: Invalid session, redirecting to login");
            this.showSessionExpiredMessage();
            return;
        }
        
        // Start all timers and monitoring
        this.startInactivityTimer();
        this.startHeartbeat();
        this.startSessionCheck();
        this.setupActivityMonitoring();
        this.setupVisibilityMonitoring();
        this.updateUI();
        this.forceGuestRestrictions();

        startForceLogoutMonitoring();
        
        this.initialized = true;
        console.log("Session Manager: Session active, monitoring started");
    }

    // ==================== TIMER MANAGEMENT ====================
    
    startInactivityTimer() {
        this.clearInactivityTimer();
        
        // Set main inactivity timer (30 minutes)
        this.inactivityTimer = setTimeout(() => {
            console.log("Session Manager: 30 minutes inactivity reached - expiring session");
            this.expireSession();
        }, this.SESSION_TIMEOUT);
        
        // Set warning timer (25 minutes)
        this.warningTimer = setTimeout(() => {
            console.log("Session Manager: 25 minutes inactivity - showing warning");
            this.showInactivityWarning();
        }, this.WARNING_TIMEOUT);
        
        console.log("Session Manager: Inactivity timers started (warning at 25min, expire at 30min)");
    }
    
    resetInactivityTimer() {
        if (!this.initialized) return;
        
        // Clear existing timers
        this.clearInactivityTimer();
        
        // Hide warning modal if showing
        if (this.isWarningShowing) {
            this.hideWarningModal();
        }
        
        // Start fresh timers
        this.startInactivityTimer();
        
        // Update heartbeat to show user is active
        this.sendHeartbeat();
        
        console.log("Session Manager: Inactivity timer reset due to user activity");
    }
    
    clearInactivityTimer() {
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
            this.inactivityTimer = null;
        }
        if (this.warningTimer) {
            clearTimeout(this.warningTimer);
            this.warningTimer = null;
        }
    }
    
    expireSession() {
        if (this.isExpiredShowing) return;
        
        // Clear all timers
        this.clearInactivityTimer();
        this.stopHeartbeat();
        this.stopSessionCheck();
        
        // Clear session data
        this.clearSession();
        
        // Show expired modal
        this.showSessionExpiredMessage();
    }

    // ==================== ACTIVITY MONITORING ====================
    
setupActivityMonitoring() {
    // Remove existing listeners to prevent duplicates
    if (this.activityEvents && this.boundResetTimer) {
        this.activityEvents.forEach(event => {
            document.removeEventListener(event, this.boundResetTimer);
        });
    }
    
    // FIXED: Removed 'mousemove' which was causing constant timer resets during scroll
    // Also removed 'mousedown' as it fires too frequently
    const activityEvents = ['click', 'keydown', 'scroll', 'touchstart', 'touchend'];
    
    // Create DEBOUNCED function - prevents rapid successive resets
    let lastResetTime = 0;
    const DEBOUNCE_MS = 2000; // Only reset every 2 seconds max
    
    this.boundResetTimer = () => {
        const now = Date.now();
        if (now - lastResetTime >= DEBOUNCE_MS) {
            lastResetTime = now;
            this.resetInactivityTimer();
        }
    };
    
    // Add event listeners
    activityEvents.forEach(event => {
        document.addEventListener(event, this.boundResetTimer, { passive: false });
    });
    
    // Store for cleanup
    this.activityEvents = activityEvents;
    
    console.log("Session Manager: Activity monitoring active (debounced, no mousemove)");
}
    
    setupVisibilityMonitoring() {
        // Reset timer when page becomes visible again (user returns to tab)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                console.log("Session Manager: Page became visible - resetting timer");
                this.resetInactivityTimer();
            }
        });
    }
    
    cleanupActivityMonitoring() {
        if (this.boundResetTimer) {
            this.activityEvents.forEach(event => {
                document.removeEventListener(event, this.boundResetTimer);
            });
        }
    }

    // ==================== HEARTBEAT SYSTEM ====================
    
    startHeartbeat() {
        this.stopHeartbeat();
        
        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat();
        }, this.HEARTBEAT_INTERVAL);
        
        console.log("Session Manager: Heartbeat started (every 5 minutes)");
    }
    
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
    
    async sendHeartbeat() {
        const username = localStorage.getItem('username');
        const sessionId = sessionStorage.getItem('sessionId');
        const isGuest = this.isGuest();
        
        if (!username || !sessionId) return;
        
        // Skip for guest users
        if (isGuest) return;
        
        try {
            const API_URL = window.API_URL || "https://script.google.com/macros/s/AKfycbytvSPndcz2Ou0Kz_XOUw6Ztlwx55ml2TsaEZFTdLYVCCVfOMwdRohgq_cOPPeluQMTCw/exec";
            
            const formData = new FormData();
            formData.append('action', 'heartbeat');
            formData.append('username', username);
            formData.append('sessionId', sessionId);
            
            await fetch(API_URL, {
                method: 'POST',
                body: formData
            });
            
            console.log("Session Manager: Heartbeat sent");
        } catch (error) {
            console.log("Session Manager: Heartbeat failed (non-critical)");
        }
    }
    
    // ==================== SESSION CHECK ====================
    
    startSessionCheck() {
        this.stopSessionCheck();
        
        this.sessionCheckInterval = setInterval(async () => {
            const isValid = await this.validateSession();
            if (!isValid) {
                console.log("Session Manager: Session check failed - expiring");
                this.expireSession();
            }
        }, this.SESSION_CHECK_INTERVAL);
        
        console.log("Session Manager: Session check started (every 30 seconds)");
    }
    
    stopSessionCheck() {
        if (this.sessionCheckInterval) {
            clearInterval(this.sessionCheckInterval);
            this.sessionCheckInterval = null;
        }
    }
    
async validateSession() {
    const loggedIn = localStorage.getItem('loggedIn');
    const username = localStorage.getItem('username');
    const sessionId = sessionStorage.getItem('sessionId');
    const loginTime = localStorage.getItem('loginTime');
    const isGuest = this.isGuest();
    
    console.log("Session Manager: Validating session", { 
        loggedIn, 
        username, 
        sessionId: sessionId ? sessionId.substring(0, 20) + '...' : null, 
        loginTime,
        isGuest 
    });
    
    if (loggedIn !== 'true' || !username || !sessionId || !loginTime) {
        console.log("Session Manager: Missing session data");
        return false;
    }
    
    const sessionAge = Date.now() - parseInt(loginTime);
    const sessionAgeMinutes = Math.floor(sessionAge / 60000);
    console.log(`Session Manager: Session age = ${sessionAgeMinutes} minutes (timeout: 480 minutes)`);
    
    if (sessionAge > this.SESSION_TIMEOUT) {
        console.log("Session Manager: Session expired locally (age > 8 hours)");
        try {
            const API_URL = window.API_URL || "https://script.google.com/macros/s/AKfycbytvSPndcz2Ou0Kz_XOUw6Ztlwx55ml2TsaEZFTdLYVCCVfOMwdRohgq_cOPPeluQMTCw/exec";
            const formData = new FormData();
            formData.append('action', 'forceLogout');
            formData.append('username', username);
            formData.append('actor', 'System');
            await fetch(API_URL, { method: 'POST', body: formData });
        } catch(e) { console.log("Could not notify server of local expiry", e); }
        return false;
    }
    
    if (isGuest) {
        console.log("Session Manager: Guest session, skipping server validation");
        localStorage.setItem('lastActivity', Date.now().toString());
        return true;
    }
    
    try {
        const API_URL = window.API_URL || "https://script.google.com/macros/s/AKfycbytvSPndcz2Ou0Kz_XOUw6Ztlwx55ml2TsaEZFTdLYVCCVfOMwdRohgq_cOPPeluQMTCw/exec";
        
        const formData = new FormData();
        formData.append('action', 'validateSession');
        formData.append('username', username);
        formData.append('sessionId', sessionId);
        
        console.log("Validating session with server...");
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const data = await response.json();
        
        console.log("Session validation response:", JSON.stringify(data));
        
        // Check if session is valid - handle different response formats
        let isValid = false;
        if (data.success === true && data.isLoggedIn === true) {
            isValid = true;
        } else if (data.success === true && data.isLoggedIn === "true") {
            isValid = true;
        } else if (data.success === true && data.message === "User is currently logged in") {
            isValid = true;
        }
        
        if (isValid) {
            // Update last activity timestamp
            localStorage.setItem('lastActivity', Date.now().toString());
            console.log("Session Manager: Session VALID on server");
            return true;
        } else {
            console.log("Session Manager: Server says session INVALID", data.message || data);
            return false;
        }
    } catch (error) {
        console.error("Session Manager: Validation network error", error);
        // On network error, assume session is valid to prevent premature logout
        return true;
    }
}

    // ==================== INACTIVITY WARNING MODAL (UNIFORM DESIGN) ====================
    
    showInactivityWarning() {
        if (this.isWarningShowing || this.isExpiredShowing) return;
        
        // Check if modal already exists
        let existingModal = document.getElementById('inactivityWarningModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        this.isWarningShowing = true;
        
        // Create modal overlay (same style as login form modals)
        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'inactivityWarningModal';
        modalOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(2px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000001;
            padding: 16px;
            animation: modalFadeIn 0.15s ease;
        `;

        // Create modal box (same style as login form modals)
        const modalBox = document.createElement('div');
        modalBox.style.cssText = `
            background: white;
            border-radius: 12px;
            max-width: 280px;
            width: 100%;
            box-shadow: 0 15px 30px rgba(0, 0, 0, 0.2);
            animation: modalSlideUp 0.2s ease;
            overflow: hidden;
        `;

        modalBox.innerHTML = `
            <div style="padding: 20px 20px 12px 20px; text-align: center;">
                <div style="margin-bottom: 8px;">
                    <i class="fas fa-hourglass-half" style="font-size: 1.6rem; color: #ff9800;"></i>
                </div>
                <h3 style="margin: 0 0 4px 0; color: #1e293b; font-size: 1rem; font-weight: 600;">
                    Session Expiring Soon
                </h3>
                <p style="margin: 0; color: #64748b; font-size: 0.8rem; line-height: 1.4;">
    You have been inactive for 7.5 hours. Your session will expire in 30 minutes.
</p>
            </div>
            <div style="display: flex; gap: 8px; padding: 4px 20px 20px 20px;">
                <button id="stayLoggedInBtn" style="
                    flex: 1;
                    padding: 6px 10px;
                    border-radius: 6px;
                    font-weight: 500;
                    font-size: 0.75rem;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 4px;
                    border: 1.5px solid #0f7a4a;
                    background: #0f7a4a;
                    color: white;
                    transition: all 0.15s ease;
                ">
                    <i class="fas fa-clock"></i> Stay Logged In
                </button>
            </div>
        `;

        // Add animations if not present
        this.ensureAnimations();

        modalOverlay.appendChild(modalBox);
        document.body.appendChild(modalOverlay);

        // Handle button click
        const stayBtn = document.getElementById('stayLoggedInBtn');
        
        // Add hover effect
        stayBtn.addEventListener('mouseenter', () => {
            stayBtn.style.background = '#0a5c38';
            stayBtn.style.borderColor = '#0a5c38';
        });
        stayBtn.addEventListener('mouseleave', () => {
            stayBtn.style.background = '#0f7a4a';
            stayBtn.style.borderColor = '#0f7a4a';
        });
        
        stayBtn.addEventListener('click', () => {
            console.log("Session Manager: User chose to stay logged in");
            modalOverlay.remove();
            this.isWarningShowing = false;
            this.resetInactivityTimer();
        });
        
        // Close on overlay click
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.remove();
                this.isWarningShowing = false;
                this.resetInactivityTimer();
            }
        });
    }
    
    hideWarningModal() {
        const modal = document.getElementById('inactivityWarningModal');
        if (modal) {
            modal.remove();
        }
        this.isWarningShowing = false;
    }

    // ==================== SESSION EXPIRED MODAL (UNIFORM DESIGN) ====================
    
    showSessionExpiredMessage() {
        if (this.isExpiredShowing) return;
        
        // Check if modal already exists
        let existingModal = document.getElementById('sessionExpiredModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        this.isExpiredShowing = true;
        
        // Clear any session data
        this.clearSession();
        
        // Create modal overlay (same style as login form modals)
        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'sessionExpiredModal';
        modalOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(2px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000001;
            padding: 16px;
            animation: modalFadeIn 0.15s ease;
        `;

        // Create modal box (same style as login form modals)
        const modalBox = document.createElement('div');
        modalBox.style.cssText = `
            background: white;
            border-radius: 12px;
            max-width: 280px;
            width: 100%;
            box-shadow: 0 15px 30px rgba(0, 0, 0, 0.2);
            animation: modalSlideUp 0.2s ease;
            overflow: hidden;
        `;

        modalBox.innerHTML = `
            <div style="padding: 20px 20px 12px 20px; text-align: center;">
                <div style="margin-bottom: 8px;">
                    <i class="fas fa-clock" style="font-size: 1.6rem; color: #ff9800;"></i>
                </div>
                <h3 style="margin: 0 0 4px 0; color: #1e293b; font-size: 1rem; font-weight: 600;">
                    Session Expired
                </h3>
                <p style="margin: 0; color: #64748b; font-size: 0.8rem; line-height: 1.4;">
                    Your session has expired due to inactivity. Please login again to continue.
                </p>
            </div>
            <div style="display: flex; gap: 8px; padding: 4px 20px 20px 20px;">
                <button id="reLoginBtn" style="
                    flex: 1;
                    padding: 6px 10px;
                    border-radius: 6px;
                    font-weight: 500;
                    font-size: 0.75rem;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 4px;
                    border: 1.5px solid #0f7a4a;
                    background: transparent;
                    color: #0f7a4a;
                    transition: all 0.15s ease;
                ">
                    <i class="fas fa-sign-in-alt"></i> Return to Login
                </button>
            </div>
        `;

        // Add animations if not present
        this.ensureAnimations();

        modalOverlay.appendChild(modalBox);
        document.body.appendChild(modalOverlay);

        // Handle button click
        const loginBtn = document.getElementById('reLoginBtn');
        
        // Add hover effect
        loginBtn.addEventListener('mouseenter', () => {
            loginBtn.style.background = '#0f7a4a';
            loginBtn.style.color = 'white';
        });
        loginBtn.addEventListener('mouseleave', () => {
            loginBtn.style.background = 'transparent';
            loginBtn.style.color = '#0f7a4a';
        });
        
        loginBtn.addEventListener('click', () => {
            console.log("Session Manager: User clicked return to login");
            window.location.replace('index.html');
        });
        
        // Auto-redirect after 5 seconds
        setTimeout(() => {
            if (document.getElementById('sessionExpiredModal')) {
                console.log("Session Manager: Auto-redirecting to login");
                window.location.replace('index.html');
            }
        }, 5000);
    }

    // ==================== FORCE LOGOUT MODAL (UNIFORM DESIGN) ====================
    
    showForceLogoutModal(username, password, errorResponse) {
        // Remove any existing modal
        const existingModal = document.getElementById('alreadyLoggedInModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Format session details if available
        let sessionDetailsHtml = '';
        if (errorResponse.lastActivity || errorResponse.sessionStarted) {
            sessionDetailsHtml = `
                <div style="margin: 12px 0; padding: 10px; background: #fff9e6; border-radius: 8px; border-left: 3px solid #ff9800; font-size: 0.75rem; text-align: left;">
                    ${errorResponse.sessionStarted ? `<div style="margin-bottom: 4px;"><i class="fas fa-calendar-alt" style="color: #ff9800; width: 16px; margin-right: 6px;"></i> <strong>Session started:</strong> ${errorResponse.sessionStarted}</div>` : ''}
                    ${errorResponse.lastActivity ? `<div style="margin-bottom: 4px;"><i class="fas fa-clock" style="color: #ff9800; width: 16px; margin-right: 6px;"></i> <strong>Last activity:</strong> ${errorResponse.lastActivity}</div>` : ''}
                    ${errorResponse.inactiveMinutes ? `<div><i class="fas fa-hourglass-half" style="color: #ff9800; width: 16px; margin-right: 6px;"></i> <strong>Inactive for:</strong> ${errorResponse.inactiveMinutes} minutes</div>` : ''}
                </div>
            `;
        }
        
        // Create modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'alreadyLoggedInModal';
        modalOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(2px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000002;
            padding: 16px;
            animation: modalFadeIn 0.15s ease;
        `;
        
        // Create modal box
        const modalBox = document.createElement('div');
        modalBox.style.cssText = `
            background: white;
            border-radius: 12px;
            max-width: 300px;
            width: 100%;
            box-shadow: 0 15px 30px rgba(0, 0, 0, 0.2);
            animation: modalSlideUp 0.2s ease;
            overflow: hidden;
        `;
        
        modalBox.innerHTML = `
            <div style="padding: 20px 20px 12px 20px; text-align: center;">
                <div style="margin-bottom: 8px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 1.6rem; color: #ff9800;"></i>
                </div>
                <h3 style="margin: 0 0 4px 0; color: #1e293b; font-size: 1rem; font-weight: 600;">
                    Account Already in Use
                </h3>
                <p style="margin: 0 0 8px 0; color: #64748b; font-size: 0.8rem; line-height: 1.4;">
                    ${errorResponse.message || 'This account is currently logged in on another device.'}
                </p>
                ${sessionDetailsHtml}
                <p style="margin: 8px 0 0 0; color: #64748b; font-size: 0.75rem;">
                    You can force logout from the other device to continue.
                </p>
            </div>
            <div style="display: flex; gap: 8px; padding: 4px 20px 20px 20px;">
                <button id="modalCancelBtn" style="
                    flex: 1;
                    padding: 6px 10px;
                    border-radius: 6px;
                    font-weight: 500;
                    font-size: 0.75rem;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 4px;
                    border: 1.5px solid #ef4444;
                    background: transparent;
                    color: #ef4444;
                    transition: all 0.15s ease;
                ">
                    <i class="fas fa-times"></i> Cancel
                </button>
                <button id="modalForceLogoutBtn" style="
                    flex: 1;
                    padding: 6px 10px;
                    border-radius: 6px;
                    font-weight: 500;
                    font-size: 0.75rem;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 4px;
                    border: 1.5px solid #ff9800;
                    background: transparent;
                    color: #ff9800;
                    transition: all 0.15s ease;
                ">
                    <i class="fas fa-sign-out-alt"></i> Force Logout
                </button>
            </div>
        `;
        
        this.ensureAnimations();
        
        modalOverlay.appendChild(modalBox);
        document.body.appendChild(modalOverlay);
        
        // Get buttons
        const cancelBtn = document.getElementById('modalCancelBtn');
        const forceBtn = document.getElementById('modalForceLogoutBtn');
        
        // Cancel button hover (red)
        cancelBtn.addEventListener('mouseenter', () => {
            cancelBtn.style.background = '#ef4444';
            cancelBtn.style.color = 'white';
        });
        cancelBtn.addEventListener('mouseleave', () => {
            cancelBtn.style.background = 'transparent';
            cancelBtn.style.color = '#ef4444';
        });
        
        // Force logout button hover (orange)
        forceBtn.addEventListener('mouseenter', () => {
            forceBtn.style.background = '#ff9800';
            forceBtn.style.color = 'white';
        });
        forceBtn.addEventListener('mouseleave', () => {
            forceBtn.style.background = 'transparent';
            forceBtn.style.color = '#ff9800';
        });
        
        // Store the username and password for force logout
        modalOverlay.setAttribute('data-username', username);
        modalOverlay.setAttribute('data-password', password);
        
        // Button click handlers
        cancelBtn.addEventListener('click', () => {
            modalOverlay.remove();
        });
        
        forceBtn.addEventListener('click', async () => {
            modalOverlay.remove();
            await this.handleForceLogout(username, password);
        });
        
        // Close on overlay click
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.remove();
            }
        });
        
        // Handle ESC key
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                modalOverlay.remove();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    }
    
    async handleForceLogout(username, password) {
        console.log("Force logout requested for:", username);
        
        const loginBtn = document.getElementById('loginButton');
        
        try {
            if (loginBtn) {
                loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Terminating session...';
                loginBtn.disabled = true;
            }
            
            const API_URL = window.API_URL || "https://script.google.com/macros/s/AKfycbytvSPndcz2Ou0Kz_XOUw6Ztlwx55ml2TsaEZFTdLYVCCVfOMwdRohgq_cOPPeluQMTCw/exec";
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            
            const formData = new FormData();
            formData.append('action', 'forceLogout');
            formData.append('username', username);
            formData.append('actor', username);
            
            const response = await fetch(API_URL, {
                method: 'POST',
                body: formData,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            const data = await response.json();
            
            if (data.success) {
                console.log("Force logout successful");
                
                if (loginBtn) {
                    loginBtn.innerHTML = '<i class="fas fa-check"></i> Session terminated! Logging in...';
                }
                
                // Wait 2 seconds for the other device to detect logout
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Now retry login
                const sha256 = window.sha256 || (await import('./index.js')).sha256;
                const pwHash = await sha256(password);
                const deviceInfo = this.getDeviceInfo();
                
                const loginFormData = new FormData();
                loginFormData.append('action', 'login');
                loginFormData.append('username', username);
                loginFormData.append('pwHash', pwHash);
                loginFormData.append('deviceInfo', JSON.stringify(deviceInfo));
                
                const loginResponse = await fetch(API_URL, {
                    method: 'POST',
                    body: loginFormData
                });
                
                const loginData = await loginResponse.json();
                
                if (loginData.success) {
                    this.storeSessionData(loginData.user, pwHash, loginData.sessionId);
                    
                    if (loginBtn) {
                        loginBtn.innerHTML = '<i class="fas fa-check-circle"></i> Login successful! Redirecting...';
                    }
                    
                    setTimeout(() => {
                        window.location.replace("main.html");
                    }, 1000);
                } else {
                    this.showError("Login failed after force logout: " + loginData.message);
                    if (loginBtn) {
                        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login to System';
                        loginBtn.disabled = false;
                    }
                }
            } else {
                this.showError("Force logout failed: " + data.message);
                if (loginBtn) {
                    loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login to System';
                    loginBtn.disabled = false;
                }
            }
        } catch (err) {
            console.error("Force logout error:", err);
            this.showError("Error during force logout: " + err.message);
            if (loginBtn) {
                loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login to System';
                loginBtn.disabled = false;
            }
        }
    }
    
    getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screenResolution: `${screen.width}x${screen.height}`,
            deviceType: /Mobile|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
            timestamp: new Date().toISOString()
        };
    }
    
    storeSessionData(user, pwHash, sessionId) {
        localStorage.clear();
        sessionStorage.clear();
        
        sessionStorage.setItem('sessionId', sessionId);
        sessionStorage.setItem('sessionExpiry', (Date.now() + this.SESSION_TIMEOUT).toString());
        sessionStorage.setItem('authenticated', 'true');
        
        localStorage.setItem('loggedIn', 'true');
        localStorage.setItem('username', user.Username);
        localStorage.setItem('staffName', user.FullName);
        localStorage.setItem('userRole', user.Role);
        localStorage.setItem('role', user.Role);
        localStorage.setItem('assignedBarangay', user.AssignedBarangay || '');
        localStorage.setItem('pwHash', pwHash);
        localStorage.setItem('loginTime', Date.now().toString());
        localStorage.setItem('lastActivity', Date.now().toString());
        localStorage.setItem('deviceInfo', JSON.stringify(this.getDeviceInfo()));
        
        console.log("Session data stored");
    }
    
    showError(message) {
        console.error("Error:", message);
        const errorDiv = document.getElementById('loginError');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 8000);
        } else {
            alert(message);
        }
    }

    // ==================== ANIMATION STYLES ====================
    
    ensureAnimations() {
        if (!document.getElementById('sessionModalAnimations')) {
            const style = document.createElement('style');
            style.id = 'sessionModalAnimations';
            style.textContent = `
                @keyframes modalFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes modalSlideUp {
                    from { 
                        opacity: 0;
                        transform: translateY(8px);
                    }
                    to { 
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // ==================== UTILITY METHODS ====================
    
    isGuest() {
        return localStorage.getItem('isGuest') === 'true' || 
               sessionStorage.getItem('isGuest') === 'true';
    }
    
    setUserNameImmediately() {
        const fullName = localStorage.getItem('staffName');
        const username = localStorage.getItem('username');
        const displayName = fullName || username || 'User';
        
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = displayName;
        }
        
        document.querySelectorAll('.username-display, [data-username]').forEach(el => {
            el.textContent = displayName;
        });
        
        const userFullNameElement = document.getElementById('userFullName');
        if (userFullNameElement) {
            userFullNameElement.textContent = displayName;
        }
        
        console.log("Session Manager: Set immediate username:", displayName);
    }
    
    updateUI() {
        const fullName = localStorage.getItem('staffName');
        const role = localStorage.getItem('userRole');
        const username = localStorage.getItem('username');
        const isGuest = this.isGuest();
        
        const usernameElements = document.querySelectorAll('#userName, .username-display, [data-username]');
        usernameElements.forEach(el => {
            if (el) {
                el.textContent = fullName || username || 'User';
            }
        });
        
        if (isGuest) {
           // this.addGuestBadge();
        } else {
            const isAdmin = role && role.toLowerCase() === 'admin';
            document.querySelectorAll('.admin-only').forEach(el => {
                if (isAdmin) {
                    el.classList.add('admin-visible');
                    el.style.display = '';
                } else {
                    el.classList.remove('admin-visible');
                    el.style.display = 'none';
                }
            });
        }
    }
/*
    addGuestBadge() {
        const existingBadge = document.querySelector('.guest-badge');
        if (existingBadge) existingBadge.remove();
        
        const headerRight = document.querySelector('.header-right, .user-info, .topbar .user-info');
        if (headerRight) {
            const guestBadge = document.createElement('span');
            guestBadge.className = 'guest-badge';
            guestBadge.innerHTML = '<i class="fas fa-eye"></i> View Only';
            guestBadge.style.cssText = `
                background: #ff9800;
                color: white;
                padding: 4px 10px;
                border-radius: 20px;
                font-size: 0.75rem;
                font-weight: 600;
                margin-left: 10px;
                display: inline-flex;
                align-items: center;
                gap: 5px;
            `;
            headerRight.appendChild(guestBadge);
        }
    }
    */
    forceGuestRestrictions() {
        const isGuest = this.isGuest();
        
        if (isGuest) {
            console.log("Session Manager: Force applying guest restrictions");
            
            document.querySelectorAll('.nav-item, .mobile-nav-item, .sidebar li a').forEach(el => {
                const link = el.closest('a') || el;
                const parent = link.closest('li') || link;
                const text = el.textContent || '';
                
                if (!text.includes('Dashboard')) {
                    if (parent) parent.style.display = 'none';
                    if (link) link.style.display = 'none';
                    el.style.display = 'none';
                }
            });
            
            document.querySelectorAll('a[href*="dashboard"], [data-page="dashboard"]').forEach(el => {
                el.style.display = '';
                if (el.closest('li')) el.closest('li').style.display = '';
            });
            
            //this.addGuestBadge();
        }
    }
    
    clearSession() {
        console.log("SessionManager: Clearing session and stopping monitoring");
        
        this.clearInactivityTimer();
        this.stopHeartbeat();
        this.stopSessionCheck();
        this.cleanupActivityMonitoring();
        
        localStorage.clear();
        sessionStorage.clear();
        
        this.initialized = false;
    }
    
    getSessionInfo() {
        return {
            username: localStorage.getItem('username'),
            fullName: localStorage.getItem('staffName'),
            role: localStorage.getItem('userRole'),
            barangay: localStorage.getItem('assignedBarangay'),
            sessionId: sessionStorage.getItem('sessionId'),
            loginTime: localStorage.getItem('loginTime'),
            lastActivity: localStorage.getItem('lastActivity'),
            isGuest: this.isGuest()
        };
    }
    
    isAdmin() {
        return localStorage.getItem('userRole') === 'Admin';
    }
    
    getAssignedBarangay() {
        return localStorage.getItem('assignedBarangay');
    }
}

// Create global instance
window.sessionManager = new SessionManager();

// Auto-initialize on protected pages
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.sessionManager.initialize();
    });
} else {
    window.sessionManager.initialize();
}

let currentForceLogoutRequestId = null;
let forceLogoutModalActive = false;
let forceLogoutProcessing = false;
let lastModalShowTime = 0;        // ADD THIS LINE
const MODAL_COOLDOWN_MS = 3000;   // ADD THIS LINE (3 seconds)

async function checkForForceLogoutRequests() {
    if (forceLogoutProcessing) {
        console.log("Force logout processing, skipping check");
        return;
    }
    const username = localStorage.getItem('username');
    const isGuest = localStorage.getItem('isGuest') === 'true';
    const loggedIn = localStorage.getItem('loggedIn') === 'true';
    
    if (!username || isGuest || !loggedIn) return;
    
    try {
        const API_URL = window.API_URL || "https://script.google.com/macros/s/AKfycbytvSPndcz2Ou0Kz_XOUw6Ztlwx55ml2TsaEZFTdLYVCCVfOMwdRohgq_cOPPeluQMTCw/exec";
        
        const formData = new FormData();
        formData.append('action', 'checkForceLogoutRequest');
        formData.append('username', username);
        
        const response = await fetch(API_URL, { method: 'POST', body: formData });
        const data = await response.json();
        
        if (data && data.hasRequest === true) {
            if (currentForceLogoutRequestId !== data.requestId) {
                console.log('⚠️ New pending force logout request detected!');
                currentForceLogoutRequestId = data.requestId;
                showForceLogoutConfirmationModal(data);
            } else {
                console.log('Already showing modal for this request, skipping');
            }
        } else {
            currentForceLogoutRequestId = null;
        }
    } catch (err) {
        console.error('Error checking force logout requests:', err);
    }
}

function showForceLogoutConfirmationModal(requestData) {
    // CHECK COOLDOWN - prevents duplicate modals within 3 seconds
    const now = Date.now();
    if (now - lastModalShowTime < MODAL_COOLDOWN_MS) {
        console.log("Modal cooldown active, skipping duplicate");
        return;
    }
    
    if (forceLogoutModalActive) {
        console.log("Modal already active, skipping");
        return;
    }
    
    console.log("🎯 SHOWING FORCE LOGOUT MODAL");
    lastModalShowTime = now;
    forceLogoutModalActive = true;
    
    const existingModal = document.getElementById('forceLogoutConfirmModal');
    if (existingModal) existingModal.remove();
    
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'forceLogoutConfirmModal';
    modalOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(2px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000003;
        padding: 16px;
    `;
    
    const modalBox = document.createElement('div');
    modalBox.style.cssText = `
        background: white;
        border-radius: 12px;
        max-width: 320px;
        width: 100%;
        box-shadow: 0 15px 30px rgba(0, 0, 0, 0.2);
        overflow: hidden;
    `;
    
    modalBox.innerHTML = `
        <div style="padding: 20px 20px 12px 20px; text-align: center;">
            <div style="margin-bottom: 8px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 1.6rem; color: #ff9800;"></i>
            </div>
            <h3 style="margin: 0 0 4px 0; color: #1e293b; font-size: 1rem; font-weight: 600;">
                Force Sign Out Request
            </h3>
            <p style="margin: 0 0 8px 0; color: #64748b; font-size: 0.8rem; line-height: 1.4;">
                Another device is trying to sign in to this account.
            </p>
            <div style="margin: 12px 0; padding: 10px; background: #fff9e6; border-radius: 8px; font-size: 0.75rem; text-align: left;">
                <div><strong>Requested by:</strong> ${escapeHtml(requestData.requestedBy || 'Unknown')}</div>
                <div><strong>Time:</strong> ${new Date(requestData.timestamp).toLocaleString()}</div>
            </div>
            <p style="margin: 8px 0 0 0; color: #dc2626; font-size: 0.75rem; font-weight: 500;">
                If you allow this, you will be signed out immediately.
            </p>
        </div>
        <div style="display: flex; gap: 8px; padding: 4px 20px 20px 20px;">
            <button id="cancelForceBtn" style="
                flex: 1;
                padding: 8px 12px;
                border-radius: 6px;
                font-weight: 500;
                font-size: 0.75rem;
                cursor: pointer;
                border: 1.5px solid #0f7a4a;
                background: transparent;
                color: #0f7a4a;
            ">
                <i class="fas fa-times"></i> Stay
            </button>
            <button id="allowForceBtn" style="
                flex: 1;
                padding: 8px 12px;
                border-radius: 6px;
                font-weight: 500;
                font-size: 0.75rem;
                cursor: pointer;
                border: 1.5px solid #ef4444;
                background: #ef4444;
                color: white;
            ">
                <i class="fas fa-check"></i> Allow
            </button>
        </div>
    `;
    
    modalOverlay.appendChild(modalBox);
    document.body.appendChild(modalOverlay);
    
    const cancelBtn = modalBox.querySelector('#cancelForceBtn');
    const allowBtn = modalBox.querySelector('#allowForceBtn');
    
    // Cancel - Stay signed in
    cancelBtn.onclick = async function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("User chose to STAY");
        
        modalOverlay.remove();
        forceLogoutModalActive = false;
        currentForceLogoutRequestId = null;
        
        const API_URL = window.API_URL || "https://script.google.com/macros/s/AKfycbytvSPndcz2Ou0Kz_XOUw6Ztlwx55ml2TsaEZFTdLYVCCVfOMwdRohgq_cOPPeluQMTCw/exec";
        const username = localStorage.getItem('username');
        
        const formData = new FormData();
        formData.append('action', 'cancelForceLogoutRequest');
        formData.append('username', username);
        formData.append('requestId', requestData.requestId);
        
        await fetch(API_URL, { method: 'POST', body: formData });
        showInfo('You remain signed in. The other device cannot sign in.');
    };
    
    // Allow - Sign out this device
    allowBtn.onclick = async function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("User chose to ALLOW - signing out this device");
        
        // Prevent further polling from showing the modal again
        forceLogoutProcessing = true;
        
        modalOverlay.remove();
        forceLogoutModalActive = false;
        currentForceLogoutRequestId = null;
        
        const API_URL = window.API_URL || "https://script.google.com/macros/s/AKfycbytvSPndcz2Ou0Kz_XOUw6Ztlwx55ml2TsaEZFTdLYVCCVfOMwdRohgq_cOPPeluQMTCw/exec";
        const username = localStorage.getItem('username');
        const actor = localStorage.getItem('staffName') || username;
        
        const formData = new FormData();
        formData.append('action', 'confirmForceLogout');
        formData.append('username', username);
        formData.append('actor', actor);
        formData.append('requestId', requestData.requestId);
        
        await fetch(API_URL, { method: 'POST', body: formData });
        
        // Show the simple "Signing out..." modal
        showForceLogoutSuccessModalDeviceA();
        
        // Clear everything after a short delay
        setTimeout(() => {
            localStorage.clear();
            sessionStorage.clear();
            
            if (window.sessionManager && typeof window.sessionManager.clearSession === 'function') {
                window.sessionManager.clearSession();
            }
            
            window.location.replace('index.html?logout=force&t=' + Date.now());
        }, 1500);
    };
    
    modalOverlay.onclick = function(e) {
        if (e.target === modalOverlay) {
            modalOverlay.remove();
            forceLogoutModalActive = false;
            currentForceLogoutRequestId = null;
        }
    };
}

// ========== DEVICE A SIMPLE "SIGNING OUT..." MODAL ==========
function showForceLogoutSuccessModalDeviceA() {
    // Remove any existing modal
    const existingModal = document.getElementById('forceLogoutSuccessModalA');
    if (existingModal) existingModal.remove();
    
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'forceLogoutSuccessModalA';
    modalOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(2px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000004;
        padding: 16px;
    `;
    
    const modalBox = document.createElement('div');
    modalBox.style.cssText = `
        background: white;
        border-radius: 12px;
        max-width: 280px;
        width: 100%;
        padding: 24px 20px;
        text-align: center;
        box-shadow: 0 15px 30px rgba(0, 0, 0, 0.2);
        animation: modalSlideUp 0.2s ease;
    `;
    
    modalBox.innerHTML = `
        <div style="margin-bottom: 12px;">
            <i class="fas fa-spinner fa-spin" style="font-size: 1.8rem; color: #0f7a4a;"></i>
        </div>
        <p style="margin: 0; color: #1e293b; font-size: 0.9rem; font-weight: 500;">
            Signing out...
        </p>
    `;
    
    modalOverlay.appendChild(modalBox);
    document.body.appendChild(modalOverlay);
    
    // Auto-remove after 2 seconds (will be replaced by redirect anyway)
    setTimeout(() => {
        if (modalOverlay.parentNode) modalOverlay.remove();
    }, 2000);
}

// ========== HELPER FUNCTIONS ==========
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showInfo(message) {
    const infoDiv = document.createElement('div');
    infoDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #0f7a4a;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 1000005;
        font-size: 0.9rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: fadeInOut 2s ease;
    `;
    infoDiv.textContent = message;
    document.body.appendChild(infoDiv);
    
    setTimeout(() => {
        if (infoDiv.parentNode) infoDiv.remove();
    }, 2000);
}

// ========== START MONITORING ==========
let forceLogoutCheckInterval = null;

function startForceLogoutMonitoring() {
    console.log("🚀 [FORCE LOGOUT] Starting force logout monitoring...");
    if (forceLogoutCheckInterval) clearInterval(forceLogoutCheckInterval);
    
    forceLogoutCheckInterval = setInterval(() => {
        const loggedIn = localStorage.getItem('loggedIn') === 'true';
        const isGuest = localStorage.getItem('isGuest') === 'true';
        
        if (loggedIn && !isGuest) {
            checkForForceLogoutRequests();
        }
    }, 5000);
    
    console.log("✅ [FORCE LOGOUT] Monitoring started (checking every 5 seconds)");
}

// Initialize monitoring when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startForceLogoutMonitoring);
} else {
    startForceLogoutMonitoring();
}
