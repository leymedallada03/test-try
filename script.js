/* ==============================
   APP.JS — Handles Login, Routing, API Calls
   For Alitagtag DRRM Data Management System
   ============================== */

// ======== CONFIG ========
const API_URL = "https://script.google.com/macros/s/AKfycbxjeV8tRepnPhKYG7ZfO5O6kkO7r2nUXc23zDgUonHBFvm0K29NGzcUI5qdzOBfbQRclA/exec"; // replace after deployment

// ======== SESSION HANDLING ========
function saveSession(user) {
    localStorage.setItem("user", JSON.stringify(user));
}

function getSession() {
    return JSON.parse(localStorage.getItem("user"));
}

function logout() {
    localStorage.removeItem("user");
    window.location.href = "index.html";
}

// ======== PAGE LOAD CHECK ========
window.onload = () => {
    if (location.pathname.includes("login")) return;

    const user = getSession();
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    document.getElementById("userArea").textContent = `Logged in as ${user.fullname} (${user.role})`;
};

// ======== ROUTING ========
function loadPage(page) {
    fetch(page)
        .then(res => res.text())
        .then(html => {
            document.getElementById("contentArea").innerHTML = html;
        });
}

function goDashboard() { loadPage("dashboard.html"); }
function goDataForm() { loadPage("dataForm.html"); }
function goRecords() { loadPage("records.html"); }
function goCharts() { loadPage("charts.html"); }
function goUsers() { loadPage("users.html"); }

// ======== LOGIN FUNCTION ========
async function loginUser() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!username || !password) {
        alert("Fill in all fields.");
        return;
    }

    const hashed = await sha256(password);

    const url = `${API_URL}?action=login&user=${username}&pass=${hashed}`;
    const response = await fetch(url);
    const result = await response.json();

    if (result.status === "success") {
        saveSession(result.user);
        window.location.href = "index.html";
    } else {
        alert("Invalid login");
    }
}

// ======== SHA-256 HASHING ========
async function sha256(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ======== SUBMIT DATA FORM ========
async function submitDataForm(formData) {
    const url = `${API_URL}?action=submit`;

    const response = await fetch(url, {
        method: "POST",
        body: JSON.stringify(formData)
    });

    const result = await response.text();

    alert("Data saved successfully.");
}




