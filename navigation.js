// DOM elements
const navItems = document.querySelectorAll('.nav-item');

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add click event listeners to navigation items
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Get the page to navigate to
            const page = item.getAttribute('data-page');
            
            // Only navigate if it's not the current page
            if (!item.classList.contains('active') && page) {
                window.location.href = page;
            }
        });
    });
}); 