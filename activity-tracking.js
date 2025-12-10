// Activity Tracking for All Pages
// Only define SCRIPT_URL globally if it doesn't already exist
if (typeof window.SCRIPT_URL === 'undefined') {
  window.SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx855bvwL5GABW5Xfmuytas3FbBikE1R44I7vNuhXNhfTly-MGMonkqPfeSngIt-7OMNA/exec";
}

// Session constants
if (typeof window.SESSION_CHECK_INTERVAL === 'undefined') {
  window.SESSION_CHECK_INTERVAL = 30000; // Check every 30 seconds
}
if (typeof window.MAX_INACTIVITY === 'undefined') {
  window.MAX_INACTIVITY = 30 * 60 * 1000; // 30 minutes
}
if (typeof window.MIN_UPDATE_INTERVAL === 'undefined') {
  window.MIN_UPDATE_INTERVAL = 10000; // 10 seconds minimum between updates
}

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

// Enhanced updateSessionActivity function that tracks viewing
let lastActiveUpdate = 0;

function updateSessionActivity() {
  const now = Date.now();
  
  // Don't update too frequently (reduce server load)
  if (now - lastActiveUpdate < MIN_UPDATE_INTERVAL) {
    return;
  }
  
  lastActiveUpdate = now;
  
  // Update session storage
  sessionStorage.setItem('lastActivity', now.toString());
  
  // Also send to server if user is logged in
  const username = localStorage.getItem("username") || localStorage.getItem("staffName");
  const sessionId = localStorage.getItem("sessionId");
  
  if (username && sessionId) {
    fetch(SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `action=logActivity&username=${encodeURIComponent(username)}&actor=${encodeURIComponent(username)}&action=Session Activity`
    }).catch(() => {
      // Silently fail if server unreachable
    });
  }
}

// Enhanced session validation
function validateSession() {
  const username = localStorage.getItem("username") || localStorage.getItem("staffName");
  const sessionId = localStorage.getItem("sessionId");
  
  if (!username || !sessionId) {
    // No session data found, force logout
    enhancedLogout();
    return false;
  }
  
  // Send validation request to server
  fetch(SCRIPT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `action=validateSession&username=${encodeURIComponent(username)}&sessionId=${encodeURIComponent(sessionId)}`
  })
  .then(response => response.json())
  .then(data => {
    if (!data.success || !data.isLoggedIn) {
      // Session invalid or expired
      showToast('Session expired or invalid', 'error');
      setTimeout(() => {
        enhancedLogout();
      }, 2000);
    } else {
      // Session valid, update activity timestamp
      sessionStorage.setItem('lastActivity', Date.now().toString());
    }
  })
  .catch(() => {
    // If server unreachable, maintain local session but log warning
    console.warn('Session validation failed (server unreachable)');
  });
}

// Enhanced session activity checker
function checkSessionActivity() {
  // Check if session is still valid locally first
  const lastActivity = sessionStorage.getItem('lastActivity');
  const now = Date.now();
  
  if (lastActivity) {
    const inactivityTime = now - parseInt(lastActivity);
    
    if (inactivityTime > window.MAX_INACTIVITY) {
      // Local session expired
      showToast('Session expired due to inactivity', 'error');
      setTimeout(() => {
        enhancedLogout();
      }, 2000);
      return;
    }
  }
  
  // Update last activity time
  sessionStorage.setItem('lastActivity', now.toString());
  
  // Validate session with server periodically
  validateSession();
}

