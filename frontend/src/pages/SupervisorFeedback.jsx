import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageSquare, Star, Plus, User, Calendar, Award, Send } from 'lucide-react';
import { api } from '../utils/api';

export default function SupervisorFeedback() {
  const location = useLocation();
  const [feedbacks, setFeedbacks] = useState([]);
  const [subordinates, setSubordinates] = useState([]); // Managed staff list
  const [loading, setLoading] = useState(true);
  const [selectedInternFilter, setSelectedInternFilter] = useState('all');

  // Submit Feedback Form State
  const [feedbackForm, setFeedbackForm] = useState({
    internId: '',
    performanceRating: 5,
    technicalRating: 5,
    communicationRating: 5,
    comments: ''
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const userJson = localStorage.getItem('intern_tracker_user');
  const user = userJson ? JSON.parse(userJson) : null;
  
  // Decide view based on router path
  const isWriteMode = location.pathname.startsWith('/admin');

  useEffect(() => {
    loadData();
  }, [location.pathname]);

  async function loadData() {
    try {
      setLoading(true);
      const feedbackList = await api.feedback.getAll();
      setFeedbacks(feedbackList);

      if (isWriteMode) {
        const subList = await api.interns.getAll(); // Returns all managed users
        setSubordinates(subList);
      }
    } catch (err) {
      console.error('Error fetching feedbacks:', err);
    } finally {
      setLoading(false);
    }
  }

  // Submit feedback
  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const { internId, comments } = feedbackForm;
    if (!internId) {
      setFormError('Please select a recipient to evaluate.');
      return;
    }
    if (!comments.trim()) {
      setFormError('Please provide evaluation comments.');
      return;
    }

    setFormLoading(true);
    try {
      const created = await api.feedback.create(feedbackForm);
      setFeedbacks(prev => [created, ...prev]);
      
      setFeedbackForm({
        internId: '',
        performanceRating: 5,
        technicalRating: 5,
        communicationRating: 5,
        comments: ''
      });
      alert('Feedback logged successfully!');
    } catch (err) {
      setFormError(err.message || 'Failed to submit feedback.');
    } finally {
      setFormLoading(false);
    }
  };

  // Map user ID to Name
  const getSubordinateName = (internId) => {
    const match = subordinates.find(s => s.id === internId);
    return match ? match.name : 'Unknown Staff';
  };

  // Filter feedbacks
  const getFilteredFeedbacks = () => {
    if (isWriteMode) {
      // Write Mode: show reviews written BY the supervisor, or reviews of their subordinates
      let list = feedbacks.filter(f => f.reviewerName === user?.name);
      if (selectedInternFilter !== 'all') {
        list = list.filter(f => f.internId === selectedInternFilter);
      }
      return list;
    } else {
      // Personal mode: show reviews written FOR the logged-in user
      return feedbacks.filter(f => f.internId === user?.id);
    }
  };

  const currentDisplayFeedbacks = getFilteredFeedbacks();

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading Feedback Records...</p>
      </div>
    );
  }

  return (
    <div className="supervisor-feedback-page">
      <div className="page-header">
        <div className="page-title">
          <h1>{isWriteMode ? 'Evaluation Console' : 'My Performance Reviews'}</h1>
          <p>{isWriteMode ? 'Conduct formal reviews and evaluate performance metrics.' : 'Inspect evaluations, performance metrics, and feedback recorded by supervisors.'}</p>
        </div>
      </div>

      {isWriteMode ? (
        // Supervisor View: Write Form + History List
        <div className="grid-cols-3 admin-feedback-layout">
          {/* Write Form */}
          <div className="glass-card feedback-form-card grid-span-1" style={{ height: 'fit-content' }}>
            <div className="card-header-with-icon">
              <Award className="card-header-icon" size={22} />
              <h3>Evaluate Subordinate</h3>
            </div>
            
            <form onSubmit={handleFeedbackSubmit} className="feedback-form">
              {formError && (
                <div className="login-error-alert" style={{ marginBottom: '1.25rem' }}>
                  <span>{formError}</span>
                </div>
              )}

              <div className="input-group">
                <label className="input-label">Select Staff Member *</label>
                <select
                  className="glass-select"
                  value={feedbackForm.internId}
                  onChange={(e) => setFeedbackForm(prev => ({ ...prev, internId: e.target.value }))}
                  required
                >
                  <option value="">Select Member...</option>
                  {subordinates.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name} ({sub.internshipTitle || sub.role})</option>
                  ))}
                </select>
              </div>

              {/* Sliders for Ratings */}
              <div className="ratings-sliders">
                <div className="slider-group">
                  <div className="slider-label-row">
                    <label className="input-label">Performance Quality</label>
                    <span className="slider-val">{feedbackForm.performanceRating} / 5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    className="glass-range-slider"
                    value={feedbackForm.performanceRating}
                    onChange={(e) => setFeedbackForm(prev => ({ ...prev, performanceRating: parseInt(e.target.value) }))}
                  />
                </div>

                <div className="slider-group">
                  <div className="slider-label-row">
                    <label className="input-label">Technical Aptitude</label>
                    <span className="slider-val">{feedbackForm.technicalRating} / 5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    className="glass-range-slider"
                    value={feedbackForm.technicalRating}
                    onChange={(e) => setFeedbackForm(prev => ({ ...prev, technicalRating: parseInt(e.target.value) }))}
                  />
                </div>

                <div className="slider-group">
                  <div className="slider-label-row">
                    <label className="input-label">Communication & Collaboration</label>
                    <span className="slider-val">{feedbackForm.communicationRating} / 5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    className="glass-range-slider"
                    value={feedbackForm.communicationRating}
                    onChange={(e) => setFeedbackForm(prev => ({ ...prev, communicationRating: parseInt(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Written Comments & Evaluation notes *</label>
                <textarea
                  rows="4"
                  className="glass-textarea"
                  placeholder="Share details on strengths, contributions, and areas needing development..."
                  value={feedbackForm.comments}
                  onChange={(e) => setFeedbackForm(prev => ({ ...prev, comments: e.target.value }))}
                  required
                ></textarea>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={formLoading}>
                <Send size={16} />
                <span>Submit Evaluation</span>
              </button>
            </form>
          </div>

          {/* Feedback History List */}
          <div className="feedback-history-section grid-span-2">
            <div className="glass-card board-toolbar" style={{ marginBottom: '1.25rem' }}>
              <div className="filter-options">
                <User size={16} className="filter-icon" />
                <label>Filter Reviews:</label>
                <select
                  value={selectedInternFilter}
                  onChange={(e) => setSelectedInternFilter(e.target.value)}
                  className="glass-select"
                  style={{ width: '220px' }}
                >
                  <option value="all">All Reviews</option>
                  {subordinates.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="feedbacks-history-list">
              {currentDisplayFeedbacks.length === 0 ? (
                <div className="glass-card empty-dashboard-state">
                  <MessageSquare size={40} className="empty-icon" />
                  <h3>No Feedback Records Registered</h3>
                  <p>Submit evaluations on the left panel to populate database history.</p>
                </div>
              ) : (
                currentDisplayFeedbacks.map(fb => (
                  <FeedbackCard key={fb.id} fb={fb} isSuper={true} targetName={getSubordinateName(fb.internId)} />
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        // Personal Feedback View
        <div className="feedbacks-list-container">
          {currentDisplayFeedbacks.length === 0 ? (
            <div className="glass-card empty-dashboard-state">
              <MessageSquare size={40} className="empty-icon" />
              <h3>No Reviews Found</h3>
              <p>Your supervisors have not registered any performance feedback reports yet.</p>
            </div>
          ) : (
            <div className="feedbacks-history-list max-width-centered">
              {currentDisplayFeedbacks.map(fb => (
                <FeedbackCard key={fb.id} fb={fb} isSuper={false} />
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        .admin-feedback-layout {
          align-items: flex-start;
        }

        .card-header-with-icon {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--glass-border);
          margin-bottom: 1.5rem;
        }

        .card-header-icon {
          color: var(--primary);
        }

        .ratings-sliders {
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid var(--glass-border);
          border-radius: var(--border-radius-md);
          padding: 1.25rem;
          margin-bottom: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .slider-group {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .slider-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .slider-val {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 0.95rem;
          color: var(--accent);
        }

        .glass-range-slider {
          -webkit-appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.05);
          outline: none;
          transition: all 0.2s;
        }

        .glass-range-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--primary);
          cursor: pointer;
          box-shadow: 0 0 8px var(--primary-glow);
          transition: all 0.1s ease;
        }

        .glass-range-slider::-webkit-slider-thumb:hover {
          transform: scale(1.15);
          box-shadow: 0 0 12px var(--primary);
        }

        .feedbacks-history-list {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .max-width-centered {
          max-width: 800px;
          margin: 0 auto;
        }

        .grid-span-2 {
          grid-column: span 2;
        }

        @media (max-width: 1200px) {
          .grid-span-2, .grid-span-1 {
            grid-column: span 3;
          }
        }
      `}</style>
    </div>
  );
}

// Child Feedback Card Component
function FeedbackCard({ fb, isSuper, targetName }) {
  const avg = ((fb.performanceRating + fb.technicalRating + fb.communicationRating) / 3).toFixed(1);
  
  return (
    <div className="glass-card feedback-full-card glass-card-hover">
      <div className="feedback-card-top-row">
        <div className="feedback-left-info">
          <div className="evaluator-avatar-pill">
            <MessageSquare size={18} />
          </div>
          <div>
            <h4 className="evaluator-title">
              {isSuper ? `Evaluation for ${targetName}` : `Review Report from ${fb.reviewerName}`}
            </h4>
            <div className="evaluator-meta">
              <Calendar size={13} />
              <span>{fb.date}</span>
              {isSuper && (
                <>
                  <span>•</span>
                  <span>Evaluator: {fb.reviewerName}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="average-rating-container">
          <span className="avg-lbl">Avg Score</span>
          <span className="avg-val-badge">
            {avg} <Star size={14} className="star-fill" />
          </span>
        </div>
      </div>

      {/* Ratings scores summary layout */}
      <div className="ratings-scores-summary">
        <div className="score-pill">
          <span>Performance:</span>
          <div className="stars-mini">
            {[1,2,3,4,5].map(s => <span key={s} className={`star ${s <= fb.performanceRating ? 'active' : ''}`}>★</span>)}
          </div>
        </div>
        <div className="score-pill">
          <span>Technical:</span>
          <div className="stars-mini">
            {[1,2,3,4,5].map(s => <span key={s} className={`star ${s <= fb.technicalRating ? 'active' : ''}`}>★</span>)}
          </div>
        </div>
        <div className="score-pill">
          <span>Communication:</span>
          <div className="stars-mini">
            {[1,2,3,4,5].map(s => <span key={s} className={`star ${s <= fb.communicationRating ? 'active' : ''}`}>★</span>)}
          </div>
        </div>
      </div>

      <div className="feedback-full-comments">
        <p>"{fb.comments}"</p>
      </div>

      <style>{`
        .feedback-full-card {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .feedback-card-top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .feedback-left-info {
          display: flex;
          align-items: center;
          gap: 0.875rem;
        }

        .evaluator-avatar-pill {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: rgba(99, 102, 241, 0.08);
          border: 1px solid var(--glass-border-focus);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
        }

        .evaluator-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .evaluator-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.775rem;
          color: var(--text-secondary);
          margin-top: 0.15rem;
        }

        .average-rating-container {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .avg-lbl {
          font-size: 0.7rem;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 500;
        }

        .avg-val-badge {
          background: rgba(234, 179, 8, 0.1);
          border: 1px solid rgba(234, 179, 8, 0.3);
          color: #eab308;
          padding: 0.35rem 0.75rem;
          border-radius: 8px;
          font-family: var(--font-display);
          font-weight: 800;
          font-size: 1.05rem;
          display: flex;
          align-items: center;
          gap: 0.35rem;
          margin-top: 0.15rem;
          box-shadow: 0 0 10px rgba(234, 179, 8, 0.1);
        }

        .ratings-scores-summary {
          display: flex;
          gap: 1.25rem;
          flex-wrap: wrap;
          padding: 0.875rem 1.25rem;
          background: rgba(0, 0, 0, 0.15);
          border-radius: var(--border-radius-md);
          border: 1px solid var(--glass-border);
        }

        .score-pill {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.825rem;
          color: var(--text-secondary);
        }

        .stars-mini {
          display: flex;
          gap: 1px;
        }

        .stars-mini .star {
          font-size: 0.95rem;
        }

        .feedback-full-comments {
          font-family: var(--font-sans);
          line-height: 1.5;
          font-size: 0.925rem;
          color: var(--text-secondary);
          padding: 0.25rem 0.5rem;
          border-left: 3px solid var(--accent);
          padding-left: 1rem;
        }
      `}</style>
    </div>
  );
}
