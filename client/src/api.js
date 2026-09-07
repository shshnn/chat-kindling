const TOKEN_KEY = 'kindling_token';
const USER_KEY = 'kindling_user';
const ACTIVE_KEY = 'kindling_active_room';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

export function saveAuth({ token, user }) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getActiveRoomCode() {
  return localStorage.getItem(ACTIVE_KEY) || null;
}

export function setActiveRoomCode(code) {
  if (code) localStorage.setItem(ACTIVE_KEY, code);
  else localStorage.removeItem(ACTIVE_KEY);
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '요청에 실패했어요');
  return data;
}

export function register(username, password) {
  return api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function login(username, password) {
  return api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function fetchMyRooms() {
  return api('/api/me/rooms');
}

export function joinRoomApi({ roomCode, displayName, friendName }) {
  return api('/api/me/rooms', {
    method: 'POST',
    body: JSON.stringify({ roomCode, displayName, friendName }),
  });
}

export function leaveRoomApi(roomCode) {
  return api(`/api/me/rooms/${encodeURIComponent(roomCode)}`, { method: 'DELETE' });
}

export function updateFriendApi(roomCode, friendName) {
  return api(`/api/me/rooms/${encodeURIComponent(roomCode)}`, {
    method: 'PATCH',
    body: JSON.stringify({ friendName }),
  });
}

export function roomLabel(room) {
  const who = room.friendName || '대기 중';
  return `${who} · ${room.roomCode}`;
}
