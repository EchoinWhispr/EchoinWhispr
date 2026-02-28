import { requireUser } from './auth';
'use strict';

import { v } from 'convex/values';
import { mutation, query, internalMutation } from './_generated/server';

// ============================================================
// IN-APP NOTIFICATIONS
// ============================================================

// Get user's notifications with pagination
export const getNotifications = query({
  args: {
    limit: v.optional(v.number()),
    unreadOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { notifications: [], unreadCount: 0 };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();

    if (!user) {
      return { notifications: [], unreadCount: 0 };
    }

    // Clamp limit to reasonable range (1-100) to prevent arbitrarily large requests
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 100);

    // Get notifications - use index-based filter when unreadOnly is true
    let notifications;
    if (args.unreadOnly) {
      notifications = await ctx.db
        .query('notifications')
        .withIndex('by_user_read', (q) => q.eq('userId', user._id).eq('read', false))
        .order('desc')
        .take(limit);
    } else {
      notifications = await ctx.db
        .query('notifications')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .order('desc')
        .take(limit);
    }

    // Get unread count using index-based query (efficient)
    const unreadNotifications = await ctx.db
      .query('notifications')
      .withIndex('by_user_read', (q) => q.eq('userId', user._id).eq('read', false))
      .collect();

    const unreadCount = unreadNotifications.length;

    return {
      notifications,
      unreadCount,
    };
  },
});

// Get unread notification count
export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return 0;
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();

    if (!user) {
      return 0;
    }

    const notifications = await ctx.db
      .query('notifications')
      .withIndex('by_user_read', (q) => q.eq('userId', user._id).eq('read', false))
      .collect();

    return notifications.length;
  },
});

// Mark notification as read
export const markAsRead = mutation({
  args: {
    notificationId: v.id('notifications'),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== user._id) {
      throw new Error('Notification not found');
    }

    await ctx.db.patch(args.notificationId, { read: true });

    return { success: true };
  },
});

// Mark all notifications as read
export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    // Cap at 500 to prevent unbounded operations - user should retry if count equals cap
    const unreadNotifications = await ctx.db
      .query('notifications')
      .withIndex('by_user_read', (q) => q.eq('userId', user._id).eq('read', false))
      .take(500);

    await Promise.all(
      unreadNotifications.map((notification) =>
        ctx.db.patch(notification._id, { read: true })
      )
    );

    return { success: true, count: unreadNotifications.length, partial: unreadNotifications.length === 500 };
  },
});

// Delete a notification
export const deleteNotification = mutation({
  args: {
    notificationId: v.id('notifications'),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== user._id) {
      throw new Error('Notification not found');
    }

    await ctx.db.delete(args.notificationId);

    return { success: true };
  },
});

// Clear all notifications
export const clearAllNotifications = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    // Cap at 500 to prevent unbounded operations - user should retry if count equals cap
    const notifications = await ctx.db
      .query('notifications')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .take(500);

    await Promise.all(
      notifications.map((notification) => ctx.db.delete(notification._id))
    );

    return { success: true, count: notifications.length, partial: notifications.length === 500 };
  },
});

// Internal: Create a notification (server-side only for security)
// Accepts 'friend_accepted' type and converts it to 'friend_request' for storage
export const createNotification = internalMutation({
  args: {
    userId: v.id('users'),
    type: v.union(
      v.literal('whisper'),
      v.literal('friend_request'),
      v.literal('friend_accepted'),
      v.literal('chamber'),
      v.literal('resonance'),
      v.literal('system')
    ),
    title: v.string(),
    message: v.string(),
    actionUrl: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const notificationId = await ctx.db.insert('notifications', {
      userId: args.userId,
      // Map friend_accepted to friend_request for storage compatibility
      type: args.type === 'friend_accepted' ? 'friend_request' : args.type,
      title: args.title,
      message: args.message,
      read: false,
      actionUrl: args.actionUrl,
      metadata: args.metadata,
      createdAt: Date.now(),
    });

    return notificationId;
  },
});

// Alias for backward compatibility - points to consolidated createNotification
export const createNotificationInternal = createNotification;

// Internal mutation: Create or update aggregated chamber notification
export const createOrUpdateChamberNotification = internalMutation({
  args: {
    userId: v.id('users'),
    chamberId: v.id('echoChambers'),
    chamberName: v.string(),
    senderAlias: v.string(),
    messagePreview: v.string(),
    hasImage: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Find existing unread chamber notification for this chamber
    // Query already filters by chamberId in metadata, no need for redundant .find()
    const existingNotifications = await ctx.db
      .query('notifications')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .filter((q) => 
        q.and(
          q.eq(q.field('type'), 'chamber'),
          q.eq(q.field('read'), false),
          q.eq(q.field('metadata.chamberId'), args.chamberId)
        )
      )
      .collect();

    // Use the collected array directly - no redundant find() needed
    const existingNotification = existingNotifications.length > 0 ? existingNotifications[0] : null;

    if (existingNotification) {
      // Update existing notification
      const currentCount = (existingNotification.metadata?.messageCount || 1) + 1;
      await ctx.db.patch(existingNotification._id, {
        title: args.chamberName,
        message: `${args.senderAlias}: ${args.messagePreview}`,
        metadata: {
          ...existingNotification.metadata,
          messageCount: currentCount,
          latestSenderAlias: args.senderAlias,
          hasImage: args.hasImage || existingNotification.metadata?.hasImage,
          updatedAt: Date.now(), // Track last update time in metadata to preserve createdAt
        },
      });
      return existingNotification._id;
    } else {
      // Create new notification
      const notificationId = await ctx.db.insert('notifications', {
        userId: args.userId,
        type: 'chamber',
        title: args.chamberName,
        message: `${args.senderAlias}: ${args.messagePreview}`,
        read: false,
        actionUrl: `/chambers/${args.chamberId}`,
        metadata: {
          chamberId: args.chamberId,
          messageCount: 1,
          latestSenderAlias: args.senderAlias,
          hasImage: args.hasImage,
        },
        createdAt: Date.now(),
      });
      return notificationId;
    }
  },
});
