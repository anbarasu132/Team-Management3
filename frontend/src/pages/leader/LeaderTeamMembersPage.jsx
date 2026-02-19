import { useEffect, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import api from '../../api/client';
import Loader from '../../components/Loader';
import SearchableSelect from '../../components/SearchableSelect';
import ConfirmDialog from '../../components/ConfirmDialog';

export default function LeaderTeamMembersPage() {
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState(null);
  const [coLeaderId, setCoLeaderId] = useState('');
  const [removeParticipantId, setRemoveParticipantId] = useState('');
  const [message, setMessage] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/teams/me');
      setTeam(res.data);
    } catch {
      setTeam(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const assignCoLeader = async (e) => {
    e.preventDefault();
    await api.put('/teams/assign-co-leader', { userId: Number(coLeaderId) });
    setCoLeaderId('');
    setMessage('Co-leader assigned');
    load();
  };

  const removeParticipant = async () => {
    await api.delete(`/teams/participants/${Number(removeParticipantId)}`);
    setRemoveParticipantId('');
    setMessage('Participant removed');
    setConfirmOpen(false);
    load();
  };

  const participantOptions = (team?.members || [])
    .filter((m) => m.role === 'participant')
    .map((m) => ({ value: m.id, label: `${m.id} | ${m.name} (${m.email})` }));

  const coLeaderOptions = (team?.members || [])
    .filter((m) => m.role === 'participant' || m.role === 'co-leader')
    .map((m) => ({ value: m.id, label: `${m.id} | ${m.name} (${m.role})` }));

  return (
    <DashboardLayout title="Team Members">
      {loading ? <Loader /> : (
        <div className="grid gap-6 lg:grid-cols-2">
          {!team ? (
            <section className="rounded bg-white p-4 shadow lg:col-span-2">
              <p className="text-sm text-slate-600">No team available yet. Wait for admin approval from Requests page.</p>
            </section>
          ) : (
            <>
              <section className="rounded bg-white p-4 shadow">
                <h2 className="mb-2 font-semibold">Current Members</h2>
                <div className="max-h-72 overflow-auto text-sm">
                  {team.members?.map((m) => (
                    <p key={m.id} className="border-b py-1">{m.id} | {m.name} ({m.role})</p>
                  ))}
                </div>
              </section>

              <section className="rounded bg-white p-4 shadow">
                <h2 className="mb-2 font-semibold">Assign Co-Leader</h2>
                <form onSubmit={assignCoLeader} className="space-y-2">
                  <SearchableSelect
                    label="Select Participant"
                    placeholder="Search participant by name/id..."
                    options={coLeaderOptions}
                    value={coLeaderId}
                    onChange={setCoLeaderId}
                  />
                  <button disabled={!coLeaderId} className="rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-60">Assign</button>
                </form>

                <h2 className="mb-2 mt-4 font-semibold">Remove Participant</h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (removeParticipantId) setConfirmOpen(true);
                  }}
                  className="space-y-2"
                >
                  <SearchableSelect
                    label="Select Participant"
                    placeholder="Search participant by name/id..."
                    options={participantOptions}
                    value={removeParticipantId}
                    onChange={setRemoveParticipantId}
                  />
                  <button disabled={!removeParticipantId} className="rounded bg-red-600 px-3 py-2 text-white disabled:opacity-60">Remove</button>
                </form>
              </section>
            </>
          )}
          {message && <p className="rounded bg-emerald-100 p-2 text-sm text-emerald-700 lg:col-span-2">{message}</p>}
          <ConfirmDialog
            open={confirmOpen}
            title="Remove Participant"
            message="This will remove the participant from your team. Continue?"
            confirmText="Yes, Remove"
            danger
            onConfirm={removeParticipant}
            onCancel={() => setConfirmOpen(false)}
          />
        </div>
      )}
    </DashboardLayout>
  );
}
