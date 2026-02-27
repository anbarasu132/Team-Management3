import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

const linksByRole = {
  admin: [
    { to: '/admin', label: 'Dashboard' },
    { to: '/admin/users', label: 'All Users' },
    { to: '/admin/teams', label: 'All Teams' },
    { to: '/admin/news', label: 'News Management' },
    { to: '/admin/vacancies', label: 'Vacancy Management' },
    { to: '/admin/team-requests', label: 'Team Requests' },
    { to: '/admin/timeline', label: 'Audit Timeline' },
    { to: '/notifications', label: 'Notifications' }
  ],
  leader: [
    { to: '/leader', label: 'Dashboard' },
    { to: '/leader/team-members', label: 'Team Members' },
    { to: '/leader/projects', label: 'Projects' },
    { to: '/leader/requests', label: 'Requests' },
    { to: '/leader/news', label: 'News' },
    { to: '/leader/timeline', label: 'Timeline' },
    { to: '/team-chat', label: 'Team Chat' },
    { to: '/notifications', label: 'Notifications' }
  ],
  'co-leader': [
    { to: '/co-leader', label: 'Co-Leader Dashboard' },
    { to: '/co-leader/assigned-projects', label: 'Assigned Projects' },
    { to: '/co-leader/news', label: 'News' },
    { to: '/team-chat', label: 'Team Chat' },
    { to: '/notifications', label: 'Notifications' }
  ],
  participant: [
    { to: '/participant', label: 'Dashboard' },
    { to: '/participant/my-team', label: 'My Team' },
    { to: '/participant/assigned-projects', label: 'Assigned Projects' },
    { to: '/participant/news', label: 'News' },
    { to: '/participant/requests', label: 'Requests' },
    { to: '/team-chat', label: 'Team Chat' },
    { to: '/notifications', label: 'Notifications' }
  ]
};

export default function Sidebar({ isMobileOpen = false, onClose = () => {} }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const links = linksByRole[user?.role] || [];
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    const loadUnreadCount = async () => {
      if (!user) return;
      try {
        const { data } = await api.get('/notifications', { params: { page: 1, pageSize: 1 } });
        if (mounted) setUnreadCount(Number(data?.unreadCount || 0));
      } catch {
        if (mounted) setUnreadCount(0);
      }
    };

    loadUnreadCount();

    const intervalId = setInterval(loadUnreadCount, 30000);
    const onNotificationsChanged = () => loadUnreadCount();
    window.addEventListener('notifications:changed', onNotificationsChanged);

    return () => {
      mounted = false;
      clearInterval(intervalId);
      window.removeEventListener('notifications:changed', onNotificationsChanged);
    };
  }, [user, location.pathname]);

  return (
    <>
      {isMobileOpen && <button type="button" className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={onClose} aria-label="Close navigation overlay" />}
      <aside
        className={`fixed left-0 top-0 z-40 h-screen w-72 bg-slate-900 text-white transition-transform duration-200 md:sticky md:w-64 md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
      <div className="border-b border-slate-700 p-4">
        <h2 className="text-lg font-semibold">Team Management</h2>
        <p className="text-xs text-slate-300">{user?.name} ({user?.role})</p>
      </div>
      <nav className="flex h-[calc(100vh-88px)] flex-col gap-2 p-3">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => `block rounded px-3 py-2 text-sm ${isActive ? 'bg-slate-700' : 'hover:bg-slate-800'}`}
            onClick={onClose}
          >
            <span className="flex items-center justify-between gap-2">
              <span>{link.label}</span>
              {link.to === '/notifications' && unreadCount > 0 && (
                <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-semibold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </span>
          </NavLink>
        ))}
        <button
          onClick={() => {
            onClose();
            logout();
          }}
          className="mt-2 rounded bg-red-600 px-3 py-2 text-sm hover:bg-red-700 md:mt-auto"
        >
          Logout
        </button>
      </nav>
      </aside>
    </>
  );
}
