import { useEffect, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import api from '../../api/client';
import Loader from '../../components/Loader';
import SearchableSelect from '../../components/SearchableSelect';

export default function LeaderProjectsPage() {
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [team, setTeam] = useState(null);
  const [projects, setProjects] = useState([]);
  const [logs, setLogs] = useState([]);
  const [projectPagination, setProjectPagination] = useState({ page: 1, total_pages: 1, total: 0, limit: 10 });
  const [projectSearch, setProjectSearch] = useState('');
  const [debouncedProjectSearch, setDebouncedProjectSearch] = useState('');
  const [projectStatus, setProjectStatus] = useState('');
  const [logPagination, setLogPagination] = useState({ page: 1, total_pages: 1, total: 0, limit: 10 });
  const [logSearch, setLogSearch] = useState('');
  const [debouncedLogSearch, setDebouncedLogSearch] = useState('');
  const [projectForm, setProjectForm] = useState({ title: '', description: '', deadline: '' });
  const [assignForm, setAssignForm] = useState({ projectId: '', userId: '' });
  const [attachmentProjectId, setAttachmentProjectId] = useState('');
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [message, setMessage] = useState('');

  const load = async () => {
    if (!initialized) {
      setLoading(true);
    }
    const [teamRes, projectRes, logRes] = await Promise.allSettled([
      api.get('/teams/me'),
      api.get('/projects/team', {
        params: {
          page: projectPagination.page,
          limit: projectPagination.limit,
          q: debouncedProjectSearch,
          status: projectStatus
        }
      }),
      api.get('/projects/activity-logs', {
        params: {
          page: logPagination.page,
          limit: logPagination.limit,
          q: debouncedLogSearch
        }
      })
    ]);

    setTeam(teamRes.status === 'fulfilled' ? teamRes.value.data : null);
    if (projectRes.status === 'fulfilled') {
      setProjects(projectRes.value.data.items || []);
      setProjectPagination((prev) => ({ ...prev, ...(projectRes.value.data.pagination || prev) }));
    } else {
      setProjects([]);
    }
    if (logRes.status === 'fulfilled') {
      setLogs(logRes.value.data.items || []);
      setLogPagination((prev) => ({ ...prev, ...(logRes.value.data.pagination || prev) }));
    } else {
      setLogs([]);
    }
    setLoading(false);
    if (!initialized) {
      setInitialized(true);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedProjectSearch(projectSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [projectSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedLogSearch(logSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [logSearch]);

  useEffect(() => {
    load();
  }, [
    projectPagination.page,
    projectPagination.limit,
    debouncedProjectSearch,
    projectStatus,
    logPagination.page,
    logPagination.limit,
    debouncedLogSearch
  ]);

  const createProject = async (e) => {
    e.preventDefault();
    await api.post('/projects', projectForm);
    setProjectForm({ title: '', description: '', deadline: '' });
    setMessage('Project created');
    load();
  };

  const assignProject = async (e) => {
    e.preventDefault();
    await api.post('/projects/assign', {
      projectId: Number(assignForm.projectId),
      userId: Number(assignForm.userId)
    });
    setAssignForm({ projectId: '', userId: '' });
    setMessage('Project assigned');
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
    if (!attachmentProjectId || !attachmentFile) return;
    const formData = new FormData();
    formData.append('file', attachmentFile);
    await api.post(`/projects/${attachmentProjectId}/files`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    setAttachmentFile(null);
    setMessage('Attachment uploaded');
    loadAttachments(attachmentProjectId);
  };

  return (
    <DashboardLayout title="Projects">
      {loading ? <Loader /> : (
        <div className="grid gap-6 lg:grid-cols-2">
          {!team ? (
            <section className="rounded bg-white p-4 shadow lg:col-span-2">
              <p className="text-sm text-slate-600">No team available yet. Wait for admin approval from Requests page.</p>
            </section>
          ) : (
            <>
              <section className="rounded bg-white p-4 shadow">
                <h2 className="mb-2 font-semibold">Create Project</h2>
                <form onSubmit={createProject} className="space-y-2">
                  <input className="w-full rounded border p-2" placeholder="Title" required value={projectForm.title} onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })} />
                  <textarea className="w-full rounded border p-2" placeholder="Description" required value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} />
                  <input type="date" className="w-full rounded border p-2" required value={projectForm.deadline} onChange={(e) => setProjectForm({ ...projectForm, deadline: e.target.value })} />
                  <button className="rounded bg-slate-900 px-3 py-2 text-white">Create</button>
                </form>
              </section>

              <section className="rounded bg-white p-4 shadow">
                <h2 className="mb-2 font-semibold">Assign Project</h2>
                <form onSubmit={assignProject} className="space-y-2">
                  <SearchableSelect
                    label="Select Project"
                    placeholder="Search project by id/title..."
                    options={projects.map((p) => ({ value: p.id, label: `#${p.id} | ${p.title}` }))}
                    value={assignForm.projectId}
                    onChange={(value) => setAssignForm((prev) => ({ ...prev, projectId: value }))}
                  />
                  <SearchableSelect
                    label="Select Team Member"
                    placeholder="Search member by id/name..."
                    options={(team.members || []).map((m) => ({ value: m.id, label: `${m.id} | ${m.name} (${m.role})` }))}
                    value={assignForm.userId}
                    onChange={(value) => setAssignForm((prev) => ({ ...prev, userId: value }))}
                  />
                  <button
                    disabled={!assignForm.projectId || !assignForm.userId}
                    className="rounded bg-slate-900 px-3 py-2 text-white disabled:opacity-60"
                  >
                    Assign
                  </button>
                </form>
                <div className="mt-3 grid gap-3 md:grid-cols-2 text-sm">
                  <div>
                    <p className="font-medium">Project IDs</p>
                    <div className="max-h-28 overflow-auto">
                      {projects.map((p) => (
                        <button key={p.id} type="button" onClick={() => setAssignForm((prev) => ({ ...prev, projectId: String(p.id) }))} className="mb-1 block w-full rounded border px-2 py-1 text-left hover:bg-slate-50">#{p.id} {p.title}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium">Member IDs</p>
                    <div className="max-h-28 overflow-auto">
                      {team.members?.map((m) => (
                        <button key={m.id} type="button" onClick={() => setAssignForm((prev) => ({ ...prev, userId: String(m.id) }))} className="mb-1 block w-full rounded border px-2 py-1 text-left hover:bg-slate-50">{m.id} | {m.name} ({m.role})</button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded bg-white p-4 shadow lg:col-span-2">
                <h2 className="mb-2 font-semibold">Project Status Monitor</h2>
                <div className="mb-3 grid gap-2 md:grid-cols-3">
                  <input
                    className="rounded border p-2 text-sm"
                    placeholder="Search project..."
                    value={projectSearch}
                    onChange={(e) => {
                      setProjectSearch(e.target.value);
                      setProjectPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                  />
                  <select
                    className="rounded border p-2 text-sm"
                    value={projectStatus}
                    onChange={(e) => {
                      setProjectStatus(e.target.value);
                      setProjectPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                  >
                    <option value="">All status</option>
                    <option value="pending">pending</option>
                    <option value="in-progress">in-progress</option>
                    <option value="completed">completed</option>
                  </select>
                  <p className="self-center text-sm text-slate-600">Total: {projectPagination.total || 0}</p>
                </div>
                <div className="max-h-44 overflow-auto text-sm">
                  {projects.map((p) => (
                    <p key={p.id} className="border-b py-1">#{p.id} {p.title} | {p.status} | Deadline: {String(p.deadline).slice(0, 10)}</p>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <button
                    disabled={(projectPagination.page || 1) <= 1}
                    onClick={() => setProjectPagination((prev) => ({ ...prev, page: Math.max(1, (prev.page || 1) - 1) }))}
                    className="rounded border px-2 py-1 disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <span>Page {projectPagination.page || 1} of {projectPagination.total_pages || 1}</span>
                  <button
                    disabled={(projectPagination.page || 1) >= (projectPagination.total_pages || 1)}
                    onClick={() => setProjectPagination((prev) => ({ ...prev, page: Math.min(prev.total_pages || 1, (prev.page || 1) + 1) }))}
                    className="rounded border px-2 py-1 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <h3 className="mt-4 font-semibold">Activity Logs</h3>
                <div className="my-2 grid gap-2 md:grid-cols-2">
                  <input
                    className="rounded border p-2 text-sm"
                    placeholder="Search logs by action/actor/project..."
                    value={logSearch}
                    onChange={(e) => {
                      setLogSearch(e.target.value);
                      setLogPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                  />
                  <p className="self-center text-sm text-slate-600">Total Logs: {logPagination.total || 0}</p>
                </div>
                <div className="max-h-44 overflow-auto text-sm">
                  {logs.map((l) => (
                    <p key={l.id} className="border-b py-1">{l.actor_name}: {l.action} ({String(l.created_at).slice(0, 19).replace('T', ' ')})</p>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <button
                    disabled={(logPagination.page || 1) <= 1}
                    onClick={() => setLogPagination((prev) => ({ ...prev, page: Math.max(1, (prev.page || 1) - 1) }))}
                    className="rounded border px-2 py-1 disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <span>Page {logPagination.page || 1} of {logPagination.total_pages || 1}</span>
                  <button
                    disabled={(logPagination.page || 1) >= (logPagination.total_pages || 1)}
                    onClick={() => setLogPagination((prev) => ({ ...prev, page: Math.min(prev.total_pages || 1, (prev.page || 1) + 1) }))}
                    className="rounded border px-2 py-1 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </section>

              <section className="rounded bg-white p-4 shadow lg:col-span-2">
                <h2 className="mb-2 font-semibold">Project Attachments</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  <SearchableSelect
                    label="Select Project"
                    placeholder="Search project..."
                    options={projects.map((p) => ({ value: p.id, label: `#${p.id} | ${p.title}` }))}
                    value={attachmentProjectId}
                    onChange={(value) => {
                      setAttachmentProjectId(value);
                      loadAttachments(value);
                    }}
                  />
                  <form onSubmit={uploadAttachment} className="space-y-2">
                    <p className="text-sm font-medium text-slate-700">Upload File</p>
                    <input
                      type="file"
                      className="w-full rounded border p-2 text-sm"
                      onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                    />
                    <button
                      disabled={!attachmentProjectId || !attachmentFile}
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
          {message && <p className="rounded bg-emerald-100 p-2 text-sm text-emerald-700 lg:col-span-2">{message}</p>}
        </div>
      )}
    </DashboardLayout>
  );
}
