import { requireUser } from './auth';
import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { isAdmin } from "./adminAuth";

/**
 * Daily Prompts Module (Whisper of the Day)
 * 
 * Daily prompts to encourage meaningful connections.
 */

// Default prompts library
const DEFAULT_PROMPTS = [
  // Reflection category
  { content: "Share something that made you smile today", category: "reflection" },
  { content: "What's a lesson you learned recently?", category: "reflection" },
  { content: "Describe your perfect day in 3 words", category: "reflection" },
  { content: "What advice would you give your younger self?", category: "reflection" },
  { content: "What's the most beautiful thing you saw this week?", category: "reflection" },
  
  // Gratitude category
  { content: "Name three things you're grateful for right now", category: "gratitude" },
  { content: "Who made a positive impact on your life recently?", category: "gratitude" },
  { content: "What small joy did you experience today?", category: "gratitude" },
  { content: "Share a memory that still makes you happy", category: "gratitude" },
  
  // Curiosity category
  { content: "What topic could you talk about for hours?", category: "curiosity" },
  { content: "If you could master any skill instantly, what would it be?", category: "curiosity" },
  { content: "What question would you love to know the answer to?", category: "curiosity" },
  { content: "What's something you've always wanted to try?", category: "curiosity" },
  { content: "What book, movie, or song changed your perspective?", category: "curiosity" },
  
  // Connection category
  { content: "Reach out to someone who inspires you today", category: "connection" },
  { content: "Share an encouraging thought with a stranger", category: "connection" },
  { content: "Ask someone about their dreams", category: "connection" },
  { content: "Tell someone what you appreciate about them", category: "connection" },
  { content: "Share a hobby you'd love to explore with others", category: "connection" },
  
  // Dreams category
  { content: "Where do you see yourself in 5 years?", category: "dreams" },
  { content: "What's on your bucket list?", category: "dreams" },
  { content: "If money wasn't a factor, what would you do?", category: "dreams" },
  { content: "What legacy do you want to leave behind?", category: "dreams" },
  
  // Self-discovery category
  { content: "What makes you uniquely you?", category: "self-discovery" },
  { content: "When do you feel most like yourself?", category: "self-discovery" },
  { content: "What's a strength others might not know you have?", category: "self-discovery" },
  { content: "What challenge are you currently working through?", category: "self-discovery" },
];

// Seed default prompts (internal mutation for setup)
export const seedDefaultPrompts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existingPrompt = await ctx.db.query("dailyPrompts").first();
    
    if (existingPrompt) {
      return { message: "Prompts already seeded" };
    }

    const now = Date.now();
    
    for (const prompt of DEFAULT_PROMPTS) {
      await ctx.db.insert("dailyPrompts", {
        content: prompt.content,
        category: prompt.category,
        createdAt: now,
      });
    }

    return { message: "Prompts seeded successfully", count: DEFAULT_PROMPTS.length };
  },
});

// Get today's prompt
export const getTodaysPrompt = query({
  args: {},
  handler: async (ctx) => {
    // Use single UTC-based reference date for consistency
    const now = new Date();
    const today = now.toISOString().split("T")[0]; // YYYY-MM-DD

    // First, check if there's a scheduled prompt for today
    const scheduledPrompt = await ctx.db
      .query("dailyPrompts")
      .withIndex("by_date", (q) => q.eq("activeDate", today))
      .first();

    if (scheduledPrompt) {
      return scheduledPrompt;
    }

    // Otherwise, get a "random" prompt based on the day
    // Use UTC-based day of year as a deterministic "random" seed
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const startOfYear = Date.UTC(now.getUTCFullYear(), 0, 0);
    const dayOfYear = Math.floor((now.getTime() - startOfYear) / MS_PER_DAY);

    const allPrompts = await ctx.db.query("dailyPrompts").take(200);
    
    if (allPrompts.length === 0) {
      return null;
    }

    // Deterministic selection based on day of year
    const index = dayOfYear % allPrompts.length;
    return allPrompts[index];
  },
});

// Get prompt by ID
export const getPrompt = query({
  args: {
    promptId: v.id("dailyPrompts"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.promptId);
  },
});

