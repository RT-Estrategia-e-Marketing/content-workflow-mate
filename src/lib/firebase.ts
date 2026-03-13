import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
    apiKey: "AIzaSyCO1kHpJJx846zpjqgBw8Vcwy1CPctxUX8",
    authDomain: "postflow-6bb75.firebaseapp.com",
    projectId: "postflow-6bb75",
    storageBucket: "postflow-6bb75.firebasestorage.app",
    messagingSenderId: "242498267549",
    appId: "1:242498267549:web:48d44f47392bfd60146774"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, "us-central1");

const secondaryApp = initializeApp(firebaseConfig, "Secondary");
export const secondaryAuth = getAuth(secondaryApp);
