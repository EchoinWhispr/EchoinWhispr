'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Radio, Users, Hash, ArrowRight, Loader2 } from 'lucide-react';

export default function JoinChamberPage() {
  const { code } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [isJoining, setIsJoining] = useState(false);

  const chamber = useQuery(api.echoChambers.getChamberByInviteCode, {
    inviteCode: (code as string) || '',
  });
  const joinChamber = useMutation(api.echoChambers.joinChamber);

  const handleJoin = async () => {
    setIsJoining(true);
    try {
      const result = await joinChamber({ inviteCode: code as string });
      
      toast({
        title: result.alreadyMember ? "Welcome back!" : "Joined! 🎉",
        description: `You are ${result.anonymousAlias}`,
      });

      router.push(`/chambers/${result.chamberId}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Please try again.";
      toast({
        title: "Failed to join",
        description: errorMessage,
        variant: "destructive",
      });
      setIsJoining(false);
    }
  };

  if (chamber === undefined) {
    return (
      <div className="min-h-[100dvh] pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!chamber) {
    return (
      <div className="min-h-[100dvh] pt-20 flex items-center justify-center p-4">
        <Card className="glass border-white/10 p-8 text-center max-w-md w-full">
          <Radio className="w-16 h-16 mx-auto mb-4 text-red-400/50" />
          <h2 className="text-xl font-bold mb-2">Invalid Invite</h2>
          <p className="text-muted-foreground mb-4">
            This invite code doesn&apos;t exist or has expired.
          </p>
          <Button variant="outline" onClick={() => router.push('/chambers')}>
            Browse Chambers
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] pt-20 flex items-center justify-center p-4">
      <Card className="glass border-white/10 p-8 max-w-md w-full relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-cyan-500/5" />
        
        <div className="relative z-10 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
            <Radio className="w-10 h-10 text-emerald-400" />
          </div>

          <h1 className="text-2xl font-bold mb-2">
            You&apos;re Invited!
          </h1>
          
          <h2 className="text-xl text-gradient mb-4">
            {chamber.name}
          </h2>

          {chamber.description && (
            <p className="text-muted-foreground mb-4">
              {chamber.description}
            </p>
          )}

          <div className="flex justify-center gap-4 text-sm text-muted-foreground mb-6">
            <span className="flex items-center gap-1">
              <Hash className="w-4 h-4" />
              {chamber.topic}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {chamber.memberCount}/{chamber.maxMembers}
            </span>
          </div>

          <div className="bg-white/5 rounded-lg p-4 mb-6">
            <p className="text-sm text-muted-foreground mb-2">
              You&apos;ll join as an anonymous member
            </p>
            <p className="text-xs text-muted-foreground">
              Your identity will be hidden with a unique alias
            </p>
          </div>

          <Button 
            size="lg"
            onClick={handleJoin}
            disabled={isJoining || chamber.memberCount >= chamber.maxMembers}
            className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700"
          >
            {isJoining ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Joining...
              </>
            ) : chamber.memberCount >= chamber.maxMembers ? (
              "Chamber is Full"
            ) : (
              <>
                Join Chamber
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
