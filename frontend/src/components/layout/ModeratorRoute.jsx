import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../ui/Spinner';

export function ModeratorRoute() {
  const { user, loading } = useAuth();

  if (loading) return <Spinner fullscreen />;
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== 'moderator') return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
