import { ConvexReactClient } from 'convex/react';
import { api } from '../../../Convex/convex/_generated/api';

/**
 * Validates that the Convex URL environment variable is set and is an absolute URL
 * Enhanced with diagnostic logging for debugging purposes
 */
function validateConvexUrl(): string | null {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!convexUrl) {
    console.warn('NEXT_PUBLIC_CONVEX_URL environment variable is not set. Running in fallback mode.');
    return null;
  }

  try {
    const url = new URL(convexUrl);
    const isValidProtocol =
      url.protocol === 'http:' || url.protocol === 'https:';

    if (!isValidProtocol) {
      console.warn('NEXT_PUBLIC_CONVEX_URL must be an absolute URL starting with http:// or https://');
      return null;
    }

    return convexUrl;
  } catch (error) {
    console.warn(`NEXT_PUBLIC_CONVEX_URL is not a valid absolute URL: ${convexUrl}`);
    return null;
  }
}

/**
 * Creates and configures the Convex client with diagnostic logging
 */
export function getConvexClient(): ConvexReactClient | null {
  try {
    const convexUrl = validateConvexUrl();
    if (!convexUrl) return null;
    const client = new ConvexReactClient(convexUrl);
    return client;
  } catch (error) {
    console.error('Failed to create Convex client:', error);
    return null;
  }
}

const convex = getConvexClient();

export default convex;
export { api };

export type { Id, Doc } from '../../../Convex/convex/_generated/dataModel';
