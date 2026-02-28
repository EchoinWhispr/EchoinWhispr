import { requireUser } from './auth';
import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

/**
 * Connection Analytics Module
 * 
 * Track user engagement metrics and provide insights about connection patterns.
 */

// Record an analytics event (internal function)
export const recordEvent = internalMutation({
  args: {
    userId: v.id("users"),
    eventType: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // This would be called from other functions to track events
    // For now, we'll update the aggregated analytics
    
    const today = new Date().toISOString().split("T")[0];
    
    const existing = await ctx.db
      .query("connectionAnalytics")
      .withIndex("by_user_period", (q) => 
        q.eq("userId", args.userId).eq("period", "daily").eq("periodStart", today)
      )
      .first();

    if (existing) {
      const updates: Partial<typeof existing> = {};
      
      switch (args.eventType) {
        case "message_sent":
          updates.messagesSent = (existing.messagesSent || 0) + 1;
          break;
        case "message_received":
          updates.messagesReceived = (existing.messagesReceived || 0) + 1;
          break;
        case "new_connection":
          updates.newConnections = (existing.newConnections || 0) + 1;
          break;
      }

      await ctx.db.patch(existing._id, updates);
    } else {
      await ctx.db.insert("connectionAnalytics", {
        userId: args.userId,
        period: "daily",
        periodStart: today,
        messagesSent: args.eventType === "message_sent" ? 1 : 0,
        messagesReceived: args.eventType === "message_received" ? 1 : 0,
        newConnections: args.eventType === "new_connection" ? 1 : 0,
        createdAt: Date.now(),
      });
    }
  },
});

// Get weekly insights
export const getWeeklyInsights = query({
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

    // Get last 7 days of data
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split("T")[0]);
    }

    // OPTIMIZATION: Add .take() limit instead of collect()
    const analytics = await ctx.db
      .query("connectionAnalytics")
      .withIndex("by_user_period", (q) => 
        q.eq("userId", user._id).eq("period", "daily")
      )
      .take(30); // Max 30 days of daily data

    const weekData = dates.map(date => {
      const dayData = analytics.find(a => a.periodStart === date);
      return {
        date,
        messagesSent: dayData?.messagesSent || 0,
        messagesReceived: dayData?.messagesReceived || 0,
        newConnections: dayData?.newConnections || 0,
      };
    });

    // Calculate totals
    const totals = weekData.reduce(
      (acc, day) => ({
        messagesSent: acc.messagesSent + day.messagesSent,
        messagesReceived: acc.messagesReceived + day.messagesReceived,
        newConnections: acc.newConnections + day.newConnections,
      }),
      { messagesSent: 0, messagesReceived: 0, newConnections: 0 }
    );

    // Calculate trend vs previous week
    const previousWeekStart = new Date();
    previousWeekStart.setDate(previousWeekStart.getDate() - 14);
    
    const previousWeekData = analytics.filter(a => {
      const aDate = new Date(a.periodStart);
      return aDate >= previousWeekStart && aDate < new Date(dates[0]);
    });

    const previousTotals = previousWeekData.reduce(
      (acc, day) => ({
        messagesSent: acc.messagesSent + (day.messagesSent || 0),
        messagesReceived: acc.messagesReceived + (day.messagesReceived || 0),
        newConnections: acc.newConnections + (day.newConnections || 0),
      }),
      { messagesSent: 0, messagesReceived: 0, newConnections: 0 }
    );

    const calculateTrend = (current: number, previous: number): string => {
      if (previous === 0) return current > 0 ? "up" : "stable";
      const change = ((current - previous) / previous) * 100;
      if (change > 10) return "up";
      if (change < -10) return "down";
      return "stable";
    };

    return {
      dailyData: weekData,
      totals,
      previousTotals,
      trends: {
        messagesSent: calculateTrend(totals.messagesSent, previousTotals.messagesSent),
        messagesReceived: calculateTrend(totals.messagesReceived, previousTotals.messagesReceived),
        newConnections: calculateTrend(totals.newConnections, previousTotals.newConnections),
      },
      avgMessagesPerDay: Math.round((totals.messagesSent + totals.messagesReceived) / 7 * 10) / 10,
    };
  },
});

