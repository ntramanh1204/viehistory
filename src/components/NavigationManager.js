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

    async loadComponents() {
        try {
            // Load sidebar
            const sidebarResponse = await fetch('/src/components/Sidebar.html');
            const sidebarHTML = await sidebarResponse.text();
            
            // Load header
            const headerResponse = await fetch('/src/components/Header.html');
            const headerHTML = await headerResponse.text();
            
            // Insert components into DOM
            const appLayout = document.querySelector('.app-layout');
            if (appLayout) {
                appLayout.insertAdjacentHTML('afterbegin', sidebarHTML);
                
                const mainContent = appLayout.querySelector('.main-content');
                if (mainContent) {
                    mainContent.insertAdjacentHTML('afterbegin', headerHTML);
                }
            }
            
            // Cache DOM elements after insertion
            this.navItems = document.querySelectorAll('.nav-item');
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

    // ... rest of methods remain the same
}