/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as admin from "../admin.js";
import type * as adminAuth from "../adminAuth.js";
import type * as analytics from "../analytics.js";
import type * as auth from "../auth.js";
import type * as conversations from "../conversations.js";
import type * as cron from "../cron.js";
import type * as dailyPrompts from "../dailyPrompts.js";
import type * as echoChambers from "../echoChambers.js";
import type * as featureFlags from "../featureFlags.js";
import type * as fileMetadata from "../fileMetadata.js";
import type * as fileStorage from "../fileStorage.js";
import type * as friends from "../friends.js";
import type * as matchmaking from "../matchmaking.js";
import type * as mysteryWhispers from "../mysteryWhispers.js";
import type * as notifications from "../notifications.js";
import type * as profiles from "../profiles.js";
import type * as rateLimits from "../rateLimits.js";
import type * as resonance from "../resonance.js";
import type * as skillExchange from "../skillExchange.js";
import type * as subscriptions from "../subscriptions.js";
import type * as unmasking from "../unmasking.js";
import type * as users from "../users.js";
import type * as webhooks from "../webhooks.js";
import type * as whispers from "../whispers.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  adminAuth: typeof adminAuth;
  analytics: typeof analytics;
  auth: typeof auth;
  conversations: typeof conversations;
  cron: typeof cron;
  dailyPrompts: typeof dailyPrompts;
  echoChambers: typeof echoChambers;
  featureFlags: typeof featureFlags;
  fileMetadata: typeof fileMetadata;
  fileStorage: typeof fileStorage;
  friends: typeof friends;
  matchmaking: typeof matchmaking;
  mysteryWhispers: typeof mysteryWhispers;
  notifications: typeof notifications;
  profiles: typeof profiles;
  rateLimits: typeof rateLimits;
  resonance: typeof resonance;
  skillExchange: typeof skillExchange;
  subscriptions: typeof subscriptions;
  unmasking: typeof unmasking;
  users: typeof users;
  webhooks: typeof webhooks;
  whispers: typeof whispers;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
