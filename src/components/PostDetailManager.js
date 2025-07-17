import { authService } from '../services/AuthService.js';
import { dbService } from '../services/DatabaseService.js';
import { AvatarService } from '../services/AvatarService.js';

export class PostDetailManager {
    constructor() {
        this.postId = null;
        this.post = null;
        this.comments = [];
    }

    async init(postId) {
        this.postId = postId;
        await this.loadPost();
        await this.loadComments();
        this.setupEventListeners();
    }

    async loadPost() {
        try {
            this.post = await dbService.getPostById(this.postId);
            if (this.post) {
                this.renderPost();
                // Increment view count
                await dbService.incrementPostViews(this.postId);
            }
        } catch (error) {
            console.error('Error loading post:', error);
        }
    }

    renderPost() {
        const postContainer = document.querySelector('.post-detail-card');
        if (postContainer && this.post) {
            postContainer.innerHTML = this.createDetailedPostHTML(this.post);
        }
    }

createDetailedPostHTML(post) {
    const timeAgo = this.getTimeAgo(post.createdAt);
    
    // Use same avatar logic as FeedManager
    let avatar;
    if (post.author && (post.author.photoURL || post.author.avatar)) {
        avatar = `<img src="${post.author.photoURL || post.author.avatar}" alt="${post.author.displayName}" class="author-avatar-img">`;
    } else if (AvatarService && AvatarService.shouldUseAvataaars && AvatarService.shouldUseAvataaars(post.author)) {
        avatar = `<img src="${AvatarService.getUserAvatar(post.author, 40)}" alt="${post.author.displayName}" class="author-avatar-img">`;
    } else {
        avatar = `<span class="author-avatar-text">${post.author.displayName.charAt(0).toUpperCase()}</span>`;
    }
    
    // Format content same way as FeedManager
    let formattedContent = this.formatContent(post.content);
    
    // Generate media HTML if present
    const mediaHTML = post.media && post.media.length > 0 ? 
        this.createMediaHTML(post.media) : '';
    
    // Generate hashtags HTML if present
    const hashtagsHTML = post.hashtags && post.hashtags.length > 0 ? 
        this.createHashtagsHTML(post.hashtags) : '';
    
    // Check if post is liked
    const user = authService.currentUser;
    const isLiked = user && post.likedBy && post.likedBy.includes(user.uid);
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
            <footer class="post-actions">
                <button class="action-btn like-btn ${likedClass}" data-post-id="${post.id}">
                    <span class="action-icon"><i class="${heartIcon}"></i></span>
                    <span class="action-count">${post.stats?.likes || 0}</span>
                </button>
                <button class="action-btn comment-btn" data-post-id="${post.id}">
                    <span class="action-icon"><i class="far fa-comment"></i></span>
                    <span class="action-count">${post.stats?.comments || 0}</span>
                </button>
                <button class="action-btn share-btn" data-post-id="${post.id}">
                    <span class="action-icon"><i class="fas fa-share"></i></span>
                    <span class="action-count">${post.stats?.shares || 0}</span>
                </button>
            </footer>
        </article>
    `;
}

// Add these methods to PostDetailManager class
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

createHashtagsHTML(hashtags) {
    if (!hashtags || hashtags.length === 0) return '';

    const hashtagItems = hashtags.map(tag =>
        `<a href="/?hashtag=${encodeURIComponent(tag)}" class="hashtag">#${tag}</a>`
    ).join(' ');

    return `<div class="post-hashtags">${hashtagItems}</div>`;
}

