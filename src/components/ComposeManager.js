import { authService } from '../services/AuthService.js';
import { dbService } from '../services/DatabaseService.js';
import { cloudinaryService } from '../services/CloudinaryService.js';
import { AvatarService } from '../services/AvatarService.js';

export class ComposeManager {
    constructor() {
        this.textarea = document.getElementById('composeTextarea');
        this.submitBtn = document.getElementById('post-submit-btn');
        this.focusBtn = document.getElementById('focus-compose-btn');
        this.fabBtn = document.getElementById('fab-compose-btn');
        this.userAvatar = document.querySelector('.compose-area .user-avatar');
        this.hashtagSuggestions = document.getElementById('hashtag-suggestions');
        this.characterCounter = document.querySelector('.character-counter');

        // ✅ THÊM: Media upload elements
        this.mediaUploadBtn = document.getElementById('media-upload-btn');
        this.mediaInput = document.getElementById('media-input');
        this.mediaPreview = document.getElementById('media-preview');
        this.selectedMedia = [];

        this.emojiBtn = document.getElementById('emoji-picker-btn');
        this.emojiPopup = document.getElementById('emoji-picker-popup');

        // State
        this.isSubmitting = false;
        this.emojiPickerRendered = false;
        this.extractedHashtags = [];
        this.suggestedHashtags = [
            'lịchsửViệt', 'NguyễnTrãi', 'HồChíMinh', 'LêLợi', 'TrầnHưngĐạo',
            'chiếntranhViệt', 'cổđại', 'hiệnđại', 'vănhóa', 'truyềnthống',
            'anhùng', 'cáchmạng', 'độclập', 'thống nhất', 'pháthtriển'
        ];
        this.currentSuggestionIndex = -1;
    }

    init() {
        this.setupEventListeners();
        this.setupAuthListener();
        this.updateUserAvatar();
        this.updateSubmitButtonState();
        this.createHashtagSuggestionsElement();
    }

    createHashtagSuggestionsElement() {
        if (!this.hashtagSuggestions) {
            const suggestions = document.createElement('div');
            suggestions.id = 'hashtag-suggestions';
            suggestions.className = 'hashtag-suggestions hidden';
            this.textarea.parentNode.appendChild(suggestions);
            this.hashtagSuggestions = suggestions;
        }
    }

    setupAuthListener() {
        // Listen for auth state changes to update UI
        authService.onAuthStateChange((user) => {
            // Do not update avatar here, wait for Firestore user loaded event
            this.updateSubmitButtonState();
        });
        // Listen for Firestore user loaded event
        document.addEventListener('firestoreUserLoaded', () => {
            this.updateUserAvatar();
        });
    }

    setupEventListeners() {
        // Remove old topic pills (we'll replace with hashtags)
        const topicPills = document.querySelector('.topic-pills');
        if (topicPills) {
            topicPills.style.display = 'none';
        }

        // Submit post
        this.submitBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.handlePostSubmit();
        });

        // Focus compose
        this.focusBtn?.addEventListener('click', () => {
            this.focusCompose();
        });

        this.fabBtn?.addEventListener('click', () => {
            this.focusCompose();
        });

        // Enhanced textarea with hashtag detection
        this.textarea?.addEventListener('input', (e) => {
            this.handleTextInput(e);
        });

        this.textarea?.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });

        // Click outside to hide suggestions
        document.addEventListener('click', (e) => {
            if (!this.textarea?.contains(e.target) && !this.hashtagSuggestions?.contains(e.target)) {
                this.hideSuggestions();
            }
        });

        // ✅ THÊM: Media upload listeners
        this.mediaUploadBtn?.addEventListener('click', () => {
            this.mediaInput?.click();
        });

        // ✅ Đảm bảo event được pass vào handleMediaSelect
    this.mediaInput.addEventListener('change', (event) => {
        this.handleMediaSelect(event);
    });

        // Media preview remove buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-media-btn')) {
                const index = parseInt(e.target.dataset.index);
                this.removeMedia(index);
            }
        });

        // ✅ SỬA: Đảm bảo emoji button event được bind đúng cách
    this.emojiBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation(); // ✅ THÊM: Ngăn event bubbling
        console.log('🔘 Emoji button clicked');
        this.toggleEmojiPicker();
    });

    // ✅ SỬA: Đóng popup khi click outside - sử dụng event delegation
    document.addEventListener('click', (e) => {
        if (
            this.emojiPopup &&
            !this.emojiPopup.contains(e.target) &&
            !e.target.closest('#emoji-picker-btn') // ✅ SỬA: Sử dụng closest thay vì ===
        ) {
            this.hideEmojiPicker();
        }
    });

        // Chèn emoji khi click vào emoji
        this.emojiPopup?.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                const emoji = e.target.textContent;
                this.insertEmojiAtCursor(emoji);
                this.hideEmojiPicker();
            }
        });
    }

