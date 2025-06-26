import { dbService } from '../services/DatabaseService.js';
import { authService } from '../services/AuthService.js';
import { AvatarService } from '../services/AvatarService.js';

export class FeedManager {
    constructor() {
        this.feedContainer = document.querySelector('.feed-list');
        this.posts = [];
        this.isLoading = false;
        this.lastDoc = null;
        this.hasMore = true;
        this.likeCache = new Map();
        this.pendingLikes = new Set();
        this.currentUserId = null;

        this.setupUserChangeListener();
    }

    init() {
        this.setupEventListeners();
        this.loadInitialPosts();
    }

    // ✅ THÊM: Setup listener cho user change
    setupUserChangeListener() {
        document.addEventListener('userChanged', async (e) => {
            const newUserId = e.detail.userId;

            // ✅ Clear cache và reload nếu user thay đổi
            if (newUserId !== this.currentUserId) {
                console.log('🔄 User changed, reloading feed...', {
                    from: this.currentUserId,
                    to: newUserId
                });

                this.likeCache.clear();
                this.pendingLikes.clear();
                this.currentUserId = newUserId;

                // ✅ Re-render posts với like status mới
                if (this.posts.length > 0) {
                    await this.renderPosts();
                }
            }
        });
    }

    setupEventListeners() {
        // Listen for new posts
        document.addEventListener('newPost', (e) => {
            this.prependPost(e.detail);
        });

        // Listen for auth required
        document.addEventListener('authRequired', (e) => {
            this.showAuthRequired(e.detail.message);
        });

        // Infinite scroll
        window.addEventListener('scroll', this.throttle(() => {
            if (this.shouldLoadMore()) {
                this.loadMorePosts();
            }
        }, 200));
    }

    async loadInitialPosts() {
        try {
            this.setLoading(true);
            const result = await dbService.getPosts(10);

            this.posts = result.posts;
            this.lastDoc = result.lastDoc;
            this.hasMore = result.posts.length === 10;

            this.renderPosts();
        } catch (error) {
            console.error('Error loading posts:', error);
            this.showError('Không thể tải bài viết. Vui lòng thử lại.');
        } finally {
            this.setLoading(false);
        }
    }

    async loadMorePosts() {
        if (this.isLoading || !this.hasMore) return;

        try {
            this.setLoading(true);
            const result = await dbService.getPosts(10, this.lastDoc);

            this.posts.push(...result.posts);
            this.lastDoc = result.lastDoc;
            this.hasMore = result.posts.length === 10;

            this.appendPosts(result.posts);
        } catch (error) {
            console.error('Error loading more posts:', error);
        } finally {
            this.setLoading(false);
        }
    }

    // ✅ SỬA: Load like status khi render posts
    async renderPosts() {
        if (!this.feedContainer) return;

        const user = authService.getCurrentUser();

        // ✅ THÊM: Clear cache nếu user thay đổi
        if (user?.uid !== this.currentUserId) {
            this.likeCache.clear();
            this.currentUserId = user?.uid || null;
        }

        if (this.posts.length === 0) {
            this.feedContainer.innerHTML = this.getEmptyState();
            return;
        }

        // ✅ SỬA: Load like status cho tất cả posts
        if (user) {
            await this.loadLikeStatuses(this.posts.map(p => p.id));
        }

        const postsHTML = this.posts.map(post => this.createPostHTML(post)).join('');
        this.feedContainer.innerHTML = postsHTML;

        this.attachPostEventListeners();
    }

    // ✅ SỬA: Optimize batch loading likes
    async loadLikeStatuses(postIds) {
        const user = authService.getCurrentUser();
        if (!user || postIds.length === 0) return;

        try {
            // ✅ Use batch check instead of individual checks
            const likeStatuses = await dbService.checkMultipleLikes('post', postIds, user.uid);

            // Update cache with results
            Object.entries(likeStatuses).forEach(([postId, isLiked]) => {
                this.likeCache.set(postId, isLiked);
            });

            console.log('✅ Loaded like statuses for', postIds.length, 'posts');
        } catch (error) {
            console.error('❌ Error loading like statuses:', error);
        }
    }

