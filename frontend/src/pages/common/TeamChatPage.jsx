import { useEffect, useMemo, useRef, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import api from '../../api/client';
import Loader from '../../components/Loader';
import { useAuth } from '../../context/AuthContext';

function formatDateTime(value) {
  return String(value).slice(0, 19).replace('T', ' ');
}

export default function TeamChatPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef(null);

  const loadMessages = async () => {
    try {
      const { data } = await api.get('/chat/team', { params: { page: 1, pageSize: 100 } });
      setMessages(data.messages || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load chat');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
    const intervalId = setInterval(loadMessages, 5000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const canSend = useMemo(() => text.trim().length > 0, [text]);

  const onSend = async (e) => {
    e.preventDefault();
    if (!canSend || sending) return;

    try {
      setSending(true);
      await api.post('/chat/team', { message: text.trim() });
      setText('');
      await loadMessages();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardLayout title="Team Chat">
      {loading ? <Loader /> : (
        <section className="rounded bg-white p-4 shadow">
          <div className="mb-3 rounded border bg-slate-50 p-3 text-sm text-slate-600">
            Global team chat for leader and participants.
          </div>
          <div className="h-[60vh] space-y-3 overflow-auto rounded border p-3">
            {messages.length === 0 && <p className="text-sm text-slate-500">No messages yet.</p>}
            {messages.map((m) => {
              const isMine = Number(m.sender_id) === Number(user?.id);
              return (
                <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded px-3 py-2 ${isMine ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                    <p className="mb-1 text-xs opacity-80">{m.sender_name} ({m.sender_role})</p>
                    <p className="text-sm whitespace-pre-wrap">{m.message}</p>
                    <p className="mt-1 text-[10px] opacity-70">{formatDateTime(m.created_at)}</p>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={onSend} className="mt-3 flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 rounded border px-3 py-2 text-sm"
              maxLength={2000}
            />
            <button
              type="submit"
              disabled={!canSend || sending}
              className="rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </form>
          {error && <p className="mt-3 rounded bg-red-100 p-2 text-sm text-red-700">{error}</p>}
        </section>
      )}
    </DashboardLayout>
  );
}
