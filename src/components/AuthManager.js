import { authService } from '../services/AuthService.js';
import { AvatarService } from '../services/AvatarService.js';

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

        const headerSigninBtn = document.getElementById('header-signin-btn');
        const userMenu = document.getElementById('user-menu');
        const notificationBtn = document.getElementById('notification-btn');

        const composeArea = document.querySelector('.compose-area');

        if (user && !user.isAnonymous) {
            // ✅ User đã đăng nhập thật sự - sử dụng Avataaars
            this.hideAuthModal();

            if (headerSigninBtn) {
                headerSigninBtn.classList.add('hidden');
            }

            if (userMenu) {
                userMenu.classList.remove('hidden');
            }

            if (notificationBtn) {
                notificationBtn.style.display = 'inline-flex';
            }

            if (composeArea) composeArea.classList.remove('hidden');

            // ✅ SỬA: Update header avatar giống như compose-area
            this.updateHeaderAvatar(user);
            this.updateSidebarAvatar(user);

            const userDisplayName = document.getElementById('user-display-name');
            const sidebarUserName = document.getElementById('user-name');
            const sidebarUserStatus = document.getElementById('user-status');

            const userInfo = authService.getUserDisplayInfo();

            // Update names
            if (userDisplayName) {
                userDisplayName.textContent = userInfo.displayName;
            }

            if (sidebarUserName) {
                sidebarUserName.textContent = userInfo.displayName;
            }

            if (sidebarUserStatus) {
                sidebarUserStatus.textContent = 'Đã đăng nhập';
            }

            // Enable compose
            if (composeTextarea) {
                composeTextarea.disabled = false;
                composeTextarea.placeholder = `Chia sẻ câu chuyện lịch sử của bạn, ${userInfo.displayName}...`;
            }

            if (postSubmitBtn) {
                postSubmitBtn.disabled = false;
            }

            authRequired?.classList.add('hidden');
            fabBtn?.classList.remove('hidden');

            this.reloadFeedForNewUser();

        } else {
            // ✅ User chưa đăng nhập hoặc anonymous - giữ chữ "A"
            if (headerSigninBtn) {
                headerSigninBtn.classList.remove('hidden');
            }

            if (userMenu) {
                userMenu.classList.add('hidden');
            }

            if (notificationBtn) {
                notificationBtn.style.display = 'none';
            }

            if (composeArea) composeArea.classList.add('hidden');

            // ✅ SỬA: Reset header avatar
            this.resetHeaderAvatar();
            this.resetSidebarAvatar();

            // Reset other UI elements
            const sidebarUserName = document.getElementById('user-name');
            const sidebarUserStatus = document.getElementById('user-status');

            if (sidebarUserName) {
                sidebarUserName.textContent = 'Anonymous';
            }

            if (sidebarUserStatus) {
                sidebarUserStatus.textContent = 'Chưa đăng nhập';
            }

            // Disable compose
            if (composeTextarea) {
                composeTextarea.disabled = true;
                composeTextarea.placeholder = 'Đăng nhập để chia sẻ...';
            }

            if (postSubmitBtn) {
                postSubmitBtn.disabled = true;
            }

            authRequired?.classList.remove('hidden');
            fabBtn?.classList.add('hidden');

            this.reloadFeedForNewUser();
        }
    }

    // ✅ THÊM: Method để reload feed khi user thay đổi
    reloadFeedForNewUser() {
        // Dispatch event để FeedManager reload
        const event = new CustomEvent('userChanged', {
            detail: {
                userId: authService.getCurrentUser()?.uid || null
            }
        });
        document.dispatchEvent(event);
    }

    // ✅ THÊM: Method riêng để update header avatar
    updateHeaderAvatar(user) {
        const userAvatarHeader = document.getElementById('user-avatar-header');

        if (!userAvatarHeader) return;

        // Xóa nội dung cũ
        userAvatarHeader.innerHTML = '';

        if (AvatarService.shouldUseAvataaars(user)) {
            // ✅ User đã đăng nhập - sử dụng Avataaars
            const avatarUrl = AvatarService.getUserAvatar(user, 40);
            const img = document.createElement('img');
            img.src = avatarUrl;
            img.alt = 'Avatar';
            img.className = 'user-avatar-img';
            userAvatarHeader.appendChild(img);
        } else {
            // ✅ User chưa đăng nhập - hiển thị chữ "A"
            const span = document.createElement('span');
            span.className = 'user-avatar-text';
            span.textContent = 'A';
            userAvatarHeader.appendChild(span);
        }
    }

    // ✅ THÊM: Method riêng để update sidebar avatar
    updateSidebarAvatar(user) {
        const sidebarAvatarContainer = document.querySelector('.user-avatar-sidebar');

        if (!sidebarAvatarContainer) return;

        // Xóa nội dung cũ
        sidebarAvatarContainer.innerHTML = '';

        if (AvatarService.shouldUseAvataaars(user)) {
            // ✅ User đã đăng nhập - sử dụng Avataaars
            const avatarUrl = AvatarService.getUserAvatar(user, 50);
            const img = document.createElement('img');
            img.src = avatarUrl;
            img.alt = 'Avatar';
            img.className = 'user-avatar-img';
            sidebarAvatarContainer.appendChild(img);
        } else {
            // ✅ User chưa đăng nhập - hiển thị chữ "A"
            const span = document.createElement('span');
            span.className = 'user-avatar-text';
            span.textContent = 'A';
            sidebarAvatarContainer.appendChild(span);
        }
    }

    // ✅ THÊM: Method để reset header avatar
    resetHeaderAvatar() {
        const userAvatarHeader = document.getElementById('user-avatar-header');

        if (!userAvatarHeader) return;

        userAvatarHeader.innerHTML = '';
        const span = document.createElement('span');
        span.className = 'user-avatar-text';
        span.textContent = 'A';
        userAvatarHeader.appendChild(span);
    }

    // ✅ THÊM: Method để reset sidebar avatar
    resetSidebarAvatar() {
        const sidebarAvatarContainer = document.querySelector('.user-avatar-sidebar');

        if (!sidebarAvatarContainer) return;

        sidebarAvatarContainer.innerHTML = '';
        const span = document.createElement('span');
        span.id = 'user-avatar-text';
        span.textContent = 'A';
        sidebarAvatarContainer.appendChild(span);
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
        console.log('🍞 Showing toast:', message, type); // Debug log

        // Tạo toast element
        const toast = document.createElement('div');
        toast.className = `auth-toast auth-toast--${type}`;
        toast.textContent = message;

        // Thêm vào DOM
        document.body.appendChild(toast);

        // Hiện toast
        setTimeout(() => toast.classList.add('auth-toast--show'), 100);

        // Ẩn toast sau 3 giây
        setTimeout(() => {
            toast.classList.remove('auth-toast--show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
}