import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function getPrivateKey() {
  const raw = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  return raw ? raw.replace(/\\n/g, '\n') : undefined;
}

const adminConfig = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: getPrivateKey(),
};

if (!getApps().length) {
  if (adminConfig.projectId && adminConfig.clientEmail && adminConfig.privateKey) {
    initializeApp({
      credential: cert({
        projectId: adminConfig.projectId,
        clientEmail: adminConfig.clientEmail,
        privateKey: adminConfig.privateKey,
      }),
    });
  }
}

export const adminDb = getApps().length ? getFirestore() : null;
