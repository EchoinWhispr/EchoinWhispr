'use client';

import { useQuery } from 'convex/react';
import { api } from '@/lib/convex';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { 
  MessageSquare, 
  Radio, 
  Sparkles, 
  Send,
  Inbox,
  Heart,
  Compass,
  Clock,
  Target,
  Zap,
  Mail,
  ArrowRight,
  Image as ImageIcon,
  UserPlus
} from 'lucide-react';
import { useUser, useAuth } from '@clerk/nextjs';
import { Skeleton } from '@/components/ui/skeletons';
import { useEffect, useState, useRef } from 'react';

function DashboardStatPillSkeleton() {
  return (
    <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl bg-muted/50 border border-border">
      <Skeleton className="w-8 h-8 md:w-10 md:h-10 rounded-xl" />
      <div className="min-w-0">
        <Skeleton className="h-5 w-8 md:w-10 mb-1" />
        <Skeleton className="h-3 w-10 md:w-14" />
      </div>
    </div>
  );
}

function DashboardWhisperSkeleton() {
  return (
    <div className="p-4 rounded-xl bg-muted/50 border border-border">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-full" />
        </div>
        <Skeleton className="w-12 h-12 rounded-xl" />
      </div>
    </div>
  );
}

function DashboardChamberSkeleton() {
  return (
    <div className="p-4 rounded-xl bg-muted/50 border border-border">
      <div className="flex items-start justify-between mb-2">
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-5 w-20 rounded-full mb-2" />
      <Skeleton className="h-3 w-48 mt-2" />
    </div>
  );
}

