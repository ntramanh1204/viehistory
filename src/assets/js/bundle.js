/**
 * VieHistory Fixed JavaScript Bundle
 * Sửa lỗi auth state management hoàn toàn
 */

(function(window) {
    'use strict';

    // ==================== FIREBASE CONFIG ====================

    // Initialize Firebase immediately when available
    function initializeFirebase() {
        if (typeof firebase !== 'undefined' && window.FIREBASE_CONFIG) {
            console.log('🔥 Initializing Firebase...');
            firebase.initializeApp(window.FIREBASE_CONFIG);
            window.db = firebase.firestore();
            window.auth = firebase.auth();
            
            // Set auth persistence
            auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
                .then(() => console.log('✅ Auth persistence set to LOCAL'))
                .catch(error => console.error('❌ Error setting auth persistence:', error));
            
            return true;
        }
        return false;
    }

    // ==================== AI IMAGE GENERATOR CONFIG ====================
    /**
 * AI Image Generation Configuration
 */

// Thay thế class AIImageGenerator hoàn toàn:

class AIImageGenerator {
    constructor() {
    // Load API key từ env file hoặc dùng trực tiếp
    this.geminiApiKey = window.ENV_CONFIG?.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY_HERE';
    this.geminiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    
    // Check if API key is configured
    if (!this.geminiApiKey || this.geminiApiKey === 'YOUR_GEMINI_API_KEY') {
        console.warn('⚠️ Gemini API key not configured. Using fallback mode only.');
        this.aiEnabled = false;
    } else {
        this.aiEnabled = true;
        console.log('✅ Gemini API key configured');
    }
    
    this.cache = new Map();
    this.lastRequestTime = 0;
    this.minInterval = 2000;
    
    console.log('🤖 Gemini AI Image Generator initialized');
}

    async generateImage(prompt) {
        try {
            console.log('🎨 Generating image with Gemini for:', prompt);
            
            // Kiểm tra cache trước
            if (this.cache.has(prompt)) {
                console.log('📋 Using cached image');
                return this.cache.get(prompt);
            }

            // Rate limiting
            await this.applyRateLimit();

            // Thử các phương pháp theo thứ tự
            const methods = [
                () => this.generateWithGeminiEnhanced(prompt),
                () => this.generateWithPollinations(prompt),
                () => this.generateVietnameseThemeImage(prompt)
            ];

            for (const method of methods) {
                try {
                    const result = await method();
                    if (result) {
                        console.log('✅ Image generated successfully');
                        this.cache.set(prompt, result);
                        this.lastRequestTime = Date.now();
                        return result;
                    }
                } catch (error) {
                    console.log('❌ Method failed, trying next...', error);
                    continue;
                }
            }

            // Fallback cuối cùng
            return this.getFallbackImage(prompt);

        } catch (error) {
            console.error('❌ All methods failed:', error);
            return this.getFallbackImage(prompt);
        }
    }

    async generateWithGeminiEnhanced(prompt) {
        try {
            if (!this.geminiApiKey || this.geminiApiKey === 'YOUR_GEMINI_API_KEY') {
                console.log('⚠️ Gemini API key not configured, skipping...');
                throw new Error('Gemini API key not configured');
            }

            console.log('🧠 Step 1: Enhancing prompt with Gemini...');
            
            // Bước 1: Dùng Gemini để tạo prompt description tốt hơn
            const enhancedPrompt = await this.enhancePromptWithGemini(prompt);
            
            console.log('🎨 Step 2: Generating image with enhanced prompt...');
            
            // Bước 2: Dùng prompt đó với Pollinations
            return await this.generateWithPollinations(enhancedPrompt);

        } catch (error) {
            console.error('❌ Gemini enhanced generation failed:', error);
            throw error;
        }
    }

    async enhancePromptWithGemini(prompt) {
        try {
            const response = await fetch(`${this.geminiEndpoint}?key=${this.geminiApiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Tôi cần bạn cải thiện prompt thiết kế áo này cho AI tạo ảnh: "${prompt}"

NHIỆM VỤ: Tạo prompt tiếng Anh chi tiết, chuyên nghiệp cho AI tạo ảnh áo thun

PHONG CÁCH CẦN:
- Nghệ thuật truyền thống Việt Nam (tranh dân gian, lacquer, thêu)
- Màu sắc: đỏ, vàng, xanh lá (màu cờ VN), vàng gold
- Bố cục: phù hợp in áo, không quá phức tạp
- Chất lượng: high quality, detailed, professional

YÊU CẦU ĐẦU RA:
- CHỈ trả về prompt tiếng Anh
- Ngắn gọn nhưng đầy đủ chi tiết
- Không giải thích thêm

VÍ DỤ FORMAT: "Vietnamese traditional art style t-shirt design featuring [description], red and gold colors, detailed illustration, cultural heritage motifs, suitable for printing, high quality artwork"

Hãy tạo prompt cho: "${prompt}"`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 200,
                        topP: 0.8,
                        topK: 40
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.text();
                console.error('Gemini API error response:', errorData);
                throw new Error(`Gemini API error: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            console.log('📊 Gemini API response:', data);
            
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                const enhancedPrompt = data.candidates[0].content.parts[0].text.trim();
                console.log('🎯 Gemini enhanced prompt:', enhancedPrompt);
                return enhancedPrompt;
            }

            throw new Error('No enhanced prompt from Gemini');

        } catch (error) {
            console.error('❌ Gemini enhancement failed:', error);
            // Fallback prompt nếu Gemini fail
            return `Vietnamese traditional art style t-shirt design featuring ${prompt}, red and gold colors, detailed illustration, cultural heritage motifs, high quality artwork`;
        }
    }

    async generateWithPollinations(prompt) {
        try {
            console.log('🎨 Calling Pollinations with prompt:', prompt);
            
            const encodedPrompt = encodeURIComponent(prompt);
            const models = ['flux', 'flux-realism', 'turbo'];
            const randomModel = models[Math.floor(Math.random() * models.length)];
            
            const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&model=${randomModel}&seed=${Date.now()}&enhance=true&nologo=true`;
            
            console.log('📡 Pollinations URL:', imageUrl);
            return await this.testImageLoad(imageUrl);

        } catch (error) {
            console.error('❌ Pollinations error:', error);
            throw error;
        }
    }

    generateVietnameseThemeImage(prompt) {
        console.log('🎭 Generating Vietnamese theme image for:', prompt);
        
        const themes = {
            'trần hưng đạo': { color: 'FF0000', icon: '⚔️', bg: 'FFD700', title: 'Trần Hưng Đạo' },
            'lý thái tổ': { color: '8B4513', icon: '👑', bg: 'F0E68C', title: 'Lý Thái Tổ' },
            'hồ chí minh': { color: 'FF0000', icon: '⭐', bg: 'FFD700', title: 'Hồ Chí Minh' },
            'rồng': { color: 'FF6B35', icon: '🐉', bg: '87CEEB', title: 'Rồng Việt' },
            'sen': { color: 'FF69B4', icon: '🏵️', bg: '98FB98', title: 'Hoa Sen' },
            'cờ': { color: 'FF0000', icon: '🇻🇳', bg: 'FFD700', title: 'Cờ Việt Nam' },
            'áo dài': { color: 'FF1493', icon: '👘', bg: 'FFE4E1', title: 'Áo Dài' },
            'phượng': { color: 'FF4500', icon: '🦅', bg: 'FFA500', title: 'Phượng Hoàng' }
        };

        let selectedTheme = { color: '1E90FF', icon: '🎨', bg: 'F0F8FF', title: 'VieHistory' };
        
        Object.keys(themes).forEach(keyword => {
            if (prompt.toLowerCase().includes(keyword)) {
                selectedTheme = themes[keyword];
            }
        });

        const svg = `
            <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#${selectedTheme.bg};stop-opacity:1" />
                        <stop offset="50%" style="stop-color:#${selectedTheme.color};stop-opacity:0.8" />
                        <stop offset="100%" style="stop-color:#${selectedTheme.bg};stop-opacity:1" />
                    </linearGradient>
                    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                        <dropShadow dx="4" dy="4" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/>
                    </filter>
                </defs>
                <rect width="1024" height="1024" fill="url(#grad1)" />
                <circle cx="512" cy="350" r="120" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.5)" stroke-width="3"/>
                <text x="512" y="380" font-family="Arial, sans-serif" font-size="80" fill="white" text-anchor="middle" filter="url(#shadow)">${selectedTheme.icon}</text>
                <text x="512" y="500" font-family="Arial, sans-serif" font-size="36" fill="white" text-anchor="middle" font-weight="bold" filter="url(#shadow)">${selectedTheme.title}</text>
                <text x="512" y="580" font-family="Arial, sans-serif" font-size="24" fill="white" text-anchor="middle" opacity="0.9" filter="url(#shadow)">VieHistory Design</text>
                <text x="512" y="650" font-family="Arial, sans-serif" font-size="18" fill="white" text-anchor="middle" opacity="0.8">${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}</text>
                <text x="512" y="750" font-family="Arial, sans-serif" font-size="16" fill="white" text-anchor="middle" opacity="0.7">Thiết kế áo lịch sử Việt Nam</text>
                
                <!-- Decorative elements -->
                <circle cx="200" cy="200" r="30" fill="rgba(255,255,255,0.1)" />
                <circle cx="824" cy="824" r="30" fill="rgba(255,255,255,0.1)" />
                <circle cx="824" cy="200" r="20" fill="rgba(255,255,255,0.15)" />
                <circle cx="200" cy="824" r="20" fill="rgba(255,255,255,0.15)" />
            </svg>
        `;

        const blob = new Blob([svg], { type: 'image/svg+xml' });
        return URL.createObjectURL(blob);
    }

    async testImageLoad(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            const timeout = setTimeout(() => {
                reject(new Error('Image load timeout'));
            }, 15000); // 15 giây timeout

            img.onload = () => {
                clearTimeout(timeout);
                console.log('✅ Image loaded successfully');
                resolve(url);
            };
            
            img.onerror = () => {
                clearTimeout(timeout);
                console.log('❌ Image failed to load');
                reject(new Error('Image failed to load'));
            };
            
            img.src = url;
        });
    }

    async applyRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.minInterval) {
            const waitTime = this.minInterval - timeSinceLastRequest;
            console.log(`⏳ Rate limiting: waiting ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }

    getFallbackImage(prompt) {
        const colors = ['FF6B6B', '4ECDE6', '45B7D1', '96CEB4', 'FECA57', 'F8B500'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        const encodedPrompt = encodeURIComponent(prompt.substring(0, 20));
        
        return `https://via.placeholder.com/1024x1024/${randomColor}/FFFFFF?text=${encodedPrompt}`;
    }
}

// Export for global use
window.AIImageGenerator = AIImageGenerator;

// Export for global use
window.AIImageGenerator = AIImageGenerator;



    // ==================== UTILITIES ====================
    
    function normalize(str) {
        return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    // ==================== URL PROTECTION ====================
    
    class URLProtection {
        static init() {
            const currentPath = window.location.pathname;
            
            if (currentPath.startsWith('/src/app/') && !currentPath.endsWith('.html')) {
                window.location.replace('/');
                return;
            }
        }
        
        static redirectTo(path) {
            window.location.href = path;
        }
    }

    // ==================== STORAGE MANAGER ====================
    
    class StorageManager {
        static set(key, value) {
            try {
                localStorage.setItem(`viehistory_${key}`, JSON.stringify(value));
            } catch (error) {
                console.error('Storage set error:', error);
            }
        }
        
        static get(key) {
            try {
                const item = localStorage.getItem(`viehistory_${key}`);
                return item ? JSON.parse(item) : null;
            } catch (error) {
                console.error('Storage get error:', error);
                return null;
            }
        }
        
        static remove(key) {
            localStorage.removeItem(`viehistory_${key}`);
        }
        
        static clear() {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('viehistory_')) {
                    localStorage.removeItem(key);
                }
            });
        }
    }

    // ==================== FORM VALIDATION ====================
    
    class FormValidator {
        static validateEmail(email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email);
        }
        
        static validatePassword(password) {
            return password.length >= 6;
        }
        
        static validateRequired(value) {
            return value && value.trim().length > 0;
        }
        
        static showError(elementId, message) {
            const element = document.getElementById(elementId);
            if (element) {
                element.innerHTML = `<span class="text-danger">${message}</span>`;
            }
        }
        
        static showSuccess(elementId, message) {
            const element = document.getElementById(elementId);
            if (element) {
                element.innerHTML = `<span class="text-success">${message}</span>`;
            }
        }
        
        static clearMessage(elementId) {
            const element = document.getElementById(elementId);
            if (element) {
                element.innerHTML = '';
            }
        }
    }

    // ==================== AUTHENTICATION ====================
    
    class AuthManager {
        static async createUserProfile(uid, userData) {
            try {
                await db.collection('users').doc(uid).set({
                    name: userData.name,
                    email: userData.email,
                    role: userData.role || 'user',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    isActive: true
                });
                console.log('✅ User profile created successfully');
            } catch (error) {
                console.error('❌ Error creating user profile:', error);
                throw error;
            }
        }
        
        static async getCurrentUser() {
            const user = auth.currentUser;
            if (!user) return null;
            
            const userDoc = await db.collection('users').doc(user.uid).get();
            return userDoc.exists ? { uid: user.uid, ...userDoc.data() } : null;
        }
        
        static async signOut() {
            try {
                await auth.signOut();
                console.log('✅ User signed out successfully');
                // Don't redirect here, let AuthStateManager handle it
            } catch (error) {
                console.error('❌ Sign out error:', error);
            }
        }
    }

    // ==================== AUTH MIDDLEWARE ====================
    
    class AuthMiddleware {
        static async getCurrentUserRole() {
            const user = auth.currentUser;
            if (!user) return null;
            
            try {
                const userDoc = await db.collection('users').doc(user.uid).get();
                return userDoc.exists ? userDoc.data().role : 'user';
            } catch (error) {
                console.error('Error getting user role:', error);
                return 'user';
            }
        }
        
        static async requireAdmin() {
            const role = await this.getCurrentUserRole();
            if (role !== 'admin') {
                alert('Bạn không có quyền truy cập trang này!');
                window.location.href = '/';
                return false;
            }
            return true;
        }
        
        static async requireAuth() {
            return new Promise((resolve) => {
                auth.onAuthStateChanged(user => {
                    if (!user) {
                        window.location.href = '/login.html';
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                });
            });
        }
        
        static async showAdminElements() {
            const role = await this.getCurrentUserRole();
            console.log('🔑 Current user role:', role);
            
            const adminElements = document.querySelectorAll('.admin-only');
            adminElements.forEach(el => {
                el.style.display = role === 'admin' ? 'block' : 'none';
            });
        }
    }

    // ==================== HEADER MANAGER ====================
    
 class HeaderManager {
        static init() {
            console.log('🎛️ HeaderManager: Initializing...');
            this.initializeLogoutButton();
        }
        
        static showUserInterface(userData) {
            console.log('👤 HeaderManager: Showing user interface for', userData.name);
            
            const userInfoSection = document.getElementById('userInfoSection');
            const authButtonsSection = document.getElementById('authButtonsSection');
            const adminBtn = document.getElementById('adminBtn'); // Nút admin nằm trong userInfoSection
            const userSection = document.getElementById('userSection'); // Mục user trong sidebar

            if (userInfoSection) {
                userInfoSection.style.display = 'flex'; // Hiển thị thông tin người dùng
            }
            
            if (authButtonsSection) {
                authButtonsSection.style.display = 'none'; // Ẩn các nút đăng nhập/đăng ký
            }

            // Cập nhật tên và vai trò người dùng
            const userNameEl = document.getElementById('userName');
            const userRoleEl = document.getElementById('userRole');

            if (userNameEl) {
                userNameEl.textContent = `Xin chào, ${userData.name}`;
            }
            if (userRoleEl) {
                userRoleEl.textContent = userData.role === 'admin' ? 'Quản trị viên' : 'Thành viên';
                userRoleEl.className = userData.role === 'admin' ? 'text-warning' : 'text-light';
            }
            
            // Quản lý hiển thị nút Admin (nằm trong userInfoSection)
            if (adminBtn) {
                adminBtn.style.display = userData.role === 'admin' ? 'inline-block' : 'none';
            }

            // Hiển thị mục user trong sidebar
            if (userSection) {
                userSection.style.display = 'block'; // Hoặc 'flex' tùy theo CSS của bạn
            }
            console.log('✅ User interface shown');
        }
        
        static showAuthButtons() {
            console.log('🔓 HeaderManager: Showing auth buttons');
            
            const userInfoSection = document.getElementById('userInfoSection');
            const authButtonsSection = document.getElementById('authButtonsSection');
            // adminBtn nằm trong userInfoSection, nên sẽ tự ẩn khi userInfoSection ẩn.
            const userSection = document.getElementById('userSection'); // Mục user trong sidebar

            if (userInfoSection) {
                userInfoSection.style.display = 'none'; // Ẩn thông tin người dùng
            }
            
            if (authButtonsSection) {
                authButtonsSection.style.display = 'flex'; // Hiển thị các nút đăng nhập/đăng ký
            }
            
            // Ẩn mục user trong sidebar
            if (userSection) {
                userSection.style.display = 'none';
            }
            
            console.log('✅ Auth buttons shown successfully');
        }
        
        static showUserInterface(userData) {
            console.log('👤 HeaderManager: Showing user interface for', userData.name);
            
            const userInfoSection = document.getElementById('userInfoSection');
    const authButtonsSection = document.getElementById('authButtonsSection');
    if (userInfoSection) userInfoSection.style.display = 'flex';
    if (authButtonsSection) authButtonsSection.style.display = 'none';
            const adminBtn = document.getElementById('adminBtn');
            
            console.log('🔍 Elements check:', {
                userInfoSection: !!userInfoSection,
                authButtonsSection: !!authButtonsSection,
                adminBtn: !!adminBtn
            });

            // ✅ FORCE HIDE AUTH BUTTONS AND SHOW USER INFO
            if (userInfoSection) {
                userInfoSection.style.display = 'flex';
                userInfoSection.style.visibility = 'visible';
                console.log('✅ User info section shown');
            }
            
            if (authButtonsSection) {
                authButtonsSection.style.display = 'none';
                authButtonsSection.style.visibility = 'hidden';
                console.log('✅ Auth buttons hidden');
            }

            // Update user info
            const userNameEl = document.getElementById('userName');
            const userRoleEl = document.getElementById('userRole');

            if (userNameEl) {
                userNameEl.textContent = `Xin chào, ${userData.name}`;
                console.log('✅ User name updated');
            }
            
            if (userRoleEl) {
                userRoleEl.textContent = userData.role === 'admin' ? 'Quản trị viên' : 'Thành viên';
                userRoleEl.className = userData.role === 'admin' ? 'text-warning' : 'text-light';
                console.log('✅ User role updated');
            }
            
            // Show admin button if user is admin
            if (adminBtn && userData.role === 'admin') {
                adminBtn.style.display = 'inline-block';
                console.log('✅ Admin button shown');
            } else if (adminBtn) {
                adminBtn.style.display = 'none';
            }

            // Update sidebar user section
            const userSection = document.getElementById('userSection');
            if (userSection) {
                userSection.style.display = 'block';
            }
        }
        
        static showAuthButtons() {
               const userInfoSection = document.getElementById('userInfoSection');
    const authButtonsSection = document.getElementById('authButtonsSection');
    if (userInfoSection) userInfoSection.style.display = 'none';
    if (authButtonsSection) authButtonsSection.style.display = 'flex';

            // ✅ FORCE SHOW AUTH BUTTONS AND HIDE USER INFO
            if (userInfoSection) {
                userInfoSection.style.display = 'none';
                userInfoSection.style.visibility = 'hidden';
            }
            
            if (authButtonsSection) {
                authButtonsSection.style.display = 'flex';
                authButtonsSection.style.visibility = 'visible';
            }
            
            if (adminBtn) adminBtn.style.display = 'none';
            if (userSection) userSection.style.display = 'none';
            
            console.log('✅ Auth buttons shown successfully');
        }
        
       // Trong HeaderManager class, thay thế initializeLogoutButton():
static initializeLogoutButton() {
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', async function (e) {
                    e.preventDefault();
        
                    if (confirm('Bạn có chắc muốn đăng xuất?')) {
                        try {
                            // Check if it's demo user
                            const currentUser = StorageManager.get('currentUser');
                            // if (currentUser && currentUser.uid === 'demo-user') { // Logic demo user đã bị comment lại
                            //     // Demo user logout
                            //     console.log('🚪 Demo user logout');
                            //     StorageManager.remove('currentUser');
                            //     HeaderManager.showAuthButtons();
                            //     window.location.href = '/';
                            //     return;
                            // }
                            
                            // Firebase user logout
                            console.log('🚪 Firebase user logout');
                            await AuthManager.signOut();
                            // AuthStateManager will handle UI update automatically
                            setTimeout(() => {
                                window.location.href = '/';
                            }, 500);
                        } catch (error) {
                            console.error('Logout error:', error);
                            alert('Có lỗi xảy ra khi đăng xuất!');
                        }
                    }
                });
                console.log('🚪 Logout button initialized');
            }
        }
    
    }

    // ==================== AUTH STATE MANAGER ====================
    
   // Thay thế class AuthStateManager:
