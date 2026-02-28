'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { Dashboard } from '@/components/Dashboard';
import LandingPage from '@/components/LandingPage';

/**
 * Root page component.
 *
 * Checks authentication status and renders appropriate content.
 *
 * - While Clerk is loading: show brief spinner (max 3s fallback to LandingPage)
 * - For unauthenticated users: show the landing page
 * - For authenticated users: show the Dashboard directly
 */
export default function HomePage() {
  const { isSignedIn, isLoaded } = useAuth();
  // Timeout fallback: if Clerk hasn't resolved in 3s, unblock rendering
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (isLoaded) return;
    const t = setTimeout(() => setTimedOut(true), 3000);
    return () => clearTimeout(t);
  }, [isLoaded]);

  // Block only while Clerk is genuinely loading and within the timeout window
  if (!isLoaded && !timedOut) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (isSignedIn) {
    return <Dashboard />;
  }

  return <LandingPage />;
}
