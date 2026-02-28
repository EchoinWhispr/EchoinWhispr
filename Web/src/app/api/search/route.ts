import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../Convex/convex/_generated/api';

import { auth } from '@clerk/nextjs/server';

function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  if (!origin) {
    return true;
  }

  const allowedOrigins: string[] = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : null,
    'http://localhost:3000',
    'https://localhost:3000',
  ].filter(Boolean) as string[];

  for (const allowed of allowedOrigins) {
    if (origin === allowed) {
      return true;
    }
  }

  try {
    const originUrl = new URL(origin);
    if (host && originUrl.host === host) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

/**
 * POST /api/search
 *
 * Handles user search requests for the compose page.
 * Searches for users by username or email with authentication and validation.
 */
export async function POST(request: NextRequest) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json(
        { error: 'Forbidden - Invalid origin' },
        { status: 403 }
      );
    }

    // Authenticate the request using Clerk
    const { userId, getToken } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { query, limit = 20, offset = 0 } = body;

    // Validate search query
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Search query must be a non-empty string' },
        { status: 400 }
      );
    }

    if (query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters long' },
        { status: 400 }
      );
    }

    if (query.length > 100) {
      return NextResponse.json(
        { error: 'Search query must be less than 100 characters long' },
        { status: 400 }
      );
    }

    // Validate pagination parameters
    const parsedLimit = Number(limit);
    let parsedOffset = Number(offset);

    if (!Number.isFinite(parsedLimit) || !Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
      return NextResponse.json(
        { error: 'Limit must be an integer between 1 and 50' },
        { status: 400 }
      );
    }

    if (!Number.isFinite(parsedOffset) || parsedOffset < 0) {
      return NextResponse.json(
        { error: 'Offset must be a non-negative number' },
        { status: 400 }
      );
    }

    parsedOffset = Math.floor(parsedOffset);

    // Initialize Convex client
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      console.error('NEXT_PUBLIC_CONVEX_URL environment variable not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const convex = new ConvexHttpClient(convexUrl);

    // Get the Convex auth token from Clerk and pass it to the Convex client
    // This is critical — without this, Convex cannot authenticate the user
    const convexToken = await getToken({ template: 'convex' });
    if (convexToken) {
      convex.setAuth(convexToken);
    }

    // Get the current user from Convex using Clerk ID to obtain the Convex user ID
    const currentUser = await convex.query(api.users.getUserByClerkId, {
      clerkId: userId,
    });

    if (!currentUser) {
      console.error('Authenticated user not found in Convex database');
      return NextResponse.json(
        { error: 'User data not found' },
        { status: 404 }
      );
    }

    // Call Convex search function with the proper Convex user ID
    const searchResult = await convex.query(api.users.searchUsers, {
      query: query.trim(),
      limit: parsedLimit,
      offset: parsedOffset,
      excludeUserId: currentUser._id,
    });

    // Return the search results
    return NextResponse.json(searchResult);

  } catch (error) {
    console.error('User search API error:', error);

    // Handle specific Convex errors
    if (error instanceof Error) {
      if (error.message.includes('must be at least 2 characters')) {
        return NextResponse.json(
          { error: 'Search query too short' },
          { status: 400 }
        );
      }
    }

    // Generic error response
    return NextResponse.json(
      { error: 'An error occurred while searching users' },
      { status: 500 }
    );
  }
}
