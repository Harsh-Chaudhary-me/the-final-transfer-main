import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Warning: Currently using potentially undefined environmental variables if not set!
// The user has been advised to provide their credentials in a .env file.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "dummy-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "dummy-auth-domain.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "dummy-project-id",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "dummy-storage.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "000000000",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:0000:web:1111"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };
