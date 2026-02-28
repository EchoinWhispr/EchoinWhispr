import { QueryCtx, MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

/**
 * Ensures the current request is authenticated and the user exists in the database.
 * Throws standard Error messages if authentication or lookup fails.
 *
 * @param ctx The Convex QueryCtx or MutationCtx
 * @returns The authenticated user document
 * @throws Error if not authenticated or user not found
 */
export async function requireUser(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}
