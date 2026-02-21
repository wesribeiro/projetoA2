import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDOF8CuQmhZ0rGjiN1mIHa_ZVntUDpmPTo",
  authDomain: "projetoa2-8bfe6.firebaseapp.com",
  projectId: "projetoa2-8bfe6",
  storageBucket: "projetoa2-8bfe6.firebasestorage.app",
  messagingSenderId: "313611098910",
  appId: "1:313611098910:web:1590f851440d7b436b470f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);