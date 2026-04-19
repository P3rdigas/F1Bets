// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDtn2L26sFyDguw9zBD7b_FjliP8kZNS04",
  authDomain: "f1bets-sde.firebaseapp.com",
  projectId: "f1bets-sde",
  storageBucket: "f1bets-sde.firebasestorage.app",
  messagingSenderId: "1068140386676",
  appId: "1:1068140386676:web:b24329c70b241163a4f421",
  measurementId: "G-W7MPEHHLD2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
