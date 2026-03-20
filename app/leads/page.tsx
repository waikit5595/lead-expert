'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';

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
  createdAt?: any;
  updatedAt?: any;
};

type TypeFilter = 'all' | 'unknown' | 'lead' | 'customer' | 'personal';
type AutoFilter = 'all' | 'on' | 'off';

export default function LeadsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [autoFilter, setAutoFilter] = useState<AutoFilter>('all');

  const [saving, setSaving] = useState(false);

  const [type, setType] = useState<'unknown' | 'lead' | 'customer' | 'personal'>('unknown');
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [interest, setInterest] = useState('');
  const [area, setArea] = useState('');
  const [budget, setBudget] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'contacts'), orderBy('updatedAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Contact[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as any),
      }));
      setContacts(data);
    });

    return () => unsubscribe();
  }, []);

  const selectedContact = useMemo(() => {
    if (!selectedId) return null;
    return contacts.find((c) => c.id === selectedId) || null;
  }, [selectedId, contacts]);

  useEffect(() => {
    if (!selectedContact) {
      setType('unknown');
      setAutoReplyEnabled(false);
      setInterest('');
      setArea('');
      setBudget('');
      setNotes('');
      return;
    }

    setType(selectedContact.type || 'unknown');
    setAutoReplyEnabled(Boolean(selectedContact.autoReplyEnabled));
    setInterest(selectedContact.interest || '');
    setArea(selectedContact.area || '');
    setBudget(selectedContact.budget || '');
    setNotes(selectedContact.notes || '');
  }, [selectedContact?.id]);

  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      const keyword = search.trim().toLowerCase();

      const matchesSearch =
        !keyword ||
        contact.name?.toLowerCase().includes(keyword) ||
        contact.phone?.toLowerCase().includes(keyword) ||
        contact.notes?.toLowerCase().includes(keyword) ||
        contact.interest?.toLowerCase().includes(keyword) ||
        contact.area?.toLowerCase().includes(keyword) ||
        contact.budget?.toLowerCase().includes(keyword);

      const resolvedType = contact.type || 'unknown';
      const matchesType =
        typeFilter === 'all' ? true : resolvedType === typeFilter;

      const resolvedAuto = Boolean(contact.autoReplyEnabled);
      const matchesAuto =
        autoFilter === 'all'
          ? true
          : autoFilter === 'on'
          ? resolvedAuto
          : !resolvedAuto;

      return matchesSearch && matchesType && matchesAuto;
    });
  }, [contacts, search, typeFilter, autoFilter]);

  const stats = useMemo(() => {
    return {
      total: contacts.length,
      lead: contacts.filter((c) => c.type === 'lead').length,
      customer: contacts.filter((c) => c.type === 'customer').length,
      personal: contacts.filter((c) => c.type === 'personal').length,
      unknown: contacts.filter((c) => !c.type || c.type === 'unknown').length,
    };
  }, [contacts]);

  async function saveLeadProfile() {
    if (!selectedContact) return;

    try {
      setSaving(true);

      await updateDoc(doc(db, 'contacts', selectedContact.id), {
        type,
        autoReplyEnabled,
        interest,
        area,
        budget,
        notes,
      });

      alert('✅ Lead profile saved');
    } catch (error) {
      console.error(error);
      alert('❌ Failed to save lead profile');
    } finally {
      setSaving(false);
    }
  }

  async function quickSetType(
    nextType: 'unknown' | 'lead' | 'customer' | 'personal'
  ) {
    if (!selectedContact) return;

    try {
      setSaving(true);

      const nextAuto =
        nextType === 'lead' || nextType === 'customer'
          ? true
          : false;

      await updateDoc(doc(db, 'contacts', selectedContact.id), {
        type: nextType,
        autoReplyEnabled: nextAuto,
      });
    } catch (error) {
      console.error(error);
      alert('❌ Failed to update type');
    } finally {
      setSaving(false);
    }
  }

  function typeBadge(contactType?: string) {
    if (contactType === 'lead') return 'bg-blue-100 text-blue-700';
    if (contactType === 'customer') return 'bg-green-100 text-green-700';
    if (contactType === 'personal') return 'bg-gray-200 text-gray-700';
    return 'bg-yellow-100 text-yellow-700';
  }

  return (
    <div className="p-6 h-[calc(100vh-40px)] space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Leads</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your contacts, classify leads, and keep customer profiles organized.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard title="Total" value={stats.total} />
        <StatCard title="Leads" value={stats.lead} />
        <StatCard title="Customers" value={stats.customer} />
        <StatCard title="Personal" value={stats.personal} />
        <StatCard title="Unknown" value={stats.unknown} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[380px_1fr] gap-6 h-[calc(100%-180px)]">
        {/* 左边列表 */}
        <div className="border rounded-2xl bg-white overflow-hidden flex flex-col">
          <div className="px-4 py-4 border-b space-y-3">
            <div>
              <h2 className="font-semibold">Contact List</h2>
              <p className="text-sm text-gray-500">
                {filteredContacts.length} contact{filteredContacts.length === 1 ? '' : 's'}
              </p>
            </div>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, notes, project..."
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
            {filteredContacts.length === 0 ? (
              <div className="text-sm text-gray-500">No matching contacts.</div>
            ) : (
              filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => setSelectedId(contact.id)}
                  className={`w-full text-left border rounded-xl p-4 transition ${
                    selectedId === contact.id
                      ? 'bg-blue-100 border-blue-300'
                      : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{contact.name || 'Unknown'}</div>
                    <span className={`text-xs px-2 py-1 rounded-full ${typeBadge(contact.type)}`}>
                      {contact.type || 'unknown'}
                    </span>
                  </div>

                  <div className="text-sm text-gray-500 mt-1">{contact.phone}</div>

                  {(contact.interest || contact.area) && (
                    <div className="text-xs text-gray-500 mt-2">
                      {[contact.interest, contact.area].filter(Boolean).join(' • ')}
                    </div>
                  )}

                  {contact.budget ? (
                    <div className="text-xs text-gray-500 mt-1">
                      Budget: {contact.budget}
                    </div>
                  ) : null}

                  <div className="text-xs mt-2">
                    Auto Reply:{' '}
                    <span className={contact.autoReplyEnabled ? 'text-green-600' : 'text-gray-500'}>
                      {contact.autoReplyEnabled ? 'ON' : 'OFF'}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* 右边详情 */}
        <div className="border rounded-2xl bg-white overflow-hidden flex flex-col">
          {selectedContact ? (
            <>
              <div className="px-5 py-4 border-b space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">{selectedContact.name || 'Unknown'}</h2>
                    <p className="text-sm text-gray-500 mt-1">{selectedContact.phone}</p>
                  </div>

                  <Link
                    href={`/inbox`}
                    className="px-4 py-2 rounded-lg border text-sm"
                  >
                    Open in Inbox
                  </Link>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => quickSetType('lead')}
                    disabled={saving}
                    className="px-3 py-1 border rounded-lg text-sm disabled:opacity-50"
                  >
                    Mark as Lead
                  </button>
                  <button
                    onClick={() => quickSetType('customer')}
                    disabled={saving}
                    className="px-3 py-1 border rounded-lg text-sm disabled:opacity-50"
                  >
                    Mark as Customer
                  </button>
                  <button
                    onClick={() => quickSetType('personal')}
                    disabled={saving}
                    className="px-3 py-1 border rounded-lg text-sm disabled:opacity-50"
                  >
                    Mark as Personal
                  </button>
                  <button
                    onClick={() => quickSetType('unknown')}
                    disabled={saving}
                    className="px-3 py-1 border rounded-lg text-sm disabled:opacity-50"
                  >
                    Set Unknown
                  </button>
                </div>
              </div>

              <div className="p-5 overflow-y-auto space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Contact Type</label>
                    <select
                      value={type}
                      onChange={(e) =>
                        setType(
                          e.target.value as 'unknown' | 'lead' | 'customer' | 'personal'
                        )
                      }
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="unknown">Unknown</option>
                      <option value="lead">Lead</option>
                      <option value="customer">Customer</option>
                      <option value="personal">Personal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Auto Reply</label>
                    <select
                      value={autoReplyEnabled ? 'on' : 'off'}
                      onChange={(e) => setAutoReplyEnabled(e.target.value === 'on')}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="off">OFF</option>
                      <option value="on">ON</option>
                    </select>
                  </div>

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
                </div>

                <div>
                  <label className="block text-sm text-gray-500 mb-1">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add lead notes, objections, preferences, follow-up reminders..."
                    className="w-full min-h-[160px] border rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={saveLeadProfile}
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Lead Profile'}
                  </button>

                  <Link
                    href="/billing"
                    className="px-4 py-2 rounded-lg border"
                  >
                    Upgrade Plan
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              Select a contact
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="border rounded-2xl bg-white p-5">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-3xl font-bold mt-2">{value}</div>
    </div>
  );
}