class AuthStateManager {
    static isInitialized = false;
    
    static init() {
        if (this.isInitialized) {
            console.log('⚠️ AuthStateManager already initialized');
            return;
        }
        
        console.log('🔐 AuthStateManager: Initializing...');
        
        // Check for demo user first
        // this.checkDemoUser();
        
        // Wait for Firebase to be ready
        const initAuth = () => {
            if (typeof auth === 'undefined' || !auth) {
                console.log('⏳ Auth not ready, retrying in 1 second...');
                setTimeout(initAuth, 1000);
                return;
            }
            
            console.log('✅ Firebase Auth ready, setting up listener');
            this.isInitialized = true;
            
            // Set up auth state listener
            auth.onAuthStateChanged(async (user) => {
                console.log('🔄 AuthStateManager: Firebase Auth state changed', user ? 'LOGGED IN' : 'LOGGED OUT');
                
                if (user) {
                    await this.handleFirebaseUserSignedIn(user);
                } else {
                    // Only handle signout if it's not a demo user
                    const demoUser = StorageManager.get('currentUser');
                    if (!demoUser || demoUser.uid !== 'demo-user') {
                        this.handleUserSignedOut();
                    }
                }
            });
        };
        
        initAuth();
    }
    
    // static checkDemoUser() {
    //     // Check if demo user is stored
    //     const currentUser = StorageManager.get('currentUser');
    //     if (currentUser && currentUser.uid === 'demo-user') {
    //         console.log('🎭 Demo user found in storage, showing user interface');
    //         setTimeout(() => {
    //             this.waitForHeaderElements().then(() => {
    //                 HeaderManager.showUserInterface(currentUser);
    //             });
    //         }, 1000);
    //     }
    // }
    
