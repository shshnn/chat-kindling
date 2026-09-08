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

-- 계정 (아이디 / 비밀번호)
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 유저가 참여 중인 방
CREATE TABLE IF NOT EXISTS user_rooms (
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  room_code TEXT NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  friend_name TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, room_code)
);

CREATE INDEX IF NOT EXISTS idx_user_rooms_user ON user_rooms(user_id, updated_at DESC);

-- Storage: Dashboard → Storage → New bucket
-- 버킷 이름: chat-images
-- Public bucket: ON (체크)

-- 친구/피드 테이블은 schema-social.sql 도 실행하세요
