import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { apiMode } from './api/client';
import { useAuth } from './auth/AuthContext';
import type { Role } from './types';
import { AppShell } from './components/AppShell';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { SchoolsPage, SchoolDetailPage, SchoolFormPage } from './pages/SchoolsPage';
import { AssessmentsPage, AssessmentFormPage } from './pages/AssessmentsPage';
import { RequirementsPage, RequirementDetailPage } from './pages/RequirementsPage';
import { GapAnalysisPage, PriorityPage } from './pages/AnalysisPages';
import { ReportsPage } from './pages/ReportsPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { FeedbackPage } from './pages/FeedbackPage';
import { FaqAssistantPage } from './pages/FaqAssistantPage';
import { AndroidBackButtonHandler } from './components/AndroidBackButtonHandler';

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading)
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#f4f6f9] text-[#6b7c93] text-sm" aria-live="polite">
        Verifying your session…
      </main>
    );
  return user ? <>{children}</> : <Navigate to="/login" replace state={{ from: location.pathname }} />;
}

function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user?.role === 'ADMIN' ? <>{children}</> : <Navigate to="/dashboard" replace />;
}

function RoleOnly({ children, roles }: { children: React.ReactNode; roles: Role[] }) {
  const { user } = useAuth();
  if (apiMode === 'mock') return <>{children}</>;
  return user && roles.includes(user.role) ? <>{children}</> : <Navigate to="/dashboard" replace />;
}

export function App() {
  const { user } = useAuth();
  return (
    <>
    <AndroidBackButtonHandler />
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route element={<Protected><AppShell /></Protected>}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/schools" element={<SchoolsPage />} />
        <Route path="/schools/new" element={<RoleOnly roles={['SCHOOL']}><SchoolFormPage /></RoleOnly>} />
        <Route path="/schools/:id" element={<RoleOnly roles={['SCHOOL','ADMIN','FIELD_COORDINATOR']}><SchoolDetailPage /></RoleOnly>} />
        <Route path="/schools/:id/edit" element={<RoleOnly roles={['SCHOOL','ADMIN','FIELD_COORDINATOR']}><SchoolFormPage /></RoleOnly>} />
        <Route path="/assessments" element={<AssessmentsPage />} />
        <Route path="/assessments/new" element={<RoleOnly roles={['SCHOOL','FIELD_COORDINATOR']}><AssessmentFormPage /></RoleOnly>} />
        <Route path="/requirements" element={<RequirementsPage />} />
        <Route path="/requirements/:id" element={<RequirementDetailPage />} />
        <Route path="/gap-analysis" element={<RoleOnly roles={['SCHOOL','ADMIN']}><GapAnalysisPage /></RoleOnly>} />
        <Route path="/priorities" element={<PriorityPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route path="/help" element={<FaqAssistantPage />} />
        <Route path="/users" element={<AdminOnly><UserManagementPage /></AdminOnly>} />
      </Route>
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    </Routes>
    </>
  );
}
