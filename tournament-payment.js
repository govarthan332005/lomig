// DOM elements
const userName = document.getElementById('user-name');
const profilePic = document.getElementById('profile-pic');
const tournamentTitle = document.getElementById('tournament-title');
const tournamentMatchId = document.getElementById('tournament-match-id');
const tournamentDateTime = document.getElementById('tournament-date-time');
const tournamentFee = document.getElementById('tournament-fee');
const feeAmount = document.getElementById('fee-amount');
const qrCodeImg = document.getElementById('qr-code-img');
const utrNumberInput = document.getElementById('utr-number');
const paymentForm = document.getElementById('payment-form');
const paymentMethods = document.querySelectorAll('.payment-method');
const errorMessage = document.getElementById('error-message');
const successMessage = document.getElementById('success-message');
const qrContainer = document.getElementById('qr-container');

// Default avatar fallback
const defaultAvatar = "https://ui-avatars.com/api/?name=User&background=random";

// UPI ID for payments
const upiId = "8688967845@upi";

// Registration and user data
let registrationData = null;
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
            
            // Load registration data from session storage
            const regDataStr = sessionStorage.getItem('registrationData');
            
            if (regDataStr) {
                try {
                    registrationData = JSON.parse(regDataStr);
                    displayPaymentDetails();
                    generateQRCode();
                } catch (error) {
                    console.error('Error parsing registration data:', error);
                    errorMessage.textContent = 'Error loading registration data. Please try again.';
                }
            } else {
                // If no registration data, redirect to home page
                window.location.href = 'main.html';
            }
        } else {
            // No user is signed in, redirect to login page
            window.location.href = 'index.html';
        }
    });
    
    // Payment method click handler
    paymentMethods.forEach(method => {
        method.addEventListener('click', () => {
            const app = method.getAttribute('data-app');
            openPaymentApp(app);
        });
    });
    
    // Payment form submit handler
    paymentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Clear messages
        errorMessage.textContent = '';
        successMessage.textContent = '';
        
        // Get form values
        const utrNumber = utrNumberInput.value.trim();
        
        // Validate form
        if (!utrNumber) {
            errorMessage.textContent = 'Please enter UTR number / Payment reference ID';
            return;
        }
        
        // Disable form submission
        const submitButton = paymentForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Processing...';
        
        // Create registration record in Firestore
        createRegistrationRecord(utrNumber)
            .then(() => {
                // Show success message
                successMessage.textContent = 'Payment submitted successfully! Please wait for confirmation.';
                
                // Disable form fields
                utrNumberInput.disabled = true;
                submitButton.style.display = 'none';
                
                // Add "View My Registrations" button
                const viewRegistrationsBtn = document.createElement('button');
                viewRegistrationsBtn.className = 'btn';
                viewRegistrationsBtn.textContent = 'View My Registrations';
                viewRegistrationsBtn.addEventListener('click', () => {
                    window.location.href = 'joined-matches.html';
                });
                
                paymentForm.appendChild(viewRegistrationsBtn);
            })
            .catch((error) => {
                console.error('Error submitting payment:', error);
                errorMessage.textContent = 'Error submitting payment. Please try again.';
                
                // Re-enable submit button
                submitButton.disabled = false;
                submitButton.textContent = 'Submit Payment';
            });
    });
});

