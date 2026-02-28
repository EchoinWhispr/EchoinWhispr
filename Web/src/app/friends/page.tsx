'use client';

import { useState, useEffect } from 'react';
import { Users, UserPlus, Search, Sparkles, Lock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FEATURE_FLAGS } from '@/config/featureFlags';
import { FriendsList, FriendRequestCard } from '@/features/friends/components';
import { useFriends, useFriendRequests, useRemoveFriend, useAcceptFriendRequest, useRejectFriendRequest, useSendFriendRequest } from '@/features/friends/hooks';
import { Id } from '@/lib/convex';
import { useQuery } from 'convex/react';
import { api } from '@/lib/convex';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function FriendsPage() {
  const [activeTab, setActiveTab] = useState('friends');

  if (!FEATURE_FLAGS.FRIENDS) {
    return (
      <div className="min-h-[100dvh] pt-20 pb-10 px-4 md:px-8 lg:px-12 flex justify-center items-center">
        <div className="w-full max-w-md glass p-8 rounded-2xl border border-white/10 text-center">
          <div className="bg-primary/10 p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">Feature Locked</h1>
          <p className="text-muted-foreground">
            Friends feature is currently disabled. Check back later!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] pt-20 pb-24 md:pb-10 px-4 md:px-8 lg:px-12 flex justify-center">
      <div className="w-full max-w-4xl">
        <header className="flex items-center gap-3 mb-6 md:mb-8 glass p-4 sm:p-6 rounded-2xl border border-white/10">
          <div className="bg-primary/20 p-2 sm:p-2.5 rounded-xl flex-shrink-0">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Friends</h1>
            <p className="text-muted-foreground text-sm hidden sm:block">Manage your connections in the void</p>
          </div>
        </header>

        <div className="glass rounded-2xl border border-white/10 overflow-hidden p-1">
          <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6 bg-secondary/50 p-1 rounded-xl h-auto">
                <TabsTrigger 
                  value="friends" 
                  className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 py-2"
                >
                  <Users className="w-4 h-4 sm:mr-2 flex-shrink-0" />
                  <span className="hidden sm:inline">Friends</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="requests" 
                  className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 py-2"
                >
                  <UserPlus className="w-4 h-4 sm:mr-2 flex-shrink-0" />
                  <span className="hidden sm:inline">Requests</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="find" 
                  className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 py-2"
                >
                  <Search className="w-4 h-4 sm:mr-2 flex-shrink-0" />
                  <span className="hidden sm:inline">Find</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="mood" 
                  className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 py-2"
                >
                  <Sparkles className="w-4 h-4 sm:mr-2 flex-shrink-0" />
                  <span className="hidden sm:inline">Mood</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="friends" className="mt-0 focus-visible:outline-none">
                <FriendsTab />
              </TabsContent>

              <TabsContent value="requests" className="mt-0 focus-visible:outline-none">
                <RequestsTab />
              </TabsContent>

              <TabsContent value="find" className="mt-0 focus-visible:outline-none">
                <FindFriendsTab />
              </TabsContent>

              <TabsContent value="mood" className="mt-0 focus-visible:outline-none">
                <MoodMatchTab />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

function FriendsTab() {
  const { friends, isLoading } = useFriends();
  const { removeFriend } = useRemoveFriend();

  const handleRemoveFriend = async (friendshipId: string) => {
    try {
      await removeFriend(friendshipId as Id<'friends'>);
    } catch (error) {
      console.error('Failed to remove friend:', error);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">Your Friends</h2>
      <FriendsList
        friends={friends}
        onRemoveFriend={handleRemoveFriend}
        isLoading={isLoading}
      />
    </div>
  );
}

function RequestsTab() {
  const { receivedRequests, sentRequests, isLoading } = useFriendRequests();
  const { acceptFriendRequest } = useAcceptFriendRequest();
  const { rejectFriendRequest } = useRejectFriendRequest();

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await acceptFriendRequest(requestId as Id<'friends'>);
    } catch (error) {
      console.error('Failed to accept friend request:', error);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await rejectFriendRequest(requestId as Id<'friends'>);
    } catch (error) {
      console.error('Failed to reject friend request:', error);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium mb-4">Received Requests</h3>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(2)].map((_, index) => (
              <div key={index} className="h-20 bg-primary/5 rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : receivedRequests.length === 0 ? (
          <div className="text-center py-12 bg-secondary/20 rounded-xl border border-white/5">
            <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No pending friend requests</p>
          </div>
        ) : (
          <div className="space-y-4">
            {receivedRequests.map((request) => (
              <FriendRequestCard
                key={request.friendshipId}
                request={request}
                onAccept={handleAcceptRequest}
                onReject={handleRejectRequest}
                isAccepting={false}
                isRejecting={false}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-medium mb-4">Sent Requests</h3>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(2)].map((_, index) => (
              <div key={index} className="h-20 bg-primary/5 rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : sentRequests.length === 0 ? (
          <div className="text-center py-12 bg-secondary/20 rounded-xl border border-white/5">
            <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No sent friend requests</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sentRequests.map((request) => (
              <div key={request.friendshipId} className="p-4 border border-white/10 rounded-xl bg-secondary/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-primary/20 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{request.recipient?.username || 'Unknown User'}</p>
                      <p className="text-sm text-muted-foreground">Request sent</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                    Pending
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FindFriendsTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const { sendFriendRequest, isLoading: isSending } = useSendFriendRequest();
  
  const currentUser = useQuery(api.users.getCurrentUser);
  const debouncedQuery = useDebounce(searchQuery, 500);
  const users = useQuery(
    api.users.searchUsers, 
    debouncedQuery.length >= 2 
      ? { query: debouncedQuery, excludeUserId: currentUser?._id } 
      : 'skip'
  );

  const handleSendRequest = async (userId: string) => {
    try {
      await sendFriendRequest({ friendId: userId as Id<'users'> });
    } catch (error) {
      console.error('Failed to send friend request:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users by username..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-secondary/20 border-white/10"
        />
      </div>

      <div className="space-y-4">
        {searchQuery.length < 2 ? (
          <div className="text-center py-12 text-muted-foreground">
            Type at least 2 characters to search...
          </div>
        ) : !users ? (
          <div className="space-y-4">
             {[...Array(3)].map((_, i) => (
               <div key={i} className="h-16 bg-secondary/20 rounded-xl animate-pulse" />
             ))}
          </div>
        ) : users.results.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No users found matching &quot;{searchQuery}&quot;
          </div>
        ) : (
          <div className="grid gap-4">
            {users.results.map((user) => (
              <div key={user._id} className="flex items-center justify-between gap-3 p-4 rounded-xl bg-secondary/20 border border-white/5">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="flex-shrink-0">
                    <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{user.displayName || user.username}</p>
                    <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
                    {user.career && <p className="text-xs text-muted-foreground truncate">{user.career}</p>}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleSendRequest(user._id)}
                  disabled={isSending}
                  className="gap-2 flex-shrink-0"
                >
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Friend</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MoodMatchTab() {
  const [mood, setMood] = useState('');
  const [match, setMatch] = useState<typeof api.users.findMoodMatch._returnType>(null);
  const [isSearching, setIsSearching] = useState(false);
  const { sendFriendRequest, isLoading: isSending } = useSendFriendRequest();
  
  const [triggerSearch, setTriggerSearch] = useState(false);
  
  const matchResult = useQuery(api.users.findMoodMatch, triggerSearch ? { mood: mood || undefined } : 'skip');

  useEffect(() => {
    if (matchResult) {
      setMatch(matchResult);
      setTriggerSearch(false); 
      setIsSearching(false);
    } else if (matchResult === null && triggerSearch) {
       setIsSearching(false);
    }
  }, [matchResult, triggerSearch]);

  const handleFindMatch = () => {
    setMatch(null);
    setIsSearching(true);
    setTriggerSearch(true);
  };

  const handleSendRequest = async (userId: string) => {
    try {
      await sendFriendRequest({ friendId: userId as Id<'users'> });
    } catch (error) {
      console.error('Failed to send friend request:', error);
    }
  };

  return (
    <div className="space-y-8 text-center">
      <div className="max-w-md mx-auto space-y-4">
        <h2 className="text-xl font-semibold">Find Your Mood Match</h2>
        <p className="text-muted-foreground">
          Enter your current mood or leave blank to use your profile mood. We&apos;ll find someone who feels the same way.
        </p>
        
        <div className="flex gap-2">
          <Input 
            placeholder="How are you feeling? (e.g. Creative, Focused)" 
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            className="bg-secondary/20 border-white/10"
          />
          <Button onClick={handleFindMatch} disabled={isSearching || triggerSearch}>
            {isSearching ? <Sparkles className="w-4 h-4 animate-spin" /> : 'Match'}
          </Button>
        </div>
      </div>

      {match ? (
        <div className="max-w-md mx-auto p-6 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
          <div className="flex flex-col items-center gap-4">
            <Avatar className="w-20 h-20 border-2 border-primary/20">
              <AvatarFallback className="text-2xl">{match.username.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h3 className="text-lg font-bold">{match.displayName || match.username}</h3>
              <p className="text-sm text-muted-foreground">@{match.username}</p>
              {match.mood && (
                <span className="inline-block mt-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium">
                  {match.mood}
                </span>
              )}
            </div>
            <Button 
              className="w-full gap-2"
              onClick={() => handleSendRequest(match._id)}
              disabled={isSending}
            >
              <UserPlus className="w-4 h-4" />
              Connect
            </Button>
          </div>
        </div>
      ) : triggerSearch && !matchResult ? (
         <div className="py-12">
           <Sparkles className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
           <p className="text-muted-foreground">Scanning the void for resonance...</p>
         </div>
      ) : null}
      
      {!isSearching && !triggerSearch && !match && matchResult === null && (
         <div className="py-12 text-muted-foreground">
           No matches found at this moment. Try a different mood!
         </div>
      )}
    </div>
  );
}

// Simple debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}