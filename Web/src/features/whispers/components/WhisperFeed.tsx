import React from 'react';
import Link from 'next/link';
import { Plus, Sparkles, MessageCircle } from 'lucide-react';
import { WhisperList } from './WhisperList';
import { Button } from '@/components/ui/button';

/**
 * WhisperFeed component - Main feed view for whispers.
 * 
 * Features:
 * - Premium glass header with gradient icon
 * - Floating action button for new whispers
 * - Enhanced list container with glass effects
 */
export const WhisperFeed: React.FC = () => {
  return (
    <div className="min-h-[100dvh] pt-20 pb-10 px-4 md:px-8 lg:px-12 w-full">
      <div className="w-full max-w-4xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-8 glass-card p-6 rounded-2xl">
          <div className="flex items-center gap-4">
            {/* Icon with gradient background */}
            <div className="relative bg-gradient-to-br from-primary to-accent p-3 rounded-xl shadow-glow-sm">
              <Sparkles className="w-6 h-6 text-white" />
              {/* Subtle glow ring */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-accent opacity-50 blur-md -z-10" />
            </div>
            
            <div>
              <h2 className="text-2xl font-display font-bold tracking-tight">
                Whisper Feed
              </h2>
              <p className="text-muted-foreground text-sm mt-0.5">
                Listen to the echoes of the void
              </p>
            </div>
          </div>
          
          <Link href="/compose">
            <Button 
              variant="gradient" 
              className="gap-2 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-shadow"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Whisper</span>
            </Button>
          </Link>
        </header>
        
        {/* Main content area */}
        <main className="space-y-6">
          {/* Stats/Summary bar */}
          <div className="flex items-center justify-between glass px-4 py-3 rounded-xl text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MessageCircle className="w-4 h-4 text-primary" />
              <span>Your latest whispers and messages</span>
            </div>
          </div>
          
          {/* Whisper list container */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-1">
              <div className="bg-background/30 backdrop-blur-sm rounded-xl">
                <WhisperList showMarkAsRead />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};