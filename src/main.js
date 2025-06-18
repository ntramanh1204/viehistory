// Import Firebase config and services first
import './config/firebase.js';
import './components/AppComponents.js'

import { AuthManager } from './components/AuthManager.js';
import { OnboardingManager } from './components/OnboardingManager.js';
import { ComposeManager } from './components/ComposeManager.js';
import { FeedManager } from './components/FeedManager.js';
import { ThemeManager } from './components/ThemeManager.js';
import { NavigationManager } from './components/NavigationManager.js';

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
    
    console.log('✅ VieHistory loaded with full auth and nav');
});