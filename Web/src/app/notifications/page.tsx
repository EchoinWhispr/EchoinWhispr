'use client';

import { useQuery, useMutation } from 'convex/react';
import { api, Id } from '@/lib/convex';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Bell, 
  Check, 
  Trash2, 
  MessageSquare, 
  Users, 
  Radio, 
  Sparkles,
  Info,
  CheckCheck,
  Image as ImageIcon
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';

const notificationIcons = {
  whisper: MessageSquare,
  friend_request: Users,
  chamber: Radio,
  resonance: Sparkles,
  system: Info,
};

const notificationColors = {
  whisper: 'from-primary/20 to-primary/20 border-primary/30',
  friend_request: 'from-emerald-500/20 to-cyan-500/20 border-emerald-500/30',
  chamber: 'from-amber-500/20 to-orange-500/20 border-amber-500/30',
  resonance: 'from-pink-500/20 to-rose-500/20 border-pink-500/30',
  system: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
};

export default function NotificationsPage() {
  const router = useRouter();

  const notificationsData = useQuery(api.notifications.getNotifications, { limit: 50 });
  const unreadCount = useQuery(api.notifications.getUnreadCount);
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);
  const deleteNotification = useMutation(api.notifications.deleteNotification);

  const handleNotificationClick = async (notification: {
    _id: Id<'notifications'>;
    read: boolean;
    actionUrl?: string;
  }) => {
    try {
      if (!notification.read) {
        await markAsRead({ notificationId: notification._id });
      }
      if (notification.actionUrl) {
        router.push(notification.actionUrl);
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleDelete = async (notificationId: Id<'notifications'>) => {
    try {
      await deleteNotification({ notificationId });
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const isLoading = notificationsData === undefined;
  const notifications = notificationsData?.notifications || [];

  return (
    <div className="min-h-[100dvh] pt-20 pb-10 px-4 md:px-8 lg:px-12 flex justify-center">
      <div className="w-full max-w-3xl">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8 glass p-4 sm:p-6 rounded-2xl border border-white/10">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2 sm:p-2.5 rounded-xl">
              <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Notifications</h1>
              <p className="text-muted-foreground text-xs sm:text-sm">
                {unreadCount !== undefined ? `${unreadCount} unread` : 'Loading...'}
              </p>
            </div>
          </div>
          {notifications.length > 0 && unreadCount !== undefined && unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              className="gap-2"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </Button>
          )}
        </header>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="glass p-4 border border-white/10 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <Card className="glass p-8 border border-white/10 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Bell className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-semibold mb-1">No notifications yet</h2>
                <p className="text-muted-foreground text-sm">
                  We&apos;ll notify you when something happens!
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const IconComponent = notificationIcons[notification.type as keyof typeof notificationIcons] || Info;
              const colorClass = notificationColors[notification.type as keyof typeof notificationColors] || notificationColors.system;

              return (
                <Card
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`glass p-4 border border-white/10 hover:bg-white/5 cursor-pointer transition-colors ${
                    !notification.read ? 'bg-white/[0.02]' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${colorClass} border flex items-center justify-center flex-shrink-0`}>
                      <IconComponent className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium truncate ${!notification.read ? 'text-white' : 'text-muted-foreground'}`}>
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 flex items-center gap-1">
                        {notification.metadata?.hasImage && (
                          <ImageIcon className="w-3 h-3 flex-shrink-0" />
                        )}
                        <span>{notification.message}</span>
                      </p>
                      {notification.type === 'chamber' && (notification.metadata?.messageCount ?? 0) > 1 && (
                        <p className="text-[10px] text-amber-400 mt-0.5">
                          {notification.metadata.messageCount > 99 ? '99+' : notification.metadata.messageCount} new messages
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground/60">
                          {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                        </span>
                        <div className="flex gap-1">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 hover:bg-white/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead({ notificationId: notification._id as Id<'notifications'> }).catch(
                                  (err) => console.error('Failed to mark as read:', err)
                                );
                              }}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 hover:bg-red-500/20 hover:text-red-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(notification._id as Id<'notifications'>);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
