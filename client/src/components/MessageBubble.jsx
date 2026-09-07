import './MessageBubble.css';

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

export default function MessageBubble({ message, isMine, onImageClick }) {
  return (
    <div className={`message-row ${isMine ? 'mine' : 'theirs'}`}>
      {!isMine && (
        <div className="avatar">{message.sender?.[0]?.toUpperCase() || '?'}</div>
      )}
      <div className="bubble-wrap">
        {!isMine && <span className="sender-name">{message.sender}</span>}
        <div className={`bubble ${isMine ? 'bubble-mine' : 'bubble-theirs'}`}>
          {message.imageUrl && (
            <img
              src={message.imageUrl}
              alt="사진"
              className="bubble-image"
              onClick={() => onImageClick?.(message.imageUrl)}
            />
          )}
          {message.text && <p className="bubble-text">{message.text}</p>}
        </div>
        <span className="bubble-time">{formatTime(message.timestamp)}</span>
      </div>
    </div>
  );
}
