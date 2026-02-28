'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex';
import { useUser } from '@clerk/nextjs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { FEATURE_FLAGS } from '@/config/featureFlags';
import Link from 'next/link';
import { 
  User, 
  Edit3, 
  Save, 
  X, 
  Radio, 
  Heart,
  Target,
  Sparkles,
  Briefcase,
  MessageSquare,
  Calendar,
  Settings,
  ArrowRight,
  Lock,
  Zap,
  TrendingUp,
  Crown
} from 'lucide-react';

export default function ProfilePage() {
  const { user: clerkUser, isLoaded } = useUser();
  const { toast } = useToast();
  const isProfileEditingEnabled = FEATURE_FLAGS.USER_PROFILE_EDITING;

  const currentUser = useQuery(api.users.getCurrentUser);
  const resonancePrefs = useQuery(api.resonance.getResonancePreferences);
  const myChambers = useQuery(api.echoChambers.getMyChambers);
  const friendsList = useQuery(api.friends.getFriendsList, { limit: 10 });
  const whispersCountQuery = useQuery(api.whispers.getReceivedWhispersCount);
  const whispersCount = whispersCountQuery?.count ?? 0;
  const whispersCountCapped = whispersCountQuery?.capped ?? false;

  const updateProfile = useMutation(api.users.updateUserProfile);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState({
    displayName: '',
    career: '',
    mood: '',
    interests: '',
  });

  useEffect(() => {
    if (currentUser && !isEditing) {
      setEditData({
        displayName: currentUser.displayName || '',
        career: currentUser.career || '',
        mood: currentUser.mood || '',
        interests: currentUser.interests?.join(', ') || '',
      });
    }
  }, [currentUser, isEditing]);

  const chambersCount = myChambers?.length || 0;
  const friendCount = friendsList?.totalCount || 0;

  const getProfileCompleteness = (): number => {
    if (!currentUser) return 0;
    let score = 0;
    if (currentUser.username) score += 15;
    if (currentUser.displayName) score += 15;
    if (currentUser.mood) score += 20;
    if (currentUser.career) score += 15;
    if (currentUser.interests && currentUser.interests.length > 0) score += 15;
    if (resonancePrefs?.lifePhase) score += 20;
    return Math.min(score, 100);
  };

  const getInitials = () => {
    if (currentUser?.displayName) {
      return currentUser.displayName.slice(0, 2).toUpperCase();
    }
    if (clerkUser?.firstName && clerkUser?.lastName) {
      return `${clerkUser.firstName.charAt(0)}${clerkUser.lastName.charAt(0)}`.toUpperCase();
    }
    if (currentUser?.username) {
      return currentUser.username.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await updateProfile({
        displayName: editData.displayName || undefined,
        career: editData.career || undefined,
        mood: editData.mood || undefined,
        interests: editData.interests ? editData.interests.split(',').map(i => i.trim()).filter(Boolean) : undefined,
      });
      toast({ title: 'Profile updated!' });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast({ title: 'Failed to update profile', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (currentUser) {
      setEditData({
        displayName: currentUser.displayName || '',
        career: currentUser.career || '',
        mood: currentUser.mood || '',
        interests: currentUser.interests?.join(', ') || '',
      });
    }
    setIsEditing(false);
  };

  if (!isProfileEditingEnabled) {
    return (
      <div className="min-h-[100dvh] pt-20 pb-10 px-4 md:px-8 lg:px-12 flex justify-center items-center">
        <div className="relative w-full max-w-md">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-transparent rounded-3xl blur-3xl" />
          <div className="relative glass-card rounded-3xl p-8 text-center">
            <div className="absolute inset-0 rounded-3xl overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
            </div>
            <div className="relative">
              <div className="relative inline-flex mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30 rounded-full blur-xl" />
                <div className="relative bg-gradient-to-br from-primary/20 to-accent/20 p-4 rounded-full">
                  <Lock className="w-8 h-8 text-primary" />
                </div>
              </div>
              <h1 className="text-2xl font-bold tracking-tight mb-2">Feature Locked</h1>
              <p className="text-muted-foreground">
                Profile editing is currently disabled. Check back later for updates!
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoaded || !currentUser) {
    return (
      <div className="min-h-[100dvh] pt-20 pb-10 px-4 md:px-8 lg:px-12 flex justify-center">
        <div className="w-full max-w-4xl space-y-6">
          <div className="glass-card rounded-3xl animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-white/10 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-6 w-40 bg-white/10 rounded" />
                <div className="h-4 w-24 bg-white/10 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const profileCompletion = getProfileCompleteness();

  return (
    <div className="min-h-[100dvh] pt-20 pb-24 md:pb-10 px-4 md:px-8 lg:px-12 flex justify-center">
      <div className="w-full max-w-4xl space-y-6">
        
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/15 to-transparent rounded-3xl blur-3xl opacity-50" />
          <Card className="relative glass-card rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5" />
            
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-primary/20 via-primary/5 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 animate-float-slow" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-accent/15 via-accent/5 to-transparent rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 animate-float-slow animation-delay-2000" />
            
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
            
            <div className="relative p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-full blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-500 scale-110" />
                  <div className="absolute -inset-2 bg-gradient-to-br from-primary/30 to-accent/30 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <Avatar className="relative w-24 h-24 md:w-32 md:h-32 border-2 border-primary/30 ring-4 ring-primary/10 group-hover:ring-primary/20 transition-all duration-500">
                    <AvatarImage src={clerkUser?.imageUrl} alt="Profile" />
                    <AvatarFallback className="bg-gradient-to-br from-primary via-primary to-accent text-white text-2xl md:text-3xl font-bold">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  
                  {profileCompletion === 100 && (
                    <div className="absolute -bottom-1 -right-1 bg-gradient-to-br from-amber-400 to-orange-500 p-1.5 rounded-full shadow-lg shadow-amber-500/30">
                      <Crown className="w-4 h-4 text-white" />
                    </div>
                  )}
                  
                  {currentUser.mood && (
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10">
                      <Badge className="bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-gradient text-white border-0 px-4 py-1 text-xs shadow-lg shadow-primary/30 whitespace-nowrap">
                        <Sparkles className="w-3 h-3 mr-1.5 animate-pulse" />
                        {currentUser.mood}
                      </Badge>
                    </div>
                  )}
                </div>

                  <div className="flex-1 text-center md:text-left pt-4 md:pt-0 min-w-0">
                  <div className="relative inline-block max-w-full">
                    <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent truncate">
                      {currentUser.displayName || clerkUser?.firstName || currentUser.username}
                    </h1>
                  </div>
                  <p className="text-muted-foreground text-lg mt-1 truncate">@{currentUser.username}</p>
                  
                  {currentUser.career && (
                    <div className="flex items-center justify-center md:justify-start gap-2 mt-3 text-sm text-muted-foreground">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        <Briefcase className="w-4 h-4 text-primary" />
                      </div>
                      {currentUser.career}
                    </div>
                  )}

                  <div className="flex items-center justify-center md:justify-start gap-2 mt-2 text-sm text-muted-foreground">
                    <div className="p-1.5 rounded-lg bg-accent/10">
                      <Calendar className="w-4 h-4 text-accent" />
                    </div>
                    Joined {(() => {
                      if (!currentUser?.createdAt) return 'Unknown';
                      const date = new Date(currentUser.createdAt);
                      if (isNaN(date.getTime())) return 'Unknown';
                      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                    })()}
                  </div>

                  {currentUser.interests && currentUser.interests.length > 0 && (
                    <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-4">
                      {currentUser.interests.map((interest, index) => (
                        <Badge 
                          key={interest} 
                          variant="secondary" 
                          className="bg-gradient-to-r from-white/5 to-white/10 text-white/80 border border-white/10 hover:border-primary/30 hover:text-white transition-all duration-300"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="absolute top-4 right-4 md:relative md:top-auto md:right-auto">
                  {!isEditing ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsEditing(true)}
                      className="border-primary/30 hover:border-primary hover:bg-primary/10 text-primary transition-all duration-300"
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        size="sm" 
                        onClick={handleSave} 
                        disabled={isSaving} 
                        className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg shadow-primary/30 hover:shadow-primary/40 transition-all duration-300"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {isSaving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={handleCancel} 
                        className="border-white/20 hover:bg-white/10 transition-all duration-300"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="relative mt-8 p-5 rounded-2xl bg-gradient-to-r from-white/5 via-white/10 to-white/5 border border-white/10 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5" />
                <div className="relative flex items-center justify-between mb-3">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <div className="p-1 rounded-md bg-primary/20">
                      <Target className="w-4 h-4 text-primary" />
                    </div>
                    Profile Completion
                  </span>
                  <span className="text-sm font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    {profileCompletion}%
                  </span>
                </div>
                <div className="relative h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10" />
                  <div 
                    className="relative h-full bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${profileCompletion}%` }}
                  >
                    {profileCompletion > 0 && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                    )}
                  </div>
                </div>
                {profileCompletion < 100 && (
                  <p className="relative text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-amber-400" />
                    {profileCompletion < 50 
                      ? 'Add your mood, career, and interests to complete your profile!'
                      : 'Almost there! Add more details to reach 100%.'
                    }
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
          <Link href="/inbox" className="group">
            <Card className="glass-card rounded-2xl p-3 sm:p-4 text-center hover:border-primary/30 transition-all duration-300 cursor-pointer group-hover:scale-[1.02] group-hover:shadow-lg group-hover:shadow-primary/10 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-3 shadow-lg shadow-primary/30 group-hover:shadow-primary/50 group-hover:scale-110 transition-all duration-300">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <p className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                  {whispersCountCapped ? '99+' : whispersCount}
                </p>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">Whispers</p>
              </div>
            </Card>
          </Link>
          
          <Link href="/chambers" className="group">
            <Card className="glass-card rounded-2xl p-4 text-center hover:border-amber-500/30 transition-all duration-300 cursor-pointer group-hover:scale-[1.02] group-hover:shadow-lg group-hover:shadow-amber-500/10 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-500/30 group-hover:shadow-amber-500/50 group-hover:scale-110 transition-all duration-300">
                  <Radio className="w-6 h-6 text-white" />
                </div>
                <p className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                  {chambersCount}
                </p>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">Chambers</p>
              </div>
            </Card>
          </Link>
          
          <Link href="/friends" className="group">
            <Card className="glass-card rounded-2xl p-4 text-center hover:border-rose-500/30 transition-all duration-300 cursor-pointer group-hover:scale-[1.02] group-hover:shadow-lg group-hover:shadow-rose-500/10 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-rose-500/30 group-hover:shadow-rose-500/50 group-hover:scale-110 transition-all duration-300">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <p className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                  {friendCount}
                </p>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">Friends</p>
              </div>
            </Card>
          </Link>
        </div>

        {isEditing && (
          <Card className="glass-card rounded-2xl p-6 relative overflow-hidden animate-slide-up">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-6">
              <div className="p-2 rounded-lg bg-primary/20">
                <Edit3 className="w-5 h-5 text-primary" />
              </div>
              Edit Profile
            </h2>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-sm font-medium">Display Name</Label>
                <Input
                  id="displayName"
                  value={editData.displayName}
                  onChange={(e) => setEditData(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="How should we call you?"
                  className="bg-white/5 border-white/10 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="career" className="text-sm font-medium">Career / Role</Label>
                <Input
                  id="career"
                  value={editData.career}
                  onChange={(e) => setEditData(prev => ({ ...prev, career: e.target.value }))}
                  placeholder="e.g., Software Engineer, Student, Designer"
                  className="bg-white/5 border-white/10 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="mood" className="text-sm font-medium">Current Mood</Label>
                <Input
                  id="mood"
                  value={editData.mood}
                  onChange={(e) => setEditData(prev => ({ ...prev, mood: e.target.value }))}
                  placeholder="e.g., Excited, Curious, Reflective"
                  className="bg-white/5 border-white/10 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="interests" className="text-sm font-medium">Interests (comma separated)</Label>
                <Textarea
                  id="interests"
                  value={editData.interests}
                  onChange={(e) => setEditData(prev => ({ ...prev, interests: e.target.value }))}
                  placeholder="e.g., Coding, Music, Travel, Photography"
                  className="bg-white/5 border-white/10 focus:border-primary/50 focus:ring-primary/20 min-h-[80px] transition-all duration-300"
                />
              </div>
            </div>
          </Card>
        )}

        <Card className="glass-card rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Quick Links
          </h2>
          <div className="space-y-2">
            <Link href="/settings" className="block group">
              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-white/5 to-transparent hover:from-primary/10 transition-all duration-300 cursor-pointer border border-transparent hover:border-primary/20">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Settings className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium group-hover:text-primary transition-colors">Settings</p>
                    <p className="text-xs text-muted-foreground">Privacy, notifications, theme</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
              </div>
            </Link>

            <Link href="/friends" className="block group">
              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-white/5 to-transparent hover:from-emerald-500/10 transition-all duration-300 cursor-pointer border border-transparent hover:border-emerald-500/20">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <User className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-medium group-hover:text-emerald-400 transition-colors">Friends</p>
                    <p className="text-xs text-muted-foreground">Manage connections</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-emerald-400 group-hover:translate-x-1 transition-all duration-300" />
              </div>
            </Link>

            <Link href="/discover" className="block group">
              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-white/5 to-transparent hover:from-amber-500/10 transition-all duration-300 cursor-pointer border border-transparent hover:border-amber-500/20">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="font-medium group-hover:text-amber-400 transition-colors">Discover</p>
                    <p className="text-xs text-muted-foreground">Find new connections</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-amber-400 group-hover:translate-x-1 transition-all duration-300" />
              </div>
            </Link>
          </div>
        </Card>

      </div>
    </div>
  );
}