import { useState } from 'react';
import Welcome from './components/Welcome';
import ChatRoom from './components/ChatRoom';

export default function App() {
  const [session, setSession] = useState(null);

  if (!session) {
    return <Welcome onJoin={setSession} />;
  }

  return (
    <ChatRoom
      name={session.name}
      roomCode={session.roomCode}
      onLeave={() => setSession(null)}
    />
  );
}
