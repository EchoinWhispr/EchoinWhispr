import { v } from 'convex/values';
import { mutation, query, internalQuery, internalMutation } from './_generated/server';
import { Doc, Id } from './_generated/dataModel';
import { isAdmin, isSuperAdmin } from './adminAuth';
import { requireUser } from './auth';

// Get current user or create if doesn't exist
export const getCurrentUser = query({
  args: {},
  handler: async ctx => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', identity.subject))
      .first();

    return user;
  },
});

// Create or update user from Clerk webhook
export const createOrUpdateUser = internalMutation({
  args: {
    clerkId: v.string(),
    username: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    // SSD Fields
    career: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    mood: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', args.clerkId))
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing user
      await ctx.db.patch(existing._id, {
        username: args.username,
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        // Update SSD fields if provided
        ...(args.career !== undefined ? { career: args.career } : {}),
        ...(args.interests !== undefined ? { interests: args.interests } : {}),
        ...(args.mood !== undefined ? { mood: args.mood } : {}),
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new user
      // Default displayName to username initially
      return await ctx.db.insert('users', {
        clerkId: args.clerkId,
        username: args.username,
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        displayName: args.username, 
        // Initialize SSD fields
        career: args.career,
        interests: args.interests,
        mood: args.mood,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

type PublicUserProfile = {
  _id: Id<'users'>;
  username: string | undefined;
  displayName: string | undefined;
  firstName: string | undefined;
  lastName: string | undefined;
  career: string | undefined;
  interests: string[] | undefined;
  mood: string | undefined;
  isDeleted: boolean | undefined;
};

const toPublicUserProfile = (user: Doc<'users'>): PublicUserProfile => ({
  _id: user._id,
  username: user.username,
  displayName: user.displayName,
  firstName: user.firstName,
  lastName: user.lastName,
  career: user.career,
  interests: user.interests,
  mood: user.mood,
  isDeleted: user.isDeleted,
});

export const getUserByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args): Promise<PublicUserProfile | null> => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_username', q => q.eq('username', args.username))
      .first();

    if (!user) return null;

    return toPublicUserProfile(user);
  },
});

export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args): Promise<PublicUserProfile | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', args.clerkId))
      .first();

    if (!user) return null;

    return toPublicUserProfile(user);
  },
});

export const getByClerkId = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', args.clerkId))
      .first();

    return user;
  },
});

// Search users by username or email with pagination and security
export const searchUsers = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    excludeUserId: v.optional(v.id('users')),
  },
  handler: async (ctx, args) => {
    // Ensure the caller is authenticated
    await requireUser(ctx);

    // Validate input parameters
    const searchQuery = args.query.trim();
    if (searchQuery.length < 2) {
      throw new Error('Search query must be at least 2 characters long');
    }

    const limit = Math.min(args.limit || 20, 50); // Max 50 results
    const offset = args.offset || 0;
    const fetchSize = limit + offset + 1;

    // Use database indexes for efficient searching
    // Search by username (case-insensitive)
    const usernameResults = await ctx.db
      .query('users')
      .withIndex('by_username', q =>
        q
          .gte('username', searchQuery.toLowerCase())
          .lte('username', searchQuery.toLowerCase() + '\uffff')
      )
      .take(fetchSize);

    // Search by email (case-insensitive) if no username results or need more results
    let emailResults: Doc<'users'>[] = [];
    if (usernameResults.length < fetchSize) {
      emailResults = await ctx.db
      .query('users')
        .withIndex('by_email', q =>
          q
            .gte('email', searchQuery.toLowerCase())
            .lte('email', searchQuery.toLowerCase() + '\uffff')
        )
        .take(fetchSize);
    }

    // Search by career (case-insensitive) if still need results
    let careerResults: Doc<'users'>[] = [];
    if (usernameResults.length + emailResults.length < fetchSize) {
      careerResults = await ctx.db
        .query('users')
        .withIndex('by_career', q =>
          q
            .gte('career', searchQuery) // Note: This is case-sensitive unless we normalize data. For now assuming exact or prefix match.
            .lte('career', searchQuery + '\uffff')
        )
        .take(fetchSize);
    }

    // TODO: Implement full-text search for interests if needed. For now, simple prefix match on career.

    // Combine and deduplicate results
    const allResults = [...usernameResults, ...emailResults, ...careerResults];
    const uniqueResults = allResults.filter(
      (user, index, self) => index === self.findIndex(u => u._id === user._id)
    );

    // Filter out excluded user if provided
    const filteredResults = args.excludeUserId
      ? uniqueResults.filter(user => user._id !== args.excludeUserId)
      : uniqueResults;

    // Apply pagination
    const paginatedResults = filteredResults.slice(offset, offset + limit);

    // Return results with metadata
    return {
      results: paginatedResults,
      totalCount: filteredResults.length,
      hasMore: filteredResults.length > offset + limit,
    };
  },
});

