import { useEffect, useState } from 'react';
import Auth from './components/Auth';
import Welcome from './components/Welcome';
import ChatRoom from './components/ChatRoom';
import Friends from './components/Friends';
import Feed from './components/Feed';
import './components/Social.css';
import {
  getToken,
  getUser,
  clearAuth,
  fetchMyRooms,
  joinRoomApi,
  leaveRoomApi,
  updateFriendApi,
  getActiveRoomCode,
  setActiveRoomCode,
} from './api';

export default function App() {
  const [user, setUser] = useState(() => (getToken() ? getUser() : null));
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(!!getToken());
  const [activeRoomCode, setActive] = useState(null);
  const [showHome, setShowHome] = useState(true);
  const [bootError, setBootError] = useState('');
  const [tab, setTab] = useState('chat');

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    (async () => {
      setLoadingRooms(true);
      setBootError('');
      try {
        const { rooms: list } = await fetchMyRooms();
        if (cancelled) return;
        setRooms(list);
        const saved = getActiveRoomCode();
        if (saved && list.some((r) => r.roomCode === saved)) {
          setActive(saved);
          setShowHome(false);
        } else {
          setActive(null);
          setShowHome(true);
        }
      } catch (err) {
        if (cancelled) return;
        if (String(err.message).includes('로그인') || String(err.message).includes('세션')) {
          clearAuth();
          setUser(null);
        } else {
          setBootError(err.message);
        }
      } finally {
        if (!cancelled) setLoadingRooms(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const activeRoom = rooms.find((r) => r.roomCode === activeRoomCode) || null;

  async function handleJoin({ name, roomCode }) {
    const { rooms: list } = await joinRoomApi({
      roomCode,
      displayName: name,
    });
    setRooms(list);
    const code = roomCode.toUpperCase();
    setActiveRoomCode(code);
    setActive(code);
    setShowHome(false);
    setTab('chat');
  }

  function handleSelectRoom(code) {
    setActiveRoomCode(code);
    setActive(code);
    setShowHome(false);
    setTab('chat');
  }

  function handleSwitchRoom(code) {
    if (code === '__new__') {
      setShowHome(true);
      return;
    }
    handleSelectRoom(code);
  }

  async function handleLeaveCurrent() {
    if (!activeRoom) {
      setShowHome(true);
      return;
    }
    try {
      const { rooms: list } = await leaveRoomApi(activeRoom.roomCode);
      setRooms(list);
      if (list.length === 0) {
        setActiveRoomCode(null);
        setActive(null);
        setShowHome(true);
      } else {
        setActiveRoomCode(list[0].roomCode);
        setActive(list[0].roomCode);
        setShowHome(false);
      }
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDestroy() {
    try {
      const { rooms: list } = await fetchMyRooms();
      setRooms(list);
      if (list.length === 0) {
        setActiveRoomCode(null);
        setActive(null);
        setShowHome(true);
      } else {
        setActiveRoomCode(list[0].roomCode);
        setActive(list[0].roomCode);
        setShowHome(false);
      }
    } catch {
      setRooms((prev) => prev.filter((r) => r.roomCode !== activeRoomCode));
      setActiveRoomCode(null);
      setActive(null);
      setShowHome(true);
    }
  }

  async function handleFriendName(friendName) {
    if (!activeRoom) return;
    try {
      const { rooms: list } = await updateFriendApi(activeRoom.roomCode, friendName);
      setRooms(list);
    } catch {
      /* ignore */
    }
  }

  function handleLogout() {
    clearAuth();
    setUser(null);
    setRooms([]);
    setActive(null);
    setShowHome(true);
    setTab('chat');
  }

  function handleFriendOpenChat({ roomCode, rooms: list }) {
    setRooms(list);
    setActiveRoomCode(roomCode);
    setActive(roomCode);
    setShowHome(false);
    setTab('chat');
  }

  if (!user) {
    return <Auth onAuth={setUser} />;
  }

  if (loadingRooms) {
    return (
      <div className="boot-screen">
        <p className="cute-font">잠시만요...</p>
      </div>
    );
  }

  if (bootError) {
    return (
      <div className="boot-screen">
        <p>{bootError}</p>
        <button type="button" className="back-btn cute-font" onClick={handleLogout}>
          다시 로그인
        </button>
      </div>
    );
  }

  let body = null;
  if (tab === 'friends') {
    body = <Friends user={user} onOpenChat={handleFriendOpenChat} />;
  } else if (tab === 'feed') {
    body = <Feed />;
  } else if (showHome || !activeRoom) {
    body = (
      <Welcome
        user={user}
        rooms={rooms}
        onJoin={handleJoin}
        onSelectRoom={handleSelectRoom}
        onBack={
          activeRoom
            ? () => setShowHome(false)
            : rooms.length > 0
              ? () => {
                  const code = getActiveRoomCode() || rooms[0].roomCode;
                  handleSelectRoom(code);
                }
              : null
        }
        onLogout={handleLogout}
      />
    );
  } else {
    body = (
      <ChatRoom
        key={activeRoom.roomCode}
        accountId={user.id}
        name={activeRoom.name}
        roomCode={activeRoom.roomCode}
        rooms={rooms}
        onSwitchRoom={handleSwitchRoom}
        onLeave={handleLeaveCurrent}
        onDestroy={handleDestroy}
        onFriendName={handleFriendName}
      />
    );
  }

  return (
    <div className="app-shell">
      <div className="app-shell-body">{body}</div>
      <nav className="tab-bar">
        <button
          type="button"
          className={tab === 'chat' ? 'active' : ''}
          onClick={() => setTab('chat')}
        >
          💬 채팅
        </button>
        <button
          type="button"
          className={tab === 'friends' ? 'active' : ''}
          onClick={() => setTab('friends')}
        >
          🤝 친구
        </button>
        <button
          type="button"
          className={tab === 'feed' ? 'active' : ''}
          onClick={() => setTab('feed')}
        >
          ☀️ 피드
        </button>
      </nav>
    </div>
  );
}
