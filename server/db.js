const { createClient } = require('@supabase/supabase-js');

let supabase = null;

function cleanEnv(value) {
  if (!value) return '';
  return String(value).trim().replace(/^["']|["']$/g, '');
}

function initDb() {
  const url = cleanEnv(process.env.SUPABASE_URL);
  const key = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!url || !key) {
    console.warn('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 없음 — 메모리 모드');
    return null;
  }

  if (!/^https?:\/\//i.test(url)) {
    console.error('SUPABASE_URL 형식 오류 (https://... 이어야 함):', url.slice(0, 40));
    return null;
  }

  try {
    supabase = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      realtime: {
        // 서버에서는 Realtime 미사용 — 연결 초기화 실패로 프로세스 죽지 않게
        timeout: 1000,
      },
    });
    console.log('Supabase 클라이언트 준비됨');
    return supabase;
  } catch (err) {
    console.error('Supabase 초기화 실패 — 메모리 모드로 계속:', err.message);
    supabase = null;
    return null;
  }
}

function getDb() {
  return supabase;
}

async function ensureRoom(roomCode) {
  if (!supabase) return;
  await supabase.from('rooms').upsert({ code: roomCode }, { onConflict: 'code' });
}

async function getMessages(roomCode) {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('room_code', roomCode)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('메시지 조회 실패:', error.message);
    return [];
  }

  return data.map((m) => ({
    id: m.id,
    text: m.text || '',
    imageUrl: m.image_url || null,
    sender: m.sender_name,
    senderUserId: m.sender_user_id,
    timestamp: m.created_at,
  }));
}

async function saveMessage(roomCode, { id, text, imageUrl, sender, senderUserId }) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('messages')
    .insert({
      id,
      room_code: roomCode,
      sender_name: sender,
      sender_user_id: senderUserId,
      text: text || '',
      image_url: imageUrl || null,
    })
    .select()
    .single();

  if (error) {
    console.error('메시지 저장 실패:', error.message);
    return null;
  }

  return {
    id: data.id,
    text: data.text || '',
    imageUrl: data.image_url || null,
    sender: data.sender_name,
    senderUserId: data.sender_user_id,
    timestamp: data.created_at,
  };
}

async function uploadImage(file) {
  if (!supabase) return null;

  const ext = file.originalname.includes('.')
    ? file.originalname.slice(file.originalname.lastIndexOf('.'))
    : '.jpg';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

  const { error } = await supabase.storage
    .from('chat-images')
    .upload(filename, file.buffer, {
      contentType: file.mimetype || 'image/jpeg',
      upsert: true,
    });

  if (error) {
    console.error('이미지 업로드 실패:', error.message);
    return null;
  }

  const { data } = supabase.storage.from('chat-images').getPublicUrl(filename);
  return data.publicUrl;
}

async function destroyRoom(roomCode) {
  if (!supabase) return true;

  const { error } = await supabase.from('rooms').delete().eq('code', roomCode);
  if (error) {
    console.error('방 삭제 실패:', error.message);
    return false;
  }
  return true;
}

module.exports = { initDb, getDb, ensureRoom, getMessages, saveMessage, uploadImage, destroyRoom };
