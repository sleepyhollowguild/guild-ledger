import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';
import { firebaseConfig } from '../../firebase/config.js';
export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
