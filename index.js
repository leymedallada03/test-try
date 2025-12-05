/* index.js — FINAL WORKING VERSION FOR GITHUB PAGES + APPS SCRIPT */

const API_URL = "https://script.google.com/macros/s/AKfycbx855bvwL5GABW5Xfmuytas3FbBikE1R44I7vNuhXNhfTly-MGMonkqPfeSngIt-7OMNA/exec";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("loginForm");
    if (form) {
        form.addEventListener("submit", handleLogin);
        
        // Remove any inline form handler that might interfere
        form.onsubmit = null;
    }
    
    // Clear any existing form submission handlers
    const loginBtn = document.getElementById("loginButton");
    if (loginBtn) {
        loginBtn.onclick = null;
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
// LOGIN HANDLER
// --------------------------
async function handleLogin(event) {
    event.preventDefault();
    event.stopPropagation();

    const msg = document.getElementById("statusText");
    const errorDiv = document.getElementById("loginError");
    const loginBtn = document.getElementById("loginButton");
    
    msg.innerText = "Please wait… validating account…";
    msg.style.color = "green";
    errorDiv.style.display = "none";

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (!username || !password) {
        showError("Please enter username and password.");
        return;
    }

    // Show loading state
    loginBtn.classList.add("btn-loading");
    loginBtn.disabled = true;

    const pwHash = await sha256(password);

    try {
        const formData = new FormData();
        formData.append("action", "login");
        formData.append("username", username);
        formData.append("pwHash", pwHash);

        const response = await fetch(API_URL, {
            method: "POST",
            body: formData   // ✔ NO HEADERS → NO CORS ERROR
        });

        // If Apps Script returns HTML instead of JSON (error case)
        const text = await response.text();

        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error("Non-JSON response:", text);
            showError("Server error. Contact administrator.");
            loginBtn.classList.remove("btn-loading");
            loginBtn.disabled = false;
            return;
        }

        if (!data.success) {
            showError("Login failed: " + data.message);
            loginBtn.classList.remove("btn-loading");
            loginBtn.disabled = false;
            return;
        }

        // -------------------------------
        // LOGIN SUCCESS — SAVE SESSION
        // -------------------------------
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
        localStorage.setItem("assignedBarangay", data.user.AssignedBarangay);
        localStorage.setItem("pwHash", pwHash);
        
        // Set a timestamp to prevent cache issues
        localStorage.setItem("loginTime", Date.now().toString());

        // Force a session flag
        sessionStorage.setItem("authenticated", "true");

        console.log("Login successful! LocalStorage set:", {
            username: data.user.Username,
            staffName: data.user.FullName,
            role: data.user.Role,
            assignedBarangay: data.user.AssignedBarangay
        });

        // Redirect to dashboard.html (NOT main.html)
        setTimeout(() => {
            // Use replace to prevent back button issues
            window.location.replace("dashboard.html");
        }, 800);

    } catch (err) {
        console.error("FETCH ERROR:", err);
        showError("Connection error. Please contact administrator.");
        loginBtn.classList.remove("btn-loading");
        loginBtn.disabled = false;
    }
}

// Helper function to show errors
function showError(message) {
    const errorDiv = document.getElementById("loginError");
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = "block";
        
        // Auto-hide error after 5 seconds
        setTimeout(() => {
            errorDiv.style.display = "none";
        }, 5000);
    }
}
