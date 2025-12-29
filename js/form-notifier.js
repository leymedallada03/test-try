// form-notifier.js
// For dataForm.html, records.html, and other pages that modify data
(function() {
    'use strict';
    
    class FormNotifier {
        constructor() {
            this.broadcaster = null;
            this.initialize();
        }
        
        initialize() {
            // Wait for broadcaster to be available
            const checkBroadcaster = () => {
                if (window.PurokDataBroadcaster) {
                    this.broadcaster = window.PurokDataBroadcaster;
                    this.setupFormInterception();
                    this.setupRecordInterception();
                    console.log('📝 FormNotifier initialized');
                } else {
                    // Try again in 100ms
                    setTimeout(checkBroadcaster, 100);
                }
            };
            
            checkBroadcaster();
        }
        
        setupFormInterception() {
            // For dataForm.html
            const forms = document.querySelectorAll('form');
            forms.forEach(form => {
                const originalSubmit = form.onsubmit || (() => true);
                
                form.onsubmit = (event) => {
                    // Let the form submit normally first
                    const result = originalSubmit.call(form, event);
                    
                    // If submission was successful, broadcast
                    if (result !== false) {
                        setTimeout(() => {
                            this.notifyFormSubmission(form);
                        }, 500);
                    }
                    
                    return result;
                };
            });
        }
        
        setupRecordInterception() {
            // For records.html - intercept delete buttons
            document.addEventListener('click', (event) => {
                const button = event.target.closest('button');
                if (!button) return;
                
                // Check if it's a delete button
                if (button.textContent.includes('Delete') || 
                    button.innerHTML.includes('trash') ||
                    button.classList.contains('delete-btn')) {
                    
                    // Get record info before deletion
                    const row = button.closest('tr');
                    const recordInfo = this.getRecordInfo(row);
                    
                    // Set up broadcast after confirmation
                    const originalOnClick = button.onclick;
                    button.onclick = (e) => {
                        const result = originalOnClick ? originalOnClick.call(button, e) : true;
                        
                        if (result !== false && this.broadcaster) {
                            setTimeout(() => {
                                this.broadcaster.broadcastChange(
                                    'Delete Household',
                                    `Deleted: ${recordInfo}`,
                                    { recordId: row.dataset.id || 'unknown' }
                                );
                            }, 300);
                        }
                        
                        return result;
                    };
                }
                
                // Check if it's an update button
                if (button.textContent.includes('Update') || 
                    button.textContent.includes('Save') ||
                    button.classList.contains('update-btn')) {
                    
                    const row = button.closest('tr');
                    const recordInfo = this.getRecordInfo(row);
                    
                    const originalOnClick = button.onclick;
                    button.onclick = (e) => {
                        const result = originalOnClick ? originalOnClick.call(button, e) : true;
                        
                        if (result !== false && this.broadcaster) {
                            setTimeout(() => {
                                this.broadcaster.broadcastChange(
                                    'Update Household',
                                    `Updated: ${recordInfo}`,
                                    { recordId: row.dataset.id || 'unknown' }
                                );
                            }, 300);
                        }
                        
                        return result;
                    };
                }
            });
        }
        
        notifyFormSubmission(form) {
            if (!this.broadcaster) return;
            
            // Extract form data for notification
            const formData = new FormData(form);
            const householdName = formData.get('Household Head Name') || 
                                 formData.get('Name of Household Member/s') || 
                                 'New Record';
            
            this.broadcaster.broadcastChange(
                'Create Record',
                `Added: ${householdName}`,
                { formId: form.id || 'unknown' }
            );
        }
        
        getRecordInfo(row) {
            if (!row) return 'Record';
            const cells = row.querySelectorAll('td');
            return cells.length > 0 ? (cells[0].textContent || 'Record') : 'Record';
        }
        
        // Manual notification (call this from your existing code)
        notifyManualChange(action, details, metadata = {}) {
            if (this.broadcaster) {
                this.broadcaster.broadcastChange(action, details, metadata);
            }
        }
    }
    
    // Auto-initialize on form/record pages
    if (window.location.pathname.includes('dataForm.html') || 
        window.location.pathname.includes('records.html')) {
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                window.FormNotifier = new FormNotifier();
            });
        } else {
            window.FormNotifier = new FormNotifier();
        }
    }
})();
