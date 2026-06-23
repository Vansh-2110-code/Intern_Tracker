import React, { useState, useEffect } from 'react';
import { Award, Plus, Sparkles, Calendar, BookOpen, Star, User } from 'lucide-react';
import { api } from '../utils/api';

export default function SkillsLog() {
  const [skills, setSkills] = useState([]);
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInternFilter, setSelectedInternFilter] = useState('all');

  // Add Skill Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSkill, setNewSkill] = useState({
    name: '',
    proficiency: 3,
    notes: ''
  });
  const [hoverRating, setHoverRating] = useState(0);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const userJson = localStorage.getItem('intern_tracker_user');
  const user = userJson ? JSON.parse(userJson) : null;
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const skillList = await api.skills.getAll();
      setSkills(skillList);

      if (isAdmin) {
        const internList = await api.interns.getAll(); // Returns subordinate staff
        setInterns(internList);
      }
    } catch (err) {
      console.error('Error fetching skills:', err);
    } finally {
      setLoading(false);
    }
  }

  // Handle skill submission
  const handleSkillSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!newSkill.name.trim()) {
      setFormError('Please enter a skill name.');
      return;
    }
    if (newSkill.proficiency < 1 || newSkill.proficiency > 5) {
      setFormError('Please select a star rating between 1 and 5.');
      return;
    }

    setFormLoading(true);
    try {
      const updatedOrCreated = await api.skills.create(newSkill);
      
      // Update local state
      setSkills(prev => {
        const index = prev.findIndex(s => s.internId === user.id && s.name.toLowerCase() === updatedOrCreated.name.toLowerCase());
        if (index !== -1) {
          const list = [...prev];
          list[index] = updatedOrCreated;
          return list;
        }
        return [...prev, updatedOrCreated];
      });

      setShowAddModal(false);
      setNewSkill({
        name: '',
        proficiency: 3,
        notes: ''
      });
    } catch (err) {
      setFormError(err.message || 'Failed to record skill.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleRatingClick = (val) => {
    setNewSkill(prev => ({ ...prev, proficiency: val }));
  };

  const handleRatingHover = (val) => {
    setHoverRating(val);
  };

  // Filter skills list
  const filteredSkills = skills.filter(skill => {
    if (isAdmin) {
      if (selectedInternFilter === 'all') return true;
      return skill.internId === selectedInternFilter;
    } else {
      // Non-admin logs (including hybrid Manager/Employee) only see their own logged skills in their list
      return skill.internId === user?.id;
    }
  });

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading Skills Records...</p>
      </div>
    );
  }

  return (
    <div className="skills-log-page">
      <div className="page-header">
        <div className="page-title">
          <h1>Skills & Tech Log</h1>
          <p>{isAdmin ? 'Review technical stacks and soft skills developed by interns during the program.' : 'Catalog your technical proficiencies, development tools, and soft skills.'}</p>
        </div>
        {!isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={18} />
            <span>Add / Update Skill</span>
          </button>
        )}
      </div>

      {/* Admin filter toolbar */}
      {isAdmin && (
        <div className="glass-card skills-toolbar">
          <div className="filter-options">
            <User size={16} className="filter-icon" />
            <label>Filter By Intern:</label>
            <select
              value={selectedInternFilter}
              onChange={(e) => setSelectedInternFilter(e.target.value)}
              className="glass-select"
              style={{ width: '220px' }}
            >
              <option value="all">All Interns</option>
              {interns.map(intern => (
                <option key={intern.id} value={intern.id}>{intern.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Skills Grid */}
      {filteredSkills.length === 0 ? (
        <div className="glass-card empty-dashboard-state">
          <Award size={44} className="empty-icon" />
          <h3>No Skills Cataloged Yet</h3>
          <p>{isAdmin ? 'No skills logged for the selected filter.' : 'Begin logging technologies and skills to visualize your professional development.'}</p>
        </div>
      ) : (
        <div className="grid-cols-3 skills-grid">
          {filteredSkills.map(skill => (
            <div key={skill.id} className="glass-card skill-card glass-card-hover">
              <div className="skill-card-header">
                <div className="skill-badge-wrapper">
                  <Sparkles size={20} className="skill-badge-icon" />
                </div>
                <div>
                  <h3 className="skill-title-txt">{skill.name}</h3>
                  {isAdmin && (
                    <span className="skill-intern-owner">Logged by: {skill.internName}</span>
                  )}
                </div>
              </div>

              <div className="star-rating-container">
                <span className="rating-desc">Proficiency:</span>
                <div className="star-rating">
                  {[1, 2, 3, 4, 5].map(star => (
                    <span key={star} className={`star ${star <= skill.proficiency ? 'active' : ''}`}>★</span>
                  ))}
                </div>
              </div>

              {skill.notes && (
                <div className="skill-notes-box">
                  <p>"{skill.notes}"</p>
                </div>
              )}

              <div className="skill-card-footer">
                <Calendar size={13} />
                <span>Last Updated: {skill.loggedAt}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Skill Modal (Intern/Employee/Manager Only) */}
      {showAddModal && !isAdmin && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Record / Update Skill</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSkillSubmit}>
              <div className="modal-body">
                {formError && (
                  <div className="login-error-alert" style={{ marginBottom: '1.25rem' }}>
                    <span>{formError}</span>
                  </div>
                )}

                <div className="input-group">
                  <label className="input-label">Skill / Technology Name *</label>
                  <input
                    type="text"
                    className="glass-input"
                    placeholder="e.g. React, TypeScript, Figma, Git"
                    value={newSkill.name}
                    onChange={(e) => setNewSkill(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>If this skill exists, the proficiency and notes will be updated.</span>
                </div>

                <div className="input-group">
                  <label className="input-label">Proficiency Level *</label>
                  <div className="star-rating-selector">
                    {[1, 2, 3, 4, 5].map(star => (
                      <span
                        key={star}
                        className={`star star-selector-item ${star <= (hoverRating || newSkill.proficiency) ? 'active' : ''}`}
                        onClick={() => handleRatingClick(star)}
                        onMouseEnter={() => handleRatingHover(star)}
                        onMouseLeave={() => handleRatingHover(0)}
                      >
                        ★
                      </span>
                    ))}
                    <span className="rating-selector-label">
                      {newSkill.proficiency === 1 && 'Beginner'}
                      {newSkill.proficiency === 2 && 'Intermediate'}
                      {newSkill.proficiency === 3 && 'Competent'}
                      {newSkill.proficiency === 4 && 'Proficient'}
                      {newSkill.proficiency === 5 && 'Expert'}
                    </span>
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Applications & Notes</label>
                  <textarea
                    rows="4"
                    className="glass-textarea"
                    placeholder="Describe how you have applied this technology or skill in your daily tasks..."
                    value={newSkill.notes}
                    onChange={(e) => setNewSkill(prev => ({ ...prev, notes: e.target.value }))}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                  {formLoading ? 'Saving...' : 'Save Skill Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .skills-toolbar {
          margin-bottom: 2rem;
          padding: 1.25rem 1.5rem;
        }

        .skill-card {
          display: flex;
          flex-direction: column;
          gap: 1.125rem;
        }

        .skill-card-header {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .skill-badge-wrapper {
          width: 44px;
          height: 44px;
          border-radius: var(--border-radius-md);
          background: rgba(6, 182, 212, 0.1);
          border: 1px solid rgba(6, 182, 212, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent);
          filter: drop-shadow(0 0 4px rgba(6, 182, 212, 0.2));
        }

        .skill-title-txt {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .skill-intern-owner {
          display: block;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .star-rating-container {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.85rem;
        }

        .rating-desc {
          color: var(--text-secondary);
          font-weight: 500;
        }

        .skill-notes-box {
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid var(--glass-border);
          border-radius: var(--border-radius-md);
          padding: 0.875rem 1rem;
          font-size: 0.85rem;
          color: var(--text-secondary);
          line-height: 1.45;
          font-style: italic;
          flex-grow: 1;
        }

        .skill-card-footer {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.75rem;
          color: var(--text-muted);
          border-top: 1px solid var(--glass-border);
          padding-top: 0.75rem;
        }

        /* Modal star ratings selector */
        .star-rating-selector {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .star-selector-item {
          font-size: 2rem !important;
          cursor: pointer;
          user-select: none;
        }

        .rating-selector-label {
          font-family: var(--font-display);
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--accent);
          margin-left: 0.5rem;
        }
      `}</style>
    </div>
  );
}
