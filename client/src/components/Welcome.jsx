import { useState } from 'react';
import './Welcome.css';

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function Welcome({ onJoin }) {
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState(generateRoomCode());
  const [mode, setMode] = useState('create');

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onJoin({ name: name.trim(), roomCode: roomCode.trim().toUpperCase() });
  }

  return (
    <div className="welcome">
      <div className="welcome-bg">
        <span className="bubble b1">🤝</span>
        <span className="bubble b2">✨</span>
        <span className="bubble b3">🌱</span>
        <span className="bubble b4">☁️</span>
        <span className="bubble b5">🍃</span>
      </div>

      <div className="welcome-card">
        <div className="welcome-logo">
          <div className="logo-circle">
            <span className="logo-emoji">🌱</span>
          </div>
          <h1 className="cute-font welcome-title">Kindling</h1>
          <p className="welcome-sub">우리, 점점 친해지는 중</p>
        </div>

        <div className="mode-tabs">
          <button
            type="button"
            className={`mode-tab ${mode === 'create' ? 'active' : ''}`}
            onClick={() => setMode('create')}
          >
            방 만들기
          </button>
          <button
            type="button"
            className={`mode-tab ${mode === 'join' ? 'active' : ''}`}
            onClick={() => setMode('join')}
          >
            방 참여하기
          </button>
        </div>

        <form onSubmit={handleSubmit} className="welcome-form">
          <div className="input-group">
            <label>내 이름</label>
            <input
              type="text"
              placeholder="이름을 입력해요"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={12}
              autoFocus
            />
          </div>

          <div className="input-group">
            <label>{mode === 'create' ? '방 코드 (친구에게 공유!)' : '방 코드 입력'}</label>
            <input
              type="text"
              placeholder="ABC123"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={6}
              readOnly={mode === 'create'}
              className={mode === 'create' ? 'code-display' : ''}
            />
            {mode === 'create' && (
              <button
                type="button"
                className="regen-btn"
                onClick={() => setRoomCode(generateRoomCode())}
              >
                🔄 새 코드
              </button>
            )}
          </div>

          <button type="submit" className="join-btn cute-font" disabled={!name.trim()}>
            {mode === 'create' ? '채팅 시작하기 ✨' : '들어가기 🚪'}
          </button>
        </form>

        <p className="welcome-note">
          딱 2명만 들어올 수 있어요 ✨
        </p>
      </div>
    </div>
  );
}
