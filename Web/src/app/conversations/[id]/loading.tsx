import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function ConversationDetailLoading() {
  return (
    <div className="min-h-[100dvh] pt-20 pb-10 px-4 md:px-8 lg:px-12 flex justify-center">
      <div className="w-full max-w-4xl">
        <Card className="glass border-white/10 h-[calc(100vh-8rem)]">
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-10 w-10 rounded-lg" />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[70%] space-y-2 ${
                      i % 2 === 0 ? 'items-start' : 'items-end'
                    }`}
                  >
                    <Skeleton
                      className={`h-16 ${
                        i % 2 === 0 ? 'w-64' : 'w-48'
                      } rounded-2xl`}
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-4 border-t border-white/10">
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
                <Skeleton className="h-12 flex-1 rounded-xl" />
                <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
