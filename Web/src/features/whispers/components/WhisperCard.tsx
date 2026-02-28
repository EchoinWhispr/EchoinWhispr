'use client';

import React, { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { ErrorBoundary } from 'react-error-boundary';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WhisperWithSender } from '../types';
import { useMarkAsRead } from '../hooks/useWhispers';
import { formatDistanceToNow } from 'date-fns';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import { FEATURE_FLAGS } from '@/config/featureFlags';
import { 
  CheckCircle2, Clock, User, MapPin, MessageCircle, 
  Link as LinkIcon, ImageOff, Eye
} from 'lucide-react';
import { VoicePlayer } from '@/components/features/VoicePlayer';
import { Id } from '@/lib/convex';

interface WhisperCardProps {
  whisper: WhisperWithSender;
  showMarkAsRead?: boolean;
  onMarkAsRead?: (whisperId: string) => void;
  onReply?: (whisperId: string) => void;
  onChain?: (whisperId: string) => void;
  className?: string;
}

/**
 * Image component with error fallback for whisper attachments.
 */
const ImageWithFallback = ({ src, alt }: { src: string; alt: string }) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  if (hasError) {
    return (
      <div className="mt-4 flex items-center gap-2 p-4 rounded-lg glass text-muted-foreground">
        <ImageOff className="w-5 h-5" />
        <span className="text-sm">Image could not be loaded</span>
      </div>
    );
  }

  return (
    <div className="mt-4 relative rounded-lg overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 bg-white/5 animate-pulse rounded-lg" />
      )}
      <Image
        src={src}
        alt={alt}
        width={400}
        height={300}
        className="w-full max-w-sm h-auto rounded-lg object-cover transition-transform duration-300 hover:scale-[1.02]"
        priority={false}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          console.error('Failed to load image:', src);
          setHasError(true);
        }}
      />
    </div>
  );
};

/**
 * Premium WhisperCard component with glassmorphism effects.
 * 
 * Features:
 * - Glass card styling with hover glow
 * - Read/unread visual distinction
 * - Smooth animations
 * - Action buttons with improved styling
 */
export const WhisperCard: React.FC<WhisperCardProps> = React.memo(
  ({ whisper, showMarkAsRead = true, onMarkAsRead, onReply, onChain, className = '' }) => {
    const { markAsRead, isLoading } = useMarkAsRead();
    const isConversationEvolutionEnabled = useFeatureFlag('CONVERSATION_EVOLUTION');
    const isWhisperChainsEnabled = useFeatureFlag('WHISPER_CHAINS');
    const isLocationEnabled = useFeatureFlag('LOCATION_BASED_FEATURES');

    const handleMarkAsRead = useCallback(async (e: React.MouseEvent) => {
      e.preventDefault();
      try {
        await markAsRead(whisper._id);
        onMarkAsRead?.(whisper._id);
      } catch (error) {
        console.error('Failed to mark whisper as read:', error);
      }
    }, [whisper._id, markAsRead, onMarkAsRead]);

    const handleReply = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      onReply?.(whisper._id);
    }, [whisper._id, onReply]);

    const handleChain = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      onChain?.(whisper._id);
    }, [whisper._id, onChain]);

    const formattedTime = useMemo(() => {
      try {
        return formatDistanceToNow(new Date(whisper._creationTime), {
          addSuffix: true,
        });
      } catch {
        return whisper.relativeTime || 'Unknown time';
      }
    }, [whisper._creationTime, whisper.relativeTime]);

    const cardVariant = whisper.isRead ? 'default' : 'interactive';

    return (
      <Link href={`/whispers/${whisper._id}`} className="block group">
        <Card
          variant={cardVariant}
          className={`
            transition-all duration-300
            ${whisper.isRead 
              ? 'opacity-75 hover:opacity-100' 
              : 'border-primary/20 hover:border-primary/40'
            }
            ${className}
          `}
          role="article"
          aria-label="Whisper message"
        >
          <ErrorBoundary fallback={<div className="p-4 text-center text-destructive text-sm">Failed to render whisper</div>}>
            <CardContent className="p-5">
              <div className="space-y-4">
                {/* Header with sender info and timestamp */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {/* Avatar placeholder */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
                      <User className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <div>
                      <span className="text-sm font-medium">
                        {isConversationEvolutionEnabled && whisper.conversationId
                          ? whisper.senderName || 'Anonymous'
                          : 'Anonymous'}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" aria-hidden="true" />
                        <time dateTime={new Date(whisper._creationTime).toISOString()}>
                          {formattedTime}
                        </time>
                      </div>
                    </div>
                  </div>

                  {/* Status indicators */}
                  <div className="flex items-center gap-2">
                    {!whisper.isRead && (
                      <Badge variant="glow" size="sm" dot dotColor="bg-primary">
                        New
                      </Badge>
                    )}
                    {whisper.isRead && (
                      <Badge variant="muted" size="sm">
                        <Eye className="w-3 h-3 mr-1" />
                        Read
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Whisper content */}
                <div className={`text-sm leading-relaxed break-words whitespace-pre-wrap ${whisper.isRead ? 'text-muted-foreground' : 'text-foreground'}`}>
                  {whisper.content}
                </div>

                {/* Image display */}
                {FEATURE_FLAGS.IMAGE_UPLOADS && whisper.imageUrl && (
                  <ImageWithFallback 
                    src={whisper.imageUrl} 
                    alt="Whisper image attachment" 
                  />
                )}

                {/* Voice Message */}
                {whisper.audioStorageId && (
                  <div className="mt-3">
                    <VoicePlayer
                      storageId={whisper.audioStorageId as Id<'_storage'>}
                      whisperId={whisper._id as Id<'whispers'>}
                      duration={whisper.audioDuration || 0}
                    />
                  </div>
                )}

                {/* Location display */}
                {isLocationEnabled && whisper.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground glass px-3 py-2 rounded-lg w-fit">
                    <MapPin className="w-4 h-4 text-accent" aria-hidden="true" />
                    <span>
                      {whisper.location.latitude.toFixed(4)}, {whisper.location.longitude.toFixed(4)}
                    </span>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap justify-end pt-3 border-t border-white/5 gap-2">
                  {/* Reply / Echo Back */}
                  {isConversationEvolutionEnabled && !whisper.isOwnWhisper && onReply && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleReply}
                      className="h-8 px-3 text-xs gap-1.5 hover:text-accent hover:bg-accent/10"
                      aria-label="Reply to whisper"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Echo Back
                    </Button>
                  )}

                  {/* Add to Chain */}
                  {isWhisperChainsEnabled && whisper.isOwnWhisper && onChain && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleChain}
                      className="h-8 px-3 text-xs gap-1.5 hover:text-primary hover:bg-primary/10"
                      aria-label="Add to chain"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      Chain
                    </Button>
                  )}

                  {/* Mark as Read */}
                  {showMarkAsRead && !whisper.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleMarkAsRead}
                      disabled={isLoading}
                      className="h-8 px-3 text-xs gap-1.5 hover:text-success hover:bg-success/10"
                      aria-label="Mark whisper as read"
                    >
                      {isLoading ? (
                        <span className="animate-pulse">Marking...</span>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Mark as Read
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </ErrorBoundary>
        </Card>
      </Link>
    );
  }
);

WhisperCard.displayName = 'WhisperCard';
