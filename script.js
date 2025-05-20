document.addEventListener('DOMContentLoaded', function () {
    const quizForm = document.getElementById('quizForm');
    if (quizForm) {
        quizForm.onsubmit = function (e) {
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
});

const lessons = [
    { title: "Thánh Gióng", img: "https://images.unsplash.com/photo-1506744038136-46273834b3fb", topic: "legend", link: "trial.html" },
    { title: "Sơn Tinh Thủy Tinh", img: "https://images.unsplash.com/photo-1465101046530-73398c7f28ca", topic: "legend", link: "#" },
    { title: "Hai Bà Trưng", img: "https://images.unsplash.com/photo-1519125323398-675f0ddb6308", topic: "hero", link: "#" },
    { title: "Lý Thường Kiệt", img: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e", topic: "hero", link: "#" },
    { title: "Trần Hưng Đạo", img: "https://images.unsplash.com/photo-1519985176271-adb1088fa94c", topic: "hero", link: "#" }
];
document.addEventListener('DOMContentLoaded', function () {
    const lessonList = document.getElementById('lessonList');
    const filter = document.getElementById('filter');
    if (lessonList && filter) {
        function renderLessons(topic) {
            lessonList.innerHTML = '';
            lessons.filter(l => topic === 'all' || l.topic === topic).forEach(l => {
                lessonList.innerHTML += `
                <div class="col-md-4 mb-4">
                    <div class="card h-100">
                        <img src="${l.img}" class="card-img-top" alt="${l.title}">
                        <div class="card-body">
                            <h5 class="card-title">${l.title}</h5>
                            <a href="${l.link}" class="btn btn-primary">Xem bài học</a>
                        </div>
                    </div>
                </div>`;
            });
        }
        renderLessons('all');
        filter.onchange = () => renderLessons(filter.value);
    }
});

document.addEventListener('DOMContentLoaded', function () {
    const copyBtn = document.getElementById('copyEmailBtn');
    const emailText = document.getElementById('demoEmail').textContent;
    copyBtn.addEventListener('click', function () {
        copyBtn.classList.remove('ri-file-copy-line');
        copyBtn.classList.add('ri-check-double-line');
        navigator.clipboard.writeText(emailText).then(function () {
            setTimeout(() => {
                copyBtn.classList.remove('ri-check-double-line');
                copyBtn.classList.add('ri-file-copy-line');
            }, 1000);
        });
    });
});

document.getElementById('loginForm').onsubmit = function (e) {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const result = document.getElementById('loginResult');
    if (email === "test@example.com" && password === "123456") {
        result.innerHTML = '<span class="text-success">Đăng nhập thành công! Đang chuyển hướng...</span>';
        setTimeout(() => window.location.href = "home.html", 1200);
    } else {
        result.innerHTML = '<span class="text-danger">Sai email hoặc mật khẩu mẫu!</span>';
    }
}

document.addEventListener('DOMContentLoaded', function () {
    // Copy email
    const copyBtn = document.getElementById('copyEmailBtn');
    const emailText = document.getElementById('demoEmail').textContent;
    copyBtn.addEventListener('click', function () {
        copyBtn.classList.remove('ri-file-copy-line');
        copyBtn.classList.add('ri-check-double-line');
        navigator.clipboard.writeText(emailText).then(function () {
            setTimeout(() => {
                copyBtn.classList.remove('ri-check-double-line');
                copyBtn.classList.add('ri-file-copy-line');
            }, 1000);
        });
    });

    // Copy password
    const copyPassBtn = document.getElementById('copyPasswordBtn');
    const passText = document.getElementById('demoPassword').textContent;
    copyPassBtn.addEventListener('click', function () {
        copyPassBtn.classList.remove('ri-file-copy-line');
        copyPassBtn.classList.add('ri-check-double-line');
        navigator.clipboard.writeText(passText).then(function () {
            setTimeout(() => {
                copyPassBtn.classList.remove('ri-check-double-line');
                copyPassBtn.classList.add('ri-file-copy-line');
            }, 1000);
        });
    });
});