// Update user profile
export const updateUserProfile = mutation({
  args: {
    bio: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    displayName: v.optional(v.string()),
    // SSD Fields
    career: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    mood: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    // Update user table for displayName and SSD fields
    const userUpdates: any = { updatedAt: Date.now() };
    if (args.displayName !== undefined) userUpdates.displayName = args.displayName;
    if (args.career !== undefined) userUpdates.career = args.career;
    if (args.interests !== undefined) userUpdates.interests = args.interests;
    if (args.mood !== undefined) userUpdates.mood = args.mood;

    await ctx.db.patch(user._id, userUpdates);

    // Update profiles table for other fields (assuming profiles table exists and is linked)
    // Note: The original code seemed to mix user and profile table updates. 
    // Ideally, we should check if a profile exists and update/create it.
    // For now, we'll assume the profile logic is handled elsewhere or we just update the user if these fields were on user.
    // BUT, looking at schema.ts, 'profiles' is a separate table.
    
    const profile = await ctx.db
        .query('profiles')
        .withIndex('by_user_id', q => q.eq('userId', user._id))
        .first();

    if (profile) {
        await ctx.db.patch(profile._id, {
            bio: args.bio,
            avatarUrl: args.avatarUrl,
            isPublic: args.isPublic,
            updatedAt: Date.now(),
        });
    } else {
        // Create profile if it doesn't exist
        await ctx.db.insert('profiles', {
            userId: user._id,
            bio: args.bio,
            avatarUrl: args.avatarUrl,
            isPublic: args.isPublic ?? false, // Default to private if not specified
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
    }

    return user._id;
  },
});

// Get current user or create if doesn't exist
export const getOrCreateCurrentUser = mutation({
  args: {},
  handler: async (ctx): Promise<Doc<'users'> | null> => {
    try {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        throw new Error('Not authenticated');
      }

      // Validate required Clerk identity fields
      if (!identity.subject || !identity.email) {
        throw new Error('Invalid identity: missing required fields');
      }

      // Check if user already exists
      const existingUser = await ctx.db
        .query('users')
        .withIndex('by_clerk_id', q => q.eq('clerkId', identity.subject))
        .first();

      if (existingUser) {
          return existingUser;
      }

      // User doesn't exist - create immediately with Clerk-assigned username
      const username =
        identity.nickname ||
        identity.givenName ||
        `user_${identity.subject.slice(0, 8)}`;



      const newUserId = await ctx.db.insert('users', {
        clerkId: identity.subject,
        username: username,
        email: identity.email,
        firstName: identity.givenName,
        lastName: identity.familyName,
        displayName: username, // Default display name
        createdAt: Date.now(),
        updatedAt: Date.now(),
        needsUsernameSelection: true,
      });

      // Return the newly created user
      const newUser = await ctx.db.get(newUserId);
      return newUser;
    } catch (error) {
      console.error('Error in getOrCreateCurrentUser:', error);
      throw error;
    }
  },
});

const RESERVED_USERNAMES = new Set([
  'admin', 'administrator', 'moderator', 'mod', 'system', 'support',
  'help', 'info', 'contact', 'about', 'privacy', 'terms', 'legal',
  'api', 'app', 'web', 'mobile', 'blog', 'news', 'press', 'careers',
  'jobs', 'pricing', 'features', 'docs', 'documentation', 'status',
  'security', 'settings', 'config', 'test', 'testing', 'demo',
  'example', 'sample', 'user', 'users', 'profile', 'profiles',
  'account', 'accounts', 'login', 'logout', 'signin', 'signup',
  'register', 'auth', 'authenticate', 'verify', 'confirmation',
  'reset', 'password', 'forgot', 'recover', 'delete', 'remove',
  'ban', 'banned', 'suspended', 'deleted', 'inactive', 'disabled',
  'owner', 'founder', 'ceo', 'staff', 'team', 'official', 'verified',
  'echoinwhispr', 'echo', 'whisper', 'whispers', 'echoes',
  'null', 'undefined', 'none', 'anonymous', 'guest', 'bot', 'service',
  'everyone', 'all', 'public', 'private', 'hidden', 'default',
]);

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 20;

export const updateUsername = mutation({
  args: {
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const normalizedUsername = args.username.trim().toLowerCase();

    const usernameRegex = /^[a-z0-9_]{3,20}$/;
    if (!usernameRegex.test(normalizedUsername)) {
      throw new Error(
        'Username must be 3-20 characters long and contain only lowercase letters, numbers, and underscores'
      );
    }

    if (RESERVED_USERNAMES.has(normalizedUsername)) {
      throw new Error('This username is reserved and cannot be used');
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', identity.subject))
      .first();

    if (!user) {
      throw new Error('User not found');
    }

    if (user.username === normalizedUsername) {
      return user._id;
    }

    const previousUsername = user.username;
    const previousDisplayName = user.displayName;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const allUsersWithUsername = await ctx.db
        .query('users')
        .withIndex('by_username', q => q.eq('username', normalizedUsername))
        .collect();

      const conflictingUser = allUsersWithUsername.find(u => u._id !== user._id);

      if (conflictingUser) {
        throw new Error('Username is already taken');
      }

      await ctx.db.patch(user._id, {
        username: normalizedUsername,
        ...(user.displayName === user.username ? { displayName: normalizedUsername } : {}),
        needsUsernameSelection: false,
        updatedAt: Date.now(),
      });

      const verifyUsers = await ctx.db
        .query('users')
        .withIndex('by_username', q => q.eq('username', normalizedUsername))
        .collect();

      const thisUser = verifyUsers.find(u => u._id === user._id);
      const otherUsers = verifyUsers.filter(u => u._id !== user._id);

      if (!thisUser) {
        throw new Error('Failed to update username. Please try again.');
      }

      if (otherUsers.length > 0) {
        await ctx.db.patch(user._id, {
          username: previousUsername,
          ...(user.displayName === normalizedUsername ? { displayName: previousDisplayName } : {}),
          updatedAt: Date.now(),
        });

        if (attempt < MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
          continue;
        }
        throw new Error('Username is already taken');
      }

      return user._id;
    }

    throw new Error('Failed to update username due to a conflict. Please try again.');
  },
});

// Check if username is available for registration or username change request
export const checkUsernameAvailability = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const usernameRegex = /^[a-z0-9_]{3,20}$/;
    if (!usernameRegex.test(args.username)) {
      return false;
    }

    // Check if username already exists in users table
    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_username', q => q.eq('username', args.username))
      .first();
    if (existingUser) return false;

    // Soft-reserve: check if there's a pending username change request for this name
    const pendingRequest = await ctx.db
      .query('usernameChangeRequests')
      .withIndex('by_requested_username_status', q => 
        q.eq('requestedUsername', args.username).eq('status', 'pending')
      )
      .first();
    if (pendingRequest) return false;

    return true;
  },
});

