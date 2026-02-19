import { useEffect, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import api from '../../api/client';
import Loader from '../../components/Loader';

export default function AdminTeamsPage() {
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [teams, setTeams] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0, limit: 10 });
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    if (!initialized) setLoading(true);
    api.get('/admin/teams', { params: { page: pagination.page, limit: pagination.limit, q: debouncedQ } })
      .then((res) => {
        setTeams(res.data.items || []);
        setPagination((prev) => ({ ...prev, ...(res.data.pagination || prev) }));
      })
      .finally(() => {
        setLoading(false);
        if (!initialized) setInitialized(true);
      });
  }, [pagination.page, pagination.limit, debouncedQ]);

  return (
    <DashboardLayout title="All Teams">
      {loading && !initialized ? <Loader /> : (
        <section className="rounded bg-white p-4 shadow">
          <div className="mb-3 grid gap-2 md:grid-cols-2">
            <input
              className="rounded border p-2 text-sm"
              placeholder="Search team/leader/co-leader..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
            />
            <p className="self-center text-sm text-slate-600">Total: {pagination.total || 0}</p>
          </div>
          <div className="max-h-[72vh] overflow-auto">
            {teams.length === 0 && <p className="text-slate-500">No teams found.</p>}
            {teams.map((t) => (
              <div key={t.id} className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-800">
                    Team #{t.id}: {t.name}
                  </h3>
                  <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700">
                    Participants: {t.participant_count}
                  </span>
                </div>

                <div className="grid gap-2 text-sm md:grid-cols-2">
                  <div className="rounded bg-emerald-100 px-2 py-1 text-emerald-800">
                    <span className="font-medium">Leader:</span> {t.leader_name || 'Not assigned'}
                  </div>
                  <div className="rounded bg-amber-100 px-2 py-1 text-amber-800">
                    <span className="font-medium">Co-Leader:</span> {t.co_leader_name || 'Not assigned'}
                  </div>
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
    </DashboardLayout>
  );
}
