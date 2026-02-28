import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function SkillsLoading() {
  return (
    <div className="min-h-[100dvh] pt-20 pb-10 px-4 md:px-8 lg:px-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="glass p-6 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="w-14 h-14 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-7 w-40" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <Skeleton className="h-10 w-28 rounded-lg" />
          </div>
        </header>

        <Card className="glass border-white/10 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="w-5 h-5" />
            <Skeleton className="h-5 w-24" />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-28" />
              <div className="space-y-2">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-green-500/10 rounded-lg">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-6 rounded" />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Skeleton className="h-5 w-28" />
              <div className="space-y-2">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-blue-500/10 rounded-lg">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-6 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card className="glass border-white/10 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="w-5 h-5" />
            <Skeleton className="h-5 w-36" />
          </div>

          <div className="flex gap-2 mb-6">
            <Skeleton className="h-10 flex-1 rounded-lg" />
            <Skeleton className="h-10 flex-1 rounded-lg" />
          </div>

          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-4 rounded-xl border border-white/5">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-28" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-20 rounded-full" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  </div>
                  <Skeleton className="w-5 h-5" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
