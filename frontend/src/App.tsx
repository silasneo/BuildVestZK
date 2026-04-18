import { Navigate, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Landing from './pages/Landing';
import SignupLogin from './pages/SignupLogin';
import UpgradeToPrime from './pages/UpgradeToPrime';

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const token = localStorage.getItem('accessToken');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<Navigate to="/signup" replace />} />
      <Route path="/signup" element={<SignupLogin initialMode="signup" />} />
      <Route path="/register" element={<SignupLogin initialMode="signup" />} />
      <Route path="/login" element={<SignupLogin initialMode="login" />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/upgrade"
        element={
          <ProtectedRoute>
            <UpgradeToPrime />
          </ProtectedRoute>
        }
      />
      <Route
        path="/eligibility"
        element={
          <ProtectedRoute>
            <UpgradeToPrime />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
