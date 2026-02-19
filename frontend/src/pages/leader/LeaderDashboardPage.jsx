import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import api from '../../api/client';
import Loader from '../../components/Loader';

export default function LeaderDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState(null);
  const [analytics, setAnalytics] = useState({ summary: {}, weekly_trend: [], member_performance: [] });
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      const [teamRes, analyticsRes] = await Promise.allSettled([
        api.get('/teams/me'),
        api.get('/projects/analytics/team')
      ]);

      if (teamRes.status === 'fulfilled') {
        setTeam(teamRes.value.data);
      } else {
        setTeam(null);
        const status = teamRes.reason?.response?.status;
        if (status !== 404) setError('Failed to load team details.');
      }

      if (analyticsRes.status === 'fulfilled') {
        setAnalytics(analyticsRes.value.data || { summary: {}, weekly_trend: [], member_performance: [] });
      } else {
        setAnalytics({ summary: {}, weekly_trend: [], member_performance: [] });
      }

      setLoading(false);
    };

    load();
  }, []);

  const summary = analytics.summary || {};
  const progressBars = useMemo(() => [
    { label: 'Pending', color: 'bg-amber-500', value: Number(summary.pending_projects || 0) },
    { label: 'In Progress', color: 'bg-blue-500', value: Number(summary.in_progress_projects || 0) },
    { label: 'Completed', color: 'bg-emerald-500', value: Number(summary.completed_projects || 0) }
  ], [summary]);

  const maxTrend = Math.max(1, ...(analytics.weekly_trend || []).map((w) => Math.max(w.created, w.completed)));

  return (
    <DashboardLayout title="Leader Dashboard">
      {loading ? <Loader /> : (
        <div className="grid gap-6 lg:grid-cols-3">
          {error && <p className="rounded bg-red-100 p-2 text-sm text-red-700 lg:col-span-3">{error}</p>}

          {!team ? (
            <section className="rounded bg-white p-4 shadow lg:col-span-3">
              <h2 className="text-lg font-semibold">No Team Yet</h2>
              <p className="mt-1 text-sm text-slate-600">Send a team creation request to admin first.</p>
              <Link to="/leader/requests" className="mt-3 inline-block rounded bg-slate-900 px-3 py-2 text-sm text-white">Go To Requests</Link>
            </section>
          ) : (
            <>
              <section className="rounded bg-white p-4 shadow">
                <p className="text-sm text-slate-500">Team</p>
                <h2 className="text-xl font-semibold">{team.name}</h2>
                <p className="text-sm text-slate-600">Leader: {team.leader_name}</p>
                <p className="text-sm text-slate-600">Co-Leader: {team.co_leader_name || '-'}</p>
              </section>

              <section className="rounded bg-white p-4 shadow">
                <p className="text-sm text-slate-500">Project Completion</p>
                <h2 className="text-3xl font-bold text-emerald-600">{summary.completion_rate || 0}%</h2>
                <p className="text-sm text-slate-600">{summary.completed_projects || 0}/{summary.total_projects || 0} completed</p>
              </section>

              <section className="rounded bg-white p-4 shadow">
                <p className="text-sm text-slate-500">Risk Watch</p>
                <p className="text-sm text-red-700">Overdue: <span className="font-semibold">{summary.overdue_projects || 0}</span></p>
                <p className="text-sm text-amber-700">Due in 7 days: <span className="font-semibold">{summary.upcoming_7_days || 0}</span></p>
                <p className="text-xs text-slate-500 mt-1">Avg completed/week (last 4): {summary.avg_completed_per_week_last_4_weeks || 0}</p>
              </section>

              <section className="rounded bg-white p-4 shadow lg:col-span-2">
                <h3 className="mb-3 font-semibold">Status Distribution</h3>
                <div className="space-y-3">
                  {progressBars.map((item) => {
                    const total = Number(summary.total_projects || 0);
                    const pct = total === 0 ? 0 : Math.round((item.value * 100) / total);
                    return (
                      <div key={item.label}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span>{item.label}</span>
                          <span>{item.value} ({pct}%)</span>
                        </div>
                        <div className="h-3 w-full rounded bg-slate-200">
                          <div className={`h-3 rounded ${item.color}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded bg-white p-4 shadow">
                <h3 className="mb-2 font-semibold">Quick Navigation</h3>
                <div className="space-y-2 text-sm">
                  <Link className="block rounded border p-2 hover:bg-slate-50" to="/leader/team-members">Manage Team Members</Link>
                  <Link className="block rounded border p-2 hover:bg-slate-50" to="/leader/projects">Manage Projects</Link>
                  <Link className="block rounded border p-2 hover:bg-slate-50" to="/leader/requests">Review Requests</Link>
                  <Link className="block rounded border p-2 hover:bg-slate-50" to="/leader/news">View Admin News</Link>
                </div>
              </section>

              <section className="rounded bg-white p-4 shadow lg:col-span-3">
                <h3 className="mb-3 font-semibold">Weekly Trend (Created vs Completed)</h3>
                <div className="grid gap-3 md:grid-cols-6">
                  {(analytics.weekly_trend || []).map((w) => {
                    const createdPct = Math.round((w.created / maxTrend) * 100);
                    const completedPct = Math.round((w.completed / maxTrend) * 100);
                    return (
                      <div key={w.week_start} className="rounded border p-2 text-xs">
                        <p className="mb-1 font-medium">{w.week_start}</p>
                        <div className="h-20 flex items-end gap-1">
                          <div className="w-1/2 rounded-t bg-blue-500" style={{ height: `${createdPct}%` }} title={`Created: ${w.created}`} />
                          <div className="w-1/2 rounded-t bg-emerald-500" style={{ height: `${completedPct}%` }} title={`Completed: ${w.completed}`} />
                        </div>
                        <p className="mt-1 text-slate-600">Crt {w.created} | Cmp {w.completed}</p>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded bg-white p-4 shadow lg:col-span-3">
                <h3 className="mb-3 font-semibold">Member Performance</h3>
                <div className="max-h-64 overflow-auto text-sm">
                  {(analytics.member_performance || []).map((m) => (
                    <div key={m.id} className="mb-2 rounded border p-2">
                      <p className="font-medium">{m.name} ({m.role})</p>
                      <p>Assigned: {m.assigned_projects} | Completed: {m.completed_projects} | Rate: {m.completion_rate}%</p>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
