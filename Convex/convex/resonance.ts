import { requireUser } from './auth';
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Resonance System Module (Enhanced Mood Matching)
 * 
 * Advanced mood matching with life phases, mood journal, and mentorship connections.
 */

// Life phase definitions
export const LIFE_PHASES = [
  { id: "student", label: "Student", description: "Currently studying or in school" },
  { id: "early-career", label: "Early Career", description: "Starting professional journey" },
  { id: "career-growth", label: "Career Growth", description: "Building and advancing career" },
  { id: "career-change", label: "Career Change", description: "Transitioning to new field" },
  { id: "entrepreneurship", label: "Entrepreneurship", description: "Building a business" },
  { id: "freelance", label: "Freelancing", description: "Working independently" },
  { id: "new-parent", label: "New Parent", description: "Navigating parenthood" },
  { id: "exploring", label: "Exploring", description: "Figuring things out" },
  { id: "sabbatical", label: "Sabbatical", description: "Taking time off to reset" },
  { id: "retirement", label: "Semi-Retired", description: "Enjoying more free time" },
];

// Mood definitions with complementary pairs
const MOOD_COMPLEMENTS: Record<string, string[]> = {
  anxious: ["calm", "supportive", "peaceful"],
  stressed: ["relaxed", "encouraging", "helpful"],
  lonely: ["friendly", "outgoing", "welcoming"],
  curious: ["knowledgeable", "excited", "enthusiastic"],
  motivated: ["ambitious", "driven", "energetic"],
  sad: ["uplifting", "compassionate", "understanding"],
  overwhelmed: ["organized", "clear-headed", "patient"],
  stuck: ["creative", "innovative", "problem-solving"],
};