    static async handleFirebaseUserSignedIn(user) {
        console.log('✅ AuthStateManager: Handling Firebase user sign in for', user.email);
        
        try {
            // Wait for header elements to be loaded
            await this.waitForHeaderElements();
            
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                console.log('📄 Firebase user data loaded:', userData);
                
                const userInfo = {
                    name: userData.name || user.displayName || user.email.split('@')[0],
                    role: userData.role || 'user',
                    email: user.email
                };
                
                // Update header UI
                HeaderManager.showUserInterface(userInfo);
                
                // Show admin elements if needed
                AuthMiddleware.showAdminElements();
                
                // Store user data (overwrite demo user if exists)
                StorageManager.set('currentUser', {
                    uid: user.uid,
                    ...userInfo
                });
                
                console.log('✅ Firebase user sign in handled successfully');
            } else {
                console.log('⚠️ Firebase user document not found, creating default profile');
                // Create default profile
                await AuthManager.createUserProfile(user.uid, {
                    name: user.displayName || user.email.split('@')[0],
                    email: user.email,
                    role: 'user'
                });
                
                // Retry handling
                setTimeout(() => this.handleFirebaseUserSignedIn(user), 1000);
            }
        } catch (error) {
            console.error('❌ Error handling Firebase user sign in:', error);
        }
    }
    
    static handleUserSignedOut() {
        console.log('🚪 AuthStateManager: Handling user sign out');
        
        // Check if it's demo user - don't sign out demo user via Firebase
        const currentUser = StorageManager.get('currentUser');
        if (currentUser && currentUser.uid === 'demo-user') {
            console.log('🎭 Demo user, skipping Firebase signout handling');
            return;
        }
        
        // Show auth buttons immediately
        HeaderManager.showAuthButtons();
        
        // Hide admin elements
        const adminElements = document.querySelectorAll('.admin-only');
        adminElements.forEach(el => el.style.display = 'none');
        
        // Clear stored user data
        StorageManager.clear();
        
        console.log('✅ Firebase user sign out handled successfully');
    }
    
    static async waitForHeaderElements(maxAttempts = 10) {
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            const userInfoSection = document.getElementById('userInfoSection');
            const authButtonsSection = document.getElementById('authButtonsSection');
            
            if (userInfoSection && authButtonsSection) {
                console.log('✅ Header elements found after', attempts + 1, 'attempts');
                return true;
            }
            
            console.log('⏳ Waiting for header elements... attempt', attempts + 1);
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
        }
        
        console.error('❌ Header elements not found after', maxAttempts, 'attempts');
        return false;
    }
    
    static getCurrentUser() {
        return StorageManager.get('currentUser');
    }
}

    // ==================== COMPONENT LOADER ====================
    
    class ComponentLoader {
        static async includeHTML() {
            console.log('📄 ComponentLoader: Starting HTML inclusion');
            
            const elements = document.querySelectorAll('[w3-include-html]');
            console.log('🔍 Found elements to include:', elements.length);
            
            for (const el of elements) {
                const file = el.getAttribute('w3-include-html');
                if (file) {
                    try {
                        console.log('📥 Loading component:', file);
                        const response = await fetch(file);
                        const html = await response.text();
                        el.innerHTML = html;
                        el.removeAttribute('w3-include-html');
                        
                        // Re-run for nested includes
                        await this.includeHTML();
                    } catch (err) {
                        el.innerHTML = "Component not found.";
                        console.error("❌ Error including", file, err);
                    }
                }
            }
            
            console.log('✅ ComponentLoader: HTML inclusion completed');
            this.initializeLoadedComponents();
        }
        
        static initializeLoadedComponents() {
            console.log('🔧 ComponentLoader: Initializing loaded components');
            
            // Wait a bit for DOM to be ready
            setTimeout(() => {
                // Initialize header manager
                if (window.VieHistory?.HeaderManager) {
                    console.log('🎛️ Initializing HeaderManager');
                    VieHistory.HeaderManager.init();
                }
                
                // Initialize auth state manager AFTER header is loaded
                if (window.VieHistory?.AuthState) {
                    console.log('🔐 Initializing AuthState');
                    VieHistory.AuthState.init();
                }
                
                // Re-initialize copy buttons
                if (window.VieHistory?.App) {
                    VieHistory.App.initializeCopyButtons();
                }
            }, 100);
        }
    }



    // ==================== MAIN APPLICATION ====================
    
    class VieHistoryApp {
        static lessons = [
            { title: "Thánh Gióng", img: "https://images.unsplash.com/photo-1506744038136-46273834b3fb", topic: "legend", link: "trial.html" },
            { title: "Sơn Tinh Thủy Tinh", img: "https://images.unsplash.com/photo-1465101046530-73398c7f28ca", topic: "legend", link: "#" },
            { title: "Hai Bà Trưng", img: "https://images.unsplash.com/photo-1519125323398-675f0ddb6308", topic: "hero", link: "#" },
            { title: "Lý Thường Kiệt", img: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e", topic: "hero", link: "#" },
            { title: "Trần Hưng Đạo", img: "https://images.unsplash.com/photo-1519985176271-adb1088fa94c", topic: "hero", link: "#" }
        ];

        static init() {
            console.log('🚀 VieHistoryApp: Starting initialization...');
            
            // Initialize Firebase first
            const firebaseReady = initializeFirebase();
            if (!firebaseReady) {
                console.log('⏳ Firebase not ready, retrying in 1 second...');
                setTimeout(() => this.init(), 1000);
                return;
            }

            // Initialize URL protection
            URLProtection.init();

            // Initialize component loading
            ComponentLoader.includeHTML();

            // Initialize page-specific functionality
            this.initializeSearch();
            this.initializeCopyButtons();
            this.initializeQuizForms();
            this.initializeLessonFilters();
            this.initializeLoginForm();
            this.initializeSignupForm();

            console.log('✅ VieHistoryApp: Initialization completed');
        }

        static initializeSearch() {
            const searchInput = document.getElementById('searchInput');
            if (!searchInput) return;
            
            const mainGrid = document.querySelector('.col-lg-9');
            if (!mainGrid) return;
            
            const allSections = Array.from(mainGrid.querySelectorAll('section'));
            
            searchInput.addEventListener('input', function() {
                const keyword = normalize(this.value.trim());
                
                if (!keyword) {
                    allSections.forEach(section => section.style.display = '');
                    allSections.forEach(section => {
                        section.querySelectorAll('.card').forEach(card => card.parentElement.style.display = '');
                    });
                    return;
                }
                
                allSections.forEach(section => {
                    let hasMatch = false;
                    section.querySelectorAll('.card').forEach(card => {
                        const text = normalize(card.innerText);
                        if (text.includes(keyword)) {
                            card.parentElement.style.display = '';
                            hasMatch = true;
                        } else {
                            card.parentElement.style.display = 'none';
                        }
                    });
                    section.style.display = hasMatch ? '' : 'none';
                });
            });
        }

    // Đảm bảo initializeCopyButtons() vẫn có đầy đủ:

static initializeCopyButtons() {
    console.log('🔧 Initializing copy buttons...');
    
    // Copy email button
    const copyEmailBtn = document.getElementById('copyEmailBtn');
    const demoEmail = document.getElementById('demoEmail');
    
    if (copyEmailBtn && demoEmail) {
        console.log('✅ Email copy button found');
        copyEmailBtn.addEventListener('click', function() {
            const emailText = demoEmail.textContent;
            
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(emailText).then(() => {
                    VieHistoryApp.showCopySuccess(copyEmailBtn);
                });
            } else {
                VieHistoryApp.fallbackCopyTextToClipboard(emailText);
                VieHistoryApp.showCopySuccess(copyEmailBtn);
            }
        });
    } else {
        console.log('⚠️ Email copy elements not found');
    }

    // Copy password button
    const copyPasswordBtn = document.getElementById('copyPasswordBtn');
    const demoPassword = document.getElementById('demoPassword');
    
    if (copyPasswordBtn && demoPassword) {
        console.log('✅ Password copy button found');
        copyPasswordBtn.addEventListener('click', function() {
            const passwordText = demoPassword.textContent;
            
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(passwordText).then(() => {
                    VieHistoryApp.showCopySuccess(copyPasswordBtn);
                });
            } else {
                VieHistoryApp.fallbackCopyTextToClipboard(passwordText);
                VieHistoryApp.showCopySuccess(copyPasswordBtn);
            }
        });
    } else {
        console.log('⚠️ Password copy elements not found');
    }
}

        static showCopySuccess(btn) {
            btn.classList.remove('ri-file-copy-line');
            btn.classList.add('ri-check-double-line');
            
            setTimeout(() => {
                btn.classList.remove('ri-check-double-line');
                btn.classList.add('ri-file-copy-line');
            }, 1000);
        }

        static fallbackCopyTextToClipboard(text) {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.top = "0";
            textArea.style.left = "0";
            textArea.style.position = "fixed";
            
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                document.execCommand('copy');
            } catch (err) {
                console.error('Fallback: Oops, unable to copy', err);
            }
            
            document.body.removeChild(textArea);
        }

        static initializeQuizForms() {
            const quizForm = document.getElementById('quizForm');
            if (!quizForm) return;
            
            quizForm.onsubmit = function(e) {
                e.preventDefault();
                
                const answer = document.querySelector('input[name="answer"]:checked');
                const result = document.getElementById('quizResult');
                
                if (!answer) {
                    result.innerHTML = '<span class="text-danger">Vui lòng chọn đáp án!</span>';
                    return;
                }
                
                if (answer.value === 'A') {
                    result.innerHTML = '<span class="text-success">Chính xác! Thánh Gióng đã đánh đuổi giặc Ân 🎉</span>';
                } else {
                    result.innerHTML = '<span class="text-danger">Chưa đúng, hãy thử lại!</span>';
                }
            };
        }

        static initializeLessonFilters() {
            const lessonList = document.getElementById('lessonList');
            const filter = document.getElementById('filter');
            
            if (!lessonList || !filter) return;
            
            this.renderLessons('all');
            filter.onchange = () => this.renderLessons(filter.value);
        }

        static renderLessons(topic) {
            const lessonList = document.getElementById('lessonList');
            if (!lessonList) return;
            
            lessonList.innerHTML = '';
            
            this.lessons.filter(l => topic === 'all' || l.topic === topic).forEach(l => {
                lessonList.innerHTML += `
                    <div class="col-md-4 mb-4">
                        <div class="card h-100">
                            <img src="${l.img}" class="card-img-top" alt="${l.title}">
                            <div class="card-body">
                                <h5 class="card-title">${l.title}</h5>
                                <a href="${l.link}" class="btn btn-primary">Xem bài học</a>
                            </div>
                        </div>
                    </div>
                `;
            });
        }

 static initializeLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    loginForm.onsubmit = async function (e) {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();
        const result = document.getElementById('loginResult');
        const submitBtn = loginForm.querySelector('button[type="submit"]');

        // Validation
        if (!FormValidator.validateEmail(email)) {
            result.innerHTML = '<span class="text-danger">Email không hợp lệ!</span>';
            return;
        }

        if (!FormValidator.validatePassword(password)) {
            result.innerHTML = '<span class="text-danger">Mật khẩu phải có ít nhất 6 ký tự!</span>';
            return;
        }

        // Show loading state
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Đang đăng nhập...';
        result.innerHTML = '<span class="text-info">🔄 Đang xác thực...</span>';

        try {
            // ✅ 1. DEMO LOGIN CHECK FIRST
            // if (email === "test@example.com" && password === "123456") {
            //     result.innerHTML = '<span class="text-success">🎉 Đăng nhập demo thành công! Đang chuyển hướng...</span>';
                
            //     // Simulate demo user login
            //     setTimeout(() => {
            //         // Set demo user data in storage
            //         StorageManager.set('currentUser', {
            //             uid: 'demo-user',
            //             name: 'Demo User',
            //             email: 'test@example.com',
            //             role: 'user'
            //         });
                    
            //         // Force header update for demo user
            //         if (window.VieHistory?.HeaderManager) {
            //             VieHistory.HeaderManager.showUserInterface({
            //                 name: 'Demo User',
            //                 role: 'user',
            //                 email: 'test@example.com'
            //             });
            //         }
                    
            //         // Redirect to home
            //         window.location.href = "/";
            //     }, 1200);
            //     return;
            // }

            // ✅ 2. FIREBASE REAL AUTHENTICATION
            // Check if Firebase is available
            if (typeof auth === 'undefined' || !auth) {
                throw new Error('🔥 Firebase Auth chưa sẵn sàng. Vui lòng thử lại!');
            }

            console.log('🔥 Attempting Firebase authentication...');
            
            // Firebase authentication
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            console.log('✅ Firebase authentication successful:', user.email);

            // Check if user profile exists in Firestore
            const userDoc = await db.collection('users').doc(user.uid).get();

            if (!userDoc.exists) {
                console.log('⚠️ User profile not found, creating new profile...');
                // Create user profile if not exists
                await AuthManager.createUserProfile(user.uid, {
                    name: user.displayName || email.split('@')[0],
                    email: user.email,
                    role: 'user'
                });
                console.log('✅ User profile created successfully');
            }

            result.innerHTML = '<span class="text-success">✅ Đăng nhập thành công! Đang chuyển hướng...</span>';

            // AuthStateManager will handle header update automatically
            // Just redirect to home page
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);

        } catch (error) {
            console.error('❌ Login error:', error);

            let errorMessage = 'Đăng nhập thất bại!';

            if (error.message.includes('Firebase Auth chưa sẵn sàng')) {
                errorMessage = error.message;
            } else {
                switch (error.code) {
                    case 'auth/user-not-found':
                        errorMessage = 'Tài khoản không tồn tại!';
                        break;
                    case 'auth/wrong-password':
                        errorMessage = 'Sai mật khẩu!';
                        break;
                    case 'auth/invalid-email':
                        errorMessage = 'Email không hợp lệ!';
                        break;
                    case 'auth/user-disabled':
                        errorMessage = 'Tài khoản đã bị khóa!';
                        break;
                    case 'auth/too-many-requests':
                        errorMessage = 'Quá nhiều lần thử. Vui lòng thử lại sau!';
                        break;
                    case 'auth/network-request-failed':
                        errorMessage = 'Lỗi kết nối mạng!';
                        break;
                    case 'auth/invalid-credential':
                        errorMessage = 'Thông tin đăng nhập không chính xác!';
                        break;
                    default:
                        errorMessage = `Lỗi: ${error.message}`;
                }
            }

            result.innerHTML = `<span class="text-danger">❌ ${errorMessage}</span>`;

        } finally {
            // Reset button state
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    };
}

        static initializeSignupForm() {
            const signupForm = document.getElementById('signupForm');
            if (!signupForm) return;

            signupForm.onsubmit = async function (e) {
                e.preventDefault();

                const name = document.getElementById('name').value.trim();
                const email = document.getElementById('email').value.trim();
                const password = document.getElementById('password').value.trim();
                const confirmPassword = document.getElementById('confirmPassword').value.trim();
                const result = document.getElementById('signupResult');
                const submitBtn = signupForm.querySelector('button[type="submit"]');

                // Validation
                if (!FormValidator.validateRequired(name)) {
                    result.innerHTML = '<span class="text-danger">Vui lòng nhập họ tên!</span>';
                    return;
                }

                if (!FormValidator.validateEmail(email)) {
                    result.innerHTML = '<span class="text-danger">Email không hợp lệ!</span>';
                    return;
                }

                if (!FormValidator.validatePassword(password)) {
                    result.innerHTML = '<span class="text-danger">Mật khẩu phải có ít nhất 6 ký tự!</span>';
                    return;
                }

                if (password !== confirmPassword) {
                    result.innerHTML = '<span class="text-danger">Mật khẩu xác nhận không khớp!</span>';
                    return;
                }

                // Show loading state
                const originalText = submitBtn.textContent;
                submitBtn.disabled = true;
                submitBtn.textContent = 'Đang đăng ký...';
                result.innerHTML = '<span class="text-info">🔄 Đang tạo tài khoản...</span>';

                try {
                    // Create Firebase user
                    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                    const user = userCredential.user;

                    // Update display name
                    await user.updateProfile({
                        displayName: name
                    });

                    // Create user profile in Firestore
                    await AuthManager.createUserProfile(user.uid, {
                        name: name,
                        email: email,
                        role: 'user'
                    });

                    result.innerHTML = '<span class="text-success">✅ Đăng ký thành công! Đang chuyển hướng...</span>';

                    // Redirect to home
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 1500);

                } catch (error) {
                    console.error('Signup error:', error);

                    let errorMessage = 'Đăng ký thất bại!';

                    switch (error.code) {
                        case 'auth/email-already-in-use':
                            errorMessage = 'Email đã được sử dụng!';
                            break;
                        case 'auth/invalid-email':
                            errorMessage = 'Email không hợp lệ!';
                            break;
                        case 'auth/weak-password':
                            errorMessage = 'Mật khẩu quá yếu!';
                            break;
                        default:
                            errorMessage = `Lỗi: ${error.message}`;
                    }

                    result.innerHTML = `<span class="text-danger">❌ ${errorMessage}</span>`;

                } finally {
                    // Reset button state
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            };
        }
    }

    // ==================== GLOBAL NAMESPACE ====================
    
    window.VieHistory = {
        App: VieHistoryApp,
        Auth: AuthManager,
        AuthMiddleware: AuthMiddleware,
        AuthState: AuthStateManager,
        URLProtection: URLProtection,
        ComponentLoader: ComponentLoader,
        FormValidator: FormValidator,
        StorageManager: StorageManager,
        HeaderManager: HeaderManager,
        
        // Utility functions
        normalize: normalize,
        
        // Initialize everything
        init: function() {
            VieHistoryApp.init();
        }
    };

    // ==================== AUTO INITIALIZATION ====================
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('📜 DOM loaded, initializing VieHistory...');
            window.VieHistory.init();
        });
    } else {
        console.log('📜 DOM already loaded, initializing VieHistory...');
        window.VieHistory.init();
    }

    // ==================== LEGACY SUPPORT ====================
    
    // Export functions for backward compatibility
    window.includeHTML = ComponentLoader.includeHTML.bind(ComponentLoader);
    window.getCurrentUserRole = AuthMiddleware.getCurrentUserRole.bind(AuthMiddleware);
    window.requireAdmin = AuthMiddleware.requireAdmin.bind(AuthMiddleware);

    console.log('🎯 VieHistory bundle loaded successfully!');

})(window);

