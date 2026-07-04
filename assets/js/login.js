/* FIREBASE IMPORTS */

import { auth, db } from "../../firebase/firebase-config.js";

import {
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import { showToast } from "./common.js";


// LOGIN FORM

const loginForm = document.getElementById("loginForm");
const loginBtn = document.querySelector(".login-btn");
const forgotPasswordLink =
    document.getElementById("forgotPasswordLink");
const googleLoginBtn =
    document.getElementById("googleLoginBtn");

// LOGIN

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document
        .getElementById("loginEmail")
        .value
        .trim();

    const password = document
        .getElementById("loginPassword")
        .value;

    if (!email || !password) {
        showToast("Please fill all fields.", "warning");
        return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = "Signing in...";

    try {
        // FIREBASE LOGIN
        const userCredential =
            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

        const user = userCredential.user;

        // GET USER DATA FROM FIRESTORE
        const userDoc =
            await getDoc(
                doc(db, "users", user.uid)
            );


        if (!userDoc.exists()) {
            showToast("User data not found.", "error");
            return;
        }

        const userData = userDoc.data();

        console.log(userData);

showToast("Login successful.", "success");

setTimeout(() => {

    window.location.href = "dashboard.html";

}, 1000);
    }

    catch (error) {
        console.error(error);

        switch (error.code) {
            case "auth/invalid-email":

                showToast("Invalid email address.", "error");
                break;

            case "auth/invalid-credential":

                showToast("Incorrect email or password.", "error");
                break;

            case "auth/user-not-found":

                showToast("User not found.", "error");
                break;

            case "auth/wrong-password":

                showToast("Incorrect password.", "error");
                break;

            default:
                showToast(error.message, "error");
        }

        // Reset Button

        loginBtn.disabled = false;
        loginBtn.textContent = "Sign In";
    }
});

const togglePasswordIcons =
    document.querySelectorAll(".toggle-password");

togglePasswordIcons.forEach(icon => {
    icon.addEventListener("click", () => {
        const input = icon.previousElementSibling;

        if (input.type === "password") {
            input.type = "text";
            icon.classList.remove("fa-eye");
            icon.classList.add("fa-eye-slash");

        } else {
            input.type = "password";
            icon.classList.remove("fa-eye-slash");
            icon.classList.add("fa-eye");
        }
    });
});

forgotPasswordLink.addEventListener("click", async (e) => {
    e.preventDefault();

    const email = document
        .getElementById("loginEmail")
        .value
        .trim();

    if (!email) {
        showToast("Please enter your email first.", "warning");
        return;
    }

    try {
        await sendPasswordResetEmail(auth, email);

        showToast("Password reset link sent to your email.", "success");

    } catch (error) {
        console.error(error);

        showToast(error.message, "error");
    }
});