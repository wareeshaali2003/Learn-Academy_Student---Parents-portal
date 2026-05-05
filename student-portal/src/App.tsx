import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider, useUser } from './context/UserContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { AttendancePage } from './pages/Attendance';
import { AssignmentsPage } from './pages/Assignments';
import { ResultsPage } from './pages/Results';
import { QuizzesPage } from './pages/Quizzes';
import SchedulePage from './pages/Schedulepage';
import ProfilePage from './pages/Profilepage';
import { FeesPage } from './pages/Feespage';
import { NoticeBoardPage } from './pages/Noticeboardpage';
import ReportCardPage from './pages/Reportcardpage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

export default function App() {
  return (
    <UserProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute><AttendancePage /></ProtectedRoute>} />
          <Route path="/assignments" element={<ProtectedRoute><AssignmentsPage /></ProtectedRoute>} />
          <Route path="/results" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />
          <Route path="/quizzes" element={<ProtectedRoute><QuizzesPage /></ProtectedRoute>} />
          <Route path="/schedule" element={<ProtectedRoute><SchedulePage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/fees" element={<ProtectedRoute><FeesPage /></ProtectedRoute>} />
          
<Route path="/report-card"  element={<ProtectedRoute><ReportCardPage /></ProtectedRoute>} />
<Route path="/notice-board" element={<ProtectedRoute><NoticeBoardPage /></ProtectedRoute>} />
          {/* ✅ Fix: catch-all sabse aakhir mein */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </UserProvider>
  );
}