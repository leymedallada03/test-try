const API_URL = "https://script.google.com/macros/s/AKfycbytvSPndcz2Ou0Kz_XOUw6Ztlwx55ml2TsaEZFTdLYVCCVfOMwdRohgq_cOPPeluQMTCw/exec";


// Session timeout (30 minutes = 1800000 ms)
const SESSION_TIMEOUT = 8 * 60 * 60 * 1000;  // 8 hours
const LOGIN_TIMEOUT = 90000; // 90 seconds timeout for login requests
const MAX_LOGIN_RETRIES = 2;  // Maximum retry attempts


let sessionCheckInterval = null;
let sessionActivityInterval = null;

// ===== AGGRESSIVE LOGIN FIELD CLEARING =====
(function() {
    'use strict';
    
    console.log("Login field cleaner loaded");
    
    // Method 1: Clear immediately
    function clearFields() {
        const usernameField = document.getElementById('username');
        const passwordField = document.getElementById('password');
        
        if (usernameField) {
            usernameField.value = '';
            usernameField.removeAttribute('value'); // Remove any hardcoded value attribute
        }
        if (passwordField) {
            passwordField.value = '';
            passwordField.removeAttribute('value');
        }
        console.log("Fields cleared immediately");
    }
    
    // Method 3: Clear on DOMContentLoaded
    document.addEventListener('DOMContentLoaded', function() {
        clearFields();
        console.log("Fields cleared on DOMContentLoaded");
    });
    
    // Method 4: Clear after a short delay (for slow browsers)
    setTimeout(function() {
        clearFields();
        console.log("Fields cleared after timeout");
    }, 500);
    
    // Method 5: Clear on window load (after all resources loaded)
    window.addEventListener('load', function() {
        clearFields();
        console.log("Fields cleared on window load");
    });
    
    // Method 6: Clear on page show (for back/forward cache)
    window.addEventListener('pageshow', function(event) {
        clearFields();
        console.log("Fields cleared on pageshow");
    });
    
    // Method 7: Clear when the page becomes visible (for mobile browsers)
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            clearFields();
            console.log("Fields cleared on visibility change");
        }
    });
    
    // Method 8: Force clear with MutationObserver (detects when browser changes the field)
    function setupMutationObserver() {
        const usernameField = document.getElementById('username');
        const passwordField = document.getElementById('password');
        
        if (usernameField) {
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
                        // Browser changed the value, clear it again
                        setTimeout(() => {
                            usernameField.value = '';
                        }, 10);
                    }
                });
            });
            
            observer.observe(usernameField, { attributes: true });
        }
        
        if (passwordField) {
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
                        // Browser changed the value, clear it again
                        setTimeout(() => {
                            passwordField.value = '';
                        }, 10);
                    }
                });
            });
            
            observer.observe(passwordField, { attributes: true });
        }
    }
    
    // Try to setup MutationObserver after a delay
    setTimeout(setupMutationObserver, 200);
})();

// Initialize everything when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    console.log("Login page loaded");
    
    // Check browser compatibility first
    if (!checkBrowserCompatibility()) {
        return;
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
});
// Guest login handler
document.addEventListener('DOMContentLoaded', function() {
    const guestBtn = document.getElementById('guestLoginBtn');
    if (guestBtn) {
        guestBtn.addEventListener('click', handleGuestLogin);
    }
});

async function handleGuestLogin() {
    console.log("=== Guest login attempt started ===");
    
    const msg = document.getElementById("statusText");
    const loginBtn = document.getElementById("loginButton");
    const guestBtn = document.getElementById("guestLoginBtn");
    
    if (msg) msg.innerText = "Logging in as guest...";
    if (msg) msg.style.color = "green";
    
    // Disable buttons
    if (loginBtn) loginBtn.disabled = true;
    if (guestBtn) guestBtn.disabled = true;
    
    try {
        // Generate a unique guest session ID
        const sessionId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        // Store guest session data
        storeGuestSessionData(sessionId);
        
        // Set flag that guest should still show logout confirmation
        localStorage.setItem('guestShowConfirmation', 'true');
        
        // ADD THIS: Set a flag to identify guest user in dashboard
        localStorage.setItem('isGuestUser', 'true');
        
        // Log guest login to API (fire and forget)
        try {
            const formData = new FormData();
            formData.append('action', 'logActivity');
            formData.append('username', 'guest_user');
            formData.append('actor', 'Guest User');
            formData.append('action', 'Guest Login');
            
            fetch(API_URL, {
                method: 'POST',
                body: formData
            }).catch(() => {});
        } catch (e) {
            // Ignore API logging errors
        }
        
        // Redirect DIRECTLY to dashboard.html (NOT main.html)
        console.log("Redirecting guest directly to dashboard.html...");
        setTimeout(() => {
            window.location.replace("dashboard.html");
        }, 1000);
        
    } catch (error) {
        console.error("Guest login error:", error);
        showError("Guest login failed. Please try again.");
        
        // Re-enable buttons
        if (loginBtn) loginBtn.disabled = false;
        if (guestBtn) guestBtn.disabled = false;
    }
}

