// Import Firebase config and services first
import './config/firebase.js';
import './components/AppComponents.js'

import { AuthManager } from './components/AuthManager.js';
import { OnboardingManager } from './components/OnboardingManager.js';
import { ComposeManager } from './components/ComposeManager.js';
import { FeedManager } from './components/FeedManager.js';
import { ThemeManager } from './components/ThemeManager.js';
import { NavigationManager } from './components/NavigationManager.js';
import { PostDetailManager } from './components/PostDetailManager.js';
import { ShareManager } from './components/ShareManager.js';

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

    // Start app
    navigation.init();
    auth.init();
    onboarding.init();
    compose.init();
    feed.init();
    theme.init();
    shareManager.init();

    // Initialize routing
     window.addEventListener('popstate', handleRouting);
    window.addEventListener('load', handleRouting);

    // Export navigate function to global scope
    window.navigate = navigate;

    console.log('✅ VieHistory loaded with full auth and nav');
});

async function handleRouting() {
    const path = window.location.pathname;
    const search = window.location.search;
    
    if (path === '/blog/create' || path === '/blog/editor') {
        await showBlogEditor();
    }
    else if (path.startsWith('/blog/') && path !== '/blog') {
        const blogId = path.split('/')[2];
        if (blogId && blogId !== 'create' && blogId !== 'editor') {
            await showBlogDetail(blogId);
        }
    }
    else if (path === '/blog') {
        await showBlogPage();
    }
    else if (path.startsWith('/post/')) {
        const postId = path.split('/')[2];
        if (postId) {
            await showPostDetail(postId);
        }
    }
    else if (path === '/' || path === '') {
        showHomePage();
    }
    else {
        show404();
    }
}

// ✅ Helper function để navigate
function navigate(path) {
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
        // Ẩn các phần khác
        document.querySelector('.app-container').style.display = 'none';

        // Ẩn post detail nếu đang hiển thị
        const postDetailContainer = document.getElementById('post-detail-container');
        if (postDetailContainer) {
            postDetailContainer.style.display = 'none';
        }

        // Ẩn trang blog nếu đang hiển thị
        const blogPageContainer = document.getElementById('blog-page-container');
        if (blogPageContainer) {
            blogPageContainer.style.display = 'none';
        }

        // Hiển thị blog detail
        let blogDetailContainer = document.getElementById('blog-detail-container');

        if (!blogDetailContainer) {
            blogDetailContainer = document.createElement('div');
            blogDetailContainer.id = 'blog-detail-container';
            document.body.appendChild(blogDetailContainer);
        }

        // Nạp bài viết
        const { default: BlogDetailManager } = await import('./components/BlogDetailManager.js');
        const blogDetailManager = new BlogDetailManager();
        blogDetailContainer.style.display = 'block';
        await blogDetailManager.loadBlog(blogId);

    } catch (error) {
        console.error('Error showing blog detail:', error);
        window.location.hash = '#/blog'; // Quay lại trang blog khi có lỗi
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
        '#blog-editor-container'
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
    console.error('Post not found');
    window.location.hash = '#/';
}