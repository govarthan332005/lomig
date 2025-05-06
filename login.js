// DOM elements
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('error-message');

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            // User is signed in, redirect to main page
            window.location.href = 'main.html';
        }
    });

    // Form submit event listener
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Clear previous error message
        errorMessage.textContent = '';
        
        // Get input values
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        // Validate inputs
        if (!email || !password) {
            errorMessage.textContent = 'Please fill in all fields';
            return;
        }
        
        // Sign in with Firebase
        firebase.auth().signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Signed in
                window.location.href = 'main.html';
            })
            .catch((error) => {
                // Handle errors
                const errorCode = error.code;
                
                switch (errorCode) {
                    case 'auth/user-not-found':
                    case 'auth/wrong-password':
                        errorMessage.textContent = 'Invalid email or password';
                        break;
                    case 'auth/invalid-email':
                        errorMessage.textContent = 'Invalid email format';
                        break;
                    case 'auth/too-many-requests':
                        errorMessage.textContent = 'Too many failed login attempts. Please try again later';
                        break;
                    default:
                        errorMessage.textContent = 'Error signing in. Please try again';
                }
                
                console.error('Login error:', error);
            });
    });
}); 