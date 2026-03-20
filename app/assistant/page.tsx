'use client';

import { useEffect, useMemo, useState } from 'react';

type Template = {
  id: string;
  title: string;
  category: string;
  content: string;
};

type CategoryFilter =
  | 'all'
  | 'first-contact'
  | 'price'
  | 'location'
  | 'follow-up'
  | 'reactivation'
  | 'closing'
  | 'custom';

const defaultCategories: { label: string; value: CategoryFilter }[] = [
  { label: 'All Categories', value: 'all' },
  { label: 'First Contact', value: 'first-contact' },
  { label: 'Price', value: 'price' },
  { label: 'Location', value: 'location' },
  { label: 'Follow Up', value: 'follow-up' },
  { label: 'Reactivation', value: 'reactivation' },
  { label: 'Closing', value: 'closing' },
  { label: 'Custom', value: 'custom' },
];

export default function AssistantPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('first-contact');
  const [content, setContent] = useState('');

  const selectedTemplate = useMemo(() => {
    if (!selectedId) return null;
    return templates.find((t) => t.id === selectedId) || null;
  }, [selectedId, templates]);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (!selectedTemplate) return;

    setTitle(selectedTemplate.title);
    setCategory((selectedTemplate.category as CategoryFilter) || 'custom');
    setContent(selectedTemplate.content);
  }, [selectedTemplate?.id]);

  async function loadTemplates() {
    try {
      setLoading(true);
      const res = await fetch('/api/templates');
      const data = await res.json();

      if (data.success) {
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error(error);
      alert('❌ Failed to load templates');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setSelectedId(null);
    setTitle('');
    setCategory('first-contact');
    setContent('');
  }

  async function saveTemplate() {
    if (!title.trim() || !category || !content.trim()) {
      alert('Please fill in title, category, and content.');
      return;
    }

    try {
      setSaving(true);

      if (selectedId) {
        const res = await fetch('/api/templates', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: selectedId,
            title,
            category,
            content,
          }),
        });

        const data = await res.json();

        if (!data.success) {
          alert(data.error || 'Failed to update template');
          return;
        }

        alert('✅ Template updated');
      } else {
        const res = await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            category,
            content,
          }),
        });

        const data = await res.json();

        if (!data.success) {
          alert(data.error || 'Failed to create template');
          return;
        }

        alert('✅ Template created');
      }

      await loadTemplates();
      resetForm();
    } catch (error) {
      console.error(error);
      alert('❌ Failed to save template');
    } finally {
      setSaving(false);
    }
  }

  async function deleteTemplate() {
    if (!selectedId) return;

    const confirmed = confirm('Delete this template?');
    if (!confirmed) return;

    try {
      setSaving(true);

      const res = await fetch(`/api/templates?id=${selectedId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.error || 'Failed to delete template');
        return;
      }

      alert('✅ Template deleted');
      await loadTemplates();
      resetForm();
    } catch (error) {
      console.error(error);
      alert('❌ Failed to delete template');
    } finally {
      setSaving(false);
    }
  }

  async function copyTemplate(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      alert('✅ Template copied');
    } catch (error) {
      console.error(error);
      alert('❌ Failed to copy template');
    }
  }

  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const keyword = search.trim().toLowerCase();

      const matchesSearch =
        !keyword ||
        template.title?.toLowerCase().includes(keyword) ||
        template.category?.toLowerCase().includes(keyword) ||
        template.content?.toLowerCase().includes(keyword);

      const matchesCategory =
        categoryFilter === 'all' ? true : template.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [templates, search, categoryFilter]);

  const stats = useMemo(() => {
    return {
      total: templates.length,
      firstContact: templates.filter((t) => t.category === 'first-contact').length,
      followUp: templates.filter((t) => t.category === 'follow-up').length,
      closing: templates.filter((t) => t.category === 'closing').length,
    };
  }, [templates]);

  return (
    <div className="p-6 h-[calc(100vh-40px)] space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Template Library</h1>
        <p className="text-sm text-gray-500 mt-1">
          Save and reuse high-converting WhatsApp message templates for sales, follow-up, and closing.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Templates" value={stats.total} />
        <StatCard title="First Contact" value={stats.firstContact} />
        <StatCard title="Follow Up" value={stats.followUp} />
        <StatCard title="Closing" value={stats.closing} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[380px_1fr] gap-6 h-[calc(100%-180px)]">
        {/* 左边模板列表 */}
        <div className="border rounded-2xl bg-white overflow-hidden flex flex-col">
          <div className="px-4 py-4 border-b space-y-3">
            <div>
              <h2 className="font-semibold">Templates</h2>
              <p className="text-sm text-gray-500">
                {filteredTemplates.length} template{filteredTemplates.length === 1 ? '' : 's'}
              </p>
            </div>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, category, content..."
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
            />

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              {defaultCategories.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <button
              onClick={resetForm}
              className="w-full px-4 py-2 rounded-lg border"
            >
              + New Template
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-3 space-y-3">
            {loading ? (
              <div className="text-sm text-gray-500">Loading templates...</div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-sm text-gray-500">No templates found.</div>
            ) : (
              filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setSelectedId(template.id)}
                  className={`w-full text-left border rounded-xl p-4 transition ${
                    selectedId === template.id
                      ? 'bg-blue-100 border-blue-300'
                      : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{template.title}</div>
                    <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                      {template.category}
                    </span>
                  </div>

                  <div className="mt-2 text-sm text-gray-600 line-clamp-3">
                    {template.content}
                  </div>

                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyTemplate(template.content);
                      }}
                      className="text-sm px-3 py-1 rounded-lg border"
                    >
                      Copy
                    </button>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* 右边编辑器 */}
        <div className="border rounded-2xl bg-white overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b">
            <h2 className="text-xl font-semibold">
              {selectedId ? 'Edit Template' : 'Create New Template'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Build reusable scripts for WhatsApp sales conversations.
            </p>
          </div>

          <div className="p-5 overflow-y-auto space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Template Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. First inquiry welcome"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CategoryFilter)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  {defaultCategories
                    .filter((item) => item.value !== 'all')
                    .map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1">Template Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your WhatsApp template here..."
                className="w-full min-h-[260px] border rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div className="border rounded-xl p-4 bg-gray-50">
              <div className="text-sm text-gray-500 mb-2">Preview</div>
              <div className="whitespace-pre-wrap text-sm text-gray-800">
                {content || 'Your template preview will appear here.'}
              </div>
            </div>

            <div className="flex gap-3 flex-wrap">
              <button
                onClick={saveTemplate}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
              >
                {saving ? 'Saving...' : selectedId ? 'Update Template' : 'Save Template'}
              </button>

              <button
                onClick={() => copyTemplate(content)}
                disabled={!content.trim()}
                className="px-4 py-2 rounded-lg border disabled:opacity-50"
              >
                Copy Content
              </button>

              {selectedId ? (
                <button
                  onClick={deleteTemplate}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg border border-red-300 text-red-600 disabled:opacity-50"
                >
                  Delete Template
                </button>
              ) : null}
            </div>

            <div className="border rounded-xl p-4 bg-yellow-50 border-yellow-200">
              <div className="font-medium text-yellow-800">Suggested categories</div>
              <ul className="mt-2 text-sm text-yellow-700 space-y-1">
                <li>• First Contact: welcome new leads</li>
                <li>• Price: answer budget and pricing questions</li>
                <li>• Location: explain area and project location</li>
                <li>• Follow Up: remind and re-engage leads</li>
                <li>• Reactivation: wake up old leads</li>
                <li>• Closing: push toward appointment or booking</li>
              </ul>
            </div>
          </div>
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