    appendPosts(newPosts) {
        if (!this.feedContainer) return;

        const postsHTML = newPosts.map(post => this.createPostHTML(post)).join('');
        this.feedContainer.insertAdjacentHTML('beforeend', postsHTML);
        this.attachPostEventListeners();
    }

    prependPost(post) {
        if (!this.feedContainer) return;

        this.posts.unshift(post);
        const postHTML = this.createPostHTML(post);
        this.feedContainer.insertAdjacentHTML('afterbegin', postHTML);
        this.attachPostEventListeners();
    }

    createPostHTML(post) {
        const timeAgo = this.getTimeAgo(post.createdAt);
        const avatar = AvatarService.shouldUseAvataaars(post.author) ?
            `<img src="${AvatarService.getUserAvatar(post.author, 40)}" alt="${post.author.displayName}" class="author-avatar-img">` :
            `<span class="author-avatar-text">${post.author.displayName.charAt(0).toUpperCase()}</span>`;

        // ✅ FIX: Đảm bảo xuất hiện nội dung ngay cả khi formatPostContent fail
        let formattedContent;
        try {
            formattedContent = this.formatPostContent(post.content);
        } catch (error) {
            console.error('Error formatting post content:', error);
            formattedContent = post.content || '<p>Không thể hiển thị nội dung</p>';
        }

        const mediaHTML = this.createEnhancedMediaHTML(post.media || []);
        const hashtagsHTML = this.createHashtagsHTML(post.hashtags || []);

        // ✅ Check like status from cache
        const user = authService.getCurrentUser();
        const isLiked = user ? this.likeCache.get(post.id) || false : false;
        const likedClass = isLiked ? 'liked' : '';
        const heartIcon = isLiked ? 'fas fa-heart' : 'far fa-heart';

        return `
            <article class="post-item" data-post-id="${post.id}">
                <div class="post-header">
                    <div class="post-author">
                        <div class="author-avatar">${avatar}</div>
                        <div class="author-info">
                            <span class="author-name">${post.author.displayName}</span>
                            <span class="post-time">${timeAgo}</span>
                        </div>
                    </div>
                    <button class="post-menu-btn" data-post-id="${post.id}">⋯</button>
                </div>
                <div class="post-content">
                    <div class="post-text">${formattedContent}</div>
                    ${mediaHTML}
                    ${hashtagsHTML}
                </div>
                
                <div class="post-actions">
                    <button class="action-btn like-btn ${likedClass}" data-post-id="${post.id}">
                        <i class="${heartIcon}"></i>
                        <span class="action-count">${post.stats?.likes || 0}</span>
                    </button>
                    
                    <button class="action-btn comment-btn" data-post-id="${post.id}">
                        <i class="far fa-comment"></i>
                        <span class="action-count">${post.stats?.comments || 0}</span>
                    </button>
                    
                    <button class="action-btn share-btn" data-post-id="${post.id}">
                        <i class="fas fa-share"></i>
                        <span class="action-count">${post.stats?.shares || 0}</span>
                    </button>
                </div>

                <!-- ✅ QUAN TRỌNG: Comments section structure từ commit e9c744a -->
                <div class="comments-section hidden" data-post-id="${post.id}" style="display: none;">
                    <div class="comment-form">
                        <div class="comment-avatar">
                            <span class="comment-avatar-text">A</span>
                        </div>
                        <div class="comment-input-container">
                            <textarea class="comment-input" data-post-id="${post.id}" 
                                    placeholder="Viết bình luận..."></textarea>
                            <button class="comment-submit-btn" data-post-id="${post.id}">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        </div>
                    </div>
                    <div class="comments-list" data-post-id="${post.id}" data-loaded="false">
                        <!-- Comments will be loaded here -->
                    </div>
                </div>
            </article>
        `;
    }

