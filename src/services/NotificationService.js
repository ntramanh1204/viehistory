import { dbService } from './DatabaseService.js';
import { authService } from './AuthService.js';

export class NotificationService {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.unsubscribe = null;
    }

    async init() {
        const user = authService.getCurrentUser();
        if (user && !user.isAnonymous) {
            await this.loadNotifications();
            this.setupRealtimeListener();
        }
    }

    async loadNotifications(limit = 20) {
        try {
            const user = authService.getCurrentUser();
            if (!user || user.isAnonymous) {
                throw new Error('User not authenticated');
            }

            const result = await dbService.getUserNotifications(user.uid, limit);
            this.notifications = result.notifications;
            this.updateUnreadCount();
            return result;
        } catch (error) {
            console.error('Error loading notifications:', error);
            throw error;
        }
    }

    async markAsRead(notificationId) {
        try {
            await dbService.markNotificationAsRead(notificationId);
            const notification = this.notifications.find(n => n.id === notificationId);
            if (notification) {
                notification.read = true;
                this.updateUnreadCount();
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    async markAllAsRead() {
        try {
            const user = authService.getCurrentUser();
            if (!user || user.isAnonymous) return;

            await dbService.markAllNotificationsAsRead(user.uid);
            this.notifications.forEach(n => n.read = true);
            this.updateUnreadCount();
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    }

    updateUnreadCount() {
        this.unreadCount = this.notifications.filter(n => !n.read).length;
        this.dispatchUnreadCountUpdate();
    }

    dispatchUnreadCountUpdate() {
        document.dispatchEvent(new CustomEvent('notificationCountUpdate', {
            detail: { count: this.unreadCount }
        }));
    }

    setupRealtimeListener() {
        const user = authService.getCurrentUser();
        if (user && !user.isAnonymous) {
            // Clean up existing listener
            if (this.unsubscribe) {
                this.unsubscribe();
            }

            this.unsubscribe = dbService.listenToUserNotifications(user.uid, (notifications) => {
                const hadNewNotifications = notifications.length > this.notifications.length;
                this.notifications = notifications;
                this.updateUnreadCount();
                
                if (hadNewNotifications && notifications.length > 0) {
                    this.dispatchNewNotification(notifications[0]);
                }
            });
        }
    }

    dispatchNewNotification(newNotification) {
        document.dispatchEvent(new CustomEvent('newNotification', {
            detail: { notification: newNotification }
        }));
    }

    cleanup() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
        this.notifications = [];
        this.unreadCount = 0;
    }
}

export const notificationService = new NotificationService();