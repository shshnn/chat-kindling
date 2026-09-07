import { useState } from 'react';
import { roomLabel } from '../api';
import './Welcome.css';

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function Welcome({
  user,
  rooms = [],
  onJoin,
  onSelectRoom,
  onBack,
  onLogout,
}) {
  const [displayName, setDisplayName] = useState(user?.username || '');
  const [roomCode, setRoomCode] = useState(generateRoomCode());
  const [mode, setMode] = useState(rooms.length > 0 ? 'join' : 'create');
  const [selectedExisting, setSelectedExisting] = useState('');
  const [busy, setBusy] = useState(false);

  function handleModeChange(next) {
    setMode(next);
    setSelectedExisting('');
    if (next === 'create') setRoomCode(generateRoomCode());
    else setRoomCode('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!displayName.trim() || busy) return;
    setBusy(true);
    try {
      if (mode === 'join' && selectedExisting) {
        onSelectRoom?.(selectedExisting);
        return;
      }

      const code = roomCode.trim().toUpperCase();
      if (!code) {
        alert('방 코드를 입력하거나, 참여 중인 방을 선택해 주세요.');
        return;
      }

      const existing = rooms.find((r) => r.roomCode === code);
      if (existing) {
        onSelectRoom?.(code);
        return;
      }

      await onJoin({ name: displayName.trim(), roomCode: code });
    } finally {
      setBusy(false);
    }
  }

  const canSubmit =
    displayName.trim() &&
    (mode === 'create' ? roomCode.trim() : selectedExisting || roomCode.trim());

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
        <div className="welcome-topbar">
          {onBack ? (
            <button type="button" className="welcome-back" onClick={onBack}>
              ← 대화로 돌아가기
            </button>
          ) : (
            <span className="welcome-user">@{user?.username}</span>
          )}
          <button type="button" className="logout-btn" onClick={onLogout}>
            로그아웃
          </button>
        </div>

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
            onClick={() => handleModeChange('create')}
          >
            방 만들기
          </button>
          <button
            type="button"
            className={`mode-tab ${mode === 'join' ? 'active' : ''}`}
            onClick={() => handleModeChange('join')}
          >
            방 참여하기
          </button>
        </div>

        <form onSubmit={handleSubmit} className="welcome-form">
          <div className="input-group">
            <label>채팅에서 쓸 이름</label>
            <input
              type="text"
              placeholder="친구에게 보일 이름"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={12}
              autoFocus
            />
          </div>

          {mode === 'join' && (
            <>
              {rooms.length > 0 ? (
                <div className="input-group">
                  <label>참여 중인 방 선택</label>
                  <select
                    className="existing-select"
                    value={selectedExisting}
                    onChange={(e) => {
                      setSelectedExisting(e.target.value);
                      if (e.target.value) setRoomCode('');
                    }}
                  >
                    <option value="">선택하기...</option>
                    {rooms.map((room) => (
                      <option key={room.roomCode} value={room.roomCode}>
                        {roomLabel(room)}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="empty-rooms">아직 참여 중인 방이 없어요</p>
              )}

              {rooms.length > 0 && <p className="or-divider">또는 새 방 코드로 참여</p>}

              {!selectedExisting && (
                <div className="input-group">
                  <label>방 코드 입력</label>
                  <input
                    type="text"
                    placeholder="ABC123"
                    value={roomCode}
                    onChange={(e) => {
                      setRoomCode(e.target.value.toUpperCase());
                      setSelectedExisting('');
                    }}
                    maxLength={6}
                  />
                </div>
              )}
            </>
          )}

          {mode === 'create' && (
            <div className="input-group">
              <label>방 코드 (친구에게 공유!)</label>
              <input
                type="text"
                placeholder="ABC123"
                value={roomCode}
                readOnly
                className="code-display"
              />
              <button
                type="button"
                className="regen-btn"
                onClick={() => setRoomCode(generateRoomCode())}
              >
                🔄 새 코드
              </button>
            </div>
          )}

          <button type="submit" className="join-btn cute-font" disabled={!canSubmit || busy}>
            {busy
              ? '잠시만요...'
              : mode === 'create'
                ? '채팅 시작하기 ✨'
                : selectedExisting
                  ? '선택한 방 들어가기 🚪'
                  : '들어가기 🚪'}
          </button>
        </form>

        <p className="welcome-note">
          로그인하면 참여 중인 방이 아이디에 저장돼요 ✨
        </p>
      </div>
    </div>
  );
}
