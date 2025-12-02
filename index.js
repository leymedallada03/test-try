/* index.js — FINAL WORKING VERSION FOR GITHUB PAGES + APPS SCRIPT */

const API_URL = "https://script.google.com/macros/s/AKfycbx855bvwL5GABW5Xfmuytas3FbBikE1R44I7vNuhXNhfTly-MGMonkqPfeSngIt-7OMNA/exec";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("loginForm");
    if (form) form.addEventListener("submit", handleLogin);
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

    const msg = document.getElementById("statusText");
    msg.innerText = "Please wait… validating account…";
    msg.style.color = "green";

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (!username || !password) {
        msg.innerText = "Please enter username and password.";
        msg.style.color = "red";
        return;
    }

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
            msg.innerText = "Server error. Contact administrator.";
            msg.style.color = "red";
            return;
        }

        if (!data.success) {
            msg.innerText = "Login failed: " + data.message;
            msg.style.color = "red";
            return;
        }

        // -------------------------------
        // LOGIN SUCCESS — SAVE SESSION
        // -------------------------------
        msg.innerText = "Login successful!";
        msg.style.color = "green";

        localStorage.setItem("loggedIn", "1");
        localStorage.setItem("username", data.user.Username);
        localStorage.setItem("staffName", data.user.FullName);
        localStorage.setItem("role", data.user.Role);
        localStorage.setItem("assignedBarangay", data.user.AssignedBarangay);
        localStorage.setItem("pwHash", pwHash);

        setTimeout(() => {
            window.location.href = "main.html";
        }, 800);

    } catch (err) {
        console.error("FETCH ERROR:", err);
        msg.innerText = "Connection error. Please contact administrator.";
        msg.style.color = "red";
    }
}


















