// filepath: src/components/NotificationManager.js
import { notificationService } from '../services/NotificationService.js';
import { authService } from '../services/AuthService.js';

export class NotificationManager {
    constructor() {
        this.notificationBtn = null;
        this.notificationDropdown = null;
        this.isOpen = false;
        this.notifications = [];
        this.initialized = false;
    }

    async init() {
        // Wait for DOM to be ready and find the notification button
        await this.waitForNotificationButton();
        
        if (!this.notificationBtn) {
            console.warn('Notification button not found, skipping notification manager initialization');
            return;
        }

        await this.createNotificationDropdown();
        this.setupEventListeners();
        
        // Initialize service if user is logged in
        const user = authService.getCurrentUser();
        if (user) {
            await notificationService.init();
        }

        this.initialized = true;
    }

    async waitForNotificationButton() {
        // Try to find the button immediately
        this.notificationBtn = document.getElementById('notification-btn');
        
        if (this.notificationBtn) {
            return;
        }

        // If not found, wait for it with a timeout
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds max wait
            
            const checkForButton = () => {
                this.notificationBtn = document.getElementById('notification-btn');
                
                if (this.notificationBtn || attempts >= maxAttempts) {
                    resolve();
                    return;
                }
                
                attempts++;
                setTimeout(checkForButton, 100);
            };
            
            checkForButton();
        });
    }

    async createNotificationDropdown() {
        if (!this.notificationBtn || !this.notificationBtn.parentNode) {
            console.error('Cannot create notification dropdown: notification button or parent not found');
            return;
        }

        const dropdown = document.createElement('div');
        dropdown.className = 'notification-dropdown hidden';
        dropdown.innerHTML = `
            <div class="notification-header">
                <h3>Thông báo</h3>
                <button class="mark-all-read-btn">Đánh dấu tất cả đã đọc</button>
            </div>
            <div class="notification-list">
                <div class="notification-loading">
                    <div class="loading-spinner"></div>
                    <p>Đang tải thông báo...</p>
                </div>
            </div>
            <div class="notification-footer">
                <button class="view-all-btn">Xem tất cả</button>
            </div>
        `;

        // Create a wrapper for positioning if needed
        let dropdownContainer = this.notificationBtn.parentNode.querySelector('.notification-container');
        
        if (!dropdownContainer) {
            dropdownContainer = document.createElement('div');
            dropdownContainer.className = 'notification-container';
            dropdownContainer.style.position = 'relative';
            dropdownContainer.style.display = 'inline-block';
            
            // Wrap the notification button
            this.notificationBtn.parentNode.insertBefore(dropdownContainer, this.notificationBtn);
            dropdownContainer.appendChild(this.notificationBtn);
        }

        dropdownContainer.appendChild(dropdown);
        this.notificationDropdown = dropdown;
    }

    setupEventListeners() {
        if (!this.notificationBtn || !this.notificationDropdown) {
            console.error('Cannot setup event listeners: required elements not found');
            return;
        }

        // Toggle dropdown
        this.notificationBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown();
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isOpen && !e.target.closest('.notification-dropdown') && !e.target.closest('#notification-btn')) {
                this.closeDropdown();
            }
        });

        // Mark all as read
        const markAllBtn = this.notificationDropdown.querySelector('.mark-all-read-btn');
        if (markAllBtn) {
            markAllBtn.addEventListener('click', () => {
                this.markAllAsRead();
            });
        }

        // View all notifications
        const viewAllBtn = this.notificationDropdown.querySelector('.view-all-btn');
        if (viewAllBtn) {
            viewAllBtn.addEventListener('click', () => {
                // Navigate to notifications page (implement if needed)
                this.closeDropdown();
            });
        }
// Listen for notification updates
    document.addEventListener('notificationCountUpdate', (e) => {
        this.updateNotificationBadge(e.detail.count);
    });

    document.addEventListener('newNotification', (e) => {
        // Ensure notifications array exists
        if (!this.notifications) {
            this.notifications = [];
        }
        
        // Handle both single notification and notifications array
        if (e.detail.notification) {
            // Single notification
            this.notifications.unshift(e.detail.notification);
        } else if (e.detail.notifications) {
            // Array of notifications
            this.notifications = e.detail.notifications;
        }
        
        if (this.isOpen) {
            this.renderNotifications();
        }
        
        // Show toast for new notification if it's unread
        const latestNotification = e.detail.notification || (e.detail.notifications && e.detail.notifications[0]);
        if (latestNotification && !latestNotification.read) {
            this.showNotificationToast(latestNotification);
        }
    });

        // Listen for auth state changes
        document.addEventListener('firestoreUserLoaded', async () => {
            if (this.initialized) {
                await notificationService.init();
            }
        });

        document.addEventListener('authStateChanged', async (e) => {
            if (e.detail.user && this.initialized) {
                await notificationService.init();
            } else if (!e.detail.user) {
                // Clear notifications when user logs out
                this.notifications = [];
                this.updateNotificationBadge(0);
                this.closeDropdown();
            }
        });
    }

    async toggleDropdown() {
        if (!this.initialized || !this.notificationDropdown) {
            return;
        }

        if (this.isOpen) {
            this.closeDropdown();
        } else {
            await this.openDropdown();
        }
    }

    async openDropdown() {
        if (!this.notificationDropdown) return;

        this.isOpen = true;
        this.notificationDropdown.classList.remove('hidden');
        
        // Check if user is authenticated
        const user = authService.getCurrentUser();
        if (!user) {
            this.renderError('Vui lòng đăng nhập để xem thông báo');
            return;
        }

        // Load notifications
        try {
            const result = await notificationService.loadNotifications();
            this.notifications = result.notifications;
            this.renderNotifications();
        } catch (error) {
            console.error('Error loading notifications:', error);
            this.renderError('Không thể tải thông báo');
        }
    }

    closeDropdown() {
        if (!this.notificationDropdown) return;
        
        this.isOpen = false;
        this.notificationDropdown.classList.add('hidden');
    }

