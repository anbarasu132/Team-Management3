import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import Loader from '../../components/Loader';

export default function HomePage() {
  const [data, setData] = useState({ news: [], vacancies: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/public/home').then((res) => setData(res.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-200 px-4 py-8 md:px-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 rounded-xl bg-slate-900 p-8 text-white shadow-lg">
          <h1 className="text-3xl font-bold md:text-4xl">Team Management Platform</h1>
          <p className="mt-3 text-slate-300">Manage teams, projects, and progress with role-based workflows.</p>
          <div className="mt-5 flex gap-3">
            <Link to="/register" className="rounded bg-emerald-500 px-4 py-2 text-sm font-medium hover:bg-emerald-600">Register</Link>
            <Link to="/login" className="rounded bg-blue-500 px-4 py-2 text-sm font-medium hover:bg-blue-600">Login</Link>
          </div>
        </header>

        {loading ? <Loader /> : (
          <div className="grid gap-6 md:grid-cols-2">
            <section className="rounded-xl bg-white p-5 shadow">
              <h2 className="mb-4 text-xl font-semibold text-slate-800">Admin News</h2>
              {data.news.length === 0 ? <p className="text-sm text-slate-500">No news yet.</p> : (
                <ul className="space-y-3">{data.news.map((item) => (
                  <li key={item.id} className="rounded border p-3"><h3 className="font-semibold">{item.title}</h3><p className="text-sm text-slate-600">{item.content}</p></li>
                ))}</ul>
              )}
            </section>
            <section className="rounded-xl bg-white p-5 shadow">
              <h2 className="mb-4 text-xl font-semibold text-slate-800">Open Team Vacancies</h2>
              {data.vacancies.length === 0 ? <p className="text-sm text-slate-500">No vacancies available.</p> : (
                <ul className="space-y-3">{data.vacancies.map((item) => (
                  <li key={item.id} className="rounded border p-3"><h3 className="font-semibold">{item.title} ({item.slots_available} slots)</h3><p className="text-sm text-slate-600">{item.description}</p></li>
                ))}</ul>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
