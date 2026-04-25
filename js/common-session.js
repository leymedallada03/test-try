// common-session.js - Updated with uniform modal for force logout
const COMMON_API_URL = window.SCRIPT_URL || "https://script.google.com/macros/s/AKfycbytvSPndcz2Ou0Kz_XOUw6Ztlwx55ml2TsaEZFTdLYVCCVfOMwdRohgq_cOPPeluQMTCw/exec";

// ===== DEBUG LOGOUT FLOW =====
console.log("=== common-session.js LOADED ===");

// Override console.log to make logout messages more visible
const originalLog = console.log;
console.log = function(...args) {
    if (args[0] && typeof args[0] === 'string' && args[0].includes('🚪')) {
        originalLog('%c🔴 LOGOUT: ' + args[0], 'background: #ff0000; color: white; font-size: 14px; padding: 2px;', ...args.slice(1));
    } else {
        originalLog.apply(console, args);
    }
};

// Setup logout button
function setupLogoutButton() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.removeEventListener('click', handleLogoutWithConfirmation);
        logoutBtn.addEventListener('click', handleLogoutWithConfirmation);
        logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
        logoutBtn.disabled = false;
    }
}

// Wrapper function that shows confirmation before logout
async function handleLogoutWithConfirmation(e) {
    e.preventDefault();
    e.stopPropagation();
    
    console.log("🚪 Logout clicked - showing confirmation...");
    
    const confirmed = await showLogoutConfirmation();
    
    if (!confirmed) {
        console.log("🚪 Logout cancelled by user");
        return;
    }
    
    console.log("🚪 Logout confirmed, proceeding...");
    await performLogout();
}

// Create and show logout confirmation modal (simple, uniform design)
function showLogoutConfirmation() {
    return new Promise((resolve) => {
        let modalOverlay = document.getElementById('logoutConfirmModal');
        if (modalOverlay) modalOverlay.remove();
        
        modalOverlay = document.createElement('div');
        modalOverlay.id = 'logoutConfirmModal';
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
            z-index: 1000000;
            padding: 16px;
            animation: modalFadeIn 0.15s ease;
        `;

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
                    <i class="fas fa-sign-out-alt" style="font-size: 1.6rem; color: #0f7a4a;"></i>
                </div>
                <h3 style="margin: 0 0 4px 0; color: #1e293b; font-size: 1rem; font-weight: 600;">
                    Confirm Logout
                </h3>
                <p style="margin: 0; color: #64748b; font-size: 0.8rem; line-height: 1.4;">
                    Are you sure you want to sign out?
                </p>
            </div>
            <div style="display: flex; gap: 8px; padding: 4px 20px 20px 20px;">
                <button id="cancelLogoutBtn" style="
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
                <button id="confirmLogoutBtn" style="
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
                    <i class="fas fa-check"></i> OK
                </button>
            </div>
        `;

        // Add animations if not present
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

        const cancelBtn = document.getElementById('cancelLogoutBtn');
        const confirmBtn = document.getElementById('confirmLogoutBtn');

        // Hover effects
        cancelBtn.addEventListener('mouseenter', () => {
            cancelBtn.style.background = '#ef4444';
            cancelBtn.style.color = 'white';
        });
        cancelBtn.addEventListener('mouseleave', () => {
            cancelBtn.style.background = 'transparent';
            cancelBtn.style.color = '#ef4444';
        });

        confirmBtn.addEventListener('mouseenter', () => {
            confirmBtn.style.background = '#0f7a4a';
            confirmBtn.style.color = 'white';
        });
        confirmBtn.addEventListener('mouseleave', () => {
            confirmBtn.style.background = 'transparent';
            confirmBtn.style.color = '#0f7a4a';
        });

        cancelBtn.addEventListener('click', () => {
            modalOverlay.remove();
            resolve(false);
        });

        confirmBtn.addEventListener('click', () => {
            modalOverlay.remove();
            resolve(true);
        });

        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.remove();
                resolve(false);
            }
        });

        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                modalOverlay.remove();
                document.removeEventListener('keydown', handleEsc);
                resolve(false);
            }
        };
        document.addEventListener('keydown', handleEsc);
    });
}

