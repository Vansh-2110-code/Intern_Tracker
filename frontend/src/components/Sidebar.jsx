import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Clock, 
  ClipboardList, 
  Award, 
  MessageSquarePlus, 
  LogOut, 
  User, 
  GraduationCap,
  X,
  ChevronDown
} from 'lucide-react';
import { api } from '../utils/api';

export default function Sidebar({ isOpen, toggleSidebar }) {
  const navigate = useNavigate();
  const userJson = localStorage.getItem('intern_tracker_user');
  const user = userJson ? JSON.parse(userJson) : null;

  const handleLogout = () => {
    api.auth.logout();
    localStorage.removeItem('intern_tracker_user');
    if (toggleSidebar && isOpen) toggleSidebar();
    navigate('/login');
  };

  if (!user) return null;

  const isIntern = user.role === 'intern';
  const isEmployee = user.role === 'employee';
  const isManager = user.role === 'manager';
  const isAdmin = user.role === 'admin';

  return (
    <>
      {/* Sidebar Drawer */}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-area">
            <GraduationCap className="logo-icon" size={28} />
            <div className="logo-text">
              <h2>InternHub</h2>
              <span>Sanna Innovations</span>
            </div>
          </div>
          <button className="sidebar-close-btn" onClick={toggleSidebar}>
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-user">
          <div className="user-avatar">
            <User size={22} />
            <span className="status-indicator"></span>
          </div>
          <div className="user-info">
            <span className="user-name">{user.name}</span>
            <span className="user-role">
              {isAdmin && 'System Administrator'}
              {isManager && (user.internshipTitle || 'Manager')}
              {isEmployee && (user.internshipTitle || 'Senior Developer')}
              {isIntern && (user.internshipTitle || 'Intern')}
            </span>
          </div>
        </div>

        <div className="sidebar-scrollable-container">
          <nav className="sidebar-nav">
            {/* 1. ADMIN MENU */}
            {isAdmin && (
              <>
                <div className="nav-header">Admin Controls</div>
                <NavLink 
                  to="/admin" 
                  end
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => isOpen && toggleSidebar()}
                >
                  <LayoutDashboard size={18} />
                  <span>Subordinate Stats</span>
                </NavLink>
                
                <NavLink 
                  to="/admin/tracker" 
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => isOpen && toggleSidebar()}
                >
                  <Clock size={18} />
                  <span>Log Approvals</span>
                </NavLink>

                <NavLink 
                  to="/admin/tasks" 
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => isOpen && toggleSidebar()}
                >
                  <ClipboardList size={18} />
                  <span>Task Assigner</span>
                </NavLink>

                <NavLink 
                  to="/admin/feedback" 
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => isOpen && toggleSidebar()}
                >
                  <MessageSquarePlus size={18} />
                  <span>Write Reviews</span>
                </NavLink>
              </>
            )}

            {/* 2. MANAGER MENU */}
            {isManager && (
              <>
                <div className="nav-header">Manager Control</div>
                <NavLink 
                  to="/admin" 
                  end
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => isOpen && toggleSidebar()}
                >
                  <LayoutDashboard size={18} />
                  <span>Team Dashboard</span>
                </NavLink>
                
                <NavLink 
                  to="/admin/tracker" 
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => isOpen && toggleSidebar()}
                >
                  <Clock size={18} />
                  <span>Approve Queue</span>
                </NavLink>

                <NavLink 
                  to="/admin/tasks" 
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => isOpen && toggleSidebar()}
                >
                  <ClipboardList size={18} />
                  <span>Assign Tasks</span>
                </NavLink>

                <NavLink 
                  to="/admin/feedback" 
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => isOpen && toggleSidebar()}
                >
                  <MessageSquarePlus size={18} />
                  <span>Write Feedback</span>
                </NavLink>

                <div className="nav-header" style={{ marginTop: '1.25rem' }}>My Personal Tracker</div>
                <NavLink 
                  to="/tracker" 
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => isOpen && toggleSidebar()}
                >
                  <Clock size={18} />
                  <span>Log My Hours</span>
                </NavLink>
                <NavLink 
                  to="/tasks" 
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => isOpen && toggleSidebar()}
                >
                  <ClipboardList size={18} />
                  <span>My Task Board</span>
                </NavLink>
                <NavLink 
                  to="/skills" 
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => isOpen && toggleSidebar()}
                >
                  <Award size={18} />
                  <span>My Skills</span>
                </NavLink>
                <NavLink 
                  to="/feedback" 
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => isOpen && toggleSidebar()}
                >
                  <MessageSquarePlus size={18} />
                  <span>My Reviews</span>
                </NavLink>
              </>
            )}

            {/* 3. EMPLOYEE MENU */}
            {isEmployee && (
              <>
                <div className="nav-header">My Workspace</div>
                <NavLink 
                  to="/dashboard" 
                  end
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => isOpen && toggleSidebar()}
                >
                  <LayoutDashboard size={18} />
                  <span>Dashboard</span>
                </NavLink>
                <NavLink 
                  to="/tracker" 
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => isOpen && toggleSidebar()}
                >
                  <Clock size={18} />
                  <span>Daily Sheet</span>
                </NavLink>
                <NavLink 
                  to="/tasks" 
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => isOpen && toggleSidebar()}
                >
                  <ClipboardList size={18} />
                  <span>My Task Board</span>
                </NavLink>
                <NavLink 
                  to="/skills" 
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => isOpen && toggleSidebar()}
                >
                  <Award size={18} />
                  <span>Skills Log</span>
                </NavLink>
                <NavLink 
                  to="/feedback" 
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => isOpen && toggleSidebar()}
                >
                  <MessageSquarePlus size={18} />
                  <span>Supervisor Feedback</span>
                </NavLink>

                <div className="nav-header" style={{ marginTop: '1.25rem' }}>Supervise Interns</div>
                <NavLink 
                  to="/admin/tracker" 
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => isOpen && toggleSidebar()}
                >
                  <Clock size={18} />
                  <span>Approve Intern Logs</span>
                </NavLink>
                <NavLink 
                  to="/admin/tasks" 
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => isOpen && toggleSidebar()}
                >
                  <ClipboardList size={18} />
                  <span>Assign Intern Tasks</span>
                </NavLink>
                <NavLink 
                  to="/admin/feedback" 
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => isOpen && toggleSidebar()}
                >
                  <MessageSquarePlus size={18} />
                  <span>Write Feedback</span>
                </NavLink>
              </>
            )}

            {/* 4. INTERN MENU */}
            {isIntern && (
              <>
                <div className="nav-header">Intern Workspace</div>
                <NavLink 
                  to="/dashboard" 
                  end
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => isOpen && toggleSidebar()}
                >
                  <LayoutDashboard size={18} />
                  <span>Dashboard</span>
                </NavLink>
                <NavLink 
                  to="/tracker" 
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => isOpen && toggleSidebar()}
                >
                  <Clock size={18} />
                  <span>Daily Tracker</span>
                </NavLink>
                <NavLink 
                  to="/tasks" 
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => isOpen && toggleSidebar()}
                >
                  <ClipboardList size={18} />
                  <span>Task Board</span>
                </NavLink>
                <NavLink 
                  to="/skills" 
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => isOpen && toggleSidebar()}
                >
                  <Award size={18} />
                  <span>Skills Log</span>
                </NavLink>
                <NavLink 
                  to="/feedback" 
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => isOpen && toggleSidebar()}
                >
                  <MessageSquarePlus size={18} />
                  <span>Supervisor Reviews</span>
                </NavLink>
              </>
            )}
          </nav>
        </div>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {isOpen && <div className="sidebar-overlay-bg" onClick={toggleSidebar}></div>}

      <style>{`
        .sidebar {
          width: var(--sidebar-width);
          height: 100vh;
          background: rgba(10, 14, 27, 0.96);
          border-right: 1px solid var(--glass-border);
          display: flex;
          flex-direction: column;
          position: fixed;
          left: 0;
          top: 0;
          z-index: 950;
          backdrop-filter: blur(12px);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .sidebar-header {
          padding: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--glass-border);
          flex-shrink: 0;
        }

        .logo-area {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .logo-icon {
          color: var(--primary);
          filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.5));
        }

        .logo-text h2 {
          font-size: 1.15rem;
          font-weight: 700;
          line-height: 1;
          background: linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .logo-text span {
          font-size: 0.7rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        .sidebar-close-btn {
          display: none;
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
        }

        .sidebar-user {
          padding: 1.25rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.875rem;
          border-bottom: 1px solid var(--glass-border);
          flex-shrink: 0;
        }

        .user-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid var(--glass-border-focus);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
          position: relative;
          flex-shrink: 0;
        }

        .status-indicator {
          width: 10px;
          height: 10px;
          background: var(--success);
          border: 2px solid #0a0e1b;
          border-radius: 50%;
          position: absolute;
          bottom: 1px;
          right: 1px;
          box-shadow: 0 0 6px var(--success);
        }

        .user-info {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .user-name {
          font-family: var(--font-display);
          font-weight: 600;
          font-size: 0.95rem;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .user-role {
          font-size: 0.75rem;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sidebar-scrollable-container {
          flex-grow: 1;
          overflow-y: auto;
          padding: 1rem 0.5rem;
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding: 0 0.5rem;
        }

        .nav-header {
          font-family: var(--font-display);
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          padding: 0.5rem 0.75rem 0.25rem;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.7rem 0.875rem;
          color: var(--text-secondary);
          text-decoration: none;
          border-radius: var(--border-radius-md);
          font-family: var(--font-display);
          font-weight: 500;
          font-size: 0.9rem;
          transition: all 0.2s ease;
        }

        .nav-item:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.04);
          transform: translateX(6px);
        }

        .nav-item.active {
          color: #ffffff;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(6, 182, 212, 0.1) 100%);
          border-left: 3px solid var(--primary);
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.15);
          backdrop-filter: blur(8px);
        }

        .sidebar-footer {
          padding: 1rem 1.25rem;
          border-top: 1px solid var(--glass-border);
          flex-shrink: 0;
        }

        .logout-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: rgba(239, 68, 68, 0.05);
          border: 1px solid rgba(239, 68, 68, 0.15);
          color: #ef4444;
          border-radius: var(--border-radius-md);
          font-family: var(--font-display);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .logout-btn:hover {
          background: rgba(239, 68, 68, 0.15);
          transform: translateY(-2px);
        }

        .sidebar-overlay-bg {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(4, 6, 12, 0.4);
          backdrop-filter: blur(4px);
          z-index: 940;
        }

        @media (max-width: 991px) {
          .sidebar {
            transform: translateX(-100%);
          }
          
          .sidebar.open {
            transform: translateX(0);
          }

          .sidebar-close-btn {
            display: block;
          }
        }
      `}</style>
    </>
  );
}
