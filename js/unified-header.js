// ============================================
// GLOBAL HEADER JS - Professional Dropdown
// ============================================

function initGlobalHeader() {
    // Get user info from localStorage
    let userName = localStorage.getItem("staffName") || localStorage.getItem("username") || "User";
    const userRole = localStorage.getItem("userRole");
    const isAdmin = userRole && userRole.toLowerCase() === 'admin';
    
    // Truncate long names (over 20 characters) for display only
    if (userName.length > 20) {
        userName = userName.substring(0, 18) + '...';
    }
    
    // Update user name display
    const userFullnameEl = document.getElementById('userFullname');
    if (userFullnameEl) {
        userFullnameEl.innerText = userName;
        // Add title attribute for full name on hover
        const fullName = localStorage.getItem("staffName") || localStorage.getItem("username") || "User";
        userFullnameEl.title = fullName;
    }
    
    // Update user role display
    const userRoleEl = document.getElementById('userRole');
    if (userRoleEl) {
        userRoleEl.innerText = isAdmin ? 'Administrator' : 'Staff User';
    }
    
    // Initialize dropdown toggle
    const userDropdown = document.getElementById('userDropdown');
    const userBtn = document.getElementById('userBtn');
    
    if (userDropdown && userBtn) {
        // Remove any existing listeners
        const newUserBtn = userBtn.cloneNode(true);
        userBtn.parentNode.replaceChild(newUserBtn, userBtn);
        
        newUserBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            userDropdown.classList.toggle('active');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function() {
            userDropdown.classList.remove('active');
        });
    }
    
    // Handle logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        const newLogoutBtn = logoutBtn.cloneNode(true);
        logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
        
        newLogoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                localStorage.clear();
                sessionStorage.clear();
                window.location.replace('index.html?logout=true&t=' + Date.now());
            }
        });
    }
    
    // Handle admin-only elements
    const adminItems = document.querySelectorAll(".admin-only");
    adminItems.forEach(item => {
        if (isAdmin) {
            item.classList.add("admin-visible");
        } else {
            item.classList.remove("admin-visible");
        }
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlobalHeader);
} else {
    initGlobalHeader();
}