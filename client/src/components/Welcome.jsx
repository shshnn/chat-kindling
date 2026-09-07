import { useState } from 'react';
import { roomLabel } from '../roomsStorage';
import './Welcome.css';

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function Welcome({ onJoin, rooms = [], onBack, onSelectRoom }) {
  const saved = (() => {
    try {
      return JSON.parse(localStorage.getItem('kindling_last_name') || 'null');
    } catch {
      return null;
    }
  })();

  const [name, setName] = useState(typeof saved === 'string' ? saved : '');
  const [roomCode, setRoomCode] = useState(generateRoomCode());
  const [mode, setMode] = useState('create');

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    const trimmed = name.trim();
    const code = roomCode.trim().toUpperCase();

    if (rooms.some((r) => r.roomCode === code)) {
      alert('이미 참여 중인 방이에요. 채팅에서 셀렉트로 골라주세요.');
      onBack?.();
      return;
    }

    localStorage.setItem('kindling_last_name', trimmed);
    onJoin({ name: trimmed, roomCode: code });
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
        {onBack && (
          <button type="button" className="welcome-back" onClick={onBack}>
            ← 대화로 돌아가기
          </button>
        )}

        <div className="welcome-logo">
          <div className="logo-circle">
            <span className="logo-emoji">🌱</span>
          </div>
          <h1 className="cute-font welcome-title">Kindling</h1>
          <p className="welcome-sub">우리, 점점 친해지는 중</p>
        </div>

        {rooms.length > 0 && (
          <div className="existing-rooms">
            <p className="existing-label">참여 중인 대화</p>
            <select
              className="existing-select"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) onSelectRoom?.(e.target.value);
              }}
            >
              <option value="" disabled>
                대화방 선택...
              </option>
              {rooms.map((room) => (
                <option key={room.roomCode} value={room.roomCode}>
                  {roomLabel(room)}
                </option>
              ))}
            </select>
          </div>
        )}

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
          방마다 딱 2명 · 여러 친구와 각각 1:1 가능 ✨
        </p>
      </div>
    </div>
  );
}
