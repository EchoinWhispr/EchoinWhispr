'use client';

import { useQuery } from 'convex/react';
import { api } from '@/lib/convex';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  MessageSquare,
  Users,
  Calendar,
  Heart,
  Sparkles, 
  Activity,
  Zap
} from 'lucide-react';

export default function InsightsPage() {
  const weeklyData = useQuery(api.analytics.getWeeklyInsights);
  const monthlyData = useQuery(api.analytics.getMonthlyInsights);
  const yearData = useQuery(api.analytics.getYearInReview, {});

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-400" />;
      default: return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="min-h-[100dvh] pt-20 pb-10 px-4 md:px-8 lg:px-12">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="glass p-6 rounded-2xl border border-white/10">
          <div className="flex items-center gap-3">
<div className="bg-gradient-to-br from-primary/20 to-accent/20 p-3 rounded-xl">
              <BarChart3 className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gradient">
                Connection Insights
              </h1>
              <p className="text-muted-foreground">
                Understand your communication patterns
              </p>
            </div>
          </div>
        </header>

        {/* Weekly Overview */}
        <Card className="glass border-white/10 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            This Week
          </h2>

          {weeklyData ? (
            <>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <StatCard
                  icon={<MessageSquare className="w-5 h-5" />}
                  label="Messages Sent"
                  value={weeklyData.totals.messagesSent}
                  trend={weeklyData.trends.messagesSent}
                  trendIcon={getTrendIcon(weeklyData.trends.messagesSent)}
                  color="from-blue-500/20 to-cyan-500/20"
                />
                <StatCard
                  icon={<Heart className="w-5 h-5" />}
                  label="Messages Received"
                  value={weeklyData.totals.messagesReceived}
                  trend={weeklyData.trends.messagesReceived}
                  trendIcon={getTrendIcon(weeklyData.trends.messagesReceived)}
                  color="from-pink-500/20 to-rose-500/20"
                />
                <StatCard
                  icon={<Users className="w-5 h-5" />}
                  label="New Connections"
                  value={weeklyData.totals.newConnections}
                  trend={weeklyData.trends.newConnections}
                  trendIcon={getTrendIcon(weeklyData.trends.newConnections)}
                  color="from-green-500/20 to-emerald-500/20"
                />
              </div>

              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-sm text-muted-foreground mb-3">Daily Activity</p>
                <div className="flex gap-2 h-24">
                  {weeklyData.dailyData.map((day, i) => {
                    const total = day.messagesSent + day.messagesReceived;
                    const maxTotal = Math.max(
                      ...weeklyData.dailyData.map(d => d.messagesSent + d.messagesReceived),
                      1
                    );
                    const height = (total / maxTotal) * 100;

                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
                        <div 
                          className="w-full bg-gradient-to-t from-primary/40 to-accent/40 rounded-t"
                          style={{ height: `${Math.max(height, 4)}%` }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 text-center">
                <Badge className="bg-primary/20 text-primary">
                  ~{weeklyData.avgMessagesPerDay} messages/day
                </Badge>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Loading weekly insights...
            </div>
          )}
        </Card>

        {/* Monthly Overview */}
        <Card className="glass border-white/10 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-accent" />
            This Month
          </h2>

          {monthlyData ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 rounded-xl p-4 text-center">
<div className="text-2xl font-bold text-primary">
                    {monthlyData.totals.messagesSent + monthlyData.totals.messagesReceived}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Messages</div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
<div className="text-2xl font-bold text-accent">
                    {monthlyData.daysActive}
                  </div>
                  <div className="text-xs text-muted-foreground">Days Active</div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
<div className="text-2xl font-bold text-accent">
                    {monthlyData.totals.newConnections}
                  </div>
                  <div className="text-xs text-muted-foreground">New Connections</div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-amber-400">
                    {monthlyData.mostActiveDay ? new Date(monthlyData.mostActiveDay).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    }) : '-'}
                  </div>
                  <div className="text-xs text-muted-foreground">Most Active Day</div>
                </div>
              </div>

              {monthlyData.topInterests && monthlyData.topInterests.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Top Topics</p>
                  <div className="flex flex-wrap gap-2">
                    {monthlyData.topInterests.map((interest, i) => (
<Badge 
                        key={i}
                        className="bg-accent/20 text-accent"
                      >
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Loading monthly insights...
            </div>
          )}
        </Card>

        {/* Year in Review */}
        {yearData && (
          <Card className="glass border-white/10 p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
            
            <div className="relative z-10">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Year in Review {yearData.year}
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-gradient">
                    {yearData.totalMessages}
                  </div>
                  <div className="text-xs text-muted-foreground">Messages Exchanged</div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-gradient">
                    {yearData.totals.newConnections}
                  </div>
                  <div className="text-xs text-muted-foreground">Connections Made</div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-gradient">
                    {yearData.daysActive}
                  </div>
                  <div className="text-xs text-muted-foreground">Days Active</div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-gradient">
                    {yearData.longestStreak}
                  </div>
                  <div className="text-xs text-muted-foreground">Longest Streak 🔥</div>
                </div>
              </div>

              {yearData.monthlyData && yearData.monthlyData.length > 0 && (
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-sm text-muted-foreground mb-3">Monthly Activity</p>
                  <div className="flex gap-1 h-20">
                    {yearData.monthlyData.map((month, i) => {
                      const total = month.messagesSent + month.messagesReceived;
                      const maxTotal = Math.max(
                        ...yearData.monthlyData.map(m => m.messagesSent + m.messagesReceived),
                        1
                      );
                      const height = (total / maxTotal) * 100;

                      return (
                        <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
                          <div 
                            className="w-full bg-gradient-to-t from-primary/50 to-accent/50 rounded-t"
                            style={{ height: `${Math.max(height, 4)}%` }}
                          />
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(month.month + '-01').toLocaleDateString('en-US', { month: 'narrow' })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Peak Month: <strong className="text-accent">
                    {yearData.peakMonth ? new Date(yearData.peakMonth + '-01').toLocaleDateString('en-US', { 
                      month: 'long' 
                    }) : '-'}
                  </strong>
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Empty State */}
        {(!weeklyData && !monthlyData) && (
          <Card className="glass border-white/10 p-12 text-center">
            <Zap className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-xl font-semibold mb-2">Start Connecting!</h3>
            <p className="text-muted-foreground">
              Your insights will appear here once you start exchanging messages.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

// Stat Card Component
// StatCard Component
function StatCard({ 
  icon, 
  label, 
  value, 
  trendIcon,
  color 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: number;
  trend?: string; // Kept in type but optional/unused to avoid breaking callers if strictly typed
  trendIcon: React.ReactNode;
  color: string;
}) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-xl p-4`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-muted-foreground">{icon}</div>
        {trendIcon}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
