export class OnboardingManager {
    constructor() {
        this.modal = document.getElementById('onboarding-modal');
        this.startBtn = document.getElementById('onboarding-start-btn');
    }

    init() {
        // Setup event listener for start button
        this.startBtn?.addEventListener('click', () => {
            this.startApp();
        });
        
        if (!localStorage.getItem('onboarded')) {
            this.showModal();
        }
    }

    showModal() {
        if (this.modal) {
            this.modal.style.display = 'flex';
            this.modal.classList.add('active');
        }
    }

    hideModal() {
        if (this.modal) {
            this.modal.classList.remove('active');
            setTimeout(() => {
                this.modal.style.display = 'none';
            }, 300);
        }
    }

    startApp() {
        localStorage.setItem('onboarded', 'true');
        this.hideModal();
    }
}