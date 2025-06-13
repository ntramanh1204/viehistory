// assets/js/auth-middleware.js
// Kiểm tra role của user hiện tại
async function getCurrentUserRole() {
    const user = firebase.auth().currentUser;
    if (!user) return null;
    
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        return userDoc.exists ? userDoc.data().role : 'user';
    } catch (error) {
        console.error('Error getting user role:', error);
        return 'user';
    }
}

// Middleware bảo vệ trang admin
async function requireAdmin() {
    const role = await getCurrentUserRole();
    if (role !== 'admin') {
        alert('Bạn không có quyền truy cập trang này!');
        window.location.href = '/home.html';
        return false;
    }
    return true;
}

// Ẩn/hiện elements dựa trên role
async function hideElementsForUser() {
    const role = await getCurrentUserRole();
    
    // Ẩn menu admin trong sidebar
    const adminMenus = document.querySelectorAll('.admin-only');
    adminMenus.forEach(menu => {
        if (role !== 'admin') {
            menu.style.display = 'none';
        }
    });
}