// FIREBASE IMPORTS

import { auth, db } from "../../firebase/firebase-config.js";

import {
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import { showToast } from "./common.js";

// FORM

const signupForm = document.getElementById("signupForm");
const signupBtn = document.querySelector(".signup-btn");

// SIGNUP

signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // GET FORM DATA
    const name = document
        .getElementById("signupName")
        .value
        .trim();

    const email = document
        .getElementById("signupEmail")
        .value
        .trim();

    const password = document
        .getElementById("signupPassword")
        .value;

    const confirmPassword = document
        .getElementById("confirmPassword")
        .value;

    const role = "user";

    // VALIDATION
    if (!name || !email || !password || !confirmPassword) {
        showToast("Please fill all fields.", "warning");
        return;
    }

    if (password !== confirmPassword) {
        showToast("Passwords do not match.", "error");
        return;
    }

    signupBtn.disabled = true;
    signupBtn.textContent = "Creating account...";

    // CREATE FIREBASE USER

    try {
        const userCredential =
            await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

        const user = userCredential.user;

        // SAVE USER DATA TO FIRESTORE

await setDoc(doc(db, "users", user.uid), {
    name: name,
    email: email,
    role: role,
    createdAt: serverTimestamp()
});

showToast("Account created successfully.", "success");

setTimeout(() => {
    window.location.href = "login.html";
}, 1200);

    } catch (error) {
    console.error(error);

    showToast(error.message, "error");

    signupBtn.disabled = false;
    signupBtn.textContent = "Create Account";
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