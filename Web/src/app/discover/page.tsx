'use client';

import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/lib/convex';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Sparkles, 
  Users, 
  RefreshCw, 
  MessageSquare, 
  Heart,
  Briefcase,
  Target,
  Zap,
  TrendingUp,
  Search,
  Globe,
} from 'lucide-react';
import Link from 'next/link';

export default function DiscoverPage() {
  const { toast } = useToast();
  const [isSearching, setIsSearching] = useState(false);
  const [matchResult, setMatchResult] = useState<{
    matchId: string;
    score: number;
    sharedInterests: string[];
    matchCareer?: string;
    matchMood?: string;
  } | null>(null);

  const findMatch = useMutation(api.matchmaking.findRandomMatch);
  const matchStats = useQuery(api.matchmaking.getMatchStats);
  const recentMatches = useQuery(api.matchmaking.getRecentMatches, { limit: 5 });

  const handleFindMatch = async () => {
    setIsSearching(true);
    try {
      const result = await findMatch();
      if (result) {
        setMatchResult(result);
        toast({
          title: "Match Found! 🎉",
          description: `Found someone with ${result.sharedInterests.length} shared interests!`,
        });
      } else {
        toast({
          title: "No matches available",
          description: "Try again later or update your interests!",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Match error:', error);
      toast({
        title: "Something went wrong",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-[100dvh] pt-20 pb-10 px-4 md:px-8 lg:px-12 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Primary Orb */}
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-gradient-to-br from-primary/25 via-accent/15 to-transparent rounded-full blur-3xl animate-float" />
        
        {/* Secondary Orb */}
        <div className="absolute top-1/2 -left-24 w-80 h-80 bg-gradient-to-tr from-accent/20 via-primary/10 to-transparent rounded-full blur-3xl animate-float-delayed" />
        
        {/* Tertiary Orb */}
        <div className="absolute bottom-0 right-1/3 w-64 h-64 bg-gradient-to-bl from-primary/15 via-accent/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: '7s' }} />
        
        {/* Decorative Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:80px_80px]" />
        
        {/* Floating Decorative Lines */}
        <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-pulse" style={{ animationDuration: '3s' }} />
        <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-accent/15 to-transparent animate-pulse" style={{ animationDuration: '4s', animationDelay: '1s' }} />
        <div className="absolute top-3/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-pulse" style={{ animationDuration: '5s', animationDelay: '2s' }} />
        
        {/* Floating Particles */}
        <div className="absolute top-1/4 right-1/4 w-2 h-2 bg-primary/40 rounded-full animate-float blur-sm" />
        <div className="absolute top-1/3 left-1/3 w-1.5 h-1.5 bg-accent/40 rounded-full animate-float-delayed blur-sm" />
        <div className="absolute top-2/3 right-1/3 w-1 h-1 bg-primary/30 rounded-full animate-float blur-sm" style={{ animationDelay: '1s' }} />
      </div>

      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        
        {/* Hero Header - Premium Design */}
        <header className="glass p-6 md:p-8 rounded-3xl border border-white/10 relative overflow-hidden group shadow-2xl shadow-primary/10">
          {/* Animated Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/15 to-primary/10 animate-gradient-x opacity-50" />
          
          {/* Glow Orbs */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-primary/40 to-transparent rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700" />
          <div className="absolute -bottom-20 -left-20 w-32 h-32 bg-gradient-to-tr from-accent/30 to-transparent rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700" />
          
          {/* Shimmer Effect */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          </div>

          <div className="flex items-center gap-3 md:gap-4 mb-6 relative z-10">
            <div className="bg-gradient-to-br from-primary via-accent to-primary p-3 md:p-4 rounded-2xl shadow-xl shadow-primary/30 group-hover:shadow-primary/50 transition-shadow relative overflow-hidden">
              {/* Inner Glow */}
              <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent" />
              <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-white relative z-10" />
            </div>
            <div>
              <h1 className="text-2xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-white via-primary to-accent bg-clip-text text-transparent">
                Discover Connections
              </h1>
              <p className="text-muted-foreground text-sm md:text-base mt-1">
                Find people who share your interests and vibe
              </p>
            </div>
          </div>
          
          {/* Stats Row - Premium Cards */}
          {matchStats && (
            <div className="grid grid-cols-3 gap-3 md:gap-4 mt-6 relative z-10">
              <div className="group/stat relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 p-4 md:p-5 border border-primary/20 hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-primary/20 to-transparent rounded-full blur-xl group-hover/stat:scale-150 transition-transform duration-500" />
                <div className="relative z-10">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center mb-2 shadow-lg shadow-primary/30">
                    <Globe className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
                    {matchStats.totalMatches}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Total Matches</div>
                </div>
              </div>
              
              <div className="group/stat relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent/10 to-accent/5 p-4 md:p-5 border border-accent/20 hover:border-accent/40 transition-all duration-300 hover:shadow-lg hover:shadow-accent/20">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-accent/20 to-transparent rounded-full blur-xl group-hover/stat:scale-150 transition-transform duration-500" />
                <div className="relative z-10">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-rose-500 flex items-center justify-center mb-2 shadow-lg shadow-accent/30">
                    <Search className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-accent to-rose-400 bg-clip-text text-transparent">
                    {matchStats.weeklyMatches}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">This Week</div>
                </div>
              </div>
              
              <div className="group/stat relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-4 md:p-5 border border-amber-500/20 hover:border-amber-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/20">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-amber-500/20 to-transparent rounded-full blur-xl group-hover/stat:scale-150 transition-transform duration-500" />
                <div className="relative z-10">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-2 shadow-lg shadow-amber-500/30">
                    <Target className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                    {matchStats.avgScore}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Avg Score</div>
                </div>
              </div>
            </div>
          )}
        </header>

        {/* Main Match Card - Premium Design */}
        <Card className="glass border-white/10 p-6 md:p-8 text-center relative overflow-hidden group shadow-2xl shadow-primary/5 hover:shadow-primary/15 transition-shadow duration-500">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 animate-gradient-x opacity-40" />
          
          {/* Decorative Orbs */}
          <div className="absolute -top-20 -left-20 w-40 h-40 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700" />
          <div className="absolute -bottom-20 -right-20 w-32 h-32 bg-gradient-to-bl from-accent/20 to-transparent rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700" />
          
          {/* Floating Particles */}
          <div className="absolute top-10 left-10 w-1 h-1 bg-primary/50 rounded-full animate-float" />
          <div className="absolute bottom-10 right-10 w-1.5 h-1.5 bg-accent/50 rounded-full animate-float-delayed" />

          <div className="relative z-10">
            {!matchResult ? (
              <>
                <div className="relative inline-block mb-6">
                  {/* Outer Glow Ring */}
                  <div className="absolute inset-0 w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 blur-xl animate-pulse" />
                  
                  {/* Icon Container */}
                  <div className="relative w-24 h-24 md:w-28 md:h-28 mx-auto rounded-full bg-gradient-to-br from-primary via-accent to-primary flex items-center justify-center shadow-2xl shadow-primary/30 group-hover:shadow-primary/50 group-hover:scale-105 transition-all duration-500">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent to-white/20" />
                    <Users className="w-10 h-10 md:w-12 md:h-12 text-white relative z-10" />
                  </div>
                </div>
                
                <h2 className="text-2xl md:text-3xl font-bold mb-3 bg-gradient-to-r from-white to-primary bg-clip-text text-transparent">
                  Find Someone Like You
                </h2>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto text-sm md:text-base">
                  Our algorithm matches you based on shared interests, career, and mood. 
                  Connect with someone who truly gets you!
                </p>
                
                <Button 
                  size="lg"
                  onClick={handleFindMatch}
                  disabled={isSearching}
                  className="bg-gradient-to-r from-primary via-accent to-primary hover:from-primary/90 hover:via-accent/90 hover:to-primary/90 text-white px-8 md:px-10 py-6 md:py-7 text-base md:text-lg rounded-2xl shadow-xl shadow-primary/30 hover:shadow-primary/50 transition-all duration-300 hover:scale-[1.02] active:scale-95 group/btn relative overflow-hidden"
                >
                  {/* Shimmer Effect */}
                  <div className="absolute inset-0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-500" />
                  </div>
                  
                  <span className="relative z-10 flex items-center">
                    {isSearching ? (
                      <>
                        <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                        Finding Match...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Find My Match
                      </>
                    )}
                  </span>
                </Button>
              </>
            ) : (
              <div className="space-y-6 animate-fade-in">
                {/* Match Found Animation */}
                <div className="relative inline-block">
                  <div className="absolute inset-0 w-20 h-20 rounded-full bg-gradient-to-br from-green-500/30 to-emerald-500/30 blur-xl animate-pulse" />
                  <div className="relative w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 flex items-center justify-center shadow-2xl shadow-green-500/30 animate-bounce">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent to-white/20" />
                    <Heart className="w-10 h-10 text-white relative z-10 animate-pulse" />
                  </div>
                </div>
                
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-2 bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                    Match Found! 🎉
                  </h2>
                  <p className="text-muted-foreground">
                    Compatibility Score:{' '}
                    <span className="text-lg md:text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                      {matchResult.score}
                    </span>
                  </p>
                </div>

                {matchResult.matchCareer && (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground group">
                    <Briefcase className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                    <span className="group-hover:text-white transition-colors">{matchResult.matchCareer}</span>
                  </div>
                )}

                {matchResult.sharedInterests.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">Shared Interests:</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {matchResult.sharedInterests.map((interest, i) => (
                        <Badge 
                          key={i} 
                          className="bg-gradient-to-r from-primary/20 to-accent/20 text-primary border border-primary/30 hover:border-primary/50 hover:scale-105 transition-all duration-300 cursor-default px-3 py-1"
                        >
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 justify-center pt-4 flex-wrap">
                  <Button asChild className="bg-gradient-to-r from-primary via-accent to-primary hover:from-primary/90 hover:via-accent/90 hover:to-primary/90 shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all duration-300 hover:scale-[1.02] active:scale-95 relative overflow-hidden group/btn">
                    <Link href={`/compose?matchId=${matchResult.matchId}`}>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Send Whisper
                    </Link>
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setMatchResult(null);
                      handleFindMatch();
                    }}
                    className="border-white/20 hover:bg-white/10 hover:border-white/30 transition-all duration-300 hover:scale-[1.02] active:scale-95"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Find Another
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Top Interests - Premium Card */}
        {matchStats?.topInterests && matchStats.topInterests.length > 0 && (
          <Card className="glass border-white/10 p-5 md:p-6 relative overflow-hidden group hover:border-amber-500/30 transition-all duration-300 shadow-xl shadow-amber-500/5 hover:shadow-amber-500/10">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="flex items-center gap-2 md:gap-3 mb-4 relative z-10">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Target className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-semibold text-sm md:text-base">Your Top Matching Interests</h3>
            </div>
            <div className="flex flex-wrap gap-2 relative z-10">
              {matchStats.topInterests.map((interest, i) => (
                <Badge 
                  key={i}
                  className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/30 hover:border-amber-400/50 hover:scale-105 transition-all duration-300 cursor-default px-3 py-1"
                >
                  {interest}
                </Badge>
              ))}
            </div>
          </Card>
        )}

        {/* Recent Matches - Premium Card */}
        {recentMatches && recentMatches.length > 0 && (
          <Card className="glass border-white/10 p-5 md:p-6 relative overflow-hidden group hover:border-green-500/30 transition-all duration-300 shadow-xl shadow-green-500/5 hover:shadow-green-500/10">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="flex items-center gap-2 md:gap-3 mb-4 relative z-10">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-semibold text-sm md:text-base">Recent Matches</h3>
            </div>
            <div className="space-y-3 relative z-10">
              {recentMatches.map((match, index) => (
                <div 
                  key={match._id}
                  className="flex items-center justify-between p-3 md:p-4 rounded-xl bg-white/5 hover:bg-gradient-to-r hover:from-primary/10 hover:to-accent/10 border border-white/5 hover:border-primary/20 transition-all duration-300 hover:translate-x-1 group/item"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shadow-lg group-hover/item:shadow-primary/30 transition-shadow">
                      <Zap className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm font-medium group-hover/item:text-white transition-colors">
                        Score: <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-bold">{match.score}</span>
                      </div>
                      <div className="text-xs text-muted-foreground group-hover/item:text-white/70 transition-colors">
                        {match.sharedInterests?.length || 0} shared interests
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground group-hover/item:text-white/50 transition-colors">
                    {new Date(match.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          25% { transform: translateY(-20px) translateX(10px); }
          50% { transform: translateY(-10px) translateX(-10px); }
          75% { transform: translateY(-30px) translateX(5px); }
        }
        
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          25% { transform: translateY(-15px) translateX(-10px); }
          50% { transform: translateY(-25px) translateX(10px); }
          75% { transform: translateY(-10px) translateX(-5px); }
        }
        
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
        
        .animate-float-delayed {
          animation: float-delayed 10s ease-in-out infinite;
          animation-delay: 2s;
        }
        
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 15s ease infinite;
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}