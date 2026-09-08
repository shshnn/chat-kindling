require('dotenv').config();

const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { initDb, ensureRoom, getMessages, saveMessage, uploadImage, getDb, destroyRoom } = require('./db');
const {
  authMiddleware,
  register,
  login,
  listUserRooms,
  joinUserRoom,
  updateUserRoomFriend,
  leaveUserRoom,
  clearRoomMemberships,
} = require('./auth');
const {
  requestFriend,
  respondFriend,
  listFriends,
  bumpWarmth,
  getWarmthBetween,
  openFriendChat,
  listFeed,
  createPost,
  toggleLike,
  addComment,
} = require('./social');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

initDb();

app.use(cors());
app.use(express.json());

const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOAD_DIR));

if (isProd) {
  const distPath = path.join(__dirname, '../client/dist');
  app.use(express.static(distPath));
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('이미지만 업로드 가능해요'));
  },
});

const activeRooms = new Map();

function getActiveRoom(roomCode) {
  if (!activeRooms.has(roomCode)) {
    activeRooms.set(roomCode, { users: [] });
  }
  return activeRooms.get(roomCode);
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, db: !!getDb() });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const result = await register(username, password);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const result = await login(username, password);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

app.get('/api/me/rooms', authMiddleware, async (req, res) => {
  try {
    const rooms = await listUserRooms(req.user.id);
    res.json({ rooms });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/me/rooms', authMiddleware, async (req, res) => {
  try {
    const { roomCode, displayName, friendName } = req.body || {};
    if (!roomCode || !displayName) {
      return res.status(400).json({ error: '방 코드와 이름이 필요해요' });
    }
    const rooms = await joinUserRoom(req.user.id, {
      roomCode,
      displayName,
      friendName,
    });
    res.json({ rooms });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/me/rooms/:code', authMiddleware, async (req, res) => {
  try {
    await updateUserRoomFriend(req.user.id, req.params.code, req.body?.friendName);
    const rooms = await listUserRooms(req.user.id);
    res.json({ rooms });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/me/rooms/:code', authMiddleware, async (req, res) => {
  try {
    const rooms = await leaveUserRoom(req.user.id, req.params.code);
    res.json({ rooms });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/friends', authMiddleware, async (req, res) => {
  try {
    res.json(await listFriends(req.user.id));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/friends/request', authMiddleware, async (req, res) => {
  try {
    res.json(await requestFriend(req.user.id, req.body?.username));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/friends/respond', authMiddleware, async (req, res) => {
  try {
    const { friendId, accept } = req.body || {};
    res.json(await respondFriend(req.user.id, friendId, !!accept));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/friends/chat', authMiddleware, async (req, res) => {
  try {
    const { friendId, displayName } = req.body || {};
    res.json(await openFriendChat(req.user.id, friendId, displayName));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/feed', authMiddleware, async (req, res) => {
  try {
    res.json({ posts: await listFeed(req.user.id) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/feed', authMiddleware, async (req, res) => {
  try {
    const post = await createPost(req.user.id, {
      text: req.body?.text,
      imageUrl: req.body?.imageUrl,
    });
    res.json({ post });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/feed/:id/like', authMiddleware, async (req, res) => {
  try {
    res.json(await toggleLike(req.user.id, req.params.id));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/feed/:id/comments', authMiddleware, async (req, res) => {
  try {
    const comment = await addComment(req.user.id, req.params.id, req.body?.text);
    res.json({ comment });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/upload', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '파일이 없어요' });

  try {
    if (getDb()) {
      const url = await uploadImage(req.file);
      if (!url) return res.status(500).json({ error: '업로드 실패' });
      return res.json({ url });
    }

    const ext = path.extname(req.file.originalname) || '.jpg';
    const filename = `${uuidv4()}${ext}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), req.file.buffer);
    res.json({ url: `/uploads/${filename}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

io.on('connection', (socket) => {
  let currentRoom = null;
  let userName = null;
  let userId = null;

  socket.on('join-room', async ({ roomCode, name, userId: clientUserId }) => {
    const room = getActiveRoom(roomCode);

    if (room.users.length >= 2 && !room.users.find((u) => u.userId === clientUserId)) {
      socket.emit('join-error', { message: '이 방은 이미 2명이에요' });
      return;
    }

    await ensureRoom(roomCode);

    const existing = room.users.find((u) => u.userId === clientUserId);
    if (!existing) {
      room.users.push({ socketId: socket.id, name, userId: clientUserId });
    } else {
      existing.socketId = socket.id;
      existing.name = name;
    }

    currentRoom = roomCode;
    userName = name;
    userId = clientUserId;
    socket.join(roomCode);

    const history = getDb() ? await getMessages(roomCode) : [];

    let warmth = null;
    if (room.users.length === 2) {
      const ids = room.users.map((u) => u.userId);
      warmth = await getWarmthBetween(ids[0], ids[1]);
    }

    socket.emit('join-success', {
      messages: history,
      users: room.users.map((u) => ({ name: u.name, userId: u.userId })),
      myUserId: clientUserId,
      warmth,
    });

    socket.to(roomCode).emit('user-joined', {
      name,
      users: room.users.map((u) => ({ name: u.name, userId: u.userId })),
      warmth,
    });
  });

  socket.on('send-message', async ({ text, imageUrl }) => {
    if (!currentRoom || !userId) return;

    const id = uuidv4();
    let message = {
      id,
      text: text || '',
      imageUrl: imageUrl || null,
      sender: userName,
      senderUserId: userId,
      timestamp: new Date().toISOString(),
    };

    if (getDb()) {
      const saved = await saveMessage(currentRoom, message);
      if (saved) message = saved;
    }

    io.to(currentRoom).emit('new-message', message);

    const room = getActiveRoom(currentRoom);
    if (room.users.length === 2) {
      const ids = room.users.map((u) => u.userId);
      const degrees = await bumpWarmth(ids[0], ids[1]);
      if (degrees != null) {
        io.to(currentRoom).emit('warmth-up', { degrees });
      }
    }
  });

  socket.on('typing', ({ isTyping }) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('user-typing', { name: userName, isTyping });
  });

  socket.on('destroy-room', async () => {
    if (!currentRoom) return;

    const roomCode = currentRoom;
    await clearRoomMemberships(roomCode);
    const ok = await destroyRoom(roomCode);
    if (!ok) {
      socket.emit('destroy-error', { message: '방 폭파에 실패했어요' });
      return;
    }

    io.to(roomCode).emit('room-destroyed', {
      roomCode,
      by: userName,
    });

    activeRooms.delete(roomCode);
    currentRoom = null;
  });

  socket.on('disconnect', () => {
    if (!currentRoom) return;

    const room = getActiveRoom(currentRoom);
    room.users = room.users.filter((u) => u.socketId !== socket.id);

    socket.to(currentRoom).emit('user-left', {
      name: userName,
      users: room.users.map((u) => ({ name: u.name, userId: u.userId })),
    });
  });
});

if (isProd) {
  const indexHtml = path.join(__dirname, '../client/dist/index.html');
  app.use((req, res, next) => {
    if (
      req.method !== 'GET' ||
      req.path.startsWith('/api') ||
      req.path.startsWith('/socket.io') ||
      req.path.startsWith('/uploads')
    ) {
      return next();
    }
    if (!fs.existsSync(indexHtml)) {
      return res.status(500).send('client/dist 없음 — 빌드를 확인하세요');
    }
    res.sendFile(indexHtml);
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Kindling 서버 실행: port ${PORT} (${isProd ? 'production' : 'dev'})`);
  console.log(`DB: ${getDb() ? 'Supabase 연결됨' : '메모리 모드'}`);
});

process.on('uncaughtException', (err) => {
  console.error('uncaughtException:', err);
});
process.on('unhandledRejection', (err) => {
  console.error('unhandledRejection:', err);
});
