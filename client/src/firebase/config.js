import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"

const firebaseConfig = {
  apiKey: "AIzaSyAFv_d4F1fDguSkhTp6-Zff0Z3l2kBZxQM",
  authDomain: "logic-looper-f6202.firebaseapp.com",
  projectId: "logic-looper-f6202",
  storageBucket: "logic-looper-f6202.firebasestorage.app",
  messagingSenderId: "64859158738",
  appId: "1:64859158738:web:7d7246ff3f59765b2a550b",
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
