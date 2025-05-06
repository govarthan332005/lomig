// DOM elements
const userName = document.getElementById('user-name');
const profilePic = document.getElementById('profile-pic');
const matchesContainer = document.getElementById('joined-matches-container');

// Default avatar fallback
const defaultAvatar = "https://ui-avatars.com/api/?name=User&background=random";

// Current user
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
            
            // Load joined matches
            loadJoinedMatches(user.uid);
        } else {
            // No user is signed in, redirect to login page
            window.location.href = 'index.html';
        }
    });
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
        console.log('Device is now online - refreshing joined matches');
        if (currentUser) {
            loadJoinedMatches(currentUser.uid);
        }
    });
    
    window.addEventListener('offline', () => {
        console.log('Device is now offline - using cached data if available');
        showNotification("You are offline. Using cached data if available.", "warning");
    });
});

// Function to load joined matches
function loadJoinedMatches(userId) {
    // Show loading spinner
    matchesContainer.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Loading your matches...</p>
        </div>
    `;
    
    const db = firebase.firestore();
    let hasError = false;
    
    // Try with the simplest query approach first - just filter by userId
    db.collection('registrations')
        .where('userId', '==', userId)
        .get()
        .then((querySnapshot) => {
            if (hasError) return; // Avoid processing if another query has already succeeded
            // This query worked, but we'll have to sort client-side
            displayJoinedMatches(querySnapshot, true);
        })
        .catch((error) => {
            console.error('Error with simple query:', error);
            hasError = true;
            
            // Try a completely different approach - get all registrations and filter client-side
            // This is not efficient but works as a last resort
            if (!navigator.onLine) {
                // Check if we're offline and try to use cache
                db.collection('registrations')
                    .get()
                    .then((allSnapshot) => {
                        if (hasError) return;
                        
                        // Filter manually in JS
                        const filtered = [];
                        allSnapshot.forEach(doc => {
                            const data = doc.data();
                            if (data.userId === userId) {
                                data.id = doc.id;
                                filtered.push(data);
                            }
                        });
                        
                        // Create a fake querySnapshot with our filtered results
                        const manualSnapshot = {
                            size: filtered.length,
                            empty: filtered.length === 0,
                            forEach: (callback) => filtered.forEach(doc => callback({
                                id: doc.id,
                                data: () => doc
                            }))
                        };
                        
                        displayJoinedMatches(manualSnapshot, true);
                    })
                    .catch(finalError => {
                        console.error('Final fallback error:', finalError);
                        showErrorMessage("Unable to load your matches while offline.");
                    });
            } else {
                showErrorMessage("We're having trouble loading your matches. Please try again later.");
            }
        });
}

// Function to display joined matches
function displayJoinedMatches(querySnapshot, needsSorting = false) {
    // Clear container
    matchesContainer.innerHTML = '';
    
    if (querySnapshot.empty) {
        // No joined tournaments
        matchesContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-gamepad" style="font-size: 50px; color: #ccc; margin-bottom: 20px;"></i>
                <h3>No Matches Joined Yet</h3>
                <p>You haven't joined any tournaments yet.</p>
                <a href="main.html" class="btn btn-primary" style="max-width: 200px; margin-top: 20px;">Browse Tournaments</a>
            </div>
        `;
        return;
    }
    
    // Get all registration documents
    const registrations = [];
    querySnapshot.forEach((doc) => {
        const registration = doc.data();
        registration.id = doc.id;
        registrations.push(registration);
    });
    
    // Sort by registration date if needed (for fallback query)
    if (needsSorting) {
        registrations.sort((a, b) => {
            // Handle cases where registeredAt might be missing or in different formats
            let dateA, dateB;
            
            try {
                if (a.registeredAt) {
                    if (a.registeredAt.seconds) {
                        dateA = new Date(a.registeredAt.seconds * 1000);
                    } else if (a.registeredAt.toDate) {
                        dateA = a.registeredAt.toDate();
                    } else if (a.registeredAt instanceof Date) {
                        dateA = a.registeredAt;
                    } else {
                        dateA = new Date(a.registeredAt);
                    }
                } else {
                    dateA = new Date(0);
                }
            } catch (e) {
                console.error('Error parsing date A:', e);
                dateA = new Date(0);
            }
            
            try {
                if (b.registeredAt) {
                    if (b.registeredAt.seconds) {
                        dateB = new Date(b.registeredAt.seconds * 1000);
                    } else if (b.registeredAt.toDate) {
                        dateB = b.registeredAt.toDate();
                    } else if (b.registeredAt instanceof Date) {
                        dateB = b.registeredAt;
                    } else {
                        dateB = new Date(b.registeredAt);
                    }
                } else {
                    dateB = new Date(0);
                }
            } catch (e) {
                console.error('Error parsing date B:', e);
                dateB = new Date(0);
            }
            
            return dateB - dateA; // Sort descending (newest first)
        });
    }
    
    // Add each joined match to the page
    registrations.forEach(registration => {
        addJoinedMatchToPage(registration);
    });
}

