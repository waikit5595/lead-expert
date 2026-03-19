'use client';

import { useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

type Message = {
  id: string;
  from: string;
  name: string;
  text: string;
  direction?: 'inbound' | 'outbound';
};

export default function InboxPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
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

  const conversations = useMemo(() => {
    const map = new Map<string, Message>();

    for (const msg of messages) {
      if (!map.has(msg.from)) {
        map.set(msg.from, msg);
      }
    }

    return Array.from(map.values());
  }, [messages]);

  const selectedConversationMessages = useMemo(() => {
    if (!selectedPhone) return [];
    return messages
      .filter((m) => m.from === selectedPhone)
      .slice()
      .reverse();
  }, [messages, selectedPhone]);

  const selectedContact = useMemo(() => {
    if (!selectedPhone) return null;
    return conversations.find((c) => c.from === selectedPhone) || null;
  }, [selectedPhone, conversations]);

  async function generateReply() {
    if (!selectedContact) return;

    const latestInbound =
      [...selectedConversationMessages]
        .reverse()
        .find((m) => m.direction !== 'outbound') || selectedConversationMessages[selectedConversationMessages.length - 1];

    if (!latestInbound) return;

    try {
      setLoading(true);
      setReply('');

      const res = await fetch('/api/generate-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedContact.name,
          message: latestInbound.text,
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
    if (!selectedContact || !reply) return;

    try {
      setSending(true);

      const res = await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedContact.from,
          message: reply,
          name: selectedContact.name,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        alert(`❌ Failed to send: ${data.error || 'Unknown error'}`);
        return;
      }

      alert('✅ Sent to WhatsApp');
      setReply('');
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

        {conversations.length === 0 ? (
          <p>No messages yet...</p>
        ) : (
          <div className="space-y-3">
            {conversations.map((msg) => (
              <div
                key={msg.from}
                onClick={() => {
                  setSelectedPhone(msg.from);
                  setReply('');
                }}
                className={`border rounded-lg p-4 cursor-pointer ${
                  selectedPhone === msg.from ? 'bg-blue-100' : 'bg-white'
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

        {selectedContact ? (
          <div className="space-y-4">
            <div className="border rounded-lg p-4 bg-white space-y-3 max-h-[420px] overflow-y-auto">
              <p className="text-gray-500">
                {selectedContact.name} ({selectedContact.from})
              </p>

              {selectedConversationMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-lg max-w-[85%] ${
                    msg.direction === 'outbound'
                      ? 'ml-auto bg-green-100'
                      : 'mr-auto bg-gray-100'
                  }`}
                >
                  <div className="text-xs text-gray-500 mb-1">
                    {msg.direction === 'outbound' ? 'You' : msg.name}
                  </div>
                  <div>{msg.text}</div>
                </div>
              ))}
            </div>

            <div className="border rounded-lg p-4 bg-white space-y-4">
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
          </div>
        ) : (
          <p>Select a conversation</p>
        )}
      </div>
    </div>
  );
}