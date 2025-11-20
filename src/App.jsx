// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAwY5tI1t5N0iFAihcsRElv75M1Y3lCaZU",
  authDomain: "leaveos.firebaseapp.com",
  projectId: "leaveos",
  storageBucket: "leaveos.firebasestorage.app",
  messagingSenderId: "423677575028",
  appId: "1:423677575028:web:e7d71f2745ab90c04e3621",
  measurementId: "G-2NCCP6JVG8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
