/* COMPLETE index.js with Enhanced Session Management - UPDATED VERSION */
const API_URL = "https://script.google.com/macros/s/AKfycbx855bvwL5GABW5Xfmuytas3FbBikE1R44I7vNuhXNhfTly-MGMonkqPfeSngIt-7OMNA/exec";

// Session timeout (30 minutes = 1800000 ms) - UPDATED TO 30 MINUTES TO MATCH BACKEND
const SESSION_TIMEOUT = 30 * 60 * 1000;
const SESSION_CHECK_INTERVAL = 30000; // Check every 30 seconds
const SESSION_RENEWAL_INTERVAL = 10 * 60 * 1000; // Renew every 10 minutes
let sessionCheckInterval = null;
let sessionActivityInterval = null;
let passiveViewInterval = null;
let lastActivityUpdate = 0;
const MIN_UPDATE_INTERVAL = 10000; // 10 seconds minimum between updates

// Session intervals for cleanup
window.sessionIntervals = {
    heartbeat: null,
    renewal: null
};

// Initialize everything when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    console.log("Login page loaded with enhanced session management");
    
    // Check browser compatibility first
    if (!checkBrowserCompatibility()) {
        return;
    }
    
    // Check for logout parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('logout')) {
        showToast('You have been logged out successfully.', 'success');
        // Clear any residual data
        localStorage.clear();
        sessionStorage.clear();
        // Remove logout parameter from URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Setup basic UI interactions
    setupUI();
    
    // Setup login form
    const form = document.getElementById("loginForm");
    if (form) {
        console.log("Login form found");
        form.addEventListener("submit", handleLogin);
    }
    
    // Test API connection on load
    setTimeout(testAPIConnection, 1000);
    
    // Check if user was previously logged in
    checkPreviousSession();
    
    // Setup beforeunload cleanup
    window.addEventListener('beforeunload', cleanupBeforeUnload);
});

// --------------------------
// Browser Compatibility Check
// --------------------------
function checkBrowserCompatibility() {
    const requiredFeatures = [
        'Promise' in window,
        'fetch' in window,
        'crypto' in window && 'subtle' in crypto,
        'localStorage' in window,
        'sessionStorage' in window,
        'TextEncoder' in window
    ];
    
    if (requiredFeatures.some(feature => !feature)) {
        console.error("Browser lacks required features");
        const errorDiv = document.getElementById("loginError");
        if (errorDiv) {
            errorDiv.innerHTML = `
                <div style="background: #ffebee; border-left: 4px solid #f44336; padding: 12px; border-radius: 4px; margin: 10px 0;">
                    <strong><i class="fas fa-exclamation-triangle"></i> Browser Compatibility Issue</strong><br>
                    <div style="margin-top: 8px; font-size: 0.9rem;">
                        Your browser is missing required features for this application.<br>
                        Please use one of these modern browsers:<br>
                        • Chrome 58+<br>
                        • Firefox 52+<br>
                        • Safari 10.1+<br>
                        • Edge 16+
                    </div>
                </div>
            `;
            errorDiv.style.display = "block";
        }
        return false;
    }
    return true;
}

// --------------------------
// UI Setup Functions
// --------------------------
function setupUI() {
    // Password visibility toggle
    const togglePassword = document.getElementById('togglePassword');
    if (togglePassword) {
        togglePassword.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const passwordInput = document.getElementById('password');
            const icon = this.querySelector('i');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
                this.setAttribute('aria-label', 'Hide password');
            } else {
                passwordInput.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
                this.setAttribute('aria-label', 'Show password');
            }
            
            // Prevent any layout shift
            passwordInput.focus();
        });
    }
    
    // Set status message
    const statusText = document.getElementById('statusText');
    if (statusText) {
        const hour = new Date().getHours();
        let greeting = '';
        
        if (hour < 12) {
            greeting = 'Good morning!';
        } else if (hour < 18) {
            greeting = 'Good afternoon!';
        } else {
            greeting = 'Good evening!';
        }
        
        statusText.innerHTML = `${greeting} Please login to continue.<br><i class="fas fa-wifi"></i> <span id="connectionStatus">Checking connection...</span>`;
        
        // Update connection status
        updateConnectionStatus();
        
        // Focus on username field
        const usernameInput = document.getElementById('username');
        if (usernameInput) {
            usernameInput.focus();
        }
    }
    
    // Add enter key navigation
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const focused = document.activeElement;
            if (focused.id === 'username') {
                const passwordInput = document.getElementById('password');
                if (passwordInput) {
                    passwordInput.focus();
                    e.preventDefault();
                }
            } else if (focused.id === 'password') {
                const loginForm = document.getElementById("loginForm");
                if (loginForm) {
                    loginForm.dispatchEvent(new Event('submit'));
                }
            }
        }
    });
    
    // Prevent zoom on iOS
    document.addEventListener('touchstart', function(event) {
        if (event.touches.length > 1) {
            event.preventDefault();
        }
    }, { passive: false });
    
    // Prevent double-tap zoom
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(event) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
    
    // Handle iOS Safari 100vh issue
    function setAppHeight() {
        const doc = document.documentElement;
        doc.style.setProperty('--app-height', `${window.innerHeight}px`);
    }
    
    window.addEventListener('resize', setAppHeight);
    window.addEventListener('orientationchange', setAppHeight);
    setAppHeight();
    
    // Prevent form zoom on focus for iOS
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
        document.addEventListener('focus', function(event) {
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                setTimeout(function() {
                    event.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }
        }, true);
    }
    
    // Online/offline event listeners
    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);
}