// /**
//  * VieHistory JavaScript Bundle
//  * Tất cả JavaScript functionality trong một file
//  */

// (function (window) {
//     'use strict';

//     // ==================== FIREBASE CONFIG ====================

//     // Firebase configuration
//     const firebaseConfig = {
//         apiKey: "AIzaSyAUySe1UStbVK3jhQEM5dGCwgVA5iQb3I4",
//         authDomain: "viehistory-436c6.firebaseapp.com",
//         projectId: "viehistory-436c6",
//         storageBucket: "viehistory-436c6.firebasestorage.app",
//         messagingSenderId: "348086067423",
//         appId: "1:348086067423:web:86b3c0c0ffed29d2b9896a"
//     };

//     // Initialize Firebase when available
//     function initializeFirebase() {
//         if (typeof firebase !== 'undefined') {
//             firebase.initializeApp(firebaseConfig);
//             window.db = firebase.firestore();
//             window.auth = firebase.auth();
//         }
//     }


//     // ==================== UTILITIES ====================

//     // String normalization utility
//     function normalize(str) {
//         return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
//     }

//     // ==================== URL PROTECTION ====================

//     class URLProtection {
//         static init() {
//             const currentPath = window.location.pathname;

//             // Chặn truy cập thư mục src/app/ trực tiếp
//             if (currentPath.startsWith('/src/app/') && !currentPath.endsWith('.html')) {
//                 window.location.replace('/');
//                 return;
//             }
//         }

