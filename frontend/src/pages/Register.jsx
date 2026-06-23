import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, ArrowRight, Lock, User, Mail, Briefcase, Calendar, Eye, EyeOff } from 'lucide-react';
import { api } from '../utils/api';

export default function Register() {
  const [form, setForm] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    role: 'intern', // Default role
    internshipTitle: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 90 days default
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    const token = sessionStorage.getItem('intern_tracker_token');
    const userJson = sessionStorage.getItem('intern_tracker_user');
    if (token && userJson) {
      const user = JSON.parse(userJson);
      if (user.role === 'admin' || user.role === 'manager') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const { username, password, name, email, role, internshipTitle } = form;
    if (!username.trim() || !password.trim() || !name.trim() || !email.trim() || !role || !internshipTitle.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.auth.register({
        ...form,
        username: username.trim().toLowerCase(),
        name: name.trim(),
        email: email.trim(),
        internshipTitle: internshipTitle.trim()
      });

      sessionStorage.setItem('intern_tracker_user', JSON.stringify(response.user));
      
      // Auto-redirect to dashboard based on role
      if (response.user.role === 'manager') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="ambient-glow glow-purple"></div>
      <div className="ambient-glow glow-cyan"></div>

      <div className="login-card-container register-card-container">
        <div className="glass-card login-card register-card">
          <div className="login-header">
            <div className="login-logo">
              <GraduationCap size={44} className="logo-icon-glow" />
            </div>
            <h1>Create Account</h1>
            <p>Join the Sanna Innovations Tracker</p>
          </div>

          {error && (
            <div className="login-error-alert">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="grid-cols-2" style={{ gap: '1rem', display: 'grid' }}>
              <div className="input-group">
                <label className="input-label" htmlFor="username">Username *</label>
                <div className="input-with-icon">
                  <User size={18} className="input-icon" />
                  <input
                    type="text"
                    id="username"
                    name="username"
                    className="glass-input"
                    placeholder="Username"
                    value={form.username}
                    onChange={handleChange}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="password">Password *</label>
                <div className="input-with-icon">
                  <Lock size={18} className="input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    className="glass-input"
                    placeholder="Password"
                    value={form.password}
                    onChange={handleChange}
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid-cols-2" style={{ gap: '1rem', display: 'grid' }}>
              <div className="input-group">
                <label className="input-label" htmlFor="name">Full Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="glass-input"
                  placeholder="e.g. John Doe"
                  value={form.name}
                  onChange={handleChange}
                  disabled={loading}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="role">Desired Role *</label>
                <select
                  id="role"
                  name="role"
                  className="glass-select"
                  value={form.role}
                  onChange={handleChange}
                  disabled={loading}
                  required
                >
                  <option value="intern">Intern</option>
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="email">Email Address *</label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="glass-input"
                  placeholder="e.g. name@sannainnovations.com"
                  style={{ paddingLeft: '2.75rem' }}
                  value={form.email}
                  onChange={handleChange}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="internshipTitle">Title / Designation *</label>
              <div className="input-with-icon">
                <Briefcase size={18} className="input-icon" />
                <input
                  type="text"
                  id="internshipTitle"
                  name="internshipTitle"
                  className="glass-input"
                  placeholder="e.g. UI/UX Designer / Frontend Developer Intern"
                  style={{ paddingLeft: '2.75rem' }}
                  value={form.internshipTitle}
                  onChange={handleChange}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="grid-cols-2" style={{ gap: '1rem', display: 'grid' }}>
              <div className="input-group">
                <label className="input-label" htmlFor="startDate">Start Date</label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  className="glass-input"
                  value={form.startDate}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="endDate">End Date</label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  className="glass-input"
                  value={form.endDate}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary login-btn" style={{ height: '48px', marginTop: '1.25rem' }} disabled={loading}>
              {loading ? (
                <div className="spinner"></div>
              ) : (
                <>
                  <span>Sign Up & Login</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' }}>Sign In</Link>
          </div>
        </div>
      </div>

      <style>{`
        .register-card-container {
          max-width: 520px !important;
        }

        .register-card {
          padding: 2.25rem 2rem !important;
        }

        .grid-cols-2 {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
        }

        @media (max-width: 580px) {
          .grid-cols-2 {
            grid-template-columns: 1fr;
            gap: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
