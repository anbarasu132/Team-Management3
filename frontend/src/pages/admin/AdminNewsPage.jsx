import { useEffect, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import api from '../../api/client';
import Loader from '../../components/Loader';
import ConfirmDialog from '../../components/ConfirmDialog';

export default function AdminNewsPage() {
  const [loading, setLoading] = useState(true);
  const [news, setNews] = useState([]);
  const [form, setForm] = useState({ title: '', content: '' });
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  const load = async () => {
    setLoading(true);
    const res = await api.get('/public/home');
    setNews(res.data.news || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (editingId) {
      await api.put(`/admin/news/${editingId}`, form);
      setMessage('News updated');
      setEditingId(null);
    } else {
      await api.post('/admin/news', form);
      setMessage('News created');
    }
    setForm({ title: '', content: '' });
    load();
  };

  const onEdit = (item) => {
    setEditingId(item.id);
    setForm({ title: item.title, content: item.content });
  };

  const onDelete = async () => {
    await api.delete(`/admin/news/${deleteId}`);
    setMessage('News deleted');
    setDeleteId(null);
    load();
  };

  return (
    <DashboardLayout title="News Management">
      {loading ? <Loader /> : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded bg-white p-4 shadow">
            <form onSubmit={submit} className="space-y-2">
              <input className="w-full rounded border p-2" placeholder="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <textarea className="w-full rounded border p-2" placeholder="Content" required value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
              <button className="rounded bg-slate-900 px-3 py-2 text-white">{editingId ? 'Update News' : 'Create News'}</button>
            </form>
          </section>
          <section className="rounded bg-white p-4 shadow">
            <div className="max-h-[62vh] overflow-auto text-sm">
              {news.length === 0 && <p className="text-slate-500">No news available.</p>}
              {news.map((n) => (
                <div key={n.id} className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-1 font-semibold text-slate-800">{n.title}</p>
                  <p className="rounded bg-sky-50 p-2 text-slate-700">{n.content}</p>
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => onEdit(n)} className="rounded bg-blue-600 px-2 py-1 text-white">Edit</button>
                    <button onClick={() => setDeleteId(n.id)} className="rounded bg-red-600 px-2 py-1 text-white">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
          {message && <p className="rounded bg-emerald-100 p-2 text-sm text-emerald-700 lg:col-span-2">{message}</p>}
          <ConfirmDialog
            open={Boolean(deleteId)}
            title="Delete News"
            message="This action will permanently delete this news item. Continue?"
            confirmText="Yes, Delete"
            danger
            onConfirm={onDelete}
            onCancel={() => setDeleteId(null)}
          />
        </div>
      )}
    </DashboardLayout>
  );
}