// ...existing code...
// ✅ SỬA: Bỏ debounce logic gây lỗi, sử dụng logic đơn giản hơn
toggleEmojiPicker() {
    if (!this.emojiPopup) return;
    
    const isHidden = this.emojiPopup.classList.contains('hidden');
    
    if (isHidden) {
        this.showEmojiPicker();
    } else {
        this.hideEmojiPicker();
    }
}

showEmojiPicker() {
    if (!this.emojiPopup || !this.emojiBtn) return;
    
    if (!this.emojiPickerRendered) {
        this.renderEmojiPicker();
    }
    
    // Định vị popup gần nút emoji
    const rect = this.emojiBtn.getBoundingClientRect();
    this.emojiPopup.style.top = `${rect.bottom + window.scrollY + 6}px`;
    this.emojiPopup.style.left = `${rect.left + window.scrollX}px`;
    this.emojiPopup.classList.remove('hidden');
    
    console.log('✅ Emoji picker opened');
}

hideEmojiPicker() {
    if (this.emojiPopup) {
        this.emojiPopup.classList.add('hidden');
        console.log('✅ Emoji picker closed');
    }
}
// ...existing code...

    // ✅ Render emoji picker (danh sách emoji cơ bản)
    renderEmojiPicker() {
        if (!this.emojiPopup || this.emojiPickerRendered) return;
        const emojis = [
            "😀", "😁", "😂", "🤣", "😃", "😄", "😅", "😆",
            "😉", "😊", "😋", "😎", "😍", "😘", "🥰", "😗",
            "😙", "😚", "🙂", "🤗", "🤩", "🤔", "🤨", "😐",
            "😑", "😶", "🙄", "😏", "😣", "😥", "😮", "🤐",
            "😯", "😪", "😫", "🥱", "😴", "😌", "😛", "😜",
            "😝", "🤤", "😒", "😓", "😔", "😕", "🙃", "🤑",
            "😲", "☹️", "🙁", "😖", "😞", "😟", "😤", "😢",
            "😭", "😦", "😧", "😨", "😩", "🤯", "😬", "😰",
            "😱", "🥵", "🥶", "😳", "🤪", "😵", "😡", "😠",
            "🤬", "😷", "🤒", "🤕", "🤢", "🤮", "🥴", "😇",
            "🥳", "🥺", "🤠", "🤡", "🤥", "🤫", "🤭", "🧐"
        ];
        this.emojiPopup.innerHTML = emojis
            .map(e => `<button type="button">${e}</button>`)
            .join('');

        this.emojiPickerRendered = true;
    }

    // ✅ Chèn emoji vào vị trí con trỏ trong textarea
    insertEmojiAtCursor(emoji) {
        if (!this.textarea) return;
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        const value = this.textarea.value;
        this.textarea.value = value.slice(0, start) + emoji + value.slice(end);
        // Đặt lại con trỏ sau emoji
        this.textarea.selectionStart = this.textarea.selectionEnd = start + emoji.length;
        this.textarea.focus();
        this.updateCharacterCounter?.();
        this.updateSubmitButtonState?.();
    }

    handleTextInput(e) {
        const content = e.target.value;

        // Auto-resize
        this.autoResize();

        // Extract hashtags
        this.extractHashtags(content);

        // Check for hashtag typing
        this.checkHashtagTyping(content, e.target.selectionStart);

        // Update UI
        this.updateSubmitButtonState();
        this.updateCharacterCounter();
        this.highlightHashtags();
    }

    extractHashtags(content) {
        // Extract hashtags using regex
        const hashtagRegex = /#[\w\u00C0-\u024F\u1E00-\u1EFFÀàÁáÂâÃãÈèÉéÊêÌìÍíÒòÓóÔôÕõÙùÚúÝýĂăĐđĨĩŨũƠơƯưẠạẢảẤấẦầẨẩẪẫẬậẮắẰằẲẳẴẵẶặẸẹẺẻẼẽẾếỀềỂểỄễỆệỈỉỊịỌọỎỏỐốỒồỔổỖỗỘộỚớỜờỞởỠỡỢợỤụỦủỨứỪừỬửỮữỰựỲỳỴỵỶỷỸỹ]+/g;

        this.extractedHashtags = content.match(hashtagRegex) || [];

        console.log('📝 Extracted hashtags:', this.extractedHashtags);
    }

    checkHashtagTyping(content, cursorPos) {
        // Find if user is typing a hashtag
        const beforeCursor = content.substring(0, cursorPos);
        const hashtagMatch = beforeCursor.match(/#[\w\u00C0-\u024F\u1E00-\u1EFF]*$/);

        if (hashtagMatch) {
            const typingHashtag = hashtagMatch[0].substring(1); // Remove #
            this.showHashtagSuggestions(typingHashtag);
        } else {
            this.hideSuggestions();
        }
    }

    showHashtagSuggestions(partial) {
        if (!this.hashtagSuggestions) return;

        // Filter suggestions based on partial input
        const filtered = this.suggestedHashtags.filter(tag =>
            tag.toLowerCase().includes(partial.toLowerCase()) &&
            !this.extractedHashtags.includes('#' + tag)
        );

        if (filtered.length === 0 || (partial.length === 0)) {
            this.hideSuggestions();
            return;
        }

        // Create suggestion items
        this.hashtagSuggestions.innerHTML = filtered.map((tag, index) => `
            <div class="hashtag-suggestion-item ${index === 0 ? 'active' : ''}" data-hashtag="${tag}">
                #${tag}
            </div>
        `).join('');

        // Position suggestions
        this.positionSuggestions();

        // Show suggestions
        this.hashtagSuggestions.classList.remove('hidden');
        this.currentSuggestionIndex = 0;

        // Add click handlers
        this.hashtagSuggestions.querySelectorAll('.hashtag-suggestion-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                this.selectHashtag(item.dataset.hashtag);
            });
        });
    }

    hideSuggestions() {
        if (this.hashtagSuggestions) {
            this.hashtagSuggestions.classList.add('hidden');
            this.currentSuggestionIndex = -1;
        }
    }

    positionSuggestions() {
        if (!this.hashtagSuggestions || !this.textarea) return;

        const textareaRect = this.textarea.getBoundingClientRect();

        this.hashtagSuggestions.style.position = 'absolute';
        this.hashtagSuggestions.style.top = `${textareaRect.bottom + window.scrollY + 5}px`;
        this.hashtagSuggestions.style.left = `${textareaRect.left + window.scrollX}px`;
        this.hashtagSuggestions.style.width = `${textareaRect.width}px`;
    }

    selectHashtag(hashtag) {
        const content = this.textarea.value;
        const cursorPos = this.textarea.selectionStart;

        // Find the hashtag being typed
        const beforeCursor = content.substring(0, cursorPos);
        const hashtagMatch = beforeCursor.match(/#[\w\u00C0-\u024F\u1E00-\u1EFF]*$/);

        if (hashtagMatch) {
            const startPos = cursorPos - hashtagMatch[0].length;
            const newContent = content.substring(0, startPos) + '#' + hashtag + ' ' + content.substring(cursorPos);

            this.textarea.value = newContent;
            this.textarea.focus();

            // Set cursor after the hashtag
            const newCursorPos = startPos + hashtag.length + 2; // +2 for # and space
            this.textarea.setSelectionRange(newCursorPos, newCursorPos);

            // Update state
            this.extractHashtags(newContent);
            this.hideSuggestions();
            this.updateSubmitButtonState();
            this.highlightHashtags();
        }
    }

    handleKeyDown(e) {
        // Handle suggestion navigation
        if (this.hashtagSuggestions && !this.hashtagSuggestions.classList.contains('hidden')) {
            const suggestions = this.hashtagSuggestions.querySelectorAll('.hashtag-suggestion-item');

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.currentSuggestionIndex = Math.min(this.currentSuggestionIndex + 1, suggestions.length - 1);
                this.updateSuggestionSelection(suggestions);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.currentSuggestionIndex = Math.max(this.currentSuggestionIndex - 1, 0);
                this.updateSuggestionSelection(suggestions);
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                const activeItem = suggestions[this.currentSuggestionIndex];
                if (activeItem) {
                    this.selectHashtag(activeItem.dataset.hashtag);
                }
            } else if (e.key === 'Escape') {
                this.hideSuggestions();
            }
        }

        // Submit shortcut
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.handlePostSubmit();
        }
    }

    updateSuggestionSelection(suggestions) {
        suggestions.forEach((item, index) => {
            item.classList.toggle('active', index === this.currentSuggestionIndex);
        });
    }

    highlightHashtags() {
        // For now, we'll just add a visual cue through CSS
        // Later we can implement proper syntax highlighting
        const content = this.textarea.value;
        const hasHashtags = /#[\w\u00C0-\u024F\u1E00-\u1EFF]+/.test(content);

        this.textarea.classList.toggle('has-hashtags', hasHashtags);
    }

    // ✅ SỬA: Validate media file với thông báo lỗi rõ ràng hơn
    validateMediaFile(file) {
        const maxSize = 50 * 1024 * 1024; // 50MB
        const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/mov'];
        const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];

        if (file.size > maxSize) {
            throw new Error(`File "${file.name}" quá lớn. Kích thước tối đa là 50MB.`);
        }

        if (!allowedTypes.includes(file.type)) {
            throw new Error(`File "${file.name}" có định dạng không được hỗ trợ. Chỉ chấp nhận JPG, PNG, GIF, WebP, MP4, WebM, MOV.`);
        }

        return true;
    }

