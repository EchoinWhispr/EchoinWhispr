/**
 * Custom hooks for whisper operations
 * Provides React-friendly APIs for whisper functionality with real-time updates
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { usePaginatedQuery, useMutation } from 'convex/react';
import { api } from '../../../lib/convex';
import { whisperService } from '../services/whisperService';
import {
  WhisperWithSender,
  SendWhisperRequest,
  SendWhisperResponse,
} from '../types';
import { AppError } from '../../../lib/errors';
import { useToast } from '../../../hooks/use-toast';

/**
 * Hook for sending whispers with optimistic updates
 * @returns Object with send function, loading state, and error handling
 */
export function useSendWhisper() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const { toast } = useToast();

  const sendWhisperMutation = useMutation(api.whispers.sendWhisper);

  /**
   * Sends a whisper with optimistic updates
   * @param request - The whisper request data
   * @returns Promise resolving to the send response
   */
  const sendWhisper = useCallback(
    async (request: SendWhisperRequest): Promise<SendWhisperResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const whisperData = {
          recipientUsername: request.recipientUsername,
          imageUrl: request.imageUrl,
          content: request.content.trim(),
          location: request.location,
        };

        const result = await sendWhisperMutation(whisperData);

        // Show success toast
        toast({
          title: 'Whisper sent!',
          description: 'Your anonymous message has been delivered.',
        });

        return { success: true, whisperId: result } as SendWhisperResponse;
      } catch (err) {
        const whisperError = err as AppError;
        setError(whisperError);

        // Show error toast
        toast({
          title: 'Failed to send whisper',
          description:
            whisperError.message || 'Something went wrong. Please try again.',
          variant: 'destructive',
        });

        throw whisperError;
      } finally {
        setIsLoading(false);
      }
    },
    [toast, sendWhisperMutation]
  );

  return {
    sendWhisper,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}

/**
 * Calculates relative time string (e.g., "2 hours ago", "yesterday")
 * @param date - The date to calculate relative time for
 * @returns Human-readable relative time string
 */
function getRelativeTime(date: Date): string {
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

/**
 * Hook for receiving whispers with real-time subscriptions and pagination.
 * Loads 10 whispers at a time with a "Load More" button.
 * @returns Object with whispers data, loading state, pagination, and error handling
 */
export function useReceivedWhispers() {
  const {
    results,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.whispers.getReceivedWhispers,
    {},
    { initialNumItems: 10 }
  );

  const whispers = useMemo(() => {
    return (results ?? []).map(whisper => ({
      ...whisper,
      isOwnWhisper: false,
      formattedTime: new Date(whisper._creationTime).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }),
      relativeTime: getRelativeTime(new Date(whisper._creationTime)),
      senderName: 'Anonymous',
      senderAvatar: undefined,
    })) as WhisperWithSender[];
  }, [results]);

  const unreadCount = useMemo(() => {
    return whispers.filter((whisper: WhisperWithSender) => !whisper.isRead).length;
  }, [whispers]);

  const hasUnread = useMemo(() => {
    return unreadCount > 0;
  }, [unreadCount]);

  const isLoading = status === 'LoadingFirstPage';
  const isLoadingMore = status === 'LoadingMore';
  const hasMore = status === 'CanLoadMore';

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      loadMore(10);
    }
  }, [hasMore, isLoadingMore, loadMore]);

  return {
    whispers,
    isLoading,
    isLoadingMore,
    isRefreshing: false,
    error: null,
    unreadCount,
    hasUnread,
    hasMore,
    loadMore: handleLoadMore,
    // Convex reactive queries auto-update; no manual refetch needed
    refetch: () => {},
    clearError: () => {},
  };
}


/**
 * Hook for marking whispers as read
 * @returns Object with markAsRead function, loading state, and error handling
 */
export function useMarkAsRead() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const { toast } = useToast();
  const { user } = useUser();

  /**
   * Marks a whisper as read with optimistic updates
   * @param whisperId - The ID of the whisper to mark as read
   */
  const markAsRead = useCallback(
    async (whisperId: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        await whisperService.markWhisperAsRead(whisperId, user?.id || '');
      } catch (err) {
        const whisperError = err as AppError;
        setError(whisperError);

        toast({
          title: 'Failed to mark as read',
          description:
            whisperError.message || 'Something went wrong. Please try again.',
          variant: 'destructive',
        });

        throw whisperError;
      } finally {
        setIsLoading(false);
      }
    },
    [toast, user?.id]
  );

  return {
    markAsRead,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}

/**
 * Combined hook that provides all whisper functionality
 * @returns Object with all whisper operations and state
 */
export function useWhispers() {
  const sendWhisperHook = useSendWhisper();
  const receivedWhispers = useReceivedWhispers();
  const markAsReadHook = useMarkAsRead();

  return {
    // Send functionality
    sendWhisper: sendWhisperHook.sendWhisper,
    isSending: sendWhisperHook.isLoading,
    sendError: sendWhisperHook.error,

    // Receive functionality
    whispers: receivedWhispers.whispers,
    isLoadingWhispers: receivedWhispers.isLoading,
    isLoadingMoreWhispers: receivedWhispers.isLoadingMore,
    whispersError: receivedWhispers.error,
    unreadCount: receivedWhispers.unreadCount,
    hasUnread: receivedWhispers.hasUnread,
    hasMoreWhispers: receivedWhispers.hasMore,
    loadMoreWhispers: receivedWhispers.loadMore,
    refetchWhispers: receivedWhispers.refetch,

    // Mark as read functionality
    markAsRead: markAsReadHook.markAsRead,
    isMarkingAsRead: markAsReadHook.isLoading,
    markAsReadError: markAsReadHook.error,

    // Utility functions
    clearErrors: () => {
      sendWhisperHook.clearError();
      receivedWhispers.clearError();
      markAsReadHook.clearError();
    },
  };
}
