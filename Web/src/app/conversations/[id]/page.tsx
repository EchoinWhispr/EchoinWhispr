'use client';

import { useParams } from 'next/navigation';
import { FEATURE_FLAGS } from '@/config/featureFlags';
import { ConversationView } from '@/features/conversations/components/ConversationView';
import { MessageSquare } from 'lucide-react';

/**
 * Individual conversation page - displays a specific conversation.
 * This page is only accessible when the CONVERSATION_EVOLUTION feature flag is enabled.
 */
export default function ConversationPage() {
  const params = useParams();
  const id = params.id as string;

  if (!FEATURE_FLAGS.CONVERSATION_EVOLUTION) {
    return (
      <div className="min-h-[100dvh] pt-20 pb-10 px-4 md:px-8 lg:px-12 flex justify-center items-center">
        <div className="w-full max-w-md glass p-8 rounded-2xl border border-white/10 text-center">
          <div className="bg-primary/10 p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
            <MessageSquare className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">Feature Locked</h1>
          <p className="text-muted-foreground">
            This feature is currently disabled. Check back later!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] pt-20 pb-10 px-4 md:px-8 lg:px-12 flex justify-center">
      <div className="w-full max-w-4xl">
        <ConversationView conversationId={id} />
      </div>
    </div>
  );
}