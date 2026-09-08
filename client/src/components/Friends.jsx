import { useEffect, useState } from 'react';
import {
  fetchFriends,
  requestFriendApi,
  respondFriendApi,
  openFriendChatApi,
} from '../api';
import './Social.css';

export default function Friends({ user, onOpenChat }) {
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchFriends();
      setFriends(data.friends || []);
      setIncoming(data.incoming || []);
      setOutgoing(data.outgoing || []);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRequest(e) {
    e.preventDefault();
    if (!username.trim() || busy) return;
    setBusy(true);
    try {
      await requestFriendApi(username.trim());
      setUsername('');
      alert('친구 요청을 보냈어요 🌱');
      await load();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRespond(id, accept) {
    try {
      await respondFriendApi(id, accept);
      await load();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleChat(friend) {
    try {
      const data = await openFriendChatApi(friend.id, user.username);
      onOpenChat?.(data);
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) {
    return <div className="social-panel"><p className="cute-font">불러오는 중...</p></div>;
  }

  return (
    <div className="social-panel">
      <h2 className="cute-font social-title">친구</h2>

      <form className="friend-request-form" onSubmit={handleRequest}>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          placeholder="아이디로 친구 요청"
          maxLength={20}
        />
        <button type="submit" disabled={busy}>요청</button>
      </form>

      {incoming.length > 0 && (
        <section className="social-section">
          <h3>받은 요청</h3>
          {incoming.map((f) => (
            <div key={f.id} className="friend-row">
              <span>@{f.username}</span>
              <div className="friend-actions">
                <button type="button" onClick={() => handleRespond(f.id, true)}>수락</button>
                <button type="button" className="ghost" onClick={() => handleRespond(f.id, false)}>거절</button>
              </div>
            </div>
          ))}
        </section>
      )}

      {outgoing.length > 0 && (
        <section className="social-section">
          <h3>보낸 요청</h3>
          {outgoing.map((f) => (
            <div key={f.id} className="friend-row">
              <span>@{f.username}</span>
              <span className="muted">대기 중</span>
            </div>
          ))}
        </section>
      )}

      <section className="social-section">
        <h3>내 친구</h3>
        {friends.length === 0 && <p className="muted">아직 친구가 없어요</p>}
        {friends.map((f) => (
          <div key={f.id} className="friend-row">
            <div>
              <div>@{f.username}</div>
              <div className="temp-badge">친밀온도 {f.degrees}°</div>
            </div>
            <button type="button" onClick={() => handleChat(f)}>채팅</button>
          </div>
        ))}
      </section>
    </div>
  );
}
