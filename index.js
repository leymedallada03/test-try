/* index.js — FIXED FOR GITHUB PAGES (NO CORS ERROR) */

const API_URL = "https://script.google.com/macros/s/AKfycbznS5fEmL0qa-UOeMf4W5KWS8RJNH2VrPlN1b4IJfi25pTGHcjgYZ2wrbsbml_bqDxFOQ/exec";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("loginForm");
    if (form) form.addEventListener("submit", handleLogin);
});

async function sha256(str) {
    const utf8 = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest("SHA-256", utf8);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

async function handleLogin(e) {
    e.preventDefault();

    const msg = document.getElementById("statusText");
    msg.innerText = "Please wait… validating account…";
    msg.style.color = "orange";

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (!username || !password) {
        msg.innerText = "Please enter username and password.";
        msg.style.color = "red";
        return;
    }

    const pwHash = await sha256(password);

    try {
        const form = new FormData();
        form.append("action", "login");
        form.append("username", username);
        form.append("pwHash", pwHash);

        const res = await fetch(API_URL, {
            method: "POST",
            body: form   // IMPORTANT: No headers → avoids CORS preflight
        });

        const data = await res.json();

        if (!data.success) {
            msg.innerText = "Login failed: " + data.message;
            msg.style.color = "red";
            return;
        }

        msg.innerText = "Login successful!";
        msg.style.color = "green";

        localStorage.setItem("loggedIn", "1");
        localStorage.setItem("username", data.user.Username);
        localStorage.setItem("staffName", data.user.FullName);
        localStorage.setItem("role", data.user.Role);
        localStorage.setItem("assignedBarangay", data.user.AssignedBarangay);
        localStorage.setItem("pwHash", pwHash);

        setTimeout(() => {
            window.location.href = "Dashboard.html";
        }, 800);

    } catch (err) {
        console.error(err);
        msg.innerText = "Connection error. Please contact administrator.";
        msg.style.color = "red";
    }
}

