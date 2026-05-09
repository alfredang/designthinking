import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  runTransaction,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB3mCOwbuGYD2s5dHfjevofcENF70Vmq28",
  authDomain: "designthinking-fab7a.firebaseapp.com",
  projectId: "designthinking-fab7a",
  storageBucket: "designthinking-fab7a.firebasestorage.app",
  messagingSenderId: "526378531473",
  appId: "1:526378531473:web:d465c88b8ddf36320c5d30",
  measurementId: "G-YTPC6WMNR9"
};

export const isConfigured = !firebaseConfig.apiKey.startsWith("YOUR_");

let app, db;
try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (e) {
  console.warn("Firebase init failed:", e);
}

export {
  db,
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  runTransaction,
  Timestamp
};
