import { dbService } from '../services/DatabaseService.js';
import { cloudinaryService } from '../services/CloudinaryService.js';

export default class BlogDetailManager {
    constructor() {
        this.blog = null;
        this.container = document.getElementById('blog-detail-container');
    }

    async loadBlog(blogId) {
        try {
            // Hiển thị loading
            this.renderLoading();

            // Lấy dữ liệu bài viết
            const blog = await dbService.getBlogById(blogId);
            this.blog = blog;

            // Render bài viết
            this.renderBlog(blog);

        } catch (error) {
            console.error('Error loading blog:', error);
            this.renderError('Không thể tải bài viết hoặc bài viết không tồn tại');
        }
    }

    renderLoading() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="blog-detail-page">
                <div class="loading-spinner">Đang tải...</div>
            </div>
        `;
    }

    renderError(message) {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="blog-detail-page">
                <div class="blog-detail-header">
                    <button class="back-button" id="back-to-blog-btn">
                        <span>←</span> Quay lại Blog
                    </button>
                </div>
                <div class="error-message">${message}</div>
            </div>
        `;

        // Thêm sự kiện cho nút quay lại
        document.getElementById('back-to-blog-btn')?.addEventListener('click', () => {
             navigate('/blog');
        });
    }

    renderBlog(blog) {
        if (!this.container) return;

        // Format nội dung
        const content = this.formatContent(blog.content);

        // Format ngày
        const date = blog.createdAt instanceof Date
            ? blog.createdAt
            : new Date(blog.createdAt.seconds ? blog.createdAt.seconds * 1000 : blog.createdAt);

        const formattedDate = date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        // Sử dụng Cloudinary để tối ưu ảnh cover
        const coverImage = blog.thumbnail
            ? cloudinaryService.getBlogCover(blog.thumbnail)
            : '/assets/default-blog-cover.jpg';

        this.container.innerHTML = `
            <div class="blog-detail-page">
                <div class="blog-detail-header">
                    <button class="back-button" id="back-to-blog-btn">
                        <span>←</span> Quay lại Blog
                    </button>
                </div>
                
                <article class="blog-detail-content">
                    <div class="blog-article">
                        <div class="blog-header-image">
                            <img src="${coverImage}" 
                                 alt="${blog.title}"
                                 loading="lazy">
                        </div>
                        
                        <div class="blog-meta">
                            <span>Đăng ngày: ${formattedDate}</span>
                            <span>Lượt xem: ${blog.views || 0}</span>
                        </div>
                        
                        <h1 class="blog-title">${blog.title}</h1>
                        
                        <div class="blog-content">
                            ${content}
                        </div>
                    </div>
                </article>
            </div>
        `;

        // Thêm sự kiện cho nút quay lại
        document.getElementById('back-to-blog-btn')?.addEventListener('click', () => {
            navigate('/blog');
        });
    }

    formatContent(content) {
        if (!content) return '';

        // Xử lý các đoạn văn bản thành các đoạn html
        const paragraphs = content
            .split('\n\n')
            .filter(p => p.trim())
            .map(p => `<p>${p.trim()}</p>`)
            .join('');

        return paragraphs;
    }
}