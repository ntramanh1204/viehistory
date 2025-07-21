import { dbService } from '../services/DatabaseService.js';

export class ShareManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Event delegation cho share buttons
        document.addEventListener('click', async (e) => {
            if (e.target.closest('.share-btn')) {
                this.handleShare(e);
            }
        });
    }

    async handleShare(button, postId) {
        // Ngăn spam
        if (button.classList.contains('sharing')) return;

        button.classList.add('sharing');
        const countSpan = button.querySelector('.action-count');
        const originalCount = parseInt(countSpan.textContent) || 0;

        // Optimistic UI: tăng số share ngay
        countSpan.textContent = originalCount + 1;
        button.classList.add('shared');

        try {
            // Gọi ShareManager để xử lý modal/native share
            if (window.shareManager) {
                await window.shareManager.handleShareWithButton(postId, button);
            } else {
                // Fallback: chỉ copy link
                const postUrl = `${window.location.origin}/post/${postId}`;
                await navigator.clipboard.writeText(postUrl);
                this.showToast('Đã sao chép link!');
            }
        } catch (error) {
            // Nếu lỗi, rollback UI
            countSpan.textContent = originalCount;
            button.classList.remove('shared');
            this.showToast('Không thể chia sẻ bài viết', 'error');
        } finally {
            button.classList.remove('sharing');
            setTimeout(() => button.classList.remove('shared'), 2000);
        }
    }

    async handleShareWithButton(postId, button) {
        const postUrl = `${window.location.origin}/post/${postId}`;
        try {
            if (navigator.share) {
                await this.nativeShare(postUrl, postId);
            } else {
                await this.fallbackShare(postUrl, postId);
            }
        } catch (error) {
            await this.copyToClipboard(postUrl);
            this.showToast('Link đã được sao chép!', 'success');
        }
        // Cập nhật DB (không rollback UI nếu lỗi)
        await this.incrementShareCount(postId, button);
    }

    async nativeShare(postUrl, postId) {
        try {
            await navigator.share({
                title: 'VieHistory - Dòng chảy Lịch sử',
                text: 'Xem bài viết thú vị này trên VieHistory',
                url: postUrl
            });
            console.log('✅ Native share successful');
        } catch (error) {
            if (error.name !== 'AbortError') {
                throw error;
            }
        }
    }

    async fallbackShare(postUrl, postId) {
        // Hiển thị modal với các tùy chọn share
        this.showShareModal(postUrl, postId);
    }

    showShareModal(postUrl, postId) {
        const modal = document.createElement('div');
        modal.className = 'share-modal modal';
        modal.innerHTML = `
        <div class="modal-content share-modal-content">
            <button class="modal-close share-modal-close">&times;</button>
            <h3>Chia sẻ bài viết</h3>
            <div class="share-options">
                <button class="share-option" data-platform="profile">
                    <i class="fas fa-share-square"></i>
                    Chia sẻ về tường nhà
                </button>
                <button class="share-option" data-platform="app">
                    <i class="fas fa-paper-plane"></i>
                    Chia sẻ qua ứng dụng
                </button>
                <button class="share-option" data-platform="copy">
                    <i class="fas fa-link"></i>
                    Sao chép link
                </button>
            </div>
            <div class="share-url">
                <input type="text" class="share-url-input" value="${postUrl}" readonly>
                <button class="share-url-copy">Sao chép</button>
            </div>
        </div>
    `;
        document.body.appendChild(modal);
        this.setupModalEventListeners(modal, postUrl, postId);
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });
    }

    setupModalEventListeners(modal, postUrl, postId) {
        modal.addEventListener('click', async (e) => {
            const shareOption = e.target.closest('.share-option');
            if (shareOption) {
                const platform = shareOption.dataset.platform;
                switch (platform) {
                    case 'profile':
                        await this.shareToProfile(postId);
                        this.closeShareModal(modal);
                        break;
                    case 'app':
                        await this.shareToApp(postUrl);
                        this.closeShareModal(modal);
                        break;
                    case 'copy':
                        await this.copyToClipboard(postUrl);
                        break;
                }
            }
            if (e.target.closest('.share-url-copy')) {
                await this.copyToClipboard(postUrl);
            }
            if (e.target.closest('.share-modal-close') || e.target === modal) {
                this.closeShareModal(modal);
            }
        });

        // Escape key to close
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeShareModal(modal);
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }

    async shareToProfile(postId) {
        try {
            // Use the correct method name from DatabaseService
            await dbService.sharePostToProfile(postId);
            this.showToast('Đã chia sẻ về tường nhà!', 'success');
        } catch (error) {
            console.error('Error sharing to profile:', error);
            this.showToast('Không thể chia sẻ về tường nhà', 'error');
        }
    }


    async sharePostToProfile(postId) {
        const user = authService.getCurrentUser();
        if (!user) throw new Error('Bạn cần đăng nhập để chia sẻ');

        // Lấy thông tin post gốc (nếu cần)
        const originalPost = await this.getPostById(postId);

        // Tạo post mới dạng "share"
        const sharedPost = {
            userId: user.id,
            sharedPostId: postId,
            createdAt: Date.now(),
            type: 'share',
            // Có thể cho phép thêm caption, hoặc copy nội dung gốc
            content: '', // hoặc prompt caption nếu muốn
            originalAuthorId: originalPost.userId,
        };

        // Lưu vào DB (giả sử bạn có hàm addPost)
        return await this.addPost(sharedPost);
    }

    async shareToApp(postUrl) {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'VieHistory - Dòng chảy Lịch sử',
                    text: 'Xem bài viết thú vị này trên VieHistory',
                    url: postUrl
                });
            } catch (error) {
                this.showToast('Không thể chia sẻ qua ứng dụng', 'error');
            }
        } else {
            // Fallback: mở Messenger, Zalo, v.v. (có thể mở link hoặc thông báo)
            window.open(`https://zalo.me/share?url=${encodeURIComponent(postUrl)}`, '_blank');
        }
    }

    async shareToPlatform(platform, postUrl) {
        const shareText = 'Xem bài viết thú vị này trên VieHistory - Dòng chảy Lịch sử';

        switch (platform) {
            case 'facebook':
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`, '_blank');
                break;

            case 'twitter':
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(postUrl)}`, '_blank');
                break;

            case 'copy':
                await this.copyToClipboard(postUrl);
                break;

            default:
                console.log('Unknown platform:', platform);
        }
    }

    async copyToClipboard(text) {
        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                textArea.remove();
            }

            this.showToast('Đã sao chép link vào clipboard!', 'success');
        } catch (error) {
            console.error('Error copying to clipboard:', error);
            this.showToast('Không thể sao chép link', 'error');
        }
    }

    closeShareModal(modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }

    async incrementShareCount(postId, button) {
        try {
            await dbService.incrementPostShares(postId);

            // Update UI
            const countElement = button.querySelector('.action-count');
            if (countElement) {
                const currentCount = parseInt(countElement.textContent) || 0;
                countElement.textContent = currentCount + 1;
            }

            // Add visual feedback
            button.classList.add('shared');
            setTimeout(() => {
                button.classList.remove('shared');
            }, 2000);

        } catch (error) {
            console.error('Error incrementing share count:', error);
            // Share vẫn thành công, chỉ không cập nhật được count
        }
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `share-toast ${type}`;
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}