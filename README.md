# LadderApp

A React Native app with web and mobile support, featuring Firebase authentication.

## Features

- ✅ Sign Up page
- ✅ Log In page
- ✅ Firebase Authentication
- ✅ Web and Mobile support (iOS, Android, Web)
- ✅ Firebase Hosting ready

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use an existing one
3. Enable Email/Password authentication:
   - Go to Authentication > Sign-in method
   - Enable Email/Password provider
4. Get your Firebase config:
   - Go to Project Settings > General
   - Scroll down to "Your apps" section
   - Copy the config object
5. Update `firebase.config.js` with your Firebase configuration

### 3. Update Firebase Project ID

Update `.firebaserc` with your Firebase project ID:

```json
{
  "projects": {
    "default": "your-actual-project-id"
  }
}
```

## Running the App

### Web
```bash
npm run web
```

### iOS
```bash
npm run ios
```

### Android
```bash
npm run android
```

### Development Server
```bash
npm start
```

## Deployment

### Deploy to Firebase Hosting (Web)

1. Install Firebase CLI (if not already installed):
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Build the web version:
```bash
npm run build:web
```

4. Deploy:
```bash
firebase deploy --only hosting
```

## Project Structure

```
LadderApp/
├── App.js                 # Main app component with navigation
├── firebase.config.js     # Firebase configuration
├── screens/
│   ├── LoginScreen.js     # Login page
│   ├── SignUpScreen.js    # Sign up page
│   └── HomeScreen.js      # Home page (after login)
├── package.json
└── README.md
```

## Technologies Used

- React Native
- Expo
- Firebase Authentication
- React Navigation
- React Native Web
