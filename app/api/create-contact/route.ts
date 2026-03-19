import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
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

    // 先查有没有同号码联系人，避免重复
    const q = query(collection(db, 'contacts'), where('phone', '==', phone));
    const snap = await getDocs(q);

    if (!snap.empty) {
      return NextResponse.json({
        success: true,
        id: snap.docs[0].id,
      });
    }

    const docRef = await addDoc(collection(db, 'contacts'), {
      phone,
      name: name || 'Unknown',
      type: 'unknown',
      autoReplyEnabled: false,
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