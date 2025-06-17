// Import Firebase config and services first
import './config/firebase.js';

import { AuthManager } from './components/AuthManager.js';
import { OnboardingManager } from './components/OnboardingManager.js';
import { ComposeManager } from './components/ComposeManager.js';
import { FeedManager } from './components/FeedManager.js';
import { ThemeManager } from './components/ThemeManager.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 VieHistory v2.0 starting...');
    
    // Initialize managers
    const auth = new AuthManager();
    const onboarding = new OnboardingManager();
    const compose = new ComposeManager();
    const feed = new FeedManager();
    const theme = new ThemeManager();
    
    // Start app
    auth.init();
    onboarding.init();
    compose.init();
    feed.init();
    theme.init();
    
    console.log('✅ VieHistory loaded with full authentication');
});