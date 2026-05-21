import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { paginationOptsValidator } from 'convex/server';
import { Doc, Id } from './_generated/dataModel';
import { requireUser } from './auth';
import { isAdmin, isSuperAdmin, getAdminRole, AdminRole } from './adminAuth';
import { enforceRateLimit, recordRateLimitedAction } from './rateLimits';

/**
 * Admin module for EchoinWhispr.
 * Provides admin promotion system, whisper monitoring, and dashboard analytics.
 */

// ============================================================
// ADMIN STATUS QUERIES
// ============================================================

/**
 * Check if the current user has admin privileges.
 */
export const isCurrentUserAdmin = query({
  args: {},
  handler: async (ctx): Promise<{ isAdmin: boolean; role: AdminRole | null }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { isAdmin: false, role: null };
    }

    const role = await getAdminRole(ctx, identity.subject);
    return { isAdmin: role !== null, role };
  },
});

/**
 * Check if any admin roles exist in the system.
 * Used to determine if first super admin needs to be initialized.
 */
export const hasAdmins = query({
  args: {},
  handler: async (ctx): Promise<boolean> => {
    const firstAdmin = await ctx.db.query('adminRoles').first();
    return firstAdmin !== null;
  },
});

/**
 * Get the current user's admin request status (if any).
 */
export const getMyAdminRequestStatus = query({
  args: {},
  handler: async (ctx) => {
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

    const request = await ctx.db
      .query('adminRequests')
      .withIndex('by_user_id', (q) => q.eq('userId', user._id))
      .order('desc')
      .first();

    return request;
  },
});

// ============================================================
// ADMIN REQUEST SYSTEM (Option C: Both request and direct grant)
// ============================================================

/**
 * User submits a request to become an admin.
 */
export const requestAdminPromotion = mutation({
  args: {
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    // Validate reason
    if (args.reason.trim().length < 10) {
      throw new Error('Please provide a reason with at least 10 characters');
    }

    await enforceRateLimit(ctx, user._id, 'REQUEST_ADMIN_PROMOTION');

    // Check if user is already an admin
    const existingRole = await ctx.db
      .query('adminRoles')
      .withIndex('by_user_id', (q) => q.eq('userId', user._id))
      .first();

    if (existingRole) {
      throw new Error('You are already an admin');
    }

    // Check for existing pending request
    const existingRequest = await ctx.db
      .query('adminRequests')
      .withIndex('by_user_id_status', (q) => q.eq('userId', user._id).eq('status', 'pending'))
      .first();

    if (existingRequest) {
      throw new Error('You already have a pending admin request');
    }

    // Create the request
    const requestId = await ctx.db.insert('adminRequests', {
      userId: user._id,
      clerkId: user.clerkId,
      reason: args.reason.trim(),
      requestType: 'admin',
      status: 'pending',
      createdAt: Date.now(),
    });

    await recordRateLimitedAction(ctx, user._id, 'REQUEST_ADMIN_PROMOTION');

    return { success: true, requestId };
  },
});

/**
 * Super Admin: Get all pending admin requests.
 */
export const getPendingAdminRequests = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Verify super admin
    const isSuperAdminUser = await isSuperAdmin(ctx, identity.subject);
    if (!isSuperAdminUser) {
      return [];
    }

    const requests = await ctx.db
      .query('adminRequests')
      .withIndex('by_status', (q) => q.eq('status', 'pending'))
      .order('desc')
      .collect();

    // Enrich with user details
    const enrichedRequests = await Promise.all(
      requests.map(async (request) => {
        const user = await ctx.db.get(request.userId);
        return {
          ...request,
          username: user?.username || 'Unknown',
          email: user?.email || 'Unknown',
          displayName: user?.displayName || user?.username || 'Unknown',
        };
      })
    );

    return enrichedRequests;
  },
});

/**
 * Super Admin: Approve an admin request.
 */
