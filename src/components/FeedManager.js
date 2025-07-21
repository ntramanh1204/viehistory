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
        this.commentLikeCache = new Map();
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
        // Use author.photoURL/avatar if available (from Firestore), else Avataaars, else initials
        let avatar;
        if (post.author && (post.author.photoURL || post.author.avatar)) {
            avatar = `<img src="${post.author.photoURL || post.author.avatar}" alt="${post.author.displayName}" class="author-avatar-img">`;
            console.log('[DEBUG] Using author Firestore avatar for post:', post.author.photoURL || post.author.avatar);
        } else if (AvatarService.shouldUseAvataaars(post.author)) {
            avatar = `<img src="${AvatarService.getUserAvatar(post.author, 40)}" alt="${post.author.displayName}" class="author-avatar-img">`;
            console.log('[DEBUG] Using Avataaars for post:', post.author.uid);
        } else {
            avatar = `<span class="author-avatar-text">${post.author.displayName.charAt(0).toUpperCase()}</span>`;
            console.log('[DEBUG] Using initials for post:', post.author.displayName);
        }

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

        // Lấy số lượng comment/share nếu có
        const commentCount = post.stats?.comments || 0;
        const shareCount = post.stats?.shares || 0;

        return `
            <article class="post-item" data-post-id="${post.id}" data-author-id="${post.author.uid}">
                <div class="post-header">
                    <div class="post-author">
                        <div class="author-avatar">${avatar}</div>
                        <div class="author-info">
                            <span class="author-name" data-user-id="${post.author.uid}">${post.author.displayName}</span>
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
                <footer class="post-actions">
                    <button class="action-btn like-btn ${likedClass}" data-post-id="${post.id}">
                        <span class="action-icon"><i class="${heartIcon}"></i></span>
                        <span class="action-count">${post.stats?.likes || 0}</span>
                    </button>
                    <button class="action-btn comment-btn" data-post-id="${post.id}">
                        <span class="action-icon"><i class="far fa-comment"></i></span>
                        <span class="action-count">${commentCount}</span>
                    </button>
                    <button class="action-btn share-btn" data-post-id="${post.id}">
                        <span class="action-icon"><i class="fas fa-share"></i></span>
                        <span class="action-count">${shareCount}</span>
                    </button>
                </footer>
                <!-- Comments section -->
                <div class="comments-section hidden" data-post-id="${post.id}" style="display: none;">
                    <div class="comment-form">
                        <div class="comment-avatar">
                            ${(() => {
                const user = window.currentUserData || authService.getCurrentUser();
                if (user && (user.photoURL || user.avatar)) {
                    return `<img src="${user.photoURL || user.avatar}" alt="${user.displayName || ''}" class="comment-avatar-img">`;
                } else if (user && user.displayName) {
                    return `<span class="comment-avatar-text">${user.displayName.charAt(0).toUpperCase()}</span>`;
                } else {
                    return `<span class="comment-avatar-text">A</span>`;
                }
            })()}
                        </div>
                        <div class="comment-input-container">
                            <textarea class="comment-input" data-post-id="${post.id}" placeholder="Viết bình luận..."></textarea>
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

    attachPostEventListeners() {
        if (!this.feedContainer) return;

        // Remove old listeners
        this.feedContainer.removeEventListener('click', this.handlePostClick);

        // Add single delegated listener
        this.handlePostClick = this.handlePostClick.bind(this);
        this.feedContainer.addEventListener('click', this.handlePostClick);

        // ✅ Thêm event delegation cho author-name
        this.feedContainer.removeEventListener('click', this.handleAuthorNameClick);
        this.handleAuthorNameClick = (e) => {
            const authorName = e.target.closest('.author-name');
            if (authorName) {
                const userId = authorName.dataset.userId;
                if (userId) {
                    // Hide hover card nếu có
                    if (window.profileHoverCard) window.profileHoverCard.hideCard?.();

                    // Chuyển hướng bằng History API
                    window.history.pushState({}, '', `/profile/${userId}`);
                    window.dispatchEvent(new PopStateEvent('popstate'));
                }
            }
        };
        this.feedContainer.addEventListener('click', this.handleAuthorNameClick);
    }

    // ✅ SỬA: Fix event delegation từ commit 2919f63 + ADD comment handlers
    handlePostClick(e) {
        const target = e.target.closest('button');
        console.log('[handlePostClick] target:', target, 'event:', e);
        if (!target) return;

        e.preventDefault();
        e.stopPropagation();

        // Handle post actions (require postId)
        const postId = target.dataset.postId;
        if (postId) {
            console.log('[handlePostClick] postId:', postId);

            // Route to specific post handlers
            if (target.classList.contains('like-btn')) {
                this.handleLikeOptimistic(target, postId);
            } else if (target.classList.contains('comment-btn')) {
                const commentId = target.dataset.commentId;
                this.toggleComments(target); // Pass button directly
            } else if (target.classList.contains('share-btn')) {
                this.handleShare(target, postId);
                return;
            } else if (target.classList.contains('comment-submit-btn')) {
                this.handleCommentSubmit(target);
            } else if (target.classList.contains('post-menu-btn')) {
                console.log('[handlePostClick] post-menu-btn clicked');
                this.showPostMenu(e);
                return;
            }
            return;
        }

        // Handle comment actions (require commentId)
        const commentId = target.dataset.commentId;
        if (commentId) {
            console.log('[handlePostClick] commentId:', commentId);

            // Route to specific comment handlers
            if (target.classList.contains('comment-like-btn')) {
                this.handleCommentLike(target, commentId);
            } else if (target.classList.contains('comment-reply-btn')) {
                this.handleCommentReply(target, commentId);
            }
        }
    }

    // ...existing code...
    async handleCommentLikeOptimistic(button, commentId) {
        // Ngăn spam
        if (button.classList.contains('pending')) return;

        const user = authService.getCurrentUser();
        if (!user) {
            const event = new CustomEvent('showAuthModal', {
                detail: { message: 'Đăng nhập để thích bình luận' }
            });
            document.dispatchEvent(event);
            return;
        }

        const countSpan = button.querySelector('.like-count');
        const icon = button.querySelector('i');
        const isLiked = button.classList.contains('liked');
        let currentCount = parseInt(countSpan.textContent) || 0;

        // Optimistic UI
        button.classList.add('pending');
        if (isLiked) {
            button.classList.remove('liked');
            icon.className = 'far fa-heart';
            countSpan.textContent = Math.max(0, currentCount - 1);
        } else {
            button.classList.add('liked');
            icon.className = 'fas fa-heart';
            countSpan.textContent = currentCount + 1;
        }

        try {
            const result = await dbService.toggleLike('comment', commentId, user);

            // Nếu server trả về khác optimistic thì rollback
            if (result.liked !== !isLiked) {
                if (result.liked) {
                    button.classList.add('liked');
                    icon.className = 'fas fa-heart';
                    countSpan.textContent = currentCount + 1;
                } else {
                    button.classList.remove('liked');
                    icon.className = 'far fa-heart';
                    countSpan.textContent = Math.max(0, currentCount - 1);
                }
            }

            this.commentLikeCache.set(commentId, result.liked);

            // (Tùy chọn) Gửi notification cho chủ comment nếu cần
            // await dbService.createLikeNotificationForComment(commentId, ...);

        } catch (error) {
            // Rollback nếu lỗi
            if (isLiked) {
                button.classList.add('liked');
                icon.className = 'fas fa-heart';
                countSpan.textContent = currentCount;
            } else {
                button.classList.remove('liked');
                icon.className = 'far fa-heart';
                countSpan.textContent = currentCount;
            }
            this.showToast('Không thể thích bình luận', 'error');
        } finally {
            button.classList.remove('pending');
        }
    }
    // ...existing code...

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

            // Create notification if liked
            if (result.liked && result.postAuthor) {
                await dbService.createLikeNotification(
                    postId,
                    result.postAuthor.uid,
                    user
                );
            }

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
    // async handleShare(button, postId) {
    //     if (!button || !postId) return;

    //     // Use ShareManager if available
    //     if (window.shareManager) {
    //         await window.shareManager.handleShare(postId, button);
    //     } else {
    //         // Fallback
    //         const postUrl = `${window.location.origin}/post/${postId}`;
    //         await navigator.clipboard.writeText(postUrl);
    //         this.showToast('Đã sao chép link!');
    //     }
    // }

   async handleShare(button, postId) {
    if (!button || !postId) return;
    this.showCustomShareModal(postId);
}

// ...existing code...

showCustomShareModal(postId) {
    // Xóa modal cũ nếu có
    document.querySelector('.custom-share-modal')?.remove();

    const postUrl = `${window.location.origin}/post/${postId}`;
    const modal = document.createElement('div');
    modal.className = 'custom-share-modal modal';
    modal.innerHTML = `
        <div class="modal-content share-modal-content">
            <button class="modal-close share-modal-close">&times;</button>
            <h3>Chia sẻ bài viết</h3>
            <div class="share-options">
                <button class="share-option" data-action="profile">
                    <i class="fas fa-share-square"></i> Chia sẻ về tường nhà
                </button>
                <button class="share-option" data-action="app">
                    <i class="fas fa-paper-plane"></i> Chia sẻ qua ứng dụng
                </button>
                <button class="share-option" data-action="copy">
                    <i class="fas fa-link"></i> Sao chép link
                </button>
            </div>
            <div class="share-url">
                <input type="text" class="share-url-input" value="${postUrl}" readonly>
                <button class="share-url-copy">Sao chép</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Sự kiện đóng modal
    modal.querySelector('.share-modal-close').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    // Sự kiện các nút chia sẻ
    modal.addEventListener('click', async (e) => {
        const btn = e.target.closest('.share-option');
        if (!btn) return;
        
        const action = btn.dataset.action;
        
        if (action === 'profile') {
            try {
                // Add loading state
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang chia sẻ...';
                
                // Call the database service method
                await dbService.sharePostToProfile(postId);
                
                // Update share count in UI
                this.incrementShareCountUI(document.querySelector(`.share-btn[data-post-id="${postId}"]`));
                
                this.showToast('Đã chia sẻ về tường nhà!');
                modal.remove();
                
            } catch (error) {
                console.error('Error sharing to profile:', error);
                this.showToast('Không thể chia sẻ bài viết', 'error');
                
                // Reset button
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-share-square"></i> Chia sẻ về tường nhà';
            }
        } else if (action === 'app') {
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: 'VieHistory - Dòng chảy Lịch sử',
                        text: 'Xem bài viết thú vị này trên VieHistory',
                        url: postUrl
                    });
                } catch (error) {
                    if (error.name !== 'AbortError') {
                        console.error('Error sharing:', error);
                    }
                }
            } else {
                window.open(`https://zalo.me/share?url=${encodeURIComponent(postUrl)}`, '_blank');
            }
            modal.remove();
        } else if (action === 'copy') {
            try {
                await navigator.clipboard.writeText(postUrl);
                this.showToast('Đã sao chép link!');
            } catch (error) {
                console.error('Error copying to clipboard:', error);
                this.showToast('Không thể sao chép link', 'error');
            }
        }
    });

    // Sự kiện copy link ở dưới
    modal.querySelector('.share-url-copy').onclick = async () => {
        try {
            await navigator.clipboard.writeText(postUrl);
            this.showToast('Đã sao chép link!');
        } catch (error) {
            console.error('Error copying to clipboard:', error);
            this.showToast('Không thể sao chép link', 'error');
        }
    };

    // Escape key để đóng modal
    const esc = (e) => { 
        if (e.key === 'Escape') { 
            modal.remove(); 
            document.removeEventListener('keydown', esc); 
        } 
    };
    document.addEventListener('keydown', esc);
}

