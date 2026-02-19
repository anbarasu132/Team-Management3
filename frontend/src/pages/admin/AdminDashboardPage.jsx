import { useEffect, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import api from '../../api/client';
import Loader from '../../components/Loader';

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    api.get('/admin/teams/performance')
      .then((res) => setTeams(res.data || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout title="Admin Dashboard">
      {loading ? <Loader /> : (
        <section className="rounded bg-white p-4 shadow">
          <h2 className="mb-3 text-lg font-semibold">Available Teams (Ordered by Performance)</h2>
          <div className="max-h-[70vh] overflow-auto">
            {teams.length === 0 && <p className="text-slate-500">No teams available.</p>}
            {teams.map((t, index) => (
              <div key={t.id} className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-semibold text-slate-800">#{index + 1} {t.name}</p>
                  <span className="rounded-full bg-violet-100 px-2 py-1 text-xs font-medium text-violet-700">
                    {t.completion_rate}% performance
                  </span>
                </div>

                <div className="grid gap-2 text-sm md:grid-cols-2">
                  <p className="rounded bg-emerald-100 px-2 py-1 text-emerald-800"><span className="font-medium">Leader:</span> {t.leader_name || '-'}</p>
                  <p className="rounded bg-amber-100 px-2 py-1 text-amber-800"><span className="font-medium">Co-Leader:</span> {t.co_leader_name || '-'}</p>
                  <p className="rounded bg-indigo-100 px-2 py-1 text-indigo-800"><span className="font-medium">Participants:</span> {t.participant_count}/8</p>
                  <p className="rounded bg-sky-100 px-2 py-1 text-sky-800"><span className="font-medium">Projects:</span> {t.completed_projects}/{t.total_projects} completed</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </DashboardLayout>
  );
}
