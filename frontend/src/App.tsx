import { Navigate, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Landing from './pages/Landing';
import SignupLogin from './pages/SignupLogin';
import UpgradeToPrime from './pages/UpgradeToPrime';

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const token = localStorage.getItem('accessToken');

  if (!token) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<SignupLogin />} />
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