async handleMediaSelect(event) {
    // ✅ Kiểm tra event và files trước khi xử lý
    if (!event || !event.target || !event.target.files) {
        console.error('Invalid event or no files selected');
        this.showToast('Không thể đọc file. Vui lòng thử lại.', 'error');
        return;
    }

    const files = Array.from(event.target.files);

    // ✅ Kiểm tra có file nào được chọn không
    if (files.length === 0) {
        return;
    }

    for (const file of files) {
        try {
            await this.validateMediaFile(file);

            const mediaItem = {
                id: Date.now() + Math.random(),
                file: file,
                type: file.type.startsWith('image/') ? 'image' : 'video',
                preview: URL.createObjectURL(file),
                name: file.name,
                size: file.size
            };

            this.selectedMedia.push(mediaItem);
            this.updateMediaPreview();

        } catch (error) {
            console.error(`Error processing file: ${file.name}`, error);
            // ✅ SỬA: Hiển thị lỗi lên toast thay vì chỉ console log
            this.showToast(error.message, 'error');
        }
    }

    // Reset input để có thể chọn lại cùng file
    event.target.value = '';
}

    // ✅ THÊM: Add media to preview
    async addMediaToPreview(file) {
        const mediaItem = {
            file: file,
            type: file.type.startsWith('image/') ? 'image' : 'video',
            preview: null,
            uploading: false,
            uploaded: false,
            url: null
        };

        // Create preview
        if (mediaItem.type === 'image') {
            mediaItem.preview = await this.createImagePreview(file);
        } else {
            mediaItem.preview = await this.createVideoPreview(file);
        }

        this.selectedMedia.push(mediaItem);
    }

    // ✅ THÊM: Create image preview
    createImagePreview(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    }

    // ✅ THÊM: Create video preview
    createVideoPreview(file) {
        return new Promise((resolve) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = () => {
                video.currentTime = 0.5; // Capture frame at 0.5s
            };
            video.onseeked = () => {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0);
                resolve(canvas.toDataURL());
            };
            video.src = URL.createObjectURL(file);
        });
    }

    // ✅ THÊM: Update media preview display
    updateMediaPreview() {
        if (!this.mediaPreview) return;

        if (this.selectedMedia.length === 0) {
            this.mediaPreview.classList.add('hidden');
            return;
        }

        this.mediaPreview.classList.remove('hidden');

        const html = this.selectedMedia.map((media, index) => `
            <div class="media-item" data-index="${index}">
                <div class="media-thumbnail">
                    ${media.type === 'image'
                ? `<img src="${media.preview}" alt="Preview">`
                : `<div class="video-thumbnail">
                            <img src="${media.preview}" alt="Video preview">
                            <div class="video-overlay">
                                <i class="fas fa-play"></i>
                            </div>
                           </div>`
            }
                    ${media.uploading ? '<div class="upload-progress"></div>' : ''}
                </div>
                <button type="button" class="remove-media-btn" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');

        this.mediaPreview.innerHTML = html;
    }

    // ✅ THÊM: Remove media
    removeMedia(index) {
        this.selectedMedia.splice(index, 1);
        this.updateMediaPreview();
        this.mediaInput.value = ''; // Reset input
    }

    // ✅ SỬA: Update handlePostSubmit để upload media
    async handlePostSubmit() {
        console.log('🚀 Post submit triggered');

        const content = this.textarea.value.trim();

        // Validation
        if (!content && this.selectedMedia.length === 0) {
            this.showError('Vui lòng nhập nội dung hoặc chọn media');
            this.shakeTextarea();
            return;
        }

        if (content.length > 2000) {
            this.showError('Nội dung không được vượt quá 2000 ký tự');
            this.focusTextarea();
            return;
        }

        if (this.isSubmitting) {
            console.log('⚠️ Already submitting, ignoring...');
            return;
        }

        // Check authentication
        if (!authService.isSignedIn()) {
            console.log('🔐 User not signed in, showing auth modal');
            const event = new CustomEvent('showAuthModal', {
                detail: {
                    message: 'Đăng nhập để chia sẻ bài viết của bạn'
                }
            });
            document.dispatchEvent(event);
            return;
        }

        try {
            console.log('💾 Starting post creation...');
            this.setSubmitLoading(true);

            const user = authService.getCurrentUser();
            if (!user) {
                throw new Error('Không thể xác thực người dùng');
            }

            // ✅ THÊM: Upload media files
            const mediaUrls = await this.uploadMediaFiles();

            // Extract content without hashtags for main content
            const plainContent = content.replace(/#[\w\u00C0-\u024F\u1E00-\u1EFF]+/g, '').trim();

            // Use Firestore user data for author info
            const firestoreUser = window.currentUserData;
            const authorInfo = firestoreUser ? {
                uid: firestoreUser.uid,
                displayName: firestoreUser.displayName,
                avatar: firestoreUser.avatar,
                photoURL: firestoreUser.photoURL
            } : {
                uid: user.uid,
                displayName: userInfo.displayName,
                avatar: userInfo.avatar,
                photoURL: userInfo.photoURL
            };

            // Prepare enhanced post data (INCLUDE author)
            const postData = {
                content: content,
                plainContent: plainContent,
                hashtags: this.extractedHashtags,
                media: mediaUrls, // ✅ THÊM: Media URLs
                metadata: {
                    characterCount: content.length,
                    wordCount: content.split(/\s+/).filter(word => word.length > 0).length,
                    hashtagCount: this.extractedHashtags.length,
                    mediaCount: mediaUrls.length // ✅ THÊM: Media count
                },
                author: authorInfo // <-- Ensure author is included
            };

            console.log('📝 Enhanced post data:', postData);

            // Save to database
            const postId = await dbService.createPost(postData, user);
            console.log('✅ Post created with ID:', postId);

            this.showSuccess('Đã đăng bài thành công!');

            // Dispatch event for FeedManager
            const newPostEvent = new CustomEvent('newPost', {
                detail: {
                    id: postId,
                    content: content,
                    plainContent: plainContent,
                    hashtags: this.extractedHashtags,
                    media: mediaUrls, // ✅ THÊM: Media URLs
                    author: authorInfo,
                    createdAt: new Date(),
                    stats: {
                        likes: 0,
                        comments: 0,
                        shares: 0
                    },
                    metadata: postData.metadata
                }
            });

            document.dispatchEvent(newPostEvent);
            console.log('📢 New post event dispatched');

            this.resetForm();

        } catch (error) {
            console.error('❌ Error submitting post:', error);
            this.showError(error.message || 'Có lỗi xảy ra khi đăng bài. Vui lòng thử lại.');
        } finally {
            this.setSubmitLoading(false);
        }
    }

    // ✅ SỬA: Upload media files to Cloudinary
    async uploadMediaFiles() {
        if (this.selectedMedia.length === 0) return [];

        const mediaUrls = [];

        for (let i = 0; i < this.selectedMedia.length; i++) {
            const media = this.selectedMedia[i];

            try {
                // Update UI to show uploading
                media.uploading = true;
                this.updateMediaPreview();

                // ✅ SỬA: Sử dụng method phù hợp cho từng loại media
                let url;
                if (media.type === 'image') {
                    const folder = 'posts/images';
                    url = await cloudinaryService.uploadImage(media.file, folder);
                } else if (media.type === 'video') {
                    // ✅ SỬA: Dùng method riêng cho video hoặc generic upload
                    const folder = 'posts/videos';
                    url = await cloudinaryService.uploadMedia(media.file, folder);
                }

                mediaUrls.push({
                    type: media.type,
                    url: url,
                    originalName: media.file.name
                });

                media.uploaded = true;
                media.uploading = false;
                media.url = url;

            } catch (error) {
                console.error('❌ Error uploading media:', error);
                media.uploading = false;
                throw new Error(`Không thể upload ${media.file.name}: ${error.message}`);
            }
        }

        return mediaUrls;
    }

    updateCharacterCounter() {
        if (this.characterCounter && this.textarea) {
            const length = this.textarea.value.length;

            this.characterCounter.innerHTML = `
            <span class="char-count">${length}/2000</span>
            ${this.extractedHashtags.length > 0 ? `<span class="hashtag-count">${this.extractedHashtags.length} hashtag</span>` : ''}
        `;

            // Reset color to default when empty
            if (length === 0) {
                this.characterCounter.style.color = 'var(--text-secondary)';
            } else if (length > 1900) {
                this.characterCounter.style.color = 'var(--accent-warning, #f59e0b)';
            } else if (length > 2000) {
                this.characterCounter.style.color = 'var(--accent-error, #ef4444)';
            } else {
                this.characterCounter.style.color = 'var(--text-secondary)';
            }
        }
    }

    setSubmitLoading(loading) {
        this.isSubmitting = loading;
        this.submitBtn.disabled = loading;

        if (loading) {
            this.submitBtn.textContent = 'Đang đăng...';
            this.submitBtn.style.opacity = '0.7';
        } else {
            this.submitBtn.textContent = 'Đăng dòng';
            this.submitBtn.style.opacity = '1';
        }
    }

    updateUserAvatar() {
        const user = window.currentUserData;
        const userAvatar = document.querySelector('.compose-area .user-avatar');
        console.log('[DEBUG] updateUserAvatar called with Firestore user:', user);
        if (!userAvatar) {
            console.warn('[DEBUG] .compose-area .user-avatar element not found');
            return;
        }
        userAvatar.innerHTML = '';

        if (user && (user.photoURL || user.avatar)) {
            console.log('[DEBUG] Using Firestore user photoURL/avatar:', user.photoURL || user.avatar);
            const img = document.createElement('img');
            img.src = user.photoURL || user.avatar;
            img.alt = 'Avatar';
            img.className = 'user-avatar-img';
            userAvatar.appendChild(img);
        } else if (AvatarService.shouldUseAvataaars(user)) {
            const avatarUrl = AvatarService.getUserAvatar(user, 50);
            console.log('[DEBUG] Using Avataaars avatar:', avatarUrl);
            const img = document.createElement('img');
            img.src = avatarUrl;
            img.alt = 'Avatar';
            img.className = 'user-avatar-img';
            userAvatar.appendChild(img);
        } else {
            const initials = AvatarService.getInitials(user?.displayName);
            console.log('[DEBUG] Using initials avatar:', initials);
            const span = document.createElement('span');
            span.className = 'user-avatar-text';
            span.textContent = initials;
            userAvatar.appendChild(span);
        }
    }

    updateSubmitButtonState() {
        const content = this.textarea.value.trim();
        const hasContent = content.length > 0;
        const isSignedIn = authService.isSignedIn();

        // Always enable if has content, regardless of auth state
        this.submitBtn.disabled = !hasContent || this.isSubmitting;

        if (!hasContent) {
            this.submitBtn.textContent = 'Đăng dòng';
        } else if (!isSignedIn) {
            this.submitBtn.textContent = 'Đăng dòng'; // Same text, but will prompt auth on click
        } else {
            this.submitBtn.textContent = 'Đăng dòng';
        }
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

showToast(message, type = 'info') {
    console.log('🍞 Showing toast:', message, type);
    
    // Tạo toast element
    const toast = document.createElement('div');
    toast.className = `compose-toast compose-toast--${type}`;
    toast.textContent = message;
    
    // Thêm vào DOM
    document.body.appendChild(toast);
    
    // Hiện toast
    setTimeout(() => toast.classList.add('compose-toast--show'), 100);
    
    // Ẩn toast sau 3 giây
    setTimeout(() => {
        toast.classList.remove('compose-toast--show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

    focusCompose() {
        this.textarea.focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    autoResize() {
        this.textarea.style.height = 'auto';
        this.textarea.style.height = Math.min(this.textarea.scrollHeight, 180) + 'px';
    }

    shakeTextarea() {
        this.textarea.style.animation = 'shake 0.5s';
        this.textarea.addEventListener('animationend', () => {
            this.textarea.style.animation = '';
        }, { once: true });

        // Focus and show hint
        this.textarea.focus();
        this.showToast('Vui lòng nhập nội dung bài viết', 'error');
    }

    // ✅ SỬA: Update resetForm để reset media
    resetForm() {
        this.textarea.value = '';
        this.selectedMedia = [];
        this.extractedHashtags = [];
        this.updateCharacterCounter();
        this.updateSubmitButtonState();
        this.updateMediaPreview();
        this.hideSuggestions();

        if (this.mediaInput) {
            this.mediaInput.value = '';
        }
    }
}