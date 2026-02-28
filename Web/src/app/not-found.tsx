import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Ghost, Home } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function NotFound(): JSX.Element {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="glass p-12 rounded-3xl border border-white/10 text-center max-w-lg relative z-10 backdrop-blur-xl shadow-2xl">
        <div className="bg-primary/20 p-6 rounded-full w-24 h-24 mx-auto mb-8 flex items-center justify-center animate-float">
          <Ghost className="w-12 h-12 text-primary" />
        </div>
        
        <h1 className="text-6xl font-bold tracking-tighter mb-4 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
          404
        </h1>
        
        <h2 className="text-2xl font-semibold mb-4 text-white">
          Lost in the Void?
        </h2>
        
        <p className="text-muted-foreground mb-8 text-lg leading-relaxed">
          The whisper you&apos;re looking for has faded into silence. It seems this page doesn&apos;t exist or has been removed.
        </p>
        
        <div className="flex justify-center">
          <Link 
            href="/" 
            className={cn(buttonVariants({ size: "lg" }), "gap-2")}
          >
            <Home className="w-4 h-4" />
            Return Home
          </Link>
        </div>
      </div>
    </main>
  );
}
