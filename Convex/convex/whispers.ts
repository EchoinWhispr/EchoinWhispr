import { v } from 'convex/values';
import { mutation, query, internalMutation } from './_generated/server';
import { internal } from './_generated/api';
import { Doc, Id } from './_generated/dataModel';
import { enforceRateLimit, recordRateLimitedAction } from './rateLimits';
import { VALIDATION } from './schema';
import { requireUser } from './auth';

// Utility for basic XSS prevention (strip HTML tags)
const sanitizeText = (text: string | undefined): string => {
  if (!text) return '';
  return text.replace(/<[^>]*>?/gm, '');
};

// Send a whisper to another user
export const sendWhisper = mutation({
  args: {
    recipientUsername: v.string(),
    content: v.string(),
    imageUrl: v.optional(v.string()),
    location: v.optional(v.object({ latitude: v.number(), longitude: v.number() })),
  },
  handler: async (ctx, args) => {
    // Sanitize content
    const sanitizedContent = sanitizeText(args.content);

    // Validate content length (max 280 characters as per SSD)
    if (sanitizedContent.length > 280) {
      throw new Error('Whisper content must be 280 characters or less');
    }

    // Allow image-only whispers - only reject if both content and imageUrl are empty
    if (sanitizedContent.trim().length === 0 && !args.imageUrl) {
      throw new Error('Whisper must have content or an image');
    }

    // Get sender
    const sender = await requireUser(ctx);

    // Enforce rate limit (20 whispers per hour)
    await enforceRateLimit(ctx, sender._id, 'SEND_WHISPER');

    // Get recipient
    const recipient = await ctx.db
      .query('users')
      .withIndex('by_username', q => q.eq('username', args.recipientUsername))
      .first();

    if (!recipient) {
      throw new Error('Recipient not found');
    }

    // Don't allow sending whispers to yourself
    if (sender._id === recipient._id) {
      throw new Error('Cannot send whisper to yourself');
    }

    const now = Date.now();

    // Create the whisper
    const whisperId = await ctx.db.insert('whispers', {
      senderId: sender._id,
      recipientId: recipient._id,
      content: sanitizedContent.trim(),
      imageUrl: args.imageUrl,
      location: args.location,
      isRead: false,
      createdAt: now,
    });

    // Record rate limit action
    await recordRateLimitedAction(ctx, sender._id, 'SEND_WHISPER');

    // Create notification for recipient
    const messagePreview = sanitizedContent.trim().length > 50 
      ? sanitizedContent.trim().slice(0, 50) + '...' 
      : sanitizedContent.trim();
    
    await ctx.scheduler.runAfter(0, internal.notifications.createNotificationInternal, {
      userId: recipient._id,
      type: 'whisper',
      title: 'New Whisper',
      message: args.imageUrl ? `📷 ${messagePreview || '[Image]'}` : messagePreview,
      actionUrl: '/inbox',
      metadata: { whisperId, hasImage: !!args.imageUrl },
    });

    return whisperId;
  },
});

// Get whispers received by current user (with pagination)
export const getReceivedWhispers = query({
  args: {
    paginationOpts: v.any(), 
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      // Return empty page instead of throwing to prevent UI errors during auth loading
      return { page: [], isDone: true, continueCursor: "" };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', identity.subject))
      .first();

    if (!user) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    const result = await ctx.db
      .query('whispers')
      .withIndex('by_recipient_conversation', q => 
        q.eq('recipientId', user._id).eq('conversationId', undefined)
      )
      .order('desc')
      .paginate(args.paginationOpts);

    return result;
  },
});

// Get ALL whispers received by current user (no pagination - fetches everything)
// Note: This may be slower for users with many whispers. Optimize later if needed.
export const getAllReceivedWhispers = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', identity.subject))
      .first();

    if (!user) {
      return [];
    }

    const whispers = await ctx.db
      .query('whispers')
      .withIndex('by_recipient_conversation', q => 
        q.eq('recipientId', user._id).eq('conversationId', undefined)
      )
      .order('desc')
      .take(500);

    return whispers;
  },
});

