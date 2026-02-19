import Sidebar from '../components/Sidebar';

export default function DashboardLayout({ children, title }) {
  return (
    <div className="min-h-screen bg-slate-100 md:flex">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8">
        <h1 className="mb-6 text-2xl font-bold text-slate-800">{title}</h1>
        {children}
      </main>
    </div>
  );
}