// Get monthly insights
export const getMonthlyInsights = query({
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

    // Get last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().split("T")[0];

    // OPTIMIZATION: Add .take() limit instead of collect()
    const analytics = await ctx.db
      .query("connectionAnalytics")
      .withIndex("by_user_period", (q) => 
        q.eq("userId", user._id).eq("period", "daily")
      )
      .filter((q) => q.gte(q.field("periodStart"), startDate))
      .take(60); // Max 60 days of data

    const totals = analytics.reduce(
      (acc, day) => ({
        messagesSent: acc.messagesSent + (day.messagesSent || 0),
        messagesReceived: acc.messagesReceived + (day.messagesReceived || 0),
        newConnections: acc.newConnections + (day.newConnections || 0),
      }),
      { messagesSent: 0, messagesReceived: 0, newConnections: 0 }
    );

    // Group by week for chart
    const weeklyData: Record<string, typeof totals> = {};
    analytics.forEach(day => {
      const date = new Date(day.periodStart);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split("T")[0];

      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = { messagesSent: 0, messagesReceived: 0, newConnections: 0 };
      }
      weeklyData[weekKey].messagesSent += day.messagesSent || 0;
      weeklyData[weekKey].messagesReceived += day.messagesReceived || 0;
      weeklyData[weekKey].newConnections += day.newConnections || 0;
    });

    // Find most active day
    const mostActiveDay = analytics.reduce(
      (max, day) => {
        const totalActivity = (day.messagesSent || 0) + (day.messagesReceived || 0);
        const maxActivity = (max.messagesSent || 0) + (max.messagesReceived || 0);
        return totalActivity > maxActivity ? day : max;
      },
      analytics[0] || { messagesSent: 0, messagesReceived: 0, periodStart: "" }
    );

    // Get top interests from connections
    const topInterests = analytics
      .flatMap(a => a.topInterests || [])
      .reduce((acc, interest) => {
        acc[interest] = (acc[interest] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const sortedInterests = Object.entries(topInterests)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([interest]) => interest);

    return {
      totals,
      weeklyData: Object.entries(weeklyData)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([week, data]) => ({ week, ...data })),
      mostActiveDay: mostActiveDay.periodStart,
      daysActive: analytics.length,
      avgResponseTime: analytics.reduce(
        (sum, a) => sum + (a.avgResponseTimeMs || 0), 0
      ) / Math.max(analytics.length, 1),
      topInterests: sortedInterests,
    };
  },
});

// Get connection health score
export const getConnectionHealth = query({
  args: {
    friendId: v.id("users"),
  },
  handler: async (ctx, args) => {
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

    // Get conversation between users
    const participantKey = [user._id, args.friendId].sort().join("-");
    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_participant_key", (q) => q.eq("participantKey", participantKey))
      .first();

    if (!conversation) {
      return { score: 0, status: "no_conversation" };
    }

    // Get message history (OPTIMIZATION: add limit)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversation._id))
      .filter((q) => q.gt(q.field("createdAt"), thirtyDaysAgo))
      .take(200); // Reasonable limit for health calculation

    const myMessages = messages.filter(m => m.senderId === user._id);
    const theirMessages = messages.filter(m => m.senderId === args.friendId);

    // Calculate health score (0-100)
    let score = 0;

    // Frequency component (0-40)
    const messageCount = messages.length;
    if (messageCount > 30) score += 40;
    else if (messageCount > 15) score += 30;
    else if (messageCount > 5) score += 20;
    else if (messageCount > 0) score += 10;

    // Balance component (0-30)
    const balance = Math.min(myMessages.length, theirMessages.length) / 
                    Math.max(myMessages.length, theirMessages.length, 1);
    score += Math.round(balance * 30);

    // Recency component (0-30)
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      const daysSinceLast = (Date.now() - lastMessage.createdAt) / (24 * 60 * 60 * 1000);
      
      if (daysSinceLast < 1) score += 30;
      else if (daysSinceLast < 3) score += 25;
      else if (daysSinceLast < 7) score += 20;
      else if (daysSinceLast < 14) score += 10;
      else if (daysSinceLast < 30) score += 5;
    }

    return {
      score,
      status: score >= 70 ? "thriving" : score >= 40 ? "healthy" : score >= 20 ? "needs_attention" : "dormant",
      messageCount,
      balance: Math.round(balance * 100),
      lastActivity: messages.length > 0 ? messages[messages.length - 1].createdAt : null,
    };
  },
});

