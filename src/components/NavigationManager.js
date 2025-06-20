export class NavigationManager {
    constructor() {
        this.currentPage = 'home';
        this.isInitialized = false;
    }

    async init() {
        await this.loadComponents();
        this.setupEventListeners();
        this.updateAuthUI();
        this.setActivePage('home');

        console.log('✅ NavigationManager initialized');
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

        // Update active state for all nav items
        this.navItems?.forEach(item => {
            if (item.dataset.page === page) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Update page title if element exists
        if (this.pageTitle) {
            this.pageTitle.textContent = this.getPageTitle(page);
        }
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