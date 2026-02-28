'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/Logo';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center relative overflow-hidden bg-background">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-accent/30 via-background to-background z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/15 via-transparent to-transparent z-0" />
      
      {/* Decorative Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent/20 rounded-full blur-3xl animate-pulse delay-1000" />
      
      {/* Noise texture */}
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-0 pointer-events-none" />
      
      {/* Navigation */}
      <div className="absolute top-8 left-8 z-20">
        <Button asChild variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
          <Link href="/">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </Button>
      </div>

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4">
            <Logo size="lg" asLink={false} />
          </div>
          <p className="text-muted-foreground text-center mt-2">
            Your space for anonymous connection
          </p>
        </div>

        <div className="glass p-1 rounded-2xl shadow-2xl shadow-primary/10 ring-1 ring-white/10">
          <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 sm:p-8 w-full flex justify-center">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
