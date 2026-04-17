import { AxiosError } from 'axios';
import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

function SignupLogin() {
  const [mode, setMode] = useState<Mode>('signup');
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
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-8 shadow-lg">
        <div className="mb-6 flex rounded-lg bg-gray-800 p-1">
          <button
            type="button"
            className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold ${
              mode === 'signup' ? 'bg-indigo-600 text-white' : 'text-gray-300'
            }`}
            onClick={() => setMode('signup')}
          >
            Sign Up
          </button>
          <button
            type="button"
            className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold ${
              mode === 'login' ? 'bg-indigo-600 text-white' : 'text-gray-300'
            }`}
            onClick={() => setMode('login')}
          >
            Log In
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-gray-300" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-300" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-violet-500 px-4 py-2 font-semibold text-white transition hover:from-indigo-500 hover:to-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Log In'}
          </button>
        </form>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}

export default SignupLogin;