export const approveAdminRequest = mutation({
  args: {
    requestId: v.id('adminRequests'),
  },
  handler: async (ctx, args) => {
    const reviewerUser = await requireUser(ctx);

    // Verify super admin
    const isSuperAdminUser = await isSuperAdmin(ctx, reviewerUser.clerkId);
    if (!isSuperAdminUser) {
      throw new Error('Unauthorized: Super admin access required');
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error('Request not found');
    }

    if (request.status !== 'pending') {
      throw new Error('Request has already been processed');
    }

    const now = Date.now();

    // Update request status
    await ctx.db.patch(args.requestId, {
      status: 'approved',
      reviewedBy: reviewerUser._id,
      reviewedAt: now,
    });

    // Determine role based on requestType
    const roleToGrant = request.requestType === 'super_admin' ? 'super_admin' : 'admin';

    // Check if user already has an admin role (for super_admin promotion requests)
    const existingRole = await ctx.db
      .query('adminRoles')
      .withIndex('by_user_id', (q) => q.eq('userId', request.userId))
      .first();

    if (existingRole) {
      // Update existing role if promoting to super_admin
      if (roleToGrant === 'super_admin' && existingRole.role !== 'super_admin') {
        await ctx.db.patch(existingRole._id, {
          role: 'super_admin',
        });
      }
    } else {
      // Create new admin role
      await ctx.db.insert('adminRoles', {
        userId: request.userId,
        clerkId: request.clerkId,
        role: roleToGrant,
        grantedBy: reviewerUser._id,
        createdAt: now,
      });
    }

    return { success: true };
  },
});

/**
 * Super Admin: Reject an admin request.
 */
export const rejectAdminRequest = mutation({
  args: {
    requestId: v.id('adminRequests'),
  },
  handler: async (ctx, args) => {
    const reviewerUser = await requireUser(ctx);

    // Verify super admin
    const isSuperAdminUser = await isSuperAdmin(ctx, reviewerUser.clerkId);
    if (!isSuperAdminUser) {
      throw new Error('Unauthorized: Super admin access required');
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error('Request not found');
    }

    if (request.status !== 'pending') {
      throw new Error('Request has already been processed');
    }

    await ctx.db.patch(args.requestId, {
      status: 'rejected',
      reviewedBy: reviewerUser._id,
      reviewedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Super Admin: Directly grant admin role to a user by username.
 */
export const grantAdminRole = mutation({
  args: {
    username: v.string(),
  },
  handler: async (ctx, args) => {
    // Re-read granter inside mutation (TOCTOU fix)
    const granterUser = await requireUser(ctx);

    // Verify super admin using fresh data
    const isSuperAdminUser = await isSuperAdmin(ctx, granterUser.clerkId);
    if (!isSuperAdminUser) {
      throw new Error('Unauthorized: Super admin access required');
    }

    const targetUser = await ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', args.username))
      .first();

    if (!targetUser) {
      throw new Error('User not found');
    }

    // Check if already admin
    const existingRole = await ctx.db
      .query('adminRoles')
      .withIndex('by_user_id', (q) => q.eq('userId', targetUser._id))
      .first();

    if (existingRole) {
      throw new Error('User is already an admin');
    }

    await ctx.db.insert('adminRoles', {
      userId: targetUser._id,
      clerkId: targetUser.clerkId,
      role: 'admin',
      grantedBy: granterUser._id,
      createdAt: Date.now(),
    });

    return { success: true, userId: targetUser._id };
  },
});

/**
 * Super Admin: Revoke admin privileges from a user (including other super admins).
 */
export const revokeAdminRole = mutation({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireUser(ctx);

    // Verify super admin
    const isSuperAdminUser = await isSuperAdmin(ctx, currentUser.clerkId);
    if (!isSuperAdminUser) {
      throw new Error('Unauthorized: Super admin access required');
    }

    // Prevent self-demotion
    if (currentUser._id === args.userId) {
      throw new Error('Cannot revoke your own admin privileges');
    }

    const adminRole = await ctx.db
      .query('adminRoles')
      .withIndex('by_user_id', (q) => q.eq('userId', args.userId))
      .first();

    if (!adminRole) {
      throw new Error('User is not an admin');
    }

    await ctx.db.delete(adminRole._id);

    return { success: true };
  },
});

/**
 * Super Admin: Promote an admin to super admin.
 */
export const promoteToSuperAdmin = mutation({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireUser(ctx);

    // Verify super admin
    const isSuperAdminUser = await isSuperAdmin(ctx, currentUser.clerkId);
    if (!isSuperAdminUser) {
      throw new Error('Unauthorized: Super admin access required');
    }

    const adminRole = await ctx.db
      .query('adminRoles')
      .withIndex('by_user_id', (q) => q.eq('userId', args.userId))
      .first();

    if (!adminRole) {
      throw new Error('User is not an admin');
    }

    if (adminRole.role === 'super_admin') {
      throw new Error('User is already a super admin');
    }

    await ctx.db.patch(adminRole._id, {
      role: 'super_admin',
    });

    return { success: true };
  },
});

/**
 * Initialize the first super admin (only works when no admins exist).
 * Convex serializes mutations, so the read-check-insert pattern is atomic.
 * Idempotent: calling again by the same already-promoted user returns early.
 */
export const initializeFirstSuperAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    const existingUserRole = await ctx.db
      .query('adminRoles')
      .withIndex('by_user_id', (q) => q.eq('userId', user._id))
      .first();

    if (existingUserRole?.role === 'super_admin') {
      return { success: true, message: 'You are already the super admin.', alreadyInitialized: true };
    }

    const anyAdmin = await ctx.db.query('adminRoles').first();
    if (anyAdmin) {
      throw new Error('Admin system already initialized');
    }

    const now = Date.now();

    const adminRoleId = await ctx.db.insert('adminRoles', {
      userId: user._id,
      clerkId: user.clerkId,
      role: 'super_admin',
      createdAt: now,
    });

    await ctx.db.insert('adminRequests', {
      userId: user._id,
      clerkId: user.clerkId,
      reason: 'System initialization: First super admin created via initializeFirstSuperAdmin mutation',
      requestType: 'super_admin',
      status: 'approved',
      createdAt: now,
      reviewedAt: now,
    });

    return { success: true, message: 'You are now the first super admin!' };
  },
});

