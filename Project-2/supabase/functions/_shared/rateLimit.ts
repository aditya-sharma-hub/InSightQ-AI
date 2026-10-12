/**
 * InsightIQ AI - Shared In-Memory Rate Limiter for Deno Edge Functions
 * Prevents AI quota abuse by limiting requests per user (10 requests/minute default)
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const userRequestMap = new Map<string, RateLimitRecord>();

export function checkRateLimit(userId: string, maxRequests: number = 10, windowMs: number = 60000): { isAllowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = userRequestMap.get(userId);

  if (!record || now > record.resetTime) {
    const newRecord: RateLimitRecord = { count: 1, resetTime: now + windowMs };
    userRequestMap.set(userId, newRecord);
    return { isAllowed: true, remaining: maxRequests - 1, resetTime: newRecord.resetTime };
  }

  if (record.count >= maxRequests) {
    return { isAllowed: false, remaining: 0, resetTime: record.resetTime };
  }

  record.count += 1;
  return { isAllowed: true, remaining: maxRequests - record.count, resetTime: record.resetTime };
}