// Get current user's username selection status
export const getUserNeedsUsernameSelection = query({
  args: {},
  handler: async ctx => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', identity.subject))
      .first();

    if (!user) {
      return null;
    }

    return user.needsUsernameSelection ?? false;
  },
});

// Register push notification token
export const registerPushToken = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    await ctx.db.patch(user._id, {
      pushNotificationToken: args.token,
      updatedAt: Date.now(),
    });

    return user._id;
  },
});

// Find a user with matching mood
export const findMoodMatch = query({
  args: { mood: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const currentUser = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', identity.subject))
      .first();

    if (!currentUser) return null;

    const targetMood = args.mood || currentUser.mood;
    if (!targetMood) return null;

    // Find up to 10 users with the same mood
    const matches = await ctx.db
      .query('users')
      .withIndex('by_mood', q => q.eq('mood', targetMood))
      .take(10);

    // Filter out current user
    const validMatches = matches.filter(u => u._id !== currentUser._id);

    if (validMatches.length === 0) return null;

    // Pick a random one
    const randomIndex = Math.floor(Math.random() * validMatches.length);
    return validMatches[randomIndex];
  },
});

// ============================================================
// USER PREFERENCES (QUICK WINS)
// ============================================================

// Update user preferences
export const updatePreferences = mutation({
  args: {
    readReceiptsEnabled: v.optional(v.boolean()),
    themePreference: v.optional(v.union(v.literal('light'), v.literal('dark'), v.literal('system'))),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const updates: any = { updatedAt: Date.now() };
    if (args.readReceiptsEnabled !== undefined) {
      updates.readReceiptsEnabled = args.readReceiptsEnabled;
    }
    if (args.themePreference !== undefined) {
      updates.themePreference = args.themePreference;
    }

    await ctx.db.patch(user._id, updates);

    return { success: true };
  },
});