/**
 * Admin: Request promotion to super admin.
 */
export const requestSuperAdminPromotion = mutation({
  args: {
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    // Validate reason
    if (args.reason.trim().length < 10) {
      throw new Error('Please provide a reason with at least 10 characters');
    }

    // Verify user is an admin but not super admin
    const isAdminUser = await isAdmin(ctx, user.clerkId);
    if (!isAdminUser) {
      throw new Error('You must be an admin to request super admin promotion');
    }

    const isSuperAdminUser = await isSuperAdmin(ctx, user.clerkId);
    if (isSuperAdminUser) {
      throw new Error('You are already a super admin');
    }

    await enforceRateLimit(ctx, user._id, 'REQUEST_SUPER_ADMIN_PROMOTION');

    // Check for existing pending request
    const existingRequest = await ctx.db
      .query('adminRequests')
      .withIndex('by_user_id_status', (q) => q.eq('userId', user._id).eq('status', 'pending'))
      .first();

    if (existingRequest) {
      throw new Error('You already have a pending promotion request');
    }

    // Create the super admin request (reusing adminRequests table)
    const requestId = await ctx.db.insert('adminRequests', {
      userId: user._id,
      clerkId: user.clerkId,
      reason: args.reason.trim(),
      requestType: 'super_admin',
      status: 'pending',
      createdAt: Date.now(),
    });

    await recordRateLimitedAction(ctx, user._id, 'REQUEST_SUPER_ADMIN_PROMOTION');

    return { success: true, requestId };
  },
});

// ============================================================
// WHISPER MONITORING (Admin-only)
// ============================================================

/**
 * Admin: Get all whispers with sender/recipient details (paginated).
 */
export const getAllWhispers = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    // Verify admin
    const isAdminUser = await isAdmin(ctx, identity.subject);
    if (!isAdminUser) throw new Error('Unauthorized');

    // Get whispers ordered by creation time (newest first)
    // Note: Search implementation would need a search index, skipping for now as per plan focus on pagination
    const result = await ctx.db
      .query('whispers')
      .order('desc')
      .paginate(args.paginationOpts);

    // Enrich with sender/recipient usernames
    const enrichedWhispers = await Promise.all(
      result.page.map(async (whisper) => {
        const sender = await ctx.db.get(whisper.senderId);
        const recipient = await ctx.db.get(whisper.recipientId);
        return {
          _id: whisper._id,
          content: whisper.content,
          createdAt: whisper.createdAt,
          isRead: whisper.isRead,
          readAt: whisper.readAt,
          senderUsername: sender?.username || 'Deleted User',
          recipientUsername: recipient?.username || 'Deleted User',
          senderId: whisper.senderId,
          recipientId: whisper.recipientId,
          isMystery: whisper.isMystery,
          isScheduled: whisper.isScheduled,
          hasAudio: !!whisper.audioStorageId,
        };
      })
    );

    return {
      ...result,
      page: enrichedWhispers,
    };
  },
});