renderNotifications() {
    const listContainer = this.notificationDropdown?.querySelector('.notification-list');
    if (!listContainer) return;
    
    // Ensure notifications array exists
    if (!this.notifications) {
        this.notifications = [];
    }
    
    if (this.notifications.length === 0) {
        listContainer.innerHTML = `
            <div class="notification-empty">
                <div class="empty-icon">🔔</div>
                <p>Chưa có thông báo nào</p>
            </div>
        `;
        return;
    }

    listContainer.innerHTML = this.notifications
        .map(notification => this.createNotificationHTML(notification))
        .join('');

    // Attach click listeners
    listContainer.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', () => {
            const notificationId = item.dataset.notificationId;
            this.handleNotificationClick(notificationId);
        });
    });
}

    createNotificationHTML(notification) {
        const timeAgo = this.getTimeAgo(notification.createdAt);
        const unreadClass = notification.read ? '' : 'unread';
        
        return `
            <div class="notification-item ${unreadClass}" data-notification-id="${notification.id}">
                <div class="notification-avatar">
                    ${notification.actorAvatar ? 
                        `<img src="${notification.actorAvatar}" alt="${notification.actorName}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                         <span class="avatar-text" style="display:none;">${notification.actorName?.charAt(0) || 'U'}</span>` :
                        `<span class="avatar-text">${notification.actorName?.charAt(0) || 'U'}</span>`
                    }
                </div>
                <div class="notification-content">
                    <div class="notification-message">${notification.message}</div>
                    ${notification.commentContent ? 
                        `<div class="notification-preview">"${notification.commentContent}..."</div>` : ''
                    }
                    <div class="notification-time">${timeAgo}</div>
                </div>
                <div class="notification-indicator">
                    ${!notification.read ? '<span class="unread-dot"></span>' : ''}
                </div>
            </div>
        `;
    }

    async handleNotificationClick(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (!notification) return;

        // Mark as read
        if (!notification.read) {
            try {
                await notificationService.markAsRead(notificationId);
            } catch (error) {
                console.error('Error marking notification as read:', error);
            }
        }

        // Navigate based on notification type
        try {
            switch (notification.type) {
                case 'like':
                case 'comment':
                    if (notification.postId && window.navigate) {
                        window.navigate(`/post/${notification.postId}`);
                    }
                    break;
                case 'follow':
                    if (notification.actorId && window.navigate) {
                        window.navigate(`/profile/${notification.actorId}`);
                    }
                    break;
            }
        } catch (error) {
            console.error('Error navigating from notification:', error);
        }

        this.closeDropdown();
    }

    async markAllAsRead() {
        try {
            await notificationService.markAllAsRead();
            this.renderNotifications();
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    }

    updateNotificationBadge(count) {
        if (!this.notificationBtn) return;

        let badge = this.notificationBtn.querySelector('.notification-badge');
        
        if (count > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'notification-badge';
                this.notificationBtn.appendChild(badge);
            }
            badge.textContent = count > 99 ? '99+' : count.toString();
        } else {
            badge?.remove();
        }
    }

    showNotificationToast(notification) {
        if (!notification || notification.read) return;

        // Don't show toast if dropdown is open
        if (this.isOpen) return;

        const toast = document.createElement('div');
        toast.className = 'notification-toast';
        toast.innerHTML = `
            <div class="toast-avatar">
                ${notification.actorAvatar ? 
                    `<img src="${notification.actorAvatar}" alt="${notification.actorName}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                     <span class="avatar-text" style="display:none;">${notification.actorName?.charAt(0) || 'U'}</span>` :
                    `<span class="avatar-text">${notification.actorName?.charAt(0) || 'U'}</span>`
                }
            </div>
            <div class="toast-content">
                <div class="toast-message">${notification.message}</div>
                <div class="toast-time">Vừa xong</div>
            </div>
        `;

        document.body.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Auto remove
        const autoRemoveTimeout = setTimeout(() => {
            this.removeToast(toast);
        }, 4000);

        // Click to navigate and remove
        toast.addEventListener('click', () => {
            clearTimeout(autoRemoveTimeout);
            this.handleNotificationClick(notification.id);
            this.removeToast(toast);
        });
    }

    removeToast(toast) {
        if (!toast || !toast.parentNode) return;

        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    renderError(message) {
        const listContainer = this.notificationDropdown?.querySelector('.notification-list');
        if (!listContainer) return;

        listContainer.innerHTML = `
            <div class="notification-error">
                <p>${message}</p>
                <button class="retry-btn">Thử lại</button>
            </div>
        `;

        const retryBtn = listContainer.querySelector('.retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                if (authService.getCurrentUser()) {
                    this.openDropdown();
                }
            });
        }
    }

    getTimeAgo(date) {
        if (!date) return 'Vừa xong';
        
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Vừa xong';
        if (minutes < 60) return `${minutes} phút trước`;
        if (hours < 24) return `${hours} giờ trước`;
        if (days < 7) return `${days} ngày trước`;
        
        return date.toLocaleDateString('vi-VN');
    }

    // Public method to check if initialized
    isInitialized() {
        return this.initialized;
    }

    // Public method to manually trigger initialization
    async forceInit() {
        if (!this.initialized) {
            await this.init();
        }
    }
}