document.addEventListener('DOMContentLoaded', function() {
    const dropdowns = document.querySelectorAll('.nav-item.dropdown');
    
    dropdowns.forEach(dropdown => {
        const link = dropdown.querySelector('.nav-link');
        
        // Mobile: toggle on click
        if (window.innerWidth <= 768) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                dropdown.classList.toggle('show');
            });
        }
        
    });
});