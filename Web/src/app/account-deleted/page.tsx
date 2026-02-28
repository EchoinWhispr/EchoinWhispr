'use client';

export const runtime = 'edge';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, AlertTriangle } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';

export default function AccountDeletedPage() {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <nav className="fixed top-0 w-full z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Back to home"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </Link>
              <div className="h-6 w-px bg-white/10" />
              <Logo size="sm" />
            </div>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-rose-500/20 to-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-rose-400" />
            </div>

            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
              Account Deleted
            </h1>

            <p className="text-xl text-muted-foreground max-w-lg mx-auto mb-8">
              Your account has been deleted. You no longer have access to EchoinWhispr.
            </p>

            <div className="glass-card rounded-2xl p-8 text-left mb-8">
              <h2 className="text-xl font-semibold mb-4">What happened?</h2>
              <p className="text-muted-foreground mb-4">
                Your account was deleted and can no longer be accessed. This action may have been
                initiated by you or by our team due to a violation of our community guidelines.
              </p>

              <h3 className="text-lg font-semibold mb-2 mt-6">If you believe this is an error</h3>
              <p className="text-muted-foreground mb-4">
                If you think your account was deleted by mistake or would like to request account
                restoration, please contact our support team.
              </p>

              <Button
                asChild
                className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
              >
                <a href="mailto:support@echoinwhispr.com">
                  <Mail className="w-4 h-4 mr-2" />
                  Contact Support
                </a>
              </Button>
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <Link
                href="/legal/terms"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Terms of Service
              </Link>
              <span className="text-white/20">•</span>
              <Link
                href="/legal/privacy"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Privacy Policy
              </Link>
              <span className="text-white/20">•</span>
              <Link
                href="/legal/guidelines"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Community Guidelines
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      <footer className="border-t border-white/5 py-8 bg-background/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-muted-foreground/60">
            © 2025 EchoinWhispr. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
