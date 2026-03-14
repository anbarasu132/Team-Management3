import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

function destinationByRole(role) {
  if (role === 'admin') return '/admin';
  if (role === 'leader') return '/leader';
  if (role === 'co-leader') return '/co-leader';
  return '/participant';
}

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const googleButtonRef = useRef(null);
  const navigate = useNavigate();
  const { login } = useAuth();
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      login(data.token, data.user);
      navigate(destinationByRole(data.user.role));
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) return;

    const handleCredential = async (response) => {
      if (!response?.credential) return;
      setError('');
      setLoading(true);
      try {
        const { data } = await api.post('/auth/google', { credential: response.credential });
        login(data.token, data.user);
        navigate(destinationByRole(data.user.role));
      } catch (err) {
        setError(err.response?.data?.message || 'Google login failed');
      } finally {
        setLoading(false);
      }
    };

    const initializeGoogle = () => {
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleCredential
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        width: 320
      });
    };

    const existingScript = document.getElementById('google-identity');
    if (existingScript?.dataset.loaded === 'true') {
      initializeGoogle();
      return;
    }

    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.id = 'google-identity';
      script.onload = () => {
        script.dataset.loaded = 'true';
        initializeGoogle();
      };
      document.head.appendChild(script);
    } else {
      existingScript.onload = () => {
        existingScript.dataset.loaded = 'true';
        initializeGoogle();
      };
    }
  }, [googleClientId, login, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-xl bg-white p-6 shadow">
        <h1 className="mb-4 text-2xl font-bold">Login</h1>
        {error && <p className="mb-3 rounded bg-red-100 p-2 text-sm text-red-700">{error}</p>}
        <input className="mb-3 w-full rounded border p-2" placeholder="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <div className="relative mb-4">
          <input
            className="w-full rounded border p-2 pr-10"
            placeholder="Password"
            type={showPassword ? 'text' : 'password'}
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 px-3 text-slate-600 hover:text-slate-900"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            title={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 3l18 18" />
                <path d="M10.6 10.6a3 3 0 0 0 4.2 4.2" />
                <path d="M9.9 5.1A10.8 10.8 0 0 1 12 5c7 0 10 7 10 7a16.6 16.6 0 0 1-4 5.2" />
                <path d="M6.6 6.6A16.6 16.6 0 0 0 2 12s3 7 10 7a10.8 10.8 0 0 0 5.1-1.3" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
        <button disabled={loading} className="w-full rounded bg-slate-900 py-2 text-white hover:bg-slate-700 disabled:opacity-60">{loading ? 'Signing in...' : 'Sign In'}</button>
        <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          or
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        {googleClientId ? (
          <div className="flex justify-center">
            <div ref={googleButtonRef} />
          </div>
        ) : (
          <p className="rounded bg-amber-50 p-2 text-xs text-amber-700">
            Google sign-in is not configured. Set `VITE_GOOGLE_CLIENT_ID` to enable it.
          </p>
        )}
        <p className="mt-4 text-sm text-slate-600">No account? <Link className="text-blue-600" to="/register">Register</Link></p>
      </form>
    </div>
  );
}
