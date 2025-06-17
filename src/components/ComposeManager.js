import { authService } from '../services/AuthService.js';
import { dbService } from '../services/DatabaseService.js';

export class ComposeManager {
    constructor() {
        this.textarea = document.getElementById('composeTextarea');
        this.submitBtn = document.getElementById('post-submit-btn');
        this.focusBtn = document.getElementById('focus-compose-btn');
        this.fabBtn = document.getElementById('fab-compose-btn');
        this.userAvatar = document.querySelector('.compose-area .user-avatar');
        this.currentTopic = '';
        this.isSubmitting = false;
    }

    init() {
        this.setupEventListeners();
        this.setupAuthListener();
    }

    setupAuthListener() {
        // Listen for auth state changes to update UI
        authService.onAuthStateChange((user) => {
            this.updateUserAvatar();
            this.updateSubmitButtonState();
        });
    }

    setupEventListeners() {
        // Topic selection
        document.querySelectorAll('.pill-button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectTopic(e.target, e.target.dataset.topic);
            });
        });

        // Submit post
        this.submitBtn.addEventListener('click', () => {
            this.handlePostSubmit();
        });

        // Focus compose
        this.focusBtn?.addEventListener('click', () => {
            this.focusCompose();
        });

        this.fabBtn?.addEventListener('click', () => {
            this.focusCompose();
        });

        // Textarea auto-resize
        this.textarea.addEventListener('input', () => {
            this.autoResize();
            this.updateSubmitButtonState();
        });

        // Keyboard shortcuts
        this.textarea.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                this.handlePostSubmit();
            }
        });
    }

    selectTopic(buttonEl, topicName) {
        document.querySelectorAll('.pill-button').forEach(btn =>
            btn.classList.remove('active')
        );
        buttonEl.classList.add('active');
        this.currentTopic = topicName;
    }

    async handlePostSubmit() {
        const content = this.textarea.value.trim();
        if (!content) {
            this.shakeTextarea();
            return;
        }

        if (this.isSubmitting) {
            return; // Prevent double submission
        }

        // Check if user is signed in
        if (!authService.isSignedIn()) {
            // Show auth modal with specific message
            const event = new CustomEvent('showAuthModal', {
                detail: {
                    message: 'Đăng nhập để chia sẻ bài viết của bạn'
                }
            });
            document.dispatchEvent(event);
            return;
        }

        try {
            // Set loading state
            this.setSubmitLoading(true);

            // Get current user (already signed in)
            const user = authService.getCurrentUser();

            // Prepare post data
            const postData = {
                content: content,
                topic: this.currentTopic
            };

            // Save to database
            const postId = await dbService.createPost(postData, user);

            // Show success feedback
            this.showSuccessMessage('Đã đăng bài thành công!');

            // Get user display info for local display
            const userInfo = authService.getUserDisplayInfo();

            // Dispatch event for FeedManager (local display)
            const event = new CustomEvent('newPost', {
                detail: {
                    id: postId,
                    content: content,
                    topic: this.currentTopic,
                    author: {
                        displayName: userInfo.displayName,
                        avatar: userInfo.avatar,
                        photoURL: userInfo.photoURL
                    },
                    createdAt: new Date(),
                    stats: {
                        likes: 0,
                        comments: 0,
                        shares: 0
                    }
                }
            });
            document.dispatchEvent(event);

            // Reset form
            this.resetForm();

        } catch (error) {
            console.error('Error submitting post:', error);
            this.showErrorMessage(error.message || 'Có lỗi xảy ra khi đăng bài');
        } finally {
            this.setSubmitLoading(false);
        }
    }

    setSubmitLoading(loading) {
        this.isSubmitting = loading;
        this.submitBtn.disabled = loading;

        if (loading) {
            this.submitBtn.textContent = 'Đang đăng...';
            this.submitBtn.style.opacity = '0.7';
        } else {
            this.submitBtn.textContent = 'Đăng dòng';
            this.submitBtn.style.opacity = '1';
        }
    }

    updateUserAvatar() {
        if (this.userAvatar) {
            const userInfo = authService.getUserDisplayInfo();

            if (userInfo.photoURL) {
                this.userAvatar.style.backgroundImage = `url(${userInfo.photoURL})`;
                this.userAvatar.style.backgroundSize = 'cover';
                this.userAvatar.textContent = '';
            } else {
                this.userAvatar.style.backgroundImage = 'none';
                this.userAvatar.textContent = userInfo.avatar;
            }
        }
    }

    updateSubmitButtonState() {
        const content = this.textarea.value.trim();
        const hasContent = content.length > 0;
        const isSignedIn = authService.isSignedIn();

        // Always enable if has content, regardless of auth state
        this.submitBtn.disabled = !hasContent || this.isSubmitting;

        if (!hasContent) {
            this.submitBtn.textContent = 'Đăng dòng';
        } else if (!isSignedIn) {
            this.submitBtn.textContent = 'Đăng dòng'; // Same text, but will prompt auth on click
        } else {
            this.submitBtn.textContent = 'Đăng dòng';
        }
    }

    showSuccessMessage(message) {
        this.showToast(message, 'success');
    }

    showErrorMessage(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type = 'info') {
        // Remove existing toasts
        document.querySelectorAll('.toast').forEach(toast => toast.remove());

        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        // Style toast
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '8px',
            color: 'white',
            backgroundColor: type === 'success' ? '#4CAF50' : type === 'error' ? '#F44336' : '#2196F3',
            zIndex: '9999',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            transform: 'translateX(300px)',
            transition: 'transform 0.3s ease',
            maxWidth: '300px',
            wordWrap: 'break-word'
        });

        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);

        // Auto remove
        setTimeout(() => {
            toast.style.transform = 'translateX(300px)';
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    focusCompose() {
        this.textarea.focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    autoResize() {
        this.textarea.style.height = 'auto';
        this.textarea.style.height = Math.min(this.textarea.scrollHeight, 180) + 'px';
    }

    shakeTextarea() {
        this.textarea.style.animation = 'shake 0.5s';
        this.textarea.addEventListener('animationend', () => {
            this.textarea.style.animation = '';
        }, { once: true });

        // Focus and show hint
        this.textarea.focus();
        this.showToast('Vui lòng nhập nội dung bài viết', 'error');
    }

    resetForm() {
        this.textarea.value = '';
        this.textarea.style.height = 'auto';
        document.querySelectorAll('.pill-button').forEach(btn =>
            btn.classList.remove('active')
        );
        this.currentTopic = '';
        this.updateSubmitButtonState();
    }
}