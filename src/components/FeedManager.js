import { dbService } from '../services/DatabaseService.js';
import { authService } from '../services/AuthService.js';

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
    const avatar = post.author.photoURL ?
        `<img src="${post.author.photoURL}" alt="${post.author.displayName}">` :
        `<span class="avatar-text">${post.author.displayName.charAt(0).toUpperCase()}</span>`;

    // ✅ THÊM: Render media nhưng không làm hỏng cấu trúc cũ
    const mediaHTML = this.createMediaHTML(post.media || []);

    return `
        <article class="post-item" data-post-id="${post.id}">
            <header class="post-header">
                <div class="post-author">
                    <div class="author-avatar">${avatar}</div>
                    <div class="author-info">
                        <span class="author-name">${post.author.displayName}</span>
                        <span class="post-time">${timeAgo}</span>
                    </div>
                </div>
                ${post.topic ? `<span class="post-topic">${post.topic}</span>` : ''}
            </header>
            
            <div class="post-content">
                <p class="post-body-text">${this.formatContent(post.content)}</p>
                ${mediaHTML}
                <a href="/post/${post.id}" class="read-more-link">Xem chi tiết</a>
            </div>
            
            <div class="post-actions">
                <button class="action-btn like-btn" data-post-id="${post.id}" data-liked="false">
                    <i class="far fa-heart"></i>
                    <span class="action-count">${post.stats.likes || 0}</span>
                </button>
                
                <button class="action-btn comment-btn" data-post-id="${post.id}">
                    <i class="far fa-comment"></i>
                    <span class="action-count">${post.stats.comments || 0}</span>
                </button>
                
                <button class="action-btn share-btn" data-post-id="${post.id}">
                    <i class="fas fa-share"></i>
                    <span class="action-text">Chia sẻ</span>
                </button>
            </div>

            <div class="comments-section hidden" data-post-id="${post.id}">
                <div class="comment-form">
                    <textarea class="comment-input" placeholder="Viết bình luận..." data-post-id="${post.id}"></textarea>
                    <button class="comment-submit" data-post-id="${post.id}">
                        <i class="fas fa-paper-plane"></i>
                        Gửi
                    </button>
                </div>
                <div class="comments-list"></div>
            </div>
        </article>
    `;
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