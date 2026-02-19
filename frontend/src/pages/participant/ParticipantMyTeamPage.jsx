import { useEffect, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import api from '../../api/client';
import Loader from '../../components/Loader';

export default function ParticipantMyTeamPage() {
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState(null);

  useEffect(() => {
    api.get('/teams/me')
      .then((res) => setTeam(res.data))
      .catch(() => setTeam(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout title="My Team">
      {loading ? <Loader /> : (
        <section className="rounded bg-white p-4 shadow">
          {!team ? (
            <p className="text-sm text-slate-600">You are not assigned to any team yet.</p>
          ) : (
            <>
              <h2 className="text-lg font-semibold">{team.name}</h2>
              <p className="text-sm text-slate-600">Leader: {team.leader_name || '-'}</p>
              <p className="text-sm text-slate-600">Co-Leader: {team.co_leader_name || '-'}</p>
              <div className="mt-3 max-h-[60vh] overflow-auto text-sm">
                {team.members?.map((m) => (
                  <p key={m.id} className="border-b py-1">{m.id} | {m.name} ({m.role})</p>
                ))}
              </div>
            </>
          )}
        </section>
      )}
    </DashboardLayout>
  );
}
