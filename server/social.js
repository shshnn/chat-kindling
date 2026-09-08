const crypto = require('crypto');
const { getDb } = require('./db');
const { joinUserRoom, listUserRooms } = require('./auth');

function pair(a, b) {
  return a < b ? [a, b] : [b, a];
}

function dmRoomCode(a, b) {
  const [x, y] = pair(a, b);
  return crypto.createHash('sha1').update(`dm:${x}:${y}`).digest('hex').slice(0, 6).toUpperCase();
}

async function findUserByUsername(username) {
  const db = getDb();
  const { data, error } = await db
    .from('app_users')
    .select('id, username')
    .eq('username', username.trim().toLowerCase())
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function requestFriend(myId, username) {
  const db = getDb();
  if (!db) throw new Error('DB가 연결되지 않았어요');

  const other = await findUserByUsername(username);
  if (!other) throw new Error('그 아이디를 찾을 수 없어요');
  if (other.id === myId) throw new Error('자기 자신과는 친구가 될 수 없어요');

  const [user_a, user_b] = pair(myId, other.id);
  const { data: existing } = await db
    .from('friendships')
    .select('*')
    .eq('user_a', user_a)
    .eq('user_b', user_b)
    .maybeSingle();

  if (existing?.status === 'accepted') throw new Error('이미 친구예요');
  if (existing?.status === 'pending') throw new Error('이미 친구 요청이 있어요');

  const { error } = await db.from('friendships').insert({
    user_a,
    user_b,
    requester_id: myId,
    status: 'pending',
  });
  if (error) throw new Error(error.message);
  return { ok: true, to: other.username };
}

async function respondFriend(myId, otherId, accept) {
  const db = getDb();
  if (!db) throw new Error('DB가 연결되지 않았어요');

  const [user_a, user_b] = pair(myId, otherId);
  const { data: row } = await db
    .from('friendships')
    .select('*')
    .eq('user_a', user_a)
    .eq('user_b', user_b)
    .maybeSingle();

  if (!row || row.status !== 'pending') throw new Error('대기 중인 요청이 없어요');
  if (row.requester_id === myId) throw new Error('내가 보낸 요청은 상대가 수락해야 해요');

  if (!accept) {
    await db.from('friendships').delete().eq('user_a', user_a).eq('user_b', user_b);
    return { ok: true };
  }

  const { error } = await db
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('user_a', user_a)
    .eq('user_b', user_b);
  if (error) throw new Error(error.message);

  await db.from('warmth').upsert(
    { user_a, user_b, degrees: 0, updated_at: new Date().toISOString() },
    { onConflict: 'user_a,user_b' }
  );

  return { ok: true };
}

async function listFriends(myId) {
  const db = getDb();
  if (!db) return { friends: [], incoming: [], outgoing: [] };

  const { data: rows, error } = await db
    .from('friendships')
    .select('*')
    .or(`user_a.eq.${myId},user_b.eq.${myId}`);
  if (error) throw new Error(error.message);

  const mine = rows || [];
  const otherIds = mine.map((r) => (r.user_a === myId ? r.user_b : r.user_a));

  let users = [];
  if (otherIds.length) {
    const { data } = await db.from('app_users').select('id, username').in('id', otherIds);
    users = data || [];
  }
  const byId = Object.fromEntries(users.map((u) => [u.id, u.username]));

  const warmthRows = await getWarmthMap(myId, otherIds);
  const nickMap = await getNicknameMap(myId, otherIds);

  const friends = [];
  const incoming = [];
  const outgoing = [];

  for (const r of mine) {
    const oid = r.user_a === myId ? r.user_b : r.user_a;
    const item = {
      id: oid,
      username: byId[oid] || '?',
      nickname: nickMap[oid] || null,
      degrees: warmthRows[oid] || 0,
    };
    if (r.status === 'accepted') friends.push(item);
    else if (r.requester_id === myId) outgoing.push(item);
    else incoming.push(item);
  }

  friends.sort((a, b) => b.degrees - a.degrees);
  return { friends, incoming, outgoing };
}

async function getNicknameMap(myId, friendIds) {
  const db = getDb();
  const map = {};
  if (!db || !friendIds.length) return map;
  const { data } = await db
    .from('friend_nicknames')
    .select('friend_id, nickname')
    .eq('user_id', myId)
    .in('friend_id', friendIds);
  for (const row of data || []) map[row.friend_id] = row.nickname;
  return map;
}

async function setFriendNickname(myId, friendId, nickname) {
  const db = getDb();
  if (!db) throw new Error('DB가 연결되지 않았어요');

  const [user_a, user_b] = pair(myId, friendId);
  const { data: fr } = await db
    .from('friendships')
    .select('status')
    .eq('user_a', user_a)
    .eq('user_b', user_b)
    .maybeSingle();
  if (!fr || fr.status !== 'accepted') throw new Error('친구만 애칭을 지정할 수 있어요');

  const name = String(nickname || '').trim().slice(0, 12);
  if (!name) {
    await db.from('friend_nicknames').delete().eq('user_id', myId).eq('friend_id', friendId);
    return { nickname: null };
  }

  const { error } = await db.from('friend_nicknames').upsert(
    {
      user_id: myId,
      friend_id: friendId,
      nickname: name,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,friend_id' }
  );
  if (error) throw new Error(error.message);
  return { nickname: name };
}

async function getNickname(myId, friendId) {
  const db = getDb();
  if (!db) return null;
  const { data } = await db
    .from('friend_nicknames')
    .select('nickname')
    .eq('user_id', myId)
    .eq('friend_id', friendId)
    .maybeSingle();
  return data?.nickname || null;
}

async function getWarmthMap(myId, otherIds) {
  const db = getDb();
  const map = {};
  if (!db || !otherIds.length) return map;

  for (const oid of otherIds) {
    const [user_a, user_b] = pair(myId, oid);
    const { data } = await db
      .from('warmth')
      .select('degrees')
      .eq('user_a', user_a)
      .eq('user_b', user_b)
      .maybeSingle();
    map[oid] = data?.degrees || 0;
  }
  return map;
}

async function getWarmthBetween(a, b) {
  const db = getDb();
  if (!db) return 0;
  const [user_a, user_b] = pair(a, b);
  const { data } = await db
    .from('warmth')
    .select('degrees')
    .eq('user_a', user_a)
    .eq('user_b', user_b)
    .maybeSingle();
  return data?.degrees || 0;
}

async function bumpWarmth(a, b) {
  const db = getDb();
  if (!db) return null;

  const uuidRe = /^[0-9a-f-]{36}$/i;
  if (!uuidRe.test(a) || !uuidRe.test(b) || a === b) return null;

  const [user_a, user_b] = pair(a, b);
  const current = await getWarmthBetween(a, b);
  const degrees = current + 1;

  const { error } = await db.from('warmth').upsert(
    {
      user_a,
      user_b,
      degrees,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_a,user_b' }
  );
  if (error) {
    console.error('온도 상승 실패:', error.message);
    return null;
  }
  return degrees;
}

async function openFriendChat(myId, friendId, myDisplayName) {
  const db = getDb();
  if (!db) throw new Error('DB가 연결되지 않았어요');

  const [user_a, user_b] = pair(myId, friendId);
  const { data: fr } = await db
    .from('friendships')
    .select('status')
    .eq('user_a', user_a)
    .eq('user_b', user_b)
    .maybeSingle();

  if (!fr || fr.status !== 'accepted') throw new Error('친구가 아니에요');

  const { data: friend } = await db
    .from('app_users')
    .select('username')
    .eq('id', friendId)
    .single();

  const roomCode = dmRoomCode(myId, friendId);
  const myName = myDisplayName || '나';
  const myNickForFriend = (await getNickname(myId, friendId)) || friend?.username || '친구';
  const theirNickForMe = (await getNickname(friendId, myId)) || myName;

  await joinUserRoom(myId, {
    roomCode,
    displayName: myName,
    friendName: myNickForFriend,
  });
  await joinUserRoom(friendId, {
    roomCode,
    displayName: friend?.username || '친구',
    friendName: theirNickForMe,
  });

  const rooms = await listUserRooms(myId);
  const degrees = await getWarmthBetween(myId, friendId);
  return {
    roomCode,
    rooms,
    degrees,
    friendUsername: friend?.username,
    friendNickname: myNickForFriend,
  };
}

async function listFeed(myId) {
  const db = getDb();
  if (!db) return [];

  const { friends } = await listFriends(myId);
  const authorIds = [myId, ...friends.map((f) => f.id)];

  const { data: posts, error } = await db
    .from('posts')
    .select('*')
    .in('author_id', authorIds)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  if (!posts?.length) return [];

  const authors = {};
  const { data: users } = await db
    .from('app_users')
    .select('id, username')
    .in('id', [...new Set(posts.map((p) => p.author_id))]);
  for (const u of users || []) authors[u.id] = u.username;

  const postIds = posts.map((p) => p.id);
  const { data: likes } = await db.from('post_likes').select('post_id, user_id').in('post_id', postIds);
  const { data: comments } = await db
    .from('post_comments')
    .select('id, post_id, user_id, text, created_at')
    .in('post_id', postIds)
    .order('created_at', { ascending: true });

  const commentUserIds = [...new Set((comments || []).map((c) => c.user_id))];
  const commentAuthors = {};
  if (commentUserIds.length) {
    const { data: cu } = await db.from('app_users').select('id, username').in('id', commentUserIds);
    for (const u of cu || []) commentAuthors[u.id] = u.username;
  }

  return posts.map((p) => {
    const postLikes = (likes || []).filter((l) => l.post_id === p.id);
    return {
      id: p.id,
      text: p.text || '',
      imageUrl: p.image_url,
      createdAt: p.created_at,
      authorId: p.author_id,
      authorUsername: authors[p.author_id] || '?',
      likeCount: postLikes.length,
      likedByMe: postLikes.some((l) => l.user_id === myId),
      comments: (comments || [])
        .filter((c) => c.post_id === p.id)
        .map((c) => ({
          id: c.id,
          text: c.text,
          username: commentAuthors[c.user_id] || '?',
          createdAt: c.created_at,
        })),
    };
  });
}

async function createPost(myId, { text, imageUrl }) {
  const db = getDb();
  if (!db) throw new Error('DB가 연결되지 않았어요');
  if (!text?.trim() && !imageUrl) throw new Error('내용이나 사진이 필요해요');

  const { data, error } = await db
    .from('posts')
    .insert({
      author_id: myId,
      text: text?.trim() || '',
      image_url: imageUrl || null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function toggleLike(myId, postId) {
  const db = getDb();
  if (!db) throw new Error('DB가 연결되지 않았어요');

  const { data: existing } = await db
    .from('post_likes')
    .select('*')
    .eq('post_id', postId)
    .eq('user_id', myId)
    .maybeSingle();

  if (existing) {
    await db.from('post_likes').delete().eq('post_id', postId).eq('user_id', myId);
    return { liked: false };
  }

  const { error } = await db.from('post_likes').insert({ post_id: postId, user_id: myId });
  if (error) throw new Error(error.message);
  return { liked: true };
}

async function addComment(myId, postId, text) {
  const db = getDb();
  if (!db) throw new Error('DB가 연결되지 않았어요');
  if (!text?.trim()) throw new Error('댓글을 입력해요');

  const { data, error } = await db
    .from('post_comments')
    .insert({ post_id: postId, user_id: myId, text: text.trim() })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

module.exports = {
  requestFriend,
  respondFriend,
  listFriends,
  setFriendNickname,
  getNickname,
  bumpWarmth,
  getWarmthBetween,
  openFriendChat,
  listFeed,
  createPost,
  toggleLike,
  addComment,
};
