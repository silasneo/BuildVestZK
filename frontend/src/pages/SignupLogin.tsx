import { AxiosError } from 'axios';
import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login, signup } from '../lib/api';

type Mode = 'signup' | 'login';

interface AuthResponse {
  accessToken: string;
  user: {
    id: number;
    email: string;
    tier: 'RETAIL' | 'PRIME';
  };
}

interface SignupLoginProps {
  initialMode?: Mode;
}

function SignupLogin({ initialMode = 'signup' }: SignupLoginProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = mode === 'signup' ? await signup(email, password) : await login(email, password);
      const data = response.data as AuthResponse;

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/dashboard');
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string | string[] }>;
      const message = axiosError.response?.data?.message;
      setError(Array.isArray(message) ? message.join(', ') : message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 text-slate-900">
      <div className="w-full max-w-md">
        {/* Centered logo */}
        <div className="mb-6 flex justify-center">
          <Link
            to="/"
            className="inline-flex rounded-lg focus:outline-none focus:ring-2 focus:ring-bv-blue/30"
            aria-label="Go to home"
          >
            <img
              src="https://buildvest.net/buildvest-logo.png"
              alt="BuildVest"
              className="h-10"
            />
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                mode === 'signup'
                  ? 'bg-bv-blue text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => setMode('signup')}
            >
              Sign Up
            </button>
            <button
              type="button"
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                mode === 'login'
                  ? 'bg-bv-blue text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => setMode('login')}
            >
              Log In
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-bv-blue focus:outline-none focus:ring-2 focus:ring-bv-blue/20"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-bv-blue focus:outline-none focus:ring-2 focus:ring-bv-blue/20"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-bv-blue px-4 py-2 font-semibold text-white transition hover:bg-bv-blue/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Log In'}
            </button>
          </form>

          {error && (
            <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default SignupLogin;