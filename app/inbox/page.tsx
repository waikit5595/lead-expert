'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

type Message = {
  id: string;
  from: string;
  name: string;
  text: string;
};

export default function InboxPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selected, setSelected] = useState<Message | null>(null);

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
    <div className="p-6 grid grid-cols-2 gap-6">
      {/* 左边：列表 */}
      <div>
        <h1 className="text-xl font-bold mb-4">WhatsApp Inbox</h1>

        {messages.map((msg) => (
          <div
            key={msg.id}
            onClick={() => setSelected(msg)}
            className={`border p-4 rounded mb-2 cursor-pointer ${
              selected?.id === msg.id ? 'bg-blue-100' : ''
            }`}
          >
            <div className="text-sm text-gray-500">
              {msg.name} ({msg.from})
            </div>
            <div>{msg.text}</div>
          </div>
        ))}
      </div>

      {/* 右边：对话 */}
      <div>
        <h2 className="text-xl font-bold mb-4">Conversation</h2>

        {selected ? (
          <div className="border p-4 rounded">
            <p className="text-gray-500">
              {selected.name} ({selected.from})
            </p>
            <p className="mt-2">{selected.text}</p>
          </div>
        ) : (
          <p>Select a conversation</p>
        )}
      </div>
    </div>
  );
}