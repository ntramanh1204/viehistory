// admin/js/admin-posts.js
// Kết nối Firebase (sử dụng config hiện tại)

const postsCollection = 'forum_posts';

// Load danh sách bài viết
async function loadPosts() {
    try {
        const snapshot = await db.collection(postsCollection).orderBy('createdAt', 'desc').get();
        const postsTable = document.getElementById('postsTable');
        postsTable.innerHTML = '';
        
        snapshot.forEach(doc => {
            const post = doc.data();
            const row = `
                <tr>
                    <td>${doc.id}</td>
                    <td>${post.title}</td>
                    <td>${post.author}</td>
                    <td>${post.category}</td>
                    <td>${new Date(post.createdAt.toDate()).toLocaleDateString()}</td>
                    <td>
                        <span class="badge bg-${post.status === 'published' ? 'success' : 'warning'}">
                            ${post.status === 'published' ? 'Đã xuất bản' : 'Nháp'}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="editPost('${doc.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deletePost('${doc.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            postsTable.innerHTML += row;
        });
    } catch (error) {
        console.error('Error loading posts:', error);
    }
}

// Thêm bài viết mới
async function savePost() {
    const title = document.getElementById('postTitle').value;
    const content = document.getElementById('postContent').value;
    const category = document.getElementById('postCategory').value;
    
    try {
        await db.collection(postsCollection).add({
            title: title,
            content: content,
            category: category,
            author: 'Admin',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'published',
            views: 0,
            votes: 0
        });
        
        // Đóng modal và reload
        const modal = bootstrap.Modal.getInstance(document.getElementById('addPostModal'));
        modal.hide();
        loadPosts();
        
        alert('Thêm bài viết thành công!');
    } catch (error) {
        console.error('Error adding post:', error);
        alert('Có lỗi xảy ra!');
    }
}

// Xóa bài viết
async function deletePost(id) {
    if (confirm('Bạn có chắc muốn xóa bài viết này?')) {
        try {
            await db.collection(postsCollection).doc(id).delete();
            loadPosts();
            alert('Xóa thành công!');
        } catch (error) {
            console.error('Error deleting post:', error);
        }
    }
}

// Load dữ liệu khi trang tải
document.addEventListener('DOMContentLoaded', loadPosts);