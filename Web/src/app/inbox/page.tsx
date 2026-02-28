'use client';

import { Suspense, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex';
import type { Id } from '@/lib/convex';
import { useInboxData } from '@/features/inbox/hooks/useInboxData';
import { UnreadCountBadge } from './components/UnreadCountBadge';
import { RefreshButton } from './components/RefreshButton';
import { InboxContent } from './components/InboxContent';
import { ConversationList } from '@/features/conversations/components/ConversationList';
import { Inbox, MessageSquare, Sparkles, Send, Bell } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export const dynamic = 'force-dynamic';

function InboxPageSkeleton() {
  return (
    <div className="min-h-[100dvh] pt-20 pb-10 px-4 md:px-8 lg:px-12 flex justify-center relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute bottom-20 -left-20 w-48 h-48 bg-gradient-to-tr from-accent/15 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s' }} />
      
      <div className="w-full max-w-4xl animate-pulse relative z-10">
        <div className="h-32 bg-gradient-to-br from-primary/10 to-accent/5 rounded-3xl mb-8 border border-white/5 shadow-xl shadow-primary/5"></div>
        <div className="h-96 bg-card/50 rounded-3xl border border-white/5 shadow-xl"></div>
      </div>
    </div>
  );
}

export default function InboxPage() {
  const { toast } = useToast();
  const [replyWhisperId, setReplyWhisperId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  const currentUser = useQuery(api.users.getCurrentUser);
  const echoWhisper = useMutation(api.conversations.echoWhisper);

  const {
    whispers,
    isLoadingWhispers,
    isLoadingMoreWhispers,
    whispersError,
    hasMoreWhispers,
    loadMoreWhispers,
    conversations,
    isLoadingConversations,
    conversationsError,
    isLoading,
    totalUnreadCount,
    refetchAll,
    markAsRead,
  } = useInboxData();

  const currentUserId = currentUser?._id;

  const handleReply = (whisperId: string) => {
    setReplyWhisperId(whisperId);
    setReplyContent('');
  };

  const handleSendReply = async () => {
    if (!replyWhisperId || !replyContent.trim()) return;

    setIsSendingReply(true);
    try {
      await echoWhisper({
        whisperId: replyWhisperId as Id<'whispers'>,
        replyContent: replyContent.trim(),
      });
      
      toast({
        title: "Echo sent! ✨",
        description: "Your conversation has started.",
      });
      
      setReplyWhisperId(null);
      setReplyContent('');
      refetchAll();
    } catch (error) {
      console.error("Failed to send echo:", error);
      toast({
        title: "Failed to send echo",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSendingReply(false);
    }
  };

  return (
    <div className="min-h-[100dvh] pt-20 pb-24 md:pb-10 px-4 md:px-8 lg:px-12 flex justify-center relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Primary Gradient Orb */}
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-gradient-to-br from-primary/25 via-accent/15 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
        
        {/* Secondary Orb */}
        <div className="absolute top-1/2 -left-24 w-64 h-64 bg-gradient-to-tr from-accent/20 via-primary/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s', animationDelay: '1s' }} />
        
        {/* Tertiary Orb */}
        <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-gradient-to-bl from-primary/15 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '2s' }} />
        
        {/* Decorative Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:60px_60px]" />
        
        {/* Floating Decorative Lines */}
        <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
        <div className="absolute top-2/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-accent/10 to-transparent" />
      </div>

      <div className="w-full max-w-4xl relative z-10">
        {/* Premium Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8 glass p-5 sm:p-6 md:p-8 rounded-3xl border border-white/10 relative overflow-hidden group shadow-2xl shadow-primary/10 hover:shadow-primary/15 transition-shadow duration-500">
          {/* Animated Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-accent/10 opacity-50" />
          
          {/* Decorative Orbs */}
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-gradient-to-br from-primary/30 to-transparent rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700" />
          <div className="absolute -bottom-10 -left-10 w-20 h-20 bg-gradient-to-tr from-accent/20 to-transparent rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700" />
          
          {/* Shimmer Effect */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          </div>

          <div className="flex items-center gap-3 md:gap-4 relative z-10">
            <div className="bg-gradient-to-br from-primary via-accent to-primary p-2.5 sm:p-3 md:p-4 rounded-2xl shadow-xl shadow-primary/30 group-hover:shadow-primary/50 transition-shadow relative overflow-hidden">
              {/* Inner Glow */}
              <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent" />
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white relative z-10" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-primary to-accent bg-clip-text text-transparent">
                Your Inbox
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 hidden sm:block">
                Manage your whispers and conversations
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-4 relative z-10">
            <UnreadCountBadge unreadCount={totalUnreadCount} />
            <RefreshButton
              refetchWhispers={refetchAll}
              isLoadingWhispers={isLoading}
            />
          </div>
        </header>

        {/* Main Content Card - Premium Design */}
        <div className="glass rounded-3xl border border-white/10 overflow-hidden p-1.5 shadow-2xl shadow-primary/5 relative group">
          {/* Background Glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          {/* Decorative Corner Elements */}
          <div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-primary/10 to-transparent rounded-br-full blur-xl" />
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl from-accent/10 to-transparent rounded-tl-full blur-xl" />
          
          <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-4 sm:p-5 md:p-6 relative z-10">
            <Tabs defaultValue="whispers" className="w-full">
              {/* Premium Tabs */}
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-gradient-to-r from-secondary/50 to-secondary/30 p-1.5 rounded-2xl h-auto border border-white/5 shadow-lg">
                <TabsTrigger 
                  value="whispers" 
                  className="rounded-xl py-3 md:py-4 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:via-accent data-[state=active]:to-primary data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 transition-all duration-300 hover:bg-white/10 text-muted-foreground hover:text-white group/tab relative overflow-hidden"
                >
                  {/* Shimmer on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover/tab:opacity-100 data-[state=active]:opacity-0 transition-opacity duration-300">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/tab:translate-x-full transition-transform duration-500" />
                  </div>
                  <Inbox className="w-4 h-4 mr-2 relative z-10" />
                  <span className="hidden sm:inline relative z-10">Whispers</span>
                  <span className="sm:hidden relative z-10">Inbox</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="conversations" 
                  className="rounded-xl py-3 md:py-4 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:via-accent data-[state=active]:to-primary data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 transition-all duration-300 hover:bg-white/10 text-muted-foreground hover:text-white group/tab relative overflow-hidden"
                >
                  {/* Shimmer on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover/tab:opacity-100 data-[state=active]:opacity-0 transition-opacity duration-300">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/tab:translate-x-full transition-transform duration-500" />
                  </div>
                  <MessageSquare className="w-4 h-4 mr-2 relative z-10" />
                  <span className="hidden sm:inline relative z-10">Conversations</span>
                  <span className="sm:hidden relative z-10">Chats</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="whispers" className="mt-0 focus-visible:outline-none">
                <Suspense fallback={<InboxPageSkeleton />}>
              <InboxContent
                    whispers={whispers}
                    isLoadingWhispers={isLoadingWhispers}
                    isLoadingMoreWhispers={isLoadingMoreWhispers}
                    whispersError={whispersError}
                    hasMoreWhispers={hasMoreWhispers}
                    loadMoreWhispers={loadMoreWhispers}
                    refetchWhispers={refetchAll}
                    markAsRead={markAsRead}
                    onReply={handleReply}
                  />
                </Suspense>
              </TabsContent>

              <TabsContent value="conversations" className="mt-0 focus-visible:outline-none">
                <Suspense fallback={<InboxPageSkeleton />}>
                  <ConversationList
                    conversations={conversations}
                    isLoading={isLoadingConversations}
                    error={conversationsError}
                    currentUserId={currentUserId}
                    onRefresh={refetchAll}
                  />
                </Suspense>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Premium Reply Dialog */}
      <Dialog open={!!replyWhisperId} onOpenChange={(open) => !open && setReplyWhisperId(null)}>
        <DialogContent className="w-[calc(100vw-32px)] max-w-md mx-auto glass border-primary/20 shadow-2xl shadow-primary/20 bg-gradient-to-br from-card via-card/95 to-card relative overflow-hidden">
          {/* Background Glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />
          
          {/* Decorative Elements */}
          <div className="absolute -top-10 -right-10 w-20 h-20 bg-gradient-to-br from-primary/30 to-transparent rounded-full blur-2xl" />
          <div className="absolute -bottom-10 -left-10 w-16 h-16 bg-gradient-to-tr from-accent/20 to-transparent rounded-full blur-2xl" />
          
          <DialogHeader className="relative z-10">
            <DialogTitle className="flex items-center gap-2 text-lg md:text-xl">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
                <Send className="w-4 h-4 text-white" />
              </div>
              Echo Back
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4 relative z-10">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/10 border border-primary/20">
              <Bell className="w-4 h-4 text-primary" />
              <p className="text-sm text-muted-foreground">
                Your identity will be revealed when you reply.
              </p>
            </div>
            <Textarea
              placeholder="Type your reply here..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              className="min-h-[120px] bg-white/5 border-white/10 focus:border-primary/30 focus:ring-primary/20 resize-none rounded-xl transition-all duration-300 hover:bg-white/10"
            />
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0 relative z-10">
            <Button 
              variant="outline" 
              onClick={() => setReplyWhisperId(null)}
              className="border-white/20 hover:bg-white/10 hover:border-white/30 transition-all duration-300"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSendReply} 
              disabled={!replyContent.trim() || isSendingReply}
              className="gap-2 bg-gradient-to-r from-primary via-accent to-primary hover:from-primary/90 hover:via-accent/90 hover:to-primary/90 shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all duration-300 disabled:opacity-50 relative overflow-hidden group/btn"
            >
              {/* Shimmer Effect */}
              <div className="absolute inset-0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-500" />
              </div>
              
              <span className="relative z-10 flex items-center">
                {isSendingReply ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Echo
                  </>
                )}
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}