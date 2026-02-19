import { useState } from 'react';
import Sidebar from '../components/Sidebar';

export default function DashboardLayout({ children, title }) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 md:flex">
      <Sidebar isMobileOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />
      <main className="flex-1 p-4 md:p-8">
        <div className="mb-4 flex items-center gap-3 md:hidden">
          <button
            type="button"
            className="rounded bg-slate-900 p-2 text-white"
            onClick={() => setIsMobileNavOpen(true)}
            aria-label="Open navigation"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="text-sm font-medium text-slate-600">Menu</span>
        </div>
        <h1 className="mb-6 text-2xl font-bold text-slate-800">{title}</h1>
        {children}
      </main>
    </div>
  );
}
