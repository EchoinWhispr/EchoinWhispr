import { requireUser } from './auth';
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { internal } from './_generated/api';
import { Doc, Id } from './_generated/dataModel';
import { enforceRateLimit, recordRateLimitedAction } from './rateLimits';

/**
 * Safe user projection type to prevent data leakage.
 * Only includes non-sensitive fields required for friend operations.
 */
type SafeUser = {
  _id: Id<'users'>;
  username: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
};

/**
 * Send a friend request to another user.
 * Validates that the user is not sending a request to themselves,
 * that no existing friendship exists, and that no pending request exists.
 * Rate limited to 30 requests per day.
 */
export const sendFriendRequest = mutation({
  args: {
    friendId: v.id('users'),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Unauthorized: User must be authenticated');
    }

    // Get the user
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', identity.subject))
      .first();

    if (!user) {
      throw new Error('User not found');
    }

    // Enforce rate limit (30 requests per day)
    await enforceRateLimit(ctx, user._id, 'SEND_FRIEND_REQUEST');

    // Check if friend exists
    const friend = await ctx.db.get(args.friendId);
    if (!friend) {
      throw new Error('Friend not found');
    }

    // Prevent self-friending
    if (user._id === args.friendId) {
      throw new Error('Cannot send friend request to yourself');
    }

    // Check if friendship already exists
    const existingFriendship = await ctx.db
      .query('friends')
      .withIndex('by_user_friend', q =>
        q.eq('userId', user._id).eq('friendId', args.friendId)
      )
      .first();

    if (existingFriendship) {
      throw new Error('Friendship already exists or request pending');
    }

    // Check reverse relationship
    const reverseFriendship = await ctx.db
      .query('friends')
      .withIndex('by_user_friend', q =>
        q.eq('userId', args.friendId).eq('friendId', user._id)
      )
      .first();

    if (reverseFriendship) {
      throw new Error('Friendship already exists or request pending');
    }

    // Create friend request
    await ctx.db.insert('friends', {
      userId: user._id,
      friendId: args.friendId,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...(args.message && { message: args.message }),
    });

    // Record rate limit action
    await recordRateLimitedAction(ctx, user._id, 'SEND_FRIEND_REQUEST');

    // Create notification for recipient
    await ctx.scheduler.runAfter(0, internal.notifications.createNotificationInternal, {
      userId: args.friendId,
      type: 'friend_request',
      title: 'New Friend Request',
      message: `${user.username} wants to be your friend${args.message ? `: "${args.message}"` : ''}`,
      actionUrl: '/friends?tab=requests',
      metadata: { senderId: user._id, senderUsername: user.username },
    });
  },
});

/**
 * Accept an incoming friend request.
 * Only the recipient can accept their own requests.
 */
export const acceptFriendRequest = mutation({
  args: {
    requestId: v.id('friends'),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    // Get the conversation
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error('Friend request not found');
    }

    // Only the recipient can accept
    if (request.friendId !== user._id) {
      throw new Error(
        'Unauthorized: Only the recipient can accept friend requests'
      );
    }

    // Must be pending
    if (request.status !== 'pending') {
      throw new Error('Friend request is not pending');
    }

    // Update to accepted
    await ctx.db.patch(args.requestId, {
      status: 'accepted',
      updatedAt: Date.now(),
    });

    // Create notification for the requester
    await ctx.scheduler.runAfter(0, internal.notifications.createNotificationInternal, {
      userId: request.userId,
      type: 'friend_accepted',
      title: 'Friend Request Accepted',
      message: `${user.username} accepted your friend request!`,
      actionUrl: '/friends',
      metadata: { accepterId: user._id, accepterUsername: user.username },
    });
  },
});

/**
 * Reject an incoming friend request.
 * Only the recipient can reject their own requests.
 */
export const rejectFriendRequest = mutation({
  args: {
    requestId: v.id('friends'),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    // Get the conversation
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error('Friend request not found');
    }

    // Only the recipient can reject
    if (request.friendId !== user._id) {
      throw new Error(
        'Unauthorized: Only the recipient can reject friend requests'
      );
    }

    // Must be pending
    if (request.status !== 'pending') {
      throw new Error('Friend request is not pending');
    }

    // Delete the request
    await ctx.db.delete(args.requestId);
  },
});

/**
 * Remove a friend or cancel a sent request.
 * Users can remove friends or cancel their own sent requests.
 */
export const removeFriend = mutation({
  args: {
    friendshipId: v.id('friends'),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const friendship = await ctx.db.get(args.friendshipId);
    if (!friendship) throw new Error('Friendship not found');

    // Ensure user is part of the friendship
    if (friendship.userId !== user._id && friendship.friendId !== user._id) {
      throw new Error('Unauthorized to modify this friendship');
    }

    // Delete the friendship
    await ctx.db.delete(args.friendshipId);
  },
});

/**
 * Get the user's friends list (accepted friendships).
 * Returns both directions of friendships with pagination.
 */
