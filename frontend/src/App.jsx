import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Menu, Bell, Check, Info, X } from 'lucide-react';

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
import { api } from './utils/api';

function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [toasts, setToasts] = useState([]);
  const location = useLocation();
  const alertedIds = useRef(new Set());
  const isFirstLoad = useRef(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const userJson = sessionStorage.getItem('intern_tracker_user');
  const token = sessionStorage.getItem('intern_tracker_token');

  // Fetch notifications
  const loadNotifications = async () => {
    if (!token || !userJson) return;
    try {
      const list = await api.notifications.getAll();
      setNotifications(list);
      
      // Filter unread notifications
      const unread = list.filter(n => !n.read);
      
      if (isFirstLoad.current) {
        // Mark all existing unread notifications as "seen" to prevent spamming toasts on login
        unread.forEach(n => alertedIds.current.add(n.id || n._id));
        isFirstLoad.current = false;
      } else {
        // Find new notifications
        unread.forEach(n => {
          const id = n.id || n._id;
          if (!alertedIds.current.has(id)) {
            alertedIds.current.add(id);
            // Trigger Toast!
            triggerToast(n);
          }
        });
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  const triggerToast = (notif) => {
    const toastId = Math.random().toString();
    setToasts(prev => [...prev, { ...notif, toastId }]);
    
    // Auto-remove toast after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.toastId !== toastId));
    }, 5000);
  };

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllAsRead();
      loadNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await api.notifications.markAsRead(id);
      loadNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token && userJson) {
      loadNotifications();
      // Poll every 8 seconds for new tasks/notifications
      const interval = setInterval(loadNotifications, 8000);
      return () => clearInterval(interval);
    }
  }, [token, userJson]);

  // Close dropdown when location changes
  useEffect(() => {
    setShowDropdown(false);
  }, [location.pathname]);

  if (location.pathname === '/login' || location.pathname === '/register') {
    return <>{children}</>;
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="app-container">
      <div className="ambient-glow glow-purple" style={{ top: '5%', left: '5%', opacity: 0.1 }}></div>
      <div className="ambient-glow glow-cyan" style={{ bottom: '10%', right: '10%', opacity: 0.08 }}></div>
      <div className="ambient-glow glow-magenta" style={{ top: '40%', left: '35%', width: '450px', height: '450px', opacity: 0.05 }}></div>

      {/* Floating Notifications Center Bell */}
      <div className="notification-bell-container">
        <button 
          className={`bell-btn ${unreadCount > 0 ? 'has-unread' : ''}`}
          onClick={() => setShowDropdown(!showDropdown)}
        >
          <Bell size={20} />
          {unreadCount > 0 && <span className="bell-badge-dot"></span>}
        </button>

        {showDropdown && (
          <div className="glass-card notification-dropdown">
            <div className="dropdown-header">
              <h3>Notifications</h3>
              {unreadCount > 0 && (
                <button className="mark-all-read-btn" onClick={handleMarkAllRead}>
                  Mark all as read
                </button>
              )}
            </div>
            
            <div className="dropdown-list">
              {notifications.length === 0 ? (
                <div className="empty-notifications">
                  <Info size={28} className="empty-icon" />
                  <p>All quiet! No notifications yet.</p>
                </div>
              ) : (
                notifications.slice(0, 10).map(n => (
                  <div 
                    key={n.id || n._id} 
                    className={`notification-item ${!n.read ? 'unread' : ''}`}
                    onClick={() => !n.read && handleMarkRead(n.id || n._id)}
                  >
                    <div className="item-header">
                      <span className="item-title">{n.title}</span>
                      {!n.read && <span className="unread-indicator"></span>}
                    </div>
                    <p className="item-message">{n.message}</p>
                    <span className="item-date">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Toasts Manager */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.toastId} className="toast-item glass-card">
            <div className="toast-icon-wrapper">
              <Info size={18} />
            </div>
            <div className="toast-content-wrapper">
              <h4>{t.title}</h4>
              <p>{t.message}</p>
            </div>
            <button 
              className="toast-close-btn"
              onClick={() => setToasts(prev => prev.filter(x => x.toastId !== t.toastId))}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

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
  const token = sessionStorage.getItem('intern_tracker_token');
  const userJson = sessionStorage.getItem('intern_tracker_user');
  
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
