import { usePaginatedQuery } from 'convex/react';
import { api } from '@/lib/convex';
import { Id, Doc } from '@/lib/convex';

export interface PaginatedMessagesResponse {
  messages: Doc<'messages'>[];
  nextCursor: number | null;
  hasMore: boolean;
}

export const useGetMessages = (
  conversationId: string,
  _cursor?: number | null
): {
  messages: Doc<'messages'>[];
  nextCursor: number | null;
  hasMore: boolean;
  isLoading: boolean;
} => {
  const { results: messages, status } = usePaginatedQuery(
    api.conversations.getMessages,
    { conversationId: conversationId as Id<'conversations'> },
    { initialNumItems: 50 }
  );

  return {
    messages: (messages || []) as Doc<'messages'>[],
    nextCursor: null, // Obsolete
    hasMore: status === "CanLoadMore",
    isLoading: status === "LoadingFirstPage",
  };
};
