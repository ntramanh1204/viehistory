// Your Firebase config
  const firebaseConfig = {
    apiKey: "[REMOVED]",
    authDomain: "viehistory-436c6.firebaseapp.com",
    projectId: "viehistory-436c6",
    storageBucket: "viehistory-436c6.firebasestorage.app",
    messagingSenderId: "348086067423",
    appId: "1:348086067423:web:86b3c0c0ffed29d2b9896a"
  };

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

// Set auth persistence
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(() => {
        console.log('✅ Firebase Auth initialized with LOCAL persistence');
    })
    .catch((error) => {
        console.error('❌ Error setting auth persistence:', error);
    });

// Export to global scope
window.auth = auth;
window.db = db;
window.FIREBASE_CONFIG = firebaseConfig;

console.log('✅ Firebase initialized successfully');

// {/* <script type="module"> */}
//   // Import the functions you need from the SDKs you need
// //   import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.0/firebase-app.js";
//   // TODO: Add SDKs for Firebase products that you want to use
//   // https://firebase.google.com/docs/web/setup#available-libraries

//   // Your web app's Firebase configuration
//   const firebaseConfig = {
//     apiKey: "[REMOVED]",
//     authDomain: "viehistory-436c6.firebaseapp.com",
//     projectId: "viehistory-436c6",
//     storageBucket: "viehistory-436c6.firebasestorage.app",
//     messagingSenderId: "348086067423",
//     appId: "1:348086067423:web:86b3c0c0ffed29d2b9896a"
//   };

//   // Initialize Firebase
//   firebase.initializeApp(firebaseConfig);
// //   const app = initializeApp(firebaseConfig);
// {/* </script> */}

// const db = firebase.firestore();

// // Sử dụng
// // Thêm bài viết
// await db.collection('forum_posts').add({
//   title: "Tiêu đề",
//   content: "Nội dung",
//   createdAt: firebase.firestore.FieldValue.serverTimestamp()
// });

// // Lấy danh sách
// const snapshot = await db.collection('forum_posts').get();
// snapshot.forEach(doc => {
//   console.log(doc.data());
// });

// // Set auth persistence
// auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
//   .then(() => {
//     console.log('Auth persistence set to LOCAL');
//   })
//   .catch((error) => {
//     console.error('Error setting auth persistence:', error);
//   });

// // Export auth state
// window.auth = auth;
// window.db = db;

// // Có thể export nếu bạn dùng module, hoặc gán vào window nếu dùng script tag
// window.FIREBASE_CONFIG = firebaseConfig;