    // ✅ SỬA: Cải thiện formatPostContent để đảm bảo hiển thị đúng
    formatPostContent(content) {
        if (!content) return '<p>Nội dung trống</p>';

        // ✅ FIX: Đảm bảo content là string
        const safeContent = String(content || '');

        // Convert URLs to links
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        let formatted = safeContent.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener">$1</a>');

        // Convert mentions to links (if you have user profiles)
        const mentionRegex = /@(\w+)/g;
        formatted = formatted.replace(mentionRegex, '<span class="mention">@$1</span>');

        // Convert line breaks
        formatted = formatted.replace(/\n/g, '<br>');

        return formatted;
    }

    // ✅ THÊM: Enhanced media rendering
    createEnhancedMediaHTML(media) {
        if (!media || media.length === 0) return '';

        const mediaItems = media.map((item, index) => {
            if (item.type === 'image') {
                return `
                    <div class="post-media-item image-item" data-index="${index}">
                        <img src="${item.url}" alt="${item.originalName || 'Ảnh'}" 
                             class="post-media-image" loading="lazy"
                             onclick="this.parentElement.parentElement.parentElement.dispatchEvent(new CustomEvent('openLightbox', {detail: {index: ${index}, media: ${JSON.stringify(media).replace(/"/g, '&quot;')}}))">
                        ${media.length > 1 ? `<div class="media-counter">${index + 1}/${media.length}</div>` : ''}
                    </div>
                `;
            } else if (item.type === 'video') {
                return `
                    <div class="post-media-item video-item" data-index="${index}">
                        <video controls class="post-media-video" preload="metadata">
                            <source src="${item.url}" type="video/mp4">
                            Trình duyệt không hỗ trợ video.
                        </video>
                    </div>
                `;
            }
            return '';
        }).join('');

        const gridClass = media.length === 1 ? 'single' :
            media.length === 2 ? 'double' :
                media.length === 3 ? 'triple' : 'quad';

        return `
            <div class="post-media ${gridClass}" data-media-count="${media.length}">
                ${mediaItems}
            </div>
        `;
    }

    // ✅ THÊM: Hashtags rendering
    createHashtagsHTML(hashtags) {
        if (!hashtags || hashtags.length === 0) return '';

        const hashtagItems = hashtags.map(tag =>
            `<a href="/?hashtag=${encodeURIComponent(tag)}" class="hashtag">#${tag}</a>`
        ).join(' ');

        return `<div class="post-hashtags">${hashtagItems}</div>`;
    }

    // ✅ THÊM: Format số lượng (1k, 1.2k, etc.)
    formatCount(count) {
        if (count < 1000) return count.toString();
        if (count < 1000000) return (count / 1000).toFixed(1).replace('.0', '') + 'k';
        return (count / 1000000).toFixed(1).replace('.0', '') + 'm';
    }

    // ✅ THÊM: Create media HTML
    createMediaHTML(media) {
        if (!media || media.length === 0) return '';

        const mediaItems = media.map(item => {
            if (item.type === 'image') {
                return `
                    <div class="post-media-item">
                        <img src="${item.url}" alt="${item.originalName || 'Ảnh'}" 
                             class="post-media-image" loading="lazy">
                    </div>
                `;
            } else if (item.type === 'video') {
                return `
                    <div class="post-media-item">
                        <video controls class="post-media-video" preload="metadata">
                            <source src="${item.url}" type="video/mp4">
                            Trình duyệt không hỗ trợ video.
                        </video>
                    </div>
                `;
            }
            return '';
        }).join('');

        const gridClass = media.length === 1 ? 'single' :
            media.length === 2 ? 'double' :
                media.length === 3 ? 'triple' : 'quad';

        return `
            <div class="post-media ${gridClass}">
                ${mediaItems}
            </div>
        `;
    }

    // ✅ SỬA: Fix event delegation - chỉ dùng 1 listener
    attachPostEventListeners() {
        if (!this.feedContainer) return;

        // Remove old listeners
        this.feedContainer.removeEventListener('click', this.handlePostClick);

        // Add single delegated listener
        this.handlePostClick = this.handlePostClick.bind(this);
        this.feedContainer.addEventListener('click', this.handlePostClick);
    }

