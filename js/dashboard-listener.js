// dashboard-listener.js
// Dashboard-specific real-time updates
(function() {
    'use strict';
    
    class DashboardListener {
        constructor() {
            this.broadcaster = null;
            this.refreshTimeout = null;
            this.initialize();
        }
        
        initialize() {
            // Wait for broadcaster to be available
            const checkBroadcaster = () => {
                if (window.PurokDataBroadcaster) {
                    this.broadcaster = window.PurokDataBroadcaster;
                    this.setupListeners();
                    console.log('📊 DashboardListener initialized');
                } else {
                    // Try again in 100ms
                    setTimeout(checkBroadcaster, 100);
                }
            };
            
            checkBroadcaster();
        }
        
        setupListeners() {
            // Listen for data changes
            this.unsubscribe = this.broadcaster.onDataChange(this.handleDataChange.bind(this));
            
            // Also listen to custom DOM event
            window.addEventListener('purokDataChanged', this.handleDataChange.bind(this));
            
            // Check for latest activity on load
            this.updateActivityDisplay();
            
            // Setup periodic refresh
            this.setupPeriodicRefresh();
            
            // Setup UI event listeners for existing button
            this.setupUIListeners();
        }
        
        handleDataChange(data) {
            console.log('📊 Dashboard received data change:', data);
            
            // Show visual notification
            this.showNotification(data);
            
            // Clear dashboard cache
            localStorage.removeItem('dashboardDataCache');
            
            // Debounced refresh to avoid multiple rapid refreshes
            if (this.refreshTimeout) {
                clearTimeout(this.refreshTimeout);
            }
            
            this.refreshTimeout = setTimeout(() => {
                this.refreshDashboard();
                this.updateActivityDisplay();
            }, 1000);
        }
        
        showNotification(data) {
            // Create or update notification element
            let notification = document.getElementById('data-change-notification');
            
            if (!notification) {
                notification = document.createElement('div');
                notification.id = 'data-change-notification';
                notification.style.cssText = `
                    position: fixed;
                    top: 80px;
                    right: 20px;
                    background: linear-gradient(90deg, #0f7a4a, #34b78f);
                    color: white;
                    padding: 12px 18px;
                    border-radius: 12px;
                    box-shadow: 0 6px 20px rgba(5,40,25,0.12);
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    animation: slideIn 0.3s ease;
                    max-width: 350px;
                `;
                document.body.appendChild(notification);
                
                // Add CSS animation
                const style = document.createElement('style');
                style.textContent = `
                    @keyframes slideIn {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                    @keyframes slideOut {
                        from { transform: translateX(0); opacity: 1; }
                        to { transform: translateX(100%); opacity: 0; }
                    }
                `;
                document.head.appendChild(style);
            }
            
            const icon = data.action === 'Delete Household' ? '🗑️' : 
                        data.action === 'Create Record' ? '➕' : '✏️';
            
            notification.innerHTML = `
                <div style="font-size: 1.2rem;">${icon}</div>
                <div>
                    <div style="font-weight: 600; font-size: 0.9rem;">${data.action}</div>
                    <div style="font-size: 0.8rem; opacity: 0.9;">${data.details || 'Data updated'}</div>
                    <div style="font-size: 0.7rem; opacity: 0.7; margin-top: 4px;">
                        ${new Date(data.timestamp).toLocaleTimeString()}
                    </div>
                </div>
                <button id="close-notification" style="margin-left: auto; background: none; border: none; color: white; cursor: pointer; font-size: 1.2rem;">×</button>
            `;
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.style.animation = 'slideOut 0.3s ease';
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.parentNode.removeChild(notification);
                        }
                    }, 300);
                }
            }, 5000);
            
            // Close button
            notification.querySelector('#close-notification').onclick = () => {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            };
        }
        
        refreshDashboard() {
            console.log('🔄 Refreshing dashboard data...');
            
            // Animate the existing refresh button if it exists
            const refreshBtn = document.getElementById('manual-refresh-btn');
            if (refreshBtn) {
                const originalHtml = refreshBtn.innerHTML;
                refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
                refreshBtn.disabled = true;
                
                // Call your existing loadDashboard function
                if (typeof loadDashboard === 'function') {
                    loadDashboard(false);
                } else {
                    console.warn('loadDashboard function not found');
                }
                
                setTimeout(() => {
                    refreshBtn.innerHTML = originalHtml;
                    refreshBtn.disabled = false;
                }, 1000);
            } else {
                if (typeof loadDashboard === 'function') {
                    loadDashboard(false);
                }
            }
            
            // Update last updated time
            const now = new Date();
            const lastUpdatedEl = document.getElementById('lastUpdated');
            if (lastUpdatedEl) {
                lastUpdatedEl.innerText = typeof formatTS === 'function' ? 
                    formatTS(now) : now.toLocaleString();
                
                // Add visual effect
                lastUpdatedEl.style.animation = 'none';
                setTimeout(() => {
                    lastUpdatedEl.style.animation = 'pulse 0.5s ease';
                }, 10);
            }
        }
        
        updateActivityDisplay() {
            if (!this.broadcaster) return;
            
            const latest = this.broadcaster.getLatestActivity();
            if (latest && document.getElementById('lastUpdated')) {
                const lastUpdatedEl = document.getElementById('lastUpdated');
                const detailsEl = document.getElementById('lastUpdatedDetails');
                
                if (lastUpdatedEl) {
                    const timestamp = new Date(latest.timestamp);
                    lastUpdatedEl.innerText = typeof formatTS === 'function' ? 
                        formatTS(timestamp) : timestamp.toLocaleString();
                }
                
                if (detailsEl) {
                    detailsEl.innerHTML = `
                        <div style="font-size: 11px; line-height: 1.4;">
                            <strong>${latest.action}</strong><br>
                            By: ${latest.actor}<br>
                            ${latest.details || ''}
                        </div>
                    `;
                }
                
                // Highlight the card
                const card = document.getElementById('lastUpdatedCard');
                if (card) {
                    card.classList.add('highlight-fade');
                    setTimeout(() => {
                        card.classList.remove('highlight-fade');
                    }, 2000);
                }
            }
        }
        
        setupPeriodicRefresh() {
            // Optional: Still refresh every 30 seconds for safety
            setInterval(() => {
                this.refreshDashboard();
            }, 30000);
        }
        
        setupUIListeners() {
            // Attach click handler to existing refresh button (not create it)
            const refreshBtn = document.getElementById('manual-refresh-btn');
            if (refreshBtn) {
                // Remove any existing listeners
                const newRefreshBtn = refreshBtn.cloneNode(true);
                refreshBtn.parentNode.replaceChild(newRefreshBtn, refreshBtn);
                
                newRefreshBtn.onclick = (e) => {
                    e.preventDefault();
                    const originalHtml = newRefreshBtn.innerHTML;
                    newRefreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
                    newRefreshBtn.disabled = true;
                    
                    if (this.broadcaster) {
                        this.broadcaster.forceRefresh();
                    }
                    this.refreshDashboard();
                    
                    setTimeout(() => {
                        newRefreshBtn.innerHTML = originalHtml;
                        newRefreshBtn.disabled = false;
                    }, 1000);
                };
            }
        }
        
        destroy() {
            if (this.unsubscribe) {
                this.unsubscribe();
            }
            window.removeEventListener('purokDataChanged', this.handleDataChange);
            if (this.refreshTimeout) {
                clearTimeout(this.refreshTimeout);
            }
        }
    }
    
    // Auto-initialize on dashboard page
    if (window.location.pathname.includes('dashboard.html')) {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                window.DashboardListener = new DashboardListener();
            });
        } else {
            window.DashboardListener = new DashboardListener();
        }
    }
})();