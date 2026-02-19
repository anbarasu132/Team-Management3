import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/public/HomePage';
import LoginPage from './pages/public/LoginPage';
import RegisterPage from './pages/public/RegisterPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminTeamsPage from './pages/admin/AdminTeamsPage';
import AdminNewsPage from './pages/admin/AdminNewsPage';
import AdminVacanciesPage from './pages/admin/AdminVacanciesPage';
import AdminTeamRequestsPage from './pages/admin/AdminTeamRequestsPage';
import AdminTimelinePage from './pages/admin/AdminTimelinePage';
import LeaderDashboardPage from './pages/leader/LeaderDashboardPage';
import LeaderTeamMembersPage from './pages/leader/LeaderTeamMembersPage';
import LeaderProjectsPage from './pages/leader/LeaderProjectsPage';
import LeaderRequestsPage from './pages/leader/LeaderRequestsPage';
import LeaderNewsPage from './pages/leader/LeaderNewsPage';
import LeaderTimelinePage from './pages/leader/LeaderTimelinePage';
import CoLeaderDashboard from './pages/dashboards/CoLeaderDashboard';
import ParticipantDashboardPage from './pages/participant/ParticipantDashboardPage';
import ParticipantMyTeamPage from './pages/participant/ParticipantMyTeamPage';
import ParticipantAssignedProjectsPage from './pages/participant/ParticipantAssignedProjectsPage';
import ParticipantNewsPage from './pages/participant/ParticipantNewsPage';
import ParticipantRequestsPage from './pages/participant/ParticipantRequestsPage';
import NotificationsPage from './pages/common/NotificationsPage';
import TeamChatPage from './pages/common/TeamChatPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute roles={['admin']} />}>
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/teams" element={<AdminTeamsPage />} />
        <Route path="/admin/news" element={<AdminNewsPage />} />
        <Route path="/admin/vacancies" element={<AdminVacanciesPage />} />
        <Route path="/admin/team-requests" element={<AdminTeamRequestsPage />} />
        <Route path="/admin/timeline" element={<AdminTimelinePage />} />
      </Route>
      <Route element={<ProtectedRoute roles={['leader']} />}>
        <Route path="/leader" element={<LeaderDashboardPage />} />
        <Route path="/leader/team-members" element={<LeaderTeamMembersPage />} />
        <Route path="/leader/projects" element={<LeaderProjectsPage />} />
        <Route path="/leader/requests" element={<LeaderRequestsPage />} />
        <Route path="/leader/news" element={<LeaderNewsPage />} />
        <Route path="/leader/timeline" element={<LeaderTimelinePage />} />
      </Route>
      <Route element={<ProtectedRoute roles={['co-leader']} />}><Route path="/co-leader" element={<CoLeaderDashboard />} /></Route>
      <Route element={<ProtectedRoute roles={['participant']} />}>
        <Route path="/participant" element={<ParticipantDashboardPage />} />
        <Route path="/participant/my-team" element={<ParticipantMyTeamPage />} />
        <Route path="/participant/assigned-projects" element={<ParticipantAssignedProjectsPage />} />
        <Route path="/participant/news" element={<ParticipantNewsPage />} />
        <Route path="/participant/requests" element={<ParticipantRequestsPage />} />
      </Route>
      <Route element={<ProtectedRoute roles={['admin', 'leader', 'co-leader', 'participant']} />}>
        <Route path="/notifications" element={<NotificationsPage />} />
      </Route>
      <Route element={<ProtectedRoute roles={['leader', 'participant']} />}>
        <Route path="/team-chat" element={<TeamChatPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
