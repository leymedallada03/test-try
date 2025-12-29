// dashboard-listener.js
// Dashboard-specific real-time updates

class DashboardListener {
    constructor() {
        this.broadcaster = window.PurokDataBroadcaster;
        this.refreshTimeout = null;
        this.initialize();
    }
    
    initialize() {
        if (!this.broadcaster) {
            console.error('DataBroadcaster not found. Make sure data-broadcaster.js is loaded first.');
            return;
        }
        
        console.log('📊 DashboardListener initialized');
        
        // Listen for data changes
        this.unsubscribe = this.broadcaster.onDataChange(this.handleDataChange.bind(this));
        
        // Also listen to custom DOM event
        window.addEventListener('purokDataChanged', this.handleDataChange.bind(this));
        
        // Check for latest activity on load
        this.updateActivityDisplay();
        
        // Setup periodic refresh
        this.setupPeriodicRefresh();
        
        // Setup UI event listeners
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
        }, 1000); // Wait 1 second before refreshing
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
                background: linear-gradient(90deg, var(--accent1), var(--accent2));
                color: white;
                padding: 12px 18px;
                border-radius: var(--radius);
                box-shadow: var(--shadow-dark);
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
        
        // Call your existing loadDashboard function
        if (typeof loadDashboard === 'function') {
            loadDashboard(false);
        } else {
            console.warn('loadDashboard function not found');
        }
        
        // Update last updated time
        const now = new Date();
        const lastUpdatedEl = document.getElementById('lastUpdated');
        if (lastUpdatedEl) {
            lastUpdatedEl.innerText = formatTS ? formatTS(now) : now.toLocaleString();
            lastUpdatedEl.classList.add('pulse-update');
            setTimeout(() => lastUpdatedEl.classList.remove('pulse-update'), 1000);
        }
    }
    
    updateActivityDisplay() {
        const latest = this.broadcaster.getLatestActivity();
        if (latest && document.getElementById('lastUpdated')) {
            // Update the "Last Activity" card
            document.getElementById('lastUpdated').innerText = 
                formatTS ? formatTS(new Date(latest.timestamp)) : 
                new Date(latest.timestamp).toLocaleString();
            
            const detailsEl = document.getElementById('lastUpdatedDetails');
            if (detailsEl) {
                detailsEl.innerHTML = `
                    <div style="font-size: 11px; line-height: 1.4;">
                        <strong>${latest.action}</strong><br>
                        By: ${latest.actor}<br>
                        ${latest.details || ''}
                    </div>
                `;
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
        // Add manual refresh button to dashboard
        const header = document.querySelector('.content-header');
        if (header && !document.getElementById('manual-refresh-btn')) {
            const refreshBtn = document.createElement('button');
            refreshBtn.id = 'manual-refresh-btn';
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
            refreshBtn.style.cssText = `
                background: linear-gradient(90deg, var(--accent2), var(--accent1));
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: var(--radius-sm);
                cursor: pointer;
                font-size: 0.9rem;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: all 0.2s ease;
            `;
            refreshBtn.onmouseenter = () => {
                refreshBtn.style.transform = 'translateY(-2px)';
                refreshBtn.style.boxShadow = '0 4px 12px rgba(15,122,74,0.3)';
            };
            refreshBtn.onmouseleave = () => {
                refreshBtn.style.transform = 'translateY(0)';
                refreshBtn.style.boxShadow = 'none';
            };
            refreshBtn.onclick = () => {
                refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
                refreshBtn.disabled = true;
                
                this.broadcaster.forceRefresh();
                this.refreshDashboard();
                
                setTimeout(() => {
                    refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
                    refreshBtn.disabled = false;
                }, 1000);
            };
            
            header.appendChild(refreshBtn);
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
    document.addEventListener('DOMContentLoaded', () => {
        window.DashboardListener = new DashboardListener();
    });
}
