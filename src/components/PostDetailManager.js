import { authService } from '../services/AuthService.js';
import { dbService } from '../services/DatabaseService.js';

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
        const avatar = post.author.photoURL ?
            `<img src="${post.author.photoURL}" alt="${post.author.displayName}">` :
            `<span class="avatar-text">${post.author.displayName.charAt(0).toUpperCase()}</span>`;

        return `
            <header class="post-header">
                <div class="post-author-info">
                    <div class="user-avatar">${avatar}</div>
                    <div class="author-details">
                        <h2 class="author-name">${post.author.displayName}</h2>
                        <time class="post-time">${timeAgo}</time>
                    </div>
                </div>
            </header>
            
            <div class="post-content-full">
                <p>${this.formatContent(post.content)}</p>
            </div>
            
            <footer class="post-actions">
                <button class="action-btn like-btn" data-post-id="${post.id}">
                    <span class="action-icon">❤️</span>
                    <span class="action-count">${post.stats.likes || 0}</span>
                </button>
                
                <button class="action-btn comment-btn">
                    <span class="action-icon">💬</span>
                    <span class="action-count">${post.stats.comments || 0}</span>
                </button>
                
                <button class="action-btn share-btn">
                    <span class="action-icon">🔗</span>
                    <span class="action-text">Chia sẻ</span>
                </button>
            </footer>
        `;
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

    createCommentsHTML(comments) {
        if (!comments || comments.length === 0) {
            return '<p>Chưa có bình luận nào.</p>';
        }

        return comments.map(comment => {
            const timeAgo = this.getTimeAgo(comment.createdAt);
            const avatar = comment.author.photoURL ?
                `<img src="${comment.author.photoURL}" alt="${comment.author.displayName}">` :
                `<span class="avatar-text">${comment.author.displayName.charAt(0).toUpperCase()}</span>`;

            return `
                <div class="comment-item">
                    <div class="comment-avatar">${avatar}</div>
                    <div class="comment-content">
                        <div class="comment-author">${comment.author.displayName}</div>
                        <div class="comment-text">${comment.content}</div>
                        <div class="comment-time">${timeAgo}</div>
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