// Get count of received whispers for current user (lightweight alternative)
// Returns { count, capped } to indicate if results were truncated
export const getReceivedWhispersCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { count: 0, capped: false };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', identity.subject))
      .first();

    if (!user) {
      return { count: 0, capped: false };
    }

    // Count whispers not part of a conversation (standalone whispers)
    const whispers = await ctx.db
      .query('whispers')
      .withIndex('by_recipient_conversation', q => 
        q.eq('recipientId', user._id).eq('conversationId', undefined)
      )
      .take(100); // Cap at 100 for performance

    // Indicate if count was capped at 100
    return whispers.length === 100 
      ? { count: 100, capped: true } 
      : { count: whispers.length, capped: false };
  },
});

// Get whispers sent by current user (with pagination)
export const getSentWhispers = query({
  args: {
    paginationOpts: v.any(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', identity.subject))
      .first();

    if (!user) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    const result = await ctx.db
      .query('whispers')
      .withIndex('by_sender', q => q.eq('senderId', user._id))
      .order('desc')
      .paginate(args.paginationOpts);

    return result;
  },
});

// Mark whisper as read
export const markWhisperAsRead = mutation({
  args: {
    whisperId: v.id('whispers'),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    // Get the whisper to verify ownership
    const whisper = await ctx.db.get(args.whisperId);
    if (!whisper) {
      throw new Error('Whisper not found');
    }

    // Only recipient can mark as read
    if (whisper.recipientId !== user._id) {
      throw new Error('Not authorized to mark this whisper as read');
    }

    // Update the whisper
    await ctx.db.patch(args.whisperId, {
      isRead: true,
      readAt: Date.now(),
    });

    return args.whisperId;
  },
});

// Get unread whisper count for current user
export const getUnreadWhisperCount = query({
  args: {},
  handler: async ctx => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return 0;
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', identity.subject))
      .first();

    if (!user) {
      return 0;
    }

    // OPTIMIZATION: Use .take() with a reasonable limit instead of .collect()
    // This returns an approximate count for UI purposes without fetching all records
    const unreadWhispers = await ctx.db
      .query('whispers')
      .withIndex('by_recipient_conversation_isRead', q => 
        q.eq('recipientId', user._id).eq('conversationId', undefined).eq('isRead', false)
      )
      .take(100); // Cap at 100 for performance

    return unreadWhispers.length;
  },
});
// Get a specific whisper by ID (only accessible by recipient)
export const getWhisperById = query({
  args: {
    whisperId: v.id('whispers'),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const whisper = await ctx.db.get(args.whisperId);
    if (!whisper) {
      throw new Error('Whisper not found');
    }

    // Only recipient can view the whisper
    if (whisper.recipientId !== user._id) {
      throw new Error('Not authorized to view this whisper');
    }

    return whisper;
  },
});

