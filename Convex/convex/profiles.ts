import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { enforceRateLimit, recordRateLimitedAction } from './rateLimits';

/**
 * Get the current user's profile.
 * Returns the profile data for the authenticated user.
 */
export const getProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('User not authenticated');
    }

    // Get the user record first to get the proper Id type
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();

    if (!user) {
      throw new Error('User not found');
    }

    // Get the user's profile
    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_user_id', (q) => q.eq('userId', user._id))
      .first();

    if (!profile) {
      // If no profile exists, return null - the frontend will handle creating a default profile
      return null;
    }

    return {
      ...profile,
      career: user.career,
      interests: user.interests,
      mood: user.mood,
    };
  },
});

/**
 * Update the current user's profile.
 * Updates the bio and avatarUrl fields for the authenticated user.
 */
export const updateProfile = mutation({
  args: {
    bio: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('User not authenticated');
    }

    // Validate bio length (same as whispers)
    if (args.bio && args.bio.length > 280) {
      throw new Error('Bio must be 280 characters or less');
    }

    // Get the user record first to get the proper Id type
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .first();

    if (!user) {
      throw new Error('User not found');
    }

    await enforceRateLimit(ctx, user._id, 'UPDATE_PROFILE');

    // Get existing profile
    const existingProfile = await ctx.db
      .query('profiles')
      .withIndex('by_user_id', (q) => q.eq('userId', user._id))
      .first();

    const now = Date.now();

    if (existingProfile) {
      // Update existing profile
      await ctx.db.patch(existingProfile._id, {
        bio: args.bio,
        avatarUrl: args.avatarUrl,
        updatedAt: now,
      });
    } else {
      // Create new profile if it doesn't exist
      await ctx.db.insert('profiles', {
        userId: user._id,
        bio: args.bio,
        avatarUrl: args.avatarUrl,
        isPublic: true, // Default to public
        createdAt: now,
        updatedAt: now,
      });
    }

    await recordRateLimitedAction(ctx, user._id, 'UPDATE_PROFILE');

    // Return the updated profile
    const updatedProfile = await ctx.db
      .query('profiles')
      .withIndex('by_user_id', (q) => q.eq('userId', user._id))
      .first();

    return updatedProfile;
  },
});