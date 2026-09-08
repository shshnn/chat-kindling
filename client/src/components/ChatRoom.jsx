import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import MessageBubble from './MessageBubble';
import { roomLabel, uploadImageApi } from '../api';
import { showLocalNotification } from '../notifications';
import './ChatRoom.css';
import './Social.css';

function getUserId(accountId) {
  if (accountId) return accountId;
  let id = localStorage.getItem('kindling_user_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('kindling_user_id', id);
  }
  return id;
}

export default function ChatRoom({
  accountId,
  name,
  roomCode,
  rooms,
  onSwitchRoom,
  onLeave,
  onDestroy,
  onFriendName,
}) {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [myUserId, setMyUserId] = useState(null);
  const [input, setInput] = useState('');
  const [typingUser, setTypingUser] = useState(null);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [warmth, setWarmth] = useState(null);
  const [warmthToast, setWarmthToast] = useState(null);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const userIdRef = useRef(getUserId(accountId));
  userIdRef.current = getUserId(accountId);
  const onFriendNameRef = useRef(onFriendName);
  onFriendNameRef.current = onFriendName;
  const onDestroyRef = useRef(onDestroy);
  onDestroyRef.current = onDestroy;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    setMessages([]);
    setUsers([]);
    setConnected(false);
    setError(null);
    setTypingUser(null);
    setInput('');
    setWarmth(null);
    setWarmthToast(null);

    const socket = io('/', { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.emit('join-room', {
      roomCode,
      name,
      userId: userIdRef.current,
    });

    socket.on('join-success', ({ messages: history, users: roomUsers, myUserId: uid, warmth: w }) => {
      setMessages(history);
      setUsers(roomUsers);
      setMyUserId(uid);
      setConnected(true);
      setError(null);
      if (typeof w === 'number') setWarmth(w);
      const friendUser = roomUsers.find((u) => u.userId !== uid);
      onFriendNameRef.current?.(friendUser?.name || null);
    });

    socket.on('join-error', ({ message }) => {
      setError(message);
    });

    socket.on('new-message', (msg) => {
      setMessages((prev) => [...prev, msg]);
      if (msg.senderUserId !== userIdRef.current) {
        showLocalNotification(
          msg.sender || 'Kindling',
          msg.text || (msg.imageUrl ? '사진을 보냈어요 📷' : '새 메시지')
        );
      }
    });

    socket.on('user-joined', ({ users: roomUsers, warmth: w }) => {
      setUsers(roomUsers);
      if (typeof w === 'number') setWarmth(w);
      const friendUser = roomUsers.find((u) => u.userId !== userIdRef.current);
      onFriendNameRef.current?.(friendUser?.name || null);
    });

    socket.on('user-left', ({ users: roomUsers }) => {
      setUsers(roomUsers);
      const friendUser = roomUsers.find((u) => u.userId !== userIdRef.current);
      onFriendNameRef.current?.(friendUser?.name || null);
    });

    socket.on('user-typing', ({ name: typingName, isTyping }) => {
      setTypingUser(isTyping ? typingName : null);
    });

    socket.on('warmth-up', ({ degrees }) => {
      setWarmth(degrees);
      setWarmthToast(`🔥 오늘 친밀온도 1도 올랐어요! 지금 ${degrees}°`);
      clearTimeout(socket._warmthToastTimer);
      socket._warmthToastTimer = setTimeout(() => setWarmthToast(null), 2500);
    });

    socket.on('warmth-sync', ({ degrees }) => {
      if (typeof degrees === 'number') setWarmth(degrees);
    });

    socket.on('room-destroyed', ({ by }) => {
      if (by === name) {
        alert('방을 폭파했어요 💥\n대화 기록이 모두 삭제됐어요.');
      } else {
        alert(`${by || '상대'}님이 방을 폭파했어요 💥\n대화 기록이 모두 삭제됐어요.`);
      }
      onDestroyRef.current?.();
    });

    socket.on('destroy-error', ({ message }) => {
      alert(message || '방 폭파에 실패했어요');
    });

    return () => {
      clearTimeout(socket._warmthToastTimer);
      socket.disconnect();
    };
  }, [roomCode, name]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  function handleTyping() {
    socketRef.current?.emit('typing', { isTyping: true });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('typing', { isTyping: false });
    }, 1500);
  }

  function handleDestroyRoom() {
    const ok = window.confirm(
      `방 ${roomCode}을(를) 폭파할까요?\n\n대화 기록이 모두 삭제되고, 상대도 방에서 나가져요.`
    );
    if (!ok) return;
    socketRef.current?.emit('destroy-room');
  }

  function sendMessage(text, imageUrl) {
    if (!text?.trim() && !imageUrl) return;
    socketRef.current?.emit('send-message', { text: text?.trim() || '', imageUrl });
    setInput('');
    socketRef.current?.emit('typing', { isTyping: false });
  }

  function handleSubmit(e) {
    e.preventDefault();
    sendMessage(input);
  }

  async function handleImageSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const data = await uploadImageApi(file);
      if (data.url) {
        sendMessage('', data.url);
      } else {
        alert('사진 업로드에 실패했어요');
      }
    } catch (err) {
      alert(err.message || '사진 업로드에 실패했어요');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const friend = users.find((u) => u.userId !== myUserId);
  const isWaiting = users.length < 2;

  if (error) {
    return (
      <div className="error-screen">
        <div className="error-card">
          <span className="error-emoji">😢</span>
          <p>{error}</p>
          <button onClick={onLeave} className="back-btn cute-font">이 방 나가기</button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-room">
      {warmthToast && <div className="warmth-toast">{warmthToast}</div>}
      <header className="chat-header">
        <button className="back-icon" onClick={onLeave} aria-label="이 방 나가기" title="이 방 나가기">
          ←
        </button>
        <div className="header-info">
          <select
            className="room-select"
            value={roomCode}
            onChange={(e) => onSwitchRoom(e.target.value)}
            aria-label="대화방 선택"
          >
            {rooms.map((room) => (
              <option key={room.roomCode} value={room.roomCode}>
                {roomLabel(room)}
              </option>
            ))}
            <option value="__new__">＋ 새 대화 시작</option>
          </select>
          <div className="header-status">
            <span className={`status-dot ${isWaiting ? 'waiting' : 'online'}`} />
            <span className="status-text">
              {isWaiting
                ? '친구를 기다리고 있어요'
                : `${friend?.name || '친구'}와 함께하는 중`}
            </span>
            {!isWaiting && warmth != null && (
              <span className="warmth-badge"> · {warmth}°</span>
            )}
          </div>
        </div>
        <div className="room-badge">{roomCode}</div>
        <button
          type="button"
          className="destroy-btn"
          onClick={handleDestroyRoom}
          disabled={!connected}
          title="방 폭파"
          aria-label="방 폭파"
        >
          💥
        </button>
      </header>

      <div className="chat-messages">
        {isWaiting && messages.length === 0 && (
          <div className="waiting-banner">
            <div className="waiting-icon">🤝</div>
            <p className="cute-font">방 코드를 친구에게 알려주세요!</p>
            <div className="share-code">{roomCode}</div>
            <p className="waiting-sub">친구가 들어오면 채팅이 시작돼요 ✨</p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isMine={msg.senderUserId === myUserId}
            onImageClick={setPreviewImage}
          />
        ))}

        {typingUser && (
          <div className="typing-indicator">
            <span className="typing-dots">
              <span /><span /><span />
            </span>
            <span>{typingUser}님이 입력 중...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-bar" onSubmit={handleSubmit}>
        <button
          type="button"
          className="photo-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || !connected}
          aria-label="사진 보내기"
        >
          {uploading ? '⏳' : '📷'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleImageSelect}
        />
        <input
          type="text"
          className="message-input"
          placeholder="메시지를 입력해요..."
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            handleTyping();
          }}
          disabled={!connected}
        />
        <button
          type="submit"
          className="send-btn"
          disabled={!input.trim() || !connected}
          aria-label="보내기"
        >
          ➤
        </button>
      </form>

      {previewImage && (
        <div className="image-preview-overlay" onClick={() => setPreviewImage(null)}>
          <img src={previewImage} alt="미리보기" onClick={(e) => e.stopPropagation()} />
          <button className="close-preview" onClick={() => setPreviewImage(null)}>✕</button>
        </div>
      )}
    </div>
  );
}
