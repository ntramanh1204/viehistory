import { dbService } from '../services/DatabaseService.js';
import { notificationService } from '../services/NotificationService.js';
import { authService } from '../services/AuthService.js';

export class NotificationTests {
    constructor() {
        this.testResults = [];
    }

    async runAllTests() {
        console.log('🧪 Starting notification tests...');
        
        const tests = [
            this.testCreateNotification,
            this.testLoadNotifications,
            this.testMarkAsRead,
            this.testRealtimeListener,
            this.testNotificationUI
        ];

        for (const test of tests) {
            try {
                await test.call(this);
            } catch (error) {
                console.error(`❌ Test failed: ${test.name}`, error);
                this.testResults.push({
                    test: test.name,
                    status: 'failed',
                    error: error.message
                });
            }
        }

        this.printTestResults();
    }

    async testCreateNotification() {
        console.log('🧪 Testing notification creation...');
        
        const user = authService.getCurrentUser();
        if (!user) {
            throw new Error('User not authenticated');
        }

        // Create test notification
        const notificationId = await dbService.createNotification({
            type: 'test',
            recipientId: user.uid,
            actorId: user.uid,
            actorName: 'Test Actor',
            message: 'This is a test notification'
        });

        if (notificationId) {
            console.log('✅ Notification created successfully:', notificationId);
            this.testResults.push({
                test: 'createNotification',
                status: 'passed',
                data: { notificationId }
            });
        }
    }

    async testLoadNotifications() {
        console.log('🧪 Testing notification loading...');
        
        const result = await notificationService.loadNotifications(5);
        
        if (result && Array.isArray(result.notifications)) {
            console.log('✅ Notifications loaded:', result.notifications.length);
            this.testResults.push({
                test: 'loadNotifications',
                status: 'passed',
                data: { count: result.notifications.length }
            });
        } else {
            throw new Error('Invalid notification result format');
        }
    }

    async testMarkAsRead() {
        console.log('🧪 Testing mark as read...');
        
        // Get first notification
        await notificationService.loadNotifications();
        const firstNotification = notificationService.notifications[0];
        
        if (!firstNotification) {
            console.log('⚠️ No notifications to test mark as read');
            return;
        }

        const wasRead = firstNotification.read;
        await notificationService.markAsRead(firstNotification.id);
        
        // Reload to check if it was marked
        await notificationService.loadNotifications();
        const updatedNotification = notificationService.notifications
            .find(n => n.id === firstNotification.id);

        if (updatedNotification && updatedNotification.read !== wasRead) {
            console.log('✅ Mark as read working');
            this.testResults.push({
                test: 'markAsRead',
                status: 'passed'
            });
        }
    }

    async testRealtimeListener() {
        console.log('🧪 Testing real-time listener...');
        
        return new Promise((resolve, reject) => {
            let listenerTriggered = false;
            
            const originalDispatch = document.dispatchEvent;
            document.dispatchEvent = function(event) {
                if (event.type === 'notificationCountUpdate') {
                    listenerTriggered = true;
                    console.log('✅ Real-time listener triggered');
                }
                return originalDispatch.call(this, event);
            };

            // Setup listener
            notificationService.setupRealtimeListener();
            
            // Simulate some time for listener to setup
            setTimeout(() => {
                document.dispatchEvent = originalDispatch;
                
                if (listenerTriggered) {
                    this.testResults.push({
                        test: 'realtimeListener',
                        status: 'passed'
                    });
                    resolve();
                } else {
                    reject(new Error('Real-time listener not triggered'));
                }
            }, 2000);
        });
    }

    async testNotificationUI() {
        console.log('🧪 Testing notification UI...');
        
        const notificationBtn = document.getElementById('notification-btn');
        const notificationManager = window.notificationManager;
        
        if (!notificationBtn) {
            throw new Error('Notification button not found');
        }

        if (!notificationManager) {
            throw new Error('Notification manager not initialized');
        }

        // Test button click
        notificationBtn.click();
        
        // Check if dropdown exists
        const dropdown = document.querySelector('.notification-dropdown');
        if (!dropdown) {
            throw new Error('Notification dropdown not created');
        }

        console.log('✅ Notification UI elements found');
        this.testResults.push({
            test: 'notificationUI',
            status: 'passed'
        });
    }

    printTestResults() {
        console.log('\n📊 Test Results Summary:');
        console.table(this.testResults);
        
        const passed = this.testResults.filter(r => r.status === 'passed').length;
        const failed = this.testResults.filter(r => r.status === 'failed').length;
        
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📈 Success Rate: ${((passed / this.testResults.length) * 100).toFixed(1)}%`);
    }

    // Quick test functions for manual testing
    static async quickTestLike() {
        const user = authService.getCurrentUser();
        if (!user) {
            console.error('Please log in first');
            return;
        }

        try {
            await dbService.createLikeNotification(
                'test-post-' + Date.now(),
                user.uid,
                user
            );
            console.log('✅ Like notification test completed');
        } catch (error) {
            console.error('❌ Like notification test failed:', error);
        }
    }

    static async quickTestComment() {
        const user = authService.getCurrentUser();
        if (!user) {
            console.error('Please log in first');
            return;
        }

        try {
            await dbService.createCommentNotification(
                'test-post-' + Date.now(),
                user.uid,
                user,
                'This is a test comment for notification testing'
            );
            console.log('✅ Comment notification test completed');
        } catch (error) {
            console.error('❌ Comment notification test failed:', error);
        }
    }

    static async quickTestLoad() {
        try {
            const result = await notificationService.loadNotifications();
            console.log('✅ Load test completed:', result);
        } catch (error) {
            console.error('❌ Load test failed:', error);
        }
    }
}

// Make tests available globally for manual testing
window.NotificationTests = NotificationTests;
window.testNotifications = {
    runAll: () => new NotificationTests().runAllTests(),
    like: NotificationTests.quickTestLike,
    comment: NotificationTests.quickTestComment,
    load: NotificationTests.quickTestLoad
};