// ===== UPDATED FORCE LOGOUT MODAL FOR ALREADY LOGGED IN ERROR =====
async function showAlreadyLoggedInError(username, password, errorResponse) {
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
    
    // Add animations if not present
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
    
    const cancelBtn = document.getElementById('modalCancelBtn');
    const forceBtn = document.getElementById('modalForceLogoutBtn');
    
    // Hover effects
    cancelBtn.addEventListener('mouseenter', () => {
        cancelBtn.style.background = '#ef4444';
        cancelBtn.style.color = 'white';
    });
    cancelBtn.addEventListener('mouseleave', () => {
        cancelBtn.style.background = 'transparent';
        cancelBtn.style.color = '#ef4444';
    });
    
    forceBtn.addEventListener('mouseenter', () => {
        forceBtn.style.background = '#ff9800';
        forceBtn.style.color = 'white';
    });
    forceBtn.addEventListener('mouseleave', () => {
        forceBtn.style.background = 'transparent';
        forceBtn.style.color = '#ff9800';
    });
    
    cancelBtn.addEventListener('click', () => {
        modalOverlay.remove();
        // Re-enable login button
        const loginBtn = document.getElementById('loginButton');
        if (loginBtn) {
            loginBtn.classList.remove("btn-loading");
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login to System';
        }
    });
    
    forceBtn.addEventListener('click', async () => {
        modalOverlay.remove();
        await handleForceLogout(username, password);
    });
    
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.remove();
            const loginBtn = document.getElementById('loginButton');
            if (loginBtn) {
                loginBtn.classList.remove("btn-loading");
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login to System';
            }
        }
    });
    
    const handleEsc = (e) => {
        if (e.key === 'Escape') {
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

// Updated handleForceLogout function for common-session.js
async function handleForceLogout(username, password) {
    console.log("🚪 Force logout requested for:", username);
    
    const loginBtn = document.getElementById('loginButton');
    const API_URL = window.API_URL || COMMON_API_URL;
    
    if (loginBtn) {
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Requesting force logout...';
        loginBtn.disabled = true;
    }
    
    try {
        // Generate a unique request ID
        const requestId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        console.log("📤 Sending requestForceLogout with ID:", requestId);
        
        // STEP 1: Send force logout request to notify Device A
        const formData = new FormData();
        formData.append('action', 'requestForceLogout');  // ← CRITICAL: Must be 'requestForceLogout'
        formData.append('username', username);
        formData.append('actor', username);
        formData.append('requestId', requestId);
        
        const response = await fetch(API_URL, { method: 'POST', body: formData });
        const data = await response.json();
        
        console.log("📥 requestForceLogout response:", data);
        
        if (data.success) {
            if (loginBtn) {
                loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Waiting for other device to respond...';
            }
            
            // Show waiting modal
            showWaitingForConfirmationModal();
            
            // STEP 2: Poll for confirmation from Device A
            let attempts = 0;
            const maxAttempts = 60; // 60 seconds max wait
            
            const checkInterval = setInterval(async () => {
                attempts++;
                
                const checkFormData = new FormData();
                checkFormData.append('action', 'checkForceLogoutStatus');
                checkFormData.append('username', username);
                checkFormData.append('requestId', requestId);
                
                try {
                    const checkResponse = await fetch(API_URL, { method: 'POST', body: checkFormData });
                    const checkData = await checkResponse.json();
                    
                    console.log(`📥 Poll attempt ${attempts}:`, checkData);
                    
                    if (checkData.confirmed === true) {
                        // Device A allowed force logout
                        console.log("✅ Device A confirmed force logout!");
                        clearInterval(checkInterval);
                        hideWaitingModal();
                        
                        if (loginBtn) {
                            loginBtn.innerHTML = '<i class="fas fa-check"></i> Force logout confirmed! Logging in...';
                        }
                        
                        // Wait 2 seconds for Device A to fully logout
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        
                        // STEP 3: Retry login
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
                            window.location.replace("main.html");
                        } else {
                            showError("Login failed: " + loginData.message);
                            if (loginBtn) {
                                loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login to System';
                                loginBtn.disabled = false;
                            }
                        }
                        
                    } else if (checkData.cancelled === true) {
                        // Device A rejected force logout
                        console.log("❌ Device A rejected force logout");
                        clearInterval(checkInterval);
                        hideWaitingModal();
                        
                        showError("Force logout was rejected by the other device.");
                        if (loginBtn) {
                            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login to System';
                            loginBtn.disabled = false;
                        }
                        
                    } else if (attempts >= maxAttempts) {
                        // Timeout
                        console.log("⏰ Force logout request timed out");
                        clearInterval(checkInterval);
                        hideWaitingModal();
                        
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
                        hideWaitingModal();
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

function showWaitingForConfirmationModal() {
    const existingModal = document.getElementById('waitingConfirmModal');
    if (existingModal) existingModal.remove();
    
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'waitingConfirmModal';
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
    
    modalOverlay.innerHTML = `
        <div style="background: white; border-radius: 12px; max-width: 280px; width: 100%; padding: 30px 20px; text-align: center;">
            <div style="margin-bottom: 15px;">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #ff9800;"></i>
            </div>
            <h3 style="margin: 0 0 8px 0; color: #1e293b; font-size: 1rem;">
                Waiting for Confirmation
            </h3>
            <p style="margin: 0; color: #64748b; font-size: 0.8rem;">
                Waiting for the other device to confirm force logout...
            </p>
        </div>
    `;
    
    document.body.appendChild(modalOverlay);
}

function hideWaitingModal() {
    const modal = document.getElementById('waitingConfirmModal');
    if (modal) modal.remove();
}

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

function storeSessionData(user, pwHash, sessionId) {
    
    const SESSION_TIMEOUT = 8 * 60 * 60 * 1000;  // 8 hours
    
    sessionStorage.setItem('sessionId', sessionId);
    sessionStorage.setItem('sessionExpiry', (Date.now() + SESSION_TIMEOUT).toString());
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
    localStorage.setItem('deviceInfo', JSON.stringify(getDeviceInfo()));
    
    console.log("Session data stored");
}

function showError(message) {
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

async function performLogout() {
    console.log("🚪 Logout triggered - performing actual logout");
    
    const isGuest = localStorage.getItem('isGuest') === 'true';
    const username = localStorage.getItem('username');
    const sessionId = sessionStorage.getItem('sessionId');
    const actor = localStorage.getItem('staffName') || username;
    
    console.log("Is guest?", isGuest);
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.innerHTML = '<i class="fas fa-check-circle"></i> Logging out...';
        logoutBtn.disabled = true;
    }
    
    if (!isGuest && username && sessionId) {
        try {
            const activityFormData = new FormData();
            activityFormData.append('action', 'logActivity');
            activityFormData.append('username', username);
            activityFormData.append('actor', actor);
            activityFormData.append('action', 'User Logout');
            
            fetch(COMMON_API_URL, {
                method: 'POST',
                body: activityFormData
            }).catch(() => {});
            
            const logoutFormData = new FormData();
            logoutFormData.append('action', 'logout');
            logoutFormData.append('username', username);
            logoutFormData.append('sessionId', sessionId);
            
            fetch(COMMON_API_URL, {
                method: 'POST',
                body: logoutFormData
            }).catch(() => {});
            
        } catch (error) {
            console.log("Background logout notification failed (non-critical)");
        }
    }
    
    if (window.sessionManager && typeof window.sessionManager.clearSession === 'function') {
        window.sessionManager.clearSession();
    }
    
    localStorage.clear();
    sessionStorage.clear();
    
    if (logoutBtn) {
        logoutBtn.innerHTML = '<i class="fas fa-check-circle"></i> Logged out!';
        logoutBtn.style.background = '#10b981';
    }
    
    setTimeout(() => {
        window.location.replace('index.html?logout=success&t=' + Date.now());
    }, 300);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    if (!window.location.pathname.includes('index.html')) {
        setupLogoutButton();
    }
});

window.handleLogout = handleLogoutWithConfirmation;
window.performLogout = performLogout;
window.showAlreadyLoggedInError = showAlreadyLoggedInError;

// Global logout interceptor - UPDATED to only catch the main logout button
(function() {
    console.log("🔒 Global logout interceptor installed");
    
    document.addEventListener('click', function(e) {
        const target = e.target.closest('button, a');
        if (!target) return;
        
        // IMPORTANT: Skip force logout buttons by ID
        if (target.id === 'allowForceBtn' || target.id === 'cancelForceBtn' ||
            target.id === 'modalForceLogoutBtn' || target.id === 'modalCancelBtn') {
            console.log("🔒 Force logout button detected - skipping interceptor");
            return;
        }
        
        // Only catch the main logout button by ID, not by text content
        const isLogoutButton = target.id === 'logoutBtn';
        
        if (isLogoutButton) {
            console.log("🚪 Logout button clicked - intercepted");
            
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            showLogoutConfirmation().then(confirmed => {
                if (confirmed) {
                    console.log("🚪 Logout confirmed - proceeding");
                    if (window.performLogout) {
                        window.performLogout();
                    } else {
                        localStorage.clear();
                        sessionStorage.clear();
                        window.location.replace('index.html?logout=success&t=' + Date.now());
                    }
                } else {
                    console.log("🚪 Logout cancelled");
                }
            });
            
            return false;
        }
    }, true);
})();
// ===== WINDOW EXPORTS =====
window.handleLogout = handleLogoutWithConfirmation;
window.performLogout = performLogout;
window.showAlreadyLoggedInError = showAlreadyLoggedInError;