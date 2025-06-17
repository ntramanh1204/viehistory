// Onboarding functionality
export class OnboardingManager {
    constructor() {
        this.modal = document.getElementById('onboarding-modal');
    }

    init() {
        if (!localStorage.getItem('onboarded')) {
            this.showModal();
        }
    }

    showModal() {
        this.modal.style.display = 'flex';
        this.modal.classList.add('active');
    }

    hideModal() {
        this.modal.classList.remove('active');
        setTimeout(() => {
            this.modal.style.display = 'none';
        }, 300);
    }

    startApp() {
        localStorage.setItem('onboarded', 'true');
        this.hideModal();
    }
}

// Global function for onclick
window.startApp = () => {
    const onboarding = new OnboardingManager();
    onboarding.startApp();
};