import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import MessageBubble from './MessageBubble';
import './ChatRoom.css';

function getUserId() {
  let id = localStorage.getItem('kindling_user_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('kindling_user_id', id);
  }
  return id;
}

export default function ChatRoom({ name, roomCode, onLeave }) {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [myUserId, setMyUserId] = useState(null);
  const [input, setInput] = useState('');
  const [typingUser, setTypingUser] = useState(null);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const userIdRef = useRef(getUserId());

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const socket = io('/', { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.emit('join-room', {
      roomCode,
      name,
      userId: userIdRef.current,
    });

    socket.on('join-success', ({ messages: history, users: roomUsers, myUserId: uid }) => {
      setMessages(history);
      setUsers(roomUsers);
      setMyUserId(uid);
      setConnected(true);
      setError(null);
    });

    socket.on('join-error', ({ message }) => {
      setError(message);
    });

    socket.on('new-message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('user-joined', ({ users: roomUsers }) => {
      setUsers(roomUsers);
    });

    socket.on('user-left', ({ users: roomUsers }) => {
      setUsers(roomUsers);
    });

    socket.on('user-typing', ({ name: typingName, isTyping }) => {
      setTypingUser(isTyping ? typingName : null);
    });

    return () => socket.disconnect();
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
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        sendMessage('', data.url);
      } else {
        alert(data.error || '사진 업로드에 실패했어요');
      }
    } catch {
      alert('사진 업로드에 실패했어요');
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
          <button onClick={onLeave} className="back-btn cute-font">돌아가기</button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-room">
      <header className="chat-header">
        <button className="back-icon" onClick={onLeave} aria-label="나가기">
          ←
        </button>
        <div className="header-info">
          <h2 className="cute-font friend-name">
            {friend ? friend.name : '친구 기다리는 중...'}
          </h2>
          <div className="header-status">
            <span className={`status-dot ${isWaiting ? 'waiting' : 'online'}`} />
            <span className="status-text">
              {isWaiting ? '친구를 기다리고 있어요' : '함께하는 중 ✨'}
            </span>
          </div>
        </div>
        <div className="room-badge">{roomCode}</div>
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