function storeGuestSessionData(sessionId) {
    // Clear any existing storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Store in sessionStorage
    sessionStorage.setItem('sessionId', sessionId);
    sessionStorage.setItem('sessionExpiry', (Date.now() + SESSION_TIMEOUT).toString());
    sessionStorage.setItem('authenticated', 'true');
    sessionStorage.setItem('isGuest', 'true');
    
    // Store in localStorage
    localStorage.setItem('loggedIn', 'true');
    localStorage.setItem('username', 'guest_user');
    localStorage.setItem('staffName', 'Guest User'); // Keep as "Guest User"
    localStorage.setItem('userRole', 'Guest');
    localStorage.setItem('role', 'Guest');
    localStorage.setItem('assignedBarangay', 'All Barangays (View Only)');
    localStorage.setItem('pwHash', 'guest_' + Date.now());
    localStorage.setItem('loginTime', Date.now().toString());
    localStorage.setItem('lastActivity', Date.now().toString());
    localStorage.setItem('isGuest', 'true');
    localStorage.setItem('deviceInfo', JSON.stringify(getDeviceInfo()));

    console.log("Guest session data stored");
}
// --------------------------
// Browser Compatibility Check
// --------------------------
function checkBrowserCompatibility() {
    const requiredFeatures = [
        'Promise' in window,
        'fetch' in window,
        'crypto' in window && 'subtle' in crypto,
        'localStorage' in window,
        'sessionStorage' in window
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
        
        if (hour < 12) {
            statusText.textContent = 'Good morning! Please login to continue.';
        } else if (hour < 18) {
            statusText.textContent = 'Good afternoon! Please login to continue.';
        } else {
            statusText.textContent = 'Good evening! Please login to continue.';
        }
        
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
}

// --------------------------
// Get Device Information
// --------------------------
function getDeviceInfo() {
    // Create a unique device ID that persists for this browser
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
        deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('deviceId', deviceId);
    }
    
    return {
        deviceId: deviceId,  // ← CRITICAL: This uniquely identifies the device
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screenResolution: `${screen.width}x${screen.height}`,
        deviceType: /Mobile|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
        timestamp: new Date().toISOString()
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
// Check Previous Session - UPDATED
// --------------------------
function checkPreviousSession() {
    const loggedIn = localStorage.getItem("loggedIn");
    const loginTime = localStorage.getItem("loginTime");
    const sessionId = sessionStorage.getItem("sessionId");
    
    if (loggedIn === "true" && loginTime && sessionId) {
        const currentTime = Date.now();
        const loginTimestamp = parseInt(loginTime);
        const sessionAge = currentTime - loginTimestamp;
        
        if (sessionAge < SESSION_TIMEOUT) {
            checkSessionWithServer(localStorage.getItem("username"), sessionId);
        } else {
            console.log("Previous session expired, clearing storage...");
            clearSessionData();
        }
    }
}

async function checkSessionWithServer(username, sessionId) {
    try {
        // Add timeout for session check
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 10000);
        
        const response = await fetchJSON(API_URL, {
            action: "validateSession",
            username: username,
            sessionId: sessionId
        }, controller.signal);
        
        window.clearTimeout(timeoutId);
        
        if (response.success && response.isLoggedIn) {
            // ADD: Check session age from localStorage
            const loginTime = localStorage.getItem("loginTime");
            if (loginTime) {
                const sessionAge = Date.now() - parseInt(loginTime);
                if (sessionAge > SESSION_TIMEOUT) {
                    console.log("Session expired locally, clearing...");
                    clearSessionData();
                    return;
                }
            }
            
// Session is still valid, redirect to main page
console.log("Valid session found, redirecting...");
window.location.href = "main.html";
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
// LOGIN HANDLER - UPDATED WITH TIMEOUT
// --------------------------
async function handleLogin(event) {
    event.preventDefault();
    event.stopPropagation();

    console.log("=== Login attempt started ===");
    
    const msg = document.getElementById("statusText");
    const errorDiv = document.getElementById("loginError");
    const loginBtn = document.getElementById("loginButton");
    
    if (msg) msg.innerText = "Please wait… validating account…";
    if (msg) msg.style.color = "green";
    if (errorDiv) errorDiv.style.display = "none";

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (!username || !password) {
        showError("Please enter username and password.");
        return;
    }

    if (loginBtn) {
        loginBtn.classList.add("btn-loading");
        loginBtn.disabled = true;
    }

    let retries = 0;
    
    // Use the global constants (already defined at top of file)
    // Make sure LOGIN_TIMEOUT is set to 10000 if you want 10 seconds
    
    async function attemptLogin() {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), LOGIN_TIMEOUT);
        
        try {
            const pwHash = await sha256(password);
            // Get deviceInfo inside the function - this is correct
            const deviceInfo = getDeviceInfo();
            
            const formData = new FormData();
            formData.append('action', 'login');
            formData.append('username', username);
            formData.append('pwHash', pwHash);
            formData.append('deviceInfo', JSON.stringify(deviceInfo));
            
            const response = await fetch(API_URL, {
                method: 'POST',
                body: formData,
                signal: controller.signal,
                keepalive: true
            });
            
            window.clearTimeout(timeoutId);
            
            const text = await response.text();
            try {
                return JSON.parse(text);
            } catch (e) {
                console.error("Failed to parse response:", text);
                return { success: false, message: "Invalid server response" };
            }
            
        } catch (err) {
            window.clearTimeout(timeoutId);
            console.error("Attempt login error:", err);
            throw err;
        }
    }
    
    async function tryLoginWithRetry() {
        try {
            const response = await attemptLogin();
            
            if (!response || !response.success) {
                if (response && response.code === "ALREADY_LOGGED_IN") {
                    showAlreadyLoggedInError(username, password, response);
                    return null;
                } else if (response && response.code === "SESSION_ACTIVE_NEED_WAIT") {
                    showSessionActiveWaitModal(response, username, password);
                    return null;
                }
                throw new Error(response ? response.message : "Unknown error");
            }
            
            return response;
            
        } catch (err) {
            if (err.name === 'AbortError' && retries < MAX_LOGIN_RETRIES) {
                retries++;
                if (msg) msg.innerText = `Connection timeout, retrying (${retries}/${MAX_LOGIN_RETRIES})...`;
                await new Promise(r => window.setTimeout(r, 2000 * retries));
                return tryLoginWithRetry();
            }
            throw err;
        }
    }

    try {
        const response = await tryLoginWithRetry();
        
        if (!response) return;
        
        console.log("Login successful!");
        
        if (response.mustChangePassword === true) {
            console.log("User must change password - redirecting");
            sessionStorage.setItem('mustChangePassword', 'true');
            sessionStorage.setItem('tempUsername', username);
            sessionStorage.setItem('tempPwHash', await sha256(password));
            sessionStorage.setItem('tempSessionId', response.sessionId || '');
            
            if (msg) {
                msg.innerText = "Password change required. Redirecting...";
                msg.style.color = "orange";
            }
            
            setTimeout(() => {
                window.location.replace("change-password.html");
            }, 1000);
            return;
        }
        
        storeSessionData(response.user, await sha256(password), response.sessionId);
        startSessionManagement(response.user.Username, response.sessionId);
        
        if (msg) {
            msg.innerText = "Login successful! Redirecting...";
            msg.style.color = "green";
        }
        
        setTimeout(() => {
            window.location.replace("main.html");
        }, 1000);

    } catch (err) {
        console.error("LOGIN ERROR:", err);
        
        if (err.name === 'AbortError') {
            showError("Connection timeout after multiple retries. Please try again later.");
        } else {
            showError("Login failed: " + (err.message || "Unknown error"));
        }
        
        if (loginBtn) {
            loginBtn.classList.remove("btn-loading");
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login to System';
        }
    }
}

// --------------------------
// Handle "Already Logged In" Error - UPDATED with modal
// --------------------------
async function showAlreadyLoggedInError(username, password, errorResponse) {
    const errorDiv = document.getElementById("loginError");
    const loginBtn = document.getElementById("loginButton");
    
    // Hide the inline error div
    if (errorDiv) {
        errorDiv.style.display = "none";
    }
    
    // Remove any existing modal
    const existingModal = document.getElementById('alreadyLoggedInModal');
    if (existingModal) {
        existingModal.remove();
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
        background: rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(2px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000000;
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

    // Modal content
    modalBox.innerHTML = `
        <div style="padding: 20px 20px 12px 20px; text-align: center;">
            <div style="margin-bottom: 8px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 1.8rem; color: #ff9800; opacity: 0.7;"></i>
            </div>
            <h3 style="margin: 0 0 4px 0; color: #1e293b; font-size: 1rem; font-weight: 600; letter-spacing: -0.01em;">
                Account Already in Use
            </h3>
            <p style="margin: 0 0 8px 0; color: #64748b; font-size: 0.8rem; line-height: 1.4; font-weight: 400;">
                ${errorResponse.message || 'This account is currently logged in on another device.'}
            </p>
            ${sessionDetailsHtml}
            <p style="margin: 8px 0 0 0; color: #64748b; font-size: 0.75rem; font-style: italic;">
                You can force logout from the other device to continue.
            </p>
        </div>
        <div style="display: flex; gap: 8px; padding: 4px 20px 20px 20px;">
            <button id="modalCancelBtn" style="
                flex: 1;
                padding: 8px 10px;
                border-radius: 6px;
                font-weight: 500;
                font-size: 0.75rem;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 4px;
                transition: all 0.15s ease;
                outline: none;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
                letter-spacing: 0.3px;
                border: 1.5px solid #ef4444;
                background: transparent;
                color: #ef4444;
            ">
                <i class="fas fa-times"></i> Cancel
            </button>
            <button id="modalForceLogoutBtn" style="
                flex: 1;
                padding: 8px 10px;
                border-radius: 6px;
                font-weight: 500;
                font-size: 0.75rem;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 4px;
                transition: all 0.15s ease;
                outline: none;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
                letter-spacing: 0.3px;
                border: 1.5px solid #ff9800;
                background: transparent;
                color: #ff9800;
            ">
                <i class="fas fa-sign-out-alt"></i> Force Logout
            </button>
        </div>
    `;

    // Add animations if not already present
    if (!document.getElementById('modalAnimations')) {
        const style = document.createElement('style');
        style.id = 'modalAnimations';
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

    modalOverlay.appendChild(modalBox);
    document.body.appendChild(modalOverlay);

    // Get buttons
    const cancelBtn = document.getElementById('modalCancelBtn');
    const forceBtn = document.getElementById('modalForceLogoutBtn');

    // Add hover effects
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

    // Button click handlers
    cancelBtn.addEventListener('click', () => {
        modalOverlay.remove();
        // Re-enable login button
        if (loginBtn) {
            loginBtn.classList.remove("btn-loading");
            loginBtn.disabled = false;
        }
    });

    forceBtn.addEventListener('click', () => {
        modalOverlay.remove();
        // Show loading state on login button
        if (loginBtn) {
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Force Logging Out...';
            loginBtn.disabled = true;
        }
        // Call the force logout function
        handleForceLogout(username, password);
    });

    // Close on overlay click
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.remove();
            // Re-enable login button
            if (loginBtn) {
                loginBtn.classList.remove("btn-loading");
                loginBtn.disabled = false;
            }
        }
    });

    // Handle ESC key
    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            modalOverlay.remove();
            document.removeEventListener('keydown', handleEsc);
            // Re-enable login button
            if (loginBtn) {
                loginBtn.classList.remove("btn-loading");
                loginBtn.disabled = false;
            }
        }
    };
    document.addEventListener('keydown', handleEsc);
}

