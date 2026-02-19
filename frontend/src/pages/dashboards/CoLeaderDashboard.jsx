import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import api from '../../api/client';
import Loader from '../../components/Loader';

export default function CoLeaderDashboard() {
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState(null);
  const [projects, setProjects] = useState([]);
  const [analytics, setAnalytics] = useState({ summary: {}, weekly_trend: [], member_performance: [] });

  useEffect(() => {
    Promise.allSettled([api.get('/teams/me'), api.get('/projects/team'), api.get('/projects/analytics/team')])
      .then(([teamRes, projRes, analyticsRes]) => {
        setTeam(teamRes.status === 'fulfilled' ? teamRes.value.data : null);
        setProjects(projRes.status === 'fulfilled' ? (projRes.value.data.items || []) : []);
        setAnalytics(analyticsRes.status === 'fulfilled' ? (analyticsRes.value.data || { summary: {}, weekly_trend: [], member_performance: [] }) : { summary: {}, weekly_trend: [], member_performance: [] });
      })
      .finally(() => setLoading(false));
  }, []);

  const summary = analytics.summary || {};
  const maxTrend = useMemo(() => Math.max(1, ...(analytics.weekly_trend || []).map((w) => Math.max(w.created, w.completed))), [analytics.weekly_trend]);

  return (
    <DashboardLayout title="Co-Leader Dashboard">
      {loading ? <Loader /> : (
        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded bg-white p-4 shadow">
            <h2 className="mb-2 font-semibold">Team Details</h2>
            {team ? (
              <>
                <p>Name: {team.name}</p><p>Leader: {team.leader_name}</p><p>Co-Leader: {team.co_leader_name || '-'}</p>
                <p className="mt-2 text-sm font-medium">Members</p>
                <div className="max-h-48 overflow-auto text-sm">{team.members.map((m) => <p key={m.id} className="border-b py-1">{m.name} ({m.role})</p>)}</div>
              </>
            ) : <p className="text-sm text-slate-600">No team assigned.</p>}
          </section>

          <section className="rounded bg-white p-4 shadow">
            <h2 className="mb-2 font-semibold">Performance Summary</h2>
            <p>Completion Rate: <span className="font-semibold text-emerald-700">{summary.completion_rate || 0}%</span></p>
            <p>Total Projects: {summary.total_projects || 0}</p>
            <p>Completed: {summary.completed_projects || 0}</p>
            <p>In Progress: {summary.in_progress_projects || 0}</p>
            <p>Overdue: <span className="text-red-700">{summary.overdue_projects || 0}</span></p>
            <p>Due in 7 Days: <span className="text-amber-700">{summary.upcoming_7_days || 0}</span></p>
          </section>

          <section className="rounded bg-white p-4 shadow md:col-span-2">
            <h2 className="mb-2 font-semibold">All Team Projects</h2>
            <div className="max-h-56 overflow-auto text-sm">{projects.map((p) => <p key={p.id} className="border-b py-1">{p.title} | {p.status} | Deadline: {String(p.deadline).slice(0, 10)}</p>)}</div>
          </section>

          <section className="rounded bg-white p-4 shadow md:col-span-2">
            <h2 className="mb-2 font-semibold">Weekly Trend</h2>
            <div className="grid gap-3 md:grid-cols-6">
              {(analytics.weekly_trend || []).map((w) => {
                const createdPct = Math.round((w.created / maxTrend) * 100);
                const completedPct = Math.round((w.completed / maxTrend) * 100);
                return (
                  <div key={w.week_start} className="rounded border p-2 text-xs">
                    <p className="mb-1 font-medium">{w.week_start}</p>
                    <div className="h-20 flex items-end gap-1">
                      <div className="w-1/2 rounded-t bg-blue-500" style={{ height: `${createdPct}%` }} />
                      <div className="w-1/2 rounded-t bg-emerald-500" style={{ height: `${completedPct}%` }} />
                    </div>
                    <p className="mt-1 text-slate-600">Crt {w.created} | Cmp {w.completed}</p>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}