// Mark prompt as seen/responded
export const markPromptResponded = mutation({
  args: {
    promptId: v.id("dailyPrompts"),
    sharedWithUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    // Check if already responded
    const existing = await ctx.db
      .query("userPromptResponses")
      .withIndex("by_user_prompt", (q) => 
        q.eq("userId", user._id).eq("promptId", args.promptId)
      )
      .first();

    if (existing) {
      return { alreadyResponded: true };
    }

    await ctx.db.insert("userPromptResponses", {
      userId: user._id,
      promptId: args.promptId,
      respondedAt: Date.now(),
      sharedWithUserId: args.sharedWithUserId,
    });

    return { success: true };
  },
});

// Check if user has responded to today's prompt
export const hasRespondedToday = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return false;
    }

    // Get today's prompt using UTC-based calculation for consistency
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const startOfYear = Date.UTC(now.getUTCFullYear(), 0, 0);
    const dayOfYear = Math.floor((now.getTime() - startOfYear) / MS_PER_DAY);

    let todaysPrompt = await ctx.db
      .query("dailyPrompts")
      .withIndex("by_date", (q) => q.eq("activeDate", today))
      .first();

    if (!todaysPrompt) {
      const allPrompts = await ctx.db.query("dailyPrompts").take(200);
      if (allPrompts.length > 0) {
        const index = dayOfYear % allPrompts.length;
        todaysPrompt = allPrompts[index];
      }
    }

    if (!todaysPrompt) {
      return false;
    }

    const response = await ctx.db
      .query("userPromptResponses")
      .withIndex("by_user_prompt", (q) => 
        q.eq("userId", user._id).eq("promptId", todaysPrompt._id)
      )
      .first();

    return !!response;
  },
});

// Get prompts by category
export const getPromptsByCategory = query({
  args: {
    category: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("dailyPrompts")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();
  },
});

// Get all categories
export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    const prompts = await ctx.db.query("dailyPrompts").take(100);
    const categories = [...new Set(prompts.map(p => p.category))];
    return categories;
  },
});

// Get user's prompt response history
export const getMyResponseHistory = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
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

    const responses = await ctx.db
      .query("userPromptResponses")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(args.limit || 30);

    // Enrich with prompt content
    const enriched = await Promise.all(
      responses.map(async (r) => {
        const prompt = await ctx.db.get(r.promptId);
        return {
          ...r,
          promptContent: prompt?.content,
          promptCategory: prompt?.category,
        };
      })
    );

    return enriched;
  },
});

// Create a new prompt (admin function)
export const createPrompt = mutation({
  args: {
    content: v.string(),
    category: v.string(),
    activeDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const isAdminUser = await isAdmin(ctx, identity.subject);
    if (!isAdminUser) {
      throw new Error("Unauthorized: Admin access required");
    }

    const promptId = await ctx.db.insert("dailyPrompts", {
      content: args.content,
      category: args.category,
      activeDate: args.activeDate,
      isActive: true,
      createdAt: Date.now(),
    });

    return { promptId };
  },
});

// Schedule a prompt for a specific date
export const schedulePrompt = mutation({
  args: {
    promptId: v.id("dailyPrompts"),
    date: v.string(), // YYYY-MM-DD
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const isAdminUser = await isAdmin(ctx, identity.subject);
    if (!isAdminUser) {
      throw new Error("Unauthorized: Admin access required");
    }

    await ctx.db.patch(args.promptId, {
      activeDate: args.date,
    });

    return { success: true };
  },
});

// Get random prompt (for "inspire me" feature)
export const getRandomPrompt = query({
  args: {
    excludeIds: v.optional(v.array(v.id("dailyPrompts"))),
  },
  handler: async (ctx, args) => {
    const allPrompts = await ctx.db.query("dailyPrompts").take(100);
    
    const excludeSet = new Set(args.excludeIds || []);
    const eligiblePrompts = allPrompts.filter(p => !excludeSet.has(p._id));

    // Return null when no eligible prompts remain (all excluded)
    if (eligiblePrompts.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * eligiblePrompts.length);
    return eligiblePrompts[randomIndex];
  },
});
