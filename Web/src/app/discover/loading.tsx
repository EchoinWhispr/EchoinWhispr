import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function DiscoverLoading() {
  return (
    <div className="min-h-[100dvh] pt-20 pb-10 px-4 md:px-8 lg:px-12 flex justify-center">
      <div className="w-full max-w-4xl space-y-8">
        <Card className="glass border-white/10 p-6 md:p-8 rounded-3xl relative overflow-hidden">
          <div className="flex items-center gap-3 md:gap-4 mb-6">
            <Skeleton className="w-12 h-12 md:w-14 md:h-14 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 md:gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-2xl p-4 md:p-5 border border-white/10">
                <Skeleton className="w-8 h-8 rounded-lg mb-2" />
                <Skeleton className="h-7 w-12 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        </Card>

        <Card className="glass border-white/10 p-6 md:p-8 text-center">
          <div className="relative inline-block mb-6">
            <Skeleton className="w-24 h-24 md:w-28 md:h-28 rounded-full" />
          </div>

          <Skeleton className="h-7 w-48 mx-auto mb-3" />
          <Skeleton className="h-4 w-72 mx-auto mb-8" />

          <Skeleton className="h-14 w-40 mx-auto rounded-2xl" />
        </Card>

        <Card className="glass border-white/10 p-5 md:p-6">
          <div className="flex items-center gap-2 md:gap-3 mb-4">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="h-5 w-40" />
          </div>
          <div className="flex flex-wrap gap-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-6 w-20 rounded-full" />
            ))}
          </div>
        </Card>

        <Card className="glass border-white/10 p-5 md:p-6">
          <div className="flex items-center gap-2 md:gap-3 mb-4">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