// --------------------------
// Force Logout Handler - UPDATED with better feedback
// --------------------------
function showWaitingMessage(message) {
    let msgDiv = document.getElementById('waitingMessage');
    if (!msgDiv) {
        msgDiv = document.createElement('div');
        msgDiv.id = 'waitingMessage';
        msgDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            z-index: 10001;
            text-align: center;
            font-size: 0.9rem;
            color: #333;
        `;
        document.body.appendChild(msgDiv);
    }
    msgDiv.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${message}`;
    msgDiv.style.display = 'block';
}

function hideWaitingMessage() {
    const msgDiv = document.getElementById('waitingMessage');
    if (msgDiv) msgDiv.style.display = 'none';
}

// Device B success modal (force logout successful, logging in)
// Device B - Dynamic modal (waiting → logging in)
let forceLogoutModalDeviceB = null;

function showForceLogoutSuccessModalDeviceB(isLoggingIn = false) {
    // If modal doesn't exist, create it
    if (!forceLogoutModalDeviceB) {
        const existingModal = document.getElementById('forceLogoutSuccessModalDeviceB');
        if (existingModal) existingModal.remove();
        
        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'forceLogoutSuccessModalDeviceB';
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
        modalBox.id = 'forceLogoutModalBoxDeviceB';
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
            <p id="forceLogoutModalMessage" style="margin: 0; color: #1e293b; font-size: 0.9rem; font-weight: 500;">
                Waiting for other device to confirm force logout...
            </p>
        `;
        
        modalOverlay.appendChild(modalBox);
        document.body.appendChild(modalOverlay);
        forceLogoutModalDeviceB = modalOverlay;
    }
    
    // Update the message if needed
    const messageEl = document.getElementById('forceLogoutModalMessage');
    if (messageEl) {
        if (isLoggingIn) {
            messageEl.textContent = 'Logging in...';
        } else {
            messageEl.textContent = 'Waiting for other device to confirm force logout...';
        }
    }
    
    // If isLoggingIn is true, keep the modal until redirect (will be removed by redirect or timeout)
    if (!isLoggingIn) {
        // Auto-remove after 30 seconds (timeout safety)
        setTimeout(() => {
            if (forceLogoutModalDeviceB && forceLogoutModalDeviceB.parentNode) {
                forceLogoutModalDeviceB.remove();
                forceLogoutModalDeviceB = null;
            }
        }, 30000);
    }
}

// Helper to remove the Device B modal (if needed)
function hideForceLogoutModalDeviceB() {
    if (forceLogoutModalDeviceB && forceLogoutModalDeviceB.parentNode) {
        forceLogoutModalDeviceB.remove();
        forceLogoutModalDeviceB = null;
    }
}

// Updated handleForceLogout with success modal
async function handleForceLogout(username, password) {
    console.log("🚪 Force logout requested for:", username);
    
    const loginBtn = document.getElementById("loginButton");
    
    try {
        if (loginBtn) {
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Requesting force logout...';
            loginBtn.disabled = true;
        }
        
        const requestId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        const formData = new FormData();
        formData.append('action', 'requestForceLogout');
        formData.append('username', username);
        formData.append('actor', username);
        formData.append('requestId', requestId);
        
        const response = await fetch(API_URL, { method: 'POST', body: formData });
        const data = await response.json();
        
        console.log("requestForceLogout response:", data);
        
        if (data.success) {
    if (loginBtn) {
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Waiting for other device to respond...';
    }
    
    // Show the waiting modal (message: "Waiting for other device...")
    showForceLogoutSuccessModalDeviceB(false);
    
    let attempts = 0;
    const maxAttempts = 60;
    
    const checkInterval = setInterval(async () => {
        attempts++;
        
        const checkFormData = new FormData();
        checkFormData.append('action', 'checkForceLogoutStatus');
        checkFormData.append('username', username);
        checkFormData.append('requestId', requestId);
        
        try {
            const checkResponse = await fetch(API_URL, { method: 'POST', body: checkFormData });
            const checkData = await checkResponse.json();
            
            console.log(`Poll attempt ${attempts}:`, checkData);
            
            if (checkData.confirmed === true) {
                console.log("✅ Device A confirmed force logout!");
                clearInterval(checkInterval);
                
                // Change modal text to "Logging in..."
                showForceLogoutSuccessModalDeviceB(true);
                
                if (loginBtn) {
                    loginBtn.innerHTML = '<i class="fas fa-check"></i> Force logout confirmed! Logging in...';
                }
                
                // Wait a moment then retry login
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Retry login
                const pwHash = await sha256(password);
                const deviceInfo = getDeviceInfo();
                
                const loginFormData = new FormData();
                loginFormData.append('action', 'login');
                loginFormData.append('username', username);
                loginFormData.append('pwHash', pwHash);
                loginFormData.append('deviceInfo', JSON.stringify(deviceInfo));
                
                const loginResponse = await fetch(API_URL, { method: 'POST', body: loginFormData });
                const loginData = await loginResponse.json();
                
                if (loginData.success) {
                    storeSessionData(loginData.user, pwHash, loginData.sessionId);
                    startSessionManagement(username, loginData.sessionId);
                    window.location.replace("main.html");
                } else {
                    showError("Login failed: " + loginData.message);
                    if (loginBtn) {
                        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login to System';
                        loginBtn.disabled = false;
                    }
                }
                
            } else if (checkData.cancelled === true) {
                clearInterval(checkInterval);
                // Remove modal on rejection
                hideForceLogoutModalDeviceB();
                showError("Force logout was rejected by the other device.");
                if (loginBtn) {
                    loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login to System';
                    loginBtn.disabled = false;
                }
                
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                hideForceLogoutModalDeviceB();
                showError("Force logout request timed out. The other device did not respond.");
                if (loginBtn) {
                    loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login to System';
                    loginBtn.disabled = false;
                }
            }
        } catch (err) {
            console.error("Poll check error:", err);
            if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                hideForceLogoutModalDeviceB();
                showError("Error checking force logout status: " + err.message);
                if (loginBtn) {
                    loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login to System';
                    loginBtn.disabled = false;
                }
            }
        }
    }, 1000);
} else {
            showError("Force logout request failed: " + data.message);
            if (loginBtn) {
                loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login to System';
                loginBtn.disabled = false;
            }
        }
    } catch (err) {
        console.error("Force logout error:", err);
        showError("Error during force logout: " + err.message);
        if (loginBtn) {
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login to System';
            loginBtn.disabled = false;
        }
    }
}

// Helper functions for waiting message
function showWaitingMessage(message) {
    let msgDiv = document.getElementById('waitingMessage');
    if (!msgDiv) {
        msgDiv = document.createElement('div');
        msgDiv.id = 'waitingMessage';
        msgDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            z-index: 10001;
            text-align: center;
            font-size: 0.9rem;
            color: #333;
        `;
        document.body.appendChild(msgDiv);
    }
    msgDiv.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${message}`;
    msgDiv.style.display = 'block';
}

function hideWaitingMessage() {
    const msgDiv = document.getElementById('waitingMessage');
    if (msgDiv) msgDiv.style.display = 'none';
}

// --------------------------
// Session Management
// --------------------------
function startSessionManagement(username, sessionId) {
    // Clear any existing intervals
    if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
    }
    if (sessionActivityInterval) {
        clearInterval(sessionActivityInterval);
    }
    
    // Check session validity every 30 seconds
    sessionCheckInterval = setInterval(async () => {
        try {
            const response = await fetchJSON(API_URL, {
                action: "checkSessionStatus",
                username: username,
                sessionId: sessionId
            });
            
            if (!response.success || !response.isLoggedIn) {
                // Session invalid - user was logged out from another device
                console.log("Session invalidated from another device");
                clearSessionData();
                alert("Your session has been terminated from another device. You have been logged out.");
                window.location.href = "index.html";
            }
        } catch (error) {
            console.error("Session check failed:", error);
        }
    }, 30000); // Check every 30 seconds
    
    // Update activity every 5 minutes
    sessionActivityInterval = setInterval(async () => {
        try {
            await fetchJSON(API_URL, {
                action: "logActivity",
                username: username,
                action: "Session Active"
            });
            console.log("Session activity updated");
        } catch (err) {
            console.error("Failed to update session activity:", err);
        }
    }, 5 * 60 * 1000); // 5 minutes
    
    // Also update on user interactions
    const updateActivity = debounce(async () => {
        try {
            await fetchJSON(API_URL, {
                action: "logActivity",
                username: username,
                action: "User Interaction"
            });
        } catch (err) {
            console.error("Failed to update activity on interaction:", err);
        }
    }, 30000); // 30 seconds debounce
    
    ['click', 'keypress', 'mousemove', 'scroll'].forEach(eventType => {
        document.addEventListener(eventType, updateActivity, { passive: true });
    });
}

// --------------------------
// Clear Session Data
// --------------------------
function clearSessionData() {
    if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
        sessionCheckInterval = null;
    }
    if (sessionActivityInterval) {
        clearInterval(sessionActivityInterval);
        sessionActivityInterval = null;
    }
    
    localStorage.clear();
    sessionStorage.clear();
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
// Helper Functions - UPDATED WITH SIGNAL
// --------------------------
async function fetchJSON(url, data, signal) {
    try {
        const formData = new FormData();
        for (const key in data) {
            if (data[key] !== undefined && data[key] !== null) {
                formData.append(key, data[key]);
            }
        }
        
        const response = await fetch(url, {
            method: "POST",
            body: formData,
            signal: signal || null
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error("fetchJSON error:", error);
        if (error.name === 'AbortError') {
            throw error;
        }
        return { success: false, message: "Connection failed: " + error.message };
    }
}
function showError(message) {
    console.error("Showing error:", message);
    const errorDiv = document.getElementById("loginError");
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = "block";
        
        // Auto-hide error after 8 seconds
        setTimeout(() => {
            errorDiv.style.display = "none";
        }, 8000);
    }
}
// ========== ADD THESE FUNCTIONS TO YOUR index.js ==========

// New function to show simple waiting modal with countdown (minutes and seconds)
async function showSessionActiveWaitModal(errorResponse, username, password) {
    console.log("=== showSessionActiveWaitModal CALLED ===");
    console.log("errorResponse:", JSON.stringify(errorResponse));
    console.log("username:", username);
    
    // Check if wait time exists
    if (!errorResponse.waitSeconds || errorResponse.waitSeconds <= 0) {
        console.log("No wait time or wait time <= 0, retrying immediately");
        await retryLoginAfterWait(username, password);
        return;
    }
    
    const remainingSeconds = errorResponse.waitSeconds;
    console.log("Remaining seconds:", remainingSeconds);
    
    // Remove any existing modal
    const existingModal = document.getElementById('sessionWaitModal');
    if (existingModal) existingModal.remove();
    
    // Add animation style if not present
    if (!document.getElementById('modalAnimations')) {
        const style = document.createElement('style');
        style.id = 'modalAnimations';
        style.textContent = `
            @keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes modalSlideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        `;
        document.head.appendChild(style);
    }
    
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'sessionWaitModal';
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
    
    const startMins = Math.floor(remainingSeconds / 60);
    const startSecs = remainingSeconds % 60;
    
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
        <div style="padding: 30px 20px; text-align: center;">
            <div style="margin-bottom: 15px;">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #0f7a4a;"></i>
            </div>
            <h3 style="margin: 0 0 8px 0; color: #1e293b; font-size: 1rem; font-weight: 600;">
                Previous Session Detected
            </h3>
            <p style="margin: 0 0 15px 0; color: #64748b; font-size: 0.8rem; line-height: 1.4;">
                Your previous session from a closed browser is being cleaned up.
            </p>
            <div style="margin: 15px 0; padding: 15px; background: #e8f5e9; border-radius: 8px; text-align: center;">
                <div style="font-size: 2rem; font-weight: bold; color: #0f7a4a;" id="waitTimer">${startMins}m ${startSecs}s</div>
                <div style="font-size: 0.7rem; color: #64748b;">time remaining</div>
            </div>
            <p style="margin: 15px 0 0 0; color: #64748b; font-size: 0.7rem;">
                Please wait, you will be logged in automatically.
            </p>
        </div>
    `;
    
    modalOverlay.appendChild(modalBox);
    document.body.appendChild(modalOverlay);
    
    let totalSeconds = remainingSeconds;
    const timerElement = document.getElementById('waitTimer');
    
    console.log("Starting countdown from", totalSeconds, "seconds");
    
    const countdownInterval = setInterval(() => {
        totalSeconds--;
        console.log("Countdown tick:", totalSeconds);
        
        if (totalSeconds <= 0) {
            console.log("⏰ Countdown FINISHED!");
            clearInterval(countdownInterval);
            modalOverlay.remove();
            retryLoginAfterWait(username, password);
        } else {
            const mins = Math.floor(totalSeconds / 60);
            const secs = totalSeconds % 60;
            if (timerElement) {
                timerElement.textContent = `${mins}m ${secs}s`;
            }
        }
    }, 1000);
    
    // ESC key to cancel
    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            console.log("User pressed ESC, cancelling wait");
            clearInterval(countdownInterval);
            modalOverlay.remove();
            document.removeEventListener('keydown', handleEsc);
            const loginBtn = document.getElementById('loginButton');
            if (loginBtn) {
                loginBtn.classList.remove("btn-loading");
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login to System';
            }
        }
    };
    document.addEventListener('keydown', handleEsc);
}

