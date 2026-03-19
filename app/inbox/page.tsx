'use client';

import { useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  doc,
} from 'firebase/firestore';

type Message = {
  id: string;
  from: string;
  name: string;
  text: string;
  direction?: 'inbound' | 'outbound';
};

type Contact = {
  id: string;
  phone: string;
  name: string;
  type?: 'unknown' | 'lead' | 'customer' | 'personal';
  autoReplyEnabled?: boolean;
  notes?: string;
  interest?: string;
  budget?: string;
  area?: string;
};

type TypeFilter = 'all' | 'unknown' | 'lead' | 'customer' | 'personal';
type AutoFilter = 'all' | 'on' | 'off';

export default function InboxPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [loadingReply, setLoadingReply] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [savingContact, setSavingContact] = useState(false);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [autoFilter, setAutoFilter] = useState<AutoFilter>('all');

  const [notes, setNotes] = useState('');
  const [interest, setInterest] = useState('');
  const [budget, setBudget] = useState('');
  const [area, setArea] = useState('');

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

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'contacts'), (snapshot) => {
      const data: Contact[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as any),
      }));
      setContacts(data);
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
    return messages.filter((m) => m.from === selectedPhone).slice().reverse();
  }, [messages, selectedPhone]);

  const selectedConversation = useMemo(() => {
    if (!selectedPhone) return null;
    return conversations.find((c) => c.from === selectedPhone) || null;
  }, [selectedPhone, conversations]);

  const selectedContact = useMemo(() => {
    if (!selectedPhone) return null;
    return contacts.find((c) => String(c.phone) === String(selectedPhone)) || null;
  }, [selectedPhone, contacts]);

  useEffect(() => {
    setNotes(selectedContact?.notes || '');
    setInterest(selectedContact?.interest || '');
    setBudget(selectedContact?.budget || '');
    setArea(selectedContact?.area || '');
  }, [selectedContact?.id]);

  const filteredConversations = useMemo(() => {
    return conversations.filter((msg) => {
      const contact = contacts.find((c) => String(c.phone) === String(msg.from));
      const resolvedType = contact?.type || 'unknown';
      const resolvedAuto = Boolean(contact?.autoReplyEnabled);

      const keyword = search.trim().toLowerCase();
      const matchesSearch =
        !keyword ||
        msg.name?.toLowerCase().includes(keyword) ||
        msg.from?.toLowerCase().includes(keyword) ||
        msg.text?.toLowerCase().includes(keyword) ||
        contact?.notes?.toLowerCase().includes(keyword) ||
        contact?.interest?.toLowerCase().includes(keyword) ||
        contact?.budget?.toLowerCase().includes(keyword) ||
        contact?.area?.toLowerCase().includes(keyword);

      const matchesType =
        typeFilter === 'all' ? true : resolvedType === typeFilter;

      const matchesAuto =
        autoFilter === 'all'
          ? true
          : autoFilter === 'on'
          ? resolvedAuto
          : !resolvedAuto;

      return matchesSearch && matchesType && matchesAuto;
    });
  }, [conversations, contacts, search, typeFilter, autoFilter]);

  async function generateReply() {
    if (!selectedConversation) return;

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
          name: selectedConversation.name,
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
    if (!selectedConversation || !reply.trim()) return;

    try {
      setSendingReply(true);

      const res = await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedConversation.from,
          message: reply,
          name: selectedConversation.name,
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

  async function ensureContactRecord() {
    if (!selectedConversation) return null;
    if (selectedContact?.id) return selectedContact.id;

    const res = await fetch('/api/create-contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: selectedConversation.from,
        name: selectedConversation.name,
      }),
    });

    const data = await res.json();

    if (!data.success || !data.id) {
      throw new Error('Failed to create contact');
    }

    return data.id as string;
  }

  async function updateContactType(
    type: 'unknown' | 'lead' | 'customer' | 'personal'
  ) {
    if (!selectedConversation) return;

    try {
      setSavingContact(true);

      const contactId = await ensureContactRecord();
      if (!contactId) return;

      const autoReplyEnabled = type === 'lead' || type === 'customer';

      await updateDoc(doc(db, 'contacts', contactId), {
        type,
        autoReplyEnabled,
      });
    } catch (error) {
      console.error(error);
      alert('❌ Failed to update contact type');
    } finally {
      setSavingContact(false);
    }
  }

  async function toggleAutoReply() {
    if (!selectedConversation) return;

    try {
      setSavingContact(true);

      const contactId = await ensureContactRecord();
      if (!contactId) return;

      const currentValue = Boolean(selectedContact?.autoReplyEnabled);

      await updateDoc(doc(db, 'contacts', contactId), {
        autoReplyEnabled: !currentValue,
      });
    } catch (error) {
      console.error(error);
      alert('❌ Failed to toggle auto reply');
    } finally {
      setSavingContact(false);
    }
  }

  async function saveContactProfile() {
    if (!selectedConversation) return;

    try {
      setSavingContact(true);

      const contactId = await ensureContactRecord();
      if (!contactId) return;

      await updateDoc(doc(db, 'contacts', contactId), {
        notes,
        interest,
        budget,
        area,
      });

      alert('✅ Contact profile saved');
    } catch (error) {
      console.error(error);
      alert('❌ Failed to save profile');
    } finally {
      setSavingContact(false);
    }
  }

  function typeBadge(type?: string) {
    if (type === 'lead') return 'bg-blue-100 text-blue-700';
    if (type === 'customer') return 'bg-green-100 text-green-700';
    if (type === 'personal') return 'bg-gray-200 text-gray-700';
    return 'bg-yellow-100 text-yellow-700';
  }

  return (
    <div className="p-6 h-[calc(100vh-40px)]">
      <h1 className="text-2xl font-bold mb-6">WhatsApp Inbox</h1>

      <div className="grid grid-cols-1 md:grid-cols-[380px_1fr] gap-6 h-[calc(100%-56px)]">
        {/* 左边：专业版会话列表 */}
        <div className="border rounded-2xl bg-white overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b space-y-3">
            <div>
              <h2 className="font-semibold">Conversations</h2>
              <p className="text-sm text-gray-500">
                {filteredConversations.length} conversation
                {filteredConversations.length === 1 ? '' : 's'}
              </p>
            </div>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, message, notes..."
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
            />

            <div className="grid grid-cols-2 gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
                className="border rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All Types</option>
                <option value="lead">Leads</option>
                <option value="customer">Customers</option>
                <option value="personal">Personal</option>
                <option value="unknown">Unknown</option>
              </select>

              <select
                value={autoFilter}
                onChange={(e) => setAutoFilter(e.target.value as AutoFilter)}
                className="border rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All Auto Reply</option>
                <option value="on">Auto Reply ON</option>
                <option value="off">Auto Reply OFF</option>
              </select>
            </div>
          </div>

          <div className="overflow-y-auto flex-1 p-3 space-y-3">
            {filteredConversations.length === 0 ? (
              <div className="text-sm text-gray-500">No matching conversations.</div>
            ) : (
              filteredConversations.map((msg) => {
                const c = contacts.find((x) => String(x.phone) === String(msg.from));

                return (
                  <button
                    key={msg.from}
                    type="button"
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
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm text-gray-500">
                        {msg.name} ({msg.from})
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${typeBadge(c?.type)}`}>
                        {c?.type || 'unknown'}
                      </span>
                    </div>

                    <div className="mt-2 font-medium line-clamp-2">{msg.text}</div>

                    {(c?.interest || c?.area) && (
                      <div className="mt-2 text-xs text-gray-500">
                        {[c?.interest, c?.area].filter(Boolean).join(' • ')}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* 右边 */}
        <div className="border rounded-2xl bg-white overflow-hidden flex flex-col">
          {selectedConversation ? (
            <>
              {/* 顶部资料卡 */}
              <div className="px-5 py-4 border-b space-y-4">
                <div>
                  <h2 className="font-semibold text-lg">{selectedConversation.name}</h2>
                  <p className="text-sm text-gray-500">{selectedConversation.from}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${typeBadge(selectedContact?.type)}`}>
                    {selectedContact?.type || 'unknown'}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                    Auto Reply: {selectedContact?.autoReplyEnabled ? 'ON' : 'OFF'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => updateContactType('lead')}
                    disabled={savingContact}
                    className="px-3 py-1 border rounded-lg text-sm disabled:opacity-50"
                  >
                    Mark as Lead
                  </button>
                  <button
                    onClick={() => updateContactType('customer')}
                    disabled={savingContact}
                    className="px-3 py-1 border rounded-lg text-sm disabled:opacity-50"
                  >
                    Mark as Customer
                  </button>
                  <button
                    onClick={() => updateContactType('personal')}
                    disabled={savingContact}
                    className="px-3 py-1 border rounded-lg text-sm disabled:opacity-50"
                  >
                    Mark as Personal
                  </button>
                  <button
                    onClick={() => updateContactType('unknown')}
                    disabled={savingContact}
                    className="px-3 py-1 border rounded-lg text-sm disabled:opacity-50"
                  >
                    Set Unknown
                  </button>
                  <button
                    onClick={toggleAutoReply}
                    disabled={savingContact}
                    className="px-3 py-1 border rounded-lg text-sm disabled:opacity-50"
                  >
                    {savingContact ? 'Saving...' : 'Toggle Auto Reply'}
                  </button>
                </div>

                {/* 联系人资料卡 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border rounded-xl p-4 bg-gray-50">
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Interest / Project</label>
                    <input
                      value={interest}
                      onChange={(e) => setInterest(e.target.value)}
                      placeholder="e.g. M Aurora"
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Area</label>
                    <input
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      placeholder="e.g. Klang Valley"
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Budget</label>
                    <input
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      placeholder="e.g. RM500k - RM700k"
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-500 mb-1">Notes</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Anything important about this contact..."
                      className="w-full min-h-[90px] border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <button
                      onClick={saveContactProfile}
                      disabled={savingContact}
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
                    >
                      {savingContact ? 'Saving...' : 'Save Contact Profile'}
                    </button>
                  </div>
                </div>
              </div>

              {/* 中间聊天 */}
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

              {/* 底部回复 */}
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