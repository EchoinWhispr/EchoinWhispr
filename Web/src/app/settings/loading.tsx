import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsLoading() {
  return (
    <div className="min-h-[100dvh] pt-20 pb-10 px-4 md:px-8 lg:px-12 flex justify-center">
      <div className="w-full max-w-4xl space-y-8">
        <header className="flex items-center gap-3 glass p-6 rounded-2xl border border-white/10">
          <Skeleton className="w-12 h-12 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-4 w-48" />
          </div>
        </header>

        <Card className="glass border-white/10 p-6">
          <div className="space-y-4">
            <div className="flex gap-2 mb-6">
              <Skeleton className="h-10 w-28 rounded-lg" />
              <Skeleton className="h-10 w-28 rounded-lg" />
              <Skeleton className="h-10 w-28 rounded-lg" />
            </div>

            <div className="space-y-4">
              <Skeleton className="h-6 w-32" />
              <Card className="glass border-white/10 p-6">
                <div className="space-y-4">
                  <Skeleton className="h-5 w-28" />
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-20 rounded-md" />
                    <Skeleton className="h-9 w-20 rounded-md" />
                    <Skeleton className="h-9 w-20 rounded-md" />
                  </div>
                </div>
              </Card>

              <Card className="glass border-white/10 p-6">
                <div className="space-y-4">
                  <Skeleton className="h-5 w-36" />
                  <div className="flex flex-wrap gap-2">
                    {[...Array(6)].map((_, i) => (
                      <Skeleton key={i} className="h-6 w-20 rounded-full" />
                    ))}
                  </div>
                </div>
              </Card>

              <Card className="glass border-white/10 p-6">
                <div className="space-y-4">
                  <Skeleton className="h-5 w-44" />
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <Skeleton className="h-6 w-12 rounded-full" />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