// Function to show error message
function showErrorMessage(message = "There was a problem loading your matches. Please try again later.") {
    matchesContainer.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-exclamation-circle" style="font-size: 50px; color: #e74c3c; margin-bottom: 20px;"></i>
            <h3>Error Loading Matches</h3>
            <p>${message}</p>
            <button onclick="loadJoinedMatches('${currentUser ? currentUser.uid : ''}')" class="btn btn-primary" style="max-width: 200px; margin-top: 20px;">Try Again</button>
        </div>
    `;
}

// Function to show temporary notification
function showNotification(message, type = "info") {
    // Create a notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add to the document
    document.body.appendChild(notification);
    
    // Show animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}

// Function to add a joined match to the page
function addJoinedMatchToPage(registration) {
    // Create match card
    const matchCard = document.createElement('div');
    matchCard.className = 'match-card';
    
    // Create match header with title and status badge
    const matchHeader = document.createElement('div');
    matchHeader.className = 'match-header';
    
    // Title
    const matchTitle = document.createElement('div');
    matchTitle.className = 'match-title';
    matchTitle.textContent = registration.tournamentTitle || 'Unknown Tournament';
    
    // Status badge
    const statusBadge = document.createElement('div');
    statusBadge.className = 'status-badge';
    
    // Set status badge color and text based on payment status
    switch (registration.paymentStatus) {
        case 'confirmed':
        case 'success':
        case 'completed':
            statusBadge.classList.add('status-confirmed');
            statusBadge.textContent = registration.paymentStatus.charAt(0).toUpperCase() + registration.paymentStatus.slice(1);
            break;
        case 'rejected':
            statusBadge.classList.add('status-rejected');
            statusBadge.textContent = 'Rejected';
            break;
        default:
            statusBadge.classList.add('status-pending');
            statusBadge.textContent = 'Pending';
    }
    
    // Add title and status badge to header
    matchHeader.appendChild(matchTitle);
    matchHeader.appendChild(statusBadge);
    
    // Create match details
    const matchDetails = document.createElement('div');
    matchDetails.className = 'match-details';
    
    // Format date and time if available
    let formattedDateTime = 'Not specified';
    
    try {
        if (registration.dateTime) {
            let dateTime;
            
            if (registration.dateTime.seconds) {
                dateTime = new Date(registration.dateTime.seconds * 1000);
            } else if (registration.dateTime.toDate) {
                dateTime = registration.dateTime.toDate();
            } else if (registration.dateTime instanceof Date) {
                dateTime = registration.dateTime;
            } else {
                dateTime = new Date(registration.dateTime);
            }
            
            formattedDateTime = dateTime.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    } catch (e) {
        console.error('Error formatting date:', e);
        formattedDateTime = 'Invalid date';
    }
    
    // Format registered date
    let registeredDate = 'N/A';
    
    try {
        if (registration.registeredAt) {
            let regDate;
            
            if (registration.registeredAt.seconds) {
                regDate = new Date(registration.registeredAt.seconds * 1000);
            } else if (registration.registeredAt.toDate) {
                regDate = registration.registeredAt.toDate();
            } else if (registration.registeredAt instanceof Date) {
                regDate = registration.registeredAt;
            } else {
                regDate = new Date(registration.registeredAt);
            }
            
            registeredDate = regDate.toLocaleString();
        }
    } catch (e) {
        console.error('Error formatting registration date:', e);
        registeredDate = 'Invalid date';
    }
    
    // Add details to match details
    matchDetails.innerHTML = `
        <div><strong>Match ID:</strong> ${registration.matchId || 'N/A'}</div>
        <div><strong>Date & Time:</strong> ${formattedDateTime}</div>
        <div><strong>Entry Fee:</strong> ₹${registration.entryFee || 0}</div>
        <div><strong>Player Name:</strong> ${registration.playerName || 'N/A'}</div>
        <div><strong>Game UID:</strong> ${registration.gameUID || registration.gameUid || 'N/A'}</div>
        <div><strong>Registered On:</strong> ${registeredDate}</div>
    `;
    
    // Add payment info button if payment is pending
    if (registration.paymentStatus === 'pending') {
        const paymentButton = document.createElement('button');
        paymentButton.className = 'btn btn-primary';
        paymentButton.style.marginTop = '15px';
        paymentButton.style.width = 'auto';
        paymentButton.innerHTML = '<i class="fas fa-money-bill"></i> View Payment Details';
        
        paymentButton.addEventListener('click', () => {
            // Store registration data and redirect to payment page
            sessionStorage.setItem('pendingRegistration', JSON.stringify(registration));
            window.location.href = 'tournament-payment.html';
        });
        
        matchDetails.appendChild(paymentButton);
    }
    
    // Add room details if available and payment is confirmed, success, or completed
    const successStatuses = ['confirmed', 'success', 'completed'];
    if (successStatuses.includes(registration.paymentStatus) && (registration.roomId || registration.roomPassword)) {
        const roomDetails = document.createElement('div');
        roomDetails.className = 'room-details';
        roomDetails.innerHTML = `
            <h4>Room Details</h4>
            ${registration.roomId ? `<div><strong>Room ID:</strong> ${registration.roomId}</div>` : ''}
            ${registration.roomPassword ? `<div><strong>Room Password:</strong> ${registration.roomPassword}</div>` : ''}
        `;
        matchDetails.appendChild(roomDetails);
    }
    
    // Add header and details to match card
    matchCard.appendChild(matchHeader);
    matchCard.appendChild(matchDetails);
    
    // Add match card to container
    matchesContainer.appendChild(matchCard);
} 