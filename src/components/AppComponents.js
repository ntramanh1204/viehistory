class AppSidebar extends HTMLElement {
    async connectedCallback() {
        try {
            const response = await fetch('/src/templates/Sidebar.html');
            const html = await response.text();
            this.innerHTML = html;

            // Wait for DOM to settle before updating
            setTimeout(() => {
                this.initializeNavigation();
                
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

    initializeNavigation() {
        const navItems = this.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Remove active from all nav items
                navItems.forEach(navItem => navItem.classList.remove('active'));
                
                // Add active to clicked item
                item.classList.add('active');
                
                // Get the href and navigate
                const href = item.getAttribute('href');
                if (href && typeof window.navigate === 'function') {
                    window.navigate(href);
                }
            });
        });
    }

    updateUserInfo(userInfo) {
        const userElement = this.querySelector('.sidebar-user');
        if (userElement && userInfo) {
            userElement.innerHTML = `
                <div class="user-avatar">
                    <img src="${userInfo.photoURL}" alt="${userInfo.displayName}">
                </div>
                <div class="user-info">
                    <div class="user-name">${userInfo.displayName}</div>
                    <div class="user-email">${userInfo.email}</div>
                </div>
            `;
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

                // Get the href and navigate
                const href = item.getAttribute('href');
                if (href && typeof window.navigate === 'function') {
                    window.navigate(href);
                }

                // Also sync with desktop sidebar
                const page = item.dataset.page;
                this.setActivePage(page);
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