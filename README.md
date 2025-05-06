# Lomig Authentication System

A simple authentication system using Firebase for login, signup, and user management.

## Features

- User registration with name, email, and password
- User login with email and password
- Protected main page that requires authentication
- User profile display with name and avatar
- Logout functionality

## Setup Instructions

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Authentication (Email/Password method)
4. Create a Firestore database
5. Register your app to get the Firebase configuration

### 2. Update Firebase Configuration

1. Open `firebase-config.js`
2. Replace the placeholder values with your Firebase project credentials:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### 3. Browser Privacy Settings

If you encounter "Tracking Prevention" errors:

1. Try a different browser that doesn't block third-party tracking
2. Adjust privacy settings in your browser to allow Firebase domains
3. For Safari users: Go to Safari Preferences > Privacy > Website Tracking and disable "Prevent cross-site tracking"

### 4. Run the Application

You can use any local server to run the application. For example:

- Using Python:
  ```
  python -m http.server
  ```
- Using Node.js and npm:
  ```
  npm install -g http-server
  http-server
  ```

Then open `http://localhost:8000` (or the URL provided by your server) in your browser.

## File Structure

- `index.html` - Login page
- `signup.html` - Registration page
- `main.html` - Main application page (protected)
- `styles.css` - CSS styles
- `firebase-config.js` - Firebase configuration
- `login.js` - Login functionality
- `signup.js` - Registration functionality
- `main.js` - Main page functionality
- `default-avatar.png` - Default user avatar

## Security Notes

- This is a basic implementation. For production, consider adding additional security measures.
- Enable Firebase Security Rules for your Firestore database.
- Consider implementing email verification. 