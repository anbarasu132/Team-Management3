import { useEffect, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import api from '../../api/client';
import Loader from '../../components/Loader';
import ConfirmDialog from '../../components/ConfirmDialog';

export default function LeaderRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState(null);
  const [teamName, setTeamName] = useState('');
  const [teamCreationRequests, setTeamCreationRequests] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [message, setMessage] = useState('');
  const [pendingAction, setPendingAction] = useState(null);

  const load = async () => {
    setLoading(true);
    const [teamRes, teamReqRes, joinReqRes] = await Promise.allSettled([
      api.get('/teams/me'),
      api.get('/teams/team-requests/me'),
      api.get('/teams/join-requests/incoming')
    ]);

    setTeam(teamRes.status === 'fulfilled' ? teamRes.value.data : null);
    setTeamCreationRequests(teamReqRes.status === 'fulfilled' ? teamReqRes.value.data : []);
    setJoinRequests(joinReqRes.status === 'fulfilled' ? joinReqRes.value.data : []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const createTeamRequest = async (e) => {
    e.preventDefault();
    await api.post('/teams', { name: teamName });
    setTeamName('');
    setMessage('Team creation request sent to admin');
    load();
  };

  const respondJoinRequest = async () => {
    await api.put(`/teams/join-requests/${pendingAction.requestId}/respond`, { status: pendingAction.status });
    setMessage(`Join request ${pendingAction.status}`);
    setPendingAction(null);
    load();
  };

  return (
    <DashboardLayout title="Requests">
      {loading ? <Loader /> : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded bg-white p-4 shadow">
            <h2 className="mb-2 font-semibold">Team Creation Requests (To Admin)</h2>
            {!team && (
              <form onSubmit={createTeamRequest} className="mb-3 space-y-2">
                <input className="w-full rounded border p-2" placeholder="Team Name" required value={teamName} onChange={(e) => setTeamName(e.target.value)} />
                <button className="rounded bg-slate-900 px-3 py-2 text-white">Send Request</button>
              </form>
            )}
            {team && <p className="mb-3 text-sm text-slate-600">Your team already exists: {team.name}</p>}
            <div className="max-h-56 overflow-auto text-sm">
              {teamCreationRequests.length === 0 ? <p className="text-slate-500">No team requests yet.</p> : teamCreationRequests.map((r) => (
                <p key={r.id} className="border-b py-1">#{r.id} {r.team_name} | {r.status}</p>
              ))}
            </div>
          </section>

          <section className="rounded bg-white p-4 shadow">
            <h2 className="mb-2 font-semibold">Participant Join Requests</h2>
            <div className="max-h-72 overflow-auto text-sm">
              {joinRequests.length === 0 ? <p className="text-slate-500">No join requests.</p> : joinRequests.map((r) => (
                <div key={r.id} className="mb-2 rounded border p-2">
                  <p>#{r.id} | {r.participant_name} ({r.participant_email})</p>
                  <p>Status: {r.status}</p>
                  {r.status === 'pending' && (
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => setPendingAction({ requestId: r.id, status: 'approved' })} className="rounded bg-emerald-600 px-2 py-1 text-white">Approve</button>
                      <button type="button" onClick={() => setPendingAction({ requestId: r.id, status: 'rejected' })} className="rounded bg-red-600 px-2 py-1 text-white">Reject</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {message && <p className="rounded bg-emerald-100 p-2 text-sm text-emerald-700 lg:col-span-2">{message}</p>}
          <ConfirmDialog
            open={Boolean(pendingAction)}
            title={pendingAction?.status === 'approved' ? 'Approve Join Request' : 'Reject Join Request'}
            message={
              pendingAction?.status === 'approved'
                ? 'Approve this participant join request?'
                : 'Reject this participant join request?'
            }
            confirmText={pendingAction?.status === 'approved' ? 'Yes, Approve' : 'Yes, Reject'}
            danger={pendingAction?.status !== 'approved'}
            onConfirm={respondJoinRequest}
            onCancel={() => setPendingAction(null)}
          />
        </div>
      )}
    </DashboardLayout>
  );
}
