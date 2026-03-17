import { initializeApp } from "firebase/app";
import { getFirestore }  from "firebase/firestore";

// Set these five env vars in .env.local (dev) and Netlify dashboard (prod).
// If they're missing the app still works — Firestore features are just skipped.
var apiKey = import.meta.env.VITE_FIREBASE_API_KEY;

export var db = apiKey
  ? getFirestore(
      initializeApp({
        apiKey,
        authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        appId:             import.meta.env.VITE_FIREBASE_APP_ID,
      })
    )
  : null;
