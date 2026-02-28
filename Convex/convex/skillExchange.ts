import { requireUser } from './auth';
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Skill Exchange Module
 * 
 * Connect learners with teachers based on skills.
 * Users can offer to teach skills or seek to learn from others.
 */

// Skill categories
export const SKILL_CATEGORIES = [
  { id: "tech", label: "Technology", icon: "💻" },
  { id: "creative", label: "Creative Arts", icon: "🎨" },
  { id: "business", label: "Business", icon: "💼" },
  { id: "languages", label: "Languages", icon: "🌍" },
  { id: "music", label: "Music", icon: "🎵" },
  { id: "fitness", label: "Health & Fitness", icon: "💪" },
  { id: "lifestyle", label: "Lifestyle", icon: "🌟" },
  { id: "academic", label: "Academic", icon: "📚" },
  { id: "cooking", label: "Cooking", icon: "🍳" },
  { id: "crafts", label: "Crafts & DIY", icon: "🔧" },
];

// Proficiency levels
export const PROFICIENCY_LEVELS = [
  { id: "beginner", label: "Beginner", description: "Just starting out" },
  { id: "intermediate", label: "Intermediate", description: "Comfortable with basics" },
  { id: "advanced", label: "Advanced", description: "Highly proficient" },
  { id: "expert", label: "Expert", description: "Professional level" },
];

// Add a skill (offering or seeking)
export const addSkill = mutation({
  args: {
    skillName: v.string(),
    type: v.union(v.literal("offering"), v.literal("seeking")),
    proficiencyLevel: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    // Check if user already has this skill with same type
    const existing = await ctx.db
      .query("skills")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => 
        q.and(
          q.eq(q.field("skillName"), args.skillName.toLowerCase()),
          q.eq(q.field("type"), args.type)
        )
      )
      .first();

    if (existing) {
      throw new Error(`You already have "${args.skillName}" as a ${args.type === "offering" ? "teaching" : "learning"} skill`);
    }

    const skillId = await ctx.db.insert("skills", {
      userId: user._id,
      skillName: args.skillName.toLowerCase(),
      type: args.type,
      proficiencyLevel: args.proficiencyLevel,
      description: args.description,
      category: args.category,
      createdAt: Date.now(),
    });

    return { skillId };
  },
});

// Remove a skill
export const removeSkill = mutation({
  args: {
    skillId: v.id("skills"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const skill = await ctx.db.get(args.skillId);
    if (!skill) {
      throw new Error("Skill not found");
    }

    if (skill.userId !== user._id) {
      throw new Error("You can only remove your own skills");
    }

    await ctx.db.delete(args.skillId);

    return { success: true };
  },
});

// Get my skills
export const getMySkills = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { offering: [], seeking: [] };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return { offering: [], seeking: [] };
    }

    const skills = await ctx.db
      .query("skills")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return {
      offering: skills.filter(s => s.type === "offering"),
      seeking: skills.filter(s => s.type === "seeking"),
    };
  },
});

// Find skill matches (people offering what I'm seeking, or vice versa)
export const findSkillMatch = mutation({
  args: {
    skillName: v.string(),
    type: v.union(v.literal("learn"), v.literal("teach")),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireUser(ctx);

    // If I want to learn, find people offering
    // If I want to teach, find people seeking
    const targetType = args.type === "learn" ? "offering" : "seeking";

    const matches = await ctx.db
      .query("skills")
      .withIndex("by_skill_type", (q) => 
        q.eq("skillName", args.skillName.toLowerCase()).eq("type", targetType)
      )
      .filter((q) => q.neq(q.field("userId"), currentUser._id))
      .collect();

    if (matches.length === 0) {
      return null;
    }

    // Pick a random match for variety
    const randomIndex = Math.floor(Math.random() * matches.length);
    const selectedMatch = matches[randomIndex];

    return {
      skillId: selectedMatch._id,
      userId: selectedMatch.userId,
      skillName: selectedMatch.skillName,
      proficiencyLevel: selectedMatch.proficiencyLevel,
      description: selectedMatch.description,
      category: selectedMatch.category,
      matchType: args.type === "learn" ? "teacher" : "learner",
    };
  },
});

// Request a skill exchange
export const requestSkillExchange = mutation({
  args: {
    teacherId: v.id("users"),
    skillName: v.string(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const learner = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!learner) {
      throw new Error("User not found");
    }

    if (learner._id === args.teacherId) {
      throw new Error("You can't request to learn from yourself");
    }

    const skillNameLower = args.skillName.toLowerCase();
    const now = Date.now();

    const matchId = await ctx.db.insert("skillMatches", {
      teacherId: args.teacherId,
      learnerId: learner._id,
      skillName: skillNameLower,
      status: "pending",
      requestMessage: args.message,
      createdAt: now,
      updatedAt: now,
    });

    const allPendingRequests = await ctx.db
      .query("skillMatches")
      .withIndex("by_learner", (q) => q.eq("learnerId", learner._id))
      .filter((q) => 
        q.and(
          q.eq(q.field("teacherId"), args.teacherId),
          q.eq(q.field("skillName"), skillNameLower),
          q.eq(q.field("status"), "pending")
        )
      )
      .collect();

    if (allPendingRequests.length > 1) {
      const oldestRequest = allPendingRequests.sort((a, b) => a.createdAt - b.createdAt)[0];
      if (oldestRequest._id !== matchId) {
        await ctx.db.delete(matchId);
        throw new Error("You already have a pending request for this skill");
      }
      const newerRequests = allPendingRequests.filter(r => r._id !== oldestRequest._id);
      await Promise.all(newerRequests.map(r => ctx.db.delete(r._id)));
    }

    return { matchId };
  },
});

