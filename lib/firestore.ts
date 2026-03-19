import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AIRecord, Lead, LeadStatus } from '@/types';

export async function fetchLeads(userId: string): Promise<Lead[]> {
  const q = query(collection(db, 'leads'), where('userId', '==', userId));
  const snap = await getDocs(q);
  return (snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Lead[]).sort((a, b) => {
    const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bt - at;
  });
}

export async function addLead(data: Omit<Lead, 'id'>) {
  await addDoc(collection(db, 'leads'), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function updateLead(id: string, data: Partial<Lead>) {
  await updateDoc(doc(db, 'leads', id), data);
}

export async function deleteLead(id: string) {
  await deleteDoc(doc(db, 'leads', id));
}

export async function updateLeadStatus(id: string, status: LeadStatus) {
  await updateDoc(doc(db, 'leads', id), { status });
}

export async function saveAIRecord(record: AIRecord) {
  await addDoc(collection(db, 'ai_logs'), {
    ...record,
    createdAt: serverTimestamp(),
  });
}