// Update connection status display
function updateConnectionStatus() {
    const statusElement = document.getElementById('connectionStatus');
    if (statusElement) {
        if (navigator.onLine) {
            statusElement.innerHTML = '<span style="color: var(--primary-green);">Online</span>';
        } else {
            statusElement.innerHTML = '<span style="color: var(--accent-orange);">Offline - Please check connection</span>';
        }
    }
}

// --------------------------
// Toast Notification System
// --------------------------
function showToast(message, type = 'info') {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.toast-notification');
    existingToasts.forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(toast);
    
    // Add toast styles if not present
    if (!document.getElementById('toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            .toast-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 10px 30px rgba(6, 30, 20, 0.1);
                padding: 16px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                min-width: 300px;
                max-width: 400px;
                z-index: 10000;
                animation: slideInRight 0.3s ease;
                border-left: 4px solid var(--primary-green);
            }
            .toast-success { border-left-color: var(--primary-green); }
            .toast-error { border-left-color: #dc2626; }
            .toast-info { border-left-color: #3b82f6; }
            .toast-content {
                display: flex;
                align-items: center;
                gap: 10px;
                flex: 1;
            }
            .toast-content i {
                font-size: 1.2rem;
            }
            .toast-success .toast-content i { color: var(--primary-green); }
            .toast-error .toast-content i { color: #dc2626; }
            .toast-info .toast-content i { color: #3b82f6; }
            .toast-close {
                background: none;
                border: none;
                color: var(--text-light);
                cursor: pointer;
                padding: 4px;
                margin-left: 10px;
            }
            .toast-close:hover { color: var(--text-dark); }
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @media (max-width: 480px) {
                .toast-notification {
                    left: 20px;
                    right: 20px;
                    max-width: none;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 5000);
}

// --------------------------
// Get Device Information
// --------------------------
function getDeviceInfo() {
    return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screen: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        deviceType: /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
        timestamp: new Date().toISOString(),
        browser: getBrowserName(),
        os: getOSName()
    };
}

function getBrowserName() {
    const userAgent = navigator.userAgent;
    if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) return "Chrome";
    if (userAgent.includes("Firefox")) return "Firefox";
    if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) return "Safari";
    if (userAgent.includes("Edg")) return "Edge";
    if (userAgent.includes("Opera") || userAgent.includes("OPR")) return "Opera";
    return "Unknown";
}

function getOSName() {
    const userAgent = navigator.userAgent;
    if (userAgent.includes("Windows")) return "Windows";
    if (userAgent.includes("Mac")) return "MacOS";
    if (userAgent.includes("Linux")) return "Linux";
    if (userAgent.includes("Android")) return "Android";
    if (userAgent.includes("iOS") || userAgent.includes("iPhone") || userAgent.includes("iPad")) return "iOS";
    return "Unknown";
}

// --------------------------
// SHA-256 Hash Function
// --------------------------
async function sha256(str) {
    const utf8 = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest("SHA-256", utf8);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

// --------------------------
// Enhanced Session Functions
// --------------------------

// Store session with expiration
function storeSession(userData, sessionId) {
    const sessionData = {
        user: userData,
        sessionId: sessionId,
        timestamp: Date.now(),
        expires: Date.now() + (8 * 60 * 60 * 1000) // 8 hours from now
    };
    
    localStorage.setItem("sessionData", JSON.stringify(sessionData));
    localStorage.setItem("username", userData.Username);
    localStorage.setItem("staffName", userData.FullName);
    localStorage.setItem("userRole", userData.Role);
    localStorage.setItem("sessionId", sessionId);
    localStorage.setItem("assignedBarangay", userData.AssignedBarangay || "");
    localStorage.setItem("lastSessionRenewal", Date.now().toString());
}

// Check stored session on page load
function checkStoredSession() {
    const sessionDataStr = localStorage.getItem("sessionData");
    
    if (!sessionDataStr) {
        return null;
    }
    
    try {
        const sessionData = JSON.parse(sessionDataStr);
        
        // Check if session expired
        if (Date.now() > sessionData.expires) {
            localStorage.removeItem("sessionData");
            localStorage.clear();
            return null;
        }
        
        return sessionData;
    } catch (e) {
        localStorage.removeItem("sessionData");
        localStorage.clear();
        return null;
    }
}

// Check Previous Session - ENHANCED
function checkPreviousSession() {
    const storedSession = checkStoredSession();
    const sessionId = localStorage.getItem("sessionId");
    
    if (storedSession && sessionId && window.location.pathname.includes('index.html')) {
        // User already has a valid session, redirect to dashboard
        window.location.href = 'dashboard.html';
        return;
    }
    
    const loggedIn = localStorage.getItem("loggedIn");
    const loginTime = localStorage.getItem("loginTime");
    
    if (loggedIn === "true" && loginTime && sessionId) {
        const currentTime = Date.now();
        const loginTimestamp = parseInt(loginTime);
        const sessionAge = currentTime - loginTimestamp;
        
        // Check if session expired locally first
        if (sessionAge < SESSION_TIMEOUT) {
            // Session might still be valid, check with server
            checkSessionWithServer(localStorage.getItem("username"), sessionId);
        } else {
            // Session expired, clear storage
            console.log("Previous session expired, clearing storage...");
            clearSessionData();
        }
    }
}

async function checkSessionWithServer(username, sessionId) {
    try {
        // Add timeout for session check
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetchJSON(API_URL, {
            action: "validateSession",
            username: username,
            sessionId: sessionId
        }, controller.signal);
        
        clearTimeout(timeoutId);
        
        if (response.success && response.isLoggedIn) {
            // Check session age from localStorage
            const loginTime = localStorage.getItem("loginTime");
            if (loginTime) {
                const sessionAge = Date.now() - parseInt(loginTime);
                if (sessionAge > SESSION_TIMEOUT) {
                    console.log("Session expired locally, clearing...");
                    clearSessionData();
                    return;
                }
            }
            
            // Session is still valid, redirect to dashboard
            console.log("Valid session found, redirecting...");
            window.location.href = "dashboard.html";
        } else {
            // Session invalid, clear storage
            clearSessionData();
        }
    } catch (error) {
        console.error("Session check failed:", error);
        if (error.name === 'AbortError') {
            console.log("Session check timeout");
        }
        clearSessionData();
    }
}

// --------------------------
// Enhanced Session Activity Tracking
// --------------------------
function updateSessionActivity() {
    const now = Date.now();
    
    // Don't update too frequently (reduce server load)
    if (now - lastActivityUpdate < MIN_UPDATE_INTERVAL) {
        return;
    }
    
    lastActivityUpdate = now;
    
    // Update session storage
    sessionStorage.setItem('lastActivity', now.toString());
    
    // Also send to server if user is logged in
    const username = localStorage.getItem("username");
    const sessionId = localStorage.getItem("sessionId");
    
    if (username && sessionId) {
        fetchJSON(API_URL, {
            action: "logActivity",
            username: username,
            action: "Session Activity"
        }).catch(() => {
            // Silently fail if server unreachable
        });
    }
}

// Enhanced session validation
async function validateSession() {
    const username = localStorage.getItem("username");
    const sessionId = localStorage.getItem("sessionId");
    
    if (!username || !sessionId) {
        // No session data found, force logout
        clearSessionData();
        return false;
    }
    
    // Send validation request to server
    try {
        const response = await fetchJSON(API_URL, {
            action: "validateSession",
            username: username,
            sessionId: sessionId
        });
        
        if (!response.success) {
            // Server validation error
            console.warn("Session validation error:", response.message);
            
            // Check grace period
            const lastValidated = sessionStorage.getItem('lastValidatedSession') || 0;
            const now = Date.now();
            
            // Allow 5 minute grace period for network/server issues
            if (now - lastValidated < 5 * 60 * 1000) {
                console.log("Using grace period for session validation");
                sessionStorage.setItem('lastActivity', Date.now().toString());
                return true;
            }
            
            // Don't logout immediately for validation errors
            // Keep local session alive for now
            sessionStorage.setItem('lastActivity', Date.now().toString());
            return true;
        }
        
        if (!response.isLoggedIn) {
            // Session invalid or expired
            // Check grace period first
            const lastValidated = sessionStorage.getItem('lastValidatedSession') || 0;
            const now = Date.now();
            
            if (now - lastValidated < 5 * 60 * 1000) {
                console.log("Using grace period for expired session");
                return true;
            }
            
            if (response.code === "SESSION_EXPIRED") {
                showToast('Session expired due to inactivity', 'error');
            } else {
                showToast('Session invalid', 'error');
            }
            
            setTimeout(() => {
                clearSessionData();
                window.location.href = 'index.html';
            }, 3000); // Give user 3 seconds to see the message
            return false;
        } else {
            // Session valid, update activity timestamp
            sessionStorage.setItem('lastActivity', Date.now().toString());
            sessionStorage.setItem('lastValidatedSession', Date.now().toString());
            return true;
        }
    } catch (error) {
        console.warn('Session validation failed (server unreachable)');
        
        // Check grace period for network errors
        const lastValidated = sessionStorage.getItem('lastValidatedSession') || 0;
        const now = Date.now();
        
        if (now - lastValidated < 5 * 60 * 1000) {
            console.log("Using grace period for network error");
            sessionStorage.setItem('lastActivity', Date.now().toString());
            return true; // Keep session alive during grace period
        }
        
        // If server unreachable, maintain local session but log warning
        sessionStorage.setItem('lastActivity', Date.now().toString());
        return true; // Keep session alive when server is unreachable
    }
}

// Session renewal function
async function renewSessionIfNeeded(username, sessionId) {
    const lastRenewal = localStorage.getItem('lastSessionRenewal') || 0;
    const now = Date.now();
    
    // Renew session every 10 minutes
    if (now - lastRenewal > SESSION_RENEWAL_INTERVAL) {
        try {
            console.log("Attempting to renew session...");
            const response = await fetchJSON(API_URL, {
                action: "renewSession",
                username: username,
                sessionId: sessionId
            });
            
            if (response.success && response.newSessionId) {
                // Update session ID
                localStorage.setItem("sessionId", response.newSessionId);
                sessionId = response.newSessionId; // Update local variable
                
                // Update session data
                const sessionDataStr = localStorage.getItem("sessionData");
                if (sessionDataStr) {
                    const sessionData = JSON.parse(sessionDataStr);
                    sessionData.sessionId = response.newSessionId;
                    sessionData.timestamp = Date.now();
                    sessionData.expires = Date.now() + (8 * 60 * 60 * 1000);
                    localStorage.setItem("sessionData", JSON.stringify(sessionData));
                }
                
                localStorage.setItem('lastSessionRenewal', now.toString());
                console.log("Session renewed successfully");
                return response.newSessionId;
            } else {
                console.log("Session renewal failed:", response.message);
                return sessionId;
            }
        } catch (renewErr) {
            console.log("Session renewal error (non-critical):", renewErr);
            return sessionId;
        }
    }
    return sessionId;
}

// Start session heartbeat
function startSessionHeartbeat(username, sessionId) {
    // Clear any existing heartbeat
    if (window.sessionIntervals.heartbeat) {
        clearInterval(window.sessionIntervals.heartbeat);
    }
    
    // Send heartbeat every 5 minutes to keep session alive
    window.sessionIntervals.heartbeat = setInterval(async () => {
        if (document.hidden) return; // Don't heartbeat if tab is hidden
        
        try {
            // Send heartbeat activity
            await fetchJSON(API_URL, {
                action: "logActivity",
                username: username,
                action: "Heartbeat"
            });
            
            // Also renew session if needed
            const renewedSessionId = await renewSessionIfNeeded(username, sessionId);
            if (renewedSessionId !== sessionId) {
                sessionId = renewedSessionId;
            }
            
            // Update local session activity
            sessionStorage.setItem('lastActivity', Date.now().toString());
            
        } catch (err) {
            console.log("Heartbeat failed (non-critical):", err);
            // Don't logout on heartbeat failure
        }
    }, 5 * 60 * 1000); // 5 minutes
    
    return window.sessionIntervals.heartbeat;
}

// Update startSessionManagement function
function startSessionManagement(username, sessionId) {
    // Clear any existing intervals
    cleanupSessionIntervals();
    
    // Start heartbeat with session renewal
    startSessionHeartbeat(username, sessionId);
    
    // Check session more frequently (every 30 seconds)
    sessionCheckInterval = setInterval(checkSessionActivity, SESSION_CHECK_INTERVAL);
    
    // Check session immediately on load
    checkSessionActivity();
    
    // Track passive viewing every 30 seconds
    startPassiveViewTracking();
    
    // Track user interactions for activity
    ['click', 'keydown', 'scroll', 'mousemove'].forEach(eventType => {
        document.addEventListener(eventType, function(event) {
            // Don't track modifier keys alone for keydown
            if (eventType === 'keydown' && ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(event.key)) {
                return;
            }
            updateSessionActivity();
        }, { passive: true });
    });
    
    // Track data fetching
    trackDataFetching();
    
    // Log activity every 5 minutes to keep session alive
    sessionActivityInterval = setInterval(() => {
        updateSessionActivity();
        fetchJSON(API_URL, {
            action: "logActivity",
            username: username,
            action: "Active Session"
        }).catch(() => {
            // Silently fail
        });
    }, 5 * 60 * 1000);
    
    console.log("Enhanced session management started for user:", username);
}

async function attemptSessionRecovery(username, sessionId) {
    try {
        // Try to get new session without requiring re-login
        const response = await fetchJSON(API_URL, {
            action: "renewSession",
            username: username,
            sessionId: sessionId
        });
        
        if (response.success && response.newSessionId) {
            // Update session ID
            localStorage.setItem("sessionId", response.newSessionId);
            
            // Update session data
            const sessionDataStr = localStorage.getItem("sessionData");
            if (sessionDataStr) {
                const sessionData = JSON.parse(sessionDataStr);
                sessionData.sessionId = response.newSessionId;
                sessionData.timestamp = Date.now();
                sessionData.expires = Date.now() + (8 * 60 * 60 * 1000);
                localStorage.setItem("sessionData", JSON.stringify(sessionData));
            }
            
            return true;
        }
    } catch (error) {
        console.error("Session recovery failed:", error);
    }
    return false;
}

// Enhanced session activity checker
function checkSessionActivity() {
    // Check if session is still valid locally first
    const lastActivity = sessionStorage.getItem('lastActivity');
    const now = Date.now();
    
    if (lastActivity) {
        const inactivityTime = now - parseInt(lastActivity);
        
        if (inactivityTime > SESSION_TIMEOUT) {
            // Local session expired - check grace period
            const lastValidated = sessionStorage.getItem('lastValidatedSession') || 0;
            
            if (now - lastValidated < 5 * 60 * 1000) {
                console.log("Using grace period for local session expiry");
                return;
            }
            
            // Local session expired
            showToast('Session expired due to inactivity', 'error');
            setTimeout(() => {
                clearSessionData();
                window.location.href = 'index.html';
            }, 2000);
            return;
        }
    }
    
    // Update last activity time
    sessionStorage.setItem('lastActivity', now.toString());
    
    // Validate session with server periodically (but less frequently)
    const lastValidation = sessionStorage.getItem('lastServerValidation') || 0;
    if (now - lastValidation > 60000) { // Validate with server every minute
        validateSession();
        sessionStorage.setItem('lastServerValidation', now.toString());
    }
}

// Start Enhanced Session Management
function startEnhancedSessionManagement(username, sessionId) {
    // Clear any existing intervals
    cleanupSessionIntervals();
    
    // Check session more frequently (every 30 seconds)
    sessionCheckInterval = setInterval(checkSessionActivity, SESSION_CHECK_INTERVAL);
    
    // Check session immediately on load
    checkSessionActivity();
    
    // Track passive viewing every 30 seconds
    startPassiveViewTracking();
    
    // Track user interactions for activity
    ['click', 'keydown', 'scroll', 'mousemove'].forEach(eventType => {
        document.addEventListener(eventType, function(event) {
            // Don't track modifier keys alone for keydown
            if (eventType === 'keydown' && ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(event.key)) {
                return;
            }
            updateSessionActivity();
        }, { passive: true });
    });
    
    // Track data fetching
    trackDataFetching();
    
    // Log activity every 5 minutes to keep session alive
    sessionActivityInterval = setInterval(() => {
        updateSessionActivity();
        fetchJSON(API_URL, {
            action: "logActivity",
            username: username,
            action: "Active Session"
        }).catch(() => {
            // Silently fail
        });
    }, 5 * 60 * 1000);
    
    // Start heartbeat with renewal
    startSessionHeartbeat(username, sessionId);
}

function startPassiveViewTracking() {
    if (passiveViewInterval) clearInterval(passiveViewInterval);
    
    passiveViewInterval = setInterval(() => {
        if (!document.hidden) {
            // User is viewing the page (tab is active)
            updateSessionActivity();
            const username = localStorage.getItem("username");
            if (username) {
                fetchJSON(API_URL, {
                    action: "logActivity",
                    username: username,
                    action: "Passive Viewing"
                }).catch(() => {
                    // Silently fail
                });
            }
        }
    }, 30000); // Every 30 seconds
}

function trackDataFetching() {
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        updateSessionActivity();
        
        // Check if this is a data fetch (not activity logging)
        const url = args[0];
        if (typeof url === 'string' && !url.includes('logActivity') && !url.includes('validateSession')) {
            const username = localStorage.getItem("username");
            if (username) {
                fetchJSON(API_URL, {
                    action: "logActivity",
                    username: username,
                    action: "Data Fetch"
                }).catch(() => {
                    // Silently fail
                });
            }
        }
        
        return originalFetch.apply(this, args);
    };
}

// --------------------------
// Cleanup Functions
// --------------------------
function cleanupSessionIntervals() {
    // Clear all session intervals
    if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
        sessionCheckInterval = null;
    }
    if (sessionActivityInterval) {
        clearInterval(sessionActivityInterval);
        sessionActivityInterval = null;
    }
    if (passiveViewInterval) {
        clearInterval(passiveViewInterval);
        passiveViewInterval = null;
    }
    
    // Clear heartbeat interval
    if (window.sessionIntervals && window.sessionIntervals.heartbeat) {
        clearInterval(window.sessionIntervals.heartbeat);
        window.sessionIntervals.heartbeat = null;
    }
}

function cleanupBeforeUnload() {
    cleanupSessionIntervals();
    
    // Don't clear session on refresh - only log activity
    const username = localStorage.getItem("username");
    if (username) {
        // Use sendBeacon for reliable logout logging
        const data = new FormData();
        data.append('action', 'logActivity');
        data.append('username', username);
        data.append('actor', username);
        data.append('action', 'Page Unload');
        
        navigator.sendBeacon(API_URL, data);
    }
}

// --------------------------
// LOGIN HANDLER - ENHANCED WITH PASSIVE VIEWING SUPPORT
// --------------------------
async function handleLogin(event) {
    event.preventDefault();
    event.stopPropagation();

    console.log("=== Enhanced login attempt started ===");
    
    const msg = document.getElementById("statusText");
    const errorDiv = document.getElementById("loginError");
    const loginBtn = document.getElementById("loginButton");
    
    if (msg) {
        msg.innerHTML = 'Please wait… validating account…<br><i class="fas fa-spinner fa-spin"></i>';
        msg.style.color = "green";
    }
    if (errorDiv) errorDiv.style.display = "none";

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    console.log("Username entered:", username);
    console.log("Password length:", password.length);

    if (!username || !password) {
        console.log("Missing username or password");
        showError("Please enter username and password.");
        return;
    }

    // Show loading state
    if (loginBtn) {
        loginBtn.classList.add("btn-loading");
        loginBtn.disabled = true;
    }

    try {
        // Generate password hash
        console.log("Generating password hash...");
        const pwHash = await sha256(password);
        console.log("Password hash generated (first 10 chars):", pwHash.substring(0, 10) + "...");
        
        // Get device information
        const deviceInfo = getDeviceInfo();
        console.log("Device info:", deviceInfo);
        
        // Prepare request data
        const requestData = {
            action: "login",
            username: username,
            pwHash: pwHash,
            deviceInfo: JSON.stringify(deviceInfo)
        };
        
        console.log("Sending login request to:", API_URL);

        // Send POST request with timeout
        const startTime = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        const response = await fetchJSON(API_URL, requestData, controller.signal);
        
        clearTimeout(timeoutId);
        const endTime = Date.now();
        console.log(`Request completed in ${endTime - startTime}ms`);
        
        if (!response.success) {
            console.log("Login failed:", response.message);
            
            // Handle "already logged in" error
            if (response.code === "ALREADY_LOGGED_IN") {
                // Show custom error with force logout option
                showAlreadyLoggedInError(username, password, response);
            } else {
                showError("Login failed: " + response.message);
            }
            
            if (loginBtn) {
                loginBtn.classList.remove("btn-loading");
                loginBtn.disabled = false;
            }
            if (msg) msg.innerHTML = 'Please login to continue';
            return;
        }

        // -------------------------------
        // LOGIN SUCCESS
        // -------------------------------
        console.log("Login successful! User data:", response.user);
        console.log("Session ID:", response.sessionId);
        
        if (msg) {
            msg.innerHTML = '<i class="fas fa-check-circle"></i> Login successful! Redirecting...';
            msg.style.color = "green";
        }

        // Store session data with enhanced method
        storeSession(response.user, response.sessionId);
        storeSessionData(response.user, pwHash, response.sessionId);
        
        // Start enhanced session management
        startEnhancedSessionManagement(response.user.Username, response.sessionId);
        
        // Show success toast
        showToast('Login successful! Redirecting...', 'success');
        
        // Redirect to dashboard
        console.log("Redirecting to dashboard.html...");
        setTimeout(() => {
            window.location.replace("dashboard.html");
        }, 1000);

    } catch (err) {
        console.error("FETCH ERROR:", err);
        console.error("Error details:", err.message);
        
        if (err.name === 'AbortError') {
            showError("Connection timeout. Please check your internet and try again.");
        } else {
            showError("Connection error: " + err.message);
        }
        
        if (loginBtn) {
            loginBtn.classList.remove("btn-loading");
            loginBtn.disabled = false;
        }
        if (msg) {
            msg.innerHTML = 'Please login to continue';
            msg.style.color = "inherit";
        }
    }
}

// --------------------------
// Handle "Already Logged In" Error - ENHANCED
// --------------------------
async function showAlreadyLoggedInError(username, password, errorResponse) {
    const errorDiv = document.getElementById("loginError");
    const loginBtn = document.getElementById("loginButton");
    
    if (!errorDiv) return;
    
    // Create custom error message with better styling
    let errorMessage = `
        <div class="already-logged-in-error">
            <div style="margin-bottom: 12px;">
                <i class="fas fa-exclamation-triangle" style="color: #ff9800; margin-right: 8px; font-size: 1.2rem;"></i>
                <strong style="font-size: 1.1rem; color: #ff9800;">Account Already in Use</strong>
            </div>
            <div style="margin-bottom: 12px; color: #666; font-size: 0.95rem; line-height: 1.5;">
                ${errorResponse.message || "This account is currently active on another device."}
            </div>
    `;
    
    // Add session details if available
    if (errorResponse.lastActivity || errorResponse.sessionStarted) {
        errorMessage += `
            <div style="margin-bottom: 16px; color: #666; font-size: 0.9rem; background: #fff9e6; padding: 12px; border-radius: 6px; border-left: 3px solid #ffb74d;">
                <div style="margin-bottom: 6px;">
                    <i class="fas fa-clock" style="margin-right: 6px;"></i>
                    <strong>Session Details:</strong>
                </div>
                ${errorResponse.sessionStarted ? `<div style="margin-bottom: 4px;">• Started: ${errorResponse.sessionStarted}</div>` : ''}
                ${errorResponse.lastActivity ? `<div style="margin-bottom: 4px;">• Last activity: ${errorResponse.lastActivity}</div>` : ''}
                ${errorResponse.inactiveMinutes ? `<div>• Inactive for: ${errorResponse.inactiveMinutes} minutes</div>` : ''}
            </div>
        `;
    }
    
    errorMessage += `
            <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px;">
                <button type="button" class="force-logout-btn" onclick="handleForceLogout('${username}', '${password}')" 
                        style="padding: 10px 18px; background: linear-gradient(135deg, #ff9800, #ffb74d); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.95rem; display: inline-flex; align-items: center; gap: 8px; transition: all 0.2s;">
                    <i class="fas fa-sign-out-alt"></i>
                    Force Logout & Login Here
                </button>
                <button type="button" class="cancel-btn" onclick="closeError()" 
                        style="padding: 10px 18px; background: #f0f0f0; color: #666; border: 2px solid #e0e0e0; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.95rem; display: inline-flex; align-items: center; gap: 8px; transition: all 0.2s;">
                    <i class="fas fa-times"></i>
                    Cancel
                </button>
            </div>
        </div>
    `;
    
    errorDiv.innerHTML = errorMessage;
    errorDiv.style.display = "block";
    
    // Re-enable login button
    if (loginBtn) {
        loginBtn.classList.remove("btn-loading");
        loginBtn.disabled = false;
    }
    
    // Add hover effects via JavaScript
    setTimeout(() => {
        const forceBtn = errorDiv.querySelector('.force-logout-btn');
        const cancelBtn = errorDiv.querySelector('.cancel-btn');
        
        if (forceBtn) {
            forceBtn.addEventListener('mouseover', () => {
                forceBtn.style.background = 'linear-gradient(135deg, #f57c00, #ff9800)';
                forceBtn.style.transform = 'translateY(-2px)';
                forceBtn.style.boxShadow = '0 4px 12px rgba(255, 152, 0, 0.3)';
            });
            forceBtn.addEventListener('mouseout', () => {
                forceBtn.style.background = 'linear-gradient(135deg, #ff9800, #ffb74d)';
                forceBtn.style.transform = 'translateY(0)';
                forceBtn.style.boxShadow = 'none';
            });
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('mouseover', () => {
                cancelBtn.style.background = '#e0e0e0';
                cancelBtn.style.transform = 'translateY(-2px)';
            });
            cancelBtn.addEventListener('mouseout', () => {
                cancelBtn.style.background = '#f0f0f0';
                cancelBtn.style.transform = 'translateY(0)';
            });
        }
    }, 100);
}

// --------------------------
// Force Logout Handler - ENHANCED
// --------------------------
async function handleForceLogout(username, password) {
    console.log("Force logout requested for:", username);
    
    const errorDiv = document.getElementById("loginError");
    const loginBtn = document.getElementById("loginButton");
    
    if (!errorDiv) return;
    
    try {
        // Show loading state with better styling
        errorDiv.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <div style="margin-bottom: 16px;">
                    <div class="btn-loading" style="width: 30px; height: 30px; border: 3px solid rgba(255, 152, 0, 0.3); border-top-color: #ff9800; border-radius: 50%; margin: 0 auto; animation: spin 0.8s linear infinite;"></div>
                </div>
                <div style="color: #666; font-size: 0.95rem;">
                    <i class="fas fa-cog fa-spin" style="margin-right: 8px;"></i>
                    Terminating other session and preparing login...
                </div>
            </div>
        `;
        
        // Add spinner animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        
        // Set timeout for force logout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        // Call force logout API
        const response = await fetchJSON(API_URL, {
            action: "forceLogout",
            username: username,
            actor: username
        }, controller.signal);
        
        clearTimeout(timeoutId);
        
        if (response.success) {
            console.log("Force logout successful");
            
            // Show success message
            errorDiv.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <div style="margin-bottom: 16px; color: var(--primary-green); font-size: 1.1rem;">
                        <i class="fas fa-check-circle" style="font-size: 2rem;"></i>
                    </div>
                    <div style="margin-bottom: 12px; color: var(--primary-green); font-weight: 600;">
                        Other session terminated successfully
                    </div>
                    <div style="color: #666; font-size: 0.9rem; margin-bottom: 16px;">
                        Attempting to login with your credentials...
                    </div>
                    <div class="btn-loading" style="width: 20px; height: 20px; border: 2px solid rgba(15, 122, 74, 0.3); border-top-color: var(--primary-green); border-radius: 50%; margin: 0 auto; animation: spin 0.8s linear infinite;"></div>
                </div>
            `;
            
            // Wait 2 seconds for the other device to detect logout
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Now retry login with timeout
            const loginController = new AbortController();
            const loginTimeoutId = setTimeout(() => loginController.abort(), 15000);
            
            try {
                const pwHash = await sha256(password);
                const deviceInfo = getDeviceInfo();
                
                const loginResponse = await fetchJSON(API_URL, {
                    action: "login",
                    username: username,
                    pwHash: pwHash,
                    deviceInfo: JSON.stringify(deviceInfo)
                }, loginController.signal);
                
                clearTimeout(loginTimeoutId);
                
                if (loginResponse.success) {
                    // Login successful
                    storeSession(loginResponse.user, loginResponse.sessionId);
                    storeSessionData(loginResponse.user, pwHash, loginResponse.sessionId);
                    startEnhancedSessionManagement(username, loginResponse.sessionId);
                    
                    // Show success and redirect
                    showToast('Login successful after force logout!', 'success');
                    
                    setTimeout(() => {
                        window.location.replace("dashboard.html");
                    }, 1000);
                } else {
                    showError("Login failed after force logout: " + loginResponse.message);
                    if (loginBtn) {
                        loginBtn.classList.remove("btn-loading");
                        loginBtn.disabled = false;
                    }
                }
            } catch (loginErr) {
                clearTimeout(loginTimeoutId);
                if (loginErr.name === 'AbortError') {
                    showError("Login timeout after force logout. Please try again.");
                } else {
                    showError("Login error after force logout: " + loginErr.message);
                }
                if (loginBtn) {
                    loginBtn.classList.remove("btn-loading");
                    loginBtn.disabled = false;
                }
            }
        } else {
            showError("Force logout failed: " + response.message);
            if (loginBtn) {
                loginBtn.classList.remove("btn-loading");
                loginBtn.disabled = false;
            }
        }
    } catch (err) {
        console.error("Force logout error:", err);
        if (err.name === 'AbortError') {
            showError("Force logout timeout. Please try again.");
        } else {
            showError("Error during force logout: " + err.message);
        }
        if (loginBtn) {
            loginBtn.classList.remove("btn-loading");
            loginBtn.disabled = false;
        }
    }
}

// --------------------------
// Store Session Data (Legacy compatibility)
// --------------------------
function storeSessionData(user, pwHash, sessionId) {
    // Clear any existing storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Store in sessionStorage (cleared on browser close)
    sessionStorage.setItem('sessionId', sessionId);
    sessionStorage.setItem('sessionExpiry', (Date.now() + SESSION_TIMEOUT).toString());
    sessionStorage.setItem('authenticated', 'true');
    sessionStorage.setItem('lastValidatedSession', Date.now().toString());
    sessionStorage.setItem('lastServerValidation', Date.now().toString());
    
    // Store in localStorage (persists)
    localStorage.setItem('loggedIn', 'true');
    localStorage.setItem('username', user.Username);
    localStorage.setItem('staffName', user.FullName);
    localStorage.setItem('userRole', user.Role);
    localStorage.setItem('role', user.Role);
    localStorage.setItem('assignedBarangay', user.AssignedBarangay || '');
    localStorage.setItem('pwHash', pwHash);
    localStorage.setItem('loginTime', Date.now().toString());
    localStorage.setItem('deviceInfo', JSON.stringify(getDeviceInfo()));
    localStorage.setItem('lastSessionRenewal', Date.now().toString());

    console.log("Session data stored successfully. Session ID:", sessionId);
}

// --------------------------
// Clear Session Data
// --------------------------
function clearSessionData() {
    // Cleanup all intervals
    cleanupSessionIntervals();
    
    // Clear all storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear window intervals object
    if (window.sessionIntervals) {
        window.sessionIntervals = {
            heartbeat: null,
            renewal: null
        };
    }
    
    console.log("Session data cleared");
}

// --------------------------
// Close Error Message
// --------------------------
function closeError() {
    const errorDiv = document.getElementById("loginError");
    if (errorDiv) {
        errorDiv.style.display = "none";
        errorDiv.innerHTML = "";
    }
}

// --------------------------
// Debounce Helper
// --------------------------
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// --------------------------
// Helper Functions
// --------------------------
async function fetchJSON(url, data, signal) {
    try {
        // Convert data to FormData for Google Apps Script
        const formData = new FormData();
        for (const key in data) {
            formData.append(key, data[key]);
        }
        
        const response = await fetch(url, {
            method: "POST",
            body: formData,
            signal: signal || null
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const text = await response.text();
        console.log("Response text:", text);
        
        try {
            return JSON.parse(text);
        } catch (e) {
            console.error("Failed to parse JSON:", e);
            return { success: false, message: "Invalid server response" };
        }
    } catch (error) {
        console.error("fetchJSON error:", error);
        if (error.name === 'AbortError') {
            throw error; // Re-throw abort errors
        }
        return { success: false, message: "Connection failed: " + error.message };
    }
}

function showError(message) {
    console.error("Showing error:", message);
    const errorDiv = document.getElementById("loginError");
    if (errorDiv) {
        errorDiv.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <span>${message}</span>
            </div>
        `;
        errorDiv.style.display = "block";
        
        // Add error message styles if not present
        if (!document.getElementById('error-styles')) {
            const style = document.createElement('style');
            style.id = 'error-styles';
            style.textContent = `
                .error-message {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 12px 16px;
                    background: rgba(220, 38, 38, 0.1);
                    border-left: 4px solid #dc2626;
                    border-radius: 8px;
                    color: #dc2626;
                    font-size: 0.9rem;
                }
                .error-message i {
                    font-size: 1.1rem;
                }
            `;
            document.head.appendChild(style);
        }
        
        // Auto-hide error after 10 seconds
        setTimeout(() => {
            errorDiv.style.display = "none";
        }, 10000);
    }
}

async function testAPIConnection() {
    console.log("Testing API connection...");
    try {
        // Test with GET request
        const testUrl = API_URL + "?action=test&t=" + Date.now();
        console.log("Testing URL:", testUrl);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(testUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        const text = await response.text();
        console.log("API test response:", text);
        
        try {
            const data = JSON.parse(text);
            if (data.success) {
                console.log("✓ API connection successful");
                const statusText = document.getElementById("statusText");
                if (statusText) {
                    statusText.innerHTML = statusText.innerHTML.replace('Checking connection...', '<span style="color: var(--primary-green);">Online</span>');
                }
                showToast('Connected to server', 'success');
            } else {
                console.log("✗ API returned error:", data.message);
            }
        } catch (e) {
            console.log("✗ API returned non-JSON response:", text);
        }
        
        return text;
    } catch (error) {
        console.error("API test failed:", error);
        const statusText = document.getElementById("statusText");
        if (statusText) {
            statusText.innerHTML = statusText.innerHTML.replace('Checking connection...', '<span style="color: var(--accent-orange);">Server offline</span>');
        }
        return null;
    }
}

// Make functions available globally
window.handleForceLogout = handleForceLogout;
window.closeError = closeError;
window.showToast = showToast;
window.updateSessionActivity = updateSessionActivity;
window.cleanupSessionIntervals = cleanupSessionIntervals;
window.validateSession = validateSession;
