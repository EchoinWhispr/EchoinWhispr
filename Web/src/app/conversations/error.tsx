'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, ArrowLeft, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ConversationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error('Conversations error boundary caught:', error);
  }, [error]);

  return (
    <div className="min-h-[100dvh] pt-20 pb-10 px-4 md:px-8 lg:px-12 flex justify-center items-center">
      <Card className="glass w-full max-w-md border-white/10">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <MessageSquare className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Failed to load conversations</CardTitle>
          <CardDescription>
            We couldn&apos;t load your conversations. Please try again.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <Button onClick={reset} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try again
            </Button>
            <Button variant="outline" onClick={() => router.back()} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