async function retryLoginAfterWait(username, password) {
    console.log("=== retryLoginAfterWait CALLED ===");
    console.log("Username:", username);
    
    const loginBtn = document.getElementById('loginButton');
    if (loginBtn) {
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
        loginBtn.disabled = true;
    }
    
    try {
        const pwHash = await sha256(password);
        const deviceInfo = getDeviceInfo();
        
        console.log("Sending login request...");
        
        const formData = new FormData();
        formData.append('action', 'login');
        formData.append('username', username);
        formData.append('pwHash', pwHash);
        formData.append('deviceInfo', JSON.stringify(deviceInfo));
        
        const response = await fetch(API_URL, { method: 'POST', body: formData });
        const data = await response.json();
        
        console.log("Login response:", data);
        
        if (data.success) {
            console.log("✅ Login successful!");
            storeSessionData(data.user, pwHash, data.sessionId);
            if (typeof startSessionManagement === 'function') {
                startSessionManagement(data.user.Username, data.sessionId);
            }
            window.location.replace("main.html");
        } else if (data.code === "SESSION_ACTIVE_NEED_WAIT") {
            console.log("Still waiting, showing modal again");
            showSessionActiveWaitModal(data, username, password);
        } else {
            console.error("Login failed:", data.message);
            showError("Login failed: " + data.message);
            if (loginBtn) {
                loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login to System';
                loginBtn.disabled = false;
            }
        }
    } catch (err) {
        console.error("Retry login error:", err);
        showError("Login error: " + err.message);
        if (loginBtn) {
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login to System';
            loginBtn.disabled = false;
        }
    }
}
async function testAPIConnection() {
    console.log("Testing API connection...");
    try {
        const formData = new FormData();
        formData.append('action', 'test');
        formData.append('t', Date.now());
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(API_URL, { 
            method: "POST",
            body: formData,
            signal: controller.signal 
        });
        
        clearTimeout(timeoutId);
        
        const data = await response.json();
        
        if (data.success) {
            console.log("✓ API connection successful");
            const statusText = document.getElementById("statusText");
            if (statusText) {
                statusText.innerText += " (Connected)";
            }
        } else {
            console.log("✗ API returned error:", data.message);
        }
        
        return data;
    } catch (error) {
        console.error("API test failed:", error);
        const statusText = document.getElementById("statusText");
        if (statusText) {
            statusText.innerText += " (Disconnected)";
        }
        return null;
    }
}

// Make functions available globally
window.handleForceLogout = handleForceLogout;
window.closeError = closeError;
// In your index.js, update the storeSessionData function:
function storeSessionData(user, pwHash, sessionId) {
    // Store in sessionStorage
    sessionStorage.setItem('sessionId', sessionId);
    sessionStorage.setItem('sessionExpiry', (Date.now() + SESSION_TIMEOUT).toString());
    sessionStorage.setItem('authenticated', 'true');
    
    // Store in localStorage
    localStorage.setItem('loggedIn', 'true');
    localStorage.setItem('username', user.Username);
    localStorage.setItem('staffName', user.FullName); // This is the Full Name
    localStorage.setItem('userRole', user.Role);
    localStorage.setItem('role', user.Role);
    localStorage.setItem('assignedBarangay', user.AssignedBarangay || '');
    localStorage.setItem('pwHash', pwHash);
    localStorage.setItem('loginTime', Date.now().toString());
    localStorage.setItem('lastActivity', Date.now().toString());
    localStorage.setItem('deviceInfo', JSON.stringify(getDeviceInfo()));

    console.log("Session data stored. Full Name:", user.FullName);
}