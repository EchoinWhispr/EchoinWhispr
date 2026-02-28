'use client';

import { useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { 
  Home, Send, Inbox, Radio, User, Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FEATURE_FLAGS } from '@/config/featureFlags';

/**
 * Navigation item configuration for bottom navigation
 */
interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isPrimary?: boolean;
}

/**
 * BottomNavigation component for mobile devices.
 * 
 * Provides thumb-friendly navigation fixed at the bottom of the screen.
 * Features:
 * - Fixed position at bottom with safe-area support for iOS notch
 * - 5 primary navigation items
 * - Centered "Compose" action button with elevated styling
 * - Active state highlighting with gradient background
 * - Only visible on mobile (hidden on md+ screens)
 */
export const BottomNavigation = () => {
  const pathname = usePathname();
  const { user, isLoaded } = useUser();

  /**
   * Check if current path matches navigation item
   */
  const isActiveRoute = useCallback(
    (href: string) => {
      if (href === '/') {
        return pathname === '/';
      }
      return pathname.startsWith(href);
    },
    [pathname]
  );

  /**
   * Navigation items for bottom nav
   */
  const navigationItems: NavItem[] = useMemo(() => {
    const items: NavItem[] = [
      {
        href: '/',
        label: 'Home',
        icon: Home,
      },
      {
        href: '/inbox',
        label: 'Inbox',
        icon: Inbox,
      },
      {
        href: '/compose',
        label: 'Compose',
        icon: Plus,
        isPrimary: true,
      },
      {
        href: '/chambers',
        label: 'Chambers',
        icon: Radio,
      },
    ];

    // Add profile link
    if (FEATURE_FLAGS.USER_PROFILE_EDITING) {
      items.push({
        href: '/profile',
        label: 'Profile',
        icon: User,
      });
    } else {
      // Fallback to a different fifth item
      items.push({
        href: '/discover',
        label: 'Discover',
        icon: Send,
      });
    }

    return items;
  }, []);

  // Check if we're in an active chat view where we need the full screen for keyboard
  const isChatView = pathname.match(/^\/chambers\/[a-zA-Z0-9_-]+$/) || 
                     pathname.match(/^\/conversations\/[a-zA-Z0-9_-]+$/);

  // Don't render for unauthenticated users, during loading, or in active chat views
  if (!isLoaded || !user || isChatView) {
    return null;
  }

  return (
    <>
      {/* Spacer to prevent content from hiding behind fixed nav on mobile */}
      <div className="h-16 w-full md:hidden safe-bottom" aria-hidden="true" />
      <nav 
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass border-t border-white/10 safe-bottom pb-2"
        role="navigation"
        aria-label="Mobile navigation"
      >
      <div className="flex items-center justify-around h-16 px-1 sm:px-2 gap-1 sm:gap-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = isActiveRoute(item.href);

          // Primary action (Compose) gets special styling
          if (item.isPrimary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-6"
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <div 
                  className={cn(
                    "flex items-center justify-center w-14 h-14 rounded-full",
                    "bg-gradient-to-br from-primary to-accent",
                    "shadow-lg shadow-primary/30",
                    "transition-all duration-300",
                    "hover:scale-105 hover:shadow-xl hover:shadow-primary/40",
                    "active:scale-95"
                  )}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-[10px] font-medium mt-1 text-muted-foreground">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center",
                "touch-target py-2 px-3 rounded-lg",
                "transition-all duration-200",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div 
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-lg",
                  "transition-all duration-200",
                  isActive && "bg-primary/20"
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className={cn(
                "text-[10px] font-medium mt-0.5",
                isActive && "text-primary"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
    </>
  );
};
