import { useState } from 'react';
import Welcome from './components/Welcome';
import ChatRoom from './components/ChatRoom';

const SESSION_KEY = 'kindling_session';

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data?.name && data?.roomCode) return data;
  } catch {
    /* ignore */
  }
  return null;
}

function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export default function App() {
  const [session, setSession] = useState(loadSession);

  function handleJoin(next) {
    saveSession(next);
    setSession(next);
  }

  function handleLeave() {
    clearSession();
    setSession(null);
  }

  if (!session) {
    return <Welcome onJoin={handleJoin} />;
  }

  return (
    <ChatRoom
      name={session.name}
      roomCode={session.roomCode}
      onLeave={handleLeave}
    />
  );
}
