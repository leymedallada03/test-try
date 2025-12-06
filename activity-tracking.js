// Activity Tracking for All Pages
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx855bvwL5GABW5Xfmuytas3FbBikE1R44I7vNuhXNhfTly-MGMonkqPfeSngIt-7OMNA/exec";

// Log user activity to server
// Log user activity to server
function logUserActivityToServer(action = "Page View") {
  const username = localStorage.getItem("username") || 
                   localStorage.getItem("staffName") || 
                   "Unknown";
  
  if (username !== "Unknown") {
    // Send activity to server
    fetch(SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `action=logActivity&username=${encodeURIComponent(username)}&actor=${encodeURIComponent(username)}&action=${encodeURIComponent(action)}`
    }).catch(() => {
      // Silently fail if server is unreachable
      console.log('Activity logging failed (server unreachable)');
    });
  }
}

// Initialize activity tracking
function initActivityTracking() {
  // Log initial page view
  const pageTitle = document.title || "Unknown Page";
  logUserActivityToServer(`Viewed ${pageTitle}`);
  
  // Log activity on user interactions (clicks)
  document.addEventListener('click', function() {
    logUserActivityToServer("User Interaction");
  }, { once: false, passive: true });
  
  // Log activity when page becomes visible (user switches back to tab)
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
      logUserActivityToServer("Page Became Visible");
    }
  });
  
  // Log activity every 5 minutes to keep session alive
  setInterval(() => {
    logUserActivityToServer("Active Session");
  }, 5 * 60 * 1000); // 5 minutes
  
  // Log activity on form submissions
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    form.addEventListener('submit', function() {
      const formName = this.getAttribute('name') || this.id || 'Form';
      logUserActivityToServer(`Submitted ${formName}`);
    });
  });
  
  // Log activity on important button clicks
  const importantButtons = document.querySelectorAll('#logoutBtn, #saveBtn, #submitBtn, #deleteBtn');
  importantButtons.forEach(button => {
    button.addEventListener('click', function() {
      const buttonText = this.textContent.trim() || this.getAttribute('id') || 'Button';
      logUserActivityToServer(`Clicked ${buttonText}`);
    });
  });
  
  console.log('Activity tracking initialized');
}

// Enhanced logout with activity logging
function enhancedLogout() {
  const userName = localStorage.getItem("staffName") || localStorage.getItem("username") || "User";
  
  // Try to log logout activity (but don't wait for it)
  fetch(SCRIPT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
 body: `action=logActivity&username=${encodeURIComponent(userName)}&actor=${encodeURIComponent(userName)}&action=User Logout`
  }).catch(() => {
    // Ignore errors on logout
  });
  
  // Clear storage and redirect
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = 'index.html?logout=true&t=' + Date.now();
}

// Add this to your existing logout buttons
document.addEventListener('DOMContentLoaded', function() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', enhancedLogout);
  }
  
  // Initialize activity tracking
  initActivityTracking();
});

// Session activity checker
function checkSessionActivity() {
  // Check if session is still valid
  const lastActivity = sessionStorage.getItem('lastActivity');
  const now = Date.now();
  
  if (lastActivity) {
    const inactivityTime = now - parseInt(lastActivity);
    const maxInactivity = 30 * 60 * 1000; // 30 minutes
    
    if (inactivityTime > maxInactivity) {
      // Session expired
      showToast('Session expired due to inactivity', 'error');
      setTimeout(() => {
        enhancedLogout();
      }, 2000);
    }
  }
  
  // Update last activity time
  sessionStorage.setItem('lastActivity', now.toString());
}

// Update activity on user interactions
document.addEventListener('click', checkSessionActivity);
document.addEventListener('keypress', checkSessionActivity);
document.addEventListener('scroll', checkSessionActivity);

// Check session every minute
setInterval(checkSessionActivity, 60 * 1000);
