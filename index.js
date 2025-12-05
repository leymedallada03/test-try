/* index.js — DEBUG VERSION */
const API_URL = "https://script.google.com/macros/s/AKfycbx855bvwL5GABW5Xfmuytas3FbBikE1R44I7vNuhXNhfTly-MGMonkqPfeSngIt-7OMNA/exec";

document.addEventListener("DOMContentLoaded", () => {
    console.log("Login page loaded");
    
    const form = document.getElementById("loginForm");
    if (form) {
        console.log("Login form found");
        form.addEventListener("submit", handleLogin);
    }
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
// LOGIN HANDLER - DEBUG VERSION
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
        
        // Prepare form data
        const formData = new FormData();
        formData.append("action", "login");
        formData.append("username", username);
        formData.append("pwHash", pwHash);
        
        console.log("Sending login request to:", API_URL);
        console.log("Request data:", {
            action: "login",
            username: username,
            pwHash: pwHash.substring(0, 10) + "..."
        });

        // Send request
        const startTime = Date.now();
        const response = await fetch(API_URL, {
            method: "POST",
            body: formData
        });
        const endTime = Date.now();
        
        console.log(`Request completed in ${endTime - startTime}ms`);
        console.log("Response status:", response.status, response.statusText);
        
        // Get response text
        const text = await response.text();
        console.log("Raw response text:", text);
        
        let data;
        try {
            data = JSON.parse(text);
            console.log("Parsed response data:", data);
        } catch (e) {
            console.error("Failed to parse JSON response:", e);
            console.error("Response was:", text);
            showError("Server returned invalid response. Contact administrator.");
            loginBtn.classList.remove("btn-loading");
            loginBtn.disabled = false;
            return;
        }

        if (!data.success) {
            console.log("Login failed:", data.message);
            showError("Login failed: " + data.message);
            loginBtn.classList.remove("btn-loading");
            loginBtn.disabled = false;
            return;
        }

        // -------------------------------
        // LOGIN SUCCESS
        // -------------------------------
        console.log("Login successful! User data:", data.user);
        msg.innerText = "Login successful! Redirecting...";
        msg.style.color = "green";

        // Clear any existing storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Set new session data
        localStorage.setItem("loggedIn", "true");
        localStorage.setItem("username", data.user.Username);
        localStorage.setItem("staffName", data.user.FullName);
        localStorage.setItem("userRole", data.user.Role);  // Important: dashboard.html expects "userRole"
        localStorage.setItem("role", data.user.Role);
        localStorage.setItem("assignedBarangay", data.user.AssignedBarangay || "");
        localStorage.setItem("pwHash", pwHash);
        localStorage.setItem("loginTime", Date.now().toString());

        // Set a session flag
        sessionStorage.setItem("authenticated", "true");

        console.log("LocalStorage set successfully. Items:", {
            username: data.user.Username,
            staffName: data.user.FullName,
            userRole: data.user.Role,
            assignedBarangay: data.user.AssignedBarangay
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
        const response = await fetch(API_URL + "?action=test&t=" + Date.now());
        const text = await response.text();
        console.log("API test response:", text);
        return text;
    } catch (error) {
        console.error("API test failed:", error);
        return null;
    }
}

// Run API test on page load (optional)
// window.addEventListener('load', () => {
//     setTimeout(testAPIConnection, 1000);
// });
