import { Skeleton } from '@/components/ui/skeleton';

export default function ChamberViewLoading() {
  return (
    <div className="min-h-[100dvh] pt-16 flex flex-col">
      <header className="sticky top-16 z-40 glass border-b border-white/10 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-1">
              <Skeleton className="h-5 w-32" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-16 rounded-full" />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  i % 2 === 0
                    ? 'bg-white/10 rounded-bl-md'
                    : 'bg-gradient-to-r from-emerald-600/40 to-cyan-600/40 rounded-br-md'
                }`}
              >
                {i % 2 === 0 && (
                  <div className="flex items-center gap-2 mb-1">
                    <Skeleton className="w-2 h-2 rounded-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                )}
                <Skeleton
                  className={`h-4 ${i % 2 === 0 ? 'w-64' : 'w-48'}`}
                />
                <Skeleton className="h-3 w-12 mt-1 ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="sticky bottom-0 glass border-t border-white/10 px-4 py-3">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-12 flex-1 rounded-xl" />
            <Skeleton className="h-12 w-12 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
