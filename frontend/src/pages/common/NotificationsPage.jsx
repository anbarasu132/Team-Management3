import { useEffect, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import api from '../../api/client';
import Loader from '../../components/Loader';

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [message, setMessage] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  const load = async () => {
    setLoading(true);
    const { data } = await api.get('/notifications', {
      params: { status, page, pageSize }
    });
    setUnreadCount(data.unreadCount || 0);
    setNotifications(data.notifications || []);
    setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
    setSelectedIds([]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [status, page, pageSize]);

  useEffect(() => {
    if (pagination.totalPages > 0 && page > pagination.totalPages) {
      setPage(pagination.totalPages);
    }
  }, [page, pagination.totalPages]);

  const markOneRead = async (id) => {
    await api.put(`/notifications/${id}/read`);
    setMessage('Notification marked as read');
    window.dispatchEvent(new Event('notifications:changed'));
    load();
  };

  const markAllRead = async () => {
    await api.put('/notifications/read-all');
    setMessage('All notifications marked as read');
    window.dispatchEvent(new Event('notifications:changed'));
    load();
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSelectAllCurrentPage = () => {
    const pageIds = notifications.map((n) => n.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
      return;
    }
    setSelectedIds((prev) => [...new Set([...prev, ...pageIds])]);
  };

  const markSelectedRead = async () => {
    if (selectedIds.length === 0) return;
    await api.put('/notifications/bulk-read', { notificationIds: selectedIds });
    setMessage('Selected notifications marked as read');
    window.dispatchEvent(new Event('notifications:changed'));
    load();
  };

  const deleteSelected = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = window.confirm('Delete selected notifications? This cannot be undone.');
    if (!confirmed) return;
    await api.delete('/notifications/bulk-delete', { data: { notificationIds: selectedIds } });
    setMessage('Selected notifications deleted');
    window.dispatchEvent(new Event('notifications:changed'));
    load();
  };

  const currentPageIds = notifications.map((n) => n.id);
  const allCurrentPageSelected = currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id));

  return (
    <DashboardLayout title="Notifications">
      {loading ? <Loader /> : (
        <section className="rounded bg-white p-4 shadow">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-slate-600">Unread: <span className="font-semibold">{unreadCount}</span></p>
            <button onClick={markAllRead} className="rounded bg-slate-900 px-3 py-2 text-sm text-white">Mark All Read</button>
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <label className="text-sm text-slate-600">
              Status
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="ml-2 rounded border px-2 py-1 text-sm"
              >
                <option value="all">All</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>
            </label>
            <label className="text-sm text-slate-600">
              Page Size
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="ml-2 rounded border px-2 py-1 text-sm"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </label>
            <p className="text-sm text-slate-500">Total: {pagination.total || 0}</p>
            <p className="text-sm text-slate-500">Selected: {selectedIds.length}</p>
            <button
              onClick={toggleSelectAllCurrentPage}
              className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-700"
            >
              {allCurrentPageSelected ? 'Unselect Page' : 'Select Page'}
            </button>
            <button
              onClick={markSelectedRead}
              disabled={selectedIds.length === 0}
              className="rounded bg-blue-600 px-3 py-1 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Mark Selected Read
            </button>
            <button
              onClick={deleteSelected}
              disabled={selectedIds.length === 0}
              className="rounded bg-rose-600 px-3 py-1 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Delete Selected
            </button>
          </div>
          <div className="max-h-[68vh] space-y-2 overflow-auto">
            {notifications.length === 0 && <p className="text-sm text-slate-500">No notifications.</p>}
            {notifications.map((n) => (
              <div key={n.id} className={`rounded border p-3 ${n.is_read ? 'bg-slate-50' : 'bg-blue-50 border-blue-200'}`}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(n.id)}
                      onChange={() => toggleSelect(n.id)}
                      className="h-4 w-4"
                    />
                    <p className="font-semibold text-slate-800">{n.title}</p>
                  </div>
                  {!n.is_read && (
                    <button onClick={() => markOneRead(n.id)} className="rounded bg-blue-600 px-2 py-1 text-xs text-white">
                      Mark Read
                    </button>
                  )}
                </div>
                <p className="text-sm text-slate-700">{n.message}</p>
                <p className="mt-1 text-xs text-slate-500">{String(n.created_at).slice(0, 19).replace('T', ' ')}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-sm text-slate-500">Page {pagination.page || 1} of {pagination.totalPages || 1}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={(pagination.page || 1) <= 1}
                className="rounded border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((prev) => Math.min(pagination.totalPages || 1, prev + 1))}
                disabled={(pagination.page || 1) >= (pagination.totalPages || 1)}
                className="rounded border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
          {message && <p className="mt-3 rounded bg-emerald-100 p-2 text-sm text-emerald-700">{message}</p>}
        </section>
      )}
    </DashboardLayout>
  );
}
