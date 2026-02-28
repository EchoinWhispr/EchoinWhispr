import { useMutation } from 'convex/react';
import { useState } from 'react';
import { api, Id } from '@/lib/convex';
import { useToast } from '@/hooks/use-toast';

export const useSendMessage = () => {
  const sendMessageMutation = useMutation(api.conversations.sendMessage);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sendMessage = async (conversationId: Id<'conversations'>, content: string, imageUrl?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!content.trim()) {
        throw new Error('Message content cannot be empty');
      }

      if (content.length > 1000) {
        throw new Error('Message content cannot exceed 1000 characters');
      }

      return await sendMessageMutation({
        conversationId,
        content: content.trim(),
        imageUrl,
      });
    } catch (err) {
      console.error('Failed to send message:', err);

      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      const errorObj = err instanceof Error ? err : new Error(errorMessage);
      setError(errorObj);
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });

      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sendMessage,
    isLoading,
    error,
  };
};