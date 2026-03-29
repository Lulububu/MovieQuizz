const CACHE_PREFIX = 'moviequizz';

export function setCache(key, value, ttlMs = 300000) {
  const data = { value, expiresAt: Date.now() + ttlMs };
  sessionStorage.setItem(`${CACHE_PREFIX}:${key}`, JSON.stringify(data));
}

export function getCache(key) {
  const raw = sessionStorage.getItem(`${CACHE_PREFIX}:${key}`);
  if (!raw) return null;

  try {
    const data = JSON.parse(raw);
    if (Date.now() > data.expiresAt) {
      sessionStorage.removeItem(`${CACHE_PREFIX}:${key}`);
      return null;
    }
    return data.value;
  } catch (e) {
    sessionStorage.removeItem(`${CACHE_PREFIX}:${key}`);
    return null;
  }
}

export function removeCache(key) {
  sessionStorage.removeItem(`${CACHE_PREFIX}:${key}`);
}
