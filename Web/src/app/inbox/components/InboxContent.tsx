'use client';

/**
 * Content component that handles the inbox logic with read/unread filtering
 * and paginated load-more support.
 */
import { useState, useMemo } from 'react';
import { WhisperList } from '@/features/whispers/components/WhisperList';
import { WhisperWithSender } from '@/features/whispers/types';
import { AppError } from '@/lib/errors';
import { Button } from '@/components/ui/button';
import { Loader2, Inbox, MailOpen, Mail } from 'lucide-react';

type FilterType = 'all' | 'unread' | 'read';

interface InboxContentProps {
  whispers: WhisperWithSender[] | undefined;
  isLoadingWhispers: boolean;
  isLoadingMoreWhispers?: boolean;
  whispersError: AppError | null;
  hasMoreWhispers?: boolean;
  loadMoreWhispers?: () => void;
  refetchWhispers: () => void;
  markAsRead: (whisperId: string) => Promise<void>;
  onReply: (whisperId: string) => void;
}

export function InboxContent({
  whispers,
  isLoadingWhispers,
  isLoadingMoreWhispers = false,
  whispersError,
  hasMoreWhispers = false,
  loadMoreWhispers,
  refetchWhispers,
  markAsRead,
  onReply,
}: InboxContentProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredWhispers = useMemo(() => {
    if (!whispers) return [];
    switch (filter) {
      case 'unread':
        return whispers.filter(w => !w.isRead);
      case 'read':
        return whispers.filter(w => w.isRead);
      default:
        return whispers;
    }
  }, [whispers, filter]);

  const unreadCount = useMemo(() => whispers?.filter(w => !w.isRead).length ?? 0, [whispers]);
  const readCount = useMemo(() => whispers?.filter(w => w.isRead).length ?? 0, [whispers]);

  // Show loading state
  if (isLoadingWhispers) {
    return (
      <div className="space-y-4 py-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-white/5 border border-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  // Show error state
  if (whispersError) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center">
          <Mail className="w-8 h-8 text-destructive/50" />
        </div>
        <div>
          <h3 className="text-lg font-medium mb-1">Unable to load inbox</h3>
          <p className="text-muted-foreground text-sm">
            {whispersError.message || 'An unexpected error occurred while loading your inbox.'}
          </p>
        </div>
        <Button onClick={() => refetchWhispers()} variant="outline" size="sm" className="gap-2">
          Try Again
        </Button>
      </div>
    );
  }

  // Show empty state if no whispers at all
  if (!whispers || whispers.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shadow-lg shadow-primary/10">
          <Inbox className="w-10 h-10 text-primary/50" />
        </div>
        <div>
          <h3 className="text-lg font-medium mb-1">Your inbox is empty</h3>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            You haven&apos;t received any whispers yet. Share your profile to start receiving anonymous messages!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex items-center gap-2 py-1">
        <FilterButton
          active={filter === 'all'}
          onClick={() => setFilter('all')}
          label="All"
          count={whispers.length}
          icon={<Inbox className="w-3.5 h-3.5" />}
        />
        <FilterButton
          active={filter === 'unread'}
          onClick={() => setFilter('unread')}
          label="Unread"
          count={unreadCount}
          icon={<Mail className="w-3.5 h-3.5" />}
          highlight={unreadCount > 0}
        />
        <FilterButton
          active={filter === 'read'}
          onClick={() => setFilter('read')}
          label="Read"
          count={readCount}
          icon={<MailOpen className="w-3.5 h-3.5" />}
        />
      </div>

      {/* Empty filtered state */}
      {filteredWhispers.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-white/5 flex items-center justify-center">
            {filter === 'unread' ? (
              <Mail className="w-6 h-6 opacity-30" />
            ) : (
              <MailOpen className="w-6 h-6 opacity-30" />
            )}
          </div>
          <p className="text-sm">
            No {filter === 'all' ? '' : filter} whispers
          </p>
        </div>
      ) : (
        <>
          <WhisperList
            whispers={filteredWhispers}
            isLoading={false}
            error={whispersError}
            showMarkAsRead={true}
            onWhisperMarkAsRead={markAsRead}
            onReply={onReply}
            emptyStateMessage={`No ${filter === 'all' ? '' : filter} whispers found.`}
            emptyStateActionLabel="Refresh Inbox"
            onEmptyStateAction={refetchWhispers}
          />

          {/* Load More Button — only show on 'all' filter since we paginate the source */}
          {filter === 'all' && hasMoreWhispers && (
            <div className="flex justify-center pt-4 pb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadMoreWhispers}
                disabled={isLoadingMoreWhispers}
                className="gap-2 min-w-[120px] border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
              >
                {isLoadingMoreWhispers ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </Button>
            </div>
          )}

          {/* Loading more indicator at bottom */}
          {filter === 'all' && !hasMoreWhispers && whispers.length >= 10 && (
            <p className="text-center text-xs text-muted-foreground/50 py-2">
              All whispers loaded
            </p>
          )}
        </>
      )}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  label,
  count,
  icon,
  highlight = false,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
        active
          ? 'bg-gradient-to-r from-primary/20 to-accent/10 text-white border border-primary/30 shadow-sm shadow-primary/10'
          : 'text-muted-foreground hover:text-white hover:bg-white/5 border border-transparent'
      }`}
    >
      {icon}
      {label}
      <span
        className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold transition-colors ${
          active
            ? 'bg-primary/30 text-white'
            : highlight
            ? 'bg-primary/20 text-primary'
            : 'bg-white/10 text-muted-foreground'
        }`}
      >
        {count}
      </span>
    </button>
  );
}