// assets/js/auth.js
// Thêm thông tin user khi đăng ký
async function createUserProfile(uid, userData) {
    try {
        await db.collection('users').doc(uid).set({
            name: userData.name,
            email: userData.email,
            role: userData.role || 'user', // 'user' hoặc 'admin'
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            isActive: true
        });
    } catch (error) {
        console.error('Error creating user profile:', error);
    }
}