function DashboardHeaderSkeleton() {
  return (
    <div className="relative p-6 md:p-8">
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-10 w-64 md:w-80" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="hidden md:block h-10 w-32 rounded-full" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <DashboardStatPillSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function Dashboard() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const isMountedRef = useRef(true);
  
  const currentUser = useQuery(api.users.getCurrentUser);
  const isDeleted = useQuery(api.users.isCurrentUserDeleted);
  const pendingFriendRequests = useQuery(api.friends.getPendingRequests);
  const friendsList = useQuery(api.friends.getFriendsList, { limit: 10 });
  const myChambers = useQuery(api.echoChambers.getMyChambers);
  const resonancePrefs = useQuery(api.resonance.getResonancePreferences);
  const receivedWhispers = useQuery(api.whispers.getReceivedWhispers, { 
    paginationOpts: { numItems: 5, cursor: null } 
  });

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (isDeleted === true) {
      signOut()
        .then(() => {
          if (isMountedRef.current) {
            router.push('/account-deleted');
          }
        })
        .catch((error) => {
          console.error('Sign out failed:', error);
        });
    }
  }, [isDeleted, signOut, router]);

  const isLoading = 
    currentUser === undefined ||
    isDeleted === undefined ||
    pendingFriendRequests === undefined ||
    friendsList === undefined ||
    myChambers === undefined ||
    resonancePrefs === undefined ||
    receivedWhispers === undefined;

  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentDate(new Date());
  }, []);

  const getGreeting = () => {
    if (!currentDate) return 'Hello';
    const hour = currentDate.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formatDate = () => {
    if (!currentDate) return '';
    return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  const displayName = currentUser?.displayName || currentUser?.username || user?.firstName || 'there';
  const pendingRequests = pendingFriendRequests?.length || 0;
  const friendCount = friendsList?.totalCount || 0;
  const chambersCount = myChambers?.length || 0;
  const whispers = receivedWhispers?.page || [];
  const unreadWhispers = whispers.filter(w => !w.isRead).length;

  return (
    <div className="min-h-[100dvh] pt-20 pb-24 md:pb-10 px-4 md:px-8 lg:px-12 relative overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-primary/30 via-accent/20 to-transparent rounded-full blur-3xl motion-safe:animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute top-1/3 -left-20 w-72 h-72 bg-gradient-to-tr from-accent/25 via-primary/15 to-transparent rounded-full blur-3xl motion-safe:animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
        <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-gradient-to-bl from-primary/20 via-accent/10 to-transparent rounded-full blur-3xl motion-safe:animate-pulse" style={{ animationDuration: '5s', animationDelay: '2s' }} />
        
        {/* Decorative Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--border)/0.2)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.2)_1px,transparent_1px)] bg-[size:60px_60px]" />
        
        {/* Floating Lines */}
        <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="absolute top-2/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-accent/15 to-transparent" />
      </div>

      <div className="max-w-6xl mx-auto space-y-6 relative z-10">
        
        {isLoading ? (
          <>
            <header className="relative overflow-hidden rounded-3xl glass border border-white/10 shadow-2xl shadow-primary/10">
              <DashboardHeaderSkeleton />
            </header>

            <Card className="glass border-white/10 p-4 md:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <Skeleton className="h-5 w-28" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="glass border-white/10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <Skeleton className="h-6 w-36" />
                  <Skeleton className="h-8 w-20" />
                </div>
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <DashboardWhisperSkeleton key={i} />
                  ))}
                </div>
              </Card>

              <Card className="glass border-white/10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <DashboardChamberSkeleton key={i} />
                  ))}
                </div>
              </Card>
            </div>
          </>
        ) : (
          <>
        {/* Hero Section with Enhanced Visual Effects */}
        <header className="relative overflow-hidden rounded-3xl glass border border-white/10 shadow-2xl shadow-primary/10 group">
          {/* Animated Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/20 to-primary/10 animate-gradient-x opacity-60" />
          
          {/* Glow Effect */}
          <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent" />
          
          {/* Decorative Corner Orbs */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-accent/40 to-transparent rounded-full blur-2xl group-hover:scale-110 transition-transform duration-700" />
          <div className="absolute -bottom-20 -left-20 w-32 h-32 bg-gradient-to-tr from-primary/30 to-transparent rounded-full blur-2xl group-hover:scale-110 transition-transform duration-700" />
          
          {/* Shimmer Effect */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 motion-reduce:hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          </div>

          <div className="relative p-6 md:p-8">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary/70" />
                  {formatDate()}
                </p>
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-white via-primary to-accent bg-clip-text text-transparent animate-gradient-x break-words">
                  {getGreeting()}, {displayName}!
                </h1>
                <p className="text-muted-foreground mt-2 max-w-md text-sm md:text-base line-clamp-2">
                  Welcome back to EchoinWhispr. Here&apos;s what&apos;s happening in your connections.
                </p>
              </div>
              
              {/* Mood Badge with Glow */}
              {currentUser?.mood && (
                <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-accent/20 to-primary/20 border border-accent/30 shadow-lg shadow-accent/20 hover:shadow-accent/40 transition-shadow duration-300">
                  <Sparkles className="w-4 h-4 text-accent motion-safe:animate-pulse" />
                  <span className="text-sm font-medium">{currentUser.mood}</span>
                </div>
              )}
            </div>

            {/* Activity Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
              <StatPill icon={Mail} label="Whispers" value={whispers.length} color="from-primary via-cyan-500 to-accent" href="/inbox" glowColor="primary" />
              <StatPill icon={Radio} label="Chambers" value={chambersCount} color="from-amber-500 via-orange-500 to-red-500" href="/chambers" glowColor="amber" />
              <StatPill icon={Heart} label="Friends" value={friendCount} color="from-rose-500 via-pink-500 to-fuchsia-500" href="/friends" glowColor="rose" />
              <StatPill icon={Target} label="Profile" value={`${getProfileCompleteness(currentUser, resonancePrefs)}%`} color="from-cyan-500 via-blue-500 to-primary" href="/profile" glowColor="cyan" />
              
              {/* Friend Requests - highlighted if pending */}
              <Link href="/friends?tab=requests" className="col-span-2 md:col-span-1">
                <div className={`flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl border transition-all duration-300 group ${
                  pendingRequests > 0 
                    ? 'bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-cyan-500/20 border-emerald-500/40 hover:border-emerald-400 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                }`}>
                  <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/30 group-hover:shadow-emerald-500/50 transition-shadow`}>
                    <UserPlus className="w-4 h-4 md:w-5 md:h-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg md:text-xl font-bold truncate">{pendingRequests}</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground truncate">Friend Requests</p>
                  </div>
                  {pendingRequests > 0 && (
                    <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] px-1.5 motion-safe:animate-pulse shadow-lg shadow-emerald-500/30">New</Badge>
                  )}
                </div>
              </Link>
            </div>
          </div>
        </header>

        {/* Quick Actions - Premium Card Design */}
        <Card className="glass border-white/10 p-4 md:p-6 group hover:border-primary/30 transition-all duration-500 shadow-xl shadow-primary/5 hover:shadow-2xl hover:shadow-primary/10 relative overflow-hidden">
          {/* Subtle Background Glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Zap className="w-4 h-4 text-white" />
              </div>
              Quick Actions
            </h2>
            <div className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              Click to navigate
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative z-10">
            <QuickActionCard 
              href="/compose" 
              icon={Send} 
              label="Send Whisper" 
              gradient="from-primary via-cyan-600 to-accent"
              description="Share your thoughts"
            />
            <QuickActionCard 
              href="/inbox" 
              icon={Inbox} 
              label="View Inbox" 
              gradient="from-cyan-600 via-blue-600 to-primary"
              description="Check messages"
            />
            <QuickActionCard 
              href="/discover" 
              icon={Compass} 
              label="Discover" 
              gradient="from-emerald-600 via-teal-600 to-cyan-600"
              description="Find connections"
            />
            <QuickActionCard 
              href="/chambers" 
              icon={Radio} 
              label="Chambers" 
              gradient="from-amber-600 via-orange-600 to-red-600"
              description="Join discussions"
            />
          </div>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Recent Whispers - Premium Design */}
          <Link href="/inbox" className="block group/whispers">
            <Card className="glass border-white/10 p-6 bg-gradient-to-br from-primary/10 via-transparent to-accent/5 group-hover/whispers:border-primary/40 transition-all duration-500 cursor-pointer h-full shadow-xl shadow-primary/5 hover:shadow-2xl hover:shadow-primary/15 relative overflow-hidden">
              {/* Glow Effect on Hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/10 opacity-0 group-hover/whispers:opacity-100 transition-opacity duration-500" />
              
              {/* Decorative Orb */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-primary/30 to-transparent rounded-full blur-2xl group-hover/whispers:scale-125 transition-transform duration-700" />
              
              <div className="flex items-center justify-between mb-4 relative z-10">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-cyan-600 to-accent flex items-center justify-center shadow-lg shadow-primary/30 group-hover/whispers:shadow-primary/50 transition-shadow">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  Recent Whispers
                  {unreadWhispers > 0 && (
                    <Badge className="bg-gradient-to-r from-primary to-accent text-white ml-2 shadow-lg shadow-primary/30 motion-safe:animate-pulse">
                      {unreadWhispers} new
                    </Badge>
                  )}
                </h2>
                <Button variant="ghost" size="sm" className="text-primary hover:text-cyan-300 hover:bg-primary/10 group-hover/whispers:translate-x-1 transition-transform duration-300">
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              
              {whispers.length === 0 ? (
                <div className="text-center py-10 relative z-10">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shadow-lg shadow-primary/10">
                    <Inbox className="w-10 h-10 text-primary/50" />
                  </div>
                  <p className="text-muted-foreground mb-4">No whispers yet. Start connecting!</p>
                  <Button 
                    className="bg-gradient-to-r from-primary via-cyan-600 to-accent hover:from-primary/90 hover:via-cyan-700 hover:to-accent/90 shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all duration-300"
                    onClick={(e) => { e.preventDefault(); router.push('/discover'); }}
                  >
                    <Compass className="w-4 h-4 mr-2" /> Discover People
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 relative z-10">
                  {whispers.slice(0, 4).map((whisper, index) => (
                    <div 
                      key={whisper._id} 
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/whispers/${whisper._id}`); }}
                      className={`p-4 rounded-xl transition-all duration-300 cursor-pointer group/item ${
                        whisper.isRead 
                          ? 'bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 hover:translate-x-1' 
                          : 'bg-gradient-to-r from-primary/20 via-cyan-500/15 to-accent/15 border border-primary/20 hover:border-primary/40 shadow-lg shadow-primary/10 hover:shadow-primary/20 hover:translate-x-1'
                      }`}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {!whisper.isRead && (
                              <span className="w-2 h-2 rounded-full bg-gradient-to-r from-primary to-accent motion-safe:animate-pulse shadow-lg shadow-primary/50" />
                            )}
                            <span className="text-xs text-muted-foreground group-hover/item:text-white/70 transition-colors">
                              {formatDistanceToNow(new Date(whisper._creationTime), { addSuffix: true })}
                            </span>
                          </div>
                          <p className={`text-sm truncate group-hover/item:text-white transition-colors ${!whisper.isRead ? 'font-medium' : ''}`}>
                            {whisper.content}
                          </p>
                        </div>
                        {whisper.imageUrl && (
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center flex-shrink-0 shadow-lg group-hover/item:scale-105 transition-transform">
                            <ImageIcon className="w-5 h-5 text-primary" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </Link>

          {/* Chambers - Premium Design */}
          <Link href="/chambers" className="block group/chambers">
            <Card className="glass border-white/10 p-6 group-hover/chambers:border-amber-500/40 transition-all duration-500 cursor-pointer h-full shadow-xl shadow-amber-500/5 hover:shadow-2xl hover:shadow-amber-500/15 relative overflow-hidden">
              {/* Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-orange-500/5 opacity-0 group-hover/chambers:opacity-100 transition-opacity duration-500" />
              
              {/* Decorative Orb */}
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-gradient-to-tr from-amber-500/30 to-transparent rounded-full blur-2xl group-hover/chambers:scale-125 transition-transform duration-700" />
              
              <div className="flex items-center justify-between mb-4 relative z-10">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-amber-500/30 group-hover/chambers:shadow-amber-500/50 transition-shadow">
                    <Radio className="w-5 h-5 text-white" />
                  </div>
                  Chambers
                </h2>
                <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10 group-hover/chambers:border-amber-400/50 transition-colors">
                  See All
                </Badge>
              </div>
              <div className="space-y-3 relative z-10">
                {myChambers?.filter((c): c is NonNullable<typeof c> => c !== null && c !== undefined).slice(0, 4).map((chamber, index) => (
                    <div 
                      key={chamber._id} 
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/chambers/${chamber._id}`); }}
                      className="p-4 rounded-xl bg-white/5 hover:bg-gradient-to-r hover:from-amber-500/10 hover:to-orange-500/10 transition-all duration-300 border border-white/5 hover:border-amber-500/30 cursor-pointer group/item relative hover:translate-x-1"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {chamber.unreadCount > 0 && (
                        <div className="absolute top-2 right-2 min-w-5 h-5 px-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold flex items-center justify-center z-10 shadow-lg shadow-amber-500/30">
                          {chamber.unreadCount > 99 ? '99+' : chamber.unreadCount}
                        </div>
                      )}
                      
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium text-sm truncate flex-1 pr-8 group-hover/item:text-white transition-colors">{chamber.name}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 mb-2 border border-amber-500/20">
                        {chamber.topic}
                      </Badge>
                      {chamber.lastMessage || chamber.lastMessageHasImage ? (
                        <p className="text-xs text-muted-foreground truncate mt-2 flex items-center gap-1 group-hover/item:text-white/70 transition-colors">
                          <span className={`font-medium ${chamber.lastMessageIsOwn ? 'text-primary' : 'text-amber-300'}`}>
                            {chamber.lastMessageSenderAlias}:
                          </span>
                          {chamber.lastMessageHasImage && (
                            <ImageIcon className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          )}
                          {chamber.lastMessage ? (
                            <span className="truncate">{chamber.lastMessage}</span>
                          ) : (
                            <span className="italic">Photo</span>
                          )}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground/50 mt-2 italic group-hover/item:text-white/40 transition-colors">
                          No messages yet
                        </p>
                      )}
                    </div>
                  ))}
                {(!myChambers || myChambers.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground relative z-10">
                    <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center shadow-lg shadow-amber-500/10">
                      <Radio className="w-8 h-8 text-amber-500/50" />
                    </div>
                    <p className="text-sm mb-4">You haven&apos;t joined any chambers yet</p>
                    <Button 
                      size="sm" 
                      className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 hover:from-amber-700 hover:via-orange-700 hover:to-red-700 shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-all duration-300"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push('/chambers'); }}
                    >
                      <Compass className="w-4 h-4 mr-2" /> Discover Chambers
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </Link>

        </div>
          </>
        )}
      </div>
    </div>
  );
}

function getProfileCompleteness(user: unknown, resonance: unknown): number {
  if (!user) return 0;
  let score = 0;
  const u = user as Record<string, unknown>;
  const r = resonance as Record<string, unknown> | null;
  if (u.username) score += 15;
  if (u.displayName) score += 15;
  if (u.mood) score += 20;
  if (u.career) score += 15;
  if ((u.interests as unknown[])?.length > 0) score += 15;
  if (r?.lifePhase) score += 20;
  return Math.min(score, 100);
}

function StatPill({ icon: Icon, label, value, color, href, glowColor }: { 
  icon: React.ElementType; 
  label: string; 
  value: number | string; 
  color: string;
  href?: string;
  glowColor?: string;
}) {
  const content = (
    <div className={`flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl bg-white/5 border border-white/10 transition-all duration-300 group ${href ? 'hover:bg-white/10 hover:border-white/20 cursor-pointer hover:shadow-lg' : ''}`}
      style={glowColor ? { boxShadow: `0 0 0 0 transparent` } : undefined}
      onMouseEnter={(e) => glowColor && (e.currentTarget.style.boxShadow = `0 4px 20px -5px var(--tw-shadow-color)`)}
      onMouseLeave={(e) => glowColor && (e.currentTarget.style.boxShadow = '0 0 0 0 transparent')}
    >
      <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300`}
        style={glowColor ? { boxShadow: `0 4px 15px -3px var(--tw-shadow-color)` } : undefined}
      >
        <Icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-lg md:text-xl font-bold truncate group-hover:text-white transition-colors">{value}</p>
        <p className="text-[10px] md:text-xs text-muted-foreground truncate">{label}</p>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

function QuickActionCard({ href, icon: Icon, label, gradient, description }: {
  href: string;
  icon: React.ElementType;
  label: string;
  gradient: string;
  description?: string;
}) {
  return (
    <Link href={href} className="block">
      <div className={`p-3 md:p-4 rounded-xl bg-gradient-to-br ${gradient} hover:scale-[1.02] active:scale-95 transition-all duration-300 cursor-pointer text-center shadow-lg hover:shadow-2xl group relative overflow-hidden`}>
        {/* Shimmer Effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        </div>
        
        <div className="relative z-10">
          <Icon className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-1 md:mb-2 text-white drop-shadow-lg" />
          <p className="text-xs md:text-sm font-medium text-white drop-shadow">{label}</p>
          {description && (
            <p className="text-[10px] text-white/70 mt-1 hidden md:block">{description}</p>
          )}
        </div>
      </div>
    </Link>
  );
}