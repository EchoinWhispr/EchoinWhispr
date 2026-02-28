'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, User, Paperclip, X, ChevronDown, Loader2, ArrowLeft } from 'lucide-react';
import { Doc } from '@/lib/convex';
import { Id } from '@/lib/convex';
import { useSendMessage } from '../hooks/useSendMessage';
import { usePaginatedMessages } from '../hooks/usePaginatedMessages';
import { formatDistanceToNow } from 'date-fns';
import { FEATURE_FLAGS } from '@/config/featureFlags';
import { ErrorBoundary } from 'react-error-boundary';
import { FileUpload } from '@/components/ui/file-upload';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import React, { memo } from 'react';

const MessageList = memo(({ 
  messages, 
  userId, 
  messagesEndRef 
}: { 
  messages: Doc<'messages'>[], 
  userId: string | undefined, 
  messagesEndRef: React.RefObject<HTMLDivElement> 
}) => (
  <div className="space-y-4">
    {messages.map((msg) => (
      <div
        key={msg._id}
        className={`flex ${msg.senderId === userId ? 'justify-end' : 'justify-start'}`}
      >
        <div
          className={`max-w-[75%] sm:max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
            msg.senderId === userId
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted'
          }`}
        >
          {FEATURE_FLAGS.CONVERSATION_EVOLUTION && msg.imageUrl && (
            <div className="mb-2 overflow-hidden">
              <Image
                src={msg.imageUrl}
                alt="Attached image"
                width={200}
                height={200}
                loading="lazy"
                className="rounded-md object-cover max-w-full h-auto"
                style={{ maxWidth: '200px', maxHeight: '200px' }}
              />
            </div>
          )}
          <p className="text-sm break-words whitespace-pre-wrap">{msg.content}</p>
          <p className="text-xs opacity-70 mt-1">
            {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
          </p>
        </div>
      </div>
    ))}
    <div ref={messagesEndRef} />
  </div>
));
MessageList.displayName = 'MessageList';

const SCROLL_THRESHOLD = 100;

export const ConversationView: React.FC<{ conversationId: string }> = ({ conversationId }) => {
  const { user } = useUser();
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [attachedImageUrl, setAttachedImageUrl] = useState<string | undefined>(undefined);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | undefined>(undefined);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [optimisticMessage, setOptimisticMessage] = useState<any>(null);
  const prevMessagesLengthRef = useRef(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);
  const isMountedRef = useRef(true);
  
  const { sendMessage, isLoading: isSending } = useSendMessage();
  const { messages: allMessages, isLoadingMessages, isLoadingMore, hasMoreMessages, loadMore } = usePaginatedMessages(conversationId);
  const { toast } = useToast();
  
  const displayMessages = React.useMemo(() => {
    if (!optimisticMessage) return allMessages;
    // Don't show optimistic if the real one already arrived (basic dedupe by content/time if necessary, but nulling it on resolve works for basic UX)
    return [...allMessages, optimisticMessage];
  }, [allMessages, optimisticMessage]);

  const isMessageTooLong = message.trim().length > 1000;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (allMessages.length > prevMessagesLengthRef.current) {
      const newMessagesCount = allMessages.length - prevMessagesLengthRef.current;
      if ((newMessagesCount === 1 && isNearBottom) || prevMessagesLengthRef.current === 0) {
        scrollToBottom();
      }
      prevMessagesLengthRef.current = allMessages.length;
    }
  }, [allMessages.length, isNearBottom, scrollToBottom]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      const nearBottom = distanceFromBottom <= SCROLL_THRESHOLD;
      
      setIsNearBottom(nearBottom);
      setShowScrollButton(!nearBottom);
    };

    container.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isLoadingMore) {
      const container = messagesContainerRef.current;
      if (container) {
        scrollPositionRef.current = container.scrollHeight;
      }
    } else {
      const container = messagesContainerRef.current;
      if (container && scrollPositionRef.current > 0) {
        // We just finished loading more, adjust scroll to stay in same relative position
        const prevScrollHeight = scrollPositionRef.current;
        requestAnimationFrame(() => {
          const newScrollHeight = container.scrollHeight;
          if (newScrollHeight > prevScrollHeight) {
             container.scrollTop = newScrollHeight - prevScrollHeight;
          }
          scrollPositionRef.current = 0;
        });
      }
    }
  }, [isLoadingMore, allMessages.length]);

  const handleLoadMore = useCallback(() => {
    loadMore();
  }, [loadMore]);

  const handleSendMessage = async () => {
    if ((!message.trim() && !attachedImageUrl) || isMessageTooLong) return;

    try {
      const currentMsg = message.trim();
      const currentImg = attachedImageUrl;
      
      setOptimisticMessage({
        _id: `temp_${Date.now()}`,
        _creationTime: Date.now(),
        conversationId,
        senderId: user?.id,
        content: currentMsg,
        imageUrl: currentImg,
        isRead: false,
        isOptimistic: true
      });

      if (isMountedRef.current) {
        setMessage('');
        setAttachedImageUrl(undefined);
        setPreviewImageUrl(undefined);
      }
      
      scrollToBottom();
      
      await sendMessage(conversationId as Id<'conversations'>, currentMsg, currentImg);
      
      if (isMountedRef.current) {
        setOptimisticMessage(null);
      }
    } catch (error) {
      if (isMountedRef.current) {
        setOptimisticMessage(null);
        // Restore the message if the send fails
        setMessage(message);
        setAttachedImageUrl(attachedImageUrl);
        setPreviewImageUrl(previewImageUrl);
      }
      toast({
        title: "Failed to send message",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  };

  if (isLoadingMessages && allMessages.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading conversation...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] pt-[64px] pb-0 md:h-[calc(100dvh-64px)] overflow-hidden">
      <Card className="mb-4 flex-shrink-0">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="icon" onClick={() => window.history.length > 2 ? router.back() : router.push('/conversations')} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              Conversation
            </CardTitle>
          </div>
          <p className="text-sm text-muted-foreground ml-10">
            Both participants&apos; identities are now revealed
          </p>
        </CardHeader>
      </Card>

      <Card className="flex-1 mb-4 overflow-hidden relative">
        <CardContent ref={messagesContainerRef} className="p-4 h-full overflow-y-auto scrollbar-hide">
          {hasMoreMessages && (
            <div className="flex justify-center pb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="text-xs"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load older messages'
                )}
              </Button>
            </div>
          )}
          
          {displayMessages && displayMessages.length > 0 ? (
            <ErrorBoundary fallback={<div className="p-4 text-center text-destructive text-sm">Failed to load messages</div>}>
              <MessageList 
                messages={displayMessages} 
                userId={user?.id} 
                messagesEndRef={messagesEndRef as React.RefObject<HTMLDivElement>} 
              />
            </ErrorBoundary>
           ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>No messages yet. Start the conversation!</p>
            </div>
          )}
        </CardContent>
        
        {showScrollButton && (
          <Button
            variant="secondary"
            size="icon"
            className="absolute bottom-4 right-4 rounded-full shadow-lg h-10 w-10"
            onClick={scrollToBottom}
            aria-label="Scroll to bottom"
          >
            <ChevronDown className="h-5 w-5" />
          </Button>
        )}
      </Card>

      <div className="flex-shrink-0 sticky bottom-0 bg-background/95 backdrop-blur-sm pt-2 pb-4 safe-bottom z-10">
        <form 
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
        >
          <div className="flex-1 flex flex-col">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className={cn("touch-target", isMessageTooLong && "border-destructive focus-visible:ring-destructive")}
              disabled={isLoadingMessages || isSending}
            />
            {isMessageTooLong && (
              <p className="text-xs text-destructive mt-1">
                Message too long (max 1000 chars)
              </p>
            )}
          </div>
          {FEATURE_FLAGS.CONVERSATION_EVOLUTION && (
            <Button
              onClick={() => setShowImageUpload(!showImageUpload)}
              variant="outline"
              size="icon"
              disabled={isLoadingMessages}
              className="touch-target"
              aria-label={showImageUpload ? 'Close image upload' : 'Attach image'}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          )}
          <Button
            onClick={handleSendMessage}
            disabled={(!message.trim() && !attachedImageUrl) || isMessageTooLong || isSending}
            loading={isSending}
            size="icon"
            className="touch-target"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
        {FEATURE_FLAGS.CONVERSATION_EVOLUTION && showImageUpload && (
          <FileUpload
            onFileUploaded={(storageId, url) => {
              setAttachedImageUrl(url);
              setPreviewImageUrl(url);
              setShowImageUpload(false);
            }}
            onUploadError={(error) => {
              console.error('Image upload error:', error);
              setShowImageUpload(false);
            }}
            onUploadCancel={() => setShowImageUpload(false)}
            className="mt-2"
          />
        )}
        {FEATURE_FLAGS.CONVERSATION_EVOLUTION && previewImageUrl && (
          <div className="mt-2 relative inline-block">
            <Image
              src={previewImageUrl}
              alt="Preview"
              width={100}
              height={100}
              className="rounded-md object-cover"
            />
            <Button
              onClick={() => {
                setAttachedImageUrl(undefined);
                setPreviewImageUrl(undefined);
              }}
              variant="destructive"
              size="sm"
              className="absolute -top-2 -right-2 h-6 w-6 p-0"
              aria-label="Remove attached image"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
