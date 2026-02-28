'use client';

import { ClerkProvider, useAuth } from '@clerk/nextjs';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import convex from '@/lib/convex';
import { ReactNode, useMemo } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { AuthErrorBoundary } from '@/features/authentication/components/AuthErrorBoundary';
import { ThemeProvider } from 'next-themes';
import { useSessionExpiry } from '@/lib/auth';
import { ToastStateProvider } from '@/hooks/use-toast';

function validateClerkPublishableKey(): string {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    throw new Error(
      'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY environment variable is not set'
    );
  }

  if (!publishableKey.startsWith('pk_')) {
    throw new Error(
      'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must be a valid Clerk publishable key starting with "pk_"'
    );
  }

  return publishableKey;
}

interface ProvidersProps {
  children: ReactNode;
}

function SessionManager() {
  useSessionExpiry({
    warningThresholdMs: 5 * 60 * 1000,
    checkIntervalMs: 60 * 1000,
  });

  return null;
}

export function Providers({ children }: ProvidersProps) {
  const clerkPublishableKey = useMemo(() => {
    try {
      return validateClerkPublishableKey();
    } catch (error) {
      console.error('Provider initialization failed:', error);
      return null;
    }
  }, []);

  if (!clerkPublishableKey) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center p-6">
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold">
            Authentication initialization failed
          </p>
          <p className="text-sm text-muted-foreground">
            Please refresh the page or try again later.
          </p>
        </div>
      </main>
    );
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <ToastStateProvider>
        <AuthErrorBoundary>
          <ClerkProvider
            publishableKey={clerkPublishableKey}
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            afterSignInUrl="/"
            afterSignUpUrl="/"
          >
            {convex ? (
              <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
                <SessionManager />
                {children}
                <Toaster />
              </ConvexProviderWithClerk>
            ) : (
              <>
                <SessionManager />
                {children}
                <Toaster />
              </>
            )}
          </ClerkProvider>
        </AuthErrorBoundary>
      </ToastStateProvider>
    </ThemeProvider>
  );
}
