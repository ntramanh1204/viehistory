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

    // Start app
    navigation.init();
    auth.init();
    onboarding.init();
    compose.init();
    feed.init();
    theme.init();

    // Initialize routing
    window.addEventListener('hashchange', handleRouting);
    window.addEventListener('load', handleRouting);

    console.log('✅ VieHistory loaded with full auth and nav');
});

function handleRouting() {
    const hash = window.location.hash;

    if (hash.startsWith('#/post/')) {
        const postId = hash.split('/')[2];
        if (postId) {
            showPostDetail(postId);
        }
    } else {
        showHomePage();
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
    // Show main feed
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
        appContainer.style.display = 'block';
    }

    // Hide post detail
    const postDetailContainer = document.getElementById('post-detail-container');
    if (postDetailContainer) {
        postDetailContainer.style.display = 'none';
    }
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