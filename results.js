// DOM elements
const userName = document.getElementById('user-name');
const profilePic = document.getElementById('profile-pic');
const resultsContainer = document.getElementById('results-container');

// Default avatar fallback
const defaultAvatar = "https://ui-avatars.com/api/?name=User&background=random";

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication state
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            // User is signed in
            // Update profile info
            userName.textContent = user.displayName || 'User';
            
            if (user.photoURL) {
                profilePic.src = user.photoURL;
            } else {
                const nameForAvatar = user.displayName || 'User';
                profilePic.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nameForAvatar)}&background=random`;
            }
            
            // Load results (placeholder for now)
            loadResults(user.uid);
        } else {
            // No user is signed in, redirect to login page
            window.location.href = 'index.html';
        }
    });
});

// Function to load results
function loadResults(userId) {
    // This is a placeholder - in a real app, you would fetch the results from Firestore
    
    // For now, we'll just display a message
    setTimeout(() => {
        resultsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-trophy" style="font-size: 50px; color: #ccc; margin-bottom: 20px;"></i>
                <h3>No Results Yet</h3>
                <p>There are no tournament results to display yet.</p>
            </div>
        `;
    }, 1500); // Simulate loading time
} 