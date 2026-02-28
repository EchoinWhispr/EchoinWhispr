'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, Shield, Cookie, Users, Mail } from 'lucide-react';
import { Logo } from '@/components/Logo';

const legalLinks = [
  { href: '/legal/terms', label: 'Terms of Service', shortLabel: 'Terms', icon: FileText },
  { href: '/legal/privacy', label: 'Privacy Policy', shortLabel: 'Privacy', icon: Shield },
  { href: '/legal/cookies', label: 'Cookie Policy', shortLabel: 'Cookies', icon: Cookie },
  { href: '/legal/guidelines', label: 'Community Guidelines', shortLabel: 'Guidelines', icon: Users },
  { href: '/contact', label: 'Contact Us', shortLabel: 'Contact', icon: Mail },
];

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link 
                href="/" 
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
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

      {/* Main content */}
      <div className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar - Desktop */}
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="glass-card rounded-2xl p-6"
                >
                  <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wide">
                    Legal Documents
                  </h3>
                  <nav className="space-y-2">
                    {legalLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-200"
                      >
                        <link.icon className="w-4 h-4" />
                        <span className="text-sm">{link.label}</span>
                      </Link>
                    ))}
                  </nav>
                </motion.div>
              </div>
            </aside>

            {/* Mobile navigation */}
            <div className="lg:hidden mb-6">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {legalLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all duration-200 whitespace-nowrap"
                  >
                    <link.icon className="w-4 h-4" />
                    <span>{link.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Content */}
            <main className="lg:col-span-3">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card rounded-2xl p-6 md:p-10"
              >
                {children}
              </motion.div>
            </main>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 bg-background/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground/60">
              {`© ${new Date().getFullYear()} EchoinWhispr. All rights reserved.`}
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              {legalLinks.slice(0, 4).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="hover:text-primary transition-colors duration-200"
                >
                  {link.shortLabel}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
