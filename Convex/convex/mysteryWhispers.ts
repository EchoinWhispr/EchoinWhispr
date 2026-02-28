import { requireUser } from './auth';
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { Doc, Id } from './_generated/dataModel';

/**
 * Send a mystery whisper to a random user.
 * Enforces rate limits and excludes blocked users, self, and opted-out users.
 */
export const sendMysteryWhisper = mutation({
  args: {
    content: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const sender = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', identity.subject))
      .first();

    if (!sender) throw new Error('Sender not found');

    // 1. Check Feature Flag
    const featureFlag = await ctx.db
      .query('featureFlags')
      .withIndex('by_name', q => q.eq('name', 'MYSTERY_WHISPERS'))
      .first();

    if (!featureFlag || !featureFlag.enabled) {
      throw new Error('Mystery Whispers feature is currently disabled');
    }

    // 2. Check Rate Limits (e.g., 3 per day)
    const today = new Date().toISOString().split('T')[0];
    const dailyLimit = await ctx.db
      .query('mysteryWhisperLimits')
      .withIndex('by_user_date', q => q.eq('userId', sender._id).eq('date', today))
      .first();

    if (dailyLimit && dailyLimit.count >= 3) {
      throw new Error('Daily mystery whisper limit reached (3/3)');
    }

    // 3. Find Eligible Recipient
    // This is a simplified random selection. In a large scale app, 
    // we'd use a more efficient method than fetching all users.
    // For MVP/Foundation, fetching a batch and filtering is acceptable.
    
    // Get users who have opted out
    const optOuts = await ctx.db.query('mysterySettings').take(500);
    const optedOutUserIds = new Set(optOuts.filter(s => s.optOut).map(s => s.userId));

    // Get blocked users (from friends table)
    // We need to ensure we don't send to someone who blocked the sender
    // or someone the sender blocked.
    const blockedFriendships = await ctx.db
      .query('friends')
      .withIndex('by_user_status', q => q.eq('userId', sender._id).eq('status', 'blocked'))
      .collect();
    
    const blockedByFriendships = await ctx.db
      .query('friends')
      .withIndex('by_friend_status', q => q.eq('friendId', sender._id).eq('status', 'blocked'))
      .collect();

    const excludedUserIds = new Set([
      sender._id,
      ...optedOutUserIds,
      ...blockedFriendships.map(f => f.friendId),
      ...blockedByFriendships.map(f => f.userId),
    ]);

    // Fetch a pool of potential recipients (limit to 50 for performance)
    // In a real app, we might use a random index or a dedicated 'active users' pool.
    const potentialRecipients = await ctx.db.query('users').take(50);
    
    const eligibleRecipients = potentialRecipients.filter(u => !excludedUserIds.has(u._id));

    if (eligibleRecipients.length === 0) {
      throw new Error('No eligible recipients found at this time. Try again later!');
    }

    // Select random recipient
    const recipient = eligibleRecipients[Math.floor(Math.random() * eligibleRecipients.length)];

    // 4. Send Whisper
    const whisperId = await ctx.db.insert('whispers', {
      senderId: sender._id,
      recipientId: recipient._id,
      content: args.content,
      imageUrl: args.imageUrl,
      isRead: false,
      isMystery: true,
      createdAt: Date.now(),
    });

    // 5. Update Rate Limit
    if (dailyLimit) {
      await ctx.db.patch(dailyLimit._id, {
        count: dailyLimit.count + 1,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert('mysteryWhisperLimits', {
        userId: sender._id,
        date: today,
        count: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return { whisperId, recipientUsername: 'Anonymous' }; // Don't reveal recipient
  },
});

/**
 * Toggle mystery whisper opt-out status.
 */
export const toggleMysteryOptOut = mutation({
  args: {
    optOut: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const setting = await ctx.db
      .query('mysterySettings')
      .withIndex('by_user_id', q => q.eq('userId', user._id))
      .first();

    if (setting) {
      await ctx.db.patch(setting._id, {
        optOut: args.optOut,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert('mysterySettings', {
        userId: user._id,
        optOut: args.optOut,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Get current user's mystery settings.
 */
export const getMysterySettings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', identity.subject))
      .first();

    if (!user) return null;

    const setting = await ctx.db
      .query('mysterySettings')
      .withIndex('by_user_id', q => q.eq('userId', user._id))
      .first();

    return setting;
  },
});
