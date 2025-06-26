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
        // Tạo modal share
        const modal = document.createElement('div');
        modal.className = 'share-modal modal';
        modal.innerHTML = `
            <div class="modal-content share-modal-content">
                <button class="modal-close share-modal-close">&times;</button>
                <h3>Chia sẻ bài viết</h3>
                
                <div class="share-options">
                    <button class="share-option" data-platform="facebook">
                        <svg viewBox="0 0 24 24" width="20" height="20">
                            <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        Facebook
                    </button>
                    
                    <button class="share-option" data-platform="twitter">
                        <svg viewBox="0 0 24 24" width="20" height="20">
                            <path fill="#1DA1F2" d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                        </svg>
                        Twitter
                    </button>
                    
                    <button class="share-option" data-platform="copy">
                        <svg viewBox="0 0 24 24" width="20" height="20">
                            <path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                        </svg>
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

        // Setup modal event listeners
        this.setupModalEventListeners(modal, postUrl);

        // Show modal
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });
    }

    setupModalEventListeners(modal, postUrl) {
        // Share option clicks
        modal.addEventListener('click', async (e) => {
            const shareOption = e.target.closest('.share-option');
            if (shareOption) {
                const platform = shareOption.dataset.platform;
                await this.shareToPlatform(platform, postUrl);
                if (platform !== 'copy') { // Keep modal open for copy to show feedback
                    this.closeShareModal(modal);
                }
            }

            // Copy URL button
            if (e.target.closest('.share-url-copy')) {
                await this.copyToClipboard(postUrl);
            }

            // Close modal
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