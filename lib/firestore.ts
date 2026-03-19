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
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Lead } from "@/types";

function toMillis(value: unknown): number {
  if (!value) return 0;

  if (typeof value === "string" || typeof value === "number" || value instanceof Date) {
    const ms = new Date(value).getTime();
    return Number.isNaN(ms) ? 0 : ms;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    const ms = (value as { toDate: () => Date }).toDate().getTime();
    return Number.isNaN(ms) ? 0 : ms;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value &&
    typeof (value as { seconds: number }).seconds === "number"
  ) {
    return (value as { seconds: number }).seconds * 1000;
  }

  return 0;
}

export async function getLeads(userId: string): Promise<Lead[]> {
  const q = query(
    collection(db, "leads"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);

  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Lead)
    .sort((a, b) => {
      const at = toMillis(a.createdAt);
      const bt = toMillis(b.createdAt);
      return bt - at;
    });
}

export async function addLead(
  userId: string,
  payload: Omit<Lead, "id" | "userId" | "createdAt">
) {
  return addDoc(collection(db, "leads"), {
    ...payload,
    userId,
    createdAt: serverTimestamp(),
  });
}

export async function updateLead(
  leadId: string,
  payload: Partial<Omit<Lead, "id" | "userId" | "createdAt">>
) {
  return updateDoc(doc(db, "leads", leadId), payload);
}

export async function deleteLead(leadId: string) {
  return deleteDoc(doc(db, "leads", leadId));
}