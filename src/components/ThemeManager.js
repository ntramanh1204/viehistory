// Theme switching functionality
export class ThemeManager {
    constructor() {
        this.body = document.body;
        this.currentTheme = localStorage.getItem('theme');
    }

    init() {
        // Apply saved theme
        if (this.currentTheme === 'dark') {
            this.body.classList.add('dark-theme');
        }

        // Setup theme toggle (if button exists)
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
    }

    toggleTheme() {
        this.body.classList.toggle('dark-theme');
        
        if (this.body.classList.contains('dark-theme')) {
            localStorage.setItem('theme', 'dark');
        } else {
            localStorage.removeItem('theme');
        }
    }

    setTheme(theme) {
        if (theme === 'dark') {
            this.body.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark');
        } else {
            this.body.classList.remove('dark-theme');
            localStorage.removeItem('theme');
        }
    }
}