import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const { phone, name } = await req.json();

    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Missing phone' },
        { status: 400 }
      );
    }

    const q = query(collection(db, 'contacts'), where('phone', '==', phone));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const existing = snap.docs[0];

      await updateDoc(doc(db, 'contacts', existing.id), {
        name: name || existing.data().name || 'Unknown',
        updatedAt: serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        id: existing.id,
      });
    }

    const docRef = await addDoc(collection(db, 'contacts'), {
      phone,
      name: name || 'Unknown',
      type: 'unknown',
      autoReplyEnabled: false,
      notes: '',
      interest: '',
      budget: '',
      area: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      id: docRef.id,
    });
  } catch (error) {
    console.error('Create contact error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create contact' },
      { status: 500 }
    );
  }
}