// Respond to skill exchange request
export const respondToSkillRequest = mutation({
  args: {
    matchId: v.id("skillMatches"),
    accept: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Request not found");
    }

    if (match.teacherId !== user._id) {
      throw new Error("Only the teacher can respond to this request");
    }

    if (match.status !== "pending") {
      throw new Error("This request has already been responded to");
    }

    await ctx.db.patch(args.matchId, {
      status: args.accept ? "active" : "declined",
      updatedAt: Date.now(),
    });

    return { success: true, accepted: args.accept };
  },
});

// Complete a skill exchange
export const completeSkillExchange = mutation({
  args: {
    matchId: v.id("skillMatches"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    if (match.teacherId !== user._id && match.learnerId !== user._id) {
      throw new Error("You are not part of this exchange");
    }

    if (match.status !== "active") {
      throw new Error("Only active exchanges can be completed");
    }

    await ctx.db.patch(args.matchId, {
      status: "completed",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Get my skill exchange requests (incoming)
export const getIncomingRequests = query({
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

    const requests = await ctx.db
      .query("skillMatches")
      .withIndex("by_teacher", (q) => q.eq("teacherId", user._id))
      .order("desc")
      .collect();

    // Enrich with learner info (anonymous)
    const enriched = await Promise.all(
      requests.map(async (r) => {
        const learner = await ctx.db.get(r.learnerId);
        return {
          ...r,
          learnerInterests: learner?.interests?.slice(0, 3),
          learnerCareer: learner?.career,
        };
      })
    );

    return enriched;
  },
});

// Get my skill exchange requests (outgoing)
export const getOutgoingRequests = query({
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

    const requests = await ctx.db
      .query("skillMatches")
      .withIndex("by_learner", (q) => q.eq("learnerId", user._id))
      .order("desc")
      .collect();

    return requests;
  },
});

// Browse all skills being offered
export const browseOfferedSkills = query({
  args: {
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const currentUserId = identity ? (await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first())?._id : null;

    let query = ctx.db
      .query("skills")
      .withIndex("by_type", (q) => q.eq("type", "offering"));

    if (args.category) {
      query = ctx.db
        .query("skills")
        .withIndex("by_category", (q) => q.eq("category", args.category))
        .filter((q) => q.eq(q.field("type"), "offering"));
    }

    const skills = await query.take(args.limit || 50);

    // Group by skill name and count
    const grouped: Record<string, { 
      skillName: string; 
      category?: string; 
      count: number; 
      sample: typeof skills[0];
      userOffering: boolean;
    }> = {};

    skills.forEach(skill => {
      const key = skill.skillName;
      if (grouped[key]) {
        grouped[key].count++;
      } else {
        grouped[key] = {
          skillName: skill.skillName,
          category: skill.category,
          count: 1,
          sample: skill,
          userOffering: skill.userId === currentUserId,
        };
      }
    });

    return Object.values(grouped).sort((a, b) => b.count - a.count);
  },
});

// Browse all skills being sought
export const browseSoughtSkills = query({
  args: {
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("skills")
      .withIndex("by_type", (q) => q.eq("type", "seeking"));

    if (args.category) {
      query = ctx.db
        .query("skills")
        .withIndex("by_category", (q) => q.eq("category", args.category))
        .filter((q) => q.eq(q.field("type"), "seeking"));
    }

    const skills = await query.take(args.limit || 50);

    // Group by skill name and count
    const grouped: Record<string, { 
      skillName: string; 
      category?: string; 
      count: number;
    }> = {};

    skills.forEach(skill => {
      const key = skill.skillName;
      if (grouped[key]) {
        grouped[key].count++;
      } else {
        grouped[key] = {
          skillName: skill.skillName,
          category: skill.category,
          count: 1,
        };
      }
    });

    return Object.values(grouped).sort((a, b) => b.count - a.count);
  },
});

// Get skill categories
export const getCategories = query({
  args: {},
  handler: async () => {
    return SKILL_CATEGORIES;
  },
});

// Get proficiency levels
export const getProficiencyLevels = query({
  args: {},
  handler: async () => {
    return PROFICIENCY_LEVELS;
  },
});

// Search skills
export const searchSkills = query({
  args: {
    query: v.string(),
    type: v.optional(v.union(v.literal("offering"), v.literal("seeking"))),
  },
  handler: async (ctx, args) => {
    const searchTerm = args.query.toLowerCase();

    // Use search index for performance
    let skills = await ctx.db
      .query("skills")
      .withSearchIndex("search_skills", (q) => 
        q.search("skillName", searchTerm)
      )
      .collect();

    // Filter by type if specified
    if (args.type) {
      skills = skills.filter(s => s.type === args.type);
    }

    return skills.slice(0, 20);
  },
});