// Initialize activity tracking with passive viewing support
function initActivityTracking() {
  // Log initial page view
  const pageTitle = document.title || "Unknown Page";
  logUserActivityToServer(`Viewed ${pageTitle}`);
  
  // Update session immediately on page load
  updateSessionActivity();
  
  // Track passive viewing time
  let pageVisibleStart = Date.now();
  let totalViewTime = 0;
  
  // When page becomes visible
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
      // Page became visible - start tracking view time
      pageVisibleStart = Date.now();
      logUserActivityToServer("Page Became Visible");
      updateSessionActivity();
    } else {
      // Page hidden - calculate and log view time
      const viewDuration = Date.now() - pageVisibleStart;
      totalViewTime += viewDuration;
      
      // Log view time if more than 30 seconds
      if (viewDuration > 30000) {
        logUserActivityToServer(`Viewed page for ${Math.round(viewDuration/1000)} seconds`);
      }
    }
  });
  
  // Track passive viewing every 30 seconds (user just looking at the page)
  let passiveViewInterval;
  
  function startPassiveViewTracking() {
    if (passiveViewInterval) clearInterval(passiveViewInterval);
    
    passiveViewInterval = setInterval(() => {
      if (!document.hidden) {
        // User is viewing the page (tab is active)
        updateSessionActivity();
        logUserActivityToServer("Passive Viewing");
      }
    }, 30000); // Every 30 seconds
  }
  
  // Start passive tracking when page is visible
  if (!document.hidden) {
    startPassiveViewTracking();
  }
  
  // Restart tracking when page becomes visible
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
      startPassiveViewTracking();
    } else {
      if (passiveViewInterval) {
        clearInterval(passiveViewInterval);
        passiveViewInterval = null;
      }
    }
  });
  
  // Log activity on user interactions (clicks)
  document.addEventListener('click', function(event) {
    updateSessionActivity();
    
    // Only log clicks on interactive elements
    const interactiveElements = ['button', 'a', 'input', 'select', 'textarea', '[role="button"]'];
    const target = event.target;
    const isInteractive = interactiveElements.some(selector => 
      target.matches(selector) || target.closest(selector)
    );
    
    if (isInteractive) {
      const elementName = target.textContent?.trim() || 
                         target.getAttribute('id') || 
                         target.getAttribute('name') || 
                         target.tagName.toLowerCase();
      logUserActivityToServer(`Clicked ${elementName}`);
    }
  }, { once: false, passive: true });
  
  // Track scroll activity (user is reading/viewing)
  let scrollTimeout;
  document.addEventListener('scroll', function() {
    updateSessionActivity();
    
    // Debounce scroll events
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      logUserActivityToServer("Page Scrolled");
    }, 1000);
  }, { passive: true });
  
  // Track keyboard activity
  document.addEventListener('keydown', function(event) {
    // Don't track modifier keys alone
    if (!['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(event.key)) {
      updateSessionActivity();
      logUserActivityToServer("Keyboard Input");
    }
  }, { passive: true });
  
  // Track mouse movement (shows user is present)
  let mouseMoveTimeout;
  document.addEventListener('mousemove', function() {
    updateSessionActivity();
    
    clearTimeout(mouseMoveTimeout);
    mouseMoveTimeout = setTimeout(() => {
      logUserActivityToServer("Mouse Movement");
    }, 5000);
  }, { passive: true });
  
  // Track data loading/fetch requests
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    updateSessionActivity();
    
    // Check if this is a data fetch (not activity logging)
    const url = args[0];
    if (typeof url === 'string' && !url.includes('logActivity') && !url.includes('validateSession')) {
      logUserActivityToServer("Data Fetch");
    }
    
    return originalFetch.apply(this, args);
  };
  
  // Track AJAX requests (for older XMLHttpRequest)
  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    this._requestUrl = url;
    return originalXHROpen.apply(this, arguments);
  };
  
  const originalXHRSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function(body) {
    updateSessionActivity();
    
    // Check if this is a data request
    if (this._requestUrl && 
        !this._requestUrl.includes('logActivity') && 
        !this._requestUrl.includes('validateSession')) {
      logUserActivityToServer("AJAX Request");
    }
    
    return originalXHRSend.apply(this, arguments);
  };
  
  // Track form submissions
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    form.addEventListener('submit', function() {
      const formName = this.getAttribute('name') || this.id || 'Form';
      updateSessionActivity();
      logUserActivityToServer(`Submitted ${formName}`);
    });
  });
  
  // Log activity on important button clicks
  const importantButtons = document.querySelectorAll('#logoutBtn, #saveBtn, #submitBtn, #deleteBtn');
  importantButtons.forEach(button => {
    button.addEventListener('click', function() {
      const buttonText = this.textContent.trim() || this.getAttribute('id') || 'Button';
      updateSessionActivity();
      logUserActivityToServer(`Clicked ${buttonText}`);
    });
  });
  
  // Track data table interactions (if you have tables)
  const tables = document.querySelectorAll('table');
  tables.forEach(table => {
    // Add observer for table changes (new data loaded)
    const observer = new MutationObserver(() => {
      updateSessionActivity();
      logUserActivityToServer("Table Data Updated");
    });
    
    observer.observe(table, { 
      childList: true, 
      subtree: true,
      attributes: false,
      characterData: false
    });
  });
  
  // Track image/video loading (user is viewing content)
  const mediaElements = document.querySelectorAll('img, video');
  mediaElements.forEach(media => {
    media.addEventListener('load', () => {
      updateSessionActivity();
    });
  });
  
  // Log activity every 5 minutes to keep session alive
  setInterval(() => {
    if (!document.hidden) {
      updateSessionActivity();
      logUserActivityToServer("Active Session");
    }
  }, 5 * 60 * 1000); // 5 minutes
  
  console.log('Enhanced activity tracking initialized with passive viewing support');
}

