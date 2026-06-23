import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';

import Login from './pages/Login';
import Register from './pages/Register';
import InternDashboard from './pages/InternDashboard';
import AdminDashboard from './pages/AdminDashboard';
import DailyTracker from './pages/DailyTracker';
import TaskBoard from './pages/TaskBoard';
import SkillsLog from './pages/SkillsLog';
import SupervisorFeedback from './pages/SupervisorFeedback';

import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';

function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  if (location.pathname === '/login' || location.pathname === '/register') {
    return <>{children}</>;
  }

  return (
    <div className="app-container">
      <div className="ambient-glow glow-purple" style={{ top: '5%', left: '5%', opacity: 0.1 }}></div>
      <div className="ambient-glow glow-cyan" style={{ bottom: '10%', right: '10%', opacity: 0.08 }}></div>
      <div className="ambient-glow glow-magenta" style={{ top: '40%', left: '35%', width: '450px', height: '450px', opacity: 0.05 }}></div>

      {/* Mobile Top Header Bar */}
      <header className="mobile-header">
        <div className="mobile-logo-text" style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '1.1rem' }}>
          InternHub
        </div>
        <button className="menu-toggle" onClick={toggleSidebar}>
          <Menu size={24} />
        </button>
      </header>

      {/* Navigation Sidebar */}
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      {/* Main Page Area */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

function RootRedirect() {
  const token = localStorage.getItem('intern_tracker_token');
  const userJson = localStorage.getItem('intern_tracker_user');
  
  if (!token || !userJson) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userJson);
    if (user.role === 'admin' || user.role === 'manager') {
      return <Navigate to="/admin" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  } catch (e) {
    return <Navigate to="/login" replace />;
  }
}

export default function App() {
  return (
    <Router>
      <DashboardLayout>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Root Redirector */}
          <Route path="/" element={<RootRedirect />} />

          {/* Personal Tracker Workspace (Interns, Employees, Managers) */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['intern', 'employee']}>
                <InternDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/tracker" 
            element={
              <ProtectedRoute allowedRoles={['intern', 'employee', 'manager']}>
                <DailyTracker />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/tasks" 
            element={
              <ProtectedRoute allowedRoles={['intern', 'employee', 'manager']}>
                <TaskBoard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/skills" 
            element={
              <ProtectedRoute allowedRoles={['intern', 'employee', 'manager']}>
                <SkillsLog />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/feedback" 
            element={
              <ProtectedRoute allowedRoles={['intern', 'employee', 'manager']}>
                <SupervisorFeedback />
              </ProtectedRoute>
            } 
          />

          {/* Supervisor Management Workspace (Admins, Managers, Employees) */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/tracker" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'employee']}>
                <DailyTracker />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/tasks" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'employee']}>
                <TaskBoard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/feedback" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'employee']}>
                <SupervisorFeedback />
              </ProtectedRoute>
            } 
          />

          {/* Catch All - Redirect to Root */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </DashboardLayout>
    </Router>
  );
}
