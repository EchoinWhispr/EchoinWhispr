import { requireUser } from './auth';
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Unmasking Ceremony Module
 * 
 * Allows users to reveal their identities to each other through mutual consent.
 * A special, ceremonial moment in the anonymous connection journey.
 */

// Request to unmask to another user
export const requestUnmasking = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const requester = await requireUser(ctx);

    // Get the conversation
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // Verify user is part of the conversation
    if (!conversation.participantIds.includes(requester._id)) {
      throw new Error("You are not part of this conversation");
    }

    // Get the other participant
    const targetId = conversation.participantIds.find(id => id !== requester._id);
    if (!targetId) {
      throw new Error("Could not find conversation partner");
    }

    // Check for existing request in either direction
    const existingFromMe = await ctx.db
      .query("unmaskingRequests")
      .withIndex("by_conversation_requester", (q) => 
        q.eq("conversationId", args.conversationId).eq("requesterId", requester._id)
      )
      .filter((q) => 
        q.or(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "mutual_pending"),
          q.eq(q.field("status"), "completed")
        )
      )
      .first();

    if (existingFromMe?.status === "completed") {
      throw new Error("You have already unmasked in this conversation");
    }

    if (existingFromMe?.status === "pending" || existingFromMe?.status === "mutual_pending") {
      throw new Error("You already have a pending unmasking request");
    }

    // Check if the other person has requested
    const existingFromThem = await ctx.db
      .query("unmaskingRequests")
      .withIndex("by_conversation_target_status", (q) => 
        q.eq("conversationId", args.conversationId).eq("targetId", requester._id).eq("status", "pending")
      )
      .first();

    const now = Date.now();

    if (existingFromThem) {
      // Both have now requested - upgrade to mutual_pending
      await ctx.db.patch(existingFromThem._id, {
        status: "mutual_pending",
        respondedAt: now,
      });

      // Create our request as well
      await ctx.db.insert("unmaskingRequests", {
        requesterId: requester._id,
        targetId: targetId,
        conversationId: args.conversationId,
        status: "mutual_pending",
        createdAt: now,
      });

      return { 
        status: "mutual_pending",
        message: "Both of you have requested to unmask! Proceed to reveal.",
      };
    }

    // Create new request
    await ctx.db.insert("unmaskingRequests", {
      requesterId: requester._id,
      targetId: targetId,
      conversationId: args.conversationId,
      status: "pending",
      createdAt: now,
    });

    return { 
      status: "pending",
      message: "Request sent. Waiting for their response.",
    };
  },
});

// Respond to an unmasking request
export const respondToUnmasking = mutation({
  args: {
    requestId: v.id("unmaskingRequests"),
    accept: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Request not found");
    }

    if (request.targetId !== user._id) {
      throw new Error("This request is not for you");
    }

    if (request.status !== "pending") {
      throw new Error("This request has already been responded to");
    }

    const now = Date.now();

    if (!args.accept) {
      await ctx.db.patch(args.requestId, {
        status: "declined",
        respondedAt: now,
      });
      return { status: "declined" };
    }

    // User accepts - upgrade to mutual_pending or complete
    // First check if we also have a pending request
    const ourRequest = await ctx.db
      .query("unmaskingRequests")
      .withIndex("by_conversation_requester", (q) => 
        q.eq("conversationId", request.conversationId).eq("requesterId", user._id)
      )
      .filter((q) => 
        q.or(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "mutual_pending")
        )
      )
      .first();

    if (ourRequest) {
      // Both have requested - complete both
      await ctx.db.patch(args.requestId, {
        status: "completed",
        respondedAt: now,
        completedAt: now,
      });
      await ctx.db.patch(ourRequest._id, {
        status: "completed",
        respondedAt: now,
        completedAt: now,
      });

      return { 
        status: "completed",
        message: "Identities revealed to each other!",
      };
    }

    // We're accepting their request, upgrade to mutual_pending
    await ctx.db.patch(args.requestId, {
      status: "accepted",
      respondedAt: now,
    });

    // Create our matching request
    await ctx.db.insert("unmaskingRequests", {
      requesterId: user._id,
      targetId: request.requesterId,
      conversationId: request.conversationId,
      status: "accepted",
      createdAt: now,
      respondedAt: now,
    });

    return { 
      status: "accepted",
      message: "You've accepted the unmasking. Completing ceremony...",
    };
  },
});

