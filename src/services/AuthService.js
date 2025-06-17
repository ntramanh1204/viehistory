import { 
    signInAnonymously, 
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase.js';

export class AuthService {
    constructor() {
        this.currentUser = null;
        this.authStateListeners = [];
        this.isInitialized = false;
        
        this.init();
    }

    init() {
        // Listen for auth state changes
        onAuthStateChanged(auth, (user) => {
            this.currentUser = user;
            this.isInitialized = true;
            
            // Notify all listeners
            this.authStateListeners.forEach(callback => {
                callback(user);
            });
            
            console.log('🔐 Auth state changed:', user ? 'Signed in' : 'Signed out');
        });
    }

    /**
     * Add listener for auth state changes
     */
    onAuthStateChange(callback) {
        this.authStateListeners.push(callback);
        
        // If already initialized, call immediately
        if (this.isInitialized) {
            callback(this.currentUser);
        }
        
        // Return unsubscribe function
        return () => {
            const index = this.authStateListeners.indexOf(callback);
            if (index > -1) {
                this.authStateListeners.splice(index, 1);
            }
        };
    }

    /**
     * Sign in anonymously (for guests)
     */
    async signInAnonymously() {
        try {
            const result = await signInAnonymously(auth);
            const user = result.user;
            
            // Create user document if doesn't exist
            await this.createUserDocument(user, {
                isAnonymous: true,
                displayName: 'Người dùng ẩn danh'
            });
            
            console.log('✅ Signed in anonymously');
            return user;
        } catch (error) {
            console.error('❌ Anonymous sign in failed:', error);
            throw new Error('Không thể đăng nhập. Vui lòng thử lại.');
        }
    }

    /**
     * Sign in with email and password
     */
    async signInWithEmail(email, password) {
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            console.log('✅ Signed in with email');
            return result.user;
        } catch (error) {
            console.error('❌ Email sign in failed:', error);
            
            switch (error.code) {
                case 'auth/user-not-found':
                    throw new Error('Không tìm thấy tài khoản với email này.');
                case 'auth/wrong-password':
                    throw new Error('Mật khẩu không đúng.');
                case 'auth/invalid-email':
                    throw new Error('Email không hợp lệ.');
                case 'auth/too-many-requests':
                    throw new Error('Quá nhiều lần thử. Vui lòng thử lại sau.');
                default:
                    throw new Error('Đăng nhập thất bại. Vui lòng thử lại.');
            }
        }
    }

    /**
     * Create account with email and password
     */
    async createAccount(email, password, displayName) {
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);
            const user = result.user;
            
            // Update profile
            await updateProfile(user, {
                displayName: displayName
            });
            
            // Create user document
            await this.createUserDocument(user, {
                displayName: displayName,
                email: email,
                isAnonymous: false
            });
            
            console.log('✅ Account created successfully');
            return user;
        } catch (error) {
            console.error('❌ Account creation failed:', error);
            
            switch (error.code) {
                case 'auth/email-already-in-use':
                    throw new Error('Email này đã được sử dụng.');
                case 'auth/weak-password':
                    throw new Error('Mật khẩu quá yếu. Vui lòng chọn mật khẩu mạnh hơn.');
                case 'auth/invalid-email':
                    throw new Error('Email không hợp lệ.');
                default:
                    throw new Error('Không thể tạo tài khoản. Vui lòng thử lại.');
            }
        }
    }

    /**
     * Sign out
     */
    async signOut() {
        try {
            await signOut(auth);
            console.log('✅ Signed out successfully');
        } catch (error) {
            console.error('❌ Sign out failed:', error);
            throw new Error('Không thể đăng xuất. Vui lòng thử lại.');
        }
    }

    /**
     * Create or update user document in Firestore
     */
    async createUserDocument(user, additionalData = {}) {
        if (!user) return;
        
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
            // Create new user document
            const userData = {
                uid: user.uid,
                email: user.email,
                displayName: additionalData.displayName || user.displayName || 'User',
                photoURL: user.photoURL || null,
                isAnonymous: additionalData.isAnonymous || false,
                stats: {
                    postsCount: 0,
                    commentsCount: 0,
                    likesReceived: 0
                },
                preferences: {
                    theme: 'light',
                    notifications: true
                },
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                lastLoginAt: serverTimestamp(),
                ...additionalData
            };
            
            await setDoc(userRef, userData);
            console.log('✅ User document created');
        } else {
            // Update last login
            await setDoc(userRef, {
                lastLoginAt: serverTimestamp()
            }, { merge: true });
        }
    }

    /**
     * Get current user info
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Check if user is signed in
     */
    isSignedIn() {
        return !!this.currentUser;
    }

    /**
     * Check if user is anonymous
     */
    isAnonymous() {
        return this.currentUser?.isAnonymous || false;
    }

    /**
     * Get user display info for UI
     */
    getUserDisplayInfo() {
        if (!this.currentUser) {
            return {
                displayName: 'Guest',
                avatar: 'G',
                isSignedIn: false
            };
        }

        const displayName = this.currentUser.displayName || 
            (this.currentUser.isAnonymous ? 'Ẩn danh' : 'User');
        
        const avatar = displayName.charAt(0).toUpperCase();

        return {
            displayName,
            avatar,
            photoURL: this.currentUser.photoURL,
            isSignedIn: true,
            isAnonymous: this.currentUser.isAnonymous
        };
    }

    /**
     * Auto sign in anonymously if not signed in
     */
    async ensureSignedIn() {
        if (!this.isSignedIn()) {
            await this.signInAnonymously();
        }
        return this.currentUser;
    }
}

// Create singleton instance
export const authService = new AuthService();