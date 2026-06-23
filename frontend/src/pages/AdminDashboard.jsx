import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Clock, 
  CheckCircle2, 
  Star, 
  Search, 
  UserPlus, 
  Mail, 
  Briefcase, 
  Calendar, 
  Eye, 
  Trash2, 
  Edit3, 
  X, 
  AlertTriangle 
} from 'lucide-react';
import { api } from '../utils/api';

export default function AdminDashboard() {
  const [interns, setInterns] = useState([]); // Subordinate users list
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  
  const [stats, setStats] = useState({
    totalSubordinates: 0,
    totalHours: 0,
    pendingApprovals: 0,
    avgRating: 0
  });

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  // Register Intern Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newIntern, setNewIntern] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    role: 'intern', // Default role to create
    internshipTitle: '',
    startDate: '',
    endDate: ''
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Profile Explorer Modal State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedIntern, setSelectedIntern] = useState(null);
  const [profileTab, setProfileTab] = useState('logs'); // logs | tasks | skills | reviews
  const [profileLogs, setProfileLogs] = useState([]);
  const [profileTasks, setProfileTasks] = useState([]);
  const [profileSkills, setProfileSkills] = useState([]);
  const [profileReviews, setProfileReviews] = useState([]);

  const userJson = localStorage.getItem('intern_tracker_user');
  const user = userJson ? JSON.parse(userJson) : null;

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    if (!user) return;
    try {
      setLoading(true);
      const [internList, taskList, logList, feedbackList] = await Promise.all([
        api.interns.getAll(), // Actually returns all subordinate users
        api.tasks.getAll(),
        api.logs.getAll(),
        api.feedback.getAll()
      ]);

      setInterns(internList);
      setTasks(taskList);
      setLogs(logList);
      setFeedbacks(feedbackList);

      // Filter hours logged by subordinates only
      const subordinateIds = internList.map(i => i.id);
      const subLogs = logList.filter(l => subordinateIds.includes(l.internId));
      const totalHours = subLogs.reduce((sum, log) => log.status === 'approved' ? sum + log.hours : sum, 0);
      const pendingCount = subLogs.filter(log => log.status === 'pending').length;
      
      let avg = 0;
      const subFeedback = feedbackList.filter(f => subordinateIds.includes(f.internId));
      if (subFeedback.length > 0) {
        const sumRatings = subFeedback.reduce((sum, f) => sum + (f.performanceRating + f.communicationRating + f.technicalRating) / 3, 0);
        avg = (sumRatings / subFeedback.length).toFixed(1);
      }

      setStats({
        totalSubordinates: internList.length,
        totalHours,
        pendingApprovals: pendingCount,
        avgRating: avg
      });

    } catch (err) {
      console.error('Error fetching admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }

  // Register User Form handlers
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setNewIntern(prev => ({ ...prev, [name]: value }));
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    
    const { username, password, name, email, role, internshipTitle } = newIntern;
    if (!username || !password || !name || !email || !role || !internshipTitle) {
      setFormError('Please fill in all required fields.');
      return;
    }

    setFormLoading(true);
    try {
      await api.interns.create(newIntern);
      setShowAddModal(false);
      setNewIntern({
        username: '',
        password: '',
        name: '',
        email: '',
        role: 'intern',
        internshipTitle: '',
        startDate: '',
        endDate: ''
      });
      // Refresh
      await loadData();
    } catch (err) {
      setFormError(err.message || 'Registration failed.');
    } finally {
      setFormLoading(false);
    }
  };

  // Delete User
  const handleDeleteIntern = async (id, name, role) => {
    if (window.confirm(`Are you sure you want to delete this ${role} "${name}"? This will delete all of their logs, tasks, and feedbacks.`)) {
      try {
        await api.interns.delete(id);
        await loadData();
        if (selectedIntern && selectedIntern.id === id) {
          setShowProfileModal(false);
        }
      } catch (err) {
        alert(err.message || 'Deletion failed.');
      }
    }
  };

  // Profile Explorer opener
  const handleOpenProfile = async (subordinate) => {
    setSelectedIntern(subordinate);
    setProfileTab('logs');
    setShowProfileModal(true);

    const iLogs = logs.filter(l => l.internId === subordinate.id);
    const iTasks = tasks.filter(t => t.internId === subordinate.id);
    const iReviews = feedbacks.filter(f => f.internId === subordinate.id);
    
    setProfileLogs(iLogs);
    setProfileTasks(iTasks);
    setProfileReviews(iReviews);

    // Fetch skills
    try {
      const skillsResponse = await api.skills.getAll();
      const iSkills = skillsResponse.filter(s => s.internId === subordinate.id);
      setProfileSkills(iSkills);
    } catch (err) {
      console.error('Error fetching skills for explorer:', err);
    }
  };

  // Calculate elapsed percentage helper
  const getProgressPercentage = (startStr, endStr) => {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const today = new Date();
    const total = end - start;
    const elapsed = today - start;
    if (total <= 0) return 0;
    return Math.min(Math.max(Math.round((elapsed / total) * 100), 0), 100);
  };

  // Filter list
  const filteredSubordinates = interns.filter(sub => {
    const matchesSearch = sub.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          sub.internshipTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' ? true : sub.status === statusFilter;
    const matchesRole = roleFilter === 'all' ? true : sub.role === roleFilter;
    return matchesSearch && matchesStatus && matchesRole;
  });

  // Get allowed roles that can be registered based on caller hierarchy
  const getAllowedRegistrationRoles = () => {
    if (user?.role === 'admin') {
      return [
        { value: 'admin', label: 'Administrator' },
        { value: 'manager', label: 'Manager' },
        { value: 'employee', label: 'Employee' },
        { value: 'intern', label: 'Intern' }
      ];
    } else if (user?.role === 'manager') {
      return [
        { value: 'employee', label: 'Employee' },
        { value: 'intern', label: 'Intern' }
      ];
    }
    return [{ value: 'intern', label: 'Intern' }];
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading Admin Dashboard Panel...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-page">
      <div className="page-header">
        <div className="page-title">
          <h1>{user?.role === 'admin' ? 'Admin Dashboard' : 'Manager Dashboard'}</h1>
          <p>Supervise teams, track daily workloads, and verify performance ratings.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <UserPlus size={18} />
          <span>Register Subordinate</span>
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid-cols-4 dashboard-stats-grid">
        <div className="glass-card stat-card glass-card-hover">
          <div className="stat-icon-wrapper purple">
            <Users size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Supervised Staff</span>
            <h2 className="stat-value">{stats.totalSubordinates}</h2>
            <div className="stat-subtext">
              <span>Managed profiles</span>
            </div>
          </div>
        </div>

        <div className="glass-card stat-card glass-card-hover">
          <div className="stat-icon-wrapper blue">
            <Clock size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Approved Hours Logged</span>
            <h2 className="stat-value">{stats.totalHours} hrs</h2>
            <div className="stat-subtext">
              <span>Cumulative contributions</span>
            </div>
          </div>
        </div>

        <div className="glass-card stat-card glass-card-hover">
          <div className="stat-icon-wrapper warning-icon-wrapper">
            <Clock size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Pending Approvals</span>
            <h2 className="stat-value">{stats.pendingApprovals}</h2>
            <div className="stat-subtext">
              <span className="text-warning">Daily sheets review required</span>
            </div>
          </div>
        </div>

        <div className="glass-card stat-card glass-card-hover">
          <div className="stat-icon-wrapper green">
            <Star size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Average Performance</span>
            <h2 className="stat-value">{stats.avgRating} / 5.0</h2>
            <div className="stat-subtext">
              <span>Based on reviews</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="glass-card filters-toolbar">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search subordinates by name or title..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="filter-options-group" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="filter-options">
            <label>Role:</label>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="glass-select" style={{ minWidth: '130px' }}>
              <option value="all">All Roles</option>
              {user?.role === 'admin' && <option value="manager">Managers</option>}
              <option value="employee">Employees</option>
              <option value="intern">Interns</option>
            </select>
          </div>

          <div className="filter-options">
            <label>Status:</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="glass-select" style={{ minWidth: '130px' }}>
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid of User Cards */}
      {filteredSubordinates.length === 0 ? (
        <div className="glass-card empty-dashboard-state">
          <Users size={48} className="empty-icon" />
          <h3>No Subordinate Accounts Found</h3>
          <p>Try refining your filters or register a new profile.</p>
        </div>
      ) : (
        <div className="grid-cols-3 interns-grid">
          {filteredSubordinates.map(sub => {
            const progress = getProgressPercentage(sub.startDate, sub.endDate);
            const totalHours = logs
              .filter(l => l.internId === sub.id && l.status === 'approved')
              .reduce((sum, l) => sum + l.hours, 0);

            return (
              <div key={sub.id} className="glass-card intern-card glass-card-hover">
                <div className="card-top">
                  <div className="intern-avatar-large">
                    {sub.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <h3 className="intern-name-display" style={{ margin: 0 }}>{sub.name}</h3>
                      <span className={`badge badge-${sub.role === 'manager' ? 'review' : sub.role === 'employee' ? 'in-progress' : 'todo'}`} style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem' }}>
                        {sub.role}
                      </span>
                      <span className={`status-badge ${sub.isOnline ? 'online' : 'offline'}`}>
                        <span className="status-dot"></span>
                        <span>{sub.isOnline ? 'Active Now' : 'Offline'}</span>
                      </span>
                    </div>
                    <p className="intern-title-display">{sub.internshipTitle}</p>
                  </div>
                </div>

                <div className="card-details">
                  <div className="detail-line">
                    <Mail size={14} className="detail-icon" />
                    <span>{sub.email}</span>
                  </div>
                  <div className="detail-line">
                    <Clock size={14} className="detail-icon" />
                    <span>{totalHours} hrs approved</span>
                  </div>
                  <div className="detail-line">
                    <Calendar size={14} className="detail-icon" />
                    <span>Timeline: {sub.startDate} to {sub.endDate}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="progress-section">
                  <div className="progress-label-row">
                    <span>Program Timeline</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>

                <div className="card-actions">
                  <button className="btn btn-secondary flex-grow" onClick={() => handleOpenProfile(sub)}>
                    <Eye size={16} />
                    <span>Explore Profile</span>
                  </button>
                  <button className="btn btn-danger btn-icon-only" onClick={() => handleDeleteIntern(sub.id, sub.name, sub.role)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Register User Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Register Subordinate User</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleRegisterSubmit}>
              <div className="modal-body">
                {formError && (
                  <div className="login-error-alert" style={{ marginBottom: '1rem' }}>
                    {formError}
                  </div>
                )}
                
                <div className="grid-cols-2" style={{ gap: '1rem' }}>
                  <div className="input-group">
                    <label className="input-label">Username *</label>
                    <input 
                      type="text" 
                      name="username" 
                      value={newIntern.username} 
                      onChange={handleFormChange} 
                      className="glass-input" 
                      required 
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Password *</label>
                    <input 
                      type="password" 
                      name="password" 
                      value={newIntern.password} 
                      onChange={handleFormChange} 
                      className="glass-input" 
                      required 
                    />
                  </div>
                </div>

                <div className="grid-cols-2" style={{ gap: '1rem' }}>
                  <div className="input-group">
                    <label className="input-label">Full Name *</label>
                    <input 
                      type="text" 
                      name="name" 
                      value={newIntern.name} 
                      onChange={handleFormChange} 
                      className="glass-input" 
                      placeholder="e.g. John Doe"
                      required 
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Role *</label>
                    <select
                      name="role"
                      value={newIntern.role}
                      onChange={handleFormChange}
                      className="glass-select"
                      required
                    >
                      {getAllowedRegistrationRoles().map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Email Address *</label>
                  <input 
                    type="email" 
                    name="email" 
                    value={newIntern.email} 
                    onChange={handleFormChange} 
                    className="glass-input" 
                    placeholder="e.g. email@sannainnovations.com"
                    required 
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Title / Designation *</label>
                  <input 
                    type="text" 
                    name="internshipTitle" 
                    value={newIntern.internshipTitle} 
                    onChange={handleFormChange} 
                    className="glass-input" 
                    placeholder="e.g. Senior Software Architect / Frontend Developer Intern"
                    required 
                  />
                </div>

                <div className="grid-cols-2" style={{ gap: '1rem' }}>
                  <div className="input-group">
                    <label className="input-label">Start Date</label>
                    <input 
                      type="date" 
                      name="startDate" 
                      value={newIntern.startDate} 
                      onChange={handleFormChange} 
                      className="glass-input" 
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">End Date</label>
                    <input 
                      type="date" 
                      name="endDate" 
                      value={newIntern.endDate} 
                      onChange={handleFormChange} 
                      className="glass-input" 
                    />
                  </div>
                </div>

              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                  {formLoading ? 'Registering...' : 'Register User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile Explorer Modal */}
      {showProfileModal && selectedIntern && (
        <div className="modal-overlay">
          <div className="modal-content profile-explorer-modal">
            <div className="modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 className="modal-title">{selectedIntern.name}</h3>
                  <span className={`badge badge-${selectedIntern.role === 'manager' ? 'review' : selectedIntern.role === 'employee' ? 'in-progress' : 'todo'}`} style={{ fontSize: '0.65rem' }}>
                    {selectedIntern.role}
                  </span>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{selectedIntern.internshipTitle}</span>
              </div>
              <button className="modal-close" onClick={() => setShowProfileModal(false)}>&times;</button>
            </div>
            
            <div className="profile-tabs-header">
              <button className={`profile-tab ${profileTab === 'logs' ? 'active' : ''}`} onClick={() => setProfileTab('logs')}>Daily Logs</button>
              <button className={`profile-tab ${profileTab === 'tasks' ? 'active' : ''}`} onClick={() => setProfileTab('tasks')}>Task Board</button>
              <button className={`profile-tab ${profileTab === 'skills' ? 'active' : ''}`} onClick={() => setProfileTab('skills')}>Skills</button>
              <button className={`profile-tab ${profileTab === 'reviews' ? 'active' : ''}`} onClick={() => setProfileTab('reviews')}>Reviews</button>
            </div>
            
            <div className="modal-body profile-explorer-body">
              {/* Logs */}
              {profileTab === 'logs' && (
                <div className="explorer-list">
                  {profileLogs.length === 0 ? (
                    <p className="empty-txt">No log worksheets submitted.</p>
                  ) : (
                    profileLogs.map(log => (
                      <div key={log.id} className="explorer-item log-item">
                        <div className="explorer-item-header">
                          <span className="log-date">{log.date} ({log.hours} hrs)</span>
                          <span className={`badge badge-${log.status}`}>{log.status}</span>
                        </div>
                        <p className="log-description">"{log.description}"</p>
                        {log.comments && (
                          <div className="log-feedback-box">
                            <strong>Feedback:</strong> {log.comments}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tasks */}
              {profileTab === 'tasks' && (
                <div className="explorer-list">
                  {profileTasks.length === 0 ? (
                    <p className="empty-txt">No tasks assigned.</p>
                  ) : (
                    profileTasks.map(task => (
                      <div key={task.id} className="explorer-item task-item">
                        <div className="explorer-item-header">
                          <span className="task-title-exp">{task.title}</span>
                          <span className={`badge badge-${task.status.replace('_', '-')}`}>{task.status.replace('_', ' ')}</span>
                        </div>
                        <p className="task-desc-exp">{task.description}</p>
                        <span className="due-label">Due: {task.dueDate}</span>
                        {task.feedback && (
                          <div className="log-feedback-box">
                            <strong>Review comments:</strong> {task.feedback}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Skills */}
              {profileTab === 'skills' && (
                <div className="explorer-list grid-cols-2" style={{ gap: '0.75rem', display: 'grid' }}>
                  {profileSkills.length === 0 ? (
                    <p className="empty-txt" style={{ gridColumn: 'span 2' }}>No skills logged.</p>
                  ) : (
                    profileSkills.map(skill => (
                      <div key={skill.id} className="explorer-item skill-item">
                        <div className="skill-item-row">
                          <strong className="skill-name">{skill.name}</strong>
                          <div className="star-rating">
                            {[1,2,3,4,5].map(star => (
                              <span key={star} className={`star ${star <= skill.proficiency ? 'active' : ''}`}>★</span>
                            ))}
                          </div>
                        </div>
                        {skill.notes && <p className="skill-notes">"{skill.notes}"</p>}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Reviews */}
              {profileTab === 'reviews' && (
                <div className="explorer-list">
                  {profileReviews.length === 0 ? (
                    <p className="empty-txt">No performance reviews exist.</p>
                  ) : (
                    profileReviews.map(f => (
                      <div key={f.id} className="explorer-item feedback-item">
                        <div className="explorer-item-header">
                          <span className="feedback-date">Date: {f.date}</span>
                          <span className="feedback-author">By: {f.reviewerName}</span>
                        </div>
                        <div className="ratings-summary-row">
                          <span>Perf: <strong>{f.performanceRating}/5</strong></span>
                          <span>Tech: <strong>{f.technicalRating}/5</strong></span>
                          <span>Comm: <strong>{f.communicationRating}/5</strong></span>
                        </div>
                        <p className="feedback-text">"{f.comments}"</p>
                      </div>
                    ))
                  )}
                </div>
              )}

            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowProfileModal(false)}>Close Explorer</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .warning-icon-wrapper {
          background: rgba(245, 158, 11, 0.1);
          color: var(--warning);
          border: 1px solid rgba(245, 158, 11, 0.2);
        }

        .filters-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 2rem;
          padding: 1.25rem 1.5rem;
        }

        .search-box {
          position: relative;
          display: flex;
          align-items: center;
          flex-grow: 1;
          max-width: 500px;
        }

        .search-icon {
          position: absolute;
          left: 1.125rem;
          color: var(--text-muted);
        }

        .search-box input {
          background: rgba(8, 12, 26, 0.6);
          border: 1px solid var(--glass-border);
          border-radius: var(--border-radius-md);
          padding: 0.75rem 1.125rem 0.75rem 2.75rem;
          color: var(--text-primary);
          width: 100%;
          outline: none;
          font-family: var(--font-sans);
          transition: all 0.2s ease;
        }

        .search-box input:focus {
          border-color: var(--primary);
          background: rgba(8, 12, 26, 0.9);
        }

        .filter-options {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .filter-options label {
          font-family: var(--font-display);
          font-weight: 500;
          color: var(--text-secondary);
          font-size: 0.9rem;
        }

        .filter-options select {
          padding: 0.5rem 0.75rem;
        }

        .empty-dashboard-state {
          padding: 4rem 2rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          color: var(--text-secondary);
        }

        .empty-dashboard-state h3 {
          font-size: 1.25rem;
          color: var(--text-primary);
        }

        .empty-dashboard-state .empty-icon {
          opacity: 0.3;
          color: var(--text-muted);
        }

        /* Subordinate card layout */
        .intern-card {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .card-top {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .intern-avatar-large {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: var(--primary-gradient);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 1.1rem;
          box-shadow: 0 4px 10px rgba(99, 102, 241, 0.3);
          flex-shrink: 0;
        }

        .intern-name-display {
          font-size: 1.05rem;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .intern-title-display {
          font-size: 0.8rem;
          color: var(--text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .card-details {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .detail-line {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .detail-icon {
          color: var(--primary);
        }

        .progress-section {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .progress-label-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .progress-bar-bg {
          width: 100%;
          height: 6px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 999px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: var(--primary-gradient);
          border-radius: 999px;
          transition: width 0.4s ease;
        }

        .card-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }

        .btn-icon-only {
          padding: 0;
          width: 44px;
          height: 44px;
          flex-shrink: 0;
        }

        .flex-grow {
          flex-grow: 1;
        }

        /* Profile Explorer modal structural styles */
        .profile-explorer-modal {
          max-width: 700px !important;
        }

        .profile-tabs-header {
          display: flex;
          border-bottom: 1px solid var(--glass-border);
          padding: 0 1.5rem;
          background: rgba(0, 0, 0, 0.2);
        }

        .profile-tab {
          background: none;
          border: none;
          color: var(--text-secondary);
          padding: 1rem 1.25rem;
          font-family: var(--font-display);
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.2s ease;
        }

        .profile-tab:hover {
          color: var(--text-primary);
        }

        .profile-tab.active {
          color: var(--primary);
          border-bottom-color: var(--primary);
        }

        .profile-explorer-body {
          min-height: 350px;
          max-height: 450px !important;
        }

        .explorer-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .explorer-item {
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid var(--glass-border);
          border-radius: var(--border-radius-md);
          padding: 1rem;
        }

        .explorer-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .log-date {
          font-weight: 600;
          font-size: 0.9rem;
          color: var(--text-primary);
        }

        .log-description, .task-desc-exp, .feedback-text {
          font-size: 0.85rem;
          color: var(--text-secondary);
          line-height: 1.45;
        }

        .log-feedback-box {
          background: rgba(99, 102, 241, 0.05);
          border-left: 2px solid var(--primary);
          border-radius: 4px;
          padding: 0.5rem 0.75rem;
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin-top: 0.75rem;
        }

        .empty-txt {
          text-align: center;
          color: var(--text-muted);
          font-size: 0.9rem;
          margin-top: 3rem;
        }

        .task-title-exp {
          font-weight: 600;
          color: var(--text-primary);
          font-size: 0.95rem;
        }

        .due-label {
          display: block;
          font-size: 0.75rem;
          color: var(--danger);
          margin-top: 0.5rem;
          font-weight: 500;
        }

        .skill-item-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.35rem;
        }

        .skill-name {
          font-size: 0.9rem;
          color: var(--text-primary);
        }

        .skill-notes {
          font-size: 0.8rem;
          color: var(--text-secondary);
          font-style: italic;
        }

        .feedback-date {
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--text-muted);
        }

        .feedback-author {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--accent);
        }

        .ratings-summary-row {
          display: flex;
          gap: 1.5rem;
          font-size: 0.8rem;
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.02);
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          margin-bottom: 0.5rem;
          width: fit-content;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.65rem;
          font-weight: 600;
          padding: 0.15rem 0.5rem;
          border-radius: 9999px;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          border: 1px solid var(--glass-border);
          background: rgba(255, 255, 255, 0.02);
        }

        .status-badge.online {
          color: #34d399;
          border-color: rgba(16, 185, 129, 0.2);
          background: rgba(16, 185, 129, 0.05);
        }

        .status-badge.online .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--success);
          box-shadow: 0 0 6px var(--success);
        }

        .status-badge.offline {
          color: var(--text-muted);
          border-color: rgba(255, 255, 255, 0.05);
        }

        .status-badge.offline .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
