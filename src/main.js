// Import Firebase config and services first
import './config/firebase.js';
import { initGoogleAnalytics, checkGAStatus } from './config/analytics.js';
import './components/AppComponents.js'

import { authService } from './services/AuthService.js';
import { dbService } from './services/DatabaseService.js';
import { cloudinaryService } from './services/CloudinaryService.js';
import { notificationService } from './services/NotificationService.js';

import { AuthManager } from './components/AuthManager.js';
import { OnboardingManager } from './components/OnboardingManager.js';
import { ComposeManager } from './components/ComposeManager.js';
import { FeedManager } from './components/FeedManager.js';
import { ThemeManager } from './components/ThemeManager.js';
import { NavigationManager } from './components/NavigationManager.js';
import { PostDetailManager } from './components/PostDetailManager.js';
import { ShareManager } from './components/ShareManager.js';
import { NotificationManager } from './components/NotificationManager.js';

initGoogleAnalytics();
checkGAStatus();

let postDetailManager;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 VieHistory v2.0 starting...');

    await Promise.all([
        customElements.whenDefined('app-sidebar'),
        customElements.whenDefined('app-header')
    ]);

    // Initialize managers
    const navigation = new NavigationManager();
    const auth = new AuthManager();
    const onboarding = new OnboardingManager();
    const compose = new ComposeManager();
    const feed = new FeedManager();
    const theme = new ThemeManager();
    const shareManager = new ShareManager();
    const notification = new NotificationManager();

    // ✅ THÊM: Export navigation to global scope TRƯỚC KHI init
    // Store globally
    // window.authManager = auth;
    window.composeManager = compose;
    window.navigation = navigation;
    window.feedManager = feed;
    window.shareManager = shareManager;
    window.notificationManager = notification; 
    window.notificationService = notificationService;

    // ✅ Đảm bảo auth được init trước
    await auth.init();

    // Sau đó mới init các component khác
    await navigation.init(); // ✅ SỬA: Đợi navigation init xong

    onboarding.init();
    compose.init();
    feed.init();
    theme.init();
    shareManager.init();
    await notification.init(); 

    // Initialize routing AFTER navigation is ready
    window.addEventListener('popstate', handleRouting);
    window.addEventListener('load', handleRouting);

    // Export navigate function to global scope
    window.navigate = navigate;

    // ✅ THÊM: Initial routing sau khi tất cả đã init
    setTimeout(() => {
        handleRouting();
    }, 300);

    console.log('✅ VieHistory loaded with full auth and nav');
});