    // ✅ SỬA: Fix event delegation từ commit 2919f63
    handlePostClick(e) {
        const target = e.target.closest('button');
        if (!target) return;

        e.preventDefault();
        e.stopPropagation();

        const postId = target.dataset.postId;
        if (!postId) return;

        // Route to specific handlers
        if (target.classList.contains('like-btn')) {
            this.handleLikeOptimistic(target, postId);
        } else if (target.classList.contains('comment-btn')) {
            this.toggleComments(target); // Pass button directly
        } else if (target.classList.contains('share-btn')) {
            // Let ShareManager handle this
            return;
        } else if (target.classList.contains('comment-submit-btn')) {
            this.handleCommentSubmit(target);
        }
    }

    // ✅ SỬA: Update optimistic like để sync cache
    async handleLikeOptimistic(button, postId) {
        // Prevent spam clicking
        if (this.pendingLikes.has(postId)) {
            console.log('⚠️ Like action already pending for post:', postId);
            return;
        }

        const user = authService.getCurrentUser();
        if (!user) {
            const event = new CustomEvent('showAuthModal', {
                detail: { message: 'Đăng nhập để thích bài viết' }
            });
            document.dispatchEvent(event);
            return;
        }

        const countSpan = button.querySelector('.action-count');
        const currentCount = parseInt(countSpan.textContent) || 0;
        const isLiked = button.classList.contains('liked');
        const icon = button.querySelector('i');

        // ✅ OPTIMISTIC UPDATE - Update UI immediately
        this.pendingLikes.add(postId);

        if (isLiked) {
            // Optimistically unlike
            button.classList.remove('liked');
            icon.className = 'far fa-heart'; // Outline heart
            countSpan.textContent = Math.max(0, currentCount - 1);
            button.style.transform = 'scale(0.95)';

            // ✅ Update cache optimistically
            this.likeCache.set(postId, false);
        } else {
            // Optimistically like
            button.classList.add('liked');
            icon.className = 'fas fa-heart'; // Filled heart
            countSpan.textContent = currentCount + 1;
            button.style.transform = 'scale(1.1)';

            // ✅ Update cache optimistically
            this.likeCache.set(postId, true);

            // Add heart animation
            this.showHeartAnimation(button);
        }

        // Reset transform
        setTimeout(() => {
            button.style.transform = 'scale(1)';
        }, 150);

        try {
            // Make API call
            const result = await dbService.toggleLike('post', postId, user);

            // ✅ Verify and update cache with server result
            this.likeCache.set(postId, result.liked);

            // ✅ Verify optimistic update was correct
            if (result.liked !== !isLiked) {
                // Rollback if server state differs
                console.warn('⚠️ Rolling back optimistic like update');
                this.rollbackLikeUpdate(button, isLiked, currentCount);
            }

        } catch (error) {
            console.error('❌ Like failed, rolling back:', error);
            // Rollback optimistic update
            this.rollbackLikeUpdate(button, isLiked, currentCount);
            // ✅ Rollback cache
            this.likeCache.set(postId, isLiked);
            this.showToast('Không thể thích bài viết. Thử lại sau.', 'error');
        } finally {
            this.pendingLikes.delete(postId);
        }
    }

    // ✅ SỬA: Improved rollback with icon update
    rollbackLikeUpdate(button, wasLiked, originalCount) {
        const countSpan = button.querySelector('.action-count');
        const icon = button.querySelector('i');

        if (wasLiked) {
            button.classList.add('liked');
            icon.className = 'fas fa-heart'; // Filled heart
        } else {
            button.classList.remove('liked');
            icon.className = 'far fa-heart'; // Outline heart
        }

        countSpan.textContent = originalCount;
    }

    // ✅ THÊM: Heart animation
    showHeartAnimation(button) {
        const heart = document.createElement('div');
        heart.innerHTML = '❤️';
        heart.style.cssText = `
            position: absolute;
            font-size: 20px;
            pointer-events: none;
            animation: heartFloat 1s ease-out forwards;
            z-index: 1000;
        `;

        const rect = button.getBoundingClientRect();
        heart.style.left = rect.left + rect.width / 2 - 10 + 'px';
        heart.style.top = rect.top - 10 + 'px';

        document.body.appendChild(heart);

        setTimeout(() => {
            heart.remove();
        }, 1000);
    }

