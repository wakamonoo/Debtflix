/* ───────── Firebase initialisation (module) ───────── */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  updateDoc,
  deleteDoc,
  doc, 
  getDoc, 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

/* ───────── Project Values ───────── */
const firebaseConfig = {
  apiKey: "AIzaSyA6eeaWXcbC-0iYeVVm5jH_ReUXUc76DsY",
  authDomain: "debtflix-bf0d4.firebaseapp.com",
  projectId: "debtflix-bf0d4",
  storageBucket: "debtflix-bf0d4.appspot.com",
  messagingSenderId: "529410428470",
  appId: "1:529410428470:web:cc59e62ae02ceb5cf81297",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

/* ───────── Exposing Everything for script.js ───────── */
window.firebaseApp = {
  auth,
  provider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut,
  db,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  storage,
  ref,
  uploadBytes,
  getDownloadURL,
};
