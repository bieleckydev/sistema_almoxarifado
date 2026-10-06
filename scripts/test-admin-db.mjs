import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const app = initializeApp({ projectId: 'rhowert-a57af' });
const db = getFirestore(app);

try {
  const snap = await db.collection('items').limit(1).get();
  console.log('Success! Items found:', snap.size);
} catch (err) {
  console.log('Admin SDK error:', err.message);
}
