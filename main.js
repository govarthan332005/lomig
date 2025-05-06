// DOM elements
const userName = document.getElementById('user-name');
const profilePic = document.getElementById('profile-pic');
const tournamentsContainer = document.getElementById('tournaments-container');
const tournamentTemplate = document.getElementById('tournament-card-template');

// Default avatar fallback
const defaultAvatar = "https://ui-avatars.com/api/?name=User&background=random";

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get stored name from session storage (if available)
    const storedName = sessionStorage.getItem('userName');
    if (storedName) {
        userName.textContent = storedName;
        // Update avatar to include the user's name
        profilePic.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(storedName)}&background=random`;
    }
    
    // Check if we're offline
    if (!navigator.onLine) {
        console.log("Device is offline - using cached data");
    }
    
    // Check authentication state
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            // User is signed in
            
            // Update profile info
            if (user.displayName) {
                userName.textContent = user.displayName;
                // Only update the avatar if we're using user.displayName (not the sessionStorage fallback)
                profilePic.src = user.photoURL || 
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=random`;
            } else if (!storedName) {
                // If no displayName and no stored name, use default
                userName.textContent = 'User';
                profilePic.src = defaultAvatar;
            }
            
            // Get user data from Firestore as backup for profile info
            firebase.firestore().collection('users').doc(user.uid).get()
                .then((doc) => {
                    if (doc.exists) {
                        const userData = doc.data();
                        // If displayName is still not set, use the name from Firestore
                        if (!user.displayName && userData.name) {
                            userName.textContent = userData.name;
                            profilePic.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=random`;
                        }
                    }
                })
                .catch((error) => {
                    console.error('Error getting user data:', error);
                    // Don't let this error block the app functionality
                    // Just continue with the default or sessionStorage name
                });
                
            // Load tournaments
            loadTournaments();
        } else {
            // No user is signed in, redirect to login page
            window.location.href = 'index.html';
        }
    });
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
        console.log('Device is now online');
        // Reload tournaments when we come back online
        loadTournaments();
    });
    
    window.addEventListener('offline', () => {
        console.log('Device is now offline');
        // Show offline message
        showErrorMessage("You are currently offline. Some features may be limited.");
    });
});

// Function to load tournaments from Firestore
function loadTournaments() {
    // Show loading spinner
    tournamentsContainer.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Loading tournaments...</p>
        </div>
    `;

    const db = firebase.firestore();

    // Create a fallback mechanism for different query approaches
    let hasError = false;
    
    // Try the simplest query first - only get admin-created tournaments (all statuses)
    db.collection('tournaments')
        .where('adminCreated', '==', true)  // Only get admin-created tournaments
        .get()
        .then((querySnapshot) => {
            if (hasError) return; // Skip if another query already succeeded
            displayTournaments(querySnapshot);
        })
        .catch((error) => {
            console.error('Error with basic query:', error);
            hasError = true;
            
            // Try different fallback queries
            tryFallbackQueries();
        });
        
    function tryFallbackQueries() {
        // Try different query patterns that might work
        
        // Fallback 1: Get all tournaments and filter in memory for admin-created ones
        db.collection('tournaments')
            .get()
            .then((querySnapshot) => {
                if (hasError) return;
                
                // Filter for admin-created tournaments in JS (any status)
                const filtered = [];
                querySnapshot.forEach(doc => {
                    const data = doc.data();
                    // Include all admin-created tournaments regardless of status
                    // If adminCreated is undefined/null, assume it's true for backward compatibility
                    if (data.adminCreated === true || data.adminCreated === undefined) {
                        data.id = doc.id;
                        filtered.push(data);
                    }
                });
                
                displayTournamentsFromArray(filtered);
            })
            .catch((error) => {
                console.error('Error with fallback query 1:', error);
                
                // Check if we're offline
                if (!navigator.onLine) {
                    // Try to use cached data if available
                    showErrorMessage("You're offline. Using cached tournament data if available.");
                    
                    // Try one more time with offline persistence
                    db.collection('tournaments')
                        .get()
                        .then(querySnapshot => {
                            if (querySnapshot.empty) {
                                showErrorMessage("No cached tournament data available while offline.");
                                return;
                            }
                            
                            const filtered = [];
                            querySnapshot.forEach(doc => {
                                const data = doc.data();
                                data.id = doc.id;
                                filtered.push(data);
                            });
                            
                            displayTournamentsFromArray(filtered);
                        })
                        .catch(finalError => {
                            console.error("Final fallback error:", finalError);
                            showErrorMessage("Unable to load tournaments. Please check your connection and try again.");
                        });
                } else {
                    showErrorMessage("We're experiencing temporary issues. Please try refreshing the page.");
                }
            });
    }
}

// Function to display tournaments from query results
function displayTournaments(querySnapshot) {
    // Clear loading spinner
    tournamentsContainer.innerHTML = '';
    
    if (querySnapshot.empty) {
        // No tournaments found
        tournamentsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times" style="font-size: 50px; color: #ccc; margin-bottom: 20px;"></i>
                <h3>No Tournaments Available</h3>
                <p>There are no tournaments available at the moment. Please check back later.</p>
            </div>
        `;
        return;
    }
    
    // Add each tournament to the page
    const tournaments = [];
    querySnapshot.forEach((doc) => {
        const tournament = doc.data();
        tournament.id = doc.id;
        tournaments.push(tournament);
    });
    
    displayTournamentsFromArray(tournaments);
}

// Display tournaments from an array (used by both direct and fallback queries)
function displayTournamentsFromArray(tournaments) {
    // Clear container
    tournamentsContainer.innerHTML = '';
    
    if (tournaments.length === 0) {
        // No tournaments found
        tournamentsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times" style="font-size: 50px; color: #ccc; margin-bottom: 20px;"></i>
                <h3>No Tournaments Available</h3>
                <p>There are no tournaments available at the moment. Please check back later.</p>
            </div>
        `;
        return;
    }
    
    // Sort tournaments by status (active first) then by dateTime
    tournaments.sort((a, b) => {
        // First sort by status (active tournaments first)
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (a.status !== 'active' && b.status === 'active') return 1;
        
        // Then sort by date
        let dateA, dateB;
        
        try {
            dateA = a.dateTime && a.dateTime.toDate ? a.dateTime.toDate() : new Date();
        } catch (e) {
            dateA = new Date();
        }
        
        try {
            dateB = b.dateTime && b.dateTime.toDate ? b.dateTime.toDate() : new Date();
        } catch (e) {
            dateB = new Date();
        }
        
        return dateA - dateB;
    });
    
    // Add tournaments to the page
    tournaments.forEach((tournament) => {
        addTournamentToPage(tournament);
    });
}

// Function to show error message
function showErrorMessage(message = "There was a problem loading the tournaments. Please try again later.") {
    tournamentsContainer.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-exclamation-circle" style="font-size: 50px; color: #e74c3c; margin-bottom: 20px;"></i>
            <h3>Tournament Loading Issue</h3>
            <p>${message}</p>
            <button onclick="loadTournaments()" class="btn btn-primary">Try Again</button>
        </div>
    `;
}

// Function to add a tournament to the page
function addTournamentToPage(tournament) {
    // Clone the template
    const tournamentCard = document.importNode(tournamentTemplate.content, true);
    
    // Set the tournament details
    tournamentCard.querySelector('.tournament-title').textContent = tournament.title || 'Unnamed Tournament';
    
    // Safely handle image URL
    const imgElement = tournamentCard.querySelector('.tournament-image img');
    imgElement.src = tournament.imageUrl || 'default-tournament.jpg';
    imgElement.onerror = function() {
        this.src = 'default-tournament.jpg';
    };
    
    tournamentCard.querySelector('.match-id').textContent = tournament.matchId || 'N/A';
    
    // Format date and time
    let formattedDateTime = 'N/A';
    try {
        const dateTime = tournament.dateTime && tournament.dateTime.toDate ? 
            tournament.dateTime.toDate() : new Date();
        formattedDateTime = dateTime.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        console.error('Date formatting error:', e);
    }
    tournamentCard.querySelector('.date-time').textContent = formattedDateTime;
    
    tournamentCard.querySelector('.prize').textContent = `₹${tournament.prizePool || 0}`;
    tournamentCard.querySelector('.per-kill').textContent = `₹${tournament.perKill || 0}`;
    tournamentCard.querySelector('.match-type').textContent = tournament.matchType || 'Classic';
    tournamentCard.querySelector('.players').textContent = `${tournament.joinedPlayers || 0}/${tournament.maxPlayers || 100}`;
    tournamentCard.querySelector('.fee').textContent = `₹${tournament.entryFee || 0}`;
    
    // Add status indicator if not active
    if (tournament.status !== 'active') {
        const statusDiv = document.createElement('div');
        statusDiv.className = `tournament-status status-${tournament.status}`;
        statusDiv.textContent = tournament.status.toUpperCase();
        tournamentCard.querySelector('.tournament-details').prepend(statusDiv);
    }
    
    // Add join button functionality (only enable for active tournaments)
    const joinButton = tournamentCard.querySelector('.join-btn');
    if (tournament.status !== 'active') {
        joinButton.disabled = true;
        joinButton.textContent = tournament.status === 'upcoming' ? 'Coming Soon' : 'Closed';
        joinButton.classList.add('disabled');
    } else {
        joinButton.setAttribute('data-tournament-id', tournament.id);
        joinButton.addEventListener('click', () => {
            // Store tournament data in session storage
            sessionStorage.setItem('selectedTournament', JSON.stringify(tournament));
            // Redirect to registration page
            window.location.href = 'tournament-register.html';
        });
    }
    
    // Add the tournament card to the container
    tournamentsContainer.appendChild(tournamentCard);
}

// Remove this call to prevent creating sample tournaments
// createSampleTournaments();

// Only for development - Commented out to prevent adding non-admin tournaments
/*
function createSampleTournaments() {
    const db = firebase.firestore();
    
    // Check if tournaments collection is empty
    db.collection('tournaments').limit(1).get()
        .then((querySnapshot) => {
            if (querySnapshot.empty) {
                // Create sample tournaments
                const sampleTournaments = [
                    {
                        title: 'BGMI Solo Showdown',
                        matchId: 'SOLO-001',
                        dateTime: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 86400000)), // Tomorrow
                        prizePool: 5000,
                        perKill: 100,
                        matchType: 'Solo',
                        maxPlayers: 100,
                        joinedPlayers: 37,
                        entryFee: 50,
                        imageUrl: 'https://www.91mobiles.com/hub/wp-content/uploads/2021/07/BGMI-tips-tricks.jpg',
                        status: 'active'
                    },
                    {
                        title: 'BGMI Squad Challenge',
                        matchId: 'SQUAD-001',
                        dateTime: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 172800000)), // Day after tomorrow
                        prizePool: 10000,
                        perKill: 200,
                        matchType: 'Squad',
                        maxPlayers: 100,
                        joinedPlayers: 62,
                        entryFee: 100,
                        imageUrl: 'https://cdn.dnaindia.com/sites/default/files/styles/full/public/2021/07/09/983908-bgmi.jpg',
                        status: 'active'
                    },
                    {
                        title: 'BGMI Duos Tournament',
                        matchId: 'DUO-001',
                        dateTime: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 259200000)), // Three days from now
                        prizePool: 7500,
                        perKill: 150,
                        matchType: 'Duo',
                        maxPlayers: 100,
                        joinedPlayers: 45,
                        entryFee: 75,
                        imageUrl: 'https://img.gurugamer.com/resize/1200x-/2021/08/03/bgmi-duo-vs-squad-d272.jpg',
                        status: 'active'
                    }
                ];
                
                // Add each sample tournament to Firestore
                const batch = db.batch();
                
                sampleTournaments.forEach((tournament) => {
                    const tournamentRef = db.collection('tournaments').doc();
                    batch.set(tournamentRef, tournament);
                });
                
                // Commit the batch
                return batch.commit();
            }
        })
        .then(() => {
            // If sample tournaments were created, reload the page
            if (document.referrer.includes('index.html')) {
                loadTournaments();
            }
        })
        .catch((error) => {
            console.error('Error creating sample tournaments:', error);
        });
}
*/ 