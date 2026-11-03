interface LimiterEntry {
  count: number;
  resetAt: number;
}

const LIMIT = 5;
const WINDOW_MS = 60 * 1000;

const store = new Map<string, LimiterEntry>();

function now(): number {
  return Date.now();
}

export function checkInvitationRateLimiter(projectId: string): {
  allowed: boolean;
  remaining: number;
  resetIn: number;
} {
  const key = `invite:${projectId}`;
  const next = now();
  let entry = store.get(key);

  if (!entry || next > entry.resetAt) {
    entry = { count: 0, resetAt: next + WINDOW_MS };
  }

  const resetIn = Math.max(0, entry.resetAt - next);
  const remaining = Math.max(0, LIMIT - entry.count);

  return {
    allowed: entry.count < LIMIT,
    remaining,
    resetIn,
  };
}

export function recordInvitationAttempt(projectId: string): void {
  const key = `invite:${projectId}`;
  const next = now();
  let entry = store.get(key);

  if (!entry || next > entry.resetAt) {
    entry = { count: 0, resetAt: next + WINDOW_MS };
  }

  entry.count += 1;
  store.set(key, entry);
}

export function clearInvitationRateLimiter(projectId: string): void {
  store.delete(`invite:${projectId}`);
}
