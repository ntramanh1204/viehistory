class URLProtection {
    static init() {
        const currentPath = window.location.pathname;
        
        // Chặn truy cập trực tiếp .html
        if (currentPath.includes('.html')) {
            const cleanPath = this.getCleanPath(currentPath);
            window.location.replace(cleanPath);
            return;
        }
        
        // Chặn truy cập thư mục src/app/
        if (currentPath.startsWith('/src/app/')) {
            window.location.replace('/');
            return;
        }
    }
    
    static getCleanPath(htmlPath) {
        const pathMap = {
            '/src/app/blog/blog.html': '/blog',
            '/src/app/lesson/lesson-list.html': '/lessons',
            '/src/app/lesson/lesson-video.html': '/lesson-video',
            '/src/app/store/store.html': '/store',
            '/src/app/store/ai-assistant.html': '/ai-assistant',
            '/src/app/forum/forum-reddit-style.html': '/forum',
            '/src/app/admin/dashboard.html': '/admin',
            '/src/app/admin/posts.html': '/admin/posts',
            '/login.html': '/login',
            '/signup.html': '/signup'
        };
        
        return pathMap[htmlPath] || '/';
    }
}

URLProtection.init();