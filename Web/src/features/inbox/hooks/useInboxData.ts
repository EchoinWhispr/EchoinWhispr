import { useCallback } from 'react';
import { useWhispers } from '@/features/whispers/hooks/useWhispers';
import { useGetConversations } from '@/features/conversations/hooks/useGetConversations';

export const useInboxData = () => {
  const {
    whispers,
    isLoadingWhispers,
    isLoadingMoreWhispers,
    whispersError,
    unreadCount: whisperUnreadCount,
    hasMoreWhispers,
    loadMoreWhispers,
    refetchWhispers,
    markAsRead,
  } = useWhispers();

  const {
    conversations,
    isLoading: isLoadingConversations,
    error: conversationsError,
  } = useGetConversations();

  const totalUnreadCount = whisperUnreadCount;

  const isLoading = isLoadingWhispers || isLoadingConversations;

  const hasError = whispersError || conversationsError;
  const error = whispersError || conversationsError;

  // Convex reactive queries update automatically; refetch is a no-op
  // but we keep the interface compatible
  const refetchAll = useCallback(() => {
    refetchWhispers();
  }, [refetchWhispers]);

  return {
    whispers: whispers || [],
    isLoadingWhispers,
    isLoadingMoreWhispers,
    whispersError,
    hasMoreWhispers,
    loadMoreWhispers,

    conversations: conversations || [],
    isLoadingConversations,
    conversationsError,

    isLoading,
    hasError,
    error,
    totalUnreadCount,

    refetchAll,
    markAsRead,
  };
};