// Reply to a whisper (Whisper Chains)
export const replyToWhisper = mutation({
  args: {
    parentWhisperId: v.id('whispers'),
    content: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    
    // Sanitize content
    const sanitizedContent = sanitizeText(args.content);

    // 1. Check Feature Flag
    const featureFlag = await ctx.db
      .query('featureFlags')
      .withIndex('by_name', q => q.eq('name', 'WHISPER_CHAINS'))
      .first();

    if (!featureFlag || !featureFlag.enabled) {
      throw new Error('Whisper Chains feature is currently disabled');
    }

    // 2. Get Parent Whisper
    const parentWhisper = await ctx.db.get(args.parentWhisperId);
    if (!parentWhisper) throw new Error('Parent whisper not found');

    // 3. Validate Ownership (Can only reply to own whispers in a chain context)
    // The requirement says "replying to their own whispers".
    if (parentWhisper.senderId !== user._id) {
      throw new Error('Can only reply to your own whispers to create a chain');
    }

    // 4. Determine Chain ID
    const chainId = parentWhisper.chainId || parentWhisper._id;

    // 5. Determine Chain Order
    // Find the last whisper in this chain to increment order
    const lastWhisperInChain = await ctx.db
      .query('whispers')
      .withIndex('by_chain', q => q.eq('chainId', chainId))
      .order('desc')
      .first();
    
    const chainOrder = lastWhisperInChain && lastWhisperInChain.chainOrder 
      ? lastWhisperInChain.chainOrder + 1 
      : 1; // 0 is the original whisper (if we backfill) or 1 is the first reply

    // 6. Create Reply Whisper
    const whisperId = await ctx.db.insert('whispers', {
      senderId: user._id,
      recipientId: parentWhisper.recipientId, // Chain continues to same recipient
      content: sanitizedContent.trim(),
      imageUrl: args.imageUrl,
      isRead: false,
      createdAt: Date.now(),
      parentWhisperId: args.parentWhisperId,
      chainId: chainId,
      chainOrder: chainOrder,
    });

    // 7. If parent didn't have chainId, update it (it's now the start of a chain)
    if (!parentWhisper.chainId) {
      await ctx.db.patch(parentWhisper._id, {
        chainId: parentWhisper._id,
        chainOrder: 0,
        isChainStart: true,
      });
    }

    return whisperId;
  },
});

// Get a full whisper chain
export const getWhisperChain = query({
  args: {
    whisperId: v.id('whispers'),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const targetWhisper = await ctx.db.get(args.whisperId);
    if (!targetWhisper) throw new Error('Whisper not found');

    // Determine Chain ID
    const chainId = targetWhisper.chainId || targetWhisper._id;

    // Fetch all whispers in the chain
    const chain = await ctx.db
      .query('whispers')
      .withIndex('by_chain', q => q.eq('chainId', chainId))
      .collect();

    // If chain is empty (single whisper case where chainId wasn't set yet), return just the whisper
    if (chain.length === 0) {
        return [targetWhisper];
    }

    // Sort by chain order
    return chain.sort((a, b) => (a.chainOrder || 0) - (b.chainOrder || 0));
  },
});

// ============================================================
// QUICK WINS FEATURES
// ============================================================

// === EMOJI REACTIONS ===

// Add or remove a reaction to a whisper
export const toggleReaction = mutation({
  args: {
    whisperId: v.id('whispers'),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const whisper = await ctx.db.get(args.whisperId);
    if (!whisper) {
      throw new Error('Whisper not found');
    }

    // User must be part of the whisper (sender or recipient)
    if (whisper.senderId !== user._id && whisper.recipientId !== user._id) {
      throw new Error('Not authorized to react to this whisper');
    }

    const reactions = whisper.reactions || [];
    const existingIndex = reactions.findIndex(
      r => r.userId === user._id && r.emoji === args.emoji
    );
    if (existingIndex >= 0) {
      // Remove reaction (toggle off)
      reactions.splice(existingIndex, 1);
    } else {
      // Add reaction
      reactions.push({
        userId: user._id,
        emoji: args.emoji,
        createdAt: Date.now(),
      });
    }

    await ctx.db.patch(args.whisperId, { reactions });

    return { success: true, added: existingIndex < 0 };
  },
});

// === VOICE WHISPERS ===

// Generate upload URL for voice message
export const generateVoiceUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);

    return await ctx.storage.generateUploadUrl();
  },
});

