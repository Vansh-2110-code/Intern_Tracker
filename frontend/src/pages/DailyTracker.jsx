import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Clock, Plus, Filter, Check, X as CloseIcon, MessageSquare, AlertCircle } from 'lucide-react';
import { api } from '../utils/api';

export default function DailyTracker() {
  const location = useLocation();
  const [logs, setLogs] = useState([]);
  const [subordinates, setSubordinates] = useState([]); // List of managed users to map names
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | pending | approved | rejected

  // Add Log Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLog, setNewLog] = useState({
    date: new Date().toISOString().split('T')[0],
    hours: 8,
    description: ''
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Reject Comment Modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState(null);
  const [rejectComment, setRejectComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const userJson = localStorage.getItem('intern_tracker_user');
  const user = userJson ? JSON.parse(userJson) : null;
  
  // Decide view based on router path
  const isReviewQueue = location.pathname.startsWith('/admin');

  useEffect(() => {
    loadData();
  }, [location.pathname]);

  async function loadData() {
    try {
      setLoading(true);
      const logList = await api.logs.getAll();
      setLogs(logList);

      if (isReviewQueue) {
        const subList = await api.interns.getAll(); // Returns all managed users
        setSubordinates(subList);
      }
    } catch (err) {
      console.error('Error loading tracker logs:', err);
    } finally {
      setLoading(false);
    }
  }

  // Submit daily log
  const handleLogSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (newLog.hours <= 0 || newLog.hours > 24) {
      setFormError('Hours worked must be between 0.1 and 24.');
      return;
    }
    if (!newLog.description.trim()) {
      setFormError('Please enter a brief description of your work.');
      return;
    }

    setFormLoading(true);
    try {
      await api.logs.create(newLog);
      setShowAddModal(false);
      setNewLog({
        date: new Date().toISOString().split('T')[0],
        hours: 8,
        description: ''
      });
      await loadData();
    } catch (err) {
      setFormError(err.message || 'Failed to submit log entry.');
    } finally {
      setFormLoading(false);
    }
  };

  // Supervisor Approve Log
  const handleApproveLog = async (id) => {
    try {
      await api.logs.review(id, { status: 'approved', comments: 'Approved' });
      setLogs(prev => prev.map(log => log.id === id ? { ...log, status: 'approved', comments: 'Approved' } : log));
    } catch (err) {
      alert('Error approving log: ' + err.message);
    }
  };

  // Supervisor Open Reject Modal
  const handleOpenReject = (id) => {
    setSelectedLogId(id);
    setRejectComment('');
    setShowRejectModal(true);
  };

  // Supervisor Confirm Reject Log
  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectComment.trim()) {
      alert('Please specify a rejection reason comment.');
      return;
    }

    setActionLoading(true);
    try {
      await api.logs.review(selectedLogId, { status: 'rejected', comments: rejectComment.trim() });
      setLogs(prev => prev.map(log => log.id === selectedLogId ? { ...log, status: 'rejected', comments: rejectComment.trim() } : log));
      setShowRejectModal(false);
    } catch (err) {
      alert('Error rejecting log: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Get staff name for queue
  const getSubordinateName = (internId) => {
    const match = subordinates.find(s => s.id === internId);
    return match ? match.name : 'Unknown Staff';
  };

  // Filter logs list based on view mode (personal logs vs queue)
  const getFilteredLogs = () => {
    let result = [];
    if (isReviewQueue) {
      // Review queue: show only subordinate logs (exclude self logs)
      result = logs.filter(log => log.internId !== user?.id);
    } else {
      // Personal list: show only self logs
      result = logs.filter(log => log.internId === user?.id);
    }

    if (filter !== 'all') {
      result = result.filter(log => log.status === filter);
    }

    return result.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const currentDisplayLogs = getFilteredLogs();

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading Tracker Information...</p>
      </div>
    );
  }

  return (
    <div className="daily-tracker-page">
      <div className="page-header">
        <div className="page-title">
          <h1>{isReviewQueue ? 'Daily Log Review Queue' : 'My Daily Logs'}</h1>
          <p>{isReviewQueue ? 'Approve or request revisions on worksheets submitted by subordinates.' : 'Document your daily contributions and hours for supervisor verification.'}</p>
        </div>
        {!isReviewQueue && (
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={18} />
            <span>Submit Daily Log</span>
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="glass-card tracker-toolbar">
        <div className="filter-options">
          <Filter size={16} className="filter-icon" />
          <label>Filter Logs:</label>
          <div className="filter-pills">
            <button className={`filter-pill-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All Logs</button>
            <button className={`filter-pill-btn ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>Pending</button>
            <button className={`filter-pill-btn ${filter === 'approved' ? 'active' : ''}`} onClick={() => setFilter('approved')}>Approved</button>
            <button className={`filter-pill-btn ${filter === 'rejected' ? 'active' : ''}`} onClick={() => setFilter('rejected')}>Rejected</button>
          </div>
        </div>
      </div>

      {/* Logs Table Card */}
      <div className="glass-card table-card-container">
        {currentDisplayLogs.length === 0 ? (
          <div className="empty-state">
            <Clock size={40} className="empty-icon text-muted" />
            <p>No activity logs found for the selected filter.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="glass-table">
              <thead>
                <tr>
                  {isReviewQueue && <th>Staff Member</th>}
                  <th>Date</th>
                  <th>Hours</th>
                  <th>Description of Work</th>
                  <th>Status</th>
                  {isReviewQueue ? <th>Actions</th> : <th>Feedback / Comments</th>}
                </tr>
              </thead>
              <tbody>
                {currentDisplayLogs.map(log => (
                  <tr key={log.id}>
                    {isReviewQueue && (
                      <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                        {getSubordinateName(log.internId)}
                      </td>
                    )}
                    <td style={{ whiteSpace: 'nowrap' }}>{log.date}</td>
                    <td style={{ fontWeight: '600' }}>{log.hours} hrs</td>
                    <td className="table-desc-cell">{log.description}</td>
                    <td>
                      <span className={`badge badge-${log.status}`}>
                        {log.status}
                      </span>
                    </td>
                    
                    {isReviewQueue ? (
                      <td>
                        {log.status === 'pending' ? (
                          <div className="action-buttons-cell">
                            <button className="btn btn-success action-btn" onClick={() => handleApproveLog(log.id)}>
                              <Check size={16} />
                              <span>Approve</span>
                            </button>
                            <button className="btn btn-danger action-btn" onClick={() => handleOpenReject(log.id)}>
                              <CloseIcon size={16} />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Reviewed ({log.comments || 'No comment'})
                          </span>
                        )}
                      </td>
                    ) : (
                      <td>
                        {log.comments ? (
                          <div className="comments-cell">
                            <MessageSquare size={14} className="comment-icon" />
                            <span>{log.comments}</span>
                          </div>
                        ) : (
                          <span className="text-muted" style={{ fontStyle: 'italic', fontSize: '0.85rem' }}>No feedback yet</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Log Modal */}
      {showAddModal && !isReviewQueue && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Submit Daily Activity Log</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleLogSubmit}>
              <div className="modal-body">
                {formError && (
                  <div className="login-error-alert" style={{ marginBottom: '1.25rem' }}>
                    <AlertCircle size={16} style={{ marginRight: '0.5rem', flexShrink: 0 }} />
                    <span>{formError}</span>
                  </div>
                )}
                
                <div className="grid-cols-2" style={{ gap: '1rem' }}>
                  <div className="input-group">
                    <label className="input-label">Date</label>
                    <input
                      type="date"
                      className="glass-input"
                      value={newLog.date}
                      onChange={(e) => setNewLog(prev => ({ ...prev, date: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Hours Worked</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="24"
                      className="glass-input"
                      value={newLog.hours}
                      onChange={(e) => setNewLog(prev => ({ ...prev, hours: parseFloat(e.target.value) || 0 }))}
                      required
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Work Description</label>
                  <textarea
                    rows="5"
                    className="glass-textarea"
                    placeholder="Summarize key tasks completed, features created, or issues resolved today..."
                    value={newLog.description}
                    onChange={(e) => setNewLog(prev => ({ ...prev, description: e.target.value }))}
                    required
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                  {formLoading ? 'Submitting...' : 'Submit Worksheet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Comment Modal */}
      {showRejectModal && isReviewQueue && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Reject Log Submission</h3>
              <button className="modal-close" onClick={() => setShowRejectModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleConfirmReject}>
              <div className="modal-body">
                <div className="input-group">
                  <label className="input-label">Rejection Reason / Revision Notes</label>
                  <textarea
                    rows="4"
                    className="glass-textarea"
                    placeholder="Provide revision instructions for the staff member..."
                    value={rejectComment}
                    onChange={(e) => setRejectComment(e.target.value)}
                    required
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRejectModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-danger" disabled={actionLoading}>
                  {actionLoading ? 'Saving...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .tracker-toolbar {
          margin-bottom: 2rem;
          padding: 1.25rem 1.5rem;
        }

        .filter-options {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .filter-icon {
          color: var(--primary);
        }

        .filter-options label {
          font-family: var(--font-display);
          font-weight: 600;
          color: var(--text-secondary);
          font-size: 0.9rem;
        }

        .filter-pills {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .filter-pill-btn {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--glass-border);
          color: var(--text-secondary);
          padding: 0.5rem 1rem;
          border-radius: var(--border-radius-md);
          font-family: var(--font-display);
          font-weight: 500;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .filter-pill-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.06);
        }

        .filter-pill-btn.active {
          color: #ffffff;
          background: var(--primary);
          border-color: var(--primary);
          box-shadow: 0 0 10px rgba(99, 102, 241, 0.3);
        }

        .table-card-container {
          padding: 0.5rem;
        }

        .table-desc-cell {
          max-width: 450px;
          line-height: 1.45;
          color: var(--text-secondary) !important;
          word-break: break-word;
        }

        .action-buttons-cell {
          display: flex;
          gap: 0.5rem;
        }

        .action-btn {
          padding: 0.4rem 0.8rem;
          font-size: 0.8rem;
          border-radius: 6px;
        }

        .comments-cell {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-secondary);
          font-size: 0.85rem;
          background: rgba(255, 255, 255, 0.02);
          padding: 0.4rem 0.75rem;
          border-radius: 6px;
          border: 1px solid var(--glass-border);
        }

        .comment-icon {
          color: var(--primary);
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}
