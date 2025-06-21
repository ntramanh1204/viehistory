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
    }

    init() {
        this.setupEventListeners();
        this.loadInitialPosts();
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

    renderPosts() {
        if (!this.feedContainer) return;

        if (this.posts.length === 0) {
            this.feedContainer.innerHTML = this.getEmptyState();
            return;
        }

        this.feedContainer.innerHTML = this.posts.map(post => this.createPostHTML(post)).join('');
        this.attachPostEventListeners();
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

        // ✅ SỬA: Sử dụng AvatarService để hiển thị avatar nhất quán
        const avatar = AvatarService.shouldUseAvataaars(post.author) ?
            `<img src="${AvatarService.getUserAvatar(post.author, 40)}" alt="${post.author.displayName}" class="author-avatar-img">` :
            `<span class="author-avatar-text">${post.author.displayName.charAt(0).toUpperCase()}</span>`;

        // ✅ THÊM: Format content tốt hơn
        const formattedContent = this.formatPostContent(post.content);

        // ✅ THÊM: Render media với preview tốt hơn
        const mediaHTML = this.createEnhancedMediaHTML(post.media || []);

        // ✅ THÊM: Hashtag rendering
        const hashtagsHTML = this.createHashtagsHTML(post.hashtags || []);

        return `
            <article class="post-item" data-post-id="${post.id}">
                <header class="post-header">
                    <div class="post-author">
                        <div class="author-avatar">${avatar}</div>
                        <div class="author-info">
                            <span class="author-name">${post.author.displayName}</span>
                            <span class="post-time">${timeAgo}</span>
                            ${post.author.isVerified ? '<span class="verified-badge">✓</span>' : ''}
                        </div>
                    </div>
                    ${post.topic ? `<span class="post-topic">${post.topic}</span>` : ''}
                    <div class="post-menu">
                        <button class="post-menu-btn" data-post-id="${post.id}">⋯</button>
                    </div>
                </header>
                
                <div class="post-content">
                    <div class="post-text">${formattedContent}</div>
                    ${mediaHTML}
                    ${hashtagsHTML}
                </div>
                
                <footer class="post-actions">
                    <button class="action-btn like-btn ${post.isLiked ? 'liked' : ''}" data-post-id="${post.id}">
                        <i class="${post.isLiked ? 'fas fa-heart' : 'far fa-heart'}"></i>
                        <span class="action-count">${this.formatCount(post.stats.likes || 0)}</span>
                    </button>
                    
                    <button class="action-btn comment-btn" data-post-id="${post.id}">
                        <i class="far fa-comment"></i>
                        <span class="action-count">${this.formatCount(post.stats.comments || 0)}</span>
                    </button>
                    
                    <button class="action-btn share-btn" data-post-id="${post.id}">
                        <i class="fas fa-share"></i>
                        <span class="action-count">${this.formatCount(post.stats.shares || 0)}</span>
                    </button>

                    <button class="action-btn bookmark-btn" data-post-id="${post.id}">
                        <i class="far fa-bookmark"></i>
                    </button>

                    <a href="/post/${post.id}" class="read-more-btn">Chi tiết</a>
                </footer>

                <div class="comments-section hidden" data-post-id="${post.id}">
                    <div class="comment-form">
                        <div class="comment-avatar">
                            ${authService.isSignedIn() ?
                AvatarService.shouldUseAvataaars(authService.getCurrentUser()) ?
                    `<img src="${AvatarService.getUserAvatar(authService.getCurrentUser(), 32)}" alt="Your avatar">` :
                    `<span class="comment-avatar-text">A</span>` :
                `<span class="comment-avatar-text">A</span>`
            }
                        </div>
                        <div class="comment-input-container">
                            <textarea class="comment-input" placeholder="Viết bình luận..." data-post-id="${post.id}"></textarea>
                            <button class="comment-submit" data-post-id="${post.id}">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        </div>
                    </div>
                    <div class="comments-list" data-post-id="${post.id}">
                        <div class="comments-loading hidden">Đang tải bình luận...</div>
                    </div>
                </div>
            </article>
        `;
    }

    // ✅ THÊM: Format content với link detection
    formatPostContent(content) {
        if (!content) return '';

        // Convert URLs to links
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        let formatted = content.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener">$1</a>');

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
        // Like buttons
        document.querySelectorAll('.like-btn').forEach(btn => {
            btn.replaceWith(btn.cloneNode(true)); // Remove old listeners
        });

        document.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleLike(e));
        });

        // Comment buttons
        document.querySelectorAll('.comment-btn').forEach(btn => {
            btn.replaceWith(btn.cloneNode(true));
        });

        document.querySelectorAll('.comment-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.toggleComments(e));
        });

        // Comment submission
        document.querySelectorAll('.comment-submit').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleCommentSubmit(e));
        });

        if (!this.feedContainer) return;

        // ✅ SỬA: Sử dụng event delegation tốt hơn
        this.feedContainer.addEventListener('click', this.handlePostInteraction.bind(this));
        this.feedContainer.addEventListener('openLightbox', this.handleLightbox.bind(this));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
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
            this.toggleComments(e);
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

    toggleComments(e) {
        const button = e.currentTarget;
        const postId = button.dataset.postId;
        const commentsSection = document.querySelector(`.comments-section[data-post-id="${postId}"]`);

        if (commentsSection) {
            commentsSection.classList.toggle('hidden');

            if (!commentsSection.classList.contains('hidden')) {
                this.loadComments(postId);
            }
        }
    }

    async loadComments(postId) {
        try {
            const comments = await dbService.getComments(postId);
            const commentsContainer = document.querySelector(`.comments-section[data-post-id="${postId}"] .comments-list`);

            if (commentsContainer) {
                commentsContainer.innerHTML = comments.map(comment => this.createCommentHTML(comment)).join('');
            }
        } catch (error) {
            console.error('Error loading comments:', error);
        }
    }

    async handleCommentSubmit(e) {
        const button = e.currentTarget;
        const postId = button.dataset.postId;
        const textarea = document.querySelector(`.comment-input[data-post-id="${postId}"]`);
        const content = textarea?.value.trim();

        if (!content) return;

        const user = authService.currentUser;
        if (!user) {
            // Show auth modal
            const event = new CustomEvent('showAuthModal', {
                detail: {
                    message: 'Đăng nhập để bình luận'
                }
            });
            document.dispatchEvent(event);
            return;
        }

        try {
            button.disabled = true;
            button.textContent = 'Đang gửi...';

            await dbService.createComment({
                postId: postId,
                content: content
            }, user);

            textarea.value = '';
            this.loadComments(postId);

            // Update comment count
            const commentBtn = document.querySelector(`.comment-btn[data-post-id="${postId}"]`);
            const countSpan = commentBtn?.querySelector('.action-count');
            if (countSpan) {
                const currentCount = parseInt(countSpan.textContent) || 0;
                countSpan.textContent = currentCount + 1;
            }

        } catch (error) {
            console.error('Error submitting comment:', error);
            this.showError(error.message);
        } finally {
            button.disabled = false;
            button.textContent = 'Gửi';
        }
    }

    createCommentHTML(comment) {
        const timeAgo = this.getTimeAgo(comment.createdAt);
        const avatarUrl = comment.author.photoURL ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.author.displayName)}&background=6366f1&color=fff`;

        return `
            <div class="comment-item" data-comment-id="${comment.id}">
                <div class="comment-author">
                    <img src="${avatarUrl}" alt="${comment.author.displayName}" class="comment-avatar">
                    <div class="comment-info">
                        <div class="comment-author-name">${comment.author.displayName}</div>
                        <div class="comment-time">${timeAgo}</div>
                    </div>
                </div>
                <div class="comment-content">${this.formatContent(comment.content)}</div>
                
                ${comment.replies && comment.replies.length > 0 ? `
                    <div class="comment-replies">
                        ${comment.replies.map(reply => this.createCommentHTML(reply)).join('')}
                    </div>
                ` : ''}
            </div>
        `;
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