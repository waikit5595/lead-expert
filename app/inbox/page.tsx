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
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'messages'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Message[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as any),
      }));
      setMessages(data);
    });

    return () => unsubscribe();
  }, []);

  async function generateReply() {
    if (!selected) return;

    try {
      setLoading(true);
      setReply('');

      const res = await fetch('/api/generate-reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: selected.name,
          message: selected.text,
        }),
      });

      const data = await res.json();
      setReply(data.reply || 'No reply generated');
    } catch (error) {
      console.error(error);
      setReply('Failed to generate reply');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 grid grid-cols-2 gap-6">
      <div>
        <h1 className="text-xl font-bold mb-4">WhatsApp Inbox</h1>

        {messages.map((msg) => (
          <div
            key={msg.id}
            onClick={() => {
              setSelected(msg);
              setReply('');
            }}
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

      <div>
        <h2 className="text-xl font-bold mb-4">Conversation</h2>

        {selected ? (
          <div className="border p-4 rounded space-y-4">
            <div>
              <p className="text-gray-500">
                {selected.name} ({selected.from})
              </p>
              <p className="mt-2">{selected.text}</p>
            </div>

            <button
              onClick={generateReply}
              disabled={loading}
              className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate AI Reply'}
            </button>

            {reply && (
              <div className="border rounded p-3 bg-gray-50">
                <p className="text-sm text-gray-500 mb-2">AI Reply</p>
                <p>{reply}</p>
              </div>
            )}
          </div>
        ) : (
          <p>Select a conversation</p>
        )}
      </div>
    </div>
  );
}