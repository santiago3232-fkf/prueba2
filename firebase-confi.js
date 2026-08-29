import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

export const firebaseConfig = { 
  apiKey: "AIzaSyCOKOpU4TJn83TilY3_aXfWfibidnYMiaM",
  authDomain: "paynex-23d0d.firebaseapp.com",
  projectId: "paynex-23d0d",
  storageBucket: "paynex-23d0d.firebasestorage.app",
  messagingSenderId: "1000368632531",
  appId: "1:1000368632531:web:a33ac9448375253d079a26",
  measurementId: "G-SCX1NF6349"
};

// Configuración de los 4 Super Admin (correos autorizados con privilegios máximos)
export const SUPER_ADMIN_EMAILS = [
  "samuelpaez0608@gmail.com",
  "san.18gutierrez@gmail.com",
  "danielestebanpaezbuitrago@gmail.com",
  "gonzalesdaravinajostinjairjostinjair@gmail.com"
];

// Inicializar servicios Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Exportar helpers de Auth y Firestore para uso en el sistema
export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
};