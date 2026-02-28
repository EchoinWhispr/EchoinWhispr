'use client';

export const dynamic = "force-dynamic";

import { Suspense } from 'react';
import { WhisperComposer } from '@/features/whispers/components/WhisperComposer';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ComposePageSkeleton = () => (
  <div className="min-h-[100dvh] pt-20 pb-10 px-4 md:px-8 lg:px-12 flex justify-center">
    <div className="w-full max-w-2xl animate-pulse">
      <div className="h-20 bg-primary/10 rounded-2xl mb-8 border border-white/5"></div>
      <div className="h-64 bg-card/50 rounded-2xl border border-white/5"></div>
    </div>
  </div>
);

export default function ComposePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in');
    }
  }, [isLoaded, user, router]);

  if (!isLoaded || !user) {
    return <ComposePageSkeleton />;
  }

  return (
    <div className="min-h-[100dvh] pt-20 pb-24 md:pb-10 px-4 md:px-8 lg:px-12 flex justify-center">
      <div className="w-full max-w-2xl">
        <header className="flex items-center justify-between mb-6 md:mb-8 glass p-4 sm:p-6 rounded-2xl border border-white/10">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="hover:bg-white/5 -ml-1 sm:-ml-2 touch-target h-10 w-10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="bg-primary/20 p-1.5 sm:p-2 rounded-lg">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight">New Whisper</h2>
          </div>
          <div
            className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-8 sm:size-10 ring-2 ring-primary/20"
            style={{ backgroundImage: `url(${user?.imageUrl})` }}
          ></div>
        </header>
        
        <main className="glass rounded-2xl border border-white/10 overflow-hidden p-1">
          <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6">
            <Suspense fallback={<ComposePageSkeleton />}>
              <WhisperComposer
                onWhisperSent={() => router.push('/inbox')}
                placeholder="What's on your mind? Whisper it to the void..."
              />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}