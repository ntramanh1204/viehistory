import { authService } from '../services/AuthService.js';

export class AuthManager {
    constructor() {
        this.authModal = document.getElementById('auth-modal');
        this.headerSigninBtn = document.getElementById('header-signin-btn');
        this.feedSigninBtn = document.getElementById('feed-signin-btn');
        this.signoutBtn = document.getElementById('signout-btn');
        this.userMenu = document.getElementById('user-menu');
        this.userAvatarBtn = document.getElementById('user-avatar-btn');
        this.userDropdown = document.getElementById('user-dropdown');

        // Auth forms
        this.signinForm = document.getElementById('signin-form');
        this.signupForm = document.getElementById('signup-form');
        this.showSignupLink = document.getElementById('show-signup');
        this.showSigninLink = document.getElementById('show-signin');

        this.isLoading = false;
        this.currentAuthMode = 'signin';
    }

    init() {
        this.setupEventListeners();
        this.setupAuthStateListener();
    }

    setupEventListeners() {
        // Sử dụng event delegation cho tất cả buttons
        document.addEventListener('click', (e) => {
            // Header signin button
            if (e.target.id === 'header-signin-btn') {
                console.log('🔘 Header signin clicked');
                this.showAuthModal();
            }

            // Feed signin button  
            if (e.target.id === 'feed-signin-btn') {
                console.log('🔘 Feed signin clicked');
                this.showAuthModal();
            }

            // User avatar button
            if (e.target.id === 'user-avatar-btn' || e.target.closest('#user-avatar-btn')) {
                console.log('🔘 User avatar clicked');
                this.toggleUserDropdown();
            }

            // Signout button - SỬA LẠI PHẦN NÀY
            if (e.target.id === 'signout-btn') {
                console.log('🔘 Signout button clicked');
                e.preventDefault();
                this.handleSignOut();
            }

            // Close modal
            if (e.target.id === 'auth-modal-close') {
                this.hideAuthModal();
            }

            // Close modal by clicking outside
            if (e.target.id === 'auth-modal') {
                this.hideAuthModal();
            }

            // Hide user dropdown when clicking outside
            if (!e.target.closest('#user-menu')) {
                this.hideUserDropdown();
            }
        });

        // Form submissions - giữ nguyên
        this.signinForm?.addEventListener('submit', (e) => this.handleEmailSignIn(e));
        this.signupForm?.addEventListener('submit', (e) => this.handleEmailSignUp(e));

        // Form switching - giữ nguyên
        this.showSignupLink?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchAuthMode('signup');
        });

        this.showSigninLink?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchAuthMode('signin');
        });

        // Listen for auth required events from other components
        document.addEventListener('showAuthModal', (e) => {
            this.showAuthModal(e.detail?.message);
        });
    }

    setupAuthStateListener() {
        authService.onAuthStateChange((user) => {
            this.updateUIForAuthState(user);
        });
    }

    updateUIForAuthState(user) {
        const composeTextarea = document.getElementById('composeTextarea');
        const postSubmitBtn = document.getElementById('post-submit-btn');
        const authRequired = document.getElementById('auth-required');
        const fabBtn = document.getElementById('fab-compose-btn');

        // TÌM ĐÚNG ELEMENTS TRONG HEADER
        const headerSigninBtn = document.getElementById('header-signin-btn');
        const userMenu = document.getElementById('user-menu');

        console.log('🔍 Debugging header elements:', {
            headerSigninBtn: !!headerSigninBtn,
            userMenu: !!userMenu,
            user: !!user
        });

        if (user) {
            // User is signed in
            this.hideAuthModal();

            // Update header - SỬA LẠI LOGIC NÀY
            if (headerSigninBtn) {
                headerSigninBtn.classList.add('hidden');
                console.log('✅ Hidden signin button');
            }

            if (userMenu) {
                userMenu.classList.remove('hidden');
                console.log('✅ Shown user menu');
            }

            // Update user info
const userAvatarImg = document.getElementById('user-avatar-img'); // Xóa dòng này
        const userAvatarHeaderText = document.getElementById('user-avatar-header-text'); // Thêm dòng này
        const userDisplayName = document.getElementById('user-display-name');
        const sidebarUserName = document.getElementById('user-name');
        const sidebarUserStatus = document.getElementById('user-status');
        const sidebarAvatar = document.getElementById('user-avatar-text');
        
        const userInfo = authService.getUserDisplayInfo();
        
        // Update header user info - SỬA LẠI
        const userInitial = userInfo.displayName?.charAt(0)?.toUpperCase() || 'U';
        
        if (userAvatarHeaderText) {
            userAvatarHeaderText.textContent = userInitial;
            console.log('✅ Updated header avatar text:', userInitial);
        }
        
        if (userDisplayName) {
            userDisplayName.textContent = userInfo.displayName;
            console.log('✅ Updated header user name:', userDisplayName.textContent);
        }
        
        // Update sidebar user info - ĐỒNG BỘ AVATAR
        if (sidebarUserName) {
            sidebarUserName.textContent = userInfo.displayName;
            sidebarUserName.style.setProperty('color', 'var(--text-primary)', 'important');
            sidebarUserName.style.setProperty('font-weight', '600', 'important');
            console.log('✅ Updated sidebar user name:', sidebarUserName.textContent);
        }

        if (sidebarUserStatus) {
            sidebarUserStatus.textContent = 'Đã đăng nhập';
            sidebarUserStatus.style.setProperty('color', 'var(--text-secondary)', 'important');
            console.log('✅ Updated sidebar status');
        }

        if (sidebarAvatar) {
            sidebarAvatar.textContent = userInitial; // ĐỒNG BỘ CÙNG INITIAL
            console.log('✅ Updated sidebar avatar:', sidebarAvatar.textContent);
        }

            // Enable compose
            if (composeTextarea) {
                composeTextarea.disabled = false;
                composeTextarea.placeholder = `Chia sẻ dòng thời gian của bạn, ${userInfo.displayName}...`;
            }

            if (postSubmitBtn) {
                postSubmitBtn.disabled = false;
            }

            // Hide auth required message
            authRequired?.classList.add('hidden');

            // Show FAB
            fabBtn?.classList.remove('hidden');

        } else {
            // User is signed out - SỬA LẠI LOGIC NÀY
            if (headerSigninBtn) {
                headerSigninBtn.classList.remove('hidden');
                console.log('✅ Shown signin button');
            }

            if (userMenu) {
                userMenu.classList.add('hidden');
                console.log('✅ Hidden user menu');
            }

            // Reset sidebar to anonymous
const userAvatarHeaderText = document.getElementById('user-avatar-header-text');
        const sidebarUserName = document.getElementById('user-name');
        const sidebarUserStatus = document.getElementById('user-status');
        const sidebarAvatar = document.getElementById('user-avatar-text');

        if (userAvatarHeaderText) userAvatarHeaderText.textContent = 'A';
        if (sidebarUserName) sidebarUserName.textContent = 'Anonymous';
        if (sidebarUserStatus) sidebarUserStatus.textContent = 'Chưa đăng nhập';
        if (sidebarAvatar) sidebarAvatar.textContent = 'A';
        

            // Allow compose but show different placeholder
            if (composeTextarea) {
                composeTextarea.disabled = false;
                composeTextarea.placeholder = 'Chia sẻ dòng thời gian của bạn...';
            }

            if (postSubmitBtn) {
                postSubmitBtn.disabled = false;
                postSubmitBtn.textContent = 'Đăng dòng';
            }

            authRequired?.classList.add('hidden');
            fabBtn?.classList.remove('hidden');
        }
    }

    async handleEmailSignIn(e) {
        e.preventDefault();
        if (this.isLoading) return;

        const formData = new FormData(e.target);
        const email = formData.get('email');
        const password = formData.get('password');

        if (!email || !password) {
            this.showError('Vui lòng nhập đầy đủ thông tin');
            return;
        }

        try {
            this.setLoadingState(true);
            await authService.signInWithEmail(email, password);
            this.showSuccess('Đăng nhập thành công!');
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.setLoadingState(false);
        }
    }

    async handleEmailSignUp(e) {
        e.preventDefault();
        if (this.isLoading) return;

        const formData = new FormData(e.target);
        const email = formData.get('email');
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');
        const displayName = formData.get('displayName');

        if (!email || !password || !displayName) {
            this.showError('Vui lòng nhập đầy đủ thông tin');
            return;
        }

        if (password !== confirmPassword) {
            this.showError('Mật khẩu xác nhận không khớp');
            return;
        }

        if (password.length < 6) {
            this.showError('Mật khẩu phải có ít nhất 6 ký tự');
            return;
        }

        try {
            this.setLoadingState(true);
            await authService.createAccount(email, password, displayName);
            this.showSuccess('Tạo tài khoản thành công!');
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.setLoadingState(false);
        }
    }

    async handleSignOut() {
        try {
            await authService.signOut();
            this.showSuccess('Đã đăng xuất thành công');
        } catch (error) {
            this.showError(error.message);
        }
    }

    switchAuthMode(mode) {
        this.currentAuthMode = mode;

        if (mode === 'signup') {
            this.signinForm?.classList.add('hidden');
            this.signupForm?.classList.remove('hidden');

            // Update switch links
            document.getElementById('signin-switch')?.classList.add('hidden');
            document.getElementById('signup-switch')?.classList.remove('hidden');
        } else {
            this.signupForm?.classList.add('hidden');
            this.signinForm?.classList.remove('hidden');

            // Update switch links
            document.getElementById('signup-switch')?.classList.add('hidden');
            document.getElementById('signin-switch')?.classList.remove('hidden');
        }
    }

    showAuthModal(message = null) {
        if (message) {
            const modalMessage = this.authModal?.querySelector('.modal-message');
            if (modalMessage) {
                modalMessage.textContent = message;
                modalMessage.classList.remove('hidden');
            }
        }

        this.authModal?.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        // Focus first input
        const firstInput = this.authModal?.querySelector('input[type="email"]');
        setTimeout(() => {
            firstInput?.focus();
        }, 300);
    }

    hideAuthModal() {
        this.authModal?.classList.add('hidden');
        document.body.style.overflow = '';

        // Reset forms
        this.signinForm?.reset();
        this.signupForm?.reset();
        this.switchAuthMode('signin');

        // Hide message
        const modalMessage = this.authModal?.querySelector('.modal-message');
        modalMessage?.classList.add('hidden');
    }

    toggleUserDropdown() {
        this.userDropdown?.classList.toggle('hidden');
    }

    hideUserDropdown() {
        this.userDropdown?.classList.add('hidden');
    }

    setLoadingState(loading) {
        this.isLoading = loading;

        // Disable all auth buttons
        const authButtons = this.authModal?.querySelectorAll('button[type="submit"]');
        authButtons?.forEach(btn => {
            btn.disabled = loading;
        });

        // Update button text
        const submitBtn = this.authModal?.querySelector(`#${this.currentAuthMode}-form button[type="submit"]`);
        if (submitBtn) {
            if (loading) {
                submitBtn.dataset.originalText = submitBtn.textContent;
                submitBtn.textContent = this.currentAuthMode === 'signin' ? 'Đang đăng nhập...' : 'Đang tạo tài khoản...';
            } else {
                submitBtn.textContent = submitBtn.dataset.originalText || (this.currentAuthMode === 'signin' ? 'Đăng nhập' : 'Tạo tài khoản');
            }
        }
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
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
            backgroundColor: type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6',
            zIndex: '10000',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
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
        }, 4000);
    }
}