import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function FriendsLoading() {
  return (
    <div className="min-h-[100dvh] pt-20 pb-10 px-4 md:px-8 lg:px-12 flex justify-center">
      <div className="w-full max-w-4xl space-y-6">
        <Card className="glass border-white/10 p-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </Card>

        <Card className="glass border-white/10 p-6">
          <div className="space-y-4 mb-6">
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-6 w-32 mb-4" />
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-4 rounded-xl bg-secondary/20 border border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-24 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
