import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBLD9nfn5PR2rlsc6sfVtrQpHUsXijI2UY",
    authDomain: "restaurant-browser-920a3.firebaseapp.com",
    projectId: "restaurant-browser-920a3",
    storageBucket: "restaurant-browser-920a3.firebasestorage.app",
    messagingSenderId: "695176333720",
    appId: "1:695176333720:web:16a2708bd461ef72f583ed"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);

export { auth, db };