import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfileLoading() {
  return (
    <div className="min-h-[100dvh] pt-20 pb-24 md:pb-10 px-4 md:px-8 lg:px-12 flex justify-center">
      <div className="w-full max-w-4xl space-y-6">
        <Card className="glass border-white/10 p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <Skeleton className="h-24 w-24 md:h-32 md:w-32 rounded-full" />
            <div className="flex-1 space-y-4 text-center md:text-left">
              <Skeleton className="h-8 w-48 mx-auto md:mx-0" />
              <Skeleton className="h-5 w-32 mx-auto md:mx-0" />
              <Skeleton className="h-4 w-40 mx-auto md:mx-0" />
              <Skeleton className="h-4 w-32 mx-auto md:mx-0" />
              <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>
          </div>
          <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        </Card>

        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="glass border-white/10 p-4 text-center">
              <Skeleton className="h-10 w-10 rounded-xl mx-auto mb-2" />
              <Skeleton className="h-7 w-12 mx-auto mb-1" />
              <Skeleton className="h-3 w-16 mx-auto" />
            </Card>
          ))}
        </div>

        <Card className="glass border-white/10 p-6">
          <Skeleton className="h-6 w-28 mb-4" />
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-3 rounded-xl bg-white/5">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <Skeleton className="h-5 w-5" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
