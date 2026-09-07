# Kindling 🌱

친구와 둘만 쓰는 1:1 채팅 앱.  
채팅 기록은 **Supabase DB**에, 사진은 **Supabase Storage**에 저장됩니다.

---

## 기능

- 아이디 / 비밀번호 가입·로그인
- 계정에 참여 중인 방 저장 (기기 바꿔도 이어서)
- 실시간 텍스트 채팅 + 사진 전송
- 방당 2명 제한 · 방 폭파
- PWA — 폰 홈 화면에 앱처럼 설치 가능

---

## 1단계: Supabase 설정 (무료)

1. [supabase.com](https://supabase.com) 가입 → **New Project** 생성
2. **SQL Editor** → `supabase/schema.sql` 전체 붙여넣고 실행  
   (이미 rooms/messages만 만든 경우에도 전체 다시 실행 가능 — `IF NOT EXISTS`)
3. **Storage** → **New bucket**
   - 이름: `chat-images`
   - **Public bucket** 체크 ✅
4. **Settings → API** 에서 복사:
   - `Project URL` → `SUPABASE_URL`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`  
     ⚠️ service_role 키는 절대 프론트엔드/깃허브에 올리지 마세요
5. Render 환경변수에 `JWT_SECRET`도 추가 (긴 랜덤 문자열)

---

## 2단계: 로컬 실행

```bash
# 의존성 설치
npm run install:all

# .env 파일 생성
copy .env.example .env
# (.env에 Supabase 값 입력)

# 개발 모드 실행
npm run dev
```

→ http://localhost:5173

Supabase 없이도 로컬 테스트 가능 (메모리 모드, 재시작 시 기록 삭제)

---

## 3단계: Render에 배포 (무료)

1. GitHub에 코드 push
2. [render.com](https://render.com) 가입
3. **New → Blueprint** → `render.yaml` 있는 repo 연결  
   (또는 **New Web Service** 수동 설정)
4. Environment Variables 추가:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NODE_ENV` = `production`
5. Deploy!

배포 후 `https://kindling-xxxx.onrender.com` 같은 URL이 생깁니다.

> Render 무료 플랜은 15분 미사용 시 슬립 → 첫 접속 시 30초~1분 대기 가능

---

## 4단계: 폰에 앱처럼 설치 (PWA)

### iPhone (Safari)
1. 배포된 URL 접속
2. 공유 버튼 → **홈 화면에 추가**

### Android (Chrome)
1. 배포된 URL 접속
2. 메뉴 → **앱 설치** 또는 **홈 화면에 추가**

홈 화면에 Kindling 아이콘이 생기고 앱처럼 실행됩니다.

---

## 비용 요약

| 서비스 | 무료 한도 |
|--------|-----------|
| Supabase | DB 500MB, Storage 1GB |
| Render | Web Service 무료 (슬립 있음) |

둘만 쓰는 채팅이면 무료로 충분합니다.

---

## 프로덕션 빌드 (로컬 테스트)

```bash
npm run build
npm start
```

→ http://localhost:3001 (프론트+백엔드 통합)

---

## 기술 스택

- Frontend: React + Vite + PWA
- Backend: Express + Socket.io
- DB: Supabase (PostgreSQL)
- Storage: Supabase Storage
- Deploy: Render