async function handleRouting() {
    const path = window.location.pathname;
    const search = window.location.search;

    console.log('🔄 Routing to:', path);

    if (path === '/blog/create' || path === '/blog/editor') {
        await showBlogEditor();
    }
    else if (path.startsWith('/blog/') && path !== '/blog/') {
        // ✅ SỬA: Lấy phần sau '/blog/'
        const blogId = path.substring(6); // Bỏ '/blog/' = 6 ký tự
        if (blogId && blogId !== 'create' && blogId !== 'editor') {
            await showBlogDetail(blogId);
        } else {
            await showBlogPage(); // Fallback nếu blogId không hợp lệ
        }
    }
    else if (path === '/blog') {
        await showBlogPage();
    }
    else if (path.startsWith('/post/')) {
        // ✅ SỬA: Lấy phần sau '/post/'
        const postId = path.substring(6); // Bỏ '/post/' = 6 ký tự  
        if (postId) {
            await showPostDetail(postId);
        } else {
            showHomePage(); // Fallback
        }
    }
    else if (path === '/profile' || path.startsWith('/profile/')) {
        // ✅ SỬA: Lấy phần sau '/profile/'
        const userId = path.startsWith('/profile/') ? path.substring(9) : null;
        await showProfile(userId);
    }
    else if (path === '/' || path === '') {
        showHomePage();
    }
    else {
        show404();
    }

    // Update navigation state
    setTimeout(() => {
        if (window.navigation && typeof window.navigation.updateActiveStateFromURL === 'function') {
            console.log('📍 Updating navigation active state');
            window.navigation.updateActiveStateFromURL();
        } else {
            console.warn('⚠️ Navigation not ready or method missing');

            // Fallback: Cập nhật trực tiếp
            const currentPath = window.location.pathname;
            let activePage = 'home';

            if (currentPath === '/' || currentPath === '') {
                activePage = 'home';
            } else if (currentPath.startsWith('/blog')) {
                activePage = 'blog';
            } else if (currentPath.startsWith('/profile')) {
                activePage = 'profile';
            }

            // Cập nhật trực tiếp DOM
            document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(item => {
                if (item.dataset.page === activePage) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
        }
    }, 200);
}

async function showProfile(userId = null) {
    try {
        // Ẩn TẤT CẢ các container khác
        hideAllContainers();

        // Show profile page
        let profileContainer = document.getElementById('profile-container');

        if (!profileContainer) {
            profileContainer = document.createElement('div');
            profileContainer.id = 'profile-container';

            // Load template
            try {
                const response = await fetch('/src/page/Profile.html');
                const template = await response.text();
                profileContainer.innerHTML = template;
                document.body.appendChild(profileContainer);
            } catch (error) {
                console.error('Error loading profile template:', error);
                profileContainer.innerHTML = '<div class="error">Không thể tải trang cá nhân</div>';
            }
        }

        profileContainer.style.display = 'block';

        // Initialize ProfileManager
        const { ProfileManager } = await import('./components/ProfileManager.js');
        const profileManager = new ProfileManager();
        await profileManager.init(userId);

        // Update navigation active state
        document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === 'profile');
        });

    } catch (error) {
        console.error('Error showing profile:', error);
        window.navigate('/');
    }
}

function navigate(path) {
    console.log('🔗 Navigating to:', path);
    
    // ✅ Chỉ dùng pushState, không hash
    window.history.pushState({}, '', path);
    handleRouting();
}

// Parse query parameters
function parseQuery(queryString) {
    const params = new URLSearchParams(queryString);
    return Object.fromEntries(params.entries());
}

async function showBlogPage() {
    try {
        // Ẩn TẤT CẢ các container khác
        hideAllContainers();

        // Hiển thị trang blog
        let blogContainer = document.getElementById('blog-page-container');

        if (!blogContainer) {
            blogContainer = document.createElement('div');
            blogContainer.id = 'blog-page-container';

            // Nạp template từ Blog.html
            try {
                const response = await fetch('/src/page/Blog.html');
                const template = await response.text();
                blogContainer.innerHTML = template;
                document.body.appendChild(blogContainer);
            } catch (error) {
                console.error('Error loading blog template:', error);
                blogContainer.innerHTML = '<div class="error">Không thể tải trang blog</div>';
            }
        }

        blogContainer.style.display = 'block';

        // Khởi tạo BlogManager
        const { BlogManager } = await import('./components/BlogManager.js');
        const blogManager = new BlogManager();
        await blogManager.init();

    } catch (error) {
        console.error('Error showing blog page:', error);
    }
}

