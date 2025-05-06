// DOM elements
const userName = document.getElementById('user-name');
const profilePic = document.getElementById('profile-pic');
const tournamentTitle = document.getElementById('tournament-title');
const tournamentMatchId = document.getElementById('tournament-match-id');
const tournamentDateTime = document.getElementById('tournament-date-time');
const tournamentFee = document.getElementById('tournament-fee');
const playerNameInput = document.getElementById('player-name');
const gameUidInput = document.getElementById('game-uid');
const gameNameInput = document.getElementById('game-name');
const mobileNumberInput = document.getElementById('mobile-number');
const registrationForm = document.getElementById('registration-form');
const errorMessage = document.getElementById('error-message');
const successMessage = document.getElementById('success-message');

// Default avatar fallback
const defaultAvatar = "https://ui-avatars.com/api/?name=User&background=random";

// Tournament data
let tournament = null;
let currentUser = null;

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication state
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            // User is signed in
            currentUser = user;
            
            // Update profile info
            userName.textContent = user.displayName || 'User';
            
            if (user.photoURL) {
                profilePic.src = user.photoURL;
            } else {
                const nameForAvatar = user.displayName || 'User';
                profilePic.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nameForAvatar)}&background=random`;
            }
            
            // Pre-fill player name with user's display name
            playerNameInput.value = user.displayName || '';
            
            // Load user data from Firestore
            firebase.firestore().collection('users').doc(user.uid).get()
                .then((doc) => {
                    if (doc.exists) {
                        const userData = doc.data();
                        
                        // If we don't have display name, use name from Firestore
                        if (!user.displayName && userData.name) {
                            userName.textContent = userData.name;
                            playerNameInput.value = userData.name;
                        }
                        
                        // If user has mobile number saved, pre-fill it
                        if (userData.mobileNumber) {
                            mobileNumberInput.value = userData.mobileNumber;
                        }
                        
                        // If user has game info saved, pre-fill it
                        // Check both gameUID and gameUid variants for backward compatibility
                        if (userData.gameUID || userData.gameUid) {
                            gameUidInput.value = userData.gameUID || userData.gameUid;
                        }
                        
                        if (userData.gameName) {
                            gameNameInput.value = userData.gameName;
                        }
                    }
                })
                .catch((error) => {
                    console.error('Error getting user data:', error);
                });
            
            // Load tournament data from session storage
            const tournamentData = sessionStorage.getItem('selectedTournament');
            
            if (tournamentData) {
                tournament = JSON.parse(tournamentData);
                displayTournamentDetails();
            } else {
                // If no tournament data, redirect to home page
                window.location.href = 'main.html';
            }
        } else {
            // No user is signed in, redirect to login page
            window.location.href = 'index.html';
        }
    });
    
    // Registration form submit handler
    registrationForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Clear messages
        errorMessage.textContent = '';
        successMessage.textContent = '';
        
        // Get form values
        const playerName = playerNameInput.value.trim();
        const gameUid = gameUidInput.value.trim();
        const gameName = gameNameInput.value.trim();
        const mobileNumber = mobileNumberInput.value.trim();
        
        // Validate form
        if (!playerName || !gameUid || !gameName || !mobileNumber) {
            errorMessage.textContent = 'Please fill in all fields';
            return;
        }
        
        if (mobileNumber.length !== 10 || !/^\d+$/.test(mobileNumber)) {
            errorMessage.textContent = 'Please enter a valid 10-digit mobile number';
            return;
        }
        
        // Disable form submission
        const submitButton = registrationForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Processing...';
        
        // Save registration data to session storage
        const registrationData = {
            tournamentId: tournament.id,
            tournamentTitle: tournament.title,
            matchId: tournament.matchId,
            dateTime: tournament.dateTime,
            entryFee: tournament.entryFee,
            playerName: playerName,
            gameUID: gameUid,
            gameUid: gameUid,
            gameName: gameName,
            mobileNumber: mobileNumber
        };
        
        sessionStorage.setItem('registrationData', JSON.stringify(registrationData));
        
        // Save game info to user profile using consistent field names
        firebase.firestore().collection('users').doc(currentUser.uid).set({
            gameUID: gameUid,
            gameUid: gameUid,
            gameName: gameName,
            mobileNumber: mobileNumber,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true })
        .then(() => {
            // Redirect to payment page
            window.location.href = 'tournament-payment.html';
        })
        .catch((error) => {
            console.error('Error saving user data:', error);
            errorMessage.textContent = 'Error processing registration. Please try again.';
            
            // Re-enable submit button
            submitButton.disabled = false;
            submitButton.textContent = 'Proceed to Payment';
        });
    });
});

// Function to display tournament details
function displayTournamentDetails() {
    if (!tournament) return;
    
    tournamentTitle.textContent = tournament.title || 'Unknown Tournament';
    tournamentMatchId.textContent = tournament.matchId || 'N/A';
    
    // Format date and time
    if (tournament.dateTime) {
        const dateTime = tournament.dateTime.seconds ? 
            new Date(tournament.dateTime.seconds * 1000) : new Date();
        
        const formattedDateTime = dateTime.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        tournamentDateTime.textContent = formattedDateTime;
    } else {
        tournamentDateTime.textContent = 'Not specified';
    }
    
    tournamentFee.textContent = tournament.entryFee ? `₹${tournament.entryFee}` : 'Free';
} 