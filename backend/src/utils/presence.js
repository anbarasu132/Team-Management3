const ONLINE_WINDOW_MS = 2 * 60 * 1000;
const userLastSeen = new Map();

function normalizeUserId(userId) {
  const id = Number(userId);
  return Number.isFinite(id) ? id : null;
}

function markUserOnline(userId) {
  const id = normalizeUserId(userId);
  if (!id) return;
  userLastSeen.set(id, Date.now());
}

function removeUserPresence(userId) {
  const id = normalizeUserId(userId);
  if (!id) return;
  userLastSeen.delete(id);
}

function isUserOnline(userId, now = Date.now()) {
  const id = normalizeUserId(userId);
  if (!id) return false;
  const lastSeen = userLastSeen.get(id);
  if (!lastSeen) return false;
  return (now - lastSeen) <= ONLINE_WINDOW_MS;
}

function mapOnlineStatus(rows = []) {
  const now = Date.now();
  return rows.map((row) => ({
    ...row,
    is_online: isUserOnline(row.id, now)
  }));
}

module.exports = {
  ONLINE_WINDOW_MS,
  markUserOnline,
  removeUserPresence,
  isUserOnline,
  mapOnlineStatus
};