//         static redirectTo(path) {
//             window.location.href = path;
//         }
//     }

//     // ==================== COMPONENT LOADER ====================

// class ComponentLoader {
//     static async includeHTML() {
//         console.log('ComponentLoader: Starting HTML inclusion');
        
//         const elements = document.querySelectorAll('[w3-include-html]');
//         console.log('Found elements to include:', elements.length);
        
//         for (const el of elements) {
//             const file = el.getAttribute('w3-include-html');
//             if (file) {
//                 try {
//                     console.log('Loading component:', file);
//                     const response = await fetch(file);
//                     const html = await response.text();
//                     el.innerHTML = html;
//                     el.removeAttribute('w3-include-html');
                    
//                     await this.includeHTML();
//                 } catch (err) {
//                     el.innerHTML = "Component not found.";
//                     console.error("Error including", file, err);
//                 }
//             }
//         }
        
//         console.log('ComponentLoader: HTML inclusion completed');
//         this.initializeLoadedComponents();
//     }
    
//     static initializeLoadedComponents() {
//         console.log('ComponentLoader: Initializing loaded components');
        
//         // Kiểm tra các elements có tồn tại không
//         const userInfoSection = document.getElementById('userInfoSection');
//         const authButtonsSection = document.getElementById('authButtonsSection');
        
//         console.log('userInfoSection found:', !!userInfoSection);
//         console.log('authButtonsSection found:', !!authButtonsSection);
        
//         // Initialize auth state manager after header is loaded
//         if (window.VieHistory && window.VieHistory.AuthState) {
//             console.log('Initializing AuthState');
//             VieHistory.AuthState.init();
//         }
        
//         // Initialize header manager
//         if (window.VieHistory && window.VieHistory.HeaderManager) {
//             console.log('Initializing HeaderManager');
//             VieHistory.HeaderManager.init();
//         }
//     }
// }

//     // ==================== AUTHENTICATION ====================

//     class AuthManager {
//         static async createUserProfile(uid, userData) {
//             try {
//                 await db.collection('users').doc(uid).set({
//                     name: userData.name,
//                     email: userData.email,
//                     role: userData.role || 'user',
//                     createdAt: firebase.firestore.FieldValue.serverTimestamp(),
//                     isActive: true
//                 });
//             } catch (error) {
//                 console.error('Error creating user profile:', error);
//                 throw error;
//             }
//         }

//         static async getCurrentUser() {
//             const user = auth.currentUser;
//             if (!user) return null;

//             const userDoc = await db.collection('users').doc(user.uid).get();
//             return userDoc.exists ? { uid: user.uid, ...userDoc.data() } : null;
//         }

//         static async signOut() {
//             try {
//                 await auth.signOut();
//                 window.location.href = '/';
//             } catch (error) {
//                 console.error('Sign out error:', error);
//             }
//         }
//     }

//     // class AuthStateManager {
//     //     static init() {
//     //         // Monitor Firebase Auth state changes
//     //         auth.onAuthStateChanged(async (user) => {
//     //             if (user) {
//     //                 // User is signed in
//     //                 await this.handleUserSignedIn(user);
//     //             } else {
//     //                 // User is signed out
//     //                 this.handleUserSignedOut();
//     //             }
//     //         });
//     //     }

//     //     static async handleUserSignedIn(user) {
//     //         try {
//     //             // Get user profile from Firestore
//     //             const userDoc = await db.collection('users').doc(user.uid).get();

//     //             if (userDoc.exists) {
//     //                 const userData = userDoc.data();

//     //                 // Update header UI
//     //                 HeaderManager.showUserInterface({
//     //                     name: userData.name || user.displayName || user.email.split('@')[0],
//     //                     role: userData.role || 'user',
//     //                     email: user.email
//     //                 });

//     //                 // Show/hide admin elements
//     //                 AuthMiddleware.showAdminElements();

