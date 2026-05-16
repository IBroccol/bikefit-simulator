import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { PrivateRoute } from './components/layout/PrivateRoute';
import { ModeratorRoute } from './components/layout/ModeratorRoute';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import MyBikesPage from './pages/MyBikesPage';
import AddBikePage from './pages/AddBikePage';
import AnthropometryPage from './pages/AnthropometryPage';
import CanvasPage from './pages/CanvasPage';
import ComparePage from './pages/ComparePage';
import ModerationPage from './pages/ModerationPage';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route element={<PrivateRoute />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/bikes" element={<MyBikesPage />} />
              <Route path="/bikes/add" element={<AddBikePage />} />
              <Route path="/anthropometry" element={<AnthropometryPage />} />
              <Route path="/canvas" element={<CanvasPage />} />
              <Route path="/compare" element={<ComparePage />} />
            </Route>

            <Route element={<ModeratorRoute />}>
              <Route path="/moderation" element={<ModerationPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
