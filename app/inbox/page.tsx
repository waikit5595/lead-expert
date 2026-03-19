'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { AppShell } from '@/components/app-shell';
import { Card } from '@/components/cards';
import { Protected } from '@/components/protected';
import { db } from '@/lib/firebase';
import { Conversation, ConversationMessage } from '@/types';

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string>('');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void loadConversations();
  }, []);

  useEffect(() => {
    if (selectedPhone) {
      void loadMessages(selectedPhone);
    }
  }, [selectedPhone]);

  async function loadConversations() {
    const snap = await getDocs(query(collection(db, 'conversations'), orderBy('updatedAt', 'desc')));
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Conversation[];
    setConversations(rows);
    if (!selectedPhone && rows[0]) setSelectedPhone(rows[0].id);
  }

  async function loadMessages(phone: string) {
    const snap = await getDocs(query(collection(db, 'conversations', phone, 'messages'), orderBy('createdAt', 'asc')));
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ConversationMessage[];
    setMessages(rows);
  }

  async function sendReply() {
    if (!selectedPhone || !reply.trim()) return;
    setLoading(true);
    const res = await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: selectedPhone, message: reply }),
    });
    if (res.ok) {
      setReply('');
      await loadMessages(selectedPhone);
      await loadConversations();
    }
    setLoading(false);
  }

  async function suggestReply() {
    const latestInbound = [...messages].reverse().find((m) => m.direction === 'inbound');
    if (!latestInbound) return;
    setLoading(true);
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'whatsapp_reply',
        payload: {
          customerMessage: latestInbound.text,
          contactName: currentConversation?.contactName || currentConversation?.phone || 'Customer',
          businessType: 'general sales',
          tone: 'friendly and concise',
        },
      }),
    });
    const data = await res.json();
    setReply(data.message || '');
    setLoading(false);
  }

  const currentConversation = useMemo(
    () => conversations.find((c) => c.id === selectedPhone),
    [conversations, selectedPhone],
  );

  return (
    <Protected>
      <AppShell>
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <Card title="WhatsApp Inbox">
            <div className="space-y-2">
              {conversations.length === 0 && <p className="text-sm text-slate-500">No WhatsApp conversations yet. Connect your webhook and send a test message first.</p>}
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedPhone(conv.id)}
                  className={`w-full rounded-xl border p-3 text-left ${selectedPhone === conv.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200'}`}
                >
                  <div className="font-medium">{conv.contactName || conv.phone}</div>
                  <div className="text-xs text-slate-500">{conv.phone}</div>
                  <div className="mt-1 truncate text-sm text-slate-600">{conv.lastMessageText || 'No messages yet'}</div>
                </button>
              ))}
            </div>
          </Card>

          <Card title={currentConversation ? `Chat with ${currentConversation.contactName || currentConversation.phone}` : 'Conversation'}>
            {!currentConversation ? (
              <p className="text-slate-500">Select a conversation to view messages.</p>
            ) : (
              <div className="space-y-4">
                <div className="max-h-[420px] space-y-3 overflow-y-auto rounded-2xl bg-slate-50 p-4">
                  {messages.length === 0 ? (
                    <p className="text-sm text-slate-500">No messages yet.</p>
                  ) : (
                    messages.map((msg) => (
                      <div key={msg.id} className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${msg.direction === 'outbound' ? 'ml-auto bg-slate-900 text-white' : 'bg-white text-slate-800'}`}>
                        {msg.text}
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-3">
                  <textarea
                    className="min-h-28 flex-1 rounded-2xl border border-slate-300 p-3"
                    placeholder="Type a reply or click AI Suggest Reply"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                  />
                  <div className="flex w-44 flex-col gap-2">
                    <button onClick={suggestReply} disabled={loading} className="rounded-xl border border-slate-300 px-4 py-3 text-sm">
                      {loading ? 'Thinking...' : 'AI Suggest Reply'}
                    </button>
                    <button onClick={sendReply} disabled={loading} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">
                      {loading ? 'Sending...' : 'Send WhatsApp'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </AppShell>
    </Protected>
  );
}
