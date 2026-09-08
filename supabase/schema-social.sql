-- 친구 / 친밀온도 / 피드 (기존 schema 실행 후 이것도 실행)

CREATE TABLE IF NOT EXISTS friendships (
  user_a UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_a, user_b),
  CHECK (user_a < user_b)
);

CREATE TABLE IF NOT EXISTS warmth (
  user_a UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  degrees INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_a, user_b),
  CHECK (user_a < user_b)
);

CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  text TEXT DEFAULT '',
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);

CREATE TABLE IF NOT EXISTS post_likes (
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_comments ON post_comments(post_id, created_at);

-- 서로 지정하는 애칭 (내가 상대에게 붙인 이름)
CREATE TABLE IF NOT EXISTS friend_nicknames (
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, friend_id)
);

-- 푸시 알림 구독
CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);

-- 친밀온도: 하루 1회만 상승
ALTER TABLE warmth ADD COLUMN IF NOT EXISTS last_bump_date DATE;


