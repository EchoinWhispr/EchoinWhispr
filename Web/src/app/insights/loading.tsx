import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function InsightsLoading() {
  return (
    <div className="min-h-[100dvh] pt-20 pb-10 px-4 md:px-8 lg:px-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="glass p-6 rounded-2xl border border-white/10">
          <div className="flex items-center gap-3">
            <Skeleton className="w-14 h-14 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
        </header>

        <Card className="glass border-white/10 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="w-5 h-5" />
            <Skeleton className="h-5 w-24" />
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <Skeleton className="w-5 h-5" />
                  <Skeleton className="w-4 h-4" />
                </div>
                <Skeleton className="h-7 w-12 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>

          <div className="bg-white/5 rounded-xl p-4">
            <Skeleton className="h-4 w-28 mb-3" />
            <div className="flex gap-2 h-24">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
                  <Skeleton className="w-full rounded-t" style={{ height: `${((i * 17) % 60) + 20}%` }} />
                  <Skeleton className="h-3 w-4" />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 text-center">
            <Skeleton className="h-6 w-28 mx-auto rounded-full" />
          </div>
        </Card>

        <Card className="glass border-white/10 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="w-5 h-5" />
            <Skeleton className="h-5 w-24" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-4 text-center">
                <Skeleton className="h-7 w-12 mx-auto mb-1" />
                <Skeleton className="h-3 w-20 mx-auto" />
              </div>
            ))}
          </div>

          <div className="mt-6">
            <Skeleton className="h-4 w-20 mb-2" />
            <div className="flex flex-wrap gap-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-5 w-16 rounded-full" />
              ))}
            </div>
          </div>
        </Card>

        <Card className="glass border-white/10 p-6 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="w-5 h-5" />
            <Skeleton className="h-5 w-32" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-4 text-center">
                <Skeleton className="h-8 w-12 mx-auto mb-1" />
                <Skeleton className="h-3 w-24 mx-auto" />
              </div>
            ))}
          </div>

          <div className="bg-white/5 rounded-xl p-4">
            <Skeleton className="h-4 w-28 mb-3" />
            <div className="flex gap-1 h-20">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
                  <Skeleton className="w-full rounded-t" style={{ height: `${((i * 23) % 60) + 20}%` }} />
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