// Thêm hàm showBlogDetail
async function showBlogDetail(blogId) {
    try {
        console.log('🔍 Showing blog detail:', blogId);
        
        // Ẩn TẤT CẢ các container khác
        hideAllContainers();

        // Tạo hoặc hiển thị blog detail container
        let blogDetailContainer = document.getElementById('blog-detail-container');

        if (!blogDetailContainer) {
            blogDetailContainer = document.createElement('div');
            blogDetailContainer.id = 'blog-detail-container';
            
            // Load template
            try {
                const response = await fetch('/src/page/BlogDetail.html');
                const template = await response.text();
                blogDetailContainer.innerHTML = template;
                document.body.appendChild(blogDetailContainer);
            } catch (error) {
                console.error('Error loading blog detail template:', error);
                blogDetailContainer.innerHTML = '<div class="error">Không thể tải trang chi tiết</div>';
            }
        }

        blogDetailContainer.style.display = 'block';

        // Initialize BlogDetailManager
        const { default: BlogDetailManager } = await import('./components/BlogDetailManager.js');
        const blogDetailManager = new BlogDetailManager();
        await blogDetailManager.init(blogId);

        // Update navigation state
        document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(item => {
            if (item.dataset.page === 'blog') {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

    } catch (error) {
        console.error('❌ Error showing blog detail:', error);
        // Fallback về trang blog
        window.navigate('/blog');
    }
}

async function showBlogEditor() {
    try {
        // Ẩn TẤT CẢ các container khác
        hideAllContainers();

        // Show blog editor
        let editorContainer = document.getElementById('blog-editor-container');

        if (!editorContainer) {
            editorContainer = document.createElement('div');
            editorContainer.id = 'blog-editor-container';

            // Load template
            try {
                const response = await fetch('/src/page/BlogEditor.html');
                const template = await response.text();
                editorContainer.innerHTML = template;
                document.body.appendChild(editorContainer);
            } catch (error) {
                console.error('Error loading blog editor template:', error);
                editorContainer.innerHTML = '<div class="error">Không thể tải trang soạn thảo</div>';
            }
        }

        editorContainer.style.display = 'block';

        // Initialize BlogEditorManager
        const { BlogEditorManager } = await import('./components/BlogEditorManager.js');
        const editorManager = new BlogEditorManager();
        await editorManager.init();

    } catch (error) {
        console.error('Error showing blog editor:', error);
    }
}

async function showPostDetail(postId) {
    try {
        // Hide main feed
        document.querySelector('.app-container').style.display = 'none';

        // Show post detail
        const postDetailContainer = document.getElementById('post-detail-container') || await createPostDetailContainer();
        postDetailContainer.style.display = 'block';

        // Initialize PostDetailManager
        postDetailManager = new PostDetailManager();
        await postDetailManager.init(postId);
    } catch (error) {
        console.error('Error showing post detail:', error);
        show404();
    }
}

function showHomePage() {
    console.log('Showing home page');

    // Ẩn TẤT CẢ containers khác
    hideAllContainers();

    // CHỈ hiển thị app-container (trang chủ)
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
        appContainer.style.display = 'block';
    }

    // Update navigation active state
    document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(item => {
        if (item.dataset.page === 'home') {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

function hideAllContainers() {
    const containers = [
        '.app-container',
        '#post-detail-container',
        '#blog-detail-container',
        '#blog-page-container',
        '#blog-editor-container',
        '#profile-container'
    ];

    containers.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            element.style.display = 'none';
        }
    });
}

async function createPostDetailContainer() {
    const container = document.createElement('div');
    container.id = 'post-detail-container';
    container.style.display = 'none';

    // Load template from pages
    try {
        const response = await fetch('/src/page/PostDetail.html');
        const template = await response.text();
        container.innerHTML = template;
    } catch (error) {
        console.error('Error loading post detail template:', error);
        container.innerHTML = '<div class="error">Không thể tải trang</div>';
    }

    document.body.appendChild(container);
    return container;
}

function show404() {
    console.error('Page not found');
    // ✅ SỬA: Chuyển về trang chủ bằng path
    window.navigate('/');
}

// Listen for Firestore user loaded event to update avatars everywhere
// This ensures avatars only update after Firestore user data is ready

document.addEventListener('firestoreUserLoaded', (e) => {
    console.log('[DEBUG] firestoreUserLoaded event received:', e.detail.userData);
    if (window.authManager) {
        window.authManager.updateHeaderAvatar(window.currentUserData);
        window.authManager.updateSidebarAvatar(window.currentUserData);
    }
    if (window.composeManager) {
        window.composeManager.updateUserAvatar();
    }
});