// Send a voice whisper
export const sendVoiceWhisper = mutation({
  args: {
    recipientUsername: v.string(),
    audioStorageId: v.id('_storage'),
    audioDuration: v.number(),
    isVoiceModulated: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const sender = await requireUser(ctx);

    // Enforce rate limit for voice whispers
    await enforceRateLimit(ctx, sender._id, 'SEND_WHISPER');
    await recordRateLimitedAction(ctx, sender._id, 'SEND_WHISPER');

    const recipient = await ctx.db
      .query('users')
      .withIndex('by_username', q => q.eq('username', args.recipientUsername))
      .first();

    if (!recipient) {
      throw new Error('Recipient not found');
    }

    if (sender._id === recipient._id) {
      throw new Error('Cannot send whisper to yourself');
    }

    const whisperId = await ctx.db.insert('whispers', {
      senderId: sender._id,
      recipientId: recipient._id,
      content: "🎤 Voice message", // Placeholder content
      audioStorageId: args.audioStorageId,
      audioDuration: args.audioDuration,
      isVoiceModulated: args.isVoiceModulated,
      isRead: false,
      createdAt: Date.now(),
    });

    return whisperId;
  },
});

// Get voice message URL
export const getVoiceMessageUrl = query({
  args: {
    storageId: v.id('_storage'),
    whisperId: v.id('whispers'),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const whisper = await ctx.db.get(args.whisperId);
    if (!whisper || whisper.audioStorageId !== args.storageId) {
      throw new Error('Voice message not found');
    }

    if (whisper.senderId !== user._id && whisper.recipientId !== user._id) {
      throw new Error('Not authorized to access this voice message');
    }

    return await ctx.storage.getUrl(args.storageId);
  },
});

// === MESSAGE SCHEDULING ===

// Schedule a whisper for future delivery
export const scheduleWhisper = mutation({
  args: {
    recipientUsername: v.string(),
    content: v.string(),
    scheduledFor: v.number(), // Timestamp
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Sanitize content
    const sanitizedContent = sanitizeText(args.content);

    if (sanitizedContent.length > 280) {
      throw new Error('Whisper content must be 280 characters or less');
    }

    const now = Date.now();
    if (args.scheduledFor <= now) {
      throw new Error('Scheduled time must be in the future');
    }

    const maxScheduleTime = now + (VALIDATION.WHISPER_MAX_SCHEDULE_DAYS * 24 * 60 * 60 * 1000);
    if (args.scheduledFor > maxScheduleTime) {
      throw new Error(`Scheduled time cannot be more than ${VALIDATION.WHISPER_MAX_SCHEDULE_DAYS} days in the future`);
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const sender = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', identity.subject))
      .first();

    if (!sender) {
      throw new Error('Sender not found');
    }

    await enforceRateLimit(ctx, sender._id, 'SCHEDULE_WHISPER');

    const recipient = await ctx.db
      .query('users')
      .withIndex('by_username', q => q.eq('username', args.recipientUsername))
      .first();

    if (!recipient) {
      throw new Error('Recipient not found');
    }

    if (sender._id === recipient._id) {
      throw new Error('Cannot send whisper to yourself');
    }

    const whisperId = await ctx.db.insert('whispers', {
      senderId: sender._id,
      recipientId: recipient._id,
      content: sanitizedContent.trim(),
      imageUrl: args.imageUrl,
      isRead: false,
      createdAt: now,
      scheduledFor: args.scheduledFor,
      isScheduled: true,
    });

    await recordRateLimitedAction(ctx, sender._id, 'SCHEDULE_WHISPER');

    return whisperId;
  },
});

// Get scheduled whispers for the current user
export const getScheduledWhispers = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', identity.subject))
      .first();

    if (!user) {
      return [];
    }

    return await ctx.db
      .query('whispers')
      .withIndex('by_sender_scheduled', q => 
        q.eq('senderId', user._id).eq('isScheduled', true).gt('scheduledFor', Date.now())
      )
      .order('asc')
      .collect();
  },
});

// Process scheduled whispers (Internal CRON job)
export const processScheduledWhispers = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const dueWhispers = await ctx.db
      .query('whispers')
      .withIndex('by_scheduled', q => 
        q.eq('isScheduled', true).lte('scheduledFor', now)
      )
      .collect();

    for (const whisper of dueWhispers) {
      await ctx.db.patch(whisper._id, {
        isScheduled: false,
        scheduledFor: undefined,
      });
    }

    return { processed: dueWhispers.length };
  },
});

