'use client';

import { useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';

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
  const [loadingReply, setLoadingReply] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

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
        .find((m) => m.direction !== 'outbound') ||
      selectedConversationMessages[selectedConversationMessages.length - 1];

    if (!latestInbound) return;

    try {
      setLoadingReply(true);
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
      setLoadingReply(false);
    }
  }

  async function sendReply() {
    if (!selectedContact || !reply.trim()) return;

    try {
      setSendingReply(true);

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
      setSendingReply(false);
    }
  }

  return (
    <div className="p-6 h-[calc(100vh-40px)]">
      <h1 className="text-2xl font-bold mb-6">WhatsApp Inbox</h1>

      <div className="grid grid-cols-1 md:grid-cols-[360px_1fr] gap-6 h-[calc(100%-56px)]">
        {/* 左边会话列表 */}
        <div className="border rounded-2xl bg-white overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b">
            <h2 className="font-semibold">Conversations</h2>
            <p className="text-sm text-gray-500">
              {conversations.length} conversation{conversations.length === 1 ? '' : 's'}
            </p>
          </div>

          <div className="overflow-y-auto flex-1 p-3 space-y-3">
            {conversations.length === 0 ? (
              <div className="text-sm text-gray-500">No conversations yet...</div>
            ) : (
              conversations.map((msg) => (
                <button
                  key={msg.from}
                  onClick={() => {
                    setSelectedPhone(msg.from);
                    setReply('');
                  }}
                  className={`w-full text-left border rounded-xl p-4 transition ${
                    selectedPhone === msg.from
                      ? 'bg-blue-100 border-blue-300'
                      : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="text-sm text-gray-500">
                    {msg.name} ({msg.from})
                  </div>
                  <div className="mt-2 font-medium line-clamp-2">{msg.text}</div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* 右边聊天详情 */}
        <div className="border rounded-2xl bg-white overflow-hidden flex flex-col">
          {selectedContact ? (
            <>
              <div className="px-5 py-4 border-b">
                <h2 className="font-semibold text-lg">{selectedContact.name}</h2>
                <p className="text-sm text-gray-500">{selectedContact.from}</p>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-gray-50">
                {selectedConversationMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                      msg.direction === 'outbound'
                        ? 'ml-auto bg-green-100'
                        : 'mr-auto bg-white'
                    }`}
                  >
                    <div className="text-xs text-gray-500 mb-1">
                      {msg.direction === 'outbound' ? 'You' : msg.name}
                    </div>
                    <div className="whitespace-pre-wrap break-words">{msg.text}</div>
                  </div>
                ))}
              </div>

              <div className="border-t p-5 space-y-4">
                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={generateReply}
                    disabled={loadingReply}
                    className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-50"
                  >
                    {loadingReply ? 'Generating...' : 'Generate AI Reply'}
                  </button>
                </div>

                <div>
                  <label className="block text-sm text-gray-500 mb-2">Reply Draft</label>
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Generate or type a reply here..."
                    className="w-full min-h-[140px] border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={sendReply}
                    disabled={sendingReply || !reply.trim()}
                    className="px-4 py-2 rounded-lg bg-green-600 text-white disabled:opacity-50"
                  >
                    {sendingReply ? 'Sending...' : 'Send to WhatsApp'}
                  </button>

                  <button
                    onClick={() => setReply('')}
                    disabled={!reply}
                    className="px-4 py-2 rounded-lg border disabled:opacity-50"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              Select a conversation
            </div>
          )}
        </div>
      </div>
    </div>
  );
}