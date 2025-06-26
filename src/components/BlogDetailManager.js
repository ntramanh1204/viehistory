import { dbService } from '../services/DatabaseService.js';
import { cloudinaryService } from '../services/CloudinaryService.js';

export default class BlogDetailManager {
    constructor() {
        this.blog = null;
        this.container = null;
    }

    async init(blogId) {
        // Tìm container
        this.container = document.getElementById('blog-detail-container');
        if (!this.container) {
            console.error('Blog detail container not found');
            return;
        }

        // Load blog
        await this.loadBlog(blogId);
    }

    async loadBlog(blogId) {
        try {
            console.log('🔍 Loading blog:', blogId);
            
            // Hiển thị loading
            this.showLoading();

            // Lấy dữ liệu từ database
            const blog = await dbService.getBlogById(blogId);
            
            if (!blog) {
                this.showError('Bài viết không tồn tại hoặc đã bị xóa.');
                return;
            }

            this.blog = blog;
            console.log('✅ Blog loaded:', blog);

            // Render blog
            this.renderBlog(blog);

            // Increment view count
            await this.incrementViewCount(blogId);

        } catch (error) {
            console.error('❌ Error loading blog:', error);
            this.showError('Không thể tải bài viết. Vui lòng thử lại.');
        }
    }

    showLoading() {
        if (!this.container) return;

        const loadingState = this.container.querySelector('#blog-loading');
        const errorState = this.container.querySelector('#blog-error');
        const contentArea = this.container.querySelector('#blog-detail-content');

        if (loadingState) loadingState.classList.remove('hidden');
        if (errorState) errorState.classList.add('hidden');
        
        // Clear existing content
        const existingContent = contentArea?.querySelector('.blog-article');
        if (existingContent) {
            existingContent.remove();
        }
    }

    showError(message) {
        if (!this.container) return;

        const loadingState = this.container.querySelector('#blog-loading');
        const errorState = this.container.querySelector('#blog-error');

        if (loadingState) loadingState.classList.add('hidden');
        if (errorState) {
            errorState.classList.remove('hidden');
            const errorText = errorState.querySelector('p');
            if (errorText) errorText.textContent = message;
        }
    }

    renderBlog(blog) {
        if (!this.container || !blog) return;

        // Hide loading/error states
        const loadingState = this.container.querySelector('#blog-loading');
        const errorState = this.container.querySelector('#blog-error');
        const contentArea = this.container.querySelector('#blog-detail-content');

        if (loadingState) loadingState.classList.add('hidden');
        if (errorState) errorState.classList.add('hidden');

        // Format date
        const date = blog.createdAt instanceof Date 
            ? blog.createdAt 
            : new Date(blog.createdAt?.seconds ? blog.createdAt.seconds * 1000 : blog.createdAt);

        const formattedDate = date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        // Optimize cover image với Cloudinary
        const coverImage = blog.thumbnail 
            ? cloudinaryService.getBlogCover(blog.thumbnail)
            : '/assets/default-blog-cover.jpg';

        // Format content
        const content = this.formatContent(blog.content);

        // Create blog article HTML
        const blogHTML = `
            <div class="blog-article">
                ${blog.thumbnail ? `
                    <div class="blog-header-image">
                        <img src="${coverImage}" 
                             alt="${blog.title}"
                             loading="lazy">
                    </div>
                ` : ''}
                
                <div class="blog-meta">
                    <span>📅 ${formattedDate}</span>
                    <span>👁️ ${blog.stats?.views || 0} lượt xem</span>
                    <span>📂 ${this.getCategoryName(blog.category)}</span>
                </div>
                
                <h1 class="blog-title">${blog.title}</h1>
                
                <div class="blog-content">
                    ${content}
                </div>
            </div>
        `;

        // Add to content area
        contentArea.insertAdjacentHTML('beforeend', blogHTML);

        // Setup event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Back button
        const backBtn = document.getElementById('back-to-blog-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.navigate('/blog');
            });
        }
    }

    formatContent(content) {
        if (!content) return '<p>Không có nội dung.</p>';

        // Split vào paragraphs
        const paragraphs = content
            .split('\n\n')
            .filter(p => p.trim())
            .map(p => {
                // Simple markdown support
                let formatted = p.trim();
                
                // Headers
                formatted = formatted.replace(/^## (.+)$/gm, '<h2>$1</h2>');
                formatted = formatted.replace(/^### (.+)$/gm, '<h3>$1</h3>');
                
                // Bold
                formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
                
                // Italic
                formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
                
                // Line breaks
                formatted = formatted.replace(/\n/g, '<br>');
                
                return `<p>${formatted}</p>`;
            })
            .join('');

        return paragraphs;
    }

    getCategoryName(category) {
        const categories = {
            'viet-nam': '🇻🇳 Lịch sử Việt Nam',
            'the-gioi': '🌍 Lịch sử Thế giới',
            'co-dai': '🏛️ Thời cổ đại',
            'hien-dai': '🏙️ Thời hiện đại'
        };
        return categories[category] || category;
    }

    async incrementViewCount(blogId) {
        try {
            // Increment view count trong database
            await dbService.incrementBlogViews(blogId);
            
            // Update UI
            const viewElement = document.querySelector('.blog-meta span:nth-child(2)');
            if (viewElement && this.blog) {
                const newCount = (this.blog.stats?.views || 0) + 1;
                viewElement.textContent = `👁️ ${newCount} lượt xem`;
            }
        } catch (error) {
            console.error('Error incrementing view count:', error);
        }
    }
}