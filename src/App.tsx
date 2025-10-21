import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import UploadPage from './pages/UploadPage';
import GradePage from './pages/GradePage';
import TeacherClassroomDashboard from './pages/TeacherClassroomDashboard';
import AnalyticsPage from './pages/AnalyticsPage';
import LessonPlannerPage from './pages/LessonPlannerPage';

function App() {
  useAuth();

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
        <Route path="/teacher-classrooms" element={<TeacherClassroomDashboard />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/lesson-planner" element={<LessonPlannerPage />} />
        <Route path="/student-dashboard" element={<StudentDashboard />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/grade" element={<GradePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
