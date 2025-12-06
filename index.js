/* index.js — UPDATED WITH SINGLE-SESSION RESTRICTION */
// Replace this with your actual deployment URL
const API_URL = "https://script.google.com/macros/s/AKfycbx855bvwL5GABW5Xfmuytas3FbBikE1R44I7vNuhXNhfTly-MGMonkqPfeSngIt-7OMNA/exec";

// Session timeout (30 minutes = 1800000 ms)
const SESSION_TIMEOUT = 30 * 60 * 1000;
let sessionActivityTimer = null;

document.addEventListener("DOMContentLoaded", () => {
    console.log("Login page loaded");
    
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

// --------------------------
// Get Device Information
// --------------------------
function getDeviceInfo() {
    return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screenResolution: `${screen.width}x${screen.height}`,
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
// Check Previous Session
// --------------------------
function checkPreviousSession() {
    const loggedIn = localStorage.getItem("loggedIn");
    const loginTime = localStorage.getItem("loginTime");
    
    if (loggedIn === "true" && loginTime) {
        const currentTime = Date.now();
        const loginTimestamp = parseInt(loginTime);
        const sessionAge = currentTime - loginTimestamp;
        
        if (sessionAge < SESSION_TIMEOUT) {
            // Session is still valid, redirect to dashboard
            console.log("Previous session found, redirecting...");
            window.location.href = "dashboard.html";
        } else {
            // Session expired, clear storage
            console.log("Previous session expired, clearing storage...");
            clearSessionData();
        }
    }
}

// --------------------------
// LOGIN HANDLER - UPDATED WITH SINGLE-SESSION CHECK
// --------------------------
async function handleLogin(event) {
    event.preventDefault();
    event.stopPropagation();

    console.log("=== Login attempt started ===");
    
    const msg = document.getElementById("statusText");
    const errorDiv = document.getElementById("loginError");
    const loginBtn = document.getElementById("loginButton");
    
    msg.innerText = "Please wait… validating account…";
    msg.style.color = "green";
    errorDiv.style.display = "none";

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
    loginBtn.classList.add("btn-loading");
    loginBtn.disabled = true;

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
        console.log("Request data:", requestData);

        // Send POST request
        const startTime = Date.now();
        const response = await fetchJSON(API_URL, requestData);
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
            
            loginBtn.classList.remove("btn-loading");
            loginBtn.disabled = false;
            return;
        }

        // -------------------------------
        // LOGIN SUCCESS
        // -------------------------------
        console.log("Login successful! User data:", response.user);
        msg.innerText = "Login successful! Redirecting...";
        msg.style.color = "green";

        // Store session data
        storeSessionData(response.user, pwHash);
        
        // Start session activity tracking
        startSessionActivityTracking(username);
        
        // Redirect to dashboard
        console.log("Redirecting to dashboard.html...");
        setTimeout(() => {
            window.location.replace("dashboard.html");
        }, 1000);

    } catch (err) {
        console.error("FETCH ERROR:", err);
        console.error("Error details:", err.message);
        showError("Connection error: " + err.message);
        loginBtn.classList.remove("btn-loading");
        loginBtn.disabled = false;
    }
}

// --------------------------
// Handle "Already Logged In" Error
// --------------------------
async function showAlreadyLoggedInError(username, password, errorResponse) {
    const errorDiv = document.getElementById("loginError");
    const loginBtn = document.getElementById("loginButton");
    
    // Create custom error message
    let errorMessage = `
        <div class="already-logged-in-error">
            <div style="margin-bottom: 10px;">
                <i class="fas fa-exclamation-triangle" style="color: #ff9800; margin-right: 8px;"></i>
                <strong>Account Already in Use</strong>
            </div>
            <div style="margin-bottom: 15px; color: #666; font-size: 14px;">
                ${errorResponse.message}
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button type="button" class="force-logout-btn" onclick="handleForceLogout('${username}', '${password}')" style="padding: 8px 16px; background: #ff9800; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    <i class="fas fa-sign-out-alt" style="margin-right: 5px;"></i>
                    Force Logout
                </button>
                <button type="button" class="cancel-btn" onclick="closeError()" style="padding: 8px 16px; background: #f0f0f0; color: #666; border: none; border-radius: 4px; cursor: pointer;">
                    Cancel
                </button>
            </div>
        </div>
    `;
    
    errorDiv.innerHTML = errorMessage;
    errorDiv.style.display = "block";
    
    // Re-enable login button
    loginBtn.classList.remove("btn-loading");
    loginBtn.disabled = false;
}

// --------------------------
// Force Logout Handler
// --------------------------
async function handleForceLogout(username, password) {
    console.log("Force logout requested for:", username);
    
    const errorDiv = document.getElementById("loginError");
    const loginBtn = document.getElementById("loginButton");
    
    // Show loading state
    errorDiv.innerHTML = `
        <div style="text-align: center; padding: 10px;">
            <div class="btn-loading" style="margin: 0 auto;"></div>
            <div style="margin-top: 10px; color: #666;">Logging out other session...</div>
        </div>
    `;
    
    try {
        // Call force logout API
        const response = await fetchJSON(API_URL, {
            action: "forceLogout",
            username: username
        });
        
        if (response.success) {
            console.log("Force logout successful");
            
            // Wait a moment, then retry login
            setTimeout(async () => {
                // Re-enable login button
                loginBtn.classList.remove("btn-loading");
                loginBtn.disabled = false;
                
                // Close error message
                errorDiv.style.display = "none";
                
                // Retry login automatically
                const pwHash = await sha256(password);
                const deviceInfo = getDeviceInfo();
                
                const loginResponse = await fetchJSON(API_URL, {
                    action: "login",
                    username: username,
                    pwHash: pwHash,
                    deviceInfo: JSON.stringify(deviceInfo)
                });
                
                if (loginResponse.success) {
                    // Login successful
                    storeSessionData(loginResponse.user, pwHash);
                    startSessionActivityTracking(username);
                    window.location.replace("dashboard.html");
                } else {
                    showError("Login failed after force logout: " + loginResponse.message);
                }
            }, 1000);
        } else {
            showError("Force logout failed: " + response.message);
            loginBtn.classList.remove("btn-loading");
            loginBtn.disabled = false;
        }
    } catch (err) {
        console.error("Force logout error:", err);
        showError("Error during force logout: " + err.message);
        loginBtn.classList.remove("btn-loading");
        loginBtn.disabled = false;
    }
}

// --------------------------
// Close Error Message
// --------------------------
function closeError() {
    const errorDiv = document.getElementById("loginError");
    errorDiv.style.display = "none";
    errorDiv.innerHTML = "";
}

// --------------------------
// Store Session Data
// --------------------------
function storeSessionData(user, pwHash) {
    // Clear any existing storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Set new session data
    localStorage.setItem("loggedIn", "true");
    localStorage.setItem("username", user.Username);
    localStorage.setItem("staffName", user.FullName);
    localStorage.setItem("userRole", user.Role);
    localStorage.setItem("role", user.Role);
    localStorage.setItem("assignedBarangay", user.AssignedBarangay || "");
    localStorage.setItem("pwHash", pwHash);
    localStorage.setItem("loginTime", Date.now().toString());
    localStorage.setItem("deviceInfo", JSON.stringify(getDeviceInfo()));

    // Set a session flag
    sessionStorage.setItem("authenticated", "true");

    console.log("LocalStorage set successfully. Items:", {
        username: user.Username,
        staffName: user.FullName,
        userRole: user.Role,
        assignedBarangay: user.AssignedBarangay
    });
}

// --------------------------
// Clear Session Data
// --------------------------
function clearSessionData() {
    localStorage.clear();
    sessionStorage.clear();
    console.log("Session data cleared");
}

// --------------------------
// Start Session Activity Tracking
// --------------------------
function startSessionActivityTracking(username) {
    // Clear any existing timer
    if (sessionActivityTimer) {
        clearInterval(sessionActivityTimer);
    }
    
    // Update activity every 5 minutes
    sessionActivityTimer = setInterval(async () => {
        try {
            await fetchJSON(API_URL, {
                action: "logActivity",
                username: username,
                action: "Session Activity"
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
async function fetchJSON(url, data) {
    try {
        // Convert data to FormData for Google Apps Script
        const formData = new FormData();
        for (const key in data) {
            formData.append(key, data[key]);
        }
        
        const response = await fetch(url, {
            method: "POST",
            body: formData
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

async function testAPIConnection() {
    console.log("Testing API connection...");
    try {
        // Test with GET request
        const testUrl = API_URL + "?action=test&t=" + Date.now();
        console.log("Testing URL:", testUrl);
        
        const response = await fetch(testUrl);
        const text = await response.text();
        console.log("API test response:", text);
        
        try {
            const data = JSON.parse(text);
            if (data.success) {
                console.log("✓ API connection successful");
                document.getElementById("statusText").innerText += " (API connected)";
            } else {
                console.log("✗ API returned error:", data.message);
            }
        } catch (e) {
            console.log("✗ API returned non-JSON response:", text);
        }
        
        return text;
    } catch (error) {
        console.error("API test failed:", error);
        document.getElementById("statusText").innerText += " (API disconnected)";
        return null;
    }
}

// Make functions available globally
window.handleForceLogout = handleForceLogout;
window.closeError = closeError;
