import { dbService } from '../services/DatabaseService.js';
import { authService } from '../services/AuthService.js';
import { cloudinaryService } from '../services/CloudinaryService.js';

export class BlogManager {
    constructor() {
        this.blogs = [];
        this.featuredBlog = null;
        this.popularBlogs = [];
        this.lastVisible = null;
        this.currentCategory = 'all';
        this.perPage = 6;
        this.isLoading = false;
        this.searchQuery = '';
    }

    async init() {
        // Initialize elements
        this.featuredArticleEl = document.getElementById('featured-article');
        this.articlesGrid = document.getElementById('articles-grid');
        this.popularArticles = document.getElementById('popular-articles');
        this.loadMoreBtn = document.getElementById('load-more-btn');
        this.searchInput = document.getElementById('search-input');

        // Set up event listeners
        this.setupEventListeners();

        // Load content
        await Promise.all([
            this.loadFeaturedArticle(),
            this.loadArticles(),
            this.loadPopularArticles()
        ]);
    }

    setupEventListeners() {
        // ✅ Category filter giống post filter
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Remove active from all
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                // Add active to clicked
                e.target.classList.add('active');
                
                const category = e.target.dataset.category;
                this.currentCategory = category;
                this.resetAndLoad();
            });
        });

        // ✅ Search functionality
        const searchForm = document.querySelector('.search-form');
        const searchInput = document.getElementById('search-input');
        
        if (searchForm && searchInput) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.searchQuery = searchInput.value.trim();
                this.resetAndLoad();
            });
            
            // Real-time search (debounced)
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchQuery = e.target.value.trim();
                    this.resetAndLoad();
                }, 500);
            });
        }

        // ✅ Load more với style đồng bộ
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                this.loadMoreArticles();
            });
        }
    }

    async loadFeaturedArticle() {
        try {
            const featuredBlogs = await dbService.getFeaturedBlogs(1);
            if (featuredBlogs && featuredBlogs.length > 0) {
                this.featuredBlog = featuredBlogs[0];
                this.renderFeaturedArticle(this.featuredBlog);
            }
        } catch (error) {
            console.error('Error loading featured article:', error);
        }
    }

    async loadArticles() {
        try {
            this.setLoading(true);

            const result = await dbService.getBlogs({
                category: this.currentCategory === 'all' ? null : this.currentCategory,
                searchQuery: this.searchQuery,
                limit: this.perPage,
                lastVisible: null
            });

            // Nếu đã có featuredBlog, loại bỏ nó khỏi danh sách grid
            let articles = result.blogs;
            if (this.featuredBlog) {
                articles = articles.filter(article => article.id !== this.featuredBlog.id);
            }

            this.blogs = articles;
            this.lastVisible = result.lastVisible;

            this.renderArticles(this.blogs);

            // Toggle load more button visibility
            if (this.loadMoreBtn) {
                this.loadMoreBtn.style.display = articles.length < this.perPage ? 'none' : 'block';
            }
        } catch (error) {
            console.error('Error loading articles:', error);
            this.showError('Không thể tải bài viết');
        } finally {
            this.setLoading(false);
        }
    }

    async loadMoreArticles() {
        // Kiểm tra nếu không có lastVisible (hết bài viết) hoặc đang tải
        if (!this.lastVisible || this.isLoading) return;

        try {
            // Bắt đầu trạng thái loading
            this.setLoading(true);

            // Gọi API để lấy thêm bài viết
            const result = await dbService.getBlogs({
                category: this.currentCategory === 'all' ? null : this.currentCategory,
                searchQuery: this.searchQuery,
                limit: this.perPage,
                lastVisible: this.lastVisible
            });

            // Thêm bài viết mới vào danh sách hiện có
            this.blogs = [...this.blogs, ...result.blogs];

            // Cập nhật vị trí cuối cùng cho lần tải tiếp theo
            this.lastVisible = result.lastVisible;

            // Hiển thị các bài viết mới (không thay thế, chỉ thêm vào)
            this.renderMoreArticles(result.blogs);

            // Ẩn nút "Xem thêm" nếu không còn bài viết nào
            if (this.loadMoreBtn) {
                this.loadMoreBtn.style.display = result.blogs.length < this.perPage ? 'none' : 'block';
            }
        } catch (error) {
            console.error('Error loading more articles:', error);
            this.showError('Không thể tải thêm bài viết');
        } finally {
            // Kết thúc trạng thái loading dù thành công hay thất bại
            this.setLoading(false);
        }
    }

    // Thêm phương thức mới để chỉ render các bài viết mới mà không xóa các bài cũ
    renderMoreArticles(articles) {
        if (!this.articlesGrid) return;

        if (articles.length === 0) {
            return;
        }

        // Tạo HTML cho mỗi bài viết mới
        const articlesHTML = articles.map(article => this.createArticleCard(article)).join('');

        // Thêm vào cuối grid hiện tại (không thay thế)
        this.articlesGrid.insertAdjacentHTML('beforeend', articlesHTML);
    }

    async loadPopularArticles() {
        try {
            const popularBlogs = await dbService.getPopularBlogs(5);
            this.popularBlogs = popularBlogs;
            this.renderPopularArticles(popularBlogs);
        } catch (error) {
            console.error('Error loading popular articles:', error);
        }
    }

    // ✅ SỬA: renderFeaturedArticle để giống post-item
    renderFeaturedArticle(article) {
        if (!this.featuredArticleEl) return;

        const truncatedContent = this.truncateText(article.content, 200);
        const featuredImage = article.thumbnail
            ? cloudinaryService.getFeaturedImage(article.thumbnail)
            : '/assets/default-blog-cover.jpg';

        const formattedDate = this.formatDate(article.createdAt);

        this.featuredArticleEl.innerHTML = `
            <article class="featured-article-card" onclick="navigate('/blog/${article.id}')">
                <img src="${featuredImage}" 
                     alt="${article.title}" 
                     class="featured-article-img"
                     loading="lazy">
                <div class="featured-article-content">
                    <h3 class="featured-article-title">${article.title}</h3>
                    <p class="featured-article-excerpt">${truncatedContent}</p>
                    <div class="featured-article-meta">
                        <span class="article-date">${formattedDate}</span>
                        <button class="read-more-btn" onclick="event.stopPropagation(); navigate('/blog/${article.id}')">
                            Đọc tiếp
                        </button>
                    </div>
                </div>
            </article>
        `;
    }

    renderArticles(articles) {
        if (!this.articlesGrid) return;

        if (articles.length === 0) {
            this.articlesGrid.innerHTML = `
                <div class="empty-state">
                    <p>Không tìm thấy bài viết nào</p>
                </div>
            `;
            return;
        }

        // Nếu đang reset và load lại, thay thế nội dung
        if (articles === this.blogs) {
            this.articlesGrid.innerHTML = '';
        }

        // Tạo HTML cho mỗi bài viết
        const articlesHTML = articles.map(article => this.createArticleCard(article)).join('');

        // Thêm vào grid
        this.articlesGrid.innerHTML += articlesHTML;
    }

    renderPopularArticles(articles) {
        if (!this.popularArticles) return;

        if (articles.length === 0) {
            this.popularArticles.innerHTML = `<p>Chưa có bài viết phổ biến</p>`;
            return;
        }

        const html = articles.map(article => {
            // Sử dụng Cloudinary để tối ưu thumbnail cho popular articles
            const thumbnail = article.thumbnail
                ? cloudinaryService.getPopularThumbnail(article.thumbnail)
                : '/assets/default-thumb.jpg';

            return `
                <div class="popular-article" data-id="${article.id}">
                    <img src="${thumbnail}" 
                         class="popular-article-img" 
                         alt="${article.title}"
                         loading="lazy">
                    <div>
                        <div class="popular-article-title">${article.title}</div>
                        <div class="popular-article-date">${this.formatDate(article.createdAt)}</div>
                    </div>
                </div>
            `;
        }).join('');

        this.popularArticles.innerHTML = html;

        // Thêm event listener cho mỗi bài viết phổ biến
        document.querySelectorAll('.popular-article').forEach(el => {
            el.addEventListener('click', () => {
                const id = el.dataset.id;
                navigate(`/blog/${id}`);
            });
        });
    }

   // ✅ SỬA: createArticleCard để giống post-item
    createArticleCard(article) {
        const title = article.title || this.truncateText(article.content, 80);
        const excerpt = this.truncateText(article.content, 150);
        
        // Sử dụng Cloudinary để tối ưu thumbnail
        const thumbnail = article.thumbnail
            ? cloudinaryService.getBlogThumbnail(article.thumbnail)
            : '/assets/default-thumb.jpg';

        const formattedDate = this.formatDate(article.createdAt);

        return `
            <article class="blog-article-card" onclick="navigate('/blog/${article.id}')">
                <img src="${thumbnail}" 
                     alt="${title}" 
                     class="article-thumbnail"
                     loading="lazy">
                <div class="article-content">
                    <h3 class="article-title">${title}</h3>
                    <p class="article-excerpt">${excerpt}</p>
                    <div class="article-meta">
                        <span class="article-date">${formattedDate}</span>
                        <button class="read-more-btn" onclick="event.stopPropagation(); navigate('/blog/${article.id}')">
                            Đọc tiếp
                        </button>
                    </div>
                </div>
            </article>
        `;
    }

    resetAndLoad() {
        this.lastVisible = null;
        this.articlesGrid.innerHTML = '';
        this.loadArticles();
    }

    setLoading(isLoading) {
        this.isLoading = isLoading;

        if (this.loadMoreBtn) {
            this.loadMoreBtn.disabled = isLoading;
            this.loadMoreBtn.innerText = isLoading ? 'Đang tải...' : 'Xem thêm';
        }
    }

    showError(message) {
        if (this.articlesGrid) {
            this.articlesGrid.innerHTML += `
                <div class="error-message">
                    ${message}
                </div>
            `;
        }
    }

    // Tiện ích
    truncateText(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength
            ? text.substring(0, maxLength).trim() + '...'
            : text;
    }

     // ✅ THÊM: Helper method format date đồng bộ
    formatDate(date) {
        const dateObj = date instanceof Date ? date : 
                       new Date(date.seconds ? date.seconds * 1000 : date);
        
        const now = new Date();
        const diffTime = Math.abs(now - dateObj);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return 'Hôm qua';
        if (diffDays < 7) return `${diffDays} ngày trước`;
        
        return dateObj.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric'
        });
    }

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
}