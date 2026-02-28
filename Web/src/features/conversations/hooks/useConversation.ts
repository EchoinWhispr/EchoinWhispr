import { useQuery } from 'convex/react';
import { usePaginatedQuery } from 'convex/react';
import { api } from '@/lib/convex';
import type { GenericId } from 'convex/values';
import type { Conversation, Message } from '../types';

export const useConversation = (conversationId: GenericId<"conversations"> | null): {
  conversation: Conversation | null,
  messages: Message[],
  isLoading: boolean,
  nextCursor: number | null,
  hasMore: boolean
} => {
  const conversation = useQuery(api.conversations.getConversation, conversationId ? { conversationId } : 'skip');
  
  const { results: messages, status } = usePaginatedQuery(
    api.conversations.getMessages,
    conversationId ? { conversationId } : 'skip',
    { initialNumItems: 50 }
  );

  const isLoading = conversation === undefined || status === "LoadingFirstPage";

  return {
    conversation: conversation || null,
    messages: (messages || []) as Message[],
    nextCursor: null, // Obsolete with usePaginatedQuery
    hasMore: status === "CanLoadMore",
    isLoading,
  };
};
