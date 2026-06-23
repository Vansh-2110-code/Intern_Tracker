import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ClipboardList, Plus, Search, Calendar, Edit3, Trash2, CheckCircle2, User, AlertCircle, Play, Send, Check, XCircle } from 'lucide-react';
import { api } from '../utils/api';

const COLUMNS = [
  { id: 'todo', title: 'To Do', badgeClass: 'badge-todo' },
  { id: 'in_progress', title: 'In Progress', badgeClass: 'badge-in-progress' },
  { id: 'review', title: 'In Review', badgeClass: 'badge-review' },
  { id: 'completed', title: 'Completed', badgeClass: 'badge-completed' }
];

export default function TaskBoard() {
  const location = useLocation();
  const [tasks, setTasks] = useState([]);
  const [subordinates, setSubordinates] = useState([]); // List of managed users
  const [loading, setLoading] = useState(true);
  const [selectedInternFilter, setSelectedInternFilter] = useState('all');

  // Assign Task Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null); 
  const [taskForm, setTaskForm] = useState({
    internId: '',
    title: '',
    description: '',
    dueDate: ''
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const userJson = localStorage.getItem('intern_tracker_user');
  const user = userJson ? JSON.parse(userJson) : null;
  
  // Decide view based on router path
  const isTaskManager = location.pathname.startsWith('/admin');

  useEffect(() => {
    loadData();
  }, [location.pathname]);

  async function loadData() {
    try {
      setLoading(true);
      const taskList = await api.tasks.getAll();
      setTasks(taskList);

      if (isTaskManager) {
        const subList = await api.interns.getAll(); // Returns all managed users
        setSubordinates(subList);
      }
    } catch (err) {
      console.error('Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  }

  // HTML5 Drag and Drop handlers
  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const updateTaskStatus = async (taskId, targetStatus) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    if (task.status === targetStatus) return;

    // Optimistic UI update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: targetStatus } : t));

    try {
      await api.tasks.update(taskId, { status: targetStatus });
    } catch (err) {
      console.error('Failed to update task status:', err);
      alert('Error updating task status: ' + err.message);
      // Reload
      const list = await api.tasks.getAll();
      setTasks(list);
    }
  };

  const handleRejectTask = (task) => {
    setEditingTask(task);
    setTaskForm({
      internId: task.internId,
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      feedback: task.feedback || '',
      status: 'in_progress'
    });
    setShowAddModal(true);
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) return;

    // Intern/Employee can only drag their own tasks on their personal board
    if (!isTaskManager && task.internId !== user?.id) return;

    await updateTaskStatus(taskId, targetStatus);
  };

  // Form submit (Create / Edit)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const { internId, title, description, dueDate } = taskForm;

    if (isTaskManager && !editingTask && !internId) {
      setFormError('Please select a recipient to assign this task to.');
      return;
    }
    if (!title.trim() || !description.trim() || !dueDate) {
      setFormError('Please fill in all required fields.');
      return;
    }

    setFormLoading(true);
    try {
      if (editingTask) {
        const updated = await api.tasks.update(editingTask.id, {
          title,
          description,
          dueDate,
          feedback: taskForm.feedback || '',
          status: taskForm.status || editingTask.status
        });
        setTasks(prev => prev.map(t => t.id === editingTask.id ? updated : t));
      } else {
        const created = await api.tasks.create(taskForm);
        setTasks(prev => [...prev, created]);
      }
      setShowAddModal(false);
      resetForm();
    } catch (err) {
      setFormError(err.message || 'Failed to save task.');
    } finally {
      setFormLoading(false);
    }
  };

  const resetForm = () => {
    setTaskForm({
      internId: '',
      title: '',
      description: '',
      dueDate: '',
      feedback: '',
      status: ''
    });
    setEditingTask(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setTaskForm({
      internId: task.internId,
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      feedback: task.feedback || '',
      status: task.status
    });
    setShowAddModal(true);
  };

  const handleDeleteTask = async (id) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await api.tasks.delete(id);
        setTasks(prev => prev.filter(t => t.id !== id));
      } catch (err) {
        alert('Failed to delete task: ' + err.message);
      }
    }
  };

  // Helper to get staff details
  const getSubordinateInfo = (internId) => {
    const match = subordinates.find(s => s.id === internId);
    return match ? { name: match.name, role: match.role } : { name: 'Unknown Staff', role: '' };
  };

  // Filter tasks based on view mode
  const getFilteredTasks = () => {
    if (isTaskManager) {
      // Task manager queue: show only subordinate tasks (exclude self tasks)
      let list = tasks.filter(t => t.internId !== user?.id);
      if (selectedInternFilter !== 'all') {
        list = list.filter(t => t.internId === selectedInternFilter);
      }
      return list;
    } else {
      // Personal board: show only self tasks
      return tasks.filter(t => t.internId === user?.id);
    }
  };

  const currentDisplayTasks = getFilteredTasks();

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading Kanban Task Board...</p>
      </div>
    );
  }

  return (
    <div className="task-board-page">
      <div className="page-header">
        <div className="page-title">
          <h1>{isTaskManager ? 'Subordinate Tasks Manager' : 'My Task Board'}</h1>
          <p>{isTaskManager ? 'Distribute assignments and track task execution pipelines.' : 'Manage your task deliverables. Drag and drop cards to change statuses.'}</p>
        </div>
        {isTaskManager && (
          <button className="btn btn-primary" onClick={openAddModal}>
            <Plus size={18} />
            <span>Assign Task</span>
          </button>
        )}
      </div>

      {/* Assigner filter toolbar */}
      {isTaskManager && (
        <div className="glass-card board-toolbar">
          <div className="filter-options">
            <User size={16} className="filter-icon" />
            <label>Filter By Team Member:</label>
            <select
              value={selectedInternFilter}
              onChange={(e) => setSelectedInternFilter(e.target.value)}
              className="glass-select"
              style={{ width: '220px' }}
            >
              <option value="all">All Members</option>
              {subordinates.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.name} ({sub.role})</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Kanban Board columns */}
      <div className="kanban-board">
        {COLUMNS.map(col => {
          const colTasks = currentDisplayTasks.filter(t => t.status === col.id);
          
          return (
            <div 
              key={col.id} 
              className="kanban-column"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div className="kanban-column-header">
                <div className="kanban-column-title">
                  <span className={`badge ${col.badgeClass}`} style={{ width: '8px', height: '8px', padding: 0, borderRadius: '50%' }}></span>
                  <h3>{col.title}</h3>
                </div>
                <span className="kanban-task-count">{colTasks.length}</span>
              </div>

              <div className="kanban-cards-container">
                {colTasks.length === 0 ? (
                  <div className="column-empty-state">
                    <span>Drop tasks here</span>
                  </div>
                ) : (
                  colTasks.map(task => {
                    const subInfo = isTaskManager ? getSubordinateInfo(task.internId) : null;
                    return (
                      <div
                        key={task.id}
                        className="glass-card kanban-card glass-card-hover"
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                      >
                        <div className="task-card-header">
                          <h4 className="task-card-title">{task.title}</h4>
                          {isTaskManager && (
                            <div className="task-card-actions">
                              <button className="task-action-btn" onClick={() => openEditModal(task)}>
                                <Edit3 size={13} />
                              </button>
                              <button className="task-action-btn delete" onClick={() => handleDeleteTask(task.id)}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </div>

                        <p className="task-card-description">{task.description}</p>
                        
                        {isTaskManager && (
                          <div className="task-card-assignee">
                            <span className="assignee-avatar">{subInfo.name.charAt(0)}</span>
                            <span className="assignee-name">{subInfo.name}</span>
                          </div>
                        )}

                        <div className="task-card-footer">
                          <div className="task-card-due">
                            <Calendar size={13} />
                            <span>{task.dueDate}</span>
                          </div>
                        </div>

                        {/* Quick Action Buttons */}
                        <div className="task-card-quick-actions">
                          {!isTaskManager ? (
                            // Intern / Staff Actions
                            task.status !== 'completed' && (
                              <div className="quick-action-buttons">
                                {task.status === 'todo' && (
                                  <button 
                                    className="btn-quick start"
                                    onClick={() => updateTaskStatus(task.id, 'in_progress')}
                                    title="Start Task"
                                  >
                                    <Play size={12} />
                                    <span>Start</span>
                                  </button>
                                )}
                                {task.status === 'in_progress' && (
                                  <button 
                                    className="btn-quick review"
                                    onClick={() => updateTaskStatus(task.id, 'review')}
                                    title="Submit for Review"
                                  >
                                    <Send size={12} />
                                    <span>Submit Review</span>
                                  </button>
                                )}
                                <button 
                                  className="btn-quick complete"
                                  onClick={() => updateTaskStatus(task.id, 'completed')}
                                  title="Mark Completed"
                                >
                                  <CheckCircle2 size={12} />
                                  <span>Complete</span>
                                </button>
                              </div>
                            )
                          ) : (
                            // Manager / Admin Actions
                            task.status === 'review' && (
                              <div className="quick-action-buttons">
                                <button 
                                  className="btn-quick approve"
                                  onClick={() => updateTaskStatus(task.id, 'completed')}
                                  title="Approve & Complete"
                                >
                                  <Check size={12} />
                                  <span>Approve</span>
                                </button>
                                <button 
                                  className="btn-quick reject"
                                  onClick={() => handleRejectTask(task)}
                                  title="Request Changes"
                                >
                                  <XCircle size={12} />
                                  <span>Reject</span>
                                </button>
                              </div>
                            )
                          )}
                        </div>

                        {task.feedback && (
                          <div className="task-feedback-badge">
                            <AlertCircle size={12} />
                            <span>Has review notes</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{editingTask ? 'Edit Task Deliverable' : 'Assign Task'}</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleFormSubmit}>
              <div className="modal-body">
                {formError && (
                  <div className="login-error-alert" style={{ marginBottom: '1.25rem' }}>
                    <span>{formError}</span>
                  </div>
                )}

                {!editingTask && (
                  <div className="input-group">
                    <label className="input-label">Assign To *</label>
                    <select
                      className="glass-select"
                      value={taskForm.internId}
                      onChange={(e) => setTaskForm(prev => ({ ...prev, internId: e.target.value }))}
                      required
                    >
                      <option value="">Select Staff...</option>
                      {subordinates.map(sub => (
                        <option key={sub.id} value={sub.id}>{sub.name} ({sub.internshipTitle || sub.role})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="input-group">
                  <label className="input-label">Task Title *</label>
                  <input
                    type="text"
                    className="glass-input"
                    placeholder="e.g. Implement hierarchical database seed"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Task Description *</label>
                  <textarea
                    rows="4"
                    className="glass-textarea"
                    placeholder="Provide details about requirements and expected deliverables..."
                    value={taskForm.description}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                    required
                  ></textarea>
                </div>

                <div className="grid-cols-2" style={{ gap: '1rem' }}>
                  <div className="input-group">
                    <label className="input-label">Due Date *</label>
                    <input
                      type="date"
                      className="glass-input"
                      value={taskForm.dueDate}
                      onChange={(e) => setTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
                      required
                    />
                  </div>
                  
                  {editingTask && (
                    <div className="input-group">
                      <label className="input-label">Review / Feedback Notes</label>
                      <input
                        type="text"
                        className="glass-input"
                        placeholder="Evaluation feedback..."
                        value={taskForm.feedback || ''}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, feedback: e.target.value }))}
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                  {formLoading ? 'Saving...' : (editingTask ? 'Save Changes' : 'Assign Task')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .board-toolbar {
          margin-bottom: 2rem;
          padding: 1.25rem 1.5rem;
        }

        .column-empty-state {
          border: 2px dashed rgba(255, 255, 255, 0.03);
          border-radius: var(--border-radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          height: 80px;
          color: var(--text-muted);
          font-size: 0.8rem;
          font-style: italic;
          user-select: none;
        }

        .task-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .task-card-title {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.3;
        }

        .task-card-actions {
          display: flex;
          gap: 0.35rem;
          opacity: 0;
          transition: opacity 0.2s ease;
          flex-shrink: 0;
        }

        .kanban-card:hover .task-card-actions {
          opacity: 1;
        }

        .task-action-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--glass-border);
          color: var(--text-secondary);
          border-radius: 4px;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .task-action-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.1);
        }

        .task-action-btn.delete:hover {
          color: #ffffff;
          background: var(--danger);
          border-color: var(--danger);
        }

        .task-card-description {
          font-size: 0.825rem;
          color: var(--text-secondary);
          line-height: 1.45;
          margin-bottom: 0.75rem;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .task-card-assignee {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.02);
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          width: fit-content;
          margin-bottom: 0.75rem;
          border: 1px solid var(--glass-border);
        }

        .assignee-avatar {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--primary-gradient);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.65rem;
          font-family: var(--font-display);
          font-weight: 700;
        }

        .assignee-name {
          font-size: 0.75rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .task-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.75rem;
          color: var(--text-secondary);
          border-top: 1px solid var(--glass-border);
          padding-top: 0.6rem;
        }

        .task-card-due {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-weight: 500;
        }

        .task-feedback-badge {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.725rem;
          font-weight: 500;
          color: var(--warning);
          margin-top: 0.5rem;
        }

        .task-card-quick-actions {
          margin-top: 0.6rem;
          border-top: 1px dashed rgba(255, 255, 255, 0.08);
          padding-top: 0.6rem;
        }

        .quick-action-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
        }

        .btn-quick {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--glass-border);
          color: var(--text-secondary);
          padding: 0.3rem 0.5rem;
          border-radius: 6px;
          font-size: 0.725rem;
          display: flex;
          align-items: center;
          gap: 0.3rem;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          font-weight: 500;
        }

        .btn-quick:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.08);
          transform: translateY(-1px);
        }

        .btn-quick.start:hover {
          background: rgba(99, 102, 241, 0.15);
          border-color: rgba(99, 102, 241, 0.4);
          color: #818cf8;
        }

        .btn-quick.review:hover {
          background: rgba(168, 85, 247, 0.15);
          border-color: rgba(168, 85, 247, 0.4);
          color: #c084fc;
        }

        .btn-quick.complete:hover, .btn-quick.approve:hover {
          background: rgba(16, 185, 129, 0.15);
          border-color: rgba(16, 185, 129, 0.4);
          color: #34d399;
        }

        .btn-quick.reject:hover {
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.4);
          color: #f87171;
        }
      `}</style>
    </div>
  );
}
