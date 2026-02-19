import { useEffect, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import api from '../../api/client';
import Loader from '../../components/Loader';

export default function ParticipantAssignedProjectsPage() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [message, setMessage] = useState('');

  const load = () => {
    setLoading(true);
    api.get('/projects/assigned')
      .then((res) => setProjects(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (projectId, status) => {
    await api.put('/projects/status', { projectId, status });
    setMessage('Status updated');
    load();
  };

  const loadAttachments = async (projectId) => {
    if (!projectId) {
      setAttachments([]);
      return;
    }
    const { data } = await api.get(`/projects/${projectId}/files`);
    setAttachments(data || []);
  };

  const uploadAttachment = async (e) => {
    e.preventDefault();
    if (!selectedProjectId || !attachmentFile) return;
    const formData = new FormData();
    formData.append('file', attachmentFile);
    await api.post(`/projects/${selectedProjectId}/files`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    setAttachmentFile(null);
    setMessage('Attachment uploaded');
    loadAttachments(selectedProjectId);
  };

  return (
    <DashboardLayout title="Assigned Projects">
      {loading ? <Loader /> : (
        <>
          <section className="rounded bg-white p-4 shadow">
            <div className="space-y-3">
              {projects.length === 0 && <p className="text-sm text-slate-600">No assigned projects yet.</p>}
              {projects.map((p) => (
                <div key={p.id} className="rounded border p-3">
                  <p className="font-semibold">{p.title}</p>
                  <p className="text-sm text-slate-600">{p.description}</p>
                  <p className="text-sm">Status: {p.status}</p>
                  <p className="text-sm">Deadline: {String(p.deadline).slice(0, 10)}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {['pending', 'in-progress', 'completed'].map((status) => (
                      <button key={status} onClick={() => updateStatus(p.id, status)} className="rounded bg-slate-900 px-3 py-1 text-xs text-white">{status}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {message && <p className="mt-4 rounded bg-emerald-100 p-2 text-sm text-emerald-700">{message}</p>}
          </section>

          <section className="mt-6 rounded bg-white p-4 shadow">
            <h2 className="mb-3 font-semibold">Project Attachments</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <select
                className="w-full rounded border p-2 text-sm"
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  loadAttachments(e.target.value);
                }}
              >
                <option value="">Select project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>#{p.id} {p.title}</option>
                ))}
              </select>
              <form onSubmit={uploadAttachment} className="space-y-2">
                <input
                  type="file"
                  className="w-full rounded border p-2 text-sm"
                  onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                />
                <button
                  disabled={!selectedProjectId || !attachmentFile}
                  className="rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-60"
                >
                  Upload
                </button>
              </form>
            </div>
            <div className="mt-3 max-h-44 overflow-auto text-sm">
              {attachments.length === 0 && <p className="text-slate-500">No attachments for selected project.</p>}
              {attachments.map((f) => (
                <div key={f.id} className="mb-2 rounded border p-2">
                  <p className="font-medium">{f.original_name}</p>
                  <p className="text-xs text-slate-500">By: {f.uploaded_by_name || f.uploaded_by} | Size: {Math.round((f.file_size || 0) / 1024)} KB</p>
                  <a href={`http://localhost:5000${f.file_path}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Open</a>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </DashboardLayout>
  );
}
