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
  const [sending, setSending] = useState(false);

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

  async function sendWhatsAppReply() {
    if (!selected || !reply) return;

    try {
      setSending(true);

      const res = await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: selected.from,
          message: reply,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        alert(`❌ Failed to send: ${data.error || 'Unknown error'}`);
        return;
      }

      alert('✅ Sent to WhatsApp');
    } catch (error) {
      console.error(error);
      alert('❌ Failed to send');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="p-6 grid grid-cols-2 gap-6">
      <div>
        <h1 className="text-2xl font-bold mb-4">WhatsApp Inbox</h1>

        {messages.length === 0 ? (
          <p>No messages yet...</p>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                onClick={() => {
                  setSelected(msg);
                  setReply('');
                }}
                className={`border rounded-lg p-4 cursor-pointer ${
                  selected?.id === msg.id ? 'bg-blue-100' : 'bg-white'
                }`}
              >
                <div className="text-sm text-gray-500">
                  {msg.name} ({msg.from})
                </div>
                <div className="mt-2 text-lg">{msg.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Conversation</h2>

        {selected ? (
          <div className="border rounded-lg p-4 space-y-4 bg-white">
            <div>
              <p className="text-gray-500">
                {selected.name} ({selected.from})
              </p>
              <p className="mt-2 text-lg">{selected.text}</p>
            </div>

            <button
              onClick={generateReply}
              disabled={loading}
              className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate AI Reply'}
            </button>

            {reply && (
              <div className="border rounded p-3 bg-gray-50 space-y-3">
                <p className="text-sm text-gray-500 mb-2">AI Reply</p>
                <p>{reply}</p>

                <button
                  onClick={sendWhatsAppReply}
                  disabled={sending}
                  className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
                >
                  {sending ? 'Sending...' : 'Send to WhatsApp'}
                </button>
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