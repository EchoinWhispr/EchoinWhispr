'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { useAuth } from '@clerk/nextjs';
import { api, Doc } from '@/lib/convex';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { 
  Radio, 
  Plus, 
  Users, 
  Lock, 
  Globe, 
  Copy, 
  MessageSquare,
  Sparkles,
  Hash,
  MoreVertical,
  Settings,
  Image as ImageIcon,
  Zap,
  Waves
} from 'lucide-react';

export default function ChambersPage() {
  const { toast } = useToast();
  const { isSignedIn } = useAuth();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [topic, setTopic] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [maxMembers, setMaxMembers] = useState(50);
  const [isCreating, setIsCreating] = useState(false);

  const myChambers = useQuery(api.echoChambers.getMyChambers, isSignedIn ? {} : 'skip');
  const publicChambers = useQuery(api.echoChambers.listPublicChambers, { limit: 20 });
  const createChamber = useMutation(api.echoChambers.createChamber);
  const joinChamber = useMutation(api.echoChambers.joinChamber);

  const handleCreate = async () => {
    if (!name.trim() || !topic.trim()) {
      toast({
        title: "Missing fields",
        description: "Name and topic are required.",
        variant: "destructive",
      });
      return;
    }

    if (name.trim().length < 3 || name.trim().length > 50) {
      toast({
        title: "Invalid name length",
        description: "Name must be between 3 and 50 characters.",
        variant: "destructive",
      });
      return;
    }

    if (topic.trim().length < 3 || topic.trim().length > 100) {
      toast({
        title: "Invalid topic length",
        description: "Topic must be between 3 and 100 characters.",
        variant: "destructive",
      });
      return;
    }

    if (description.trim().length > 500) {
      toast({
        title: "Description too long",
        description: "Description must be 500 characters or less.",
        variant: "destructive",
      });
      return;
    }

    if (maxMembers < 1 || maxMembers > 100) {
      toast({
        title: "Invalid member count",
        description: "Max members must be between 1 and 100.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const result = await createChamber({
        name: name.trim(),
        description: description.trim() || undefined,
        topic: topic.trim(),
        isPublic,
        maxMembers,
      });

      toast({
        title: "Chamber created!",
        description: "Share the invite link to get people in.",
      });

      navigator.clipboard.writeText(`${window.location.origin}/chambers/join/${result.inviteCode}`);
      
      setShowCreateDialog(false);
      resetForm();
    } catch (error) {
      console.error('Create error:', error);
      toast({
        title: "Failed to create chamber",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) {
      toast({
        title: "Enter invite code",
        description: "Paste the 8-character invite code.",
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);
    try {
      const result = await joinChamber({ inviteCode: joinCode.trim() });
      
      if (result.alreadyMember) {
        toast({
          title: "Already a member",
          description: `You're ${result.anonymousAlias} in this chamber.`,
        });
      } else {
        toast({
          title: "Joined!",
          description: `You are now ${result.anonymousAlias}`,
        });
      }
      
      setJoinCode('');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Check your invite code.";
      toast({
        title: "Failed to join",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setTopic('');
    setIsPublic(false);
    setMaxMembers(50);
  };

  const copyInviteLink = (code: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/chambers/join/${code}`);
    toast({
      title: "Link copied!",
      description: "Share it with others to join.",
    });
  };

  const handleJoinPublic = async (inviteCode: string) => {
    try {
      const result = await joinChamber({ inviteCode });
      if (result.alreadyMember) {
        toast({
          title: "Already a member",
          description: `You're already ${result.anonymousAlias}`,
        });
      } else {
        toast({
          title: "Joined!",
          description: `You are now ${result.anonymousAlias}`,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Failed to join",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-[100dvh] pt-20 pb-10 px-4 md:px-8 lg:px-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-transparent rounded-3xl blur-3xl opacity-40" />
          <Card className="relative glass-card rounded-3xl p-6 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/15 via-primary/5 to-transparent rounded-full blur-2xl -translate-y-1/2 translate-x-1/4 animate-float-slow" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-accent/10 via-accent/5 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/4 animate-float-slow animation-delay-3000" />
            
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-2xl blur-lg opacity-40" />
                  <div className="relative bg-gradient-to-br from-primary/20 to-accent/20 p-4 rounded-2xl">
                    <Radio className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">
                    <span className="text-gradient">Echo Chambers</span>
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Anonymous group conversations
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => setShowCreateDialog(true)}
                className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg shadow-primary/30 hover:shadow-primary/40 transition-all duration-300 hover:scale-105"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Chamber
              </Button>
            </div>

            <div className="relative mt-6 flex gap-3">
              <div className="flex-1 relative">
                <Input
                  placeholder="Enter invite code (e.g., ABC12345)"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="max-w-xs font-mono tracking-wider bg-white/5 border-white/10 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300"
                />
              </div>
              <Button 
                variant="outline" 
                onClick={handleJoin}
                disabled={isJoining}
                className="border-primary/30 hover:border-primary hover:bg-primary/10 text-primary transition-all duration-300"
              >
                {isJoining ? "Joining..." : "Join"}
              </Button>
            </div>
          </Card>
        </header>

        <Tabs defaultValue="my-chambers" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-white/5 backdrop-blur-sm p-1 rounded-xl border border-white/5">
            <TabsTrigger 
              value="my-chambers" 
              className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 transition-all duration-300"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              My Chambers
            </TabsTrigger>
            <TabsTrigger 
              value="discover" 
              className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 transition-all duration-300"
            >
              <Globe className="w-4 h-4 mr-2" />
              Discover
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-chambers" className="space-y-4">
            {myChambers?.length === 0 && (
              <Card className="glass-card rounded-3xl p-12 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 rounded-full blur-3xl opacity-30" />
                
                <div className="relative">
                  <div className="relative inline-flex mb-6">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-xl" />
                    <div className="relative bg-gradient-to-br from-primary/10 to-accent/10 p-6 rounded-full">
                      <Waves className="w-12 h-12 text-primary/60" />
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-2 bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                    No chambers yet
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                    Create or join a chamber to start anonymous group chats with people who share your interests
                  </p>
                  <Button 
                    onClick={() => setShowCreateDialog(true)}
                    className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg shadow-primary/30 hover:shadow-primary/40 transition-all duration-300"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Chamber
                  </Button>
                </div>
              </Card>
            )}

            {myChambers?.filter((c) => c !== null).map((chamber, index) => (
              <ChamberCard 
                key={chamber._id} 
                chamber={chamber} 
                onCopyLink={copyInviteLink}
                showAlias
                index={index}
              />
            ))}
          </TabsContent>

          <TabsContent value="discover" className="space-y-4">
            {publicChambers?.filter((c) => !c.isMember).length === 0 && (
              <Card className="glass-card rounded-3xl p-12 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-primary/5" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-accent/10 rounded-full blur-3xl opacity-30" />
                
                <div className="relative">
                  <div className="relative inline-flex mb-6">
                    <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-primary/20 rounded-full blur-xl" />
                    <div className="relative bg-gradient-to-br from-accent/10 to-primary/10 p-6 rounded-full">
                      <Globe className="w-12 h-12 text-accent/60" />
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-2 bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                    No public chambers
                  </h3>
                  <p className="text-muted-foreground max-w-sm mx-auto">
                    Be the first to create a public chamber or you&apos;ve already joined them all!
                  </p>
                </div>
              </Card>
            )}

            {publicChambers?.filter((c) => c !== null && !c.isMember).map((chamber, index) => (
              <ChamberCard 
                key={chamber._id} 
                chamber={chamber} 
                onCopyLink={copyInviteLink}
                showJoinButton={true}
                onJoin={handleJoinPublic}
                index={index}
              />
            ))}
          </TabsContent>
        </Tabs>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="sm:max-w-md glass-card rounded-2xl border-primary/20">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 rounded-2xl" />
            <DialogHeader className="relative">
              <DialogTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                Create Echo Chamber
              </DialogTitle>
            </DialogHeader>
            
            <div className="relative space-y-5 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">Chamber Name</Label>
                <Input
                  id="name"
                  placeholder="My Awesome Chamber"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-white/5 border-white/10 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="topic" className="text-sm font-medium">Topic</Label>
                <Input
                  id="topic"
                  placeholder="e.g., coding, music, career-advice"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="bg-white/5 border-white/10 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="What's this chamber about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-white/5 border-white/10 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300 min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxMembers" className="text-sm font-medium">Max Members</Label>
                <Input
                  id="maxMembers"
                  type="number"
                  min={2}
                  max={500}
                  value={maxMembers}
                  onChange={(e) => setMaxMembers(parseInt(e.target.value) || 50)}
                  className="bg-white/5 border-white/10 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                <div>
                  <Label htmlFor="public" className="text-sm font-medium">Make Public</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Anyone can discover and join
                  </p>
                </div>
                <Switch
                  id="public"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
              </div>
            </div>

            <DialogFooter className="relative">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="border-white/20 hover:bg-white/10 transition-all duration-300">
                Cancel
              </Button>
              <Button 
                onClick={handleCreate}
                disabled={isCreating}
                className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg shadow-primary/30 transition-all duration-300 min-w-[140px]"
              >
                {isCreating ? (
                  <span className="flex items-center gap-2">
                    <Zap className="w-4 h-4 animate-pulse" />
                    Creating...
                  </span>
                ) : (
                  "Create Chamber"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function ChamberCard({ 
  chamber, 
  onCopyLink,
  showAlias = false,
  showJoinButton = false,
  onJoin,
  index = 0,
}: {
  chamber: Doc<'echoChambers'> & { isMember?: boolean; unreadCount?: number | null; lastMessage?: string | null; lastMessageHasImage?: boolean | null; lastMessageIsOwn?: boolean | null; lastMessageSenderAlias?: string | null; userAlias?: string | null; userRole?: string; userColor?: string | null; lastMessageTime?: number | null }; 
  onCopyLink: (code: string) => void;
  showAlias?: boolean;
  showJoinButton?: boolean;
  onJoin?: (code: string) => Promise<void>;
  index?: number;
}) {
  const [isJoiningCard, setIsJoiningCard] = useState(false);
  const router = useRouter();

  const handleJoinClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onJoin || !chamber.inviteCode) return;
    setIsJoiningCard(true);
    try {
      await onJoin(chamber.inviteCode);
    } finally {
      setIsJoiningCard(false);
    }
  };

  const handleCardClick = () => {
    if (!showJoinButton) {
      router.push(`/chambers/${chamber._id}`);
    }
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (chamber.inviteCode) {
      onCopyLink(chamber.inviteCode);
    }
  };

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/chambers/${chamber._id}?settings=true`);
  };

  return (
    <Card 
      className={`glass-card rounded-2xl p-6 transition-all duration-300 relative overflow-hidden group ${
        !showJoinButton ? 'hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 cursor-pointer' : ''
      }`}
      role={!showJoinButton ? 'button' : undefined}
      tabIndex={!showJoinButton ? 0 : undefined}
      onClick={handleCardClick}
      onKeyDown={!showJoinButton ? (e) => e.key === 'Enter' && handleCardClick() : undefined}
      style={{
        animationDelay: `${index * 100}ms`,
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {!showJoinButton && (
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-primary/0 via-primary/20 to-accent/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
      )}
      
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        {Number(chamber.unreadCount) > 0 && (
          <div className="min-w-6 h-6 px-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold flex items-center justify-center shadow-lg shadow-amber-500/30 animate-pulse">
            {Number(chamber.unreadCount) > 99 ? '99+' : Number(chamber.unreadCount)}
          </div>
        )}
        
        {!showJoinButton && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10 transition-colors">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass border-white/10">
              <DropdownMenuItem onClick={handleSettingsClick} className="hover:bg-white/10 transition-colors cursor-pointer">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              {chamber.inviteCode && (
                <DropdownMenuItem onClick={handleCopyLink} className="hover:bg-white/10 transition-colors cursor-pointer">
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Invite Link
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      
      <div className="relative pr-20">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <h3 className="text-lg font-semibold group-hover:text-primary transition-colors duration-300">{chamber.name}</h3>
          {chamber.isPublic ? (
            <Badge variant="secondary" className="bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-300 border border-emerald-500/30">
              <Globe className="w-3 h-3 mr-1" />
              Public
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/30">
              <Lock className="w-3 h-3 mr-1" />
              Private
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          <span className="flex items-center gap-1.5">
            <Hash className="w-4 h-4 text-primary/60" />
            {chamber.topic}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-accent/60" />
            {chamber.memberCount || 0} members
          </span>
        </div>

        {chamber.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {chamber.description}
          </p>
        )}

        {(chamber.lastMessage || chamber.lastMessageHasImage) && (
          <div className="p-3 rounded-xl bg-white/5 border border-white/5 mb-3">
            <p className="text-sm text-muted-foreground truncate flex items-center gap-1.5">
              <span className={`font-medium ${chamber.lastMessageIsOwn ? 'text-primary' : 'text-amber-300'}`}>
                {chamber.lastMessageSenderAlias}:
              </span>
              {chamber.lastMessageHasImage && (
                <ImageIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              )}
              {chamber.lastMessage ? (
                <span className="truncate">{chamber.lastMessage}</span>
              ) : (
                <span className="italic">Photo</span>
              )}
            </p>
          </div>
        )}

        {showAlias && (
          <Badge className="bg-gradient-to-r from-primary/20 to-accent/20 text-primary border border-primary/30">
            <Sparkles className="w-3 h-3 mr-1" />
            You are: {chamber.userAlias}
          </Badge>
        )}
      </div>

      {showJoinButton && (
        <div className="relative flex items-center gap-3 mt-5 pt-5 border-t border-white/10">
          <Button 
            size="sm" 
            onClick={handleJoinClick}
            disabled={isJoiningCard}
            className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg shadow-primary/30 hover:shadow-primary/40 transition-all duration-300"
          >
            <Users className="w-4 h-4 mr-2" />
            {isJoiningCard ? "Joining..." : "Join Chamber"}
          </Button>
        </div>
      )}
    </Card>
  );
}