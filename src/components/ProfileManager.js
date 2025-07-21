import { authService } from '../services/AuthService.js';
import { dbService } from '../services/DatabaseService.js';
import { AvatarService } from '../services/AvatarService.js';
import { FeedManager } from './FeedManager.js';

export class ProfileManager {
    constructor() {
        this.currentUserId = null;
        this.isOwnProfile = false;
        this.userData = null;
        this.currentTab = 'posts';
    }

    async init(userId = null) {
        try {
            // Nếu không có userId, hiển thị profile của user hiện tại
            const currentUser = authService.getCurrentUser();

            if (!userId) {
                if (!currentUser) {
                    this.showAuthRequired();
                    return;
                }
                userId = currentUser.uid;
            }

            this.currentUserId = userId;
            this.isOwnProfile = currentUser && currentUser.uid === userId;

            await this.loadUserData();
            this.setupEventListeners();
            this.updateUI();

        } catch (error) {
            console.error('Error initializing profile:', error);
            this.showError('Không thể tải trang cá nhân');
        }
    }

    async loadUserData() {
        try {
            // Load user basic info
            this.userData = await dbService.getUserProfile(this.currentUserId);

            if (!this.userData) {
                this.showError('Không tìm thấy người dùng');
                return;
            }

            // Load user stats
            const stats = await dbService.getUserStats(this.currentUserId);
            this.userData.stats = stats;

            // Check follow status if not own profile
            if (!this.isOwnProfile && authService.getCurrentUser()) {
                this.userData.isFollowing = await dbService.checkFollowStatus(
                    authService.getCurrentUser().uid,
                    this.currentUserId
                );
            }

        } catch (error) {
            console.error('Error loading user data:', error);
            throw error;
        }
    }

    updateUI() {
        this.updateProfileHeader();
        this.updateProfileActions();
        this.loadTabContent(this.currentTab);
    }

    // ...existing code...

    updateProfileHeader() {
        // Update avatar
        const avatarEl = document.getElementById('profile-avatar');
        if (avatarEl) {
            avatarEl.innerHTML = '';

            if (this.userData.photoURL || this.userData.avatar) {
                const img = document.createElement('img');
                img.src = this.userData.photoURL || this.userData.avatar;
                img.alt = 'Avatar';
                img.className = 'profile-avatar-img';
                avatarEl.appendChild(img);
            } else if (AvatarService.shouldUseAvataaars(this.userData)) {
                const avatarUrl = AvatarService.getUserAvatar(this.userData, 120);
                const img = document.createElement('img');
                img.src = avatarUrl;
                img.alt = 'Avatar';
                img.className = 'profile-avatar-img';
                avatarEl.appendChild(img);
            } else {
                const span = document.createElement('span');
                span.className = 'profile-avatar-text';
                span.textContent = AvatarService.getInitials(this.userData.displayName);
                avatarEl.appendChild(span);
            }
        }

        // Update name
        const nameEl = document.getElementById('profile-name');
        if (nameEl) {
            nameEl.textContent = this.userData.displayName || 'User';
        }

        // ✅ THÊM: Update username
        const usernameEl = document.getElementById('profile-username');
        if (usernameEl) {
            if (this.userData.username) {
                usernameEl.textContent = `@${this.userData.username}`;
                usernameEl.style.display = 'block';
            } else {
                usernameEl.style.display = 'none';
            }
        }

        // Update bio
        const bioEl = document.getElementById('profile-bio');
        if (bioEl) {
            bioEl.textContent = this.userData.bio || 'Chưa có tiểu sử';
        }

        // ✅ THÊM: Update meta info
        this.updateProfileMetaInfo();

        // Update stats
        this.updateStats();
    }

    // ✅ THÊM: Update profile meta info
    updateProfileMetaInfo() {
        const metaInfoEl = document.getElementById('profile-meta-info');
        if (!metaInfoEl) return;

        const metaItems = [];

        // Location
        if (this.userData.location) {
            metaItems.push(`
                <div class="profile-meta-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${this.userData.location}</span>
                </div>
            `);
        }

        // Website
        if (this.userData.website) {
            metaItems.push(`
                <div class="profile-meta-item">
                    <i class="fas fa-link"></i>
                    <a href="${this.userData.website}" target="_blank" rel="noopener" class="profile-website">
                        ${this.formatWebsiteUrl(this.userData.website)}
                    </a>
                </div>
            `);
        }

        // Join date (if available)
        if (this.userData.createdAt) {
            const joinDate = new Date(this.userData.createdAt.seconds ?
                this.userData.createdAt.seconds * 1000 : this.userData.createdAt);
            metaItems.push(`
                <div class="profile-meta-item">
                    <i class="fas fa-calendar-alt"></i>
                    <span>Tham gia ${joinDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}</span>
                </div>
            `);
        }

        metaInfoEl.innerHTML = metaItems.join('');
    }

