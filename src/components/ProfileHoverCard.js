class ProfileHoverCard {
    constructor() {
        this.card = null;
        this.currentUserId = null;
        this.showTimeout = null;
        this.hideTimeout = null;
        this.isCardVisible = false;
        this.cache = new Map(); // Cache user data

        this.init();
    }

    init() {
        this.createCard();
        this.setupEventListeners();
    }

    createCard() {
        // Remove existing card if any
        const existingCard = document.querySelector('.profile-hover-card');
        if (existingCard) {
            existingCard.remove();
        }

        this.card = document.createElement('div');
        this.card.className = 'profile-hover-card';
        this.card.innerHTML = `
            <div class="profile-card-content">
                <div class="profile-card-loading">
                    <div class="profile-card-spinner"></div>
                </div>
            </div>
        `;

        document.body.appendChild(this.card);
    }

    setupEventListeners() {
        // Use event delegation to handle author name hovers
        document.addEventListener('mouseenter', this.handleMouseEnter.bind(this), true);
        document.addEventListener('mouseleave', this.handleMouseLeave.bind(this), true);

        // Handle card hover to keep it visible
        this.card.addEventListener('mouseenter', () => {
            this.clearHideTimeout();
        });

        this.card.addEventListener('mouseleave', () => {
            this.hideCard();
        });

        // Hide card on scroll
        window.addEventListener('scroll', () => {
            if (this.isCardVisible) {
                this.hideCard();
            }
        });
    }

    handleMouseEnter(e) {
        if (!(e.target instanceof Element)) return;
        const authorName = e.target.closest('.author-name');
        if (!authorName) return;

        const userId = this.getUserIdFromElement(authorName);
        if (!userId) return;

        this.clearHideTimeout();

        this.showTimeout = setTimeout(() => {
            this.showCard(authorName, userId);
        }, 500); // Delay before showing
    }

    handleMouseLeave(e) {
        if (!(e.target instanceof Element)) return;
        const authorName = e.target.closest('.author-name');
        if (!authorName) return;

        this.clearShowTimeout();
        this.hideTimeout = setTimeout(() => {
            this.hideCard();
        }, 300); // Delay before hiding
    }

    getUserIdFromElement(element) {
        // Try to get user ID from various possible sources
        const postItem = element.closest('.post-item, .comment-item');
        if (!postItem) return null;

        // Try to get from data attributes
        const userId = postItem.dataset.userId ||
            postItem.dataset.authorId ||
            element.dataset.userId ||
            element.dataset.authorId;

        if (userId) return userId;

        // Try to extract from post/comment data
        const postId = postItem.dataset.postId;
        const commentId = postItem.dataset.commentId;

        if (postId && window.feedManager) {
            const post = window.feedManager.posts.find(p => p.id === postId);
            return post?.author?.uid;
        }

        return null;
    }

    // ...existing code...
    async showCard(targetElement, userId) {
        if (this.currentUserId === userId && this.isCardVisible) {
            return;
        }

        this.currentUserId = userId;
        this.positionCard(targetElement);
        this.card.classList.add('show', 'loading');
        this.isCardVisible = true;

        try {
            const userData = await this.getUserData(userId);

            if (this.currentUserId === userId && this.isCardVisible) {
                // ✅ PHẢI await ở đây
                await this.renderCardContent(userData);
                this.card.classList.remove('loading');
            }
        } catch (error) {
            console.error('Error loading profile data:', error);
            if (this.currentUserId === userId && this.isCardVisible) {
                this.renderErrorState();
                this.card.classList.remove('loading');
            }
        }
    }
    // ...existing code...

    async getUserData(userId) {
        // Check cache first
        if (this.cache.has(userId)) {
            return this.cache.get(userId);
        }

        // Mock data for demo - in real app, fetch from database
        const userData = await this.fetchUserData(userId);

        // Cache the data
        this.cache.set(userId, userData);

        return userData;
    }

    async fetchUserData(userId) {
        try {
            // Import database service
            const { dbService } = await import('../services/DatabaseService.js');
            const { authService } = await import('../services/AuthService.js');

            // Get user profile data
            const userProfile = await dbService.getUserProfile(userId);
            if (!userProfile) {
                throw new Error('User not found');
            }

            // Get user stats 
            const userStats = await dbService.getUserStats(userId);

            // Check if current user is following this user
            let isFollowing = false;
            const currentUser = authService.getCurrentUser();
            if (currentUser && currentUser.uid !== userId) {
                isFollowing = await dbService.checkFollowStatus(currentUser.uid, userId);
            }

            // Combine data
            return {
                uid: userId,
                displayName: userProfile.displayName || userProfile.name || 'User',
                username: userProfile.username || userProfile.displayName?.toLowerCase().replace(/\s+/g, '') || 'user',
                bio: userProfile.bio || userProfile.description || '',
                photoURL: userProfile.photoURL || userProfile.avatar,
                followers: userStats.followersCount || 0,
                following: userStats.followingCount || 0,
                posts: userStats.postsCount || 0,
                isVerified: userProfile.isVerified || false,
                isFollowing: isFollowing
            };

        } catch (error) {
            console.error('Error fetching user data:', error);

            // Fallback to basic data if available
            return {
                uid: userId,
                displayName: 'User',
                username: 'user',
                bio: '',
                photoURL: null,
                followers: 0,
                following: 0,
                posts: 0,
                isVerified: false,
                isFollowing: false
            };
        }
    }

    async getProfileAvatarHTML(userData, size = 64) {

        if (!window.AvatarService) {
            try {
                const { AvatarService } = await import('../services/AvatarService.js');
                window.AvatarService = AvatarService;
            } catch (error) {
                console.warn('Could not load AvatarService:', error);
            }
        }

        console.log('[DEBUG] ProfileHoverCard - userData:', userData);
        console.log('[DEBUG] ProfileHoverCard - AvatarService available:', !!window.AvatarService);

        if (userData.photoURL || userData.avatar) {
            console.log('[DEBUG] ProfileHoverCard - Using photoURL/avatar:', userData.photoURL || userData.avatar);
            return `<img src="${userData.photoURL || userData.avatar}" alt="${userData.displayName}" class="profile-avatar-img" style="width:${size}px;height:${size}px;" 
            onerror="this.src='${this.getAvatarFallback(userData)}'">`;
        } else if (window.AvatarService && window.AvatarService.shouldUseAvataaars(userData)) {
            console.log('[DEBUG] ProfileHoverCard - Using Avataaars for user:', userData.uid);
            const avatarUrl = window.AvatarService.getUserAvatar(userData, size);
            console.log('[DEBUG] ProfileHoverCard - Avataaars URL:', avatarUrl);
            return `<img src="${avatarUrl}" alt="${userData.displayName}" class="profile-avatar-img" style="width:${size}px;height:${size}px};">`;
        } else {
            console.log('[DEBUG] ProfileHoverCard - Using initials for user:', userData.displayName);
            const initial = userData.displayName?.charAt(0).toUpperCase() || 'U';
            return `<span class="profile-avatar-text" style="width:${size}px;height:${size}px;">${initial}</span>`;
        }
    }

    async renderCardContent(userData) {
        const followButtonText = userData.isFollowing ? 'Following' : 'Follow';
        const followButtonClass = userData.isFollowing ? 'following' : '';

        // ✅ PHẢI await ở đây
        const avatarHTML = await this.getProfileAvatarHTML(userData, 64);


        this.card.innerHTML = `
            <div class="profile-card-header">
                <div class="profile-card-avatar">
                    ${avatarHTML}
                </div>
                <div class="profile-card-info">
                    <div class="profile-card-name">
                        ${userData.displayName}
                        ${userData.isVerified ? '<span class="verified-badge">✓</span>' : ''}
                    </div>
                    <!-- <div class="profile-card-username">@${userData.username}</div> -->
                </div>
            </div>
            
            <div class="profile-card-stats">
                <div class="profile-stat">
                    <span class="profile-stat-number">${this.formatNumber(userData.followers)}</span>
                    <span class="profile-stat-label">followers</span>
                </div>
                <div class="profile-stat">
                    <span class="profile-stat-number">${this.formatNumber(userData.following)}</span>
                    <span class="profile-stat-label">following</span>
                </div>
            </div>
            
            ${userData.bio ? `<div class="profile-card-bio">${userData.bio}</div>` : ''}
            
            <div class="profile-card-actions">
                <button class="profile-follow-btn ${followButtonClass}" data-user-id="${userData.uid}">
                    ${followButtonText}
                </button>
                <!-- <button class="profile-message-btn" data-user-id="${userData.uid}"> -->
                    <!-- <i class="far fa-envelope"></i> -->
                <!-- </button> -->
            </div>
        `;

        this.setupCardActions(userData);
    }

    setupCardActions(userData) {
        const followBtn = this.card.querySelector('.profile-follow-btn');
        const messageBtn = this.card.querySelector('.profile-message-btn');

        if (followBtn) {
            followBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleFollow(userData);
            });
        }

        if (messageBtn) {
            messageBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleMessage(userData);
            });
        }
    }

    async handleFollow(userData) {
        const followBtn = this.card.querySelector('.profile-follow-btn');
        if (!followBtn) return;

        const isFollowing = followBtn.classList.contains('following');

        // Check if user is logged in
        const { authService } = await import('../services/AuthService.js');
        const currentUser = authService.getCurrentUser();

        if (!currentUser) {
            // Show login required message
            console.log('Please login to follow users');
            return;
        }

        if (currentUser.uid === userData.uid) {
            // Can't follow yourself
            console.log('Cannot follow yourself');
            return;
        }

        // Optimistic UI update
        if (isFollowing) {
            followBtn.textContent = 'Follow';
            followBtn.classList.remove('following');
        } else {
            followBtn.textContent = 'Following';
            followBtn.classList.add('following');
        }

        try {
            // Import database service
            const { dbService } = await import('../services/DatabaseService.js');

            // Toggle follow status
            const result = await dbService.toggleFollow(currentUser.uid, userData.uid);

            // Update cache
            const cachedData = this.cache.get(userData.uid);
            if (cachedData) {
                cachedData.isFollowing = result.isFollowing;
                cachedData.followers += result.isFollowing ? 1 : -1;
                this.cache.set(userData.uid, cachedData);

                // Update stats display
                const statsElement = this.card.querySelector('.profile-stat-number');
                if (statsElement) {
                    statsElement.textContent = this.formatNumber(cachedData.followers);
                }
            }

        } catch (error) {
            console.error('Error updating follow status:', error);

            // Revert on error
            if (isFollowing) {
                followBtn.textContent = 'Following';
                followBtn.classList.add('following');
            } else {
                followBtn.textContent = 'Follow';
                followBtn.classList.remove('following');
            }

            // Show error message
            console.log('Error updating follow status. Please try again.');
        }
    }

    handleMessage(userData) {
        console.log('Opening message for user:', userData.uid);
        // Here you would open a message dialog or navigate to messages
        this.hideCard();
    }

    renderErrorState() {
        this.card.innerHTML = `
            <div class="profile-card-error">
                <p>Unable to load profile</p>
            </div>
        `;
    }

    positionCard(targetElement) {
        const rect = targetElement.getBoundingClientRect();
        const cardWidth = 300;
        const cardHeight = 200; // Approximate height
        const offset = 10;

        let left = rect.left + (rect.width / 2) - (cardWidth / 2);
        let top = rect.bottom + offset;

        // Adjust if card would go off screen
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Horizontal adjustment
        if (left < 10) {
            left = 10;
        } else if (left + cardWidth > viewportWidth - 10) {
            left = viewportWidth - cardWidth - 10;
        }

        // Vertical adjustment - show above if no space below
        if (top + cardHeight > viewportHeight - 10) {
            top = rect.top - cardHeight - offset;
        }

        this.card.style.left = `${left}px`;
        this.card.style.top = `${top}px`;
    }

    hideCard() {
        if (!this.isCardVisible) return;

        this.clearShowTimeout();
        this.card.classList.remove('show');
        this.isCardVisible = false;
        this.currentUserId = null;

        // Clear content after animation
        setTimeout(() => {
            if (!this.isCardVisible) {
                this.card.innerHTML = `
                    <div class="profile-card-content">
                        <div class="profile-card-loading">
                            <div class="profile-card-spinner"></div>
                        </div>
                    </div>
                `;
            }
        }, 200);
    }

    clearShowTimeout() {
        if (this.showTimeout) {
            clearTimeout(this.showTimeout);
            this.showTimeout = null;
        }
    }

    clearHideTimeout() {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
    }

    getAvatarFallback(userData) {
        // Generate a simple avatar URL (you can use any avatar service)
        const name = userData.displayName || userData.username || 'User';
        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=150&background=random`;
    }

    formatNumber(num) {
        if (num < 1000) return num.toString();
        if (num < 1000000) return (num / 1000).toFixed(1).replace('.0', '') + 'K';
        return (num / 1000000).toFixed(1).replace('.0', '') + 'M';
    }

    // Clean up method
    destroy() {
        this.clearShowTimeout();
        this.clearHideTimeout();

        if (this.card) {
            this.card.remove();
        }

        // Remove event listeners
        document.removeEventListener('mouseenter', this.handleMouseEnter.bind(this), true);
        document.removeEventListener('mouseleave', this.handleMouseLeave.bind(this), true);
    }
}

// Initialize profile hover card when DOM is ready
let profileHoverCard;

function initProfileHoverCard() {
    if (!profileHoverCard) {
        profileHoverCard = new ProfileHoverCard();
        window.profileHoverCard = profileHoverCard;
    }
}

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProfileHoverCard);
} else {
    initProfileHoverCard();
}

export { ProfileHoverCard, initProfileHoverCard };
