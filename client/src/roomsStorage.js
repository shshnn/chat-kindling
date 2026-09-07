const ROOMS_KEY = 'kindling_rooms';
const ACTIVE_KEY = 'kindling_active_room';
const LEGACY_SESSION_KEY = 'kindling_session';

export function loadRooms() {
  try {
    const raw = localStorage.getItem(ROOMS_KEY);
    if (raw) {
      const rooms = JSON.parse(raw);
      if (Array.isArray(rooms)) return rooms.filter((r) => r?.roomCode && r?.name);
    }

    // 이전 단일 세션 마이그레이션
    const legacy = localStorage.getItem(LEGACY_SESSION_KEY);
    if (legacy) {
      const data = JSON.parse(legacy);
      if (data?.name && data?.roomCode) {
        const rooms = [{
          roomCode: data.roomCode,
          name: data.name,
          friendName: null,
          updatedAt: Date.now(),
        }];
        saveRooms(rooms);
        setActiveRoomCode(data.roomCode);
        localStorage.removeItem(LEGACY_SESSION_KEY);
        return rooms;
      }
    }
  } catch {
    /* ignore */
  }
  return [];
}

export function saveRooms(rooms) {
  localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
}

export function getActiveRoomCode() {
  return localStorage.getItem(ACTIVE_KEY) || null;
}

export function setActiveRoomCode(code) {
  if (code) localStorage.setItem(ACTIVE_KEY, code);
  else localStorage.removeItem(ACTIVE_KEY);
}

export function upsertRoom(rooms, { roomCode, name, friendName }) {
  const code = roomCode.toUpperCase();
  const existing = rooms.find((r) => r.roomCode === code);
  let next;
  if (existing) {
    next = rooms.map((r) =>
      r.roomCode === code
        ? {
            ...r,
            name,
            friendName: friendName ?? r.friendName,
            updatedAt: Date.now(),
          }
        : r
    );
  } else {
    next = [
      ...rooms,
      {
        roomCode: code,
        name,
        friendName: friendName || null,
        updatedAt: Date.now(),
      },
    ];
  }
  saveRooms(next);
  setActiveRoomCode(code);
  return next;
}

export function updateFriendName(rooms, roomCode, friendName) {
  const code = roomCode.toUpperCase();
  const next = rooms.map((r) =>
    r.roomCode === code ? { ...r, friendName: friendName || null } : r
  );
  saveRooms(next);
  return next;
}

export function removeRoom(rooms, roomCode) {
  const code = roomCode.toUpperCase();
  const next = rooms.filter((r) => r.roomCode !== code);
  saveRooms(next);

  const active = getActiveRoomCode();
  if (active === code) {
    setActiveRoomCode(next[0]?.roomCode || null);
  }
  return next;
}

export function roomLabel(room) {
  const who = room.friendName || '대기 중';
  return `${who} · ${room.roomCode}`;
}
