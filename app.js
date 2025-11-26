/* app.js - unified script for dashboard + pages
   Updated: uses the correct API_URL, improved error handling and common init.
*/

// ===== Dynamic API URL =====
const API_URL = "https://script.google.com/macros/s/AKfycbwvsnkQecbpRN2IsWr-MhZoM0Jl8tRubM7t1X8hT7oUjHPPXOZ4UwPntqnrkflWMOscmA/exec";

// ===========================

// Guard: ensure logged in
function ensureLoginOrRedirect() {
  if (!localStorage.getItem("loggedIn")) {
    window.location.href = "index.html";
    return false;
  }
  return true;
}

// Common page initializer
function commonInit() {
  if (!ensureLoginOrRedirect()) return;

  const name = localStorage.getItem("staffName") || "";
  document.querySelectorAll("#userName, #userArea").forEach(el => {
    if (el) el.innerText = name;
  });

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  // Hide Admin-only links
  if ((localStorage.getItem("role") || "").toLowerCase() !== "admin") {
    document.querySelectorAll(".admin-only").forEach(el => {
      el.style.display = "none";
    });
  }
}

// Logout user + backend logging
async function logout() {
  try {
    const auth = {
      username: localStorage.getItem("username"),
      pwHash: localStorage.getItem("pwHash")
    };

    // backend logging (non-blocking)
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout", auth })
    }).catch(() => {});
  } catch (e) {}

  localStorage.clear();
  window.location.href = "login.html";
}

// GET request
async function apiGet(params = {}) {
  const q = new URLSearchParams(params).toString();
  const url = API_URL + (q ? "?" + q : "");

  const res = await fetch(url, { credentials: "omit" });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error("API error: " + res.status + " " + res.statusText + " " + t);
  }
  return res.json();
}

// POST request
async function apiPost(obj = {}) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj)
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error("API POST error: " + res.status + " " + res.statusText + " " + t);
  }

  return res.json();
}

// Sidebar toggle UI
document.addEventListener("DOMContentLoaded", () => {
  commonInit();

  const toggle = document.getElementById("menuToggle");
  const sidebar = document.querySelector(".sidebar");

  if (toggle && sidebar) {
    toggle.addEventListener("click", () => {
      sidebar.classList.toggle("hidden");
      toggle.setAttribute("aria-expanded", !sidebar.classList.contains("hidden"));
      if (sidebar.classList.contains("hidden")) {
        document.querySelector(".content-area")?.focus();
      }
    });
  }
});





