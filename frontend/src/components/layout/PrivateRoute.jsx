import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../ui/Spinner';

export function PrivateRoute() {
  const { user, loading } = useAuth();

  if (loading) return <Spinner fullscreen />;
  if (!user) return <Navigate to="/" replace />;

  return <Outlet />;
}