// Update user's life phase
export const updateLifePhase = mutation({
  args: {
    lifePhase: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    await ctx.db.patch(user._id, {
      lifePhase: args.lifePhase,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Update mentorship preferences
export const updateMentorshipPreferences = mutation({
  args: {
    seekingMentorship: v.optional(v.boolean()),
    offeringMentorship: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    await ctx.db.patch(user._id, {
      ...(args.seekingMentorship !== undefined && { seekingMentorship: args.seekingMentorship }),
      ...(args.offeringMentorship !== undefined && { offeringMentorship: args.offeringMentorship }),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Add entry to mood journal
export const addMoodJournalEntry = mutation({
  args: {
    mood: v.string(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const moodJournal = user.moodJournal || [];
    
    // Add new entry (keep last 30 entries)
    const newEntry = {
      mood: args.mood,
      note: args.note,
      timestamp: Date.now(),
    };
    
    const updatedJournal = [...moodJournal, newEntry].slice(-30);

    await ctx.db.patch(user._id, {
      moodJournal: updatedJournal,
      mood: args.mood, // Also update current mood
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Get mood journal
export const getMoodJournal = query({
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

    return (user.moodJournal || []).reverse(); // Most recent first
  },
});

// Update resonance preferences
export const updateResonancePreferences = mutation({
  args: {
    preferSimilarMood: v.boolean(),
    preferComplementaryMood: v.boolean(),
    matchLifePhase: v.boolean(),
    preferMentor: v.optional(v.boolean()),
    preferMentee: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const now = Date.now();

    // Check if preferences exist
    const existing = await ctx.db
      .query("resonancePreferences")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("resonancePreferences", {
        userId: user._id,
        ...args,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

// Get resonance preferences
export const getResonancePreferences = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return null;
    }

    const prefs = await ctx.db
      .query("resonancePreferences")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    // Return preferences with lifePhase from user
    return {
      preferSimilarMood: prefs?.preferSimilarMood ?? true,
      preferComplementaryMood: prefs?.preferComplementaryMood ?? false,
      matchLifePhase: prefs?.matchLifePhase ?? true,
      preferMentor: prefs?.preferMentor ?? false,
      preferMentee: prefs?.preferMentee ?? false,
      lifePhase: user.lifePhase,
    };
  },
});

// Find a resonance match (enhanced mood matching)
export const findResonanceMatch = mutation({
  args: {},
  handler: async (ctx) => {
    const currentUser = await requireUser(ctx);

    // Get user's preferences
    const prefs = await ctx.db
      .query("resonancePreferences")
      .withIndex("by_user", (q) => q.eq("userId", currentUser._id))
      .first();

    const preferences = prefs || {
      preferSimilarMood: true,
      preferComplementaryMood: false,
      matchLifePhase: true,
      preferMentor: false,
      preferMentee: false,
    };

    // Get recent matches to avoid
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentMatches = await ctx.db
      .query("matchHistory")
      .withIndex("by_user_time", (q) => 
        q.eq("userId", currentUser._id).gt("createdAt", twentyFourHoursAgo)
      )
      .collect();
    
    const recentMatchedIds = new Set(recentMatches.map(m => m.matchedUserId));

    // Get updated users candidates (avoid full table scan)
    const allUsers = await ctx.db
      .query("users")
      .withIndex("by_updated_at")
      .order("desc")
      .take(100);
    const eligibleUsers = allUsers.filter(u => 
      u._id !== currentUser._id && 
      !recentMatchedIds.has(u._id)
    );

    if (eligibleUsers.length === 0) {
      return null;
    }

    // Score each user based on resonance factors
    const scoredUsers = eligibleUsers.map(user => {
      let score = 0;
      const matchReasons: string[] = [];

      // Similar mood matching
      if (preferences.preferSimilarMood && currentUser.mood && user.mood) {
        if (currentUser.mood === user.mood) {
          score += 3;
          matchReasons.push(`Both feeling ${user.mood}`);
        }
      }

      // Complementary mood matching
      if (preferences.preferComplementaryMood && currentUser.mood) {
        const complements = MOOD_COMPLEMENTS[currentUser.mood.toLowerCase()] || [];
        if (user.mood && complements.includes(user.mood.toLowerCase())) {
          score += 4;
          matchReasons.push(`Complementary vibes`);
        }
      }

      // Life phase matching
      if (preferences.matchLifePhase && currentUser.lifePhase && user.lifePhase) {
        if (currentUser.lifePhase === user.lifePhase) {
          score += 2;
          matchReasons.push(`Same life phase: ${user.lifePhase}`);
        }
      }

      // Mentorship matching
      if (preferences.preferMentor && user.offeringMentorship) {
        score += 5;
        matchReasons.push("Willing to mentor");
      }
      if (preferences.preferMentee && user.seekingMentorship) {
        score += 5;
        matchReasons.push("Looking for guidance");
      }

      // Shared interests boost
      const sharedInterests = (currentUser.interests || []).filter(i => 
        (user.interests || []).some(ui => ui.toLowerCase() === i.toLowerCase())
      );
      score += sharedInterests.length * 2;
      if (sharedInterests.length > 0) {
        matchReasons.push(`${sharedInterests.length} shared interests`);
      }

      return { user, score, matchReasons, sharedInterests };
    });

    // Filter out zero-score matches and sort
    const validMatches = scoredUsers.filter(m => m.score > 0);
    
    if (validMatches.length === 0) {
      // Fallback to random if no resonance matches
      const randomIndex = Math.floor(Math.random() * eligibleUsers.length);
      const fallbackUser = eligibleUsers[randomIndex];
      
      await ctx.db.insert("matchHistory", {
        userId: currentUser._id,
        matchedUserId: fallbackUser._id,
        score: 0,
        sharedInterests: [],
        createdAt: Date.now(),
      });

      return {
        matchId: fallbackUser._id,
        score: 0,
        matchReasons: ["Random discovery"],
        matchMood: fallbackUser.mood,
        matchLifePhase: fallbackUser.lifePhase,
        sharedInterests: [],
      };
    }

    validMatches.sort((a, b) => b.score - a.score);

    // Pick from top 5 for variety
    const topMatches = validMatches.slice(0, Math.min(5, validMatches.length));
    const randomIndex = Math.floor(Math.random() * topMatches.length);
    const selected = topMatches[randomIndex];

    // Record the match
    await ctx.db.insert("matchHistory", {
      userId: currentUser._id,
      matchedUserId: selected.user._id,
      score: selected.score,
      sharedInterests: selected.sharedInterests,
      createdAt: Date.now(),
    });

    return {
      matchId: selected.user._id,
      score: selected.score,
      matchReasons: selected.matchReasons,
      matchMood: selected.user.mood,
      matchLifePhase: selected.user.lifePhase,
      sharedInterests: selected.sharedInterests,
    };
  },
});

// Get life phases list
export const getLifePhases = query({
  args: {},
  handler: async () => {
    return LIFE_PHASES;
  },
});

// Get mood insights from journal
export const getMoodInsights = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || !user.moodJournal || user.moodJournal.length === 0) {
      return null;
    }

    const journal = user.moodJournal;

    // Calculate mood frequency
    const moodCounts: Record<string, number> = {};
    journal.forEach(entry => {
      moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
    });

    // Find most common mood
    const sortedMoods = Object.entries(moodCounts)
      .sort((a, b) => b[1] - a[1]);
    
    const mostCommonMood = sortedMoods[0]?.[0];

    // Calculate mood trend (last 7 days vs previous)
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    
    const recentEntries = journal.filter(e => e.timestamp > weekAgo);
    const previousEntries = journal.filter(e => 
      e.timestamp > twoWeeksAgo && e.timestamp <= weekAgo
    );

    let trend: "improving" | "stable" | "declining" | "unknown" = "unknown";
    
    // Simple positive/negative mood classification
    const positiveMoods = ["happy", "excited", "motivated", "calm", "grateful", "peaceful"];
    
    if (recentEntries.length >= 3 && previousEntries.length >= 3) {
      const recentPositive = recentEntries.filter(e => 
        positiveMoods.includes(e.mood.toLowerCase())
      ).length / recentEntries.length;
      
      const previousPositive = previousEntries.filter(e => 
        positiveMoods.includes(e.mood.toLowerCase())
      ).length / previousEntries.length;

      if (recentPositive > previousPositive + 0.2) {
        trend = "improving";
      } else if (recentPositive < previousPositive - 0.2) {
        trend = "declining";
      } else {
        trend = "stable";
      }
    }

    return {
      totalEntries: journal.length,
      mostCommonMood,
      moodDistribution: sortedMoods.slice(0, 5),
      trend,
      lastEntry: journal[journal.length - 1],
    };
  },
});
