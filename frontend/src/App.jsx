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
        <Route path="/admin" element={<AdminLayout />}>
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

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
