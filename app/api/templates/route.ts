import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

export async function GET() {
  try {
    const q = query(collection(db, 'templates'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);

    const templates = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    return NextResponse.json({ success: true, templates });
  } catch (error) {
    console.error('Load templates error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load templates' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, category, content } = body;

    if (!title || !category || !content) {
      return NextResponse.json(
        { success: false, error: 'Missing title, category, or content' },
        { status: 400 }
      );
    }

    const docRef = await addDoc(collection(db, 'templates'), {
      title,
      category,
      content,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      id: docRef.id,
    });
  } catch (error) {
    console.error('Create template error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create template' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, title, category, content } = body;

    if (!id || !title || !category || !content) {
      return NextResponse.json(
        { success: false, error: 'Missing id, title, category, or content' },
        { status: 400 }
      );
    }

    await updateDoc(doc(db, 'templates', id), {
      title,
      category,
      content,
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update template error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing template id' },
        { status: 400 }
      );
    }

    await deleteDoc(doc(db, 'templates', id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete template error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}