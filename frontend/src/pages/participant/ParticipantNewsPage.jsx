import { useEffect, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import api from '../../api/client';
import Loader from '../../components/Loader';

export default function ParticipantNewsPage() {
  const [loading, setLoading] = useState(true);
  const [news, setNews] = useState([]);

  useEffect(() => {
    api.get('/public/home')
      .then((res) => setNews(res.data.news || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout title="News">
      {loading ? <Loader /> : (
        <section className="rounded bg-white p-4 shadow">
          <div className="space-y-2">
            {news.length === 0 && <p className="text-sm text-slate-600">No news available.</p>}
            {news.map((n) => (
              <div key={n.id} className="rounded border p-3">
                <p className="font-semibold">{n.title}</p>
                <p className="text-sm text-slate-600">{n.content}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </DashboardLayout>
  );
}
