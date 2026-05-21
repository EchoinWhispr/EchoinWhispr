import { action, ActionCtx } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import { Webhook } from 'svix';
import { WebhookEvent } from '@clerk/clerk-sdk-node';
import { z } from 'zod';

// Zod schemas for Clerk webhook event data (runtime validation)
const emailAddressSchema = z.object({
  id: z.string(),
  email_address: z.string(),
  verified: z.boolean().optional(),
  primary: z.boolean().optional(),
});

const clerkUserDataSchema = z.object({
  id: z.string(),
  email_addresses: z.array(emailAddressSchema).optional(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
  image_url: z.string().optional(),
  deleted: z.boolean().optional(),
});

const clerkUserDeletedDataSchema = z.object({
  id: z.string(),
  object: z.literal('user'),
  deleted: z.boolean(),
});

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
        case 'user.created': {
          const validated = clerkUserDataSchema.parse(data);
          await handleUserCreated(ctx, validated);
          break;
        }
        case 'user.updated': {
          const validated = clerkUserDataSchema.parse(data);
          await handleUserUpdated(ctx, validated);
          break;
        }
        case 'user.deleted': {
          const validated = clerkUserDeletedDataSchema.parse(data);
          await handleUserDeleted(ctx, validated);
          break;
        }
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

// Extract email and username from validated Clerk user data
function extractUserInfo(data: z.infer<typeof clerkUserDataSchema>) {
  const primaryEmail = data.email_addresses?.[0]?.email_address;
  if (!primaryEmail) {
    return null;
  }
  return {
    clerkId: data.id,
    email: primaryEmail,
    username: data.username || generateUsernameFromEmail(primaryEmail),
    firstName: data.first_name || undefined,
    lastName: data.last_name || undefined,
  };
}

// Handle user creation event
async function handleUserCreated(ctx: ActionCtx, userData: z.infer<typeof clerkUserDataSchema>) {
  try {
    const info = extractUserInfo(userData);
    if (!info) {
      console.error('No email found for user:', userData.id);
      return;
    }

    await ctx.runMutation(internal.users.createOrUpdateUser, {
      clerkId: info.clerkId,
      username: info.username,
      email: info.email,
      firstName: info.firstName,
      lastName: info.lastName,
    });

    console.log(`User created: ${info.clerkId} (${info.username})`);
  } catch (error) {
    console.error('Error handling user creation:', error);
    throw error;
  }
}

// Handle user update event
async function handleUserUpdated(ctx: ActionCtx, userData: z.infer<typeof clerkUserDataSchema>) {
  try {
    const info = extractUserInfo(userData);
    if (!info) {
      console.error('No email found for user:', userData.id);
      return;
    }

    await ctx.runMutation(internal.users.createOrUpdateUser, {
      clerkId: info.clerkId,
      username: info.username,
      email: info.email,
      firstName: info.firstName,
      lastName: info.lastName,
    });

    console.log(`User updated: ${info.clerkId} (${info.username})`);
  } catch (error) {
    console.error('Error handling user update:', error);
    throw error;
  }
}

// Handle user deletion event
async function handleUserDeleted(
  ctx: ActionCtx,
  userData: z.infer<typeof clerkUserDeletedDataSchema>
) {
  try {
    const { id: clerkId } = userData;

    // Find user by clerkId
    const user = await ctx.runQuery(internal.users.getByClerkId, { clerkId });
    if (!user) {
      console.log(`User not found for deletion: ${clerkId}`);
      return;
    }

    console.log(`User deletion requested for: ${clerkId} (${user.username})`);
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
