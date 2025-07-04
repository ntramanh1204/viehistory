# VieHistory

Một dự án nhỏ để chia sẻ và thảo luận về lịch sử Việt Nam.

## 🌟 Tầm nhìn
Tạo ra không gian để những người yêu thích lịch sử có thể chia sẻ kiến thức và học hỏi lẫn nhau.

## ✨ Tính năng

- 📝 **Timeline lịch sử**: Đăng bài, chia sẻ câu chuyện và sự kiện lịch sử
- 💬 **Thảo luận cộng đồng**: Bình luận, like và tương tác với bài viết
- 📱 **Blog**: Viết và chia sẻ bài viết dài với editor và upload ảnh  
- 🔐 **Hệ thống tài khoản**: Đăng ký/đăng nhập với Firebase
- 🎨 **Giao diện**: Responsive, dark/light mode

## 🛠️ Công nghệ

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Firebase (Firestore, Auth)
- **Image Storage**: Cloudinary
- **Build Tool**: Vite

## 🚀 Cài đặt

```bash
# Clone và cài đặt
git clone https://github.com/ntramanh1204/viehistory.git
cd viehistory
npm install

# Tạo file .env với cấu hình:
# Firebase config
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Cloudinary config
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset

# Chạy dev server
npm run dev
```

---

> *"Chạm vào quá khứ – Xây dựng tương lai"*

**Phiên bản**: v2.0.0 (Beta)