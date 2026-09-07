const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'kindling-dev-secret-change-me';
const TOKEN_DAYS = 30;

function signToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: `${TOKEN_DAYS}d` }
  );
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: '로그인이 필요해요' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.sub, username: payload.username };
    next();
  } catch {
    return res.status(401).json({ error: '세션이 만료됐어요. 다시 로그인 해주세요' });
  }
}

function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = { id: payload.sub, username: payload.username };
    } catch {
      /* ignore */
    }
  }
  next();
}

async function register(username, password) {
  const db = getDb();
  if (!db) throw new Error('DB가 연결되지 않았어요. Supabase 설정을 확인하세요');

  const id = username.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(id)) {
    throw new Error('아이디는 영문 소문자/숫자/_ 3~20자예요');
  }
  if (!password || password.length < 4) {
    throw new Error('비밀번호는 4자 이상이어야 해요');
  }

  const hash = await bcrypt.hash(password, 10);
  const { data, error } = await db
    .from('app_users')
    .insert({ username: id, password_hash: hash })
    .select('id, username')
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('이미 사용 중인 아이디예요');
    throw new Error(error.message);
  }

  return { user: data, token: signToken(data) };
}

async function login(username, password) {
  const db = getDb();
  if (!db) throw new Error('DB가 연결되지 않았어요. Supabase 설정을 확인하세요');

  const id = username.trim().toLowerCase();
  const { data: user, error } = await db
    .from('app_users')
    .select('id, username, password_hash')
    .eq('username', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!user) throw new Error('아이디 또는 비밀번호가 틀려요');

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw new Error('아이디 또는 비밀번호가 틀려요');

  const safe = { id: user.id, username: user.username };
  return { user: safe, token: signToken(safe) };
}

async function listUserRooms(userId) {
  const db = getDb();
  if (!db) return [];

  const { data, error } = await db
    .from('user_rooms')
    .select('room_code, display_name, friend_name, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('방 목록 조회 실패:', error.message);
    return [];
  }

  return (data || []).map((r) => ({
    roomCode: r.room_code,
    name: r.display_name,
    friendName: r.friend_name,
    updatedAt: new Date(r.updated_at).getTime(),
  }));
}

async function joinUserRoom(userId, { roomCode, displayName, friendName }) {
  const db = getDb();
  if (!db) throw new Error('DB가 연결되지 않았어요');

  const code = roomCode.toUpperCase();
  await db.from('rooms').upsert({ code }, { onConflict: 'code' });

  const { error } = await db.from('user_rooms').upsert(
    {
      user_id: userId,
      room_code: code,
      display_name: displayName,
      friend_name: friendName || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,room_code' }
  );

  if (error) throw new Error(error.message);
  return listUserRooms(userId);
}

async function updateUserRoomFriend(userId, roomCode, friendName) {
  const db = getDb();
  if (!db) return;
  await db
    .from('user_rooms')
    .update({
      friend_name: friendName || null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('room_code', roomCode.toUpperCase());
}

async function leaveUserRoom(userId, roomCode) {
  const db = getDb();
  if (!db) return listUserRooms(userId);

  await db
    .from('user_rooms')
    .delete()
    .eq('user_id', userId)
    .eq('room_code', roomCode.toUpperCase());

  return listUserRooms(userId);
}

async function clearRoomMemberships(roomCode) {
  const db = getDb();
  if (!db) return;
  await db.from('user_rooms').delete().eq('room_code', roomCode.toUpperCase());
}

module.exports = {
  authMiddleware,
  optionalAuth,
  register,
  login,
  listUserRooms,
  joinUserRoom,
  updateUserRoomFriend,
  leaveUserRoom,
  clearRoomMemberships,
  JWT_SECRET,
};
