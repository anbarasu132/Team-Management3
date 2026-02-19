import { useEffect, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import api from '../../api/client';
import Loader from '../../components/Loader';
import ConfirmDialog from '../../components/ConfirmDialog';

export default function AdminTeamRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [requests, setRequests] = useState([]);
  const [message, setMessage] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0, limit: 10 });
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [debouncedStatusFilter, setDebouncedStatusFilter] = useState('');

  const load = async () => {
    if (!initialized) setLoading(true);
    const res = await api.get('/admin/team-requests', {
      params: {
        page: pagination.page,
        limit: pagination.limit,
        q: debouncedQ,
        status: debouncedStatusFilter
      }
    });
    setRequests(res.data.items || []);
    setPagination((prev) => ({ ...prev, ...(res.data.pagination || prev) }));
    setLoading(false);
    if (!initialized) setInitialized(true);
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedStatusFilter(statusFilter), 150);
    return () => clearTimeout(timer);
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [pagination.page, pagination.limit, debouncedQ, debouncedStatusFilter]);

  const respond = async () => {
    await api.put(`/admin/team-requests/${pendingAction.requestId}/respond`, { status: pendingAction.status });
    setMessage(`Request ${pendingAction.status}`);
    setPendingAction(null);
    load();
  };

  return (
    <DashboardLayout title="Team Requests">
      {loading && !initialized ? <Loader /> : (
        <section className="rounded bg-white p-4 shadow">
          <div className="mb-3 grid gap-2 md:grid-cols-3">
            <input
              className="rounded border p-2 text-sm"
              placeholder="Search team/leader/email..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
            />
            <select
              className="rounded border p-2 text-sm"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
            >
              <option value="">All status</option>
              <option value="pending">pending</option>
              <option value="approved">approved</option>
              <option value="rejected">rejected</option>
            </select>
            <p className="self-center text-sm text-slate-600">Total: {pagination.total || 0}</p>
          </div>
          <div className="max-h-[72vh] overflow-auto">
            {requests.length === 0 && <p className="text-slate-500">No requests found.</p>}
            {requests.map((r) => (
              <div key={r.id} className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-semibold text-slate-800">Request #{r.id}</p>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${r.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : r.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {r.status}
                  </span>
                </div>
                <p className="text-sm"><span className="font-medium">Team:</span> {r.team_name}</p>
                <p className="text-sm"><span className="font-medium">Leader:</span> {r.leader_name} ({r.leader_email})</p>
                {r.status === 'pending' && (
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => setPendingAction({ requestId: r.id, status: 'approved' })} className="rounded bg-emerald-600 px-2 py-1 text-white">Approve</button>
                    <button onClick={() => setPendingAction({ requestId: r.id, status: 'rejected' })} className="rounded bg-red-600 px-2 py-1 text-white">Reject</button>
                  </div>
                )}
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
          {message && <p className="mt-3 rounded bg-emerald-100 p-2 text-sm text-emerald-700">{message}</p>}
          <ConfirmDialog
            open={Boolean(pendingAction)}
            title={pendingAction?.status === 'approved' ? 'Approve Team Request' : 'Reject Team Request'}
            message={
              pendingAction?.status === 'approved'
                ? 'Approve this request and create the team?'
                : 'Reject this team creation request?'
            }
            confirmText={pendingAction?.status === 'approved' ? 'Yes, Approve' : 'Yes, Reject'}
            danger={pendingAction?.status !== 'approved'}
            onConfirm={respond}
            onCancel={() => setPendingAction(null)}
          />
        </section>
      )}
    </DashboardLayout>
  );
}