    // ✅ THÊM: Format website URL for display
    formatWebsiteUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch {
            return url;
        }
    }

    // ...existing code...

    updateStats() {
        const stats = this.userData.stats || {};

        const postsCount = document.getElementById('posts-count');
        const followersCount = document.getElementById('followers-count');
        const followingCount = document.getElementById('following-count');

        if (postsCount) postsCount.textContent = stats.postsCount || 0;
        if (followersCount) followersCount.textContent = stats.followersCount || 0;
        if (followingCount) followingCount.textContent = stats.followingCount || 0;
    }

    updateProfileActions() {
        const editBtn = document.getElementById('edit-profile-btn');
        const followBtn = document.getElementById('follow-btn');
        const editAvatarBtn = document.getElementById('edit-avatar-btn');

        // Show/hide buttons based on ownership
        if (this.isOwnProfile) {
            editBtn?.classList.remove('hidden');
            editAvatarBtn?.classList.remove('hidden');
            followBtn?.classList.add('hidden');
        } else {
            editBtn?.classList.add('hidden');
            editAvatarBtn?.classList.add('hidden');

            if (authService.getCurrentUser()) {
                followBtn?.classList.remove('hidden');
                this.updateFollowButton();
            } else {
                followBtn?.classList.add('hidden');
            }
        }
    }

    updateFollowButton() {
        const followBtn = document.getElementById('follow-btn');
        if (!followBtn) return;

        if (this.userData.isFollowing) {
            followBtn.innerHTML = '<i class="fas fa-user-check"></i> Đang theo dõi';
            followBtn.classList.add('following');
        } else {
            followBtn.innerHTML = '<i class="fas fa-user-plus"></i> Theo dõi';
            followBtn.classList.remove('following');
        }
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Edit profile
        const editBtn = document.getElementById('edit-profile-btn');
        editBtn?.addEventListener('click', () => this.showEditModal());

        // ✅ THÊM: Edit avatar
        const editAvatarBtn = document.getElementById('edit-avatar-btn');
        editAvatarBtn?.addEventListener('click', () => this.showAvatarUpload());

        // Follow/Unfollow
        const followBtn = document.getElementById('follow-btn');
        followBtn?.addEventListener('click', () => this.toggleFollow());

        // Edit modal
        this.setupEditModal();

        // ✅ THÊM: Avatar upload
        this.setupAvatarUpload();
    }

    // ✅ THÊM: Setup avatar upload
    setupAvatarUpload() {
        // Hidden file input
        let avatarInput = document.getElementById('avatar-upload-input');
        if (!avatarInput) {
            avatarInput = document.createElement('input');
            avatarInput.type = 'file';
            avatarInput.id = 'avatar-upload-input';
            avatarInput.accept = 'image/*';
            avatarInput.style.display = 'none';
            document.body.appendChild(avatarInput);
        }

        avatarInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                this.handleAvatarUpload(e.target.files[0]);
            }
        });
    }

    // ✅ THÊM: Show avatar upload
    showAvatarUpload() {
        const avatarInput = document.getElementById('avatar-upload-input');
        if (avatarInput) {
            avatarInput.click();
        }
    }

    async handleAvatarUpload(file) {
        try {
            // Validate file
            this.validateAvatarFile(file);

            // Show loading state
            this.setAvatarUploading(true);

            console.log('🚀 Starting avatar upload...', file.name);

            // Upload to Cloudinary
            const { CloudinaryService } = await import('../services/CloudinaryService.js');
            const cloudinaryService = new CloudinaryService();

            const uploadResult = await cloudinaryService.uploadImage(file, 'avatars');
            if (!uploadResult) {
                throw new Error('Upload không thành công, không nhận được URL');
            }
            const avatarUrl = uploadResult; // uploadResult là URL string
            console.log('✅ Upload success, updating profile...', avatarUrl);

            // ✅ SỬA: Chỉ update những field cần thiết
            const updateData = {
                photoURL: avatarUrl,
                avatar: avatarUrl
            };

            // Update user profile in database
            await dbService.updateUserProfile(this.currentUserId, updateData);

            // Update local data
            this.userData.photoURL = avatarUrl;
            this.userData.avatar = avatarUrl;

            // Update UI
            this.updateProfileHeader();
            this.updateModalAvatarPreview();
            this.updateGlobalAvatars();

            this.showToast('Cập nhật avatar thành công!');

        } catch (error) {
            console.error('❌ Error uploading avatar:', error);

            // Hiển thị lỗi cụ thể hơn
            let errorMessage = 'Có lỗi xảy ra khi tải avatar';

            if (error.message.includes('permissions')) {
                errorMessage = 'Không có quyền cập nhật avatar';
            } else if (error.message.includes('Upload')) {
                errorMessage = 'Lỗi tải ảnh lên server';
            } else if (error.message.includes('network')) {
                errorMessage = 'Lỗi kết nối mạng';
            }

            this.showToast(errorMessage, 'error');
        } finally {
            this.setAvatarUploading(false);
        }
    }

    async uploadImage(file, folder = 'avatars') {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', this.uploadPreset);
            formData.append('folder', `viehistory/${folder}`);

            const timestamp = Date.now();
            // Không nối thêm .jpg
            const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            formData.append('public_id', fileName);

            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
                { method: 'POST', body: formData }
            );

            const result = await response.json();
            console.log('Cloudinary upload result:', result);

            if (!result.secure_url) throw new Error('Upload không thành công, không nhận được URL');
            return result.secure_url;
        } catch (error) {
            console.error('❌ CloudinaryService upload error:', error);
            throw error;
        }
    }

    // ✅ THÊM: Validate avatar file
    validateAvatarFile(file) {
        const maxSize = 5 * 1024 * 1024; // 5MB
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

        if (file.size > maxSize) {
            throw new Error('File quá lớn. Kích thước tối đa là 5MB.');
        }

        if (!allowedTypes.includes(file.type)) {
            throw new Error('Định dạng file không được hỗ trợ. Chỉ chấp nhận JPG, PNG, GIF, WebP.');
        }
    }

    // ✅ THÊM: Set avatar uploading state
    setAvatarUploading(loading) {
        const editAvatarBtn = document.getElementById('edit-avatar-btn');
        if (editAvatarBtn) {
            if (loading) {
                editAvatarBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                editAvatarBtn.disabled = true;
            } else {
                editAvatarBtn.innerHTML = '<i class="fas fa-camera"></i>';
                editAvatarBtn.disabled = false;
            }
        }
    }

    // ✅ THÊM: Update avatars globally (header, sidebar)
    updateGlobalAvatars() {
        // Trigger avatar update in AuthManager
        if (window.authManager && typeof window.authManager.updateHeaderAvatar === 'function') {
            window.authManager.updateHeaderAvatar(this.userData);
            window.authManager.updateSidebarAvatar(this.userData);
        }

        // Also update compose area avatar
        const { AvatarService } = import('../services/AvatarService.js').then(module => {
            const AvatarService = module.AvatarService;
            const composeAvatar = document.querySelector('.compose-area .user-avatar');
            if (composeAvatar && this.userData.photoURL) {
                composeAvatar.innerHTML = `<img src="${this.userData.photoURL}" alt="Avatar" class="user-avatar-img">`;
            }
        });
    }

    switchTab(tab) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        // Update tab content
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === `${tab}-tab`);
        });

        this.currentTab = tab;
        this.loadTabContent(tab);
    }

    async loadTabContent(tab) {
        try {
            switch (tab) {
                case 'posts':
                    await this.loadUserPosts();
                    break;
                case 'blogs':
                    await this.loadUserBlogs();
                    break;
                case 'media':
                    await this.loadUserMedia();
                    break;
            }
        } catch (error) {
            console.error(`Error loading ${tab}:`, error);
        }
    }

    async loadUserPosts() {
        const container = document.getElementById('profile-posts');
        if (!container) return;

        container.innerHTML = '<div class="loading">Đang tải bài viết...</div>';

        try {
            const posts = await dbService.getUserPosts(this.currentUserId);

            // Load original post data for shared posts
            for (const post of posts) {
                if (post.metadata?.type === 'share' && post.metadata?.sharedPostId) {
                    try {
                        post.originalPost = await dbService.getPostById(post.metadata.sharedPostId);
                    } catch (error) {
                        console.error('Error loading original post:', error);
                        post.originalPost = null;
                    }
                }
            }

            if (posts.length === 0) {
                container.innerHTML = '<div class="empty-state">Chưa có bài viết nào</div>';
                return;
            }

            container.innerHTML = posts.map(post => this.createPostCard(post)).join('');
        } catch (error) {
            console.error('Error loading user posts:', error);
            container.innerHTML = '<div class="error">Không thể tải bài viết</div>';
        }
    }

    async loadUserBlogs() {
        const container = document.getElementById('profile-blogs');
        if (!container) return;

        container.innerHTML = '<div class="loading">Đang tải blog...</div>';

        // TODO: Implement load user blogs
        container.innerHTML = '<div class="empty-state">Chức năng blog đang phát triển</div>';
    }

    async loadUserMedia() {
        const container = document.getElementById('profile-media');
        if (!container) return;

        container.innerHTML = '<div class="loading">Đang tải media...</div>';

        // TODO: Implement load user media
        container.innerHTML = '<div class="empty-state">Chức năng media đang phát triển</div>';
    }

    // ...existing code...

    createPostCard(post) {
        // Check if this is a shared post
        if (post.metadata?.type === 'share' && post.metadata?.sharedPostId) {
            const sharedPostId = post.metadata.sharedPostId;

            // Try to get original post data (should be loaded in loadUserPosts)
            const originalPost = post.originalPost;

            if (!originalPost) {
                return `
                <div class="post-item shared-post" data-post-id="${post.id}">
                    <div class="post-header">
                        <div class="post-author">
                            <div class="author-avatar">
                                <span class="author-avatar-text">${(post.author.displayName || 'User').charAt(0).toUpperCase()}</span>
                            </div>
                            <div class="author-info">
                                <span class="author-name">${post.author.displayName || 'Bạn'}</span>
                                <span class="post-time">${this.getTimeAgo(post.createdAt)}</span>
                            </div>
                        </div>
                        <button class="post-menu-btn" data-post-id="${post.id}">⋯</button>
                    </div>
                    <div class="post-content">
                        <div class="shared-by">
                            <i class="fas fa-share"></i> đã chia sẻ một bài viết
                        </div>
                        <div class="original-post">
                            <div class="original-content">
                                <i>Bài viết gốc không khả dụng</i>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            }

            const content = originalPost.content || originalPost.plainContent || '<i>Nội dung trống</i>';
            const timeAgo = this.getTimeAgo(post.createdAt);
            const originalTimeAgo = this.getTimeAgo(originalPost.createdAt);

            // Author avatar for the sharer
            let sharerAvatar;
            if (post.author && (post.author.photoURL || post.author.avatar)) {
                sharerAvatar = `<img src="${post.author.photoURL || post.author.avatar}" alt="${post.author.displayName}" class="author-avatar-img">`;
            } else {
                sharerAvatar = `<span class="author-avatar-text">${(post.author.displayName || 'User').charAt(0).toUpperCase()}</span>`;
            }

            return `
            <div class="post-item shared-post" data-post-id="${post.id}" data-author-id="${post.author.uid}">
                <div class="post-header">
                    <div class="post-author">
                        <div class="author-avatar">${sharerAvatar}</div>
                        <div class="author-info">
                            <span class="author-name" data-user-id="${post.author.uid}">${post.author.displayName || 'Bạn'}</span>
                            <span class="post-time">${timeAgo}</span>
                        </div>
                    </div>
                    <button class="post-menu-btn" data-post-id="${post.id}">⋯</button>
                </div>
                <div class="post-content">
                    <div class="shared-by">
                        <i class="fas fa-share"></i> đã chia sẻ
                    </div>
                    <div class="original-post">
                        <div class="original-author">
                            <span class="original-author-name" data-user-id="${originalPost.author?.uid}">${originalPost.author?.displayName || 'Người dùng'}</span>
                            <span class="original-time">${originalTimeAgo}</span>
                        </div>
                        <div class="original-content">
                            ${content}
                        </div>
                        ${this.createMediaPreview(originalPost.media)}
                    </div>
                </div>
                <footer class="post-actions">
                    <button class="action-btn like-btn" data-post-id="${post.id}">
                        <span class="action-icon"><i class="far fa-heart"></i></span>
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
            </div>
        `;
        }

        // Regular post - match home page format exactly
        const timeAgo = this.getTimeAgo(post.createdAt);

        // Author avatar
        let avatar;
        if (post.author && (post.author.photoURL || post.author.avatar)) {
            avatar = `<img src="${post.author.photoURL || post.author.avatar}" alt="${post.author.displayName}" class="author-avatar-img">`;
        } else {
            avatar = `<span class="author-avatar-text">${(post.author?.displayName || 'User').charAt(0).toUpperCase()}</span>`;
        }

        // Format content
        const formattedContent = this.formatPostContent(post.content || post.plainContent || '');

        // Media and hashtags
        const mediaHTML = this.createEnhancedMediaHTML(post.media || []);
        const hashtagsHTML = this.createHashtagsHTML(post.hashtags || []);

        return `
        <article class="post-item" data-post-id="${post.id}" data-author-id="${post.author?.uid}">
            <div class="post-header">
                <div class="post-author">
                    <div class="author-avatar">${avatar}</div>
                    <div class="author-info">
                        <span class="author-name" data-user-id="${post.author?.uid}">${post.author?.displayName || 'User'}</span>
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
                <button class="action-btn like-btn" data-post-id="${post.id}">
                    <span class="action-icon"><i class="far fa-heart"></i></span>
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

    // Add missing helper methods to match FeedManager functionality
    formatPostContent(content) {
        if (!content) return '<p>Nội dung trống</p>';

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

    createEnhancedMediaHTML(media) {
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

    // Update the existing createMediaPreview to be more consistent
    createMediaPreview(media) {
        if (!media || media.length === 0) return '';

        const firstItem = media[0];
        return `
        <div class="post-media-preview">
            ${firstItem.type === 'image' ?
                `<img src="${firstItem.url}" alt="Media" loading="lazy">` :
                `<video src="${firstItem.url}" controls></video>`
            }
            ${media.length > 1 ? `<div class="media-count">+${media.length - 1}</div>` : ''}
        </div>
    `;
    }

    // ...existing code...

    async toggleFollow() {
        const currentUser = authService.getCurrentUser();
        if (!currentUser) {
            this.showAuthRequired();
            return;
        }

        try {
            const result = await dbService.toggleFollow(currentUser.uid, this.currentUserId);
            this.userData.isFollowing = result.isFollowing;

            // Create notification if followed
            if (result.isFollowing) {
                await dbService.createFollowNotification(
                    this.currentUserId,
                    currentUser
                );
            }

            // Update UI
            this.updateFollowButton();

            // Update follower count
            const change = result.isFollowing ? 1 : -1;
            this.userData.stats.followersCount += change;
            this.updateStats();

            this.showToast(result.isFollowing ? 'Đã theo dõi' : 'Đã hủy theo dõi');

        } catch (error) {
            console.error('Error toggling follow:', error);
            this.showToast('Có lỗi xảy ra', 'error');
        }
    }

    showEditModal() {
        const modal = document.getElementById('edit-profile-modal');

        // ✅ SỬA: Debug để kiểm tra các element có tồn tại không
        console.log('🔍 Opening edit modal...');

        const nameInput = document.getElementById('edit-display-name');
        // const usernameInput = document.getElementById('edit-username');
        // const locationInput = document.getElementById('edit-location');
        // const websiteInput = document.getElementById('edit-website');
        const bioInput = document.getElementById('edit-bio');
        // const publicCheckbox = document.getElementById('profile-public');
        // const showEmailCheckbox = document.getElementById('show-email');
        const charCount = document.getElementById('bio-char-count');

        // ✅ THÊM: Debug log để kiểm tra
        console.log('📝 Found elements:', {
            nameInput: !!nameInput,
            // usernameInput: !!usernameInput,
            // locationInput: !!locationInput,
            // websiteInput: !!websiteInput,
            bioInput: !!bioInput,
            // publicCheckbox: !!publicCheckbox,
            // showEmailCheckbox: !!showEmailCheckbox
        });

        // ✅ SỬA: Chỉ set value nếu element tồn tại
        if (nameInput) {
            nameInput.value = this.userData.displayName || '';
            console.log('✅ Set display name:', this.userData.displayName);
        }

        // if (usernameInput) {
        //     usernameInput.value = this.userData.username || '';
        //     console.log('✅ Set username:', this.userData.username);
        // }

        // if (locationInput) {
        //     locationInput.value = this.userData.location || '';
        //     console.log('✅ Set location:', this.userData.location);
        // }

        // if (websiteInput) {
        //     websiteInput.value = this.userData.website || '';
        //     console.log('✅ Set website:', this.userData.website);
        // }

        if (bioInput) {
            bioInput.value = this.userData.bio || '';
            console.log('✅ Set bio:', this.userData.bio);
        }

        // if (publicCheckbox) {
        //     publicCheckbox.checked = this.userData.isPublic !== false;
        //     console.log('✅ Set public:', this.userData.isPublic);
        // }

        // if (showEmailCheckbox) {
        //     showEmailCheckbox.checked = this.userData.showEmail === true;
        //     console.log('✅ Set show email:', this.userData.showEmail);
        // }

        if (charCount && bioInput) {
            charCount.textContent = bioInput.value.length;
        }

        // Update modal avatar preview
        this.updateModalAvatarPreview();

        if (modal) {
            modal.classList.remove('hidden');
            console.log('✅ Modal opened');
        } else {
            console.error('❌ Modal not found');
        }
    }

    // ✅ SỬA: Update modal avatar preview
    updateModalAvatarPreview() {
        const avatarPreview = document.getElementById('modal-avatar-preview');
        if (!avatarPreview) return;

        avatarPreview.innerHTML = '';

        if (this.userData.photoURL || this.userData.avatar) {
            const img = document.createElement('img');
            img.src = this.userData.photoURL || this.userData.avatar;
            img.alt = 'Avatar';
            img.className = 'avatar-preview-img';
            avatarPreview.appendChild(img);
        } else {
            const span = document.createElement('span');
            span.className = 'profile-avatar-text';
            span.textContent = this.getInitials(this.userData.displayName || 'User');
            avatarPreview.appendChild(span);
        }
    }

    // ✅ THÊM: Helper method để lấy initials
    getInitials(name) {
        return name.split(' ')
            .map(word => word.charAt(0))
            .join('')
            .substring(0, 2)
            .toUpperCase();
    }

    setupEditModal() {
        const modal = document.getElementById('edit-profile-modal');
        const closeBtn = document.getElementById('close-edit-modal');
        const cancelBtn = document.getElementById('cancel-edit');
        const form = document.getElementById('edit-profile-form');

        // ✅ THÊM: Avatar actions
        const changeAvatarBtn = document.getElementById('change-avatar-btn');
        const removeAvatarBtn = document.getElementById('remove-avatar-btn');

        closeBtn?.addEventListener('click', () => this.hideEditModal());
        cancelBtn?.addEventListener('click', () => this.hideEditModal());

        form?.addEventListener('submit', (e) => this.handleProfileUpdate(e));

        // ✅ THÊM: Avatar change/remove
        changeAvatarBtn?.addEventListener('click', () => this.showAvatarUpload());
        removeAvatarBtn?.addEventListener('click', () => this.removeAvatar());

        // Character counter for bio
        const bioTextarea = document.getElementById('edit-bio');
        const charCount = document.getElementById('bio-char-count');

        bioTextarea?.addEventListener('input', (e) => {
            if (charCount) {
                charCount.textContent = e.target.value.length;
            }
        });

        // ✅ THÊM: Username validation
        const usernameInput = document.getElementById('edit-username');
        usernameInput?.addEventListener('input', (e) => {
            this.validateUsername(e.target);
        });
    }

    async removeAvatar() {
        if (!confirm('Bạn có chắc muốn xóa avatar?')) return;

        try {
            // ✅ SỬA: Sử dụng deleteField() để xóa field thay vì set null
            const { deleteField } = await import('firebase/firestore');

            await dbService.updateUserProfile(this.currentUserId, {
                photoURL: deleteField(),
                avatar: deleteField()
            });

            // Update local data
            delete this.userData.photoURL;
            delete this.userData.avatar;

            // Update UI
            this.updateProfileHeader();
            this.updateModalAvatarPreview();
            this.updateGlobalAvatars();

            this.showToast('Đã xóa avatar');

        } catch (error) {
            console.error('Error removing avatar:', error);
            this.showToast('Có lỗi xảy ra khi xóa avatar', 'error');
        }
    }

    // ✅ THÊM: Validate username
    validateUsername(input) {
        const value = input.value;
        const isValid = /^[a-zA-Z0-9_]*$/.test(value);

        if (!isValid && value) {
            input.setCustomValidity('Tên người dùng chỉ được chứa chữ cái, số và dấu gạch dưới');
        } else {
            input.setCustomValidity('');
        }
    }

    async handleProfileUpdate(e) {
        e.preventDefault();

        try {
            const formData = new FormData(e.target);

            // ✅ SỬA: Build data object carefully
            const profileData = {};

            const displayName = formData.get('displayName')?.trim();
            const username = formData.get('username')?.trim();
            const location = formData.get('location')?.trim();
            const website = formData.get('website')?.trim();
            const bio = formData.get('bio')?.trim();
            const isPublic = formData.get('isPublic') === 'on';
            const showEmail = formData.get('showEmail') === 'on';

            // Chỉ thêm field nếu có giá trị
            if (displayName) profileData.displayName = displayName;
            if (username) profileData.username = username;
            if (location) profileData.location = location;
            if (website) profileData.website = website;
            if (bio) profileData.bio = bio;

            // Boolean fields
            profileData.isPublic = isPublic;
            profileData.showEmail = showEmail;

            // Validation
            if (!profileData.displayName) {
                this.showToast('Tên hiển thị không được để trống', 'error');
                return;
            }

            // Validate website URL
            if (profileData.website && !this.isValidUrl(profileData.website)) {
                this.showToast('URL website không hợp lệ', 'error');
                return;
            }

            console.log('📝 Updating profile...', profileData);

            await dbService.updateUserProfile(this.currentUserId, profileData);

            // Update local data
            Object.assign(this.userData, profileData);

            // Update UI
            this.updateProfileHeader();
            this.hideEditModal();
            this.showToast('Cập nhật thành công!');

        } catch (error) {
            console.error('❌ Error updating profile:', error);

            let errorMessage = 'Có lỗi xảy ra khi cập nhật';
            if (error.message.includes('permissions')) {
                errorMessage = 'Không có quyền cập nhật thông tin này';
            }

            this.showToast(errorMessage, 'error');
        }
    }

    // ✅ THÊM: Validate URL
    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    // ...existing code...

    hideEditModal() {
        const modal = document.getElementById('edit-profile-modal');
        modal?.classList.add('hidden');
    }

    async handleProfileUpdate(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const displayName = formData.get('displayName').trim();
        const bio = formData.get('bio').trim();

        if (!displayName) {
            this.showToast('Tên hiển thị không được để trống', 'error');
            return;
        }

        try {
            await dbService.updateUserProfile(this.currentUserId, {
                displayName,
                bio
            });

            // Update local data
            this.userData.displayName = displayName;
            this.userData.bio = bio;

            // Update UI
            this.updateProfileHeader();
            this.hideEditModal();
            this.showToast('Cập nhật thành công!');

        } catch (error) {
            console.error('Error updating profile:', error);
            this.showToast('Có lỗi xảy ra khi cập nhật', 'error');
        }
    }

    showAuthRequired() {
        const container = document.querySelector('.profile-page');
        if (container) {
            container.innerHTML = `
                <div class="auth-required-page">
                    <h2>Đăng nhập để xem trang cá nhân</h2>
                    <button class="btn-primary" onclick="document.dispatchEvent(new CustomEvent('showAuthModal'))">
                        Đăng nhập
                    </button>
                </div>
            `;
        }
    }

    showError(message) {
        const container = document.querySelector('.profile-page');
        if (container) {
            container.innerHTML = `
                <div class="error-page">
                    <h2>Lỗi</h2>
                    <p>${message}</p>
                    <button class="btn-primary" onclick="window.navigate('/')">
                        Về trang chủ
                    </button>
                </div>
            `;
        }
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `profile-toast ${type}`;
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - new Date(date)) / 1000);

        if (diffInSeconds < 60) return 'Vừa xong';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} ngày trước`;

        return new Date(date).toLocaleDateString('vi-VN');
    }

    formatContent(content) {
        return content.replace(/\n/g, '<br>');
    }
}