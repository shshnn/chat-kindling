const webpush = require('web-push');
const { getDb } = require('./db');

const VAPID_PUBLIC =
  process.env.VAPID_PUBLIC_KEY ||
  'BNE652MUOErwK4NE5LRpGO_bDNnmWYKMynCt7KHD6fuUTa0xnSBhfu3sr1lPqNcS2piJQ7wzHzaK0Wq-TuK-_ys';
const VAPID_PRIVATE =
  process.env.VAPID_PRIVATE_KEY ||
  'y3FfqKkSBWVm70Hbi2L6M1MjubtXxmhl-lp-pmu872g';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:kindling@local';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

function getVapidPublicKey() {
  return VAPID_PUBLIC;
}

async function saveSubscription(userId, subscription) {
  const db = getDb();
  if (!db) throw new Error('DB가 연결되지 않았어요');
  if (!subscription?.endpoint) throw new Error('구독 정보가 없어요');

  const { error } = await db.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys?.p256dh || '',
      auth: subscription.keys?.auth || '',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' }
  );
  if (error) throw new Error(error.message);
  return { ok: true };
}

async function notifyUsers(userIds, payload) {
  const db = getDb();
  if (!db || !userIds?.length) return;

  const unique = [...new Set(userIds.filter(Boolean))];
  const { data: rows } = await db
    .from('push_subscriptions')
    .select('*')
    .in('user_id', unique);

  if (!rows?.length) return;

  const body = JSON.stringify(payload);
  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          body
        );
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await db.from('push_subscriptions').delete().eq('endpoint', row.endpoint);
        } else {
          console.error('push 실패:', err.message);
        }
      }
    })
  );
}

module.exports = { getVapidPublicKey, saveSubscription, notifyUsers };
