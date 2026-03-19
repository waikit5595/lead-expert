'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

type Message = {
  id: string;
  from: string;
  name: string;
  text: string;
  createdAt?: any;
};

export default function InboxPage() {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'messages'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Message[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as any),
      }));
      setMessages(data);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">WhatsApp Inbox</h1>

      {messages.length === 0 ? (
        <p>No messages yet...</p>
      ) : (
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="border rounded-lg p-4 shadow-sm"
            >
              <div className="text-sm text-gray-500">
                {msg.name} ({msg.from})
              </div>
              <div className="mt-2 text-lg">
                {msg.text}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}