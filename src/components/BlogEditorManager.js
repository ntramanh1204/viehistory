import { dbService } from '../services/DatabaseService.js';
import { authService } from '../services/AuthService.js';
import { cloudinaryService } from '../services/CloudinaryService.js';

export class BlogEditorManager {
    constructor() {
        this.thumbnailFile = null;
        this.thumbnailUrl = null;
        this.isUploading = false;
        this.isDraft = false;
        this.currentBlogId = null;
        this.isPreviewMode = false;
    }

    async init() {
        // Kiểm tra đăng nhập
        const user = authService.getCurrentUser();
        if (!user) {
            alert('Bạn cần đăng nhập để tạo bài viết');
            window.location.hash = '#/';
            return;
        }

        // Setup event listeners
        this.setupEventListeners();
        
        // Setup drag & drop
        this.setupDragDrop();
        
        // Setup word counter
        this.setupWordCounter();
        
        console.log('✅ Blog Editor initialized');
    }

    setupEventListeners() {
        // Header buttons
        document.getElementById('editor-cancel-btn')?.addEventListener('click', () => {
            if (confirm('Bạn có chắc muốn hủy? Mọi thay đổi sẽ bị mất.')) {
                window.location.hash = '#/blog';
            }
        });

        document.getElementById('editor-save-btn')?.addEventListener('click', () => {
            this.isDraft = true;
            this.saveBlog();
        });

        document.getElementById('editor-publish-btn')?.addEventListener('click', () => {
            this.isDraft = false;
            this.saveBlog();
        });

        // Image upload
        document.getElementById('upload-area')?.addEventListener('click', () => {
            document.getElementById('thumbnail-input')?.click();
        });

        document.getElementById('thumbnail-input')?.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                this.handleImageSelect(e.target.files[0]);
            }
        });

        document.getElementById('change-image-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('thumbnail-input')?.click();
        });

        document.getElementById('remove-image-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeImage();
        });

        // Toolbar buttons
        document.querySelectorAll('.toolbar-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const action = btn.dataset.action;
                this.handleToolbarAction(action);
            });
        });

        // Auto-save (every 30 seconds)
        setInterval(() => {
            this.autoSave();
        }, 30000);
    }

    setupDragDrop() {
        const uploadArea = document.getElementById('upload-area');
        if (!uploadArea) return;

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files && files[0] && files[0].type.startsWith('image/')) {
                this.handleImageSelect(files[0]);
            }
        });
    }

    setupWordCounter() {
        const textarea = document.getElementById('blog-content');
        const counter = document.getElementById('word-count');
        
        if (!textarea || !counter) return;

        textarea.addEventListener('input', () => {
            const text = textarea.value.trim();
            const wordCount = text ? text.split(/\s+/).length : 0;
            counter.textContent = `${wordCount} từ`;
            
            // Change color based on word count
            if (wordCount < 100) {
                counter.style.color = 'var(--error)';
            } else if (wordCount < 300) {
                counter.style.color = 'var(--warning)';
            } else {
                counter.style.color = 'var(--success)';
            }
        });
    }

    async handleImageSelect(file) {
        try {
            // Validate file
            this.validateImageFile(file);

            // Show uploading status
            this.setUploadStatus('uploading', 'Đang upload ảnh...');

            // Upload to Cloudinary
            const imageUrl = await cloudinaryService.uploadImage(file, 'thumbnails');
            
            // Update UI
            this.thumbnailUrl = imageUrl;
            this.showImagePreview(imageUrl);
            this.setUploadStatus('success', 'Upload thành công!');

            console.log('✅ Image uploaded:', imageUrl);

        } catch (error) {
            console.error('❌ Image upload error:', error);
            this.setUploadStatus('error', error.message);
        }
    }

    validateImageFile(file) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

        if (file.size > maxSize) {
            throw new Error('File quá lớn. Kích thước tối đa là 10MB.');
        }

        if (!allowedTypes.includes(file.type)) {
            throw new Error('Định dạng file không được hỗ trợ. Chỉ chấp nhận JPG, PNG, WebP, GIF.');
        }
    }

    showImagePreview(imageUrl) {
        const placeholder = document.getElementById('upload-placeholder');
        const preview = document.getElementById('image-preview');
        const previewImg = document.getElementById('preview-img');

        if (placeholder && preview && previewImg) {
            placeholder.classList.add('hidden');
            preview.classList.remove('hidden');
            previewImg.src = imageUrl;
        }
    }

    removeImage() {
        this.thumbnailUrl = null;
        this.thumbnailFile = null;

        const placeholder = document.getElementById('upload-placeholder');
        const preview = document.getElementById('image-preview');

        if (placeholder && preview) {
            placeholder.classList.remove('hidden');
            preview.classList.add('hidden');
        }

        this.setUploadStatus('', '');
    }

    setUploadStatus(type, message) {
        const status = document.getElementById('upload-status');
        if (!status) return;

        status.className = `upload-status ${type}`;
        status.textContent = message;

        if (type === 'success') {
            setTimeout(() => {
                status.textContent = '';
                status.className = 'upload-status';
            }, 3000);
        }
    }

    handleToolbarAction(action) {
        const textarea = document.getElementById('blog-content');
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);

        let replacement = '';

        switch (action) {
            case 'bold':
                replacement = `**${selectedText || 'text in đậm'}**`;
                break;
            case 'italic':
                replacement = `*${selectedText || 'text in nghiêng'}*`;
                break;
            case 'heading':
                replacement = `\n## ${selectedText || 'Tiêu đề'}\n`;
                break;
            case 'preview':
                this.togglePreview();
                return;
        }

        if (replacement) {
            textarea.setRangeText(replacement, start, end, 'end');
            textarea.focus();
        }
    }

    togglePreview() {
        const textarea = document.getElementById('blog-content');
        const preview = document.getElementById('content-preview');
        const previewBtn = document.querySelector('[data-action="preview"]');

        if (!textarea || !preview || !previewBtn) return;

        this.isPreviewMode = !this.isPreviewMode;

        if (this.isPreviewMode) {
            // Show preview
            const content = this.formatContentForPreview(textarea.value);
            preview.innerHTML = content;
            textarea.classList.add('hidden');
            preview.classList.remove('hidden');
            previewBtn.classList.add('active');
            previewBtn.innerHTML = '✏️ Edit';
        } else {
            // Show editor
            textarea.classList.remove('hidden');
            preview.classList.add('hidden');
            previewBtn.classList.remove('active');
            previewBtn.innerHTML = '👁️ Preview';
        }
    }

    formatContentForPreview(content) {
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/^(.*)$/gm, '<p>$1</p>')
            .replace(/<p><\/p>/g, '')
            .replace(/<p>(<h[0-6]>.*<\/h[0-6]>)<\/p>/g, '$1');
    }

    validateForm() {
        const title = document.getElementById('blog-title')?.value.trim();
        const content = document.getElementById('blog-content')?.value.trim();
        const category = document.getElementById('blog-category')?.value;

        if (!title) {
            alert('Vui lòng nhập tiêu đề bài viết');
            document.getElementById('blog-title')?.focus();
            return false;
        }

        if (title.length < 10) {
            alert('Tiêu đề quá ngắn. Vui lòng nhập ít nhất 10 ký tự');
            document.getElementById('blog-title')?.focus();
            return false;
        }

        if (!content) {
            alert('Vui lòng nhập nội dung bài viết');
            document.getElementById('blog-content')?.focus();
            return false;
        }

        if (content.split(/\s+/).length < 50) {
            alert('Nội dung quá ngắn. Vui lòng viết ít nhất 50 từ');
            document.getElementById('blog-content')?.focus();
            return false;
        }

        if (!category) {
            alert('Vui lòng chọn danh mục cho bài viết');
            document.getElementById('blog-category')?.focus();
            return false;
        }

        return true;
    }

    async saveBlog() {
        if (!this.validateForm()) return;

        try {
            this.setLoading(true);

            const formData = this.getFormData();
            const user = authService.getCurrentUser();

            if (this.currentBlogId) {
                // Update existing blog
                await dbService.updateBlog(this.currentBlogId, formData);
                this.showSuccess(`Bài viết đã được ${this.isDraft ? 'lưu nháp' : 'cập nhật'}`);
            } else {
                // Create new blog
                const blogId = await dbService.createBlog(formData, user);
                this.currentBlogId = blogId;
                this.showSuccess(`Bài viết đã được ${this.isDraft ? 'lưu nháp' : 'đăng'} thành công!`);
            }

            // Redirect after short delay
            setTimeout(() => {
                if (this.isDraft) {
                    window.location.hash = '#/blog';
                } else {
                    window.location.hash = `#/blog/${this.currentBlogId}`;
                }
            }, 1500);

        } catch (error) {
            console.error('❌ Save blog error:', error);
            this.showError(error.message || 'Có lỗi xảy ra khi lưu bài viết');
        } finally {
            this.setLoading(false);
        }
    }

    getFormData() {
        return {
            title: document.getElementById('blog-title')?.value.trim(),
            content: document.getElementById('blog-content')?.value.trim(),
            category: document.getElementById('blog-category')?.value,
            featured: document.getElementById('blog-featured')?.checked || false,
            thumbnail: this.thumbnailUrl,
            status: this.isDraft ? 'draft' : 'published'
        };
    }

    setLoading(loading) {
        const saveBtn = document.getElementById('editor-save-btn');
        const publishBtn = document.getElementById('editor-publish-btn');

        if (saveBtn && publishBtn) {
            saveBtn.disabled = loading;
            publishBtn.disabled = loading;

            if (loading) {
                saveBtn.innerHTML = '<span>⏳</span> Đang lưu...';
                publishBtn.innerHTML = '<span>⏳</span> Đang đăng...';
            } else {
                saveBtn.innerHTML = '<span>💾</span> Lưu nháp';
                publishBtn.innerHTML = '<span>🚀</span> Đăng bài';
            }
        }
    }

    async autoSave() {
        const title = document.getElementById('blog-title')?.value.trim();
        const content = document.getElementById('blog-content')?.value.trim();

        if (title && content && content.length > 100) {
            try {
                // Save to localStorage as backup
                const autoSaveData = {
                    title,
                    content,
                    category: document.getElementById('blog-category')?.value,
                    featured: document.getElementById('blog-featured')?.checked,
                    thumbnail: this.thumbnailUrl,
                    timestamp: Date.now()
                };

                localStorage.setItem('blog_autosave', JSON.stringify(autoSaveData));
                console.log('✅ Auto-saved to localStorage');

            } catch (error) {
                console.error('❌ Auto-save error:', error);
            }
        }
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type) {
        // Simple toast implementation
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 1000;
            animation: slideIn 0.3s ease;
            background: ${type === 'success' ? 'var(--success)' : 'var(--error)'};
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}