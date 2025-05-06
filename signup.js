// DOM elements
const signupForm = document.getElementById('signup-form');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirm-password');
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
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Clear previous error message
        errorMessage.textContent = '';
        
        // Get input values
        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        // Validate inputs
        if (!name || !email || !password || !confirmPassword) {
            errorMessage.textContent = 'Please fill in all fields';
            return;
        }
        
        // Validate password match
        if (password !== confirmPassword) {
            errorMessage.textContent = 'Passwords do not match';
            return;
        }
        
        // Validate password strength (minimum 6 characters)
        if (password.length < 6) {
            errorMessage.textContent = 'Password should be at least 6 characters';
            return;
        }
        
        // Disable the submit button to prevent multiple submissions
        const submitButton = signupForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        
        // Create user with Firebase
        firebase.auth().createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // User created
                const user = userCredential.user;
                
                // Store user data in session storage temporarily to ensure it's available immediately
                sessionStorage.setItem('userName', name);
                
                // Update user profile
                return user.updateProfile({
                    displayName: name
                }).then(() => {
                    // Save additional user data in Firestore
                    return firebase.firestore().collection('users').doc(user.uid).set({
                        name: name,
                        email: email,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                });
            })
            .then(() => {
                // Force a refresh of the auth token to ensure updated profile data is available
                return firebase.auth().currentUser.getIdToken(true);
            })
            .then(() => {
                // Double-check that user data is in Firestore
                const currentUser = firebase.auth().currentUser;
                return firebase.firestore().collection('users').doc(currentUser.uid).get()
                    .then((doc) => {
                        if (!doc.exists) {
                            // If document doesn't exist for some reason, create it again
                            return firebase.firestore().collection('users').doc(currentUser.uid).set({
                                name: currentUser.displayName || nameInput.value.trim(),
                                email: currentUser.email,
                                createdAt: firebase.firestore.FieldValue.serverTimestamp()
                            });
                        }
                        return Promise.resolve();
                    });
            })
            .then(() => {
                // Registration complete, redirect to main page
                window.location.href = 'main.html';
            })
            .catch((error) => {
                // Re-enable the submit button if there's an error
                submitButton.disabled = false;
                
                // Handle errors
                const errorCode = error.code;
                
                switch (errorCode) {
                    case 'auth/email-already-in-use':
                        errorMessage.textContent = 'Email is already in use';
                        break;
                    case 'auth/invalid-email':
                        errorMessage.textContent = 'Invalid email format';
                        break;
                    case 'auth/weak-password':
                        errorMessage.textContent = 'Password is too weak';
                        break;
                    default:
                        errorMessage.textContent = 'Error creating account. Please try again';
                }
                
                console.error('Signup error:', error);
            });
    });
}); 