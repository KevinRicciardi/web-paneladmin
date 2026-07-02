import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
apiKey: "AIzaSyBBX-k0GB_KPnvlGYsRuWo4OfCnLI2CK4c",
  authDomain: "appstreaming-pinnacle.firebaseapp.com",
  projectId: "appstreaming-pinnacle",
  storageBucket: "appstreaming-pinnacle.firebasestorage.app",
  messagingSenderId: "410893182093",
  appId: "1:410893182093:web:57b613f7b3e0e05bbdeec4",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();