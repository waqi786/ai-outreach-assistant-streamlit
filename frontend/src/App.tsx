import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import { AuthProvider, useAuth } from '@/lib/auth';
import { useProjectsStore } from '@/lib/projects';
import Dashboard from '@/pages/Dashboard';
import ChatPage from '@/pages/ChatPage';
import Login from '@/pages/Login';
import ProjectSettings from '@/pages/ProjectSettings';
import Register from '@/pages/Register';
import UserSettings from '@/pages/UserSettings';
import { useEffect } from 'react';

function AppLayout() {
  const { isAuthenticated } = useAuth();
  const { fetchProjects } = useProjectsStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchProjects().catch(() => undefined);
    }
  }, [fetchProjects, isAuthenticated]);

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-gradient-to-br from-background via-background to-muted/10">
      <Sidebar />
      <main className="min-h-screen flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/projects/:projectId/settings" element={<ProjectSettings />} />
              <Route path="/projects/:projectId/chats/:chatId" element={<ChatPage />} />
              <Route path="/projects/:projectId/chats/new" element={<ChatPage />} />
              <Route path="/settings" element={<UserSettings />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