// ...existing code...

    incrementShareCountUI(button) {
        const countSpan = button.querySelector('.action-count');
        if (countSpan) {
            const currentCount = parseInt(countSpan.textContent) || 0;
            countSpan.textContent = currentCount + 1;
        }
        button.classList.add('shared');
        setTimeout(() => button.classList.remove('shared'), 2000);
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
        const post = this.posts.find(p => p.id === postId);
        const isOwner = user && post && post.author && user.uid === post.author.uid;

        console.log('🔧 Post menu - postId:', postId);
        console.log('🔧 Post menu - user:', user ? user.uid : 'null');
        console.log('🔧 Post menu - post author:', post?.author?.uid);
        console.log('🔧 Post menu - isOwner:', isOwner);

        // Remove any existing menu if open
        const existingMenu = document.querySelector('.post-context-menu');
        if (existingMenu) {
            // If clicking the same button, just close
            if (existingMenu._button === button) {
                existingMenu.remove();
                return;
            } else {
                existingMenu.remove();
            }
        }

        // Create context menu
        const menu = document.createElement('div');
        menu.className = 'post-context-menu';
        menu.setAttribute('role', 'menu');
        menu.setAttribute('aria-label', 'Post actions');
        menu.innerHTML = `
            <button class="menu-item" data-action="copy-link" role="menuitem" aria-label="Copy post link">
                <span class="menu-icon"><i class="fas fa-link"></i></span>
                <span class="menu-text">Sao chép link</span>
            </button>
            ${isOwner ? `
            <button class="menu-item" data-action="edit" role="menuitem" aria-label="Edit post">
                <span class="menu-icon"><i class="fas fa-edit"></i></span>
                <span class="menu-text">Chỉnh sửa</span>
            </button>` : ''}
            ${isOwner ? `
            <button class="menu-item menu-item-danger" data-action="delete" role="menuitem" aria-label="Delete post">
                <span class="menu-icon"><i class="fas fa-trash"></i></span>
                <span class="menu-text">Xóa</span>
            </button>` : ''}
        `;
        menu._button = button; // Track which button opened it

        // Position menu
        const rect = button.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = rect.bottom + 'px';
        menu.style.right = (window.innerWidth - rect.right) + 'px';
        menu.style.zIndex = '1000';

        document.body.appendChild(menu);

        // Handle menu actions
        menu.addEventListener('click', async (e) => {
            const menuItem = e.target.closest('.menu-item');
            if (!menuItem) return;

            const action = menuItem.dataset.action;
            console.log('🔧 Menu action clicked:', action, 'for post:', postId);

            switch (action) {
                case 'copy-link':
                    await navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`);
                    this.showToast('Đã sao chép link!');
                    break;
                case 'edit':
                    console.log('🔧 Calling handleEditPost for:', postId);
                    this.handleEditPost(postId);
                    break;
                case 'delete':
                    this.handleDeletePost(postId);
                    break;
            }
            menu.remove();
        });

        // Close menu when clicking outside
        setTimeout(() => {
            const outsideClick = (ev) => {
                if (!menu.contains(ev.target) && ev.target !== button) {
                    menu.remove();
                    document.removeEventListener('click', outsideClick);
                }
            };
            document.addEventListener('click', outsideClick);
        }, 0);

        // Close menu on scroll
        const closeOnScroll = () => {
            menu.remove();
            window.removeEventListener('scroll', closeOnScroll);
        };
        window.addEventListener('scroll', closeOnScroll);
    }

    // Handle edit post
    handleEditPost(postId) {
        console.log('🔧 handleEditPost called with postId:', postId);
        console.log('🔧 Available posts:', this.posts.map(p => p.id));

        const post = this.posts.find(p => p.id === postId);
        if (!post) {
            console.error('🔧 Post not found for ID:', postId);
            this.showToast('Không tìm thấy bài viết', 'error');
            return;
        }

        console.log('🔧 Found post:', post);
        this.showEditPostModal(post);
    }

    // Handle delete post (to be implemented)
    handleDeletePost(postId) {
        const post = this.posts.find(p => p.id === postId);
        if (!post) {
            console.error('Post not found for ID:', postId);
            this.showToast('Không tìm thấy bài viết', 'error');
            return;
        }

        this.showDeleteConfirmModal(post);
    }

    // ✅ NEW: Show delete confirmation modal
    showDeleteConfirmModal(post) {
        // Remove any existing delete modal
        const existingModal = document.querySelector('.delete-post-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create confirmation modal
        const modal = document.createElement('div');
        modal.className = 'modal delete-post-modal';
        modal.innerHTML = `
            <div class="modal-content delete-post-content">
                <div class="modal-header">
                    <h3>Xác nhận xóa bài viết</h3>
                    <button class="modal-close delete-post-close">&times;</button>
                </div>
                
                <div class="modal-body">
                    <div class="delete-warning">
                        <div class="warning-icon">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <div class="warning-content">
                            <p>Bạn có chắc chắn muốn xóa bài viết này không?</p>
                            <div class="post-preview">
                                <div class="post-preview-content">
                                    ${post.content.length > 100 ?
                post.content.substring(0, 100) + '...' :
                post.content}
                                </div>
                                ${post.media && post.media.length > 0 ?
                `<div class="post-preview-media">
                                        <i class="fas fa-image"></i> ${post.media.length} media file(s)
                                    </div>` : ''}
                            </div>
                            <p class="warning-text">
                                <strong>Hành động này không thể hoàn tác.</strong> 
                                Bài viết và tất cả bình luận sẽ bị xóa vĩnh viễn.
                            </p>
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button type="button" class="btn-secondary" id="cancel-delete-post">Hủy</button>
                    <button type="button" class="btn-danger" id="confirm-delete-post" data-post-id="${post.id}">
                        <span class="btn-text">Xóa bài viết</span>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Setup modal event listeners
        this.setupDeleteModalListeners(modal, post);

        // Show modal
        requestAnimationFrame(() => {
            modal.classList.add('show');
            document.getElementById('cancel-delete-post').focus();
        });
    }

    // ✅ NEW: Setup delete modal event listeners
    setupDeleteModalListeners(modal, post) {
        const closeBtn = modal.querySelector('.delete-post-close');
        const cancelBtn = document.getElementById('cancel-delete-post');
        const confirmBtn = document.getElementById('confirm-delete-post');

        const closeModal = () => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Escape key to close
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        // Confirm delete
        confirmBtn.addEventListener('click', async () => {
            await this.handleDeletePostConfirmed(post.id, modal);
        });
    }

    // ✅ NEW: Handle confirmed post deletion
    async handleDeletePostConfirmed(postId, modal) {
        const confirmBtn = document.getElementById('confirm-delete-post');
        const btnText = confirmBtn.querySelector('.btn-text');
        const originalText = btnText.textContent;

        try {
            // Set loading state
            confirmBtn.disabled = true;
            btnText.textContent = 'Đang xóa...';

            const user = authService.getCurrentUser();
            if (!user) {
                throw new Error('Bạn cần đăng nhập để xóa bài viết');
            }

            // Delete from database
            await dbService.deletePost(postId, user);

            // Remove from local posts array
            this.posts = this.posts.filter(p => p.id !== postId);

            // Remove from DOM
            const postElement = document.querySelector(`[data-post-id="${postId}"]`);
            if (postElement) {
                postElement.style.transition = 'all 0.3s ease';
                postElement.style.transform = 'translateX(-100%)';
                postElement.style.opacity = '0';

                setTimeout(() => {
                    postElement.remove();
                }, 300);
            }

            this.showToast('Đã xóa bài viết thành công!');

            // Close modal
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);

            // Dispatch event for other components
            const deleteEvent = new CustomEvent('postDeleted', {
                detail: { postId }
            });
            document.dispatchEvent(deleteEvent);

        } catch (error) {
            console.error('Error deleting post:', error);
            this.showToast(error.message || 'Có lỗi xảy ra khi xóa bài viết', 'error');
        } finally {
            // Reset button state
            confirmBtn.disabled = false;
            btnText.textContent = originalText;
        }
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
            if (!commentsSection) return;

            commentsSection.innerHTML = '<div class="comments-loading">Đang tải bình luận...</div>';
            await new Promise(resolve => setTimeout(resolve, 10));
            const comments = await dbService.getComments(postId);

            // NEW: Lấy tất cả id của comment và reply (đệ quy)
            function collectAllCommentIds(comments) {
                let ids = [];
                for (const c of comments) {
                    ids.push(c.id);
                    if (c.replies && c.replies.length > 0) {
                        ids = ids.concat(collectAllCommentIds(c.replies));
                    }
                }
                return ids;
            }

            const user = authService.getCurrentUser();
            if (user && comments.length > 0) {
                const allCommentIds = collectAllCommentIds(comments);
                const likeStatuses = await dbService.checkMultipleLikes('comment', allCommentIds, user.uid);
                allCommentIds.forEach(id => {
                    this.commentLikeCache.set(id, !!likeStatuses[id]);
                });
            }

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
        const isLiked = this.commentLikeCache?.get(comment.id) || false;
        const likedClass = isLiked ? 'liked' : '';
        const heartIcon = isLiked ? 'fas fa-heart' : 'far fa-heart';


        // Debug: log the author object for troubleshooting
        console.log('[DEBUG] Rendering comment author:', comment.author);

        // Prefer photoURL, then avatar, then Avataaars, then initials
        let avatar;
        try {
            if (comment.author && comment.author.photoURL) {
                avatar = `<img src="${comment.author.photoURL}" alt="${comment.author.displayName}" class="comment-avatar-img">`;
            } else if (comment.author && comment.author.avatar) {
                avatar = `<img src="${comment.author.avatar}" alt="${comment.author.displayName}" class="comment-avatar-img">`;
            } else if (AvatarService.shouldUseAvataaars(comment.author)) {
                avatar = `<img src="${AvatarService.getUserAvatar(comment.author, 32)}" alt="${comment.author.displayName}" class="comment-avatar-img">`;
            } else {
                avatar = `<span class="comment-avatar-text">${comment.author.displayName?.charAt(0).toUpperCase() || 'A'}</span>`;
            }
        } catch (error) {
            console.error('Error generating avatar:', error);
            avatar = `<span class="comment-avatar-text">${comment.author?.displayName?.charAt(0).toUpperCase() || 'A'}</span>`;
        }
        return `
            <div class="comment-item" data-comment-id="${comment.id}" data-author-id="${comment.author.uid}">
                <div class="comment-avatar">
                    ${avatar}
                </div>
                <div class="comment-content">
                    <div class="comment-header">
                        <span class="comment-author-name author-name" data-user-id="${comment.author.uid}">${comment.author.displayName}</span>
                        <span class="comment-time">${timeAgo}</span>
                        ${comment.author.isVerified ? '<span class="verified-badge">✓</span>' : ''}
                    </div>
                    <div class="comment-text">${this.formatCommentContent(comment.content)}</div>
                    <div class="comment-actions">
                        <button class="comment-like-btn ${likedClass}" data-comment-id="${comment.id}">
                            <i class="${heartIcon}"></i>
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
        const isLiked = this.commentLikeCache?.get(reply.id) || false;
        const likedClass = isLiked ? 'liked' : '';
        const heartIcon = isLiked ? 'fas fa-heart' : 'far fa-heart';

        // ✅ SỬA: Sử dụng AvatarService cho replies
        // Ưu tiên dùng ảnh thật, fallback Avataaars, cuối cùng là chữ cái đầu
        let avatar;
        try {
            if (reply.author && reply.author.photoURL) {
                avatar = `<img src="${reply.author.photoURL}" alt="${reply.author.displayName}" class="reply-avatar-img">`;
            } else if (reply.author && reply.author.avatar) {
                avatar = `<img src="${reply.author.avatar}" alt="${reply.author.displayName}" class="reply-avatar-img">`;
            } else if (AvatarService.shouldUseAvataaars(reply.author)) {
                avatar = `<img src="${AvatarService.getUserAvatar(reply.author, 28)}" alt="${reply.author.displayName}" class="reply-avatar-img">`;
            } else {
                avatar = `<span class="reply-avatar-text">${reply.author.displayName.charAt(0).toUpperCase()}</span>`;
            }
        } catch (error) {
            console.error('Error generating avatar for reply:', error);
            avatar = `<span class="reply-avatar-text">${reply.author?.displayName?.charAt(0).toUpperCase() || 'A'}</span>`;
        }
        return `
            <div class="comment-reply" data-comment-id="${reply.id}" data-author-id="${reply.author.uid}">
                <div class="reply-avatar">
                    ${avatar}
                </div>
                <div class="reply-content">
                    <div class="reply-header">
                        <span class="reply-author-name author-name" data-user-id="${reply.author.uid}">${reply.author.displayName}</span>
                        <span class="reply-time">${timeAgo}</span>
                    </div>
                    <div class="reply-text">${this.formatCommentContent(reply.content)}</div>
                    <div class="reply-actions">
                        <button class="comment-like-btn ${likedClass}" data-comment-id="${reply.id}">
                            <i class="${heartIcon}"></i>
                            <span class="like-count">${reply.stats?.likes || 0}</span>
                        </button>
                        <button class="comment-reply-btn" data-comment-id="${reply.id}">
                            <i class="far fa-comment"></i>
                            Trả lời
                        </button>
                    </div>

                    ${reply.replies && reply.replies.length > 0 ? `
                    <div class="comment-replies">
                        ${reply.replies.map(nestedReply => this.createReplyHTML(nestedReply)).join('')}
                    </div>
                ` : ''}

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

        // Use Firestore user data for author
        const firestoreUser = window.currentUserData;
        const user = firestoreUser || authService.getCurrentUser();
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

            // Build author info from Firestore user
            const authorInfo = {
                uid: user.uid,
                displayName: user.displayName,
                avatar: user.avatar,
                photoURL: user.photoURL
            };

            await dbService.createComment({
                postId: postId,
                content: content,
                author: authorInfo
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

            // Create notification for comment
            const post = this.posts.find(p => p.id === postId);
            if (post && post.author) {
                await dbService.createCommentNotification(
                    postId,
                    post.author.uid,
                    authorInfo,
                    content
                );
            }

        } catch (error) {
            console.error('❌ Error submitting comment:', error);
            this.showToast('Không thể gửi bình luận', 'error');
        } finally {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-paper-plane"></i>';
        }
    }

    // ✅ NEW: Handle comment like
    async handleCommentLike(button, commentId) {
        const user = authService.getCurrentUser();
        if (!user) {
            const event = new CustomEvent('showAuthModal', {
                detail: { message: 'Đăng nhập để thích bình luận' }
            });
            document.dispatchEvent(event);
            return;
        }

        try {
            const countSpan = button.querySelector('.like-count');
            const currentCount = parseInt(countSpan.textContent) || 0;
            const isLiked = button.classList.contains('liked');
            const icon = button.querySelector('i');

            // Optimistic update
            button.disabled = true;
            if (isLiked) {
                button.classList.remove('liked');
                icon.className = 'far fa-heart';
                countSpan.textContent = Math.max(0, currentCount - 1);
            } else {
                button.classList.add('liked');
                icon.className = 'fas fa-heart';
                countSpan.textContent = currentCount + 1;

                // Add animation
                button.style.transform = 'scale(1.2)';
                setTimeout(() => {
                    button.style.transform = 'scale(1)';
                }, 150);
            }

            // API call
            const result = await dbService.toggleLike('comment', commentId, user);

            // Verify optimistic update was correct
            if (result.liked !== !isLiked) {
                // Rollback if different
                if (result.liked) {
                    button.classList.add('liked');
                    icon.className = 'fas fa-heart';
                    countSpan.textContent = currentCount + 1;
                } else {
                    button.classList.remove('liked');
                    icon.className = 'far fa-heart';
                    countSpan.textContent = Math.max(0, currentCount - 1);
                }
            }

            this.commentLikeCache.set(commentId, result.liked);

        } catch (error) {
            console.error('❌ Error liking comment:', error);
            this.showToast('Không thể thích bình luận', 'error');

            // Rollback on error
            const countSpan = button.querySelector('.like-count');
            const currentCount = parseInt(countSpan.textContent) || 0;
            const isLiked = button.classList.contains('liked');
            const icon = button.querySelector('i');

            if (isLiked) {
                button.classList.remove('liked');
                icon.className = 'far fa-heart';
                countSpan.textContent = Math.max(0, currentCount - 1);
            } else {
                button.classList.add('liked');
                icon.className = 'fas fa-heart';
                countSpan.textContent = currentCount + 1;
            }
        } finally {
            button.disabled = false;
        }
    }

    // ✅ NEW: Handle comment reply
    async handleCommentReply(button, commentId) {
        // const user = authService.getCurrentUser();
        const user = window.currentUserData || authService.getCurrentUser();
        if (!user) {
            const event = new CustomEvent('showAuthModal', {
                detail: { message: 'Đăng nhập để trả lời bình luận' }
            });
            document.dispatchEvent(event);
            return;
        }

        // Find the comment element
        const commentElement = button.closest('.comment-item');
        if (!commentElement) return;

        // Check if reply form already exists
        let replyForm = commentElement.querySelector('.reply-form');
        if (replyForm) {
            // Toggle visibility
            replyForm.style.display = replyForm.style.display === 'none' ? 'block' : 'none';
            if (replyForm.style.display !== 'none') {
                replyForm.querySelector('textarea').focus();
            }
            return;
        }

        // Create reply form
        replyForm = document.createElement('div');
        replyForm.className = 'reply-form';
        replyForm.innerHTML = `
            <div class="reply-input-container">
                <textarea class="reply-input" placeholder="Viết trả lời..." data-comment-id="${commentId}"></textarea>
                <div class="reply-actions">
                    <button class="reply-submit-btn" data-comment-id="${commentId}">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                    <button class="reply-cancel-btn">
                        Hủy
                    </button>
                </div>
            </div>
        `;

        // Insert after comment content
        const commentContent = commentElement.querySelector('.comment-content');
        commentContent.appendChild(replyForm);

        // Focus on textarea
        const textarea = replyForm.querySelector('.reply-input');
        textarea.focus();

        // Handle submit
        const submitBtn = replyForm.querySelector('.reply-submit-btn');
        submitBtn.onclick = async () => {
            const content = textarea.value.trim();
            if (!content) return;

            try {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

                // Get post ID from comments section
                const commentsSection = commentElement.closest('.comments-section');
                const postId = commentsSection.dataset.postId;

                const authorInfo = {
                    uid: user.uid,
                    displayName: user.displayName,
                    avatar: user.avatar,
                    photoURL: user.photoURL
                };

                await dbService.createComment({
                    postId: postId,
                    content: content,
                    parentId: commentId,
                    author: authorInfo
                }, user);

                console.log('[DEBUG] hehehehhehe User object khi submit comment/reply: ', user);

                // Remove reply form
                replyForm.remove();

                // Reload comments to show new reply
                await this.loadComments(postId);

                this.showToast('Trả lời đã được gửi!', 'success');

            } catch (error) {
                console.error('❌ Error submitting reply:', error);
                this.showToast('Không thể gửi trả lời', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Gửi';
            }
        };

        // Handle cancel
        const cancelBtn = replyForm.querySelector('.reply-cancel-btn');
        cancelBtn.onclick = () => {
            replyForm.remove();
        };

        // Handle Enter key (Ctrl+Enter to submit)
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                submitBtn.click();
            }
        });
    }

    // ✅ ADD: Missing utility methods
    throttle(func, delay) {
        let lastCall = 0;
        return function (...args) {
            const now = new Date().getTime();
            if (now - lastCall < delay) {
                return;
            }
            lastCall = now;
            return func(...args);
        }
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

    shouldLoadMore() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;

        return scrollTop + windowHeight >= documentHeight - 1000; // Load when 1000px from bottom
    }

    setLoading(loading) {
        this.isLoading = loading;
        // You can add loading UI here if needed
        if (loading) {
            console.log('🔄 Loading posts...');
        }
    }

    showAuthRequired(message) {
        const event = new CustomEvent('showAuthModal', {
            detail: { message }
        });
        document.dispatchEvent(event);
    }

    showError(message) {
        // Reuse toast for error display
        this.showToast(message, 'error');
    }
}