    // ✅ THÊM: Centralized post interaction handler
    async handlePostInteraction(e) {
        const target = e.target.closest('button, a');
        if (!target) return;

        // Like button
        if (target.classList.contains('like-btn')) {
            e.preventDefault();
            await this.handleLike(e);
            return;
        }

        // Comment button
        if (target.classList.contains('comment-btn')) {
            e.preventDefault();
            this.toggleComments(target);
            return;
        }

        // Share button
        if (target.classList.contains('share-btn')) {
            e.preventDefault();
            await this.handleShare(e);
            return;
        }

        // Comment submit
        if (target.classList.contains('comment-submit')) {
            e.preventDefault();
            await this.handleCommentSubmit(e);
            return;
        }

        // Bookmark button
        if (target.classList.contains('bookmark-btn')) {
            e.preventDefault();
            await this.handleBookmark(e);
            return;
        }

        // Post menu
        if (target.classList.contains('post-menu-btn')) {
            e.preventDefault();
            this.showPostMenu(e);
            return;
        }

        // Read more (allow default navigation)
        if (target.classList.contains('read-more-btn')) {
            // Let it navigate normally
            return;
        }
    }

    // ✅ THÊM: Lightbox for media
    handleLightbox(e) {
        const { index, media } = e.detail;
        this.openLightbox(media, index);
    }

    // ✅ THÊM: Keyboard shortcuts
    handleKeyboardShortcuts(e) {
        // ESC to close lightbox
        if (e.key === 'Escape') {
            this.closeLightbox();
        }

        // L to like focused post
        if (e.key === 'l' && !e.target.matches('input, textarea')) {
            const focusedPost = document.querySelector('.post-item:focus-within, .post-item:hover');
            if (focusedPost) {
                const likeBtn = focusedPost.querySelector('.like-btn');
                likeBtn?.click();
            }
        }
    }

    // ✅ THÊM: Share handler
    async handleShare(e) {
        const button = e.target.closest('.share-btn');
        const postId = button.dataset.postId;

        // Use ShareManager if available
        if (window.shareManager) {
            await window.shareManager.handleShare(e);
        } else {
            // Fallback
            const postUrl = `${window.location.origin}/post/${postId}`;
            await navigator.clipboard.writeText(postUrl);
            this.showToast('Đã sao chép link!');
        }
    }

    // ✅ THÊM: Bookmark handler
    async handleBookmark(e) {
        const button = e.target.closest('.bookmark-btn');
        const postId = button.dataset.postId;
        const user = authService.getCurrentUser();

        if (!user) {
            const event = new CustomEvent('showAuthModal', {
                detail: { message: 'Đăng nhập để lưu bài viết' }
            });
            document.dispatchEvent(event);
            return;
        }

        try {
            // Toggle bookmark (implement in DatabaseService)
            const isBookmarked = button.classList.contains('bookmarked');

            if (isBookmarked) {
                // Remove bookmark
                button.classList.remove('bookmarked');
                button.querySelector('i').className = 'far fa-bookmark';
            } else {
                // Add bookmark
                button.classList.add('bookmarked');
                button.querySelector('i').className = 'fas fa-bookmark';
            }

            this.showToast(isBookmarked ? 'Đã bỏ lưu' : 'Đã lưu bài viết');

        } catch (error) {
            console.error('Error toggling bookmark:', error);
            this.showToast('Có lỗi xảy ra', 'error');
        }
    }