// Get user preferences
export const getPreferences = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', identity.subject))
      .first();

    if (!user) {
      return null;
    }

    return {
      readReceiptsEnabled: user.readReceiptsEnabled ?? true, // Default to enabled
      themePreference: user.themePreference || 'system',
      pinnedConversationIds: user.pinnedConversationIds || [],
    };
  },
});

// Pin a conversation
export const pinConversation = mutation({
  args: {
    conversationId: v.id('conversations'),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const currentPinned = user.pinnedConversationIds || [];
    
    if (!currentPinned.includes(args.conversationId)) {
      await ctx.db.patch(user._id, {
        pinnedConversationIds: [...currentPinned, args.conversationId],
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// Unpin a conversation
export const unpinConversation = mutation({
  args: {
    conversationId: v.id('conversations'),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const pinnedIds = (user.pinnedConversationIds || []).filter(
      id => id !== args.conversationId
    );

    await ctx.db.patch(user._id, {
      pinnedConversationIds: pinnedIds,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================================
// GDPR COMPLIANCE: SOFT DELETE
// ============================================================

/**
 * Soft delete a user account for GDPR compliance.
 * Anonymizes PII while preserving whisper history for recipients.
 * This is callable by the user themselves or by admin.
 */
export const softDeleteUser = mutation({
  args: {
    userId: v.optional(v.id('users')), // If not provided, deletes current user
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    // Get the user to delete
    let userToDelete;
    if (args.userId) {
      // Admin deleting another user
      const isSuperAdminUser = await isSuperAdmin(ctx, identity.subject);
      const isAdminUser = await isAdmin(ctx, identity.subject);
      
      if (!isSuperAdminUser && !isAdminUser) {
        throw new Error('Unauthorized: Admin access required to delete other users');
      }

      userToDelete = await ctx.db.get(args.userId);
    } else {
      // User deleting themselves
      userToDelete = await ctx.db
        .query('users')
        .withIndex('by_clerk_id', q => q.eq('clerkId', identity.subject))
        .first();
    }

    if (!userToDelete) {
      throw new Error('User not found');
    }

    if (userToDelete.isDeleted) {
      throw new Error('User is already deleted');
    }

    const now = Date.now();
    const anonymizedPrefix = `deleted_${userToDelete._id.slice(0, 8)}`;

    // Anonymize user data
    await ctx.db.patch(userToDelete._id, {
      // Anonymize PII
      username: anonymizedPrefix,
      email: `${anonymizedPrefix}@deleted.echoinwhispr.com`,
      firstName: undefined,
      lastName: undefined,
      displayName: 'Deleted User',
      pushNotificationToken: undefined,
      
      // Clear profile-related fields
      career: undefined,
      interests: undefined,
      mood: undefined,
      moodJournal: undefined,
      lifePhase: undefined,
      
      // Clear preferences
      pinnedConversationIds: undefined,
      
      // Set deletion markers
      isDeleted: true,
      deletedAt: now,
      updatedAt: now,
    });

    // Delete associated profile
    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_user_id', q => q.eq('userId', userToDelete._id))
      .first();
    
    if (profile) {
      await ctx.db.delete(profile._id);
    }

    // Delete pending friend requests (both directions)
    const sentRequests = await ctx.db
      .query('friends')
      .withIndex('by_user_status', q => 
        q.eq('userId', userToDelete._id).eq('status', 'pending')
      )
      .collect();
    
    for (const request of sentRequests) {
      await ctx.db.delete(request._id);
    }

    const receivedRequests = await ctx.db
      .query('friends')
      .withIndex('by_friend_status', q => 
        q.eq('friendId', userToDelete._id).eq('status', 'pending')
      )
      .collect();
    
    for (const request of receivedRequests) {
      await ctx.db.delete(request._id);
    }

    // Note: We keep whispers and accepted friendships intact
    // so recipients can still see their message history (with anonymized sender)

    return { 
      success: true, 
      message: 'User data anonymized and account marked as deleted' 
    };
  },
});

/**
 * Check if current user is deleted.
 * Used to block access for deleted accounts.
 */
export const isCurrentUserDeleted = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', identity.subject))
      .first();

    return user?.isDeleted ?? false;
  },
});

// ============================================================
// USERNAME CHANGE REQUESTS
// ============================================================

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

/**
 * User requests a username change. Creates a pending request for admin review.
 */
export const requestUsernameChange = mutation({
  args: {
    requestedUsername: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const normalizedUsername = args.requestedUsername.trim().toLowerCase();
    if (!USERNAME_REGEX.test(normalizedUsername)) {
      throw new Error('Username must be 3–20 chars: lowercase letters, numbers, underscores only');
    }

    if (user.username === normalizedUsername) {
      throw new Error('That is already your current username');
    }

    // Check no one else has it
    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_username', q => q.eq('username', normalizedUsername))
      .first();
    if (existingUser) throw new Error('Username is already taken');

    // Check no other pending request has claimed this username
    const conflictingRequest = await ctx.db
      .query('usernameChangeRequests')
      .withIndex('by_requested_username_status', q => 
        q.eq('requestedUsername', normalizedUsername).eq('status', 'pending')
      )
      .first();
    if (conflictingRequest) throw new Error('Someone else is already requesting that username');

    // Cancel any existing pending request from this user
    const existingRequest = await ctx.db
      .query('usernameChangeRequests')
      .withIndex('by_user_id', q => q.eq('userId', user._id))
      .filter(q => q.eq(q.field('status'), 'pending'))
      .first();
    if (existingRequest) {
      await ctx.db.patch(existingRequest._id, { status: 'rejected', updatedAt: Date.now() });
    }

    const now = Date.now();
    const requestId = await ctx.db.insert('usernameChangeRequests', {
      userId: user._id,
      currentUsername: user.username,
      requestedUsername: normalizedUsername,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, requestId };
  },
});

/**
 * Get the current user's most recent username change request.
 */
export const getMyUsernameChangeRequest = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', identity.subject))
      .first();
    if (!user) return null;

    const request = await ctx.db
      .query('usernameChangeRequests')
      .withIndex('by_user_id', q => q.eq('userId', user._id))
      .order('desc')
      .first();

    return request;
  },
});

/**
 * Admin: Get all pending username change requests.
 */
export const getPendingUsernameChangeRequests = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const { isAdmin: checkIsAdmin } = await import('./adminAuth');
    const isAdminUser = await checkIsAdmin(ctx, identity.subject);
    if (!isAdminUser) return [];

    const requests = await ctx.db
      .query('usernameChangeRequests')
      .withIndex('by_status', q => q.eq('status', 'pending'))
      .order('desc')
      .collect();

    return await Promise.all(
      requests.map(async (req) => {
        const user = await ctx.db.get(req.userId);
        return {
          ...req,
          userDisplayName: user?.displayName || user?.username || 'Unknown',
          userEmail: user?.email || '',
        };
      })
    );
  },
});

/**
 * Admin: Approve a username change request — atomically updates the user's username.
 */
export const approveUsernameChange = mutation({
  args: {
    requestId: v.id('usernameChangeRequests'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const { isAdmin: checkIsAdmin } = await import('./adminAuth');
    const isAdminUser = await checkIsAdmin(ctx, identity.subject);
    if (!isAdminUser) throw new Error('Unauthorized: Admin access required');

    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error('Request not found');
    if (request.status !== 'pending') throw new Error('Request already processed');

    // Check the username is still available
    const conflictingUser = await ctx.db
      .query('users')
      .withIndex('by_username', q => q.eq('username', request.requestedUsername))
      .first();
    if (conflictingUser && conflictingUser._id !== request.userId) {
      throw new Error('Username has since been taken — cannot approve');
    }

    const reviewerUser = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', identity.subject))
      .first();

    const now = Date.now();

    // Update the user's username
    const user = await ctx.db.get(request.userId);
    if (!user) throw new Error('User not found');

    await ctx.db.patch(user._id, {
      username: request.requestedUsername,
      // Also update displayName if it was set to the old username
      ...(user.displayName === request.currentUsername ? { displayName: request.requestedUsername } : {}),
      updatedAt: now,
    });

    // Mark request as approved
    await ctx.db.patch(args.requestId, {
      status: 'approved',
      reviewedBy: reviewerUser?._id,
      updatedAt: now,
    });

    // Send an in-app notification to the user
    await ctx.db.insert('notifications', {
      userId: user._id,
      type: 'system',
      title: 'Username Changed',
      message: `Your username has been changed to @${request.requestedUsername}`,
      read: false,
      createdAt: now,
    });

    return { success: true };
  },
});

/**
 * Admin: Reject a username change request.
 */
export const rejectUsernameChange = mutation({
  args: {
    requestId: v.id('usernameChangeRequests'),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const { isAdmin: checkIsAdmin } = await import('./adminAuth');
    const isAdminUser = await checkIsAdmin(ctx, identity.subject);
    if (!isAdminUser) throw new Error('Unauthorized: Admin access required');

    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error('Request not found');
    if (request.status !== 'pending') throw new Error('Request already processed');

    const reviewerUser = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', q => q.eq('clerkId', identity.subject))
      .first();

    const now = Date.now();

    await ctx.db.patch(args.requestId, {
      status: 'rejected',
      reviewedBy: reviewerUser?._id,
      reviewNote: args.note,
      updatedAt: now,
    });

    // Notify user
    await ctx.db.insert('notifications', {
      userId: request.userId,
      type: 'system',
      title: 'Username Change Request Declined',
      message: args.note
        ? `Your request for @${request.requestedUsername} was declined: ${args.note}`
        : `Your request for @${request.requestedUsername} was declined by an admin.`,
      read: false,
      createdAt: now,
    });

    return { success: true };
  },
});
