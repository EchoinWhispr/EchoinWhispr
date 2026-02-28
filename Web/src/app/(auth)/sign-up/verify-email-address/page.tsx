'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSignUp } from '@clerk/nextjs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const runtime = 'edge';

function VerifyEmailAddressContent(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  useSignUp();

  useEffect(() => {
    // Check if we have the required verification parameters
    const emailAddress = searchParams.get('email_address');

    if (!emailAddress) {
      // Redirect back to sign-up if missing required parameters
      router.push('/sign-up');
      return;
    }

    // For email link verification, Clerk handles the verification automatically
    // when the user is redirected back from the email link
    // No manual verification call is needed
  }, [router, searchParams]);

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Verifying Email</CardTitle>
          <CardDescription>
            Please wait while we verify your email address...
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="text-sm text-muted-foreground">
              This may take a few moments
            </p>
            <Button
              variant="outline"
              onClick={() => router.push('/sign-up')}
              className="mt-4"
            >
              Back to Sign Up
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

export default function VerifyEmailAddressPage(): JSX.Element {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[100dvh] flex-col items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">Loading...</CardTitle>
            </CardHeader>
          </Card>
        </main>
      }
    >
      <VerifyEmailAddressContent />
    </Suspense>
  );
}
