// DOM elements
const userName = document.getElementById('user-name');
const profilePic = document.getElementById('profile-pic');
const profilePreview = document.getElementById('profile-preview');
const profileUploadBtn = document.getElementById('upload-btn');
const profileUploadInput = document.getElementById('profile-upload');
const profileImageContainer = document.querySelector('.profile-image-container');
const displayNameInput = document.getElementById('display-name');
const profileForm = document.getElementById('profile-form');
const logoutBtn = document.getElementById('logout-btn');
const errorMessage = document.getElementById('error-message');
const successMessage = document.getElementById('success-message');

// Default avatar fallback
const defaultAvatar = "https://ui-avatars.com/api/?name=User&background=random";

// Current user data
let currentUser = null;
let profileImageFile = null;

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication state
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            // User is signed in
            currentUser = user;
            
            // Update profile info in the header
            userName.textContent = user.displayName || 'User';
            
            if (user.photoURL) {
                profilePic.src = user.photoURL;
                profilePreview.src = user.photoURL;
            } else {
                const nameForAvatar = user.displayName || 'User';
                profilePic.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nameForAvatar)}&background=random`;
                profilePreview.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nameForAvatar)}&background=random`;
            }
            
            // Fill in the form with current values
            displayNameInput.value = user.displayName || '';
            
            // Get additional user data from Firestore
            firebase.firestore().collection('users').doc(user.uid).get()
                .then((doc) => {
                    if (doc.exists) {
                        const userData = doc.data();
                        
                        // Update form with additional data if needed
                        if (!user.displayName && userData.name) {
                            displayNameInput.value = userData.name;
                        }
                    }
                })
                .catch((error) => {
                    console.error('Error getting user data:', error);
                    errorMessage.textContent = 'Error loading user data. Please try again.';
                });
        } else {
            // No user is signed in, redirect to login page
            window.location.href = 'index.html';
        }
    });
    
    // Profile image upload button click handler
    profileUploadBtn.addEventListener('click', () => {
        profileUploadInput.click();
    });
    
    // Profile image container click handler (alternative trigger for file input)
    profileImageContainer.addEventListener('click', () => {
        profileUploadInput.click();
    });
    
    // File input change handler
    profileUploadInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            
            // Check if file is an image
            if (!file.type.match('image.*')) {
                errorMessage.textContent = 'Please select an image file (JPG, PNG, GIF).';
                return;
            }
            
            // Check file size (limit to 2MB)
            if (file.size > 2 * 1024 * 1024) {
                errorMessage.textContent = 'Image size should be less than 2MB.';
                return;
            }
            
            // Clear previous error message
            errorMessage.textContent = '';
            
            // Save the file for later upload
            profileImageFile = file;
            
            // Preview the image
            const reader = new FileReader();
            reader.onload = function(event) {
                profilePreview.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Profile form submit handler
    profileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Clear messages
        errorMessage.textContent = '';
        successMessage.textContent = '';
        
        const newDisplayName = displayNameInput.value.trim();
        
        // Validate input
        if (!newDisplayName) {
            errorMessage.textContent = 'Display name cannot be empty.';
            return;
        }
        
        // Disable the submit button to prevent multiple submissions
        const submitButton = profileForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Saving...';
        
        // Start with a promise that resolves immediately
        let updatePromise = Promise.resolve();
        
        // If there's a profile image to upload
        if (profileImageFile) {
            // Create a storage reference
            const storageRef = firebase.storage().ref();
            const profileImageRef = storageRef.child(`profile-images/${currentUser.uid}`);
            
            // Upload the file
            updatePromise = profileImageRef.put(profileImageFile)
                .then(snapshot => snapshot.ref.getDownloadURL())
                .then(downloadURL => {
                    // Update user profile with the image URL
                    return currentUser.updateProfile({
                        photoURL: downloadURL
                    });
                })
                .then(() => {
                    // Update profile image in the header
                    profilePic.src = currentUser.photoURL;
                    
                    // Clear the file input for next time
                    profileUploadInput.value = '';
                    profileImageFile = null;
                });
        }
        
        // After handling the image (if any), update the display name
        updatePromise
            .then(() => {
                // Update display name if it has changed
                if (newDisplayName !== currentUser.displayName) {
                    return currentUser.updateProfile({
                        displayName: newDisplayName
                    });
                }
                return Promise.resolve();
            })
            .then(() => {
                // Update Firestore document - Use set with merge option instead of update
                // This will create the document if it doesn't exist
                return firebase.firestore().collection('users').doc(currentUser.uid).set({
                    name: newDisplayName,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            })
            .then(() => {
                // Update name in the header
                userName.textContent = newDisplayName;
                
                // Show success message
                successMessage.textContent = 'Profile updated successfully!';
                
                // Re-enable the submit button
                submitButton.disabled = false;
                submitButton.textContent = 'Save Changes';
                
                // Store the updated name in session storage
                sessionStorage.setItem('userName', newDisplayName);
            })
            .catch((error) => {
                // Handle errors
                console.error('Error updating profile:', error);
                
                if (error.code === 'not-found') {
                    // Document doesn't exist, let's create it
                    return firebase.firestore().collection('users').doc(currentUser.uid).set({
                        name: newDisplayName,
                        email: currentUser.email,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    }).then(() => {
                        // Update name in the header
                        userName.textContent = newDisplayName;
                        
                        // Show success message
                        successMessage.textContent = 'Profile created successfully!';
                        
                        // Re-enable the submit button
                        submitButton.disabled = false;
                        submitButton.textContent = 'Save Changes';
                        
                        // Store the updated name in session storage
                        sessionStorage.setItem('userName', newDisplayName);
                    });
                } else {
                    errorMessage.textContent = 'Error updating profile. Please try again.';
                    
                    // Re-enable the submit button
                    submitButton.disabled = false;
                    submitButton.textContent = 'Save Changes';
                }
            });
    });
    
    // Logout event handler
    logoutBtn.addEventListener('click', () => {
        // Clear session storage on logout
        sessionStorage.removeItem('userName');
        
        firebase.auth().signOut()
            .then(() => {
                // Sign-out successful, redirect to login page
                window.location.href = 'index.html';
            })
            .catch((error) => {
                // An error happened
                console.error('Logout error:', error);
                errorMessage.textContent = 'Error signing out. Please try again.';
            });
    });
}); 