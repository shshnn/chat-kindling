import { useState } from 'react';
import { login, register, saveAuth } from '../api';
import './Auth.css';
import './Welcome.css';

export default function Auth({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const fn = mode === 'login' ? login : register;
      const result = await fn(username, password);
      saveAuth(result);
      onAuth(result.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth-bg">
        <span className="bubble b1">🌱</span>
        <span className="bubble b2">✨</span>
        <span className="bubble b3">☁️</span>
      </div>

      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-circle">
            <span className="logo-emoji">🌱</span>
          </div>
          <h1 className="cute-font auth-title">Kindling</h1>
          <p className="auth-sub">아이디로 로그인하고 대화를 이어가요</p>
        </div>

        <div className="mode-tabs">
          <button
            type="button"
            className={`mode-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError(''); }}
          >
            로그인
          </button>
          <button
            type="button"
            className={`mode-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => { setMode('register'); setError(''); }}
          >
            가입하기
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label>아이디</label>
            <input
              type="text"
              autoComplete="username"
              placeholder="영문 소문자 / 숫자 / _"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              maxLength={20}
              autoFocus
            />
          </div>
          <div className="input-group">
            <label>비밀번호</label>
            <input
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="4자 이상"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="join-btn cute-font" disabled={loading || !username || !password}>
            {loading ? '잠시만요...' : mode === 'login' ? '로그인 ✨' : '가입하기 🌱'}
          </button>
        </form>

        <p className="auth-note">
          {mode === 'login'
            ? '계정이 없으면 가입하기를 눌러요'
            : '아이디 3~20자 · 비밀번호 4자 이상'}
        </p>
      </div>
    </div>
  );
}
