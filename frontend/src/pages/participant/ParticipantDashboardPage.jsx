import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import api from '../../api/client';
import Loader from '../../components/Loader';

export default function ParticipantDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [team, setTeam] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [projectRes, teamRes] = await Promise.allSettled([
        api.get('/projects/assigned'),
        api.get('/teams/me')
      ]);
      setProjects(projectRes.status === 'fulfilled' ? projectRes.value.data : []);
      setTeam(teamRes.status === 'fulfilled' ? teamRes.value.data : null);
      setLoading(false);
    };

    load();
  }, []);

  const stats = useMemo(() => {
    const total = projects.length;
    const completed = projects.filter((p) => p.status === 'completed').length;
    const inProgress = projects.filter((p) => p.status === 'in-progress').length;
    return { total, completed, inProgress };
  }, [projects]);

  return (
    <DashboardLayout title="Participant Dashboard">
      {loading ? <Loader /> : (
        <div className="grid gap-6 md:grid-cols-3">
          <section className="rounded bg-white p-4 shadow">
            <p className="text-sm text-slate-500">My Team</p>
            <p className="text-xl font-semibold">{team?.name || 'Not Joined'}</p>
          </section>
          <section className="rounded bg-white p-4 shadow">
            <p className="text-sm text-slate-500">Assigned Projects</p>
            <p className="text-xl font-semibold">{stats.total}</p>
          </section>
          <section className="rounded bg-white p-4 shadow">
            <p className="text-sm text-slate-500">Completed</p>
            <p className="text-xl font-semibold text-emerald-600">{stats.completed}</p>
            <p className="text-xs text-slate-500">In Progress: {stats.inProgress}</p>
          </section>

          <section className="rounded bg-white p-4 shadow md:col-span-3">
            <h2 className="mb-2 font-semibold">Quick Links</h2>
            <div className="grid gap-2 md:grid-cols-4">
              <Link to="/participant/my-team" className="rounded border p-2 text-sm hover:bg-slate-50">My Team</Link>
              <Link to="/participant/assigned-projects" className="rounded border p-2 text-sm hover:bg-slate-50">Assigned Projects</Link>
              <Link to="/participant/news" className="rounded border p-2 text-sm hover:bg-slate-50">News</Link>
              <Link to="/participant/requests" className="rounded border p-2 text-sm hover:bg-slate-50">Join Requests</Link>
            </div>
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}
