import { useEffect, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import api from '../../api/client';
import Loader from '../../components/Loader';

export default function ParticipantRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [openTeams, setOpenTeams] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    const [teamsRes, requestRes] = await Promise.all([
      api.get('/teams/open'),
      api.get('/teams/join-requests/me')
    ]);
    setOpenTeams(teamsRes.data || []);
    setJoinRequests(requestRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const requestJoinTeam = async (teamId) => {
    await api.post('/teams/join-requests', { teamId });
    setMessage('Join request sent to leader');
    load();
  };

  return (
    <DashboardLayout title="Requests">
      {loading ? <Loader /> : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded bg-white p-4 shadow">
            <h2 className="mb-3 font-semibold">Request To Join Team</h2>
            <div className="space-y-2">
              {openTeams.length === 0 && <p className="text-sm text-slate-600">No teams available.</p>}
              {openTeams.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded border p-3">
                  <div>
                    <p className="font-semibold">{t.name}</p>
                    <p className="text-sm text-slate-600">Leader: {t.leader_name} | Participants: {t.participant_count}/8</p>
                  </div>
                  <button onClick={() => requestJoinTeam(t.id)} className="rounded bg-slate-900 px-3 py-1 text-sm text-white">Request Join</button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded bg-white p-4 shadow">
            <h2 className="mb-3 font-semibold">My Join Requests</h2>
            <div className="space-y-2 text-sm">
              {joinRequests.length === 0 && <p className="text-slate-600">No join requests yet.</p>}
              {joinRequests.map((r) => (
                <p key={r.id} className="rounded border p-2">
                  #{r.id} | Team: {r.team_name} | Leader: {r.leader_name} | Status: {r.status}
                </p>
              ))}
            </div>
          </section>

          {message && <p className="rounded bg-emerald-100 p-2 text-sm text-emerald-700 lg:col-span-2">{message}</p>}
        </div>
      )}
    </DashboardLayout>
  );
}