// Cancel a scheduled whisper
export const cancelScheduledWhisper = mutation({
  args: {
    whisperId: v.id('whispers'),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const whisper = await ctx.db.get(args.whisperId);
    if (!whisper) {
      throw new Error('Whisper not found');
    }

    if (whisper.senderId !== user._id) {
      throw new Error('Not authorized to cancel this whisper');
    }

    if (!whisper.isScheduled) {
      throw new Error('This whisper is not scheduled');
    }

    await ctx.db.delete(args.whisperId);

    return { success: true };
  },
});

// === ARCHIVING ===

// Archive a whisper
export const archiveWhisper = mutation({
  args: {
    whisperId: v.id('whispers'),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const whisper = await ctx.db.get(args.whisperId);
    if (!whisper) {
      throw new Error('Whisper not found');
    }

    if (whisper.recipientId !== user._id && whisper.senderId !== user._id) {
      throw new Error('Not authorized to archive this whisper');
    }

    await ctx.db.patch(args.whisperId, { isArchived: true });

    return { success: true };
  },
});

// Unarchive a whisper
export const unarchiveWhisper = mutation({
  args: {
    whisperId: v.id('whispers'),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const whisper = await ctx.db.get(args.whisperId);
    if (!whisper) {
      throw new Error('Whisper not found');
    }

    if (whisper.recipientId !== user._id && whisper.senderId !== user._id) {
      throw new Error('Not authorized to unarchive this whisper');
    }

    await ctx.db.patch(args.whisperId, { isArchived: false });

    return { success: true };
  },
});

// Get archived whispers
export const getArchivedWhispers = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', identity.subject))
      .first();

    if (!user) {
      return [];
    }

    // OPTIMIZATION: Add .take() limits to prevent unbounded fetches
    const [received, sent] = await Promise.all([
      ctx.db
        .query('whispers')
        .withIndex('by_recipient_archived', q => 
          q.eq('recipientId', user._id).eq('isArchived', true)
        )
        .take(50),
      ctx.db
        .query('whispers')
        .withIndex('by_sender_archived', q => 
          q.eq('senderId', user._id).eq('isArchived', true)
        )
        .take(50),
    ]);

    return [...received, ...sent].sort((a, b) => b.createdAt - a.createdAt);
  },
});

// === TYPING INDICATORS ===

// Set typing status for a conversation between two users
export const setTypingStatus = mutation({
  args: {
    otherUserId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return;
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', identity.subject))
      .first();

    if (!user) {
      return;
    }

    // Get or create conversation
    const participantKey = [user._id, args.otherUserId].sort().join('-');
    const conversation = await ctx.db
      .query('conversations')
      .withIndex('by_participant_key', q => q.eq('participantKey', participantKey))
      .first();

    if (!conversation) {
      // No conversation yet, don't create typing indicator
      return;
    }

    // Check for existing indicator
    const existing = await ctx.db
      .query('typingIndicators')
      .withIndex('by_conversation_user', q => 
        q.eq('conversationId', conversation._id).eq('userId', user._id)
      )
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, { lastTypingAt: now });
    } else {
      await ctx.db.insert('typingIndicators', {
        conversationId: conversation._id,
        userId: user._id,
        lastTypingAt: now,
      });
    }
  },
});

// Get typing status for a conversation
export const getTypingStatus = query({
  args: {
    conversationId: v.id('conversations'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { isTyping: false };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', identity.subject))
      .first();

    if (!user) {
      return { isTyping: false };
    }

    // Get typing indicators from last 5 seconds, excluding current user
    const fiveSecondsAgo = Date.now() - 5000;

    const typing = await ctx.db
      .query('typingIndicators')
      .withIndex('by_conversation', q => q.eq('conversationId', args.conversationId))
      .filter(q => 
        q.and(
          q.gt(q.field('lastTypingAt'), fiveSecondsAgo),
          q.neq(q.field('userId'), user._id)
        )
      )
      .first();

    return { isTyping: !!typing };
  },
});

