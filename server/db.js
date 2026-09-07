const { createClient } = require('@supabase/supabase-js');

let supabase = null;

function initDb() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.warn('⚠️  SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 없음 — 메모리 모드로 실행');
    return null;
  }

  supabase = createClient(url, key);
  return supabase;
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
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) {
    console.error('이미지 업로드 실패:', error.message);
    return null;
  }

  const { data } = supabase.storage.from('chat-images').getPublicUrl(filename);
  return data.publicUrl;
}

module.exports = { initDb, getDb, ensureRoom, getMessages, saveMessage, uploadImage };
