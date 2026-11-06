import React, { useState } from 'react';
import API from '../services/api';

function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@quiz.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await API.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      onLogin();
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>🌿 Govt Exam Admin</h1>
        <p>Sign in to manage quizzes & exams</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && (
            <p style={{ color: '#BC4749', fontSize: 13, marginBottom: 10, textAlign: 'center' }}>
              {error}
            </p>
          )}
          <button
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 8, padding: '12px' }}
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p style={{ marginTop: 18, fontSize: 12, color: '#52796F', textAlign: 'center' }}>
          Default: admin@quiz.com / admin123
        </p>
      </div>
    </div>
  );
}

export default Login;