// Also update the formatContent method to match FeedManager's formatPostContent
formatContent(content) {
    if (!content) return '<p>Nội dung trống</p>';

    // Ensure content is a string
    const safeContent = String(content || '');

    // Convert URLs to links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    let formatted = safeContent.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener">$1</a>');

    // Convert mentions to links
    const mentionRegex = /@(\w+)/g;
    formatted = formatted.replace(mentionRegex, '<span class="mention">@$1</span>');

    // Convert line breaks
    formatted = formatted.replace(/\n/g, '<br>');

    return formatted;
}

    async loadComments() {
        try {
            this.comments = await dbService.getComments(this.postId);
            this.renderComments();
        } catch (error) {
            console.error('Error loading comments:', error);
        }
    }

    renderComments() {
        const commentsContainer = document.querySelector('.comments-list-detail');
        if (commentsContainer) {
            commentsContainer.innerHTML = this.createCommentsHTML(this.comments);
        }
    }

    // ✅ SỬA: Update createCommentsHTML để sử dụng AvatarService
    createCommentsHTML(comments) {
        if (!comments || comments.length === 0) {
            return '<p class="no-comments">Chưa có bình luận nào.</p>';
        }

        return comments.map(comment => {
            const timeAgo = this.getTimeAgo(comment.createdAt);

            // ✅ SỬA: Sử dụng AvatarService giống FeedManager
            const avatar = AvatarService.shouldUseAvataaars(comment.author) ?
                `<img src="${AvatarService.getUserAvatar(comment.author, 32)}" alt="${comment.author.displayName}" class="comment-avatar-img">` :
                `<span class="comment-avatar-text">${comment.author.displayName.charAt(0).toUpperCase()}</span>`;

            return `
                <div class="comment-item">
                    <div class="comment-avatar">${avatar}</div>
                    <div class="comment-content">
                        <div class="comment-header">
                            <span class="comment-author-name">${comment.author.displayName}</span>
                            <span class="comment-time">${timeAgo}</span>
                        </div>
                        <div class="comment-text">${this.formatContent(comment.content)}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    setupEventListeners() {
        // Back button
        document.getElementById('back-to-feed')?.addEventListener('click', () => {
            navigate('/');
        });

        // Comment submit
        document.querySelector('.comment-submit-detail')?.addEventListener('click', async () => {
            await this.handleCommentSubmit();
        });

        // Enter key submit
        document.querySelector('.comment-input-detail')?.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                await this.handleCommentSubmit();
            }
        });

        // ✅ Like button - chỉ bind cho post detail container
        const postDetailContainer = document.getElementById('post-detail-container');
        if (postDetailContainer) {
            postDetailContainer.addEventListener('click', async (e) => {
                if (e.target.closest('.like-btn')) {
                    await this.handleLike(e);
                }
            });
        }
    }

    // THÊM method mới
    // Thay thế method handleCommentSubmit

    async handleCommentSubmit() {
        const input = document.querySelector('.comment-input-detail');
        const content = input.value.trim();

        if (!content) return;

        const user = authService.currentUser;
        if (!user) {
            const event = new CustomEvent('showAuthModal', {
                detail: { message: 'Đăng nhập để bình luận' }
            });
            document.dispatchEvent(event);
            return;
        }

        try {
            // Dùng createComment thay vì addComment
            await dbService.createComment({
                postId: this.postId,
                content: content
            }, user);

            input.value = '';

            // Reload comments
            await this.loadComments();

            // Update comment count in post
            if (this.post) {
                this.post.stats.comments = (this.post.stats.comments || 0) + 1;
                this.renderPost();
            }
        } catch (error) {
            console.error('Error adding comment:', error);
            alert('Không thể thêm bình luận');
        }
    }

    async handleLike(e) {
        const button = e.target.closest('.like-btn');
        const postId = button.dataset.postId || this.postId;
        const user = authService.currentUser;

        if (!user) {
            const event = new CustomEvent('showAuthModal', {
                detail: { message: 'Đăng nhập để thích bài viết' }
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
        } catch (error) {
            console.error('Error toggling like:', error);
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

    formatContent(content) {
        return content.replace(/\n/g, '<br>')
            .replace(/#([\w\u00C0-\u024F\u1E00-\u1EFF]+)/g, '<span class="hashtag">#$1</span>');
    }
}