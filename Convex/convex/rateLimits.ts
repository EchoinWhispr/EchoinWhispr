import { v } from 'convex/values';
import { mutation, query, internalMutation, QueryCtx, MutationCtx } from './_generated/server';
import { Id } from './_generated/dataModel';

/**
 * Rate limiting utilities for Convex mutations.
 * Provides configurable rate limiting per action type.
 */

// Rate limit configurations per action type
export const RATE_LIMITS = {
  SEND_WHISPER: { limit: 20, windowMs: 60 * 60 * 1000 }, // 20 per hour
  SEND_FRIEND_REQUEST: { limit: 30, windowMs: 24 * 60 * 60 * 1000 }, // 30 per day
  SEND_MYSTERY_WHISPER: { limit: 3, windowMs: 24 * 60 * 60 * 1000 }, // 3 per day (existing)
  SEND_MESSAGE: { limit: 100, windowMs: 60 * 60 * 1000 }, // 100 per hour
  CREATE_ECHO_CHAMBER: { limit: 10, windowMs: 60 * 60 * 1000 }, // 10 per hour
  SCHEDULE_WHISPER: { limit: 5, windowMs: 60 * 60 * 1000 }, // 5 per hour
  REQUEST_ADMIN_PROMOTION: { limit: 3, windowMs: 24 * 60 * 60 * 1000 }, // 3 per day
  REQUEST_SUPER_ADMIN_PROMOTION: { limit: 3, windowMs: 24 * 60 * 60 * 1000 }, // 3 per day
  UPDATE_PROFILE: { limit: 10, windowMs: 60 * 60 * 1000 }, // 10 per hour
} as const;

export type RateLimitAction = keyof typeof RATE_LIMITS;

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  error?: string;
}

/**
 * Check if an action is rate limited for a user.
 * Returns whether the action is allowed and remaining quota.
 */
export async function checkRateLimit(
  ctx: QueryCtx | MutationCtx,
  userId: Id<'users'>,
  action: RateLimitAction
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[action];
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Query rate limit records for this user and action within the window
  const records = await ctx.db
    .query('rateLimits')
    .withIndex('by_user_action', (q) => 
      q.eq('userId', userId).eq('action', action)
    )
    .filter((q) => q.gte(q.field('timestamp'), windowStart))
    .collect();

  const count = records.length;
  const allowed = count < config.limit;
  const remaining = Math.max(0, config.limit - count);
  
  // Find when the oldest record in window will expire
  const oldestInWindow = records.length > 0 
    ? Math.min(...records.map(r => r.timestamp))
    : now;
  const resetAt = oldestInWindow + config.windowMs;

  return {
    allowed,
    remaining,
    resetAt,
    error: allowed ? undefined : `Rate limit exceeded. Try again in ${Math.ceil((resetAt - now) / 60000)} minutes.`,
  };
}

/**
 * Record a rate-limited action for a user.
 * Call this AFTER successfully performing an action.
 */
export async function recordRateLimitedAction(
  ctx: MutationCtx,
  userId: Id<'users'>,
  action: RateLimitAction
): Promise<void> {
  await ctx.db.insert('rateLimits', {
    userId,
    action,
    timestamp: Date.now(),
  });
}

/**
 * Enforce rate limit - checks and throws if exceeded.
 * Use this at the start of rate-limited mutations.
 */
export async function enforceRateLimit(
  ctx: MutationCtx,
  userId: Id<'users'>,
  action: RateLimitAction
): Promise<void> {
  const result = await checkRateLimit(ctx, userId, action);
  if (!result.allowed) {
    throw new Error(result.error || 'Rate limit exceeded');
  }
}

/**
 * Clean up old rate limit records (call periodically via cron).
 * Removes records older than the longest window.
 */
export const cleanupOldRateLimits = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    // Use the longest window (24 hours)
    const cutoff = now - 24 * 60 * 60 * 1000;

    const oldRecords = await ctx.db
      .query('rateLimits')
      .filter((q) => q.lt(q.field('timestamp'), cutoff))
      .take(500); // Process in batches

    for (const record of oldRecords) {
      await ctx.db.delete(record._id);
    }

    return { deleted: oldRecords.length };
  },
});

/**
 * Clean up stale typing indicators (both 1:1 and echo chamber).
 * Run periodically via cron to prevent unbounded growth.
 */
export const cleanupTypingIndicators = internalMutation({
  args: {},
  handler: async (ctx) => {
    const staleBefore = Date.now() - 30_000; // 30 seconds
    let totalDeleted = 0;

    const stale1to1 = await ctx.db
      .query('typingIndicators')
      .filter((q) => q.lt(q.field('lastTypingAt'), staleBefore))
      .take(200);

    for (const t of stale1to1) {
      await ctx.db.delete(t._id);
    }
    totalDeleted += stale1to1.length;

    const staleChamber = await ctx.db
      .query('echoChamberTyping')
      .filter((q) => q.lt(q.field('lastTypingAt'), staleBefore))
      .take(200);

    for (const t of staleChamber) {
      await ctx.db.delete(t._id);
    }
    totalDeleted += staleChamber.length;

    return { deleted: totalDeleted };
  },
});

/**
 * Get rate limit status for a user and action.
 * Useful for displaying remaining quota in the UI.
 */
export const getRateLimitStatus = query({
  args: {
    action: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();

    if (!user) {
      return null;
    }

    // Validate action is a valid rate limit action
    if (!(args.action in RATE_LIMITS)) {
      return null;
    }

    return await checkRateLimit(ctx, user._id, args.action as RateLimitAction);
  },
});
