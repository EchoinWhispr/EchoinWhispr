'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, Shield, MessageCircle, Building2 } from 'lucide-react';
import { Logo } from '@/components/Logo';

const contactMethods = [
  {
    icon: MessageCircle,
    title: 'General Support',
    description: 'Questions about using EchoinWhispr',
    email: 'support@echoinwhispr.com',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Shield,
    title: 'Safety & Trust',
    description: 'Report abuse, harassment, or safety concerns',
    email: 'safety@echoinwhispr.com',
    color: 'from-rose-500 to-pink-500',
  },
  {
    icon: Mail,
    title: 'Privacy Inquiries',
    description: 'Data requests and privacy concerns',
    email: 'privacy@echoinwhispr.com',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    icon: Building2,
    title: 'Legal',
    description: 'Legal inquiries and formal requests',
    email: 'legal@echoinwhispr.com',
    color: 'from-primary to-primary',
  },
];

export default function ContactPage() {
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

      {/* Main Content */}
      <div className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
              Contact Us
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Have questions or concerns? We&apos;re here to help. Choose the best way to reach us below.
            </p>
          </motion.div>

          {/* Contact Methods Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {contactMethods.map((method, index) => (
              <motion.a
                key={method.title}
                href={`mailto:${method.email}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group glass-card rounded-2xl p-6 hover:border-primary/30 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${method.color} flex items-center justify-center mb-4`}>
                  <method.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2 group-hover:text-gradient transition-all">
                  {method.title}
                </h3>
                <p className="text-muted-foreground mb-3">
                  {method.description}
                </p>
                <p className="text-primary font-medium">
                  {method.email}
                </p>
              </motion.a>
            ))}
          </div>

          {/* Additional Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card rounded-2xl p-8 text-center"
          >
            <h2 className="text-2xl font-semibold mb-4">Response Times</h2>
            <p className="text-muted-foreground mb-6">
              We aim to respond to all inquiries within 24-48 hours during business days. 
              For urgent safety concerns, please contact local authorities.
            </p>
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

      {/* Footer */}
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
