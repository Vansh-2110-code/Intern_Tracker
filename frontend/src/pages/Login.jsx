import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, ArrowRight, Lock, User, Eye, EyeOff } from 'lucide-react';
import { api } from '../utils/api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem('intern_tracker_token');
    const userJson = localStorage.getItem('intern_tracker_user');
    if (token && userJson) {
      const user = JSON.parse(userJson);
      if (user.role === 'admin' || user.role === 'manager') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await api.auth.login(username.trim(), password);
      localStorage.setItem('intern_tracker_user', JSON.stringify(response.user));
      
      if (response.user.role === 'admin' || response.user.role === 'manager') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="ambient-glow glow-purple"></div>
      <div className="ambient-glow glow-cyan"></div>

      <div className="login-card-container">
        <div className="glass-card login-card">
          <div className="login-header">
            <div className="login-logo">
              <GraduationCap size={44} className="logo-icon-glow" />
            </div>
            <h1>InternHub</h1>
            <p>Sanna Innovations Tracker</p>
          </div>

          {error && (
            <div className="login-error-alert">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="input-group">
              <label className="input-label" htmlFor="username">Username</label>
              <div className="input-with-icon">
                <User size={18} className="input-icon" />
                <input
                  type="text"
                  id="username"
                  className="glass-input"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="password">Password</label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  className="glass-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
              {loading ? (
                <div className="spinner"></div>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            New to InternHub? <Link to="/register" style={{ color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' }}>Sign Up</Link>
          </div>

          <div className="login-tips">
            <p>Admin: <code>admin</code> / <code>admin123</code></p>
            <p style={{ marginTop: '0.25rem', opacity: 0.8 }}>Other roles can self-register using the Sign Up link.</p>
          </div>
        </div>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          background-color: var(--bg-primary);
          overflow: hidden;
          padding: 1.5rem;
        }

        .login-card-container {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 440px;
        }

        .login-card {
          padding: 3rem 2.5rem;
          border-radius: var(--border-radius-lg);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
          text-align: center;
        }

        .login-header {
          margin-bottom: 2.25rem;
        }

        .login-logo {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 80px;
          height: 80px;
          border-radius: 24px;
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.2);
          margin-bottom: 1.25rem;
          color: var(--primary);
          box-shadow: inset 0 0 20px rgba(99, 102, 241, 0.05);
        }

        .logo-icon-glow {
          filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.6));
        }

        .login-header h1 {
          font-size: 2rem;
          font-weight: 800;
          margin-bottom: 0.35rem;
          background: linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .login-header p {
          color: var(--text-secondary);
          font-size: 0.95rem;
          font-weight: 500;
        }

        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 1.125rem;
          color: var(--text-muted);
          pointer-events: none;
        }

        .input-with-icon .glass-input {
          padding-left: 2.75rem;
          padding-right: 2.75rem;
        }

        .password-toggle {
          position: absolute;
          right: 1.125rem;
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .password-toggle:hover {
          color: var(--text-primary);
        }

        .login-btn {
          width: 100%;
          margin-top: 1.75rem;
          height: 50px;
        }

        .login-error-alert {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.25);
          color: #ff8a8a;
          padding: 0.75rem 1rem;
          border-radius: var(--border-radius-md);
          font-size: 0.85rem;
          margin-bottom: 1.5rem;
          text-align: left;
        }

        .login-tips {
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--glass-border);
          font-size: 0.75rem;
          color: var(--text-muted);
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          text-align: left;
        }

        .login-tips code {
          color: var(--accent);
          background: rgba(6, 182, 212, 0.08);
          padding: 0.05rem 0.3rem;
          border-radius: 4px;
          font-family: monospace;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
