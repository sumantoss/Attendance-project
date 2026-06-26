import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AttendancePage from './pages/AttendancePage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AdminLayout from './components/AdminLayout';
import DashboardPage from './pages/DashboardPage';
import EmployeesPage from './pages/EmployeesPage';
import DepartmentsPage from './pages/DepartmentsPage';
import ProjectsPage from './pages/ProjectsPage';
import TasksPage from './pages/TasksPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import BlockersPage from './pages/BlockersPage';
import PerformancePage from './pages/PerformancePage';
import EmployeeProfilePage from './pages/EmployeeProfilePage';

import TeamLeadLayout from './components/TeamLeadLayout';
import TeamLeadDashboard from './pages/TeamLeadDashboard';

// Role-based protection wrapper
function ProtectedRoute({ children, allowedRole }) {
  const role = localStorage.getItem('swms_user_role');
  const token = localStorage.getItem('swms_admin_token');

  if (!token) return <Navigate to="/login" replace />;
  if (role !== allowedRole) {
    return <Navigate to={role === 'admin' ? '/admin/dashboard' : '/teamlead/dashboard'} replace />;
  }
  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Public QR attendance page */}
        <Route path="/" element={<AttendancePage />} />
        
        {/* Auth routes */}
        <Route path="/admin/login" element={<LoginPage />} />
        <Route path="/login" element={<Navigate to="/admin/login" replace />} />
        <Route path="/admin/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/admin/reset-password/:token" element={<ResetPasswordPage />} />
        
        {/* Admin Portal */}
        <Route path="/admin" element={<ProtectedRoute allowedRole="admin"><AdminLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="employees" element={<EmployeesPage />} />
          <Route path="employees/:id" element={<EmployeeProfilePage />} />
          <Route path="departments" element={<DepartmentsPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="blockers" element={<BlockersPage />} />
          <Route path="performance" element={<PerformancePage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="audit-logs" element={<AuditLogsPage />} />
        </Route>

        {/* Team Lead Portal */}
        <Route path="/teamlead" element={<ProtectedRoute allowedRole="teamlead"><TeamLeadLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/teamlead/dashboard" replace />} />
          <Route path="dashboard" element={<TeamLeadDashboard />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="blockers" element={<BlockersPage />} />
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
