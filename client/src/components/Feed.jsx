import { useEffect, useRef, useState } from 'react';
import {
  fetchFeed,
  createPostApi,
  likePostApi,
  commentPostApi,
  uploadImageApi,
} from '../api';
import './Social.css';

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [pendingImage, setPendingImage] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});
  const fileRef = useRef(null);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchFeed();
      setPosts(data.posts || []);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const data = await uploadImageApi(file);
      setPendingImage(data.url);
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handlePost(e) {
    e.preventDefault();
    if (!text.trim() && !pendingImage) return;
    try {
      await createPostApi({ text, imageUrl: pendingImage });
      setText('');
      setPendingImage(null);
      await load();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleLike(postId) {
    try {
      await likePostApi(postId);
      await load();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleComment(postId) {
    const body = commentDrafts[postId]?.trim();
    if (!body) return;
    try {
      await commentPostApi(postId, body);
      setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
      await load();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="social-panel feed-panel">
      <h2 className="cute-font social-title">일상 피드</h2>

      <form className="compose-card" onSubmit={handlePost}>
        <textarea
          placeholder="친구에게 일상을 공유해요..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
        />
        {pendingImage && (
          <div className="compose-preview">
            <img src={pendingImage} alt="미리보기" />
            <button type="button" onClick={() => setPendingImage(null)}>✕</button>
          </div>
        )}
        <div className="compose-actions">
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? '업로드 중...' : '📷 사진'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleImage} />
          <button type="submit" className="primary">게시</button>
        </div>
      </form>

      {loading && <p className="cute-font">불러오는 중...</p>}

      {!loading && posts.length === 0 && (
        <p className="muted">친구의 일상이 아직 없어요. 먼저 올려볼까요?</p>
      )}

      {posts.map((post) => (
        <article key={post.id} className="feed-card">
          <header className="feed-card-head">
            <strong>@{post.authorUsername}</strong>
            <span className="muted">{new Date(post.createdAt).toLocaleString('ko-KR')}</span>
          </header>
          {post.text && <p className="feed-text">{post.text}</p>}
          {post.imageUrl && <img className="feed-image" src={post.imageUrl} alt="" />}
          <div className="feed-actions">
            <button type="button" onClick={() => handleLike(post.id)}>
              {post.likedByMe ? '❤️' : '🤍'} {post.likeCount}
            </button>
          </div>
          <div className="feed-comments">
            {post.comments.map((c) => (
              <div key={c.id} className="feed-comment">
                <strong>@{c.username}</strong> {c.text}
              </div>
            ))}
            <div className="comment-row">
              <input
                value={commentDrafts[post.id] || ''}
                onChange={(e) =>
                  setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))
                }
                placeholder="댓글 달기..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleComment(post.id);
                  }
                }}
              />
              <button type="button" onClick={() => handleComment(post.id)}>게시</button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