/**
 * Admin: Get detailed whisper information including full sender/recipient profiles.
 */
export const getWhisperDetails = query({
  args: {
    whisperId: v.id('whispers'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    // Verify admin
    const isAdminUser = await isAdmin(ctx, identity.subject);
    if (!isAdminUser) {
      throw new Error('Unauthorized: Admin access required');
    }

    const whisper = await ctx.db.get(args.whisperId);
    if (!whisper) {
      throw new Error('Whisper not found');
    }

    const sender = await ctx.db.get(whisper.senderId);
    const recipient = await ctx.db.get(whisper.recipientId);

    return {
      whisper: {
        _id: whisper._id,
        content: whisper.content,
        createdAt: whisper.createdAt,
        isRead: whisper.isRead,
        readAt: whisper.readAt,
        isMystery: whisper.isMystery,
        isScheduled: whisper.isScheduled,
        scheduledFor: whisper.scheduledFor,
        reactions: whisper.reactions,
        hasAudio: !!whisper.audioStorageId,
        audioDuration: whisper.audioDuration,
      },
      sender: sender ? {
        _id: sender._id,
        username: sender.username,
        email: sender.email,
        displayName: sender.displayName,
        career: sender.career,
        createdAt: sender.createdAt,
        isDeleted: sender.isDeleted,
      } : null,
      recipient: recipient ? {
        _id: recipient._id,
        username: recipient.username,
        email: recipient.email,
        displayName: recipient.displayName,
        career: recipient.career,
        createdAt: recipient.createdAt,
        isDeleted: recipient.isDeleted,
      } : null,
    };
  },
});

// ============================================================
// ADMIN DASHBOARD ANALYTICS
// ============================================================

/**
 * Admin: Get dashboard statistics.
 * Optimized to use indexed queries and avoid N+1 patterns.
 */
export const getAdminDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const isAdminUser = await isAdmin(ctx, identity.subject);
    if (!isAdminUser) {
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    const sixMonthsAgo = todayTimestamp - 180 * 24 * 60 * 60 * 1000;

    const [
      usersSample,
      whispersSample,
      whispersTodaySample,
      pendingRequestsSample,
      adminRolesSample,
      activeConversationsSample,
    ] = await Promise.all([
      ctx.db.query('users').withIndex('by_is_deleted', (q) => q.eq('isDeleted', undefined)).take(1000),
      ctx.db.query('whispers').withIndex('by_created_at', (q) => q.gte('createdAt', sixMonthsAgo)).take(1000),
      ctx.db.query('whispers').withIndex('by_created_at', (q) => q.gte('createdAt', todayTimestamp)).take(1000),
      ctx.db.query('adminRequests').withIndex('by_status', (q) => q.eq('status', 'pending')).take(1000),
      ctx.db.query('adminRoles').take(100),
      ctx.db.query('conversations').withIndex('by_status', (q) => q.eq('status', 'active')).take(100),
    ]);

    return {
      totalUsers: usersSample.length,
      totalWhispers: whispersSample.length,
      whispersToday: whispersTodaySample.length,
      pendingAdminRequests: pendingRequestsSample.length,
      totalAdmins: adminRolesSample.length,
      activeConversations: activeConversationsSample.length,
    };
  },
});

/**
 * Admin: Get list of all admins.
 */
export const getAllAdmins = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Verify admin
    const isAdminUser = await isAdmin(ctx, identity.subject);
    if (!isAdminUser) {
      return [];
    }

    const adminRoles = await ctx.db.query('adminRoles').take(100);

    const adminsWithDetails = await Promise.all(
      adminRoles.map(async (adminRole) => {
        const user = await ctx.db.get(adminRole.userId);
        const grantedByUser = adminRole.grantedBy 
          ? await ctx.db.get(adminRole.grantedBy)
          : null;
        return {
          ...adminRole,
          username: user?.username || 'Unknown',
          email: user?.email || 'Unknown',
          displayName: user?.displayName || user?.username || 'Unknown',
          grantedByUsername: grantedByUser?.username || 'System',
        };
      })
    );

    return adminsWithDetails;
  },
});
