/**
 * Whisper service layer for the Web application
 * Handles all whisper-related operations with the Convex backend
 * Provides a clean API for components and hooks to interact with whisper data
 */

import { api } from '../../../lib/convex';
import convex from '../../../lib/convex';
import {
  Whisper,
  WhisperWithSender,
  SendWhisperRequest,
  SendWhisperResponse,
} from '../types';
import {
  createAppError,
  mapConvexErrorToErrorCode,
  withRetry,
  ERROR_CODES,
} from '../../../lib/errors';
import type { GenericId } from 'convex/values';

/**
 * Service class for whisper operations
 * Encapsulates all business logic for whisper management
 */
class WhisperService {
  /**
   * Sends a whisper to a recipient
   * @param request - The whisper request data
   * @param userId - The current user's ID from Clerk
   * @returns Promise resolving to the send response
   */
  async sendWhisper(request: SendWhisperRequest, userId: string): Promise<SendWhisperResponse> {
    try {
      // Validate input
      if (!userId) {
        throw createAppError(ERROR_CODES.UNAUTHORIZED);
      }

      // Prepare whisper data - sendWhisper expects recipientUsername string
      const whisperData = {
        recipientUsername: request.recipientUsername,
        imageUrl: request.imageUrl,
        content: request.content.trim(),
        location: request.location,
      };

      // Send whisper using Convex mutation with retry logic
      const result = await withRetry(async () => {
        if (!convex) throw createAppError(ERROR_CODES.SERVER_ERROR);
        return await convex.mutation(api.whispers.sendWhisper, whisperData);
      });

      return {
        success: true,
        whisperId: result,
      };
    } catch (error) {
      // Handle specific error types
      if (error instanceof Error && 'code' in error) {
        // Already an AppError
        throw error;
      }

      // Map unknown errors to AppError
      const errorCode = mapConvexErrorToErrorCode(error);
      throw createAppError(errorCode, error);
    }
  }

  /**
   * Retrieves all whispers received by the current user
   * @param userId - The current user's ID from Clerk
   * @returns Promise resolving to array of whispers with sender information
   */
  async getReceivedWhispers(userId: string): Promise<WhisperWithSender[]> {
    try {
      if (!userId) {
        throw createAppError(ERROR_CODES.UNAUTHORIZED);
      }

      if (!convex) {
        throw createAppError(ERROR_CODES.SERVER_ERROR);
      }

      const convexUser = await convex.query(api.users.getCurrentUser);
      if (!convexUser) {
        throw createAppError(ERROR_CODES.USER_NOT_FOUND);
      }

      // Fetch whispers using Convex query with retry logic
      // Fetch whispers using Convex query with retry logic
      // Note: Currently limited to first page (20 items). For users with >20 whispers,
      // pagination would need to be implemented by accepting a cursor parameter
      // and forwarding it to paginationOpts.cursor
      const response = await withRetry(async () => {
        if (!convex) throw createAppError(ERROR_CODES.SERVER_ERROR);
        return await convex.query(api.whispers.getReceivedWhispers, { paginationOpts: { numItems: 20, cursor: null } });
      });

      // Extract whispers array from paginated response
      const whispers = response?.page ?? [];

      // Transform whispers to include sender information and computed fields
      const transformedWhispers = this.transformWhispersForDisplay(
        whispers,
        convexUser._id
      );

      return transformedWhispers;
     } catch (error) {
      const errorCode = mapConvexErrorToErrorCode(error);
      throw createAppError(errorCode, error);
    }
  }

  /**
   * Marks a whisper as read
   * @param whisperId - The ID of the whisper to mark as read
   * @param userId - The current user's ID from Clerk
   * @returns Promise resolving when the operation completes
   */
  async markWhisperAsRead(whisperId: string, userId: string): Promise<void> {
    try {
      if (!userId) {
        throw createAppError(ERROR_CODES.UNAUTHORIZED);
      }

      // Mark whisper as read using Convex mutation with retry logic
      await withRetry(async () => {
        if (!convex) throw createAppError(ERROR_CODES.SERVER_ERROR);
        return await convex.mutation(api.whispers.markWhisperAsRead, {
          whisperId: whisperId as GenericId<'whispers'>,
        });
      });
    } catch (error) {
      const errorCode = mapConvexErrorToErrorCode(error);
      throw createAppError(errorCode, error);
    }
  }

  /**
   * Transforms raw whisper data for display purposes
   * Adds computed fields like formatted time, sender info, etc.
   * @param whispers - Raw whisper data from Convex
   * @param currentUserId - Current user's ID for determining ownership
   * @returns Array of whispers with display-friendly data
   */
  private transformWhispersForDisplay(
    whispers: Whisper[],
    currentUserId: GenericId<"users">
  ): WhisperWithSender[] {
    return whispers.map(whisper => {
      // Determine if this whisper belongs to the current user
      const isOwnWhisper = whisper.senderId === currentUserId;

      // Format timestamps for display
      const createdAt = new Date(whisper._creationTime);
      const formattedTime = createdAt.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      // Calculate relative time (e.g., "2 hours ago")
      const relativeTime = this.getRelativeTime(createdAt);

      return {
        ...whisper,
        isOwnWhisper,
        formattedTime,
        relativeTime,
        // Note: In a real implementation, you would fetch sender info from Clerk
        // For now, we'll use placeholder data
        senderName: isOwnWhisper ? 'You' : 'Anonymous',
        senderAvatar: undefined,
      };
    });
  }

  /**
   * Calculates relative time string (e.g., "2 hours ago", "yesterday")
   * @param date - The date to calculate relative time for
   * @returns Human-readable relative time string
   */
  private getRelativeTime(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    const intervals = [
      { label: 'year', seconds: 31536000 },
      { label: 'month', seconds: 2592000 },
      { label: 'day', seconds: 86400 },
      { label: 'hour', seconds: 3600 },
      { label: 'minute', seconds: 60 },
      { label: 'second', seconds: 1 },
    ];

    for (const interval of intervals) {
      const count = Math.floor(diffInSeconds / interval.seconds);
      if (count >= 1) {
        return count === 1
          ? `1 ${interval.label} ago`
          : `${count} ${interval.label}s ago`;
      }
    }

    return 'Just now';
  }
}

// Export singleton instance
export const whisperService = new WhisperService();
export default whisperService;