//     //                 // Store user data in session
//     //                 StorageManager.set('currentUser', {
//     //                     uid: user.uid,
//     //                     name: userData.name,
//     //                     email: user.email,
//     //                     role: userData.role
//     //                 });

//     //                 console.log('User logged in:', userData.name);
//     //             }
//     //         } catch (error) {
//     //             console.error('Error handling user sign in:', error);
//     //         }
//     //     }

//     //     static handleUserSignedOut() {
//     //         // Show login/signup buttons
//     //         HeaderManager.showAuthButtons();

//     //         // Hide admin elements
//     //         const adminElements = document.querySelectorAll('.admin-only');
//     //         adminElements.forEach(el => el.style.display = 'none');

//     //         // Clear stored user data
//     //         StorageManager.remove('currentUser');

//     //         console.log('User signed out');
//     //     }

//     //     static getCurrentUser() {
//     //         return StorageManager.get('currentUser');
//     //     }
//     // }

//     class AuthStateManager {
//     static init() {
//         console.log('AuthStateManager: Initializing');
        
//         // Đợi để đảm bảo Firebase đã sẵn sàng
//         setTimeout(() => {
//             if (typeof auth === 'undefined') {
//                 console.error('Auth not available, retrying in 2 seconds');
//                 setTimeout(() => this.init(), 2000);
//                 return;
//             }
            
//             console.log('AuthStateManager: Setting up auth listener');
//             auth.onAuthStateChanged(async (user) => {
//                 console.log('AuthStateManager: Auth state changed', user ? 'logged in' : 'logged out');
                
//                 if (user) {
//                     await this.handleUserSignedIn(user);
//                 } else {
//                     this.handleUserSignedOut();
//                 }
//             });
//         }, 500);
//     }
    
//     static async handleUserSignedIn(user) {
//         console.log('AuthStateManager: Handling user sign in for', user.email);
        
//         try {
//             const userDoc = await db.collection('users').doc(user.uid).get();
            
//             if (userDoc.exists) {
//                 const userData = userDoc.data();
//                 console.log('User data loaded:', userData);
                
//                 // Kiểm tra elements trước khi update
//                 const userInfoSection = document.getElementById('userInfoSection');
//                 const authButtonsSection = document.getElementById('authButtonsSection');
                
//                 if (!userInfoSection || !authButtonsSection) {
//                     console.error('Header elements not found, retrying in 1 second');
//                     setTimeout(() => this.handleUserSignedIn(user), 1000);
//                     return;
//                 }
                
//                 HeaderManager.showUserInterface({
//                     name: userData.name || user.displayName || user.email.split('@')[0],
//                     role: userData.role || 'user',
//                     email: user.email
//                 });
                
//                 AuthMiddleware.showAdminElements();
                
//                 StorageManager.set('currentUser', {
//                     uid: user.uid,
//                     name: userData.name,
//                     email: user.email,
//                     role: userData.role
//                 });
                
//                 console.log('User interface updated successfully');
//             }
//         } catch (error) {
//             console.error('Error handling user sign in:', error);
//         }
//     }
    
//     static handleUserSignedOut() {
//         console.log('AuthStateManager: Handling user sign out');
        
//         const userInfoSection = document.getElementById('userInfoSection');
//         const authButtonsSection = document.getElementById('authButtonsSection');
        
//         if (userInfoSection && authButtonsSection) {
//             HeaderManager.showAuthButtons();
//             console.log('Auth buttons shown');
//         } else {
//             console.error('Header elements not found during sign out');
//         }
        
//         const adminElements = document.querySelectorAll('.admin-only');
//         adminElements.forEach(el => el.style.display = 'none');
        
//         StorageManager.remove('currentUser');
//     }

//     static getCurrentUser() {
//             return StorageManager.get('currentUser');
//         }
// }


//     // ==================== HEADER MANAGER ====================

//     class HeaderManager {
//         static init() {
//             this.initializeLogoutButton();
//             // Don't check auth here, let AuthStateManager handle it
//         }

//     static showUserInterface(userData) {
//         console.log('HeaderManager: Showing user interface for', userData.name);
        
//         const userInfoSection = document.getElementById('userInfoSection');
//         const authButtonsSection = document.getElementById('authButtonsSection');
//         const adminBtn = document.getElementById('adminBtn');
        
//         console.log('Elements found:', {
//             userInfoSection: !!userInfoSection,
//             authButtonsSection: !!authButtonsSection,
//             adminBtn: !!adminBtn
//         });

//         if (userInfoSection) {
//             userInfoSection.style.display = 'flex';
//             console.log('User info section shown');
//         }
        
//         if (authButtonsSection) {
//             authButtonsSection.style.display = 'none';
//             console.log('Auth buttons hidden');
//         }

//         const userNameEl = document.getElementById('userName');
//         const userRoleEl = document.getElementById('userRole');

//         if (userNameEl) {
//             userNameEl.textContent = `Xin chào, ${userData.name}`;
//             console.log('User name updated');
//         }
        
//         if (userRoleEl) {
//             userRoleEl.textContent = userData.role === 'admin' ? 'Quản trị viên' : 'Thành viên';
//             userRoleEl.className = userData.role === 'admin' ? 'text-warning' : 'text-light';
//             console.log('User role updated');
//         }
        
//         if (adminBtn && userData.role === 'admin') {
//             adminBtn.style.display = 'inline-block';
//             console.log('Admin button shown');
//         }
//     }
    
//     static showAuthButtons() {
//         console.log('HeaderManager: Showing auth buttons');
        
//         const userInfoSection = document.getElementById('userInfoSection');
//         const authButtonsSection = document.getElementById('authButtonsSection');
//         const adminBtn = document.getElementById('adminBtn');

//         if (userInfoSection) userInfoSection.style.display = 'none';
//         if (authButtonsSection) authButtonsSection.style.display = 'flex';
//         if (adminBtn) adminBtn.style.display = 'none';
        
//         console.log('Auth buttons shown successfully');
//     }

//         static initializeLogoutButton() {
//             const logoutBtn = document.getElementById('logoutBtn');
//             if (logoutBtn) {
//                 logoutBtn.addEventListener('click', async function (e) {
//                     e.preventDefault();

//                     if (confirm('Bạn có chắc muốn đăng xuất?')) {
//                         try {
//                             await auth.signOut();
//                             // AuthStateManager will handle UI update automatically
//                             window.location.href = '/';
//                         } catch (error) {
//                             console.error('Logout error:', error);
//                             alert('Có lỗi xảy ra khi đăng xuất!');
//                         }
//                     }
//                 });
//             }
//         }
//     }

//     // ==================== AUTH MIDDLEWARE ====================

//     class AuthMiddleware {
//         static async getCurrentUserRole() {
//             const user = auth.currentUser;
//             if (!user) return null;

//             try {
//                 const userDoc = await db.collection('users').doc(user.uid).get();
//                 return userDoc.exists ? userDoc.data().role : 'user';
//             } catch (error) {
//                 console.error('Error getting user role:', error);
//                 return 'user';
//             }
//         }

//         static async requireAdmin() {
//             const role = await this.getCurrentUserRole();
//             if (role !== 'admin') {
//                 alert('Bạn không có quyền truy cập trang này!');
//                 window.location.href = '/';
//                 return false;
//             }
//             return true;
//         }

//         static async requireAuth() {
//             return new Promise((resolve) => {
//                 auth.onAuthStateChanged(user => {
//                     if (!user) {
//                         window.location.href = '/login.html';
//                         resolve(false);
//                     } else {
//                         resolve(true);
//                     }
//                 });
//             });
//         }

//         static async showAdminElements() {
//             const role = await this.getCurrentUserRole();
//             const adminElements = document.querySelectorAll('.admin-only');

//             adminElements.forEach(el => {
//                 el.style.display = role === 'admin' ? 'block' : 'none';
//             });
//         }
//     }

//     // ==================== FORM VALIDATION ====================

//     class FormValidator {
//         static validateEmail(email) {
//             const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//             return re.test(email);
//         }

//         static validatePassword(password) {
//             return password.length >= 6;
//         }

//         static validateRequired(value) {
//             return value && value.trim().length > 0;
//         }

//         static showError(elementId, message) {
//             const element = document.getElementById(elementId);
//             if (element) {
//                 element.innerHTML = `<span class="text-danger">${message}</span>`;
//             }
//         }

//         static showSuccess(elementId, message) {
//             const element = document.getElementById(elementId);
//             if (element) {
//                 element.innerHTML = `<span class="text-success">${message}</span>`;
//             }
//         }

//         static clearMessage(elementId) {
//             const element = document.getElementById(elementId);
//             if (element) {
//                 element.innerHTML = '';
//             }
//         }
//     }

//     // ==================== STORAGE MANAGER ====================

//     class StorageManager {
//         static set(key, value) {
//             try {
//                 localStorage.setItem(`viehistory_${key}`, JSON.stringify(value));
//             } catch (error) {
//                 console.error('Storage set error:', error);
//             }
//         }

//         static get(key) {
//             try {
//                 const item = localStorage.getItem(`viehistory_${key}`);
//                 return item ? JSON.parse(item) : null;
//             } catch (error) {
//                 console.error('Storage get error:', error);
//                 return null;
//             }
//         }

//         static remove(key) {
//             localStorage.removeItem(`viehistory_${key}`);
//         }

//         static getCart() {
//             return this.get('cart') || [];
//         }

//         static addToCart(product) {
//             const cart = this.getCart();
//             cart.push(product);
//             this.set('cart', cart);
//         }