    // ✅ THÊM: Post menu
    showPostMenu(e) {
        const button = e.target.closest('.post-menu-btn');
        const postId = button.dataset.postId;
        const user = authService.getCurrentUser();

        // Create context menu
        const menu = document.createElement('div');
        menu.className = 'post-context-menu';
        menu.innerHTML = `
            <button class="menu-item" data-action="copy-link">📋 Sao chép link</button>
            <button class="menu-item" data-action="report">🚩 Báo cáo</button>
            ${user ? `<button class="menu-item" data-action="hide">👁️ Ẩn bài viết</button>` : ''}
        `;

        // Position menu
        const rect = button.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = rect.bottom + 'px';
        menu.style.right = (window.innerWidth - rect.right) + 'px';
        menu.style.zIndex = '1000';

        document.body.appendChild(menu);

        // Handle menu actions
        menu.addEventListener('click', async (e) => {
            const action = e.target.dataset.action;

            switch (action) {
                case 'copy-link':
                    await navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`);
                    this.showToast('Đã sao chép link!');
                    break;
                case 'report':
                    this.showReportDialog(postId);
                    break;
                case 'hide':
                    this.hidePost(postId);
                    break;
            }

            menu.remove();
        });

        // Close menu when clicking outside
        setTimeout(() => {
            document.addEventListener('click', () => menu.remove(), { once: true });
        }, 0);
    }

    // ✅ THÊM: Toast notification
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    async handleLike(e) {
        const button = e.currentTarget;
        const postId = button.dataset.postId;
        const user = authService.currentUser;

        if (!user) {
            // Show auth modal instead of inline message
            const event = new CustomEvent('showAuthModal', {
                detail: {
                    message: 'Đăng nhập để thích bài viết'
                }
            });
            document.dispatchEvent(event);
            return;
        }

        try {
            const result = await dbService.toggleLike('post', postId, user);

            const countSpan = button.querySelector('.action-count');
            const currentCount = parseInt(countSpan.textContent) || 0;

            if (result.liked) {
                countSpan.textContent = currentCount + 1;
                button.classList.add('liked');
            } else {
                countSpan.textContent = Math.max(0, currentCount - 1);
                button.classList.remove('liked');
            }

            button.dataset.liked = result.liked;
        } catch (error) {
            console.error('Error toggling like:', error);
            this.showError(error.message);
        }
    }

    async toggleLike(postId, button) {
        try {
            const isLiked = button.dataset.liked === 'true';
            const icon = button.querySelector('i');
            const countElement = button.querySelector('.action-count');

            if (isLiked) {
                // Unlike
                await dbService.unlikePost(postId);
                button.dataset.liked = 'false';
                button.classList.remove('liked');
                icon.className = 'far fa-heart'; // Outline heart

                // Update count
                const currentCount = parseInt(countElement.textContent) || 0;
                countElement.textContent = Math.max(0, currentCount - 1);

            } else {
                // Like
                await dbService.likePost(postId);
                button.dataset.liked = 'true';
                button.classList.add('liked');
                icon.className = 'fas fa-heart'; // Filled heart

                // Update count
                const currentCount = parseInt(countElement.textContent) || 0;
                countElement.textContent = currentCount + 1;
            }

        } catch (error) {
            console.error('Error toggling like:', error);
            // Revert UI changes if needed
        }
    }

    // ✅ SỬA: Improved loadComments để đảm bảo có thể load lại comments mỗi khi cần
    async loadComments(postId) {
        try {
            const commentsSection = document.querySelector(`.comments-list[data-post-id="${postId}"]`);
            if (!commentsSection) {
                console.error('❌ Comments list not found for post:', postId);
                return;
            }

            // Show loading state
            commentsSection.innerHTML = '<div class="comments-loading">Đang tải bình luận...</div>';

            console.log('🔄 Loading comments for post:', postId);

            // ✅ FIX: Thêm timeout nhỏ để đảm bảo UI updated trước khi bắt đầu request
            await new Promise(resolve => setTimeout(resolve, 10));

            // Load comments from database
            const comments = await dbService.getComments(postId);
            console.log('📝 Comments loaded:', comments?.length || 0);

            // ✅ FIX: Kiểm tra commentsSection tồn tại trước khi render
            if (document.contains(commentsSection)) {
                this.renderComments(commentsSection, comments);
            }

        } catch (error) {
            console.error('❌ Error loading comments:', error);
            const commentsSection = document.querySelector(`.comments-list[data-post-id="${postId}"]`);
            if (commentsSection && document.contains(commentsSection)) {
                commentsSection.innerHTML = '<div class="comments-error">Không thể tải bình luận</div>';
            }
        }
    }

    // ✅ RESTORE: Render comments từ commit 2919f63
    renderComments(container, comments) {
        if (!container) return;

        if (!comments || comments.length === 0) {
            container.innerHTML = '<div class="no-comments">Chưa có bình luận nào</div>';
            return;
        }

        const commentsHTML = comments.map(comment => this.createCommentHTML(comment)).join('');
        container.innerHTML = commentsHTML;
    }

    // ✅ RESTORE: Create comment HTML với AvatarService từ commit 2919f63
    createCommentHTML(comment) {
        const timeAgo = this.getTimeAgo(comment.createdAt);

        // ✅ FIX: Đảm bảo avatar hiển thị kể cả khi AvatarService fail
        let avatar;
        try {
            avatar = AvatarService.shouldUseAvataaars(comment.author) ?
                `<img src="${AvatarService.getUserAvatar(comment.author, 32)}" alt="${comment.author.displayName}" class="comment-avatar-img">` :
                `<span class="comment-avatar-text">${comment.author.displayName.charAt(0).toUpperCase()}</span>`;
        } catch (error) {
            console.error('Error generating avatar:', error);
            avatar = `<span class="comment-avatar-text">${comment.author?.displayName?.charAt(0).toUpperCase() || 'A'}</span>`;
        }
        return `
            <div class="comment-item" data-comment-id="${comment.id}">
                <div class="comment-avatar">
                    ${avatar}
                </div>
                <div class="comment-content">
                    <div class="comment-header">
                        <span class="comment-author-name">${comment.author.displayName}</span>
                        <span class="comment-time">${timeAgo}</span>
                        ${comment.author.isVerified ? '<span class="verified-badge">✓</span>' : ''}
                    </div>
                    <div class="comment-text">${this.formatCommentContent(comment.content)}</div>
                    <div class="comment-actions">
                        <button class="comment-like-btn" data-comment-id="${comment.id}">
                            <i class="far fa-heart"></i>
                            <span class="like-count">${comment.stats?.likes || 0}</span>
                        </button>
                        <button class="comment-reply-btn" data-comment-id="${comment.id}">
                            <i class="far fa-comment"></i>
                            Trả lời
                        </button>
                    </div>
                    
                    ${comment.replies && comment.replies.length > 0 ? `
                        <div class="comment-replies">
                            ${comment.replies.map(reply => this.createReplyHTML(reply)).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }


    // ✅ THÊM: Create reply HTML với avatar service
    createReplyHTML(reply) {
        const timeAgo = this.getTimeAgo(reply.createdAt);

        // ✅ SỬA: Sử dụng AvatarService cho replies
        const avatar = AvatarService.shouldUseAvataaars(reply.author) ?
            `<img src="${AvatarService.getUserAvatar(reply.author, 28)}" alt="${reply.author.displayName}" class="reply-avatar-img">` :
            `<span class="reply-avatar-text">${reply.author.displayName.charAt(0).toUpperCase()}</span>`;

        return `
            <div class="comment-reply" data-comment-id="${reply.id}">
                <div class="reply-avatar">
                    ${avatar}
                </div>
                <div class="reply-content">
                    <div class="reply-header">
                        <span class="reply-author-name">${reply.author.displayName}</span>
                        <span class="reply-time">${timeAgo}</span>
                    </div>
                    <div class="reply-text">${this.formatCommentContent(reply.content)}</div>
                    <div class="reply-actions">
                        <button class="comment-like-btn" data-comment-id="${reply.id}">
                            <i class="far fa-heart"></i>
                            <span class="like-count">${reply.stats?.likes || 0}</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // ✅ RESTORE: Format comment content từ commit 2919f63
    formatCommentContent(content) {
        if (!content) return '';

        // Convert line breaks
        let formatted = content.replace(/\n/g, '<br>');

        // Convert URLs to links
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        formatted = formatted.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener">$1</a>');

        // Convert mentions
        const mentionRegex = /@(\w+)/g;
        formatted = formatted.replace(mentionRegex, '<span class="mention">@$1</span>');

        return formatted;
    }

    // ✅ SỬA: Fix toggle comments để đảm bảo comments load đúng
    toggleComments(button) {
        const postId = button.dataset.postId;
        const commentsSection = document.querySelector(`.comments-section[data-post-id="${postId}"]`);

        if (!commentsSection) {
            console.error('❌ Comments section not found for post:', postId);
            return;
        }

        const isHidden = commentsSection.style.display === 'none' ||
            commentsSection.classList.contains('hidden');

        if (isHidden) {
            // Show comments
            commentsSection.style.display = 'block';
            commentsSection.classList.remove('hidden');
            button.classList.add('active');

            // ✅ FIX: Luôn load comments mỗi lần toggle
            this.loadComments(postId);
        } else {
            // Hide comments
            commentsSection.style.display = 'none';
            commentsSection.classList.add('hidden');
            button.classList.remove('active');
        }
    }

    // ✅ RESTORE: Handle comment submit từ commit e9c744a + 2919f63
    async handleCommentSubmit(button) {
        const postId = button.dataset.postId;
        const textarea = document.querySelector(`.comment-input[data-post-id="${postId}"]`);
        const content = textarea?.value.trim();

        if (!content) return;

        const user = authService.getCurrentUser();
        if (!user) {
            const event = new CustomEvent('showAuthModal', {
                detail: { message: 'Đăng nhập để bình luận' }
            });
            document.dispatchEvent(event);
            return;
        }

        try {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

            await dbService.createComment({
                postId: postId,
                content: content
            }, user);

            textarea.value = '';

            await this.loadComments(postId);

            // Update comment count
            const commentBtn = document.querySelector(`.comment-btn[data-post-id="${postId}"]`);
            const countSpan = commentBtn?.querySelector('.action-count');
            if (countSpan) {
                const currentCount = parseInt(countSpan.textContent) || 0;
                countSpan.textContent = currentCount + 1;
            }

        } catch (error) {
            console.error('❌ Error submitting comment:', error);
            this.showToast('Không thể gửi bình luận', 'error');
        } finally {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-paper-plane"></i>';
        }
    }

    formatContent(content) {
        return content
            .replace(/\n/g, '<br>')
            .replace(/#(\w+)/g, '<span class="hashtag">#$1</span>')
            .replace(/@(\w+)/g, '<span class="mention">@$1</span>');
    }

    getTopicIcon(topic) {
        const icons = {
            'vietnam': '🇻🇳',
            'culture': '🏛️',
            'war': '⚔️',
            'ancient': '🏺'
        };
        return icons[topic] || '📖';
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffInMs = now - date;
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

        if (diffInMinutes < 1) return 'Vừa xong';
        if (diffInMinutes < 60) return `${diffInMinutes} phút`;
        if (diffInHours < 24) return `${diffInHours} giờ`;
        if (diffInDays < 7) return `${diffInDays} ngày`;

        return date.toLocaleDateString('vi-VN');
    }

    getEmptyState() {
        return `
            <div class="empty-state">
                <div class="empty-icon">📚</div>
                <h3>Chưa có bài viết nào</h3>
                <p>Hãy là người đầu tiên chia sẻ câu chuyện lịch sử!</p>
            </div>
        `;
    }

    showError(message) {
        // Reuse toast from ComposeManager style
        const toast = document.createElement('div');
        toast.className = 'toast toast-error';
        toast.textContent = message;

        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '8px',
            backgroundColor: '#ef4444',
            color: 'white',
            zIndex: '9999',
            fontSize: '14px',
            transform: 'translateX(300px)',
            transition: 'transform 0.3s ease'
        });

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);

        setTimeout(() => {
            toast.style.transform = 'translateX(300px)';
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    setLoading(loading) {
        this.isLoading = loading;

        if (loading && this.posts.length === 0) {
            this.feedContainer.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <p>Đang tải bài viết...</p>
                </div>
            `;
        }
    }

    shouldLoadMore() {
        const scrollPosition = window.innerHeight + window.scrollY;
        const documentHeight = document.documentElement.offsetHeight;
        return scrollPosition >= documentHeight - 1000;
    }

    throttle(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}