export const getFriendsList = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { friends: [], totalCount: 0, hasMore: false };
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', identity.subject))
      .first();

    if (!user) {
      return { friends: [], totalCount: 0, hasMore: false };
    }

    const limit = Math.min(args.limit || 20, 50);
    const offset = args.offset || 0;

    // Get friendships where user is the sender and status is accepted (OPTIMIZATION: add limit)
    const sentFriends = await ctx.db
      .query('friends')
      .withIndex('by_user_status', q =>
        q.eq('userId', user._id).eq('status', 'accepted')
      )
      .take(200);

    // Get friendships where user is the recipient and status is accepted (OPTIMIZATION: add limit)
    const receivedFriends = await ctx.db
      .query('friends')
      .withIndex('by_friend_status', q =>
        q.eq('friendId', user._id).eq('status', 'accepted')
      )
      .take(200);

    // Combine and get user details
    const allFriendships = [...sentFriends, ...receivedFriends];
    const totalCount = allFriendships.length;
    
    // Apply pagination
    const paginatedFriendships = allFriendships.slice(offset, offset + limit);

    // OPTIMIZATION: Batch fetch all friend user IDs upfront to avoid N+1 queries
    const friendIds = paginatedFriendships.map(friendship =>
      friendship.userId === user._id ? friendship.friendId : friendship.userId
    );

    // Batch fetch all users in parallel (single Promise.all, not sequential)
    const friendUsers = await Promise.all(friendIds.map(id => ctx.db.get(id)));

    // Create a lookup map for users
    const userMap = new Map(
      friendUsers.filter(Boolean).map(u => [u!._id, u!])
    );

    // Batch fetch all profiles for these users
    const profiles = await Promise.all(
      friendIds.map(id =>
        ctx.db.query('profiles').withIndex('by_user_id', q => q.eq('userId', id)).first()
      )
    );

    // Create a lookup map for profiles
    const profileMap = new Map(
      profiles.map((p, i) => [friendIds[i], p])
    );

    // Build response without additional DB calls
    const friends = paginatedFriendships.map((friendship, index) => {
      const friendId = friendIds[index];
      const friendUser = userMap.get(friendId);
      if (!friendUser) return null;

      const profile = profileMap.get(friendId);
      const safeUser: SafeUser = {
        _id: friendUser._id,
        username: friendUser.username,
        firstName: friendUser.firstName,
        lastName: friendUser.lastName,
        avatarUrl: profile?.avatarUrl,
      };
      return {
        ...safeUser,
        friendshipId: friendship._id,
      };
    });

    const validFriends = friends.filter((f): f is NonNullable<typeof f> => f !== null);

    return {
      friends: validFriends,
      totalCount,
      hasMore: offset + limit < totalCount,
    };
  },
});

/**
 * Get pending friend requests sent to the user.
 */
export const getPendingRequests = query({
  handler: async ctx => {
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

    // Get pending friend requests where user is the recipient (with limit for safety)
    const requests = await ctx.db
      .query('friends')
      .withIndex('by_friend_status', q =>
        q.eq('friendId', user._id).eq('status', 'pending')
      )
      .take(100); // OPTIMIZATION: Limit to prevent unbounded fetch

    if (requests.length === 0) return [];

    // OPTIMIZATION: Batch fetch all sender IDs upfront
    const senderIds = requests.map(r => r.userId);

    // Batch fetch all senders in parallel
    const senders = await Promise.all(senderIds.map(id => ctx.db.get(id)));
    const senderMap = new Map(
      senders.filter(Boolean).map(s => [s!._id, s!])
    );

    // Batch fetch all profiles
    const profiles = await Promise.all(
      senderIds.map(id =>
        ctx.db.query('profiles').withIndex('by_user_id', q => q.eq('userId', id)).first()
      )
    );
    const profileMap = new Map(profiles.map((p, i) => [senderIds[i], p]));

    // Build response without additional DB calls
    const requestsWithSenders = requests.map(request => {
      const sender = senderMap.get(request.userId);
      if (!sender) return null;

      const profile = profileMap.get(request.userId);
      const safeSender: SafeUser = {
        _id: sender._id,
        username: sender.username,
        firstName: sender.firstName,
        lastName: sender.lastName,
        avatarUrl: profile?.avatarUrl,
      };
      return {
        ...request,
        sender: safeSender,
        friendshipId: request._id,
      };
    });

    return requestsWithSenders.filter(
      (r): r is NonNullable<typeof r> => r !== null
    );
  },
});

/**
 * Get friend requests sent by the user that are still pending.
 */
export const getSentRequests = query({
  handler: async ctx => {
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

    // Get pending friend requests where user is the sender (with limit for safety)
    const requests = await ctx.db
      .query('friends')
      .withIndex('by_user_status', q =>
        q.eq('userId', user._id).eq('status', 'pending')
      )
      .take(100); // OPTIMIZATION: Limit to prevent unbounded fetch

    if (requests.length === 0) return [];

    // OPTIMIZATION: Batch fetch all recipient IDs upfront
    const recipientIds = requests.map(r => r.friendId);

    // Batch fetch all recipients in parallel
    const recipients = await Promise.all(recipientIds.map(id => ctx.db.get(id)));
    const recipientMap = new Map(
      recipients.filter(Boolean).map(r => [r!._id, r!])
    );

    // Batch fetch all profiles
    const profiles = await Promise.all(
      recipientIds.map(id =>
        ctx.db.query('profiles').withIndex('by_user_id', q => q.eq('userId', id)).first()
      )
    );
    const profileMap = new Map(profiles.map((p, i) => [recipientIds[i], p]));

    // Build response without additional DB calls
    const requestsWithRecipients = requests.map(request => {
      const recipient = recipientMap.get(request.friendId);
      if (!recipient) return null;

      const profile = profileMap.get(request.friendId);
      const safeRecipient: SafeUser = {
        _id: recipient._id,
        username: recipient.username,
        firstName: recipient.firstName,
        lastName: recipient.lastName,
        avatarUrl: profile?.avatarUrl,
      };
      return {
        ...request,
        recipient: safeRecipient,
        friendshipId: request._id,
      };
    });

    return requestsWithRecipients.filter(
      (r): r is NonNullable<typeof r> => r !== null
    );
  },
});
