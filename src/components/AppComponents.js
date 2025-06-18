class AppSidebar extends HTMLElement {
    async connectedCallback() {
        try {
            const response = await fetch('/src/templates/Sidebar.html');
            const html = await response.text();
            this.innerHTML = html;
            
            // Listen for auth state changes
            document.addEventListener('authStateChanged', (e) => {
                this.updateUserInfo(e.detail);
            });
            
            this.dispatchEvent(new CustomEvent('sidebar-loaded'));
        } catch (error) {
            console.error('Error loading sidebar:', error);
        }
    }
    
    updateUserInfo(authData) {
        const userAvatar = this.querySelector('.user-avatar-sidebar span');
        const userName = this.querySelector('.user-name');
        const userStatus = this.querySelector('.user-status');
        const tooltipName = this.querySelector('.user-tooltip .user-name');
        const tooltipStatus = this.querySelector('.user-tooltip .user-status');
        
        if (authData.isSignedIn) {
            const initial = authData.displayName?.charAt(0)?.toUpperCase() || 'U';
            const name = authData.displayName || 'User';
            
            if (userAvatar) userAvatar.textContent = initial;
            if (userName) userName.textContent = name;
            if (userStatus) userStatus.textContent = 'Đã đăng nhập';
            if (tooltipName) tooltipName.textContent = name;
            if (tooltipStatus) tooltipStatus.textContent = 'Đã đăng nhập';
        } else {
            if (userAvatar) userAvatar.textContent = 'A';
            if (userName) userName.textContent = 'Anonymous';
            if (userStatus) userStatus.textContent = 'Chưa đăng nhập';
            if (tooltipName) tooltipName.textContent = 'Anonymous';
            if (tooltipStatus) tooltipStatus.textContent = 'Chưa đăng nhập';
        }
    }
}

class AppHeader extends HTMLElement {
    async connectedCallback() {
        try {
            const response = await fetch('/src/templates/Header.html');
            const html = await response.text();
            this.innerHTML = html;
            
            this.dispatchEvent(new CustomEvent('header-loaded'));
        } catch (error) {
            console.error('Error loading header:', error);
        }
    }
}

// Register components
customElements.define('app-sidebar', AppSidebar);
customElements.define('app-header', AppHeader);