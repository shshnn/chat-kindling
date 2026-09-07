-- Kindling 채팅 앱 DB 스키마
-- Supabase Dashboard → SQL Editor 에서 실행하세요

CREATE TABLE IF NOT EXISTS rooms (
  code TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_user_id TEXT NOT NULL,
  text TEXT DEFAULT '',
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_code, created_at);

-- Storage: Dashboard → Storage → New bucket
-- 버킷 이름: chat-images
-- Public bucket: ON (체크)
