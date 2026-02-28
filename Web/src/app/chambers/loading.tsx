import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function ChambersLoading() {
  return (
    <div className="min-h-[100dvh] pt-20 pb-10 px-4 md:px-8 lg:px-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <Card className="glass border-white/10 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-14 w-14 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-7 w-40" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <Skeleton className="h-10 w-36 rounded-lg" />
          </div>
          <div className="mt-6 flex gap-2">
            <Skeleton className="h-10 w-64 rounded-lg" />
            <Skeleton className="h-10 w-20 rounded-lg" />
          </div>
        </Card>

        <div className="space-y-4">
          <Skeleton className="h-12 w-full rounded-xl" />
          
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="glass border-white/10 p-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-6 w-32 rounded-full" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
