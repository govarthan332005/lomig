// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDixufxD2KlUSPgqPIJQNatpQ0XEnpTouA",
    authDomain: "lumilearn-df84e.firebaseapp.com",
    databaseURL: "https://lumilearn-df84e-default-rtdb.firebaseio.com",
    projectId: "lumilearn-df84e",
    storageBucket: "lumilearn-df84e.appspot.com",
    messagingSenderId: "972914519676",
    appId: "1:972914519676:web:8c4c2a47beb1864954e3f9",
    measurementId: "G-4LZM3VLSSS"
};

// Initialize Firebase with persistence settings
firebase.initializeApp(firebaseConfig);

// Add cache handling for offline errors
const db = firebase.firestore();

// Check if we're in a browser environment where we can use offline persistence
if (typeof window !== 'undefined' && window.indexedDB) {
    // Enable Firestore offline persistence with forceOwnership set to true
    db.enablePersistence({synchronizeTabs: true, forceOwnership: true})
        .then(() => {
            console.log("Offline persistence enabled");
        })
        .catch((err) => {
            if (err.code == 'failed-precondition') {
                // Multiple tabs open, persistence can only be enabled in one tab at a time
                console.warn("Persistence failed: Multiple tabs open. Using memory cache only.");
                // Still continue with memory cache
                db.settings({
                    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
                });
            } else if (err.code == 'unimplemented') {
                // The current browser does not support all of the features required for persistence
                console.warn("Persistence not supported by browser. Using memory cache only.");
                // Still continue with memory cache
                db.settings({
                    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
                });
            } else {
                console.error("Persistence error:", err);
            }
        });
} else {
    console.log("Browser doesn't support IndexedDB. Using memory cache only.");
    // Use memory-only cache
    db.settings({
        cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
    });
}

// Set authentication persistence to LOCAL to avoid cookie-based tracking issues
firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .catch((error) => {
        console.error("Persistence setting error:", error);
        // Continue without persistence - will still work for current session
    });

// Add global error handler for auth state changes
firebase.auth().onAuthStateChanged(user => {
    if (user) {
        console.log("User is authenticated and session is active");
    }
}, error => {
    // Handle authentication errors
    console.error("Auth state change error:", error.code, error.message);
    
    // Show an error message to the user and provide fallback
    if (error.code === 'auth/network-request-failed') {
        // Use any stored credentials if available
        console.warn("Network connection issue - using cached credentials if available");
        
        // Check if we have cache access to continue
        if (typeof window !== 'undefined' && window.indexedDB) {
            console.log("Using IndexedDB cache for offline authentication");
        }
    }
});

// Handle network connectivity events
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        console.log("Network is online - enabling Firestore network access");
        db.enableNetwork()
            .then(() => console.log("Firestore network connection enabled"))
            .catch(err => console.warn("Error enabling network:", err));
    });
    
    window.addEventListener('offline', () => {
        console.log("Network is offline - disabling Firestore network to use cache");
        db.disableNetwork()
            .then(() => console.log("Firestore network connection disabled, using cache"))
            .catch(err => console.warn("Error disabling network:", err));
    });
}

// Don't automatically reset the network on page load
// This was causing issues with offline persistence
// Instead, check connection status first
if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    console.log("Device appears to be offline - using cache only");
    db.disableNetwork()
        .then(() => console.log("Firestore network disabled due to offline status"))
        .catch(err => console.warn("Error disabling network:", err));
} else {
    // We appear to be online, so reset if needed
    db.enableNetwork()
        .then(() => console.log("Firestore network connection reset successfully"))
        .catch(err => console.warn("Firestore network handling error:", err));
}

// Export the database instance for easier access in other files
window.db = db; 