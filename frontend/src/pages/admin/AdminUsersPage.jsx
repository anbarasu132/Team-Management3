import { useEffect, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import api from '../../api/client';
import Loader from '../../components/Loader';
import ConfirmDialog from '../../components/ConfirmDialog';

function roleStyles(role) {
  if (role === 'admin') return 'bg-rose-100 text-rose-700';
  if (role === 'leader') return 'bg-emerald-100 text-emerald-700';
  if (role === 'co-leader') return 'bg-amber-100 text-amber-700';
  return 'bg-blue-100 text-blue-700';
}

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0, limit: 10 });
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [role, setRole] = useState('');
  const [deleteUserTarget, setDeleteUserTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    if (!initialized) setLoading(true);
    api.get('/admin/users', { params: { page: pagination.page, limit: pagination.limit, q: debouncedQ, role } })
      .then((res) => {
        setUsers(res.data.items || []);
        setPagination((prev) => ({ ...prev, ...(res.data.pagination || prev) }));
      })
      .finally(() => {
        setLoading(false);
        if (!initialized) setInitialized(true);
      });
  }, [pagination.page, pagination.limit, debouncedQ, role]);

  const handleDeleteUser = async () => {
    if (!deleteUserTarget) return;
    setDeletingId(deleteUserTarget.id);
    try {
      await api.delete(`/admin/users/${deleteUserTarget.id}`);
      setUsers((prev) => prev.filter((u) => u.id !== deleteUserTarget.id));
      setPagination((prev) => ({ ...prev, total: Math.max((prev.total || 1) - 1, 0) }));
    } finally {
      setDeletingId(null);
      setDeleteUserTarget(null);
    }
  };

  return (
    <DashboardLayout title="All Users">
      {loading && !initialized ? <Loader /> : (
        <section className="rounded bg-white p-4 shadow">
          <div className="mb-3 grid gap-2 md:grid-cols-3">
            <input
              className="rounded border p-2 text-sm"
              placeholder="Search name/email..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
            />
            <select
              className="rounded border p-2 text-sm"
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
            >
              <option value="">All roles</option>
              <option value="admin">admin</option>
              <option value="leader">leader</option>
              <option value="co-leader">co-leader</option>
              <option value="participant">participant</option>
            </select>
            <p className="self-center text-sm text-slate-600">Total: {pagination.total || 0}</p>
          </div>
          <div className="max-h-[72vh] overflow-auto">
            {users.length === 0 && <p className="text-slate-500">No users found.</p>}
            {users.map((u) => (
              <div key={u.id} className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-800">#{u.id} {u.name}</p>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${roleStyles(u.role)}`}>
                    {u.role}
                  </span>
                </div>
                <p className="text-sm text-slate-700">Email: {u.email}</p>
                <p className="text-sm text-slate-600">Team ID: {u.team_id || 'Not assigned'}</p>
                <div className="mt-2">
                  <button
                    onClick={() => setDeleteUserTarget(u)}
                    disabled={deletingId === u.id}
                    className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {deletingId === u.id ? 'Deleting...' : 'Delete User'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <button
              disabled={(pagination.page || 1) <= 1}
              onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(1, (prev.page || 1) - 1) }))}
              className="rounded border px-3 py-1 disabled:opacity-50"
            >
              Previous
            </button>
            <span>Page {pagination.page || 1} of {pagination.total_pages || 1}</span>
            <button
              disabled={(pagination.page || 1) >= (pagination.total_pages || 1)}
              onClick={() => setPagination((prev) => ({ ...prev, page: Math.min(prev.total_pages || 1, (prev.page || 1) + 1) }))}
              className="rounded border px-3 py-1 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </section>
      )}
      <ConfirmDialog
        open={Boolean(deleteUserTarget)}
        title="Delete User"
        message={deleteUserTarget ? `Delete ${deleteUserTarget.name} (${deleteUserTarget.email})? This cannot be undone.` : ''}
        confirmText="Delete"
        danger
        onConfirm={handleDeleteUser}
        onCancel={() => setDeleteUserTarget(null)}
      />
    </DashboardLayout>
  );
}
