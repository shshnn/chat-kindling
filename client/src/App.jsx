import { useState } from 'react';
import Welcome from './components/Welcome';
import ChatRoom from './components/ChatRoom';
import {
  loadRooms,
  getActiveRoomCode,
  setActiveRoomCode,
  upsertRoom,
  removeRoom,
  updateFriendName,
} from './roomsStorage';

export default function App() {
  const [rooms, setRooms] = useState(loadRooms);
  const [activeRoomCode, setActive] = useState(() => {
    const roomsNow = loadRooms();
    const saved = getActiveRoomCode();
    if (saved && roomsNow.some((r) => r.roomCode === saved)) return saved;
    return roomsNow[0]?.roomCode || null;
  });
  const [showWelcome, setShowWelcome] = useState(() => loadRooms().length === 0);

  const activeRoom = rooms.find((r) => r.roomCode === activeRoomCode) || null;

  function handleJoin(next) {
    const updated = upsertRoom(rooms, next);
    setRooms(updated);
    setActive(next.roomCode.toUpperCase());
    setShowWelcome(false);
  }

  function handleSwitchRoom(code) {
    if (code === '__new__') {
      setShowWelcome(true);
      return;
    }
    setActiveRoomCode(code);
    setActive(code);
    setShowWelcome(false);
  }

  function handleLeaveCurrent() {
    if (!activeRoom) {
      setShowWelcome(true);
      return;
    }
    const updated = removeRoom(rooms, activeRoom.roomCode);
    setRooms(updated);
    if (updated.length === 0) {
      setActive(null);
      setShowWelcome(true);
    } else {
      setActive(updated[0].roomCode);
      setShowWelcome(false);
    }
  }

  function handleFriendName(friendName) {
    if (!activeRoom) return;
    const updated = updateFriendName(rooms, activeRoom.roomCode, friendName);
    setRooms(updated);
  }

  if (showWelcome || !activeRoom) {
    return (
      <Welcome
        onJoin={handleJoin}
        rooms={rooms}
        onSelectRoom={(code) => handleSwitchRoom(code)}
        onBack={
          rooms.length > 0
            ? () => {
                setActive(getActiveRoomCode() || rooms[0].roomCode);
                setShowWelcome(false);
              }
            : null
        }
      />
    );
  }

  return (
    <ChatRoom
      key={activeRoom.roomCode}
      name={activeRoom.name}
      roomCode={activeRoom.roomCode}
      rooms={rooms}
      onSwitchRoom={handleSwitchRoom}
      onLeave={handleLeaveCurrent}
      onDestroy={handleLeaveCurrent}
      onFriendName={handleFriendName}
    />
  );
}