// Generate year in review data
export const getYearInReview = query({
  args: {
    year: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
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

    const year = args.year || new Date().getFullYear();
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;

    // OPTIMIZATION: Add .take() limit instead of collect()
    const analytics = await ctx.db
      .query("connectionAnalytics")
      .withIndex("by_user_period", (q) => 
        q.eq("userId", user._id).eq("period", "daily")
      )
      .filter((q) => 
        q.and(
          q.gte(q.field("periodStart"), yearStart),
          q.lte(q.field("periodStart"), yearEnd)
        )
      )
      .take(400); // Max ~365 days + buffer

    if (analytics.length === 0) {
      return null;
    }

    // Calculate totals
    const totals = analytics.reduce(
      (acc, day) => ({
        messagesSent: acc.messagesSent + (day.messagesSent || 0),
        messagesReceived: acc.messagesReceived + (day.messagesReceived || 0),
        newConnections: acc.newConnections + (day.newConnections || 0),
      }),
      { messagesSent: 0, messagesReceived: 0, newConnections: 0 }
    );

    // Monthly breakdown
    const monthlyData: Record<string, typeof totals> = {};
    analytics.forEach(day => {
      const month = day.periodStart.substring(0, 7); // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = { messagesSent: 0, messagesReceived: 0, newConnections: 0 };
      }
      monthlyData[month].messagesSent += day.messagesSent || 0;
      monthlyData[month].messagesReceived += day.messagesReceived || 0;
      monthlyData[month].newConnections += day.newConnections || 0;
    });

    // Find peak month
    const peakMonth = Object.entries(monthlyData).reduce(
      (max, [month, data]) => {
        const totalActivity = data.messagesSent + data.messagesReceived;
        const maxActivity = max.data.messagesSent + max.data.messagesReceived;
        return totalActivity > maxActivity ? { month, data } : max;
      },
      { month: Object.keys(monthlyData)[0], data: monthlyData[Object.keys(monthlyData)[0]] || totals }
    );

    // Days active
    const daysActive = analytics.filter(
      a => (a.messagesSent || 0) + (a.messagesReceived || 0) > 0
    ).length;

    // Streak calculations
    let longestStreak = 0;
    let currentStreak = 0;
    
    const sortedDays = analytics
      .map(a => a.periodStart)
      .sort();
    
    for (let i = 0; i < sortedDays.length; i++) {
      if (i === 0) {
        currentStreak = 1;
      } else {
        const prevDate = new Date(sortedDays[i - 1]);
        const currDate = new Date(sortedDays[i]);
        const diffDays = (currDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000);
        
        if (diffDays === 1) {
          currentStreak++;
        } else {
          currentStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, currentStreak);
    }

    return {
      year,
      totals,
      totalMessages: totals.messagesSent + totals.messagesReceived,
      monthlyData: Object.entries(monthlyData)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, data]) => ({ month, ...data })),
      peakMonth: peakMonth.month,
      daysActive,
      totalDays: analytics.length,
      longestStreak,
      avgMessagesPerActiveDay: Math.round((totals.messagesSent + totals.messagesReceived) / Math.max(daysActive, 1)),
    };
  },
});

// Update analytics (manual trigger for testing)
export const updateDailyAnalytics = mutation({
  args: {
    messagesSent: v.optional(v.number()),
    messagesReceived: v.optional(v.number()),
    newConnections: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const today = new Date().toISOString().split("T")[0];

    const existing = await ctx.db
      .query("connectionAnalytics")
      .withIndex("by_user_period", (q) => 
        q.eq("userId", user._id).eq("period", "daily").eq("periodStart", today)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        messagesSent: (existing.messagesSent || 0) + (args.messagesSent || 0),
        messagesReceived: (existing.messagesReceived || 0) + (args.messagesReceived || 0),
        newConnections: (existing.newConnections || 0) + (args.newConnections || 0),
      });
    } else {
      await ctx.db.insert("connectionAnalytics", {
        userId: user._id,
        period: "daily",
        periodStart: today,
        messagesSent: args.messagesSent || 0,
        messagesReceived: args.messagesReceived || 0,
        newConnections: args.newConnections || 0,
        createdAt: Date.now(),
      });
    }

    return { success: true };
  },
});
