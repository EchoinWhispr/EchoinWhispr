import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export const VALIDATION = {
  CHAMBER_MIN_MEMBERS: 2,
  CHAMBER_MAX_MEMBERS: 100,
  WHISPER_MAX_SCHEDULE_DAYS: 30,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 20,
  BIO_MAX_LENGTH: 500,
} as const;

export default defineSchema({
  // Rate Limits table - track rate-limited actions
  rateLimits: defineTable({
    userId: v.id('users'),
    action: v.string(), // 'SEND_WHISPER', 'SEND_FRIEND_REQUEST', etc.
    timestamp: v.number(),
  })
    .index('by_user_action', ['userId', 'action'])
    .index('by_timestamp', ['timestamp']),

  // Admin Roles table - track admin users
  adminRoles: defineTable({
    userId: v.id('users'),
    clerkId: v.string(),
    role: v.union(v.literal('admin'), v.literal('super_admin')),
    grantedBy: v.optional(v.id('users')),
    createdAt: v.number(),
  })
    .index('by_user_id', ['userId'])
    .index('by_clerk_id', ['clerkId']),

  // Admin Requests table - track promotion requests
  adminRequests: defineTable({
    userId: v.id('users'),
    clerkId: v.string(),
    reason: v.string(),
    status: v.union(v.literal('pending'), v.literal('approved'), v.literal('rejected')),
    requestType: v.optional(v.union(v.literal('admin'), v.literal('super_admin'))),
    reviewedBy: v.optional(v.id('users')),
    reviewedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_user_id', ['userId'])
    .index('by_status', ['status']),

  // Users table - synced with Clerk
  users: defineTable({
    clerkId: v.string(),
    username: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    // Added for future profile editing
    displayName: v.optional(v.string()),
    // Added for push notifications
    pushNotificationToken: v.optional(v.string()),
    // Subscription status
    subscriptionStatus: v.optional(v.union(v.literal('free'), v.literal('premium'))),
    // SSD Fields
    career: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    mood: v.optional(v.string()),
    
    createdAt: v.number(),
    updatedAt: v.number(),
    needsUsernameSelection: v.optional(v.boolean()),

    // === NEW: Resonance System Fields ===
    moodJournal: v.optional(v.array(v.object({
      mood: v.string(),
      note: v.optional(v.string()),
      timestamp: v.number(),
    }))),
    lifePhase: v.optional(v.string()), // 'student', 'career-change', 'new-parent', 'exploring', etc.
    seekingMentorship: v.optional(v.boolean()),
    offeringMentorship: v.optional(v.boolean()),

    // === NEW: Quick Wins - User Preferences ===
    readReceiptsEnabled: v.optional(v.boolean()),
    pinnedConversationIds: v.optional(v.array(v.id('conversations'))),
    themePreference: v.optional(v.union(v.literal('light'), v.literal('dark'), v.literal('system'))),

    // === GDPR Compliance: Soft Delete ===
    isDeleted: v.optional(v.boolean()),
    deletedAt: v.optional(v.number()),
  })
    .index('by_clerk_id', ['clerkId'])
    .index('by_username', ['username'])
    .index('by_email', ['email'])
    .index('by_push_token', ['pushNotificationToken'])
    // Add indexes for search/filtering if needed, though full text search might be better for interests
    .index('by_career', ['career'])
    .index('by_mood', ['mood'])
    .index('by_life_phase', ['lifePhase'])
    .index('by_updated_at', ['updatedAt']),

  // Whispers table - core messaging functionality
  whispers: defineTable({
    senderId: v.id('users'),
    recipientId: v.id('users'),
    content: v.string(),
    isRead: v.boolean(),
    createdAt: v.number(),
    readAt: v.optional(v.number()),
    conversationId: v.optional(v.id('conversations')),
    // Deferred feature: IMAGE_UPLOADS - URL/ID of an attached image
    imageUrl: v.optional(v.string()),
    // Deferred feature: LOCATION_BASED_FEATURES - User's location coordinates (with explicit opt-in)
    location: v.optional(v.object({
      latitude: v.number(),
      longitude: v.number()
    })),
    // Deferred feature: WHISPER_CHAINS - Chain-related fields
    chainId: v.optional(v.id('whispers')),
    parentWhisperId: v.optional(v.id('whispers')),
    chainOrder: v.optional(v.number()),
    isChainStart: v.optional(v.boolean()),
    // Deferred feature: MYSTERY_WHISPERS - Mystery whisper flag
    isMystery: v.optional(v.boolean()),

    // === NEW: Voice Whispers ===
    audioStorageId: v.optional(v.id('_storage')),
    audioDuration: v.optional(v.number()), // Duration in seconds
    isVoiceModulated: v.optional(v.boolean()),

    // === NEW: Emoji Reactions ===
    reactions: v.optional(v.array(v.object({
      userId: v.id('users'),
      emoji: v.string(),
      createdAt: v.number(),
    }))),

    // === NEW: Message Scheduling ===
    scheduledFor: v.optional(v.number()), // Future send timestamp
    isScheduled: v.optional(v.boolean()),

    // === NEW: Archiving ===
    isArchived: v.optional(v.boolean()),
  })
    .index('by_sender', ['senderId'])
    .index('by_recipient', ['recipientId'])
    .index('by_sender_recipient', ['senderId', 'recipientId'])
    .index('by_created_at', ['createdAt'])
    .index('by_chain', ['chainId'])
    .index('by_parent', ['parentWhisperId'])
    .index('by_scheduled', ['isScheduled', 'scheduledFor'])
    .index('by_sender_scheduled', ['senderId', 'isScheduled', 'scheduledFor']) // OPTIMIZATION: For sent scheduled whispers
    .index('by_recipient_archived', ['recipientId', 'isArchived']) // OPTIMIZATION: For archived whisper queries
    .index('by_sender_archived', ['senderId', 'isArchived']) // OPTIMIZATION: For sent archived queries
    .index('by_recipient_conversation', ['recipientId', 'conversationId']) // OPTIMIZATION: For standalone whispers
    .index('by_recipient_conversation_isRead', ['recipientId', 'conversationId', 'isRead']), // OPTIMIZATION: For unread whisper counts

  // Conversations table - deferred feature for conversation evolution
  conversations: defineTable({
    participantIds: v.array(v.id("users")),
    participantKey: v.string(),
    initialWhisperId: v.id("whispers"),
    status: v.union(v.literal("initiated"), v.literal("active"), v.literal("closed")),
    createdAt: v.number(),
    updatedAt: v.number(),

    // === NEW: Quick Wins ===
    isArchived: v.optional(v.boolean()),
    isPinned: v.optional(v.boolean()),
    initialSenderId: v.optional(v.id("users")), // Added for optimized echo request fetching
  })
    .index("by_participant_key", ["participantKey"])
    .index("by_initial_whisper", ["initialWhisperId"])
    .index("by_status", ["status"])
    .index("by_archived", ["isArchived"])
    .index("by_initial_sender_status", ["initialSenderId", "status"]),

  // Junction table connecting users to conversations
  conversationParticipants: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    hasUnreadMessages: v.optional(v.boolean()),
    lastReadMessageId: v.optional(v.id("messages")),
    joinedAt: v.number(),
    status: v.optional(v.union(v.literal("initiated"), v.literal("active"), v.literal("closed"))),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_user", ["userId"])
    .index("by_conversation_user", ["conversationId", "userId"])
    .index("by_user_status", ["userId", "status"]),

  // User profiles table - additional user information
  profiles: defineTable({
    userId: v.id('users'),
    bio: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    isPublic: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user_id', ['userId'])
    .index('by_is_public', ['isPublic']),

  // Friends table - friendship relationships between users
  friends: defineTable({
    userId: v.id('users'),
    friendId: v.id('users'),
    status: v.union(
      v.literal('pending'),
      v.literal('accepted'),
      v.literal('blocked')
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
    message: v.optional(v.string()),
  })
    .index('by_user_id', ['userId'])
    .index('by_friend_id', ['friendId'])
    .index('by_user_friend', ['userId', 'friendId'])
    .index('by_status', ['status'])
    .index('by_user_status', ['userId', 'status'])
    .index('by_friend_status', ['friendId', 'status']),

  // Messages table - messages within conversations
  messages: defineTable({
    conversationId: v.id('conversations'),
    senderId: v.id('users'),
    content: v.string(),
    createdAt: v.number(),
    // Deferred feature: IMAGE_UPLOADS - URL/ID of an attached image
    imageUrl: v.optional(v.string()),
  })
    .index('by_conversation', ['conversationId'])
    .index('by_sender', ['senderId'])
    .index('by_conversation_created', ['conversationId', 'createdAt']), // OPTIMIZATION: For pagination within conversations

  // Mystery Settings table - user preferences for mystery whispers
  mysterySettings: defineTable({
    userId: v.id('users'),
    optOut: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user_id', ['userId']),

  // Mystery Whispers Daily Limits table - track daily usage
  mysteryWhisperLimits: defineTable({
    userId: v.id('users'),
    date: v.string(), // YYYY-MM-DD format
    count: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user_date', ['userId', 'date']),

  // Feature Flags table - remote configuration
  featureFlags: defineTable({
    name: v.string(),
    enabled: v.boolean(),
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_name', ['name']),

  // Subscriptions table - manage user subscriptions
  subscriptions: defineTable({
    userId: v.id('users'),
    planId: v.string(), // e.g., 'monthly_premium', 'yearly_premium'
    status: v.union(v.literal('active'), v.literal('canceled'), v.literal('expired')),
    startDate: v.number(),
    endDate: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user_id', ['userId'])
    .index('by_status', ['status']),

  // ============================================================
  // NEW FEATURE TABLES
  // ============================================================

  // === Interest-Based Matching ===
  matchHistory: defineTable({
    userId: v.id('users'),
    matchedUserId: v.id('users'),
    score: v.number(),
    sharedInterests: v.optional(v.array(v.string())),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_time', ['userId', 'createdAt'])
    .index('by_matched_user', ['matchedUserId']),

  // === Echo Chambers (Anonymous Group Messaging) ===
  echoChambers: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    topic: v.string(),
    creatorId: v.id('users'),
    inviteCode: v.string(), // Unique shareable code
    maxMembers: v.number(),
    isPublic: v.boolean(), // Discoverable in search
    memberCount: v.optional(v.number()), // Denormalized for performance
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_invite_code', ['inviteCode'])
    .index('by_creator', ['creatorId'])
    .index('by_topic', ['topic'])
    .index('by_public', ['isPublic']),

  echoChamberMembers: defineTable({
    chamberId: v.id('echoChambers'),
    userId: v.id('users'),
    anonymousAlias: v.string(), // e.g., "Whisper #7"
    aliasColor: v.optional(v.string()), // Unique color for each member
    role: v.union(v.literal('creator'), v.literal('member')),
    joinedAt: v.number(),
    hasChangedAlias: v.optional(v.boolean()), // Track if user has changed their alias (one-time only)
    lastReadAt: v.optional(v.number()), // Track when user last read messages in this chamber
  })
    .index('by_chamber', ['chamberId'])
    .index('by_user', ['userId'])
    .index('by_chamber_user', ['chamberId', 'userId']),

  echoChamberMessages: defineTable({
    chamberId: v.id('echoChambers'),
    senderId: v.id('users'),
    anonymousAlias: v.string(), // Display alias, not user identity
    aliasColor: v.optional(v.string()),
    content: v.string(),
    createdAt: v.number(),
    imageUrl: v.optional(v.string()),

    // Voice message support
    audioStorageId: v.optional(v.id('_storage')),
    audioDuration: v.optional(v.number()),

    // Reactions
    reactions: v.optional(v.array(v.object({
      anonymousAlias: v.string(),
      emoji: v.string(),
      createdAt: v.number(),
    }))),
  })
    .index('by_chamber', ['chamberId'])
    .index('by_created', ['chamberId', 'createdAt']),

  // === Whisper of the Day ===
  dailyPrompts: defineTable({
    content: v.string(),
    category: v.string(), // 'reflection', 'gratitude', 'curiosity', 'connection', etc.
    activeDate: v.optional(v.string()), // YYYY-MM-DD when scheduled
    isActive: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index('by_date', ['activeDate'])
    .index('by_category', ['category'])
    .index('by_active', ['isActive']),

  userPromptResponses: defineTable({
    userId: v.id('users'),
    promptId: v.id('dailyPrompts'),
    respondedAt: v.number(),
    sharedWithUserId: v.optional(v.id('users')), // If shared with someone
  })
    .index('by_user_prompt', ['userId', 'promptId'])
    .index('by_user', ['userId']),

  // === Resonance System (Enhanced Mood Matching) ===
  resonancePreferences: defineTable({
    userId: v.id('users'),
    preferSimilarMood: v.boolean(),
    preferComplementaryMood: v.boolean(), // e.g., anxious → calm mentor
    matchLifePhase: v.boolean(),
    preferMentor: v.optional(v.boolean()),
    preferMentee: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId']),

  // === Skill Exchange ===
  skills: defineTable({
    userId: v.id('users'),
    skillName: v.string(),
    type: v.union(v.literal('offering'), v.literal('seeking')),
    proficiencyLevel: v.optional(v.string()), // 'beginner', 'intermediate', 'expert'
    description: v.optional(v.string()),
    category: v.optional(v.string()), // 'tech', 'creative', 'business', 'lifestyle', etc.
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_skill_type', ['skillName', 'type'])
    .index('by_type', ['type'])
    .index('by_category', ['category'])
    .searchIndex('search_skills', {
      searchField: 'skillName',
      filterFields: ['type', 'category'],
    }),

  skillMatches: defineTable({
    teacherId: v.id('users'),
    learnerId: v.id('users'),
    skillName: v.string(),
    status: v.union(v.literal('pending'), v.literal('active'), v.literal('completed'), v.literal('declined')),
    requestMessage: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_teacher', ['teacherId'])
    .index('by_learner', ['learnerId'])
    .index('by_status', ['status']),

  // === Unmasking Ceremony ===
  unmaskingRequests: defineTable({
    requesterId: v.id('users'),
    targetId: v.id('users'),
    conversationId: v.id('conversations'),
    status: v.union(
      v.literal('pending'),
      v.literal('accepted'),
      v.literal('declined'),
      v.literal('completed'),
      v.literal('mutual_pending') // Both have requested
    ),
    createdAt: v.number(),
    respondedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index('by_requester', ['requesterId'])
    .index('by_target', ['targetId'])
    .index('by_conversation', ['conversationId'])
    .index('by_conversation_requester', ['conversationId', 'requesterId']) // OPTIMIZATION: Finding reqs from user in convo
    .index('by_conversation_target_status', ['conversationId', 'targetId', 'status']) // OPTIMIZATION: Finding pending reqs to user in convo
    .index('by_status', ['status']),

  // === Connection Analytics ===
  connectionAnalytics: defineTable({
    userId: v.id('users'),
    period: v.string(), // 'daily', 'weekly', 'monthly'
    periodStart: v.string(), // YYYY-MM-DD
    messagesSent: v.number(),
    messagesReceived: v.number(),
    newConnections: v.number(),
    avgResponseTimeMs: v.optional(v.number()),
    topInterests: v.optional(v.array(v.string())),
    moodDistribution: v.optional(v.object({
      happy: v.number(),
      neutral: v.number(),
      thoughtful: v.number(),
      excited: v.number(),
    })),
    createdAt: v.number(),
  })
    .index('by_user_period', ['userId', 'period', 'periodStart']),

  // === Typing Indicators (Real-time) ===
  typingIndicators: defineTable({
    conversationId: v.id('conversations'),
    userId: v.id('users'),
    lastTypingAt: v.number(),
  })
    .index('by_conversation', ['conversationId'])
    .index('by_user', ['userId'])
    .index('by_conversation_user', ['conversationId', 'userId']), // OPTIMIZATION: Check existing typing indicator

  // === Echo Chamber Typing (for group chats) ===
  echoChamberTyping: defineTable({
    chamberId: v.id('echoChambers'),
    userId: v.id('users'),
    anonymousAlias: v.string(),
    lastTypingAt: v.number(),
  })
    .index('by_chamber', ['chamberId'])
    .index('by_chamber_user', ['chamberId', 'userId']), // OPTIMIZATION: For efficient typing indicator lookup

  // === File Metadata - Track file ownership for authorization ===
  fileMetadata: defineTable({
    storageId: v.id('_storage'),
    ownerId: v.id('users'),
    fileName: v.optional(v.string()),
    mimeType: v.optional(v.string()),
    size: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_storage_id', ['storageId'])
    .index('by_owner', ['ownerId']),

  // === In-App Notifications ===
  notifications: defineTable({
    userId: v.id('users'),
    type: v.union(
      v.literal('whisper'),         // New whisper received
      v.literal('friend_request'),  // Friend request sent/accepted
      v.literal('chamber'),         // Chamber invite or activity
      v.literal('resonance'),       // Resonance match found
      v.literal('system')           // System announcements
    ),
    title: v.string(),
    message: v.string(),
    read: v.boolean(),
    actionUrl: v.optional(v.string()),  // Where to navigate when clicked
    metadata: v.optional(v.any()),      // Additional data (sender ID, chamber ID, etc.)
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_read', ['userId', 'read'])
    .index('by_created', ['createdAt']),

  // === Username Change Requests ===
  usernameChangeRequests: defineTable({
    userId: v.id('users'),
    currentUsername: v.string(),
    requestedUsername: v.string(),
    status: v.union(
      v.literal('pending'),
      v.literal('approved'),
      v.literal('rejected')
    ),
    reviewedBy: v.optional(v.id('users')),
    reviewNote: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user_id', ['userId'])
    .index('by_status', ['status'])
    .index('by_requested_username', ['requestedUsername'])
    .index('by_requested_username_status', ['requestedUsername', 'status']), // OPTIMIZATION: Checking pending reservations
});

