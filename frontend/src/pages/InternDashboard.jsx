import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle2, ClipboardList, BookOpen, Star, AlertCircle, ArrowRight } from 'lucide-react';
import { api } from '../utils/api';

export default function InternDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalHours: 0,
    approvedHours: 0,
    pendingHours: 0,
    totalTasks: 0,
    completedTasks: 0,
    activeTasks: 0,
    skillsCount: 0,
  });
  const [recentTasks, setRecentTasks] = useState([]);
  const [latestFeedback, setLatestFeedback] = useState(null);
  const [internshipPercent, setInternshipPercent] = useState(0);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [loading, setLoading] = useState(true);

  const userJson = sessionStorage.getItem('intern_tracker_user');
  const user = userJson ? JSON.parse(userJson) : null;

  useEffect(() => {
    if (!user) return;

    // Calculate time metrics
    const start = new Date(user.startDate);
    const end = new Date(user.endDate);
    const today = new Date();

    const totalDuration = end - start;
    const elapsed = today - start;

    if (totalDuration > 0) {
      const percentage = Math.min(Math.max(Math.round((elapsed / totalDuration) * 100), 0), 100);
      setInternshipPercent(percentage);
    } else {
      setInternshipPercent(0);
    }

    const timeDiff = end - today;
    const daysLeft = Math.max(Math.ceil(timeDiff / (1000 * 60 * 60 * 24)), 0);
    setDaysRemaining(daysLeft);

    async function loadData() {
      try {
        const [tasks, logs, skills, feedback] = await Promise.all([
          api.tasks.getAll(),
          api.logs.getAll(),
          api.skills.getAll(),
          api.feedback.getAll(),
        ]);

        // Filter lists to only include personal items (important for hybrid Employee/Manager roles)
        const personalTasks = tasks.filter(t => t.internId === user.id);
        const personalLogs = logs.filter(l => l.internId === user.id);
        const personalSkills = skills.filter(s => s.internId === user.id);
        const personalFeedback = feedback.filter(f => f.internId === user.id);

        // Calculate hours from personal logs
        let total = 0;
        let approved = 0;
        let pending = 0;
        personalLogs.forEach(l => {
          total += l.hours;
          if (l.status === 'approved') approved += l.hours;
          if (l.status === 'pending') pending += l.hours;
        });

        // Calculate task stats from personal tasks
        const active = personalTasks.filter(t => t.status !== 'completed').length;
        const completed = personalTasks.filter(t => t.status === 'completed').length;

        setStats({
          totalHours: total,
          approvedHours: approved,
          pendingHours: pending,
          totalTasks: personalTasks.length,
          completedTasks: completed,
          activeTasks: active,
          skillsCount: personalSkills.length
        });

        // Sort and select recent personal tasks
        setRecentTasks(personalTasks.filter(t => t.status !== 'completed').slice(0, 3));
        
        if (personalFeedback && personalFeedback.length > 0) {
          // Sort by date and select latest
          const sorted = [...personalFeedback].sort((a, b) => new Date(b.date) - new Date(a.date));
          setLatestFeedback(sorted[0]);
        }

      } catch (err) {
        console.error('Error fetching dashboard statistics:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading Dashboard Analytics...</p>
      </div>
    );
  }

  return (
    <div className="intern-dashboard-page">
      <div className="page-header">
        <div className="page-title">
          <h1>Welcome Back, {user?.name.split(' ')[0]}!</h1>
          <p>Here is the overview of your progress and activities.</p>
        </div>
        <div className="header-action">
          <button className="btn btn-primary" onClick={() => navigate('/tracker')}>
            <Clock size={18} />
            <span>Log Today's Work</span>
          </button>
        </div>
      </div>

      {/* Stats Widgets */}
      <div className="grid-cols-4 dashboard-stats-grid">
        <div className="glass-card stat-card glass-card-hover">
          <div className="stat-icon-wrapper purple">
            <Clock size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Hours Logged</span>
            <h2 className="stat-value">{stats.totalHours} hrs</h2>
            <div className="stat-subtext">
              <span className="text-success">{stats.approvedHours} Appr</span>
              <span> | </span>
              <span className="text-warning">{stats.pendingHours} Pend</span>
            </div>
          </div>
        </div>

        <div className="glass-card stat-card glass-card-hover">
          <div className="stat-icon-wrapper blue">
            <ClipboardList size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Task Completion</span>
            <h2 className="stat-value">
              {stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}%
            </h2>
            <div className="stat-subtext text-secondary">
              <span>{stats.completedTasks} of {stats.totalTasks} completed</span>
            </div>
          </div>
        </div>

        <div className="glass-card stat-card glass-card-hover">
          <div className="stat-icon-wrapper cyan">
            <BookOpen size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Skills Logged</span>
            <h2 className="stat-value">{stats.skillsCount}</h2>
            <div className="stat-subtext text-secondary">
              <span>Technologies cataloged</span>
            </div>
          </div>
        </div>

        <div className="glass-card stat-card glass-card-hover">
          <div className="stat-icon-wrapper green">
            <CheckCircle2 size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Days Left</span>
            <h2 className="stat-value">{daysRemaining} Days</h2>
            <div className="stat-subtext text-secondary">
              <span>Out of timeline duration</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Progress & Details */}
      <div className="grid-cols-3 dashboard-main-grid">
        {/* Progress Ring Widget */}
        <div className="glass-card progress-ring-card grid-span-1">
          <h3>Timeline Completion</h3>
          <div className="progress-ring-container">
            <div className="progress-ring-outer">
              <svg className="progress-ring-svg" width="160" height="160">
                <circle
                  className="progress-ring-circle-bg"
                  stroke="rgba(255, 255, 255, 0.04)"
                  strokeWidth="12"
                  fill="transparent"
                  r="68"
                  cx="80"
                  cy="80"
                />
                <circle
                  className="progress-ring-circle-fill"
                  stroke="url(#purpleBlueGradient)"
                  strokeWidth="12"
                  strokeDasharray={`${2 * Math.PI * 68}`}
                  strokeDashoffset={`${2 * Math.PI * 68 * (1 - internshipPercent / 100)}`}
                  strokeLinecap="round"
                  fill="transparent"
                  r="68"
                  cx="80"
                  cy="80"
                />
                <defs>
                  <linearGradient id="purpleBlueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="progress-ring-text">
                <span className="percent">{internshipPercent}%</span>
                <span className="label">Elapsed</span>
              </div>
            </div>
          </div>
          <div className="progress-dates">
            <div>
              <span>Start Date</span>
              <p>{user?.startDate}</p>
            </div>
            <div className="date-separator"></div>
            <div>
              <span>End Date</span>
              <p>{user?.endDate}</p>
            </div>
          </div>
        </div>

        {/* Recent Tasks */}
        <div className="glass-card recent-tasks-card grid-span-1">
          <div className="card-header-flex">
            <h3>Active Tasks</h3>
            <button className="text-btn" onClick={() => navigate('/tasks')}>
              <span>View Board</span>
              <ArrowRight size={14} />
            </button>
          </div>
          <div className="recent-tasks-list">
            {recentTasks.length === 0 ? (
              <div className="empty-state">
                <CheckCircle2 size={36} className="empty-icon text-success" />
                <p>All caught up! No active tasks assigned.</p>
              </div>
            ) : (
              recentTasks.map(task => (
                <div key={task.id} className="mini-task-item" onClick={() => navigate('/tasks')}>
                  <div className="task-status-bar"></div>
                  <div className="task-details">
                    <h4>{task.title}</h4>
                    <p className="task-desc">{task.description}</p>
                    <span className="task-due text-danger">Due: {task.dueDate}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Latest Supervisor Review */}
        <div className="glass-card feedback-widget-card grid-span-1">
          <div className="card-header-flex">
            <h3>Supervisor Reviews</h3>
            <button className="text-btn" onClick={() => navigate('/feedback')}>
              <span>All Reviews</span>
              <ArrowRight size={14} />
            </button>
          </div>
          <div className="latest-feedback-content">
            {!latestFeedback ? (
              <div className="empty-state">
                <AlertCircle size={36} className="empty-icon text-muted" />
                <p>No feedback reports registered yet.</p>
              </div>
            ) : (
              <div className="feedback-preview">
                <div className="rating-metrics">
                  <div className="rating-pill">
                    <span className="rating-label">Performance</span>
                    <span className="rating-val">
                      {latestFeedback.performanceRating} <Star size={12} className="star-fill" />
                    </span>
                  </div>
                  <div className="rating-pill">
                    <span className="rating-label">Technical</span>
                    <span className="rating-val">
                      {latestFeedback.technicalRating} <Star size={12} className="star-fill" />
                    </span>
                  </div>
                </div>
                <div className="feedback-message-bubble">
                  <p>"{latestFeedback.comments}"</p>
                </div>
                <div className="feedback-reviewer">
                  <span className="reviewer-avatar">{latestFeedback.reviewerName.charAt(0)}</span>
                  <div>
                    <span className="reviewer-name">{latestFeedback.reviewerName}</span>
                    <span className="reviewer-date">{latestFeedback.date}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .dashboard-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 80vh;
          gap: 1rem;
          color: var(--text-secondary);
        }

        .dashboard-stats-grid {
          margin-bottom: 2rem;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          padding: 1.5rem;
        }

        .stat-icon-wrapper {
          width: 52px;
          height: 52px;
          border-radius: var(--border-radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255,255,255,0.05);
        }

        .stat-icon-wrapper.purple {
          background: rgba(99, 102, 241, 0.1);
          color: var(--primary);
          border-color: rgba(99, 102, 241, 0.2);
        }

        .stat-icon-wrapper.blue {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
          border-color: rgba(59, 130, 246, 0.2);
        }

        .stat-icon-wrapper.cyan {
          background: rgba(6, 182, 212, 0.1);
          color: var(--accent);
          border-color: rgba(6, 182, 212, 0.2);
        }

        .stat-icon-wrapper.green {
          background: rgba(16, 185, 129, 0.1);
          color: var(--success);
          border-color: rgba(16, 185, 129, 0.2);
        }

        .stat-info {
          display: flex;
          flex-direction: column;
        }

        .stat-label {
          font-size: 0.85rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          font-family: var(--font-display);
          color: var(--text-primary);
          line-height: 1.2;
          margin: 0.1rem 0;
        }

        .stat-subtext {
          font-size: 0.75rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        .text-success { color: var(--success); }
        .text-warning { color: var(--warning); }
        .text-danger { color: var(--danger); }

        .dashboard-main-grid {
          align-items: stretch;
        }

        /* Progress ring styles */
        .progress-ring-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .progress-ring-card h3 {
          align-self: flex-start;
          font-size: 1.1rem;
          color: var(--text-primary);
          margin-bottom: 1.5rem;
        }

        .progress-ring-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 1rem 0;
        }

        .progress-ring-outer {
          position: relative;
          width: 160px;
          height: 160px;
        }

        .progress-ring-circle-fill {
          transition: stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .progress-ring-text {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .progress-ring-text .percent {
          font-family: var(--font-display);
          font-size: 2rem;
          font-weight: 800;
          color: #ffffff;
          line-height: 1;
        }

        .progress-ring-text .label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-top: 0.25rem;
        }

        .progress-dates {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          margin-top: 1.75rem;
          padding-top: 1.25rem;
          border-top: 1px solid var(--glass-border);
        }

        .progress-dates div span {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .progress-dates div p {
          font-family: var(--font-display);
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-top: 0.15rem;
        }

        .date-separator {
          width: 1px;
          height: 24px;
          background: var(--glass-border);
        }

        /* Recent Tasks and Cards */
        .card-header-flex {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .card-header-flex h3 {
          font-size: 1.1rem;
        }

        .text-btn {
          background: none;
          border: none;
          color: var(--primary);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-family: var(--font-display);
          font-weight: 600;
          font-size: 0.85rem;
          transition: all 0.2s ease;
        }

        .text-btn:hover {
          color: var(--text-primary);
          transform: translateX(2px);
        }

        .recent-tasks-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          min-height: 220px;
        }

        .mini-task-item {
          display: flex;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--glass-border);
          border-radius: var(--border-radius-md);
          overflow: hidden;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .mini-task-item:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(99, 102, 241, 0.2);
          transform: scale(1.01);
        }

        .task-status-bar {
          width: 5px;
          background: var(--primary-gradient);
          flex-shrink: 0;
        }

        .task-details {
          padding: 0.875rem 1.125rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          overflow: hidden;
        }

        .task-details h4 {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .task-desc {
          font-size: 0.8rem;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .task-due {
          font-size: 0.75rem;
          font-weight: 500;
          margin-top: 0.25rem;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          min-height: 200px;
          gap: 0.75rem;
          color: var(--text-muted);
          text-align: center;
          padding: 1rem;
        }

        .empty-icon {
          opacity: 0.5;
        }

        /* Feedback Preview */
        .latest-feedback-content {
          min-height: 220px;
        }

        .feedback-preview {
          display: flex;
          flex-direction: column;
          gap: 1.125rem;
        }

        .rating-metrics {
          display: flex;
          gap: 0.75rem;
        }

        .rating-pill {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--glass-border);
          border-radius: var(--border-radius-md);
          padding: 0.4rem 0.75rem;
          display: flex;
          flex-direction: column;
          flex-grow: 1;
        }

        .rating-label {
          font-size: 0.7rem;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 500;
        }

        .rating-val {
          font-family: var(--font-display);
          font-size: 1rem;
          font-weight: 700;
          color: #ffffff;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          margin-top: 0.1rem;
        }

        .star-fill {
          color: #eab308;
          fill: #eab308;
        }

        .feedback-message-bubble {
          background: rgba(99, 102, 241, 0.04);
          border-left: 3px solid var(--primary);
          border-radius: 0 var(--border-radius-md) var(--border-radius-md) 0;
          padding: 1rem 1.25rem;
          font-style: italic;
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .feedback-reviewer {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .reviewer-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(6, 182, 212, 0.1);
          border: 1px solid rgba(6, 182, 212, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent);
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 0.85rem;
        }

        .reviewer-name {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .reviewer-date {
          display: block;
          font-size: 0.75rem;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