// Complete the unmasking ceremony (after both accept)
export const completeUnmasking = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    // Check that both users have accepted or mutual_pending
    const allRequests = await ctx.db
      .query("unmaskingRequests")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    const validRequests = allRequests.filter(r => 
      r.status === "accepted" || r.status === "mutual_pending"
    );

    if (validRequests.length < 2) {
      throw new Error("Both users must accept before completing");
    }

    const now = Date.now();

    // Mark all as completed
    for (const request of validRequests) {
      await ctx.db.patch(request._id, {
        status: "completed",
        completedAt: now,
      });
    }

    return { 
      status: "completed",
      message: "The unmasking ceremony is complete! You can now see each other's true identities.",
    };
  },
});

// Get unmasking status for a conversation
export const getUnmaskingStatus = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { status: "none", canRequest: false };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return { status: "none", canRequest: false };
    }

    // Get the conversation
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || !conversation.participantIds.includes(user._id)) {
      return { status: "none", canRequest: false };
    }

    const otherId = conversation.participantIds.find(id => id !== user._id);

    // Check for any requests
    const allRequests = await ctx.db
      .query("unmaskingRequests")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    // Check if completed
    const completed = allRequests.some(r => r.status === "completed");
    if (completed) {
      // Get the other user's info
      const otherUser = otherId ? await ctx.db.get(otherId) : null;
      return {
        status: "completed",
        canRequest: false,
        revealedUser: otherUser ? {
          username: otherUser.username,
          displayName: otherUser.displayName || otherUser.firstName,
          email: otherUser.email,
        } : null,
      };
    }

    // Check for mutual pending
    const mutualPending = allRequests.filter(r => r.status === "mutual_pending");
    if (mutualPending.length >= 1) {
      return {
        status: "mutual_pending",
        canRequest: false,
        canComplete: true,
        message: "Both ready to reveal! Complete the ceremony.",
      };
    }

    // Check for incoming pending request
    const incomingRequest = allRequests.find(
      r => r.targetId === user._id && r.status === "pending"
    );
    if (incomingRequest) {
      return {
        status: "incoming_request",
        canRequest: false,
        requestId: incomingRequest._id,
        message: "Someone wants to reveal their identity to you!",
      };
    }

    // Check for outgoing pending request
    const outgoingRequest = allRequests.find(
      r => r.requesterId === user._id && r.status === "pending"
    );
    if (outgoingRequest) {
      return {
        status: "pending",
        canRequest: false,
        message: "Waiting for their response...",
      };
    }

    // Check for accepted (ready to complete)
    const acceptedRequests = allRequests.filter(r => r.status === "accepted");
    if (acceptedRequests.length >= 2) {
      return {
        status: "ready_to_complete",
        canRequest: false,
        canComplete: true,
      };
    }

    // No active requests
    return {
      status: "none",
      canRequest: true,
      message: "Ready to suggest an identity reveal?",
    };
  },
});

// Get my unmasking history
export const getUnmaskingHistory = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return [];
    }

    // Get completed unmaskings where user was involved
    const asRequester = await ctx.db
      .query("unmaskingRequests")
      .withIndex("by_requester", (q) => q.eq("requesterId", user._id))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    const asTarget = await ctx.db
      .query("unmaskingRequests")
      .withIndex("by_target", (q) => q.eq("targetId", user._id))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    // Combine and dedupe by conversation
    const conversationMap = new Map<string, typeof asRequester[0]>();
    
    [...asRequester, ...asTarget].forEach(r => {
      const key = r.conversationId.toString();
      if (!conversationMap.has(key) || (r.completedAt && r.completedAt > (conversationMap.get(key)?.completedAt || 0))) {
        conversationMap.set(key, r);
      }
    });

    // Enrich with user info
    const history = await Promise.all(
      Array.from(conversationMap.values()).map(async (r) => {
        const otherId = r.requesterId === user._id ? r.targetId : r.requesterId;
        const otherUser = await ctx.db.get(otherId);
        return {
          conversationId: r.conversationId,
          completedAt: r.completedAt,
          revealedUser: otherUser ? {
            username: otherUser.username,
            displayName: otherUser.displayName || otherUser.firstName,
          } : null,
        };
      })
    );

    return history.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
  },
});

// Cancel an unmasking request
export const cancelUnmaskingRequest = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const request = await ctx.db
      .query("unmaskingRequests")
      .withIndex("by_conversation_requester", (q) => 
        q.eq("conversationId", args.conversationId).eq("requesterId", user._id)
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (!request) {
      throw new Error("No pending request found");
    }

    await ctx.db.delete(request._id);

    return { success: true };
  },
});
