'use client';

import { Sparkles, ArrowRight, MessageSquare, Users, AtSign } from 'lucide-react';
import Link from 'next/link';
import { AdminStats } from '@/features/admin/components';
import { useAdminData } from '@/features/admin/hooks';
import { useQuery } from 'convex/react';
import { api } from '@/lib/convex';

export default function AdminDashboard() {
  const { stats, statsLoading, isSuperAdmin, pendingRequests } = useAdminData();
  const pendingUsernameRequests = useQuery(api.users.getPendingUsernameChangeRequests);
  const pendingUsernameCount = pendingUsernameRequests?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Platform Overview</h2>
        </div>
        <AdminStats stats={stats} isLoading={statsLoading} />
      </section>

      {/* Quick Actions */}
      <section className="grid md:grid-cols-2 gap-4">
        {/* Whisper Monitor Card */}
        <Link href="/admin/whispers" className="block group">
          <div className="glass rounded-xl p-6 border border-white/10 hover:border-primary/30 transition-all duration-300 h-full">
            <div className="flex items-start justify-between">
              <div>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Whisper Monitor
                </h3>
                <p className="text-sm text-muted-foreground">
                  View all whispers with full sender and recipient details.
                  Expandable rows reveal complete message information.
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        </Link>

        {/* Admin Requests Card (Super Admin only) */}
        {isSuperAdmin && (
          <Link href="/admin/requests" className="block group">
            <div className="glass rounded-xl p-6 border border-white/10 hover:border-primary/30 transition-all duration-300 h-full relative">
              {pendingRequests.length > 0 && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                  {pendingRequests.length}
                </div>
              )}
              <div className="flex items-start justify-between">
                <div>
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Admin Requests
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Review and approve pending admin privilege requests.
                    Grant or revoke admin roles.
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </Link>
        )}

        {/* Non-super admin sees placeholder */}
        {!isSuperAdmin && (
          <div className="glass rounded-xl p-6 border border-white/10 opacity-60">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Admin Requests
            </h3>
            <p className="text-sm text-muted-foreground">
              Super Admin access required to manage admin requests.
            </p>
          </div>
        )}

        {/* Username Change Requests Card — visible to all admins */}
        <Link href="/admin/requests?tab=username" className="block group">
          <div className="glass rounded-xl p-6 border border-white/10 hover:border-primary/30 transition-all duration-300 h-full relative">
            {pendingUsernameCount > 0 && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-primary/40">
                {pendingUsernameCount}
              </div>
            )}
            <div className="flex items-start justify-between">
              <div>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/70 to-accent flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <AtSign className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Username Requests
                </h3>
                <p className="text-sm text-muted-foreground">
                  Review and approve user requests to change their username.
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        </Link>
      </section>
    </div>
  );
}
