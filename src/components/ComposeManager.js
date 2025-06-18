import { authService } from '../services/AuthService.js';
import { dbService } from '../services/DatabaseService.js';

export class ComposeManager {
    constructor() {
        this.textarea = document.getElementById('composeTextarea');
        this.submitBtn = document.getElementById('post-submit-btn');
        this.focusBtn = document.getElementById('focus-compose-btn');
        this.fabBtn = document.getElementById('fab-compose-btn');
        this.userAvatar = document.querySelector('.compose-area .user-avatar');
        this.hashtagSuggestions = document.getElementById('hashtag-suggestions');
        this.characterCounter = document.querySelector('.character-counter');

        // State
        this.isSubmitting = false;
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
            this.updateUserAvatar();
            this.updateSubmitButtonState();
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

    async handlePostSubmit() {
        console.log('🚀 Post submit triggered');

        const content = this.textarea.value.trim();

        // Validation
        if (!content) {
            this.showError('Vui lòng nhập nội dung bài viết');
            this.shakeTextarea();
            return;
        }

        if (content.length < 3) {
            this.showError('Nội dung phải có ít nhất 3 ký tự');
            this.focusTextarea();
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

            // Extract content without hashtags for main content
            const plainContent = content.replace(/#[\w\u00C0-\u024F\u1E00-\u1EFF]+/g, '').trim();

            // Prepare enhanced post data
            const postData = {
                content: content, // Full content with hashtags
                plainContent: plainContent, // Content without hashtags for search
                hashtags: this.extractedHashtags,
                metadata: {
                    characterCount: content.length,
                    wordCount: content.split(/\s+/).filter(word => word.length > 0).length,
                    hashtagCount: this.extractedHashtags.length
                }
            };

            console.log('📝 Enhanced post data:', postData);

            // Save to database
            const postId = await dbService.createPost(postData, user);
            console.log('✅ Post created with ID:', postId);

            this.showSuccess('Đã đăng bài thành công!');

            // Get user display info
            const userInfo = authService.getUserDisplayInfo();

            // Dispatch event for FeedManager
            const newPostEvent = new CustomEvent('newPost', {
                detail: {
                    id: postId,
                    content: content,
                    plainContent: plainContent,
                    hashtags: this.extractedHashtags,
                    author: {
                        uid: user.uid,
                        displayName: userInfo.displayName,
                        avatar: userInfo.avatar,
                        photoURL: userInfo.photoURL
                    },
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
        if (this.userAvatar) {
            const userInfo = authService.getUserDisplayInfo();

            if (userInfo.photoURL) {
                this.userAvatar.style.backgroundImage = `url(${userInfo.photoURL})`;
                this.userAvatar.style.backgroundSize = 'cover';
                this.userAvatar.textContent = '';
            } else {
                this.userAvatar.style.backgroundImage = 'none';
                this.userAvatar.textContent = userInfo.avatar;
            }
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
        // Remove existing toasts
        document.querySelectorAll('.toast').forEach(toast => toast.remove());

        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        // Style toast
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '8px',
            color: 'white',
            backgroundColor: type === 'success' ? '#4CAF50' : type === 'error' ? '#F44336' : '#2196F3',
            zIndex: '9999',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            transform: 'translateX(300px)',
            transition: 'transform 0.3s ease',
            maxWidth: '300px',
            wordWrap: 'break-word'
        });

        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);

        // Auto remove
        setTimeout(() => {
            toast.style.transform = 'translateX(300px)';
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
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

    resetForm() {
        // Clear textarea
        this.textarea.value = '';
        this.textarea.style.height = 'auto';

        // Clear hashtag state
        this.extractedHashtags = [];

        // Hide suggestions if showing
        this.hideSuggestions();

        // Remove hashtag highlighting
        this.textarea.classList.remove('has-hashtags');

        // Reset old topic pills (if any exist)
        document.querySelectorAll('.pill-button').forEach(btn =>
            btn.classList.remove('active')
        );

        // Reset character counter
        this.updateCharacterCounter();

        // Update submit button state
        this.updateSubmitButtonState();

        console.log('✅ Form reset completed');
    }
}