/* index.js — UPDATED FOR BOUND SCRIPT */
// For bound scripts (Google Apps Script attached to a Spreadsheet), the URL format is different
// It should be: https://script.google.com/macros/s/[SCRIPT_ID]/exec
// But since this is a bound script, you need to deploy it as a web app first
// After deployment, use the deployment URL here

// Replace this with your actual deployment URL (you'll get this after deploying the web app)
const API_URL = "https://script.google.com/macros/s/AKfycbx855bvwL5GABW5Xfmuytas3FbBikE1R44I7vNuhXNhfTly-MGMonkqPfeSngIt-7OMNA/exec";

document.addEventListener("DOMContentLoaded", () => {
    console.log("Login page loaded");
    
    const form = document.getElementById("loginForm");
    if (form) {
        console.log("Login form found");
        form.addEventListener("submit", handleLogin);
    }
    
    // Test API connection on load
    setTimeout(testAPIConnection, 1000);
});

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
// LOGIN HANDLER - UPDATED
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
        
        // Prepare request data - matching code.gs structure
        const requestData = {
            action: "login",
            username: username,
            pwHash: pwHash
        };
        
        console.log("Sending login request to:", API_URL);
        console.log("Request data:", requestData);

        // Send POST request - IMPORTANT: Use FormData or JSON based on your code.gs
        const startTime = Date.now();
        const formData = new FormData();
        formData.append("action", "login");
        formData.append("username", username);
        formData.append("pwHash", pwHash);
        
        const response = await fetch(API_URL, {
            method: "POST",
            body: formData,
            mode: 'no-cors' // IMPORTANT: Google Apps Script requires no-cors mode
        });
        
        const endTime = Date.now();
        console.log(`Request completed in ${endTime - startTime}ms`);
        
        // Note: With 'no-cors' mode, we can't read the response directly
        // This is a limitation of Google Apps Script web apps
        // You'll need to handle redirection or other methods
        
        // Alternative approach: Use JSONP or iframe for Google Apps Script
        // For now, let's assume login is successful and redirect to dashboard
        console.log("Assuming login successful for bound script...");
        
        // For bound scripts, you might need a different approach
        // Since we can't read the response with 'no-cors', let's try a different method
        
        // Try with JSON request
        const jsonResponse = await fetchJSON(API_URL, {
            action: "login",
            username: username,
            pwHash: pwHash
        });
        
        if (!jsonResponse.success) {
            console.log("Login failed:", jsonResponse.message);
            showError("Login failed: " + jsonResponse.message);
            loginBtn.classList.remove("btn-loading");
            loginBtn.disabled = false;
            return;
        }

        // -------------------------------
        // LOGIN SUCCESS
        // -------------------------------
        console.log("Login successful! User data:", jsonResponse.user);
        msg.innerText = "Login successful! Redirecting...";
        msg.style.color = "green";

        // Clear any existing storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Set new session data
        localStorage.setItem("loggedIn", "true");
        localStorage.setItem("username", jsonResponse.user.Username);
        localStorage.setItem("staffName", jsonResponse.user.FullName);
        localStorage.setItem("userRole", jsonResponse.user.Role);
        localStorage.setItem("role", jsonResponse.user.Role);
        localStorage.setItem("assignedBarangay", jsonResponse.user.AssignedBarangay || "");
        localStorage.setItem("pwHash", pwHash);
        localStorage.setItem("loginTime", Date.now().toString());

        // Set a session flag
        sessionStorage.setItem("authenticated", "true");

        console.log("LocalStorage set successfully. Items:", {
            username: jsonResponse.user.Username,
            staffName: jsonResponse.user.FullName,
            userRole: jsonResponse.user.Role,
            assignedBarangay: jsonResponse.user.AssignedBarangay
        });

        // Redirect to dashboard.html
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

// Helper function for making JSON requests to Google Apps Script
async function fetchJSON(url, data) {
    try {
        // Convert data to URL-encoded form data
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

// Helper function to show errors
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

// Test function to check API connectivity
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

// For Google Apps Script web apps, we need to handle CORS differently
// Add this function to handle cross-origin requests
function setupCORSWorkaround() {
    // Add a hidden iframe for making cross-origin requests
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.name = 'gsapi';
    document.body.appendChild(iframe);
    
    // Create a form for submitting to Google Apps Script
    const form = document.createElement('form');
    form.method = 'POST';
    form.target = 'gsapi';
    form.action = API_URL;
    form.style.display = 'none';
    document.body.appendChild(form);
    
    return form;
}
