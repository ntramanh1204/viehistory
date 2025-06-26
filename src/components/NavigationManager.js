export class NavigationManager {
    constructor() {
        this.currentPage = 'home';
        this.isInitialized = false;
        this.navItems = null;
        this.pageContents = null;
        this.pageTitle = null;
        this.mobileMenuBtn = null;
        this.sidebar = null;
        this.sidebarUser = null;
    }

    async init() {
        try {
            console.log('🔧 Initializing NavigationManager...');

            // Wait for components to be ready
            await new Promise(resolve => {
                if (document.querySelector('.nav-item') && document.querySelector('.mobile-nav-item')) {
                    resolve();
                } else {
                    // Wait for components to load
                    const checkInterval = setInterval(() => {
                        if (document.querySelector('.nav-item') && document.querySelector('.mobile-nav-item')) {
                            clearInterval(checkInterval);
                            resolve();
                        }
                    }, 100);

                    // Timeout after 3 seconds
                    setTimeout(() => {
                        clearInterval(checkInterval);
                        resolve();
                    }, 3000);
                }
            });

            await this.loadComponents();
            this.setupEventListeners();
            this.updateAuthUI();

            // Set initial active state
            setTimeout(() => {
                this.updateActiveStateFromURL();
            }, 100);

            this.isInitialized = true;
            console.log('✅ NavigationManager initialized');
        } catch (error) {
            console.error('❌ Error initializing NavigationManager:', error);
        }
    }

    setupEventListeners() {
        // Navigation items click handlers
        this.navItems?.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                if (page) {
                    this.navigateToPage(page);
                }
            });
        });

        // Mobile menu toggle
        this.mobileMenuBtn?.addEventListener('click', () => {
            this.sidebar?.classList.toggle('active');
        });

        // Listen for page navigation events from other components
        document.addEventListener('navigateToPage', (e) => {
            this.navigateToPage(e.detail.page);
        });
    }

    // ✅ THÊM METHOD BỊ THIẾU
    navigateToPage(page) {
        console.log(`Navigating to page: ${page}`);

        // Map pages to paths
        const pageToPath = {
            'home': '/',
            'blog': '/blog',
            'store': '/store',
            'cart': '/cart',
            'profile': '/profile'
        };

        const path = pageToPath[page] || '/';

        // Use the global navigate function
        if (typeof navigate === 'function') {
            navigate(path);
        } else {
            // Fallback
            window.history.pushState({}, '', path);
            window.dispatchEvent(new PopStateEvent('popstate'));
        }

        this.setActivePage(page);
    }

    updateAuthUI() {
        console.log('updateAuthUI called but not implemented yet');
        // Update navigation based on auth state
        // This method should update the sidebar user info
    }

    setActivePage(page) {
        this.currentPage = page;

        // ✅ SỬA: Thêm debug và ensure elements exist
        console.log(`Setting active page to: ${page}`);

        // Re-query elements nếu cần
        if (!this.navItems || this.navItems.length === 0) {
            this.navItems = document.querySelectorAll('.nav-item, .mobile-nav-item');
            console.log('Re-queried nav items:', this.navItems.length);
        }

        this.navItems?.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                if (page) {
                    // Xử lý riêng cho Đăng bài
                    if (page === 'compose') {
                        // Nếu đang ở trang chủ, scroll tới compose-area
                        if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
                            const compose = document.querySelector('.compose-area');
                            if (compose) {
                                compose.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                const textarea = compose.querySelector('textarea');
                                if (textarea) textarea.focus();
                            }
                        } else {
                            // Nếu không ở trang chủ, chuyển về trang chủ và thêm hash
                            window.location.href = '/#compose';
                        }
                        return; // Không gọi navigateToPage cho compose
                    }
                    this.navigateToPage(page);
                }
            });
        });

        // Update page title if element exists
        if (this.pageTitle) {
            this.pageTitle.textContent = this.getPageTitle(page);
        }
    }

    updateActiveStateFromURL() {
        if (!this.isInitialized) {
            console.warn('⚠️ NavigationManager not initialized yet');
            return;
        }

        const currentPath = window.location.pathname;

        console.log('🔄 Updating nav state for path:', currentPath);

        let activePage = 'home';

        // Determine active page from path (không dùng hash)
        if (currentPath === '/' || currentPath === '') {
            activePage = 'home';
        } else if (currentPath.startsWith('/blog')) {
            activePage = 'blog';
        } else if (currentPath.startsWith('/profile')) {
            activePage = 'profile';
        } else if (currentPath.startsWith('/post')) {
            activePage = 'home'; // Post detail vẫn highlight home
        }

        console.log('🎯 Current path:', currentPath);
        console.log('🎯 Determined active page:', activePage);
        console.log('🎯 Nav items found:', this.navItems?.length);

        // this.setActivePage(activePage);
        // Update sidebar navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        const itemPage = item.dataset.page;
        if (itemPage === activePage) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Update mobile navigation
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
        const itemPage = item.dataset.page;
        if (itemPage === activePage) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    }

    getPageTitle(page) {
        const titles = {
            'home': 'Threads',
            'blog': 'Blog',
            'store': 'Store',
            'cart': 'Cart',
            'profile': 'Profile'
        };
        return titles[page] || 'VieHistory';
    }

    async loadComponents() {
        try {
            // Cache DOM elements after template is loaded
            this.navItems = document.querySelectorAll('.nav-item, .mobile-nav-item');
            this.pageContents = document.querySelectorAll('.page-content');
            this.pageTitle = document.querySelector('.page-title');
            this.mobileMenuBtn = document.getElementById('mobile-menu-btn');
            this.sidebar = document.querySelector('.sidebar-nav');
            this.sidebarUser = document.querySelector('.sidebar-user');

            console.log('✅ Components loaded successfully');

        } catch (error) {
            console.error('❌ Error loading components:', error);
        }
    }
}