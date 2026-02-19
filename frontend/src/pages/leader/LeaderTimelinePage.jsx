import { useEffect, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import api from '../../api/client';
import Loader from '../../components/Loader';

export default function LeaderTimelinePage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api.get('/teams/audit-logs')
      .then((res) => setLogs(res.data || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout title="Team Timeline">
      {loading ? <Loader /> : (
        <section className="rounded bg-white p-4 shadow">
          <div className="max-h-[72vh] overflow-auto space-y-2">
            {logs.length === 0 && <p className="text-sm text-slate-500">No team timeline entries available.</p>}
            {logs.map((log) => (
              <div key={log.id} className="rounded border border-slate-200 bg-slate-50 p-3 text-sm">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="rounded bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700">{log.method}</span>
                  <span className="rounded bg-slate-200 px-2 py-1 text-xs text-slate-700">{log.status_code}</span>
                  <span className="font-medium">{log.action}</span>
                </div>
                <p className="text-slate-700">{log.path}</p>
                <p className="text-xs text-slate-500">By: {log.user_name || `User #${log.user_id || '-'}`}</p>
                <p className="text-xs text-slate-500">{String(log.created_at).slice(0, 19).replace('T', ' ')}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </DashboardLayout>
  );
}