// Function to display payment details
function displayPaymentDetails() {
    if (!registrationData) return;
    
    tournamentTitle.textContent = registrationData.tournamentTitle || 'Unknown Tournament';
    tournamentMatchId.textContent = registrationData.matchId || 'N/A';
    
    // Format date and time
    if (registrationData.dateTime) {
        const dateTime = registrationData.dateTime.seconds ? 
            new Date(registrationData.dateTime.seconds * 1000) : new Date();
        
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
    
    const fee = registrationData.entryFee || 0;
    tournamentFee.textContent = `₹${fee}`;
    feeAmount.textContent = fee;
}

// Function to generate QR code
function generateQRCode() {
    if (!registrationData) return;
    
    const amount = registrationData.entryFee || 0;
    const matchId = registrationData.matchId || 'UNKNOWN';
    
    try {
        // Clear any existing QR code
        qrContainer.innerHTML = '';
        
        // Create UPI payment link
        // Format: upi://pay?pa=UPI_ID&pn=MERCHANT_NAME&am=AMOUNT&cu=CURRENCY&tn=DESCRIPTION
        const upiLink = `upi://pay?pa=${upiId}&pn=Lomig_Tournaments&am=${amount}&cu=INR&tn=Tournament_${matchId}`;
        
        // Generate QR code using the QRCode library
        new QRCode(qrContainer, {
            text: upiLink,
            width: 200,
            height: 200,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    } catch (error) {
        console.error('Error generating QR code:', error);
        // Fallback if QR code generation fails
        qrContainer.innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <p>Could not generate QR code.</p>
                <p>Please use UPI ID: <strong>${upiId}</strong></p>
            </div>
        `;
    }
}

// Function to open payment app
function openPaymentApp(app) {
    if (!registrationData) return;
    
    const amount = registrationData.entryFee || 0;
    const matchId = registrationData.matchId || 'UNKNOWN';
    const upiLink = `upi://pay?pa=${upiId}&pn=Lomig_Tournaments&am=${amount}&cu=INR&tn=Tournament_${matchId}`;
    
    // Different apps may have different URI schemes
    let appLink;
    
    switch (app) {
        case 'phonepe':
            appLink = `phonepe://${upiLink}`;
            break;
        case 'gpay':
            appLink = `gpay://${upiLink}`;
            break;
        case 'paytm':
            appLink = `paytmmp://${upiLink}`;
            break;
        default:
            appLink = upiLink;
    }
    
    // Open the payment app
    window.location.href = appLink;
}

// Function to create registration record
function createRegistrationRecord(utrNumber) {
    return new Promise((resolve, reject) => {
        if (!registrationData || !currentUser) {
            reject(new Error('Missing registration or user data'));
            return;
        }
        
        const db = firebase.firestore();
        
        // Handle potential undefined gameUID or variations in capitalization
        const gameUID = registrationData.gameUID || registrationData.gameUid || registrationData.GameUID || registrationData.GAMEUID || '';
        const gameName = registrationData.gameName || '';
        
        // Create registration data
        const registration = {
            userId: currentUser.uid,
            tournamentId: registrationData.tournamentId,
            tournamentTitle: registrationData.tournamentTitle,
            matchId: registrationData.matchId,
            dateTime: registrationData.dateTime,
            entryFee: registrationData.entryFee,
            playerName: registrationData.playerName || '',
            gameUID: gameUID, // Use the safely processed gameUID
            gameName: gameName,
            mobileNumber: registrationData.mobileNumber || '',
            utrNumber: utrNumber,
            paymentStatus: 'pending', // Initial status is pending
            registeredAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Log the registration data for debugging
        console.log('Submitting registration with data:', registration);
        
        // Add registration to Firestore
        db.collection('registrations').add(registration)
            .then((docRef) => {
                console.log('Registration recorded with ID:', docRef.id);
                
                // Clear session storage
                sessionStorage.removeItem('registrationData');
                
                // Set up a listener to track payment status changes
                const registrationRef = db.collection('registrations').doc(docRef.id);
                
                const unsubscribe = registrationRef.onSnapshot((doc) => {
                    if (doc.exists) {
                        const data = doc.data();
                        
                        // If payment status is confirmed, success, or completed, increment joined players count
                        if (data.paymentStatus === 'confirmed' || data.paymentStatus === 'success' || data.paymentStatus === 'completed') {
                            // Update tournament player count
                            incrementTournamentPlayerCount(data.tournamentId)
                                .then(() => {
                                    console.log('Tournament player count updated successfully');
                                    // Unsubscribe after first successful status
                                    unsubscribe();
                                })
                                .catch((error) => {
                                    console.error('Error updating tournament player count:', error);
                                });
                        }
                    }
                }, (error) => {
                    console.error('Error listening to registration status:', error);
                });
                
                resolve(docRef.id);
            })
            .catch((error) => {
                console.error('Error adding registration:', error);
                reject(error);
            });
    });
}

// Function to increment tournament player count
function incrementTournamentPlayerCount(tournamentId) {
    return new Promise((resolve, reject) => {
        if (!tournamentId) {
            reject(new Error('Tournament ID is required'));
            return;
        }
        
        const db = firebase.firestore();
        const tournamentRef = db.collection('tournaments').doc(tournamentId);
        
        // Use transaction to safely increment player count
        db.runTransaction(transaction => {
            return transaction.get(tournamentRef).then(tournamentDoc => {
                if (!tournamentDoc.exists) {
                    throw new Error('Tournament does not exist');
                }
                
                const tournamentData = tournamentDoc.data();
                const currentPlayers = tournamentData.joinedPlayers || 0;
                const maxPlayers = tournamentData.maxPlayers || 100;
                
                // Check if tournament is full
                if (currentPlayers >= maxPlayers) {
                    throw new Error('Tournament is already full');
                }
                
                // Increment joined players count
                transaction.update(tournamentRef, {
                    joinedPlayers: currentPlayers + 1,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                return currentPlayers + 1;
            });
        })
        .then(newPlayerCount => {
            console.log('Player count updated to:', newPlayerCount);
            resolve(newPlayerCount);
        })
        .catch(error => {
            console.error('Error in transaction:', error);
            reject(error);
        });
    });
} 