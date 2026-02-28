import { usePaginatedQuery } from 'convex/react';
import { api } from '@/lib/convex';
import { Id } from '@/lib/convex';

export const usePaginatedMessages = (conversationId: string) => {
  const { results, status, loadMore } = usePaginatedQuery(
    api.conversations.getMessages,
    { conversationId: conversationId as Id<'conversations'> },
    { initialNumItems: 50 }
  );

  return {
    messages: results.slice().reverse(), // Reverse so newest are at the bottom since they are returned desc
    isLoadingMessages: status === "LoadingFirstPage",
    isLoadingMore: status === "LoadingMore",
    hasMoreMessages: status === "CanLoadMore",
    loadMore: () => loadMore(50),
  };
};
