import { action, ActionCtx } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import { Webhook } from 'svix';
import { WebhookEvent, UserJSON } from '@clerk/clerk-sdk-node';

// Webhook handler for Clerk events
export const clerkWebhook = action({
  args: {
    body: v.string(),
    headers: v.any(),
  },
  handler: async (ctx, args) => {
    const { body, headers } = args;

    // Verify webhook signature for security
    const event = await verifyWebhookSignature(body, headers);
    if (!event) {
      console.error('Invalid webhook signature');
      throw new Error('Unauthorized webhook request');
    }

    try {
      const { type, data } = event;

      console.log(`Received Clerk webhook: ${type}`);

      switch (type) {
        case 'user.created':
          await handleUserCreated(ctx, data);
          break;
        case 'user.updated':
          await handleUserUpdated(ctx, data);
          break;
    case "user.deleted":
      {
        const data: UserDeletedEventData = {
          id: event.data.id,
          deleted: event.data.deleted,
          object: "user",
        };
        await handleUserDeleted(ctx, data);
      }
      break;
        default:
          console.log(`Unhandled webhook event type: ${type}`);
      }

      return { success: true, eventType: type };
    } catch (error) {
      console.error('Error processing webhook:', error);
      throw new Error('Failed to process webhook');
    }
  },
});

// Verify webhook signature using Clerk's signing secret
async function verifyWebhookSignature(
  body: string,
  headers: Record<string, string | string[] | undefined>
): Promise<WebhookEvent | null> {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('CLERK_WEBHOOK_SECRET not configured');
    return null;
  }

  const svix_id = headers['svix-id'] as string;
  const svix_timestamp = headers['svix-timestamp'] as string;
  const svix_signature = headers['svix-signature'] as string;

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return null;
  }

  const wh = new Webhook(webhookSecret);

  try {
    const event = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
    return event;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return null;
  }
}

// Handle user creation event
async function handleUserCreated(ctx: ActionCtx, userData: UserJSON) {
  try {
    const {
      id: clerkId,
      email_addresses,
      first_name,
      last_name,
      username,
    } = userData;

    // Extract primary email
    const primaryEmail = email_addresses?.[0]?.email_address;
    if (!primaryEmail) {
      console.error('No email found for user:', clerkId);
      return;
    }

    // Generate username if not provided
    const userUsername = username || generateUsernameFromEmail(primaryEmail);

    await ctx.runMutation(internal.users.createOrUpdateUser, {
      clerkId,
      username: userUsername,
      email: primaryEmail,
      firstName: first_name || undefined,
      lastName: last_name || undefined,
    });

    console.log(`User created: ${clerkId} (${userUsername})`);
  } catch (error) {
    console.error('Error handling user creation:', error);
    throw error;
  }
}

// Handle user update event
async function handleUserUpdated(ctx: ActionCtx, userData: UserJSON) {
  try {
    const {
      id: clerkId,
      email_addresses,
      first_name,
      last_name,
      username,
    } = userData;

    // Extract primary email
    const primaryEmail = email_addresses?.[0]?.email_address;
    if (!primaryEmail) {
      console.error('No email found for user:', clerkId);
      return;
    }

    // Use existing username or generate new one
    const userUsername = username || generateUsernameFromEmail(primaryEmail);

    await ctx.runMutation(internal.users.createOrUpdateUser, {
      clerkId,
      username: userUsername,
      email: primaryEmail,
      firstName: first_name || undefined,
      lastName: last_name || undefined,
    });

    console.log(`User updated: ${clerkId} (${userUsername})`);
  } catch (error) {
    console.error('Error handling user update:', error);
    throw error;
  }
}

interface UserDeletedEventData {
  id?: string;
  object: 'user';
  deleted: boolean;
}

// Handle user deletion event
async function handleUserDeleted(
  ctx: ActionCtx,
  userData: UserDeletedEventData
) {
  try {
    const { id: clerkId } = userData;
    if (clerkId === undefined) {
      throw new Error("Clerk ID is undefined in webhook event data.");
    }

    // Find user by clerkId
    const user = await ctx.runQuery(internal.users.getByClerkId, { clerkId });
    if (!user) {
      console.log(`User not found for deletion: ${clerkId}`);
      return;
    }

    // Note: In a production app, you might want to soft delete or archive user data
    // For now, we'll just log the deletion
    console.log(`User deletion requested for: ${clerkId} (${user.username})`);

    // Optional: You could implement user deletion logic here
    // await ctx.runMutation(api.users.deleteUser, { userId: user._id });
  } catch (error) {
    console.error('Error handling user deletion:', error);
    throw error;
  }
}

// Generate username from email address
function generateUsernameFromEmail(email: string): string {
  const [localPart] = email.split('@');
  let username = localPart.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  
  if (username.length < 3) {
    username = username.padEnd(3, '0');
  }
  
  if (username.length > 20) {
    username = username.substring(0, 20);
  }
  
  return username;
}
