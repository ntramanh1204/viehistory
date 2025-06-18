class AppSidebar extends HTMLElement {
    async connectedCallback() {
        try {
            const response = await fetch('/src/templates/Sidebar.html');
            const html = await response.text();
            this.innerHTML = html;

            // Wait for DOM to settle before updating
            setTimeout(() => {
                // Listen for auth state changes AFTER template is loaded
                document.addEventListener('authStateChanged', (e) => {
                    this.updateUserInfo(e.detail);
                });

                // Update with current auth state
                const userInfo = window.authService?.getUserDisplayInfo();
                if (userInfo) {
                    this.updateUserInfo(userInfo);
                }
            }, 100);

            this.dispatchEvent(new CustomEvent('sidebar-loaded'));
        } catch (error) {
            console.error('Error loading sidebar:', error);
        }
    }

 updateUserInfo(authData) {
    console.log('🔄 Updating sidebar user info...', authData);

    // Use correct IDs from template
    const userAvatar = this.querySelector('#user-avatar-text');
    const userName = this.querySelector('#user-name');
    const userStatus = this.querySelector('#user-status');
    
    // THÊM SYNC VỚI HEADER
    const headerAvatarText = document.getElementById('user-avatar-header-text');

    console.log('📧 Found elements:', {
        userAvatar: !!userAvatar,
        userName: !!userName,
        userStatus: !!userStatus,
        headerAvatarText: !!headerAvatarText
    });

    if (authData?.isSignedIn) {
        const initial = authData.displayName?.charAt(0)?.toUpperCase() || 'U';
        const name = authData.displayName || 'User';

        // Update sidebar
        if (userAvatar) {
            userAvatar.textContent = initial;
            console.log('✅ Updated sidebar avatar:', initial);
        }
        
        // Update header - ĐỒNG BỘ
        if (headerAvatarText) {
            headerAvatarText.textContent = initial;
            console.log('✅ Updated header avatar:', initial);
        }
        
        if (userName) {
            userName.textContent = name;
            userName.style.color = 'var(--text-primary)';
            userName.style.fontWeight = '600';
            console.log('✅ Updated user name:', name);
        }
        if (userStatus) {
            userStatus.textContent = 'Đã đăng nhập';
            userStatus.style.color = 'var(--text-secondary)';
            console.log('✅ Updated user status');
        }
    } else {
        if (userAvatar) userAvatar.textContent = 'A';
        if (headerAvatarText) headerAvatarText.textContent = 'A'; // ĐỒNG BỘ
        if (userName) {
            userName.textContent = 'Anonymous';
            userName.style.color = 'var(--text-primary)';
        }
        if (userStatus) {
            userStatus.textContent = 'Chưa đăng nhập';
            userStatus.style.color = 'var(--text-secondary)';
        }
    }
}
}

class AppHeader extends HTMLElement {
    constructor() {
        super();
    }

    async connectedCallback() {
        await this.loadTemplate();
        this.attachEventListeners();
    }

    async loadTemplate() {
        try {
            const response = await fetch('/src/templates/Header.html');
            const html = await response.text();
            this.innerHTML = html;
        } catch (error) {
            console.error('Error loading header:', error);
            this.innerHTML = '<header class="app-header">Error loading header</header>';
        }
    }

    attachEventListeners() {
        const signinBtn = this.querySelector('#header-signin-btn');
        const userMenuBtn = this.querySelector('#user-avatar-btn');

        if (signinBtn) {
            signinBtn.addEventListener('click', () => {
                // Handle signin button click
                const authModal = document.getElementById('auth-modal');
                authModal?.classList.remove('hidden');
            });
        }

        if (userMenuBtn) {
            userMenuBtn.addEventListener('click', () => {
                const dropdown = this.querySelector('#user-dropdown');
                dropdown?.classList.toggle('hidden');
            });
        }
    }
}

class AppMobileBottomNav extends HTMLElement {
    async connectedCallback() {
        try {
            const response = await fetch('/src/templates/MobileBottomNav.html');
            const html = await response.text();
            this.innerHTML = html;

            this.initializeMobileNavigation();
            this.dispatchEvent(new CustomEvent('mobile-nav-loaded'));
        } catch (error) {
            console.error('Error loading mobile bottom nav:', error);
        }
    }

    initializeMobileNavigation() {
        const mobileNavItems = this.querySelectorAll('.mobile-nav-item');

        mobileNavItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();

                // Remove active from all mobile nav items
                mobileNavItems.forEach(navItem => navItem.classList.remove('active'));

                // Add active to clicked item
                item.classList.add('active');

                // Also sync with desktop sidebar
                const page = item.dataset.page;
                this.setActivePage(page);

                // Navigate to page
                window.navigationManager?.navigateToPage(page);
            });
        });
    }

    setActivePage(page) {
        // Sync both desktop sidebar and mobile nav
        const allNavItems = document.querySelectorAll('.nav-item, .mobile-nav-item');
        allNavItems.forEach(item => {
            if (item.dataset.page === page) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }
}

// Register components
customElements.define('app-sidebar', AppSidebar);
customElements.define('app-header', AppHeader);
customElements.define('app-mobile-bottom-nav', AppMobileBottomNav);