// Enhanced logout with activity logging
function enhancedLogout() {
  const userName = localStorage.getItem("staffName") || localStorage.getItem("username") || "User";
  const sessionId = localStorage.getItem("sessionId");
  
  if (userName && sessionId) {
    // Try to log logout activity (but don't wait for it)
    fetch(SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `action=logout&username=${encodeURIComponent(userName)}&sessionId=${encodeURIComponent(sessionId)}`
    }).catch(() => {
      // Ignore errors on logout
    });
    
    // Also send beacon for immediate logout
    navigator.sendBeacon(SCRIPT_URL, 
      `action=logActivity&username=${encodeURIComponent(userName)}&actor=${encodeURIComponent(userName)}&action=User Logout`
    );
  }
  
  // Clear storage and redirect
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = 'index.html?logout=true&t=' + Date.now();
}

// Session activity checker (legacy - now integrated into initActivityTracking)
function checkSessionActivityLegacy() {
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

// Store session with expiration
function storeSession(userData, sessionId) {
  const sessionData = {
    user: userData,
    sessionId: sessionId,
    timestamp: Date.now(),
    expires: Date.now() + (8 * 60 * 60 * 1000) // 8 hours from now
  };
  
  localStorage.setItem("sessionData", JSON.stringify(sessionData));
  localStorage.setItem("username", userData.Username);
  localStorage.setItem("sessionId", sessionId);
}

// Check stored session on page load
function checkStoredSession() {
  const sessionDataStr = localStorage.getItem("sessionData");
  
  if (!sessionDataStr) {
    return null;
  }
  
  try {
    const sessionData = JSON.parse(sessionDataStr);
    
    // Check if session expired
    if (Date.now() > sessionData.expires) {
      localStorage.removeItem("sessionData");
      return null;
    }
    
    return sessionData;
  } catch (e) {
    localStorage.removeItem("sessionData");
    return null;
  }
}

// Main initialization
document.addEventListener('DOMContentLoaded', function() {
  // Check for logout parameter on page load
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('logout')) {
    // Clear any residual session data
    localStorage.clear();
    sessionStorage.clear();
    
    // Remove logout parameter from URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  
  // Check for stored session
  const storedSession = checkStoredSession();
  if (storedSession) {
    // Session exists, update activity
    updateSessionActivity();
  }
  
  // Setup logout button if exists
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', enhancedLogout);
  }
  
  // Initialize enhanced activity tracking
  initActivityTracking();
  
  // Check session more frequently
  setInterval(checkSessionActivity, SESSION_CHECK_INTERVAL);
  
  // Check session immediately on load
  checkSessionActivity();
  
  // Clear session on page unload (closing tab/window)
  window.addEventListener('beforeunload', function() {
    const username = localStorage.getItem("username") || localStorage.getItem("staffName");
    if (username) {
      // Try to log page unload (but may not complete)
      navigator.sendBeacon(SCRIPT_URL, 
        `action=logActivity&username=${encodeURIComponent(username)}&actor=${encodeURIComponent(username)}&action=Page Unload`
      );
    }
  });
});