//         static removeFromCart(productId) {
//             const cart = this.getCart();
//             const filtered = cart.filter(item => item.id !== productId);
//             this.set('cart', filtered);
//         }
//     }

//     // ==================== ADMIN POSTS MANAGER ====================

//     class AdminPostsManager {
//         static async loadPosts() {
//             try {
//                 const snapshot = await db.collection('forum_posts').orderBy('createdAt', 'desc').get();
//                 const postsTable = document.getElementById('postsTable');
//                 if (!postsTable) return;

//                 postsTable.innerHTML = '';

//                 snapshot.forEach(doc => {
//                     const post = doc.data();
//                     const row = `
//                         <tr>
//                             <td>${doc.id}</td>
//                             <td>${post.title}</td>
//                             <td>${post.author}</td>
//                             <td>${post.category}</td>
//                             <td>${new Date(post.createdAt.toDate()).toLocaleDateString()}</td>
//                             <td>
//                                 <span class="badge bg-${post.status === 'published' ? 'success' : 'warning'}">
//                                     ${post.status === 'published' ? 'Đã xuất bản' : 'Nháp'}
//                                 </span>
//                             </td>
//                             <td>
//                                 <button class="btn btn-sm btn-outline-primary" onclick="VieHistory.AdminPosts.editPost('${doc.id}')">
//                                     <i class="fas fa-edit"></i>
//                                 </button>
//                                 <button class="btn btn-sm btn-outline-danger" onclick="VieHistory.AdminPosts.deletePost('${doc.id}')">
//                                     <i class="fas fa-trash"></i>
//                                 </button>
//                             </td>
//                         </tr>
//                     `;
//                     postsTable.innerHTML += row;
//                 });
//             } catch (error) {
//                 console.error('Error loading posts:', error);
//             }
//         }

//         static async savePost() {
//             const title = document.getElementById('postTitle').value;
//             const content = document.getElementById('postContent').value;
//             const category = document.getElementById('postCategory').value;

//             try {
//                 await db.collection('forum_posts').add({
//                     title: title,
//                     content: content,
//                     category: category,
//                     author: 'Admin',
//                     createdAt: firebase.firestore.FieldValue.serverTimestamp(),
//                     status: 'published',
//                     views: 0,
//                     votes: 0
//                 });

//                 // Close modal and reload
//                 const modal = bootstrap.Modal.getInstance(document.getElementById('addPostModal'));
//                 modal.hide();
//                 this.loadPosts();

//                 alert('Thêm bài viết thành công!');
//             } catch (error) {
//                 console.error('Error adding post:', error);
//                 alert('Có lỗi xảy ra!');
//             }
//         }

//         static async deletePost(id) {
//             if (confirm('Bạn có chắc muốn xóa bài viết này?')) {
//                 try {
//                     await db.collection('forum_posts').doc(id).delete();
//                     this.loadPosts();
//                     alert('Xóa thành công!');
//                 } catch (error) {
//                     console.error('Error deleting post:', error);
//                 }
//             }
//         }
//     }

//     // ==================== MAIN APPLICATION ====================

//     class VieHistoryApp {
//         // Lesson data
//         static lessons = [
//             { title: "Thánh Gióng", img: "https://images.unsplash.com/photo-1506744038136-46273834b3fb", topic: "legend", link: "trial.html" },
//             { title: "Sơn Tinh Thủy Tinh", img: "https://images.unsplash.com/photo-1465101046530-73398c7f28ca", topic: "legend", link: "#" },
//             { title: "Hai Bà Trưng", img: "https://images.unsplash.com/photo-1519125323398-675f0ddb6308", topic: "hero", link: "#" },
//             { title: "Lý Thường Kiệt", img: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e", topic: "hero", link: "#" },
//             { title: "Trần Hưng Đạo", img: "https://images.unsplash.com/photo-1519985176271-adb1088fa94c", topic: "hero", link: "#" }
//         ];

//         static initializeSearch() {
//             const searchInput = document.getElementById('searchInput');
//             if (!searchInput) return;

//             const mainGrid = document.querySelector('.col-lg-9');
//             if (!mainGrid) return;

//             const allSections = Array.from(mainGrid.querySelectorAll('section'));

//             searchInput.addEventListener('input', function () {
//                 const keyword = normalize(this.value.trim());

//                 if (!keyword) {
//                     allSections.forEach(section => section.style.display = '');
//                     allSections.forEach(section => {
//                         section.querySelectorAll('.card').forEach(card => card.parentElement.style.display = '');
//                     });
//                     return;
//                 }

//                 allSections.forEach(section => {
//                     let hasMatch = false;
//                     section.querySelectorAll('.card').forEach(card => {
//                         const text = normalize(card.innerText);
//                         if (text.includes(keyword)) {
//                             card.parentElement.style.display = '';
//                             hasMatch = true;
//                         } else {
//                             card.parentElement.style.display = 'none';
//                         }
//                     });
//                     section.style.display = hasMatch ? '' : 'none';
//                 });
//             });
//         }

//         static initializeCopyButtons() {
//             // Copy email button
//             const copyEmailBtn = document.getElementById('copyEmailBtn');
//             const demoEmail = document.getElementById('demoEmail');

//             if (copyEmailBtn && demoEmail) {
//                 copyEmailBtn.addEventListener('click', function () {
//                     const emailText = demoEmail.textContent;
//                     navigator.clipboard.writeText(emailText).then(() => {
//                         copyEmailBtn.classList.remove('ri-file-copy-line');
//                         copyEmailBtn.classList.add('ri-check-double-line');

//                         setTimeout(() => {
//                             copyEmailBtn.classList.remove('ri-check-double-line');
//                             copyEmailBtn.classList.add('ri-file-copy-line');
//                         }, 1000);
//                     }).catch(err => {
//                         console.error('Could not copy text: ', err);
//                         // Fallback for older browsers
//                         this.fallbackCopyTextToClipboard(emailText);
//                     });
//                 });
//             }

//             // Copy password button
//             const copyPasswordBtn = document.getElementById('copyPasswordBtn');
//             const demoPassword = document.getElementById('demoPassword');

//             if (copyPasswordBtn && demoPassword) {
//                 copyPasswordBtn.addEventListener('click', function () {
//                     const passwordText = demoPassword.textContent;
//                     navigator.clipboard.writeText(passwordText).then(() => {
//                         copyPasswordBtn.classList.remove('ri-file-copy-line');
//                         copyPasswordBtn.classList.add('ri-check-double-line');

//                         setTimeout(() => {
//                             copyPasswordBtn.classList.remove('ri-check-double-line');
//                             copyPasswordBtn.classList.add('ri-file-copy-line');
//                         }, 1000);
//                     }).catch(err => {
//                         console.error('Could not copy text: ', err);
//                         this.fallbackCopyTextToClipboard(passwordText);
//                     });
//                 });
//             }
//         }

//         static fallbackCopyTextToClipboard(text) {
//             const textArea = document.createElement("textarea");
//             textArea.value = text;

//             // Avoid scrolling to bottom
//             textArea.style.top = "0";
//             textArea.style.left = "0";
//             textArea.style.position = "fixed";

//             document.body.appendChild(textArea);
//             textArea.focus();
//             textArea.select();

//             try {
//                 const successful = document.execCommand('copy');
//                 if (successful) {
//                     console.log('Fallback: Copying text command was successful');
//                 } else {
//                     console.log('Fallback: Unable to copy');
//                 }
//             } catch (err) {
//                 console.error('Fallback: Unable to copy', err);
//             }

//             document.body.removeChild(textArea);
//         }


//         static initializeQuizForms() {
//             const quizForm = document.getElementById('quizForm');
//             if (!quizForm) return;

//             quizForm.onsubmit = function (e) {
//                 e.preventDefault();

//                 const answer = document.querySelector('input[name="answer"]:checked');
//                 const result = document.getElementById('quizResult');

//                 if (!answer) {
//                     result.innerHTML = '<span class="text-danger">Vui lòng chọn đáp án!</span>';
//                     return;
//                 }

//                 if (answer.value === 'A') {
//                     result.innerHTML = '<span class="text-success">Chính xác! Thánh Gióng đã đánh đuổi giặc Ân 🎉</span>';
//                 } else {
//                     result.innerHTML = '<span class="text-danger">Chưa đúng, hãy thử lại!</span>';
//                 }
//             };
//         }

//         static initializeLessonFilters() {
//             const lessonList = document.getElementById('lessonList');
//             const filter = document.getElementById('filter');

//             if (!lessonList || !filter) return;

//             this.renderLessons('all');
//             filter.onchange = () => this.renderLessons(filter.value);
//         }

//         static renderLessons(topic) {
//             const lessonList = document.getElementById('lessonList');
//             if (!lessonList) return;

//             lessonList.innerHTML = '';

//             this.lessons.filter(l => topic === 'all' || l.topic === topic).forEach(l => {
//                 lessonList.innerHTML += `
//                     <div class="col-md-4 mb-4">
//                         <div class="card h-100">
//                             <img src="${l.img}" class="card-img-top" alt="${l.title}">
//                             <div class="card-body">
//                                 <h5 class="card-title">${l.title}</h5>
//                                 <a href="${l.link}" class="btn btn-primary">Xem bài học</a>
//                             </div>
//                         </div>
//                     </div>
//                 `;
//             });
//         }

//         // Trong VieHistoryApp class:

//         static initializeLoginForm() {
//             const loginForm = document.getElementById('loginForm');
//             if (!loginForm) return;

//             loginForm.onsubmit = async function (e) {
//                 e.preventDefault();

//                 const email = document.getElementById('email').value.trim();
//                 const password = document.getElementById('password').value.trim();
//                 const result = document.getElementById('loginResult');
//                 const submitBtn = loginForm.querySelector('button[type="submit"]');

//                 // Validation
//                 if (!FormValidator.validateEmail(email)) {
//                     result.innerHTML = '<span class="text-danger">Email không hợp lệ!</span>';
//                     return;
//                 }

//                 if (!FormValidator.validatePassword(password)) {
//                     result.innerHTML = '<span class="text-danger">Mật khẩu phải có ít nhất 6 ký tự!</span>';
//                     return;
//                 }

//                 // Show loading state
//                 const originalText = submitBtn.textContent;
//                 submitBtn.disabled = true;
//                 submitBtn.textContent = 'Đang đăng nhập...';
//                 result.innerHTML = '<span class="text-info">Đang xác thực...</span>';

//                 try {

// // Demo login check first
//             if (email === "test@example.com" && password === "123456") {
//                 result.innerHTML = '<span class="text-success">Đăng nhập thành công! Đang chuyển hướng...</span>';
                
//                 // Force reload để refresh auth state
//                 setTimeout(() => {
//                     window.location.href = "/";
//                 }, 1200);
//                 return;
//             }

//                     // Firebase authentication
//                     const userCredential = await auth.signInWithEmailAndPassword(email, password);
//                     const user = userCredential.user;

//                     // Check if user profile exists
//                     const userDoc = await db.collection('users').doc(user.uid).get();

//                     if (!userDoc.exists) {
//                         // Create user profile if not exists
//                         await AuthManager.createUserProfile(user.uid, {
//                             name: user.displayName || email.split('@')[0],
//                             email: user.email,
//                             role: 'user'
//                         });
//                     }

//                     result.innerHTML = '<span class="text-success">Đăng nhập thành công! Đang chuyển hướng...</span>';

//                     // Redirect to home page
//                     setTimeout(() => {
//                         window.location.href = '/';
//                     }, 1500);

//                 } catch (error) {
//                     console.error('Login error:', error);

//                     // Handle different error cases
//                     let errorMessage = 'Đăng nhập thất bại!';

//                     switch (error.code) {
//                         case 'auth/user-not-found':
//                             errorMessage = 'Tài khoản không tồn tại!';
//                             break;
//                         case 'auth/wrong-password':
//                             errorMessage = 'Sai mật khẩu!';
//                             break;
//                         case 'auth/invalid-email':
//                             errorMessage = 'Email không hợp lệ!';
//                             break;
//                         case 'auth/user-disabled':
//                             errorMessage = 'Tài khoản đã bị khóa!';
//                             break;
//                         case 'auth/too-many-requests':
//                             errorMessage = 'Quá nhiều lần thử. Vui lòng thử lại sau!';
//                             break;
//                         default:
//                             errorMessage = `Lỗi: ${error.message}`;
//                     }

//                     result.innerHTML = `<span class="text-danger">${errorMessage}</span>`;

//                 } finally {
//                     // Reset button state
//                     submitBtn.disabled = false;
//                     submitBtn.textContent = originalText;
//                 }
//             };
//         }
//         // Thêm method mới trong VieHistoryApp:

//         static initializeSignupForm() {
//             const signupForm = document.getElementById('signupForm');
//             if (!signupForm) return;

//             signupForm.onsubmit = async function (e) {
//                 e.preventDefault();

//                 const name = document.getElementById('name').value.trim();
//                 const email = document.getElementById('email').value.trim();
//                 const password = document.getElementById('password').value.trim();
//                 const confirmPassword = document.getElementById('confirmPassword').value.trim();
//                 const result = document.getElementById('signupResult');
//                 const submitBtn = signupForm.querySelector('button[type="submit"]');

//                 // Validation
//                 if (!FormValidator.validateRequired(name)) {
//                     result.innerHTML = '<span class="text-danger">Vui lòng nhập họ tên!</span>';
//                     return;
//                 }

//                 if (!FormValidator.validateEmail(email)) {
//                     result.innerHTML = '<span class="text-danger">Email không hợp lệ!</span>';
//                     return;
//                 }

//                 if (!FormValidator.validatePassword(password)) {
//                     result.innerHTML = '<span class="text-danger">Mật khẩu phải có ít nhất 6 ký tự!</span>';
//                     return;
//                 }

//                 if (password !== confirmPassword) {
//                     result.innerHTML = '<span class="text-danger">Mật khẩu xác nhận không khớp!</span>';
//                     return;
//                 }

//                 // Show loading state
//                 const originalText = submitBtn.textContent;
//                 submitBtn.disabled = true;
//                 submitBtn.textContent = 'Đang đăng ký...';
//                 result.innerHTML = '<span class="text-info">Đang tạo tài khoản...</span>';

//                 try {
//                     // Create Firebase user
//                     const userCredential = await auth.createUserWithEmailAndPassword(email, password);
//                     const user = userCredential.user;

//                     // Update display name
//                     await user.updateProfile({
//                         displayName: name
//                     });

//                     // Create user profile in Firestore
//                     await AuthManager.createUserProfile(user.uid, {
//                         name: name,
//                         email: email,
//                         role: 'user'
//                     });

//                     result.innerHTML = '<span class="text-success">Đăng ký thành công! Đang chuyển hướng...</span>';

//                     // Redirect to home
//                     setTimeout(() => {
//                         window.location.href = '/';
//                     }, 1500);

//                 } catch (error) {
//                     console.error('Signup error:', error);

//                     let errorMessage = 'Đăng ký thất bại!';

//                     switch (error.code) {
//                         case 'auth/email-already-in-use':
//                             errorMessage = 'Email đã được sử dụng!';
//                             break;
//                         case 'auth/invalid-email':
//                             errorMessage = 'Email không hợp lệ!';
//                             break;
//                         case 'auth/weak-password':
//                             errorMessage = 'Mật khẩu quá yếu!';
//                             break;
//                         default:
//                             errorMessage = `Lỗi: ${error.message}`;
//                     }

//                     result.innerHTML = `<span class="text-danger">${errorMessage}</span>`;

//                 } finally {
//                     // Reset button state
//                     submitBtn.disabled = false;
//                     submitBtn.textContent = originalText;
//                 }
//             };
//         }

//         static loadUserAuthState() {
//             // Check if Firebase auth is available
//             if (typeof firebase !== 'undefined' && firebase.auth) {
//                 firebase.auth().onAuthStateChanged(user => {
//                     if (user) {
//                         AuthMiddleware.showAdminElements();
//                     }
//                 });
//             }
//         }

//         static init() {
//             console.log('VieHistoryApp init started');
//             // Initialize Firebase first
//             initializeFirebase();

//             // Debug auth state
//         setTimeout(() => {
//             auth.onAuthStateChanged(user => {
//                 console.log('Auth state changed:', user ? 'User logged in' : 'User logged out');
//                 if (user) {
//                     console.log('User UID:', user.uid);
//                     console.log('User email:', user.email);
//                 }
//             });
//         }, 1000);


//             // Initialize URL protection
//             URLProtection.init();

//             // Initialize component loading
//             ComponentLoader.includeHTML();

//             // Initialize page-specific functionality - GỌI NGAY LẬP TỨC
//             this.initializeSearch();
//             this.initializeCopyButtons();          // ✅ Đảm bảo được gọi
//             this.initializeQuizForms();
//             this.initializeLessonFilters();
//             this.initializeLoginForm();            // ✅ Đảm bảo được gọi
//             this.initializeSignupForm();

//             // Initialize auth state monitoring
//             AuthStateManager.init();

//             // Initialize header
//             HeaderManager.init();
//         }
//     }

//     // ==================== GLOBAL NAMESPACE ====================

//     // Create global VieHistory namespace
//     window.VieHistory = {
//         App: VieHistoryApp,
//         Auth: AuthManager,
//         AuthMiddleware: AuthMiddleware,
//         AuthState: AuthStateManager,
//         URLProtection: URLProtection,
//         ComponentLoader: ComponentLoader,
//         FormValidator: FormValidator,
//         StorageManager: StorageManager,
//         HeaderManager: HeaderManager,
//         AdminPosts: AdminPostsManager,

//         // Utility functions
//         normalize: normalize,

//         // Initialize everything
//         init: function () {
//             VieHistoryApp.init();
//         }
//     };

//     // Auto-initialize when DOM is ready
//     if (document.readyState === 'loading') {
//         document.addEventListener('DOMContentLoaded', () => {
//             window.VieHistory.init();
//         });
//     } else {
//         window.VieHistory.init();
//     }

//     // ==================== LEGACY SUPPORT ====================

//     // Export functions for backward compatibility
//     window.includeHTML = ComponentLoader.includeHTML.bind(ComponentLoader);
//     window.getCurrentUserRole = AuthMiddleware.getCurrentUserRole.bind(AuthMiddleware);
//     window.requireAdmin = AuthMiddleware.requireAdmin.bind(AuthMiddleware);
//     window.loadUserInfo = HeaderManager.loadUserInfo.bind(HeaderManager);
//     window.savePost = AdminPostsManager.savePost.bind(AdminPostsManager);
//     window.deletePost = AdminPostsManager.deletePost.bind(AdminPostsManager);

// })(window);