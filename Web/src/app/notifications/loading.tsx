import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function NotificationsLoading() {
  return (
    <div className="min-h-[100dvh] pt-20 pb-10 px-4 md:px-8 lg:px-12 flex justify-center">
      <div className="w-full max-w-3xl">
        <div className="glass p-4 sm:p-6 rounded-2xl border border-white/10 mb-6 md:mb-8">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="glass p-4 border border-white/10">
              <div className="flex gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <div className="flex justify-between items-center mt-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-6 w-14 rounded" />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
