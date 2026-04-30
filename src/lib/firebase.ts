import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth();

export async function initFirebase() {
  try {
    // Initial connection test
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      console.log("Firebase connected (expected permission denied for test doc)");
      return;
    }
    if (error.message?.includes('the client is offline')) {
      console.error("Firebase connection error: The client is offline.");
    } else {
      console.error("Firebase init error:", error);
    }
  }
}

initFirebase();
