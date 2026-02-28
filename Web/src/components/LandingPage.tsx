'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Sparkles, User, Shield, Zap, Lock, EyeOff, PenTool, ArrowRightLeft, Clock, Send, RotateCcw, ServerOff, Database, Key, HelpCircle, MessageSquare, Heart } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useReducedMotion } from '@/hooks/useReducedMotion';

// ═══════════════════════════════════════════════════════════════════════
// Data & Content
// ═══════════════════════════════════════════════════════════════════════

const marqueeItems = [
  { text: 'ZERO-KNOWLEDGE PROOFS', icon: Shield },
  { text: 'DECENTRALIZED IDENTITY', icon: Lock },
  { text: 'EPHEMERAL MESSAGING', icon: Zap },
  { text: 'COMPLETE ANONYMITY', icon: EyeOff },
  { text: 'FULLY ENCRYPTED', icon: Shield },
  { text: 'NO METADATA RETENTION', icon: Lock },
];

const features = [
  {
    icon: Shield,
    title: 'Complete Anonymity',
    description: 'Your identity remains hidden. Express yourself freely without the weight of your persona.',
  },
  {
    icon: ArrowRightLeft,
    title: 'Organic Connections',
    description: 'Start with a one-way whisper. If it resonates, it can evolve into a two-way conversation.',
  },
  {
    icon: Clock,
    title: 'Ephemeral Nature',
    description: 'Messages that don\'t linger. Experience the freedom of digital impermanence.',
  },
];

const howItWorks = [
  {
    icon: PenTool,
    step: '01',
    title: 'Compose',
    description: 'Write your message. Be honest, be vulnerable, be funny. It\'s up to you.',
  },
  {
    icon: Send,
    step: '02',
    title: 'Send',
    description: 'Release your whisper into the ether. It will find its way to a random listener.',
  },
  {
    icon: RotateCcw,
    step: '03',
    title: 'Echo',
    description: 'Wait for a response. If someone replies, a connection is made.',
  },
];

const technicalDetails = [
  {
    icon: Key,
    title: 'Zero-Knowledge Proofs',
    description: 'The network verifies your right to access and participate without ever knowing who you actually are or reading your data payload.',
  },
  {
    icon: ServerOff,
    title: 'Decentralized Architecture',
    description: 'There is no central server hoarding your secrets. Data is distributed, shredded, and reconstructed only at the intended destination.',
  },
  {
    icon: Database,
    title: 'No Permanent Records',
    description: 'Once a conversation ends or an echo fades, it is purged forever. We do not keep logs, backups, or metadata footprints.',
  },
];

const useCases = [
  {
    icon: Heart,
    title: 'Unfiltered Confessions',
    description: 'Say the things you can\'t tell your friends, family, or colleagues. Release the pressure valve anonymously.',
  },
  {
    icon: MessageSquare,
    title: 'Unbiased Advice',
    description: 'Get opinions on your situations from strangers who only know your words, completely free from the bias of knowing your identity.',
  },
  {
    icon: User,
    title: 'Finding Your Tribe',
    description: 'Connect over hyper-niche neuroses, shared specific griefs, or bizarre obsessions without attaching them to your public life.',
  },
];

const faqs = [
  {
    question: "Is it really completely anonymous?",
    answer: "Yes. By design, our architecture relies on cryptographic protocols that physically separate your identity from your messages. We couldn't read your whispers even if requested by authorities."
  },
  {
    question: "What happens if someone is abusive?",
    answer: "While we prioritize absolute privacy, the protocol includes a decentralized trust score. Users who consistently receive negative feedback from listeners are naturally isolated from the network without revealing their identity."
  },
  {
    question: "Can I save a conversation if I really want to?",
    answer: "No. Emphasizing ephemerality means letting things go. Once a connection is severed or a session drops, the cryptographic keys perish, rendering the data eternally inaccessible."
  }
];

// ═══════════════════════════════════════════════════════════════════════
// Components
// ═══════════════════════════════════════════════════════════════════════


// Deterministic pseudo-random (same seed = same sequence every render)
const seededRandom = (seed: number) => {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
};

// Canvas-based animated star field
const OrbitingStars = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const STAR_COUNT = 200;
    const stars: { x: number; y: number; r: number; hue: number; speed: number; layer: number }[] = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: seededRandom(i * 3 + 1) * 2 - 1,
        y: seededRandom(i * 3 + 2) * 2 - 1,
        r: seededRandom(i * 3 + 3) * 2 + 0.5,
        hue: seededRandom(i * 7 + 3) * 360,
        speed: seededRandom(i * 3 + 4) * 0.4 + 0.1,
        layer: Math.floor(seededRandom(i * 3 + 5) * 3),
      });
    }

    let angle = 0;
    let rafId = 0;

    // Use window dimensions directly — the canvas fills the whole viewport
    const setSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setSize();
    window.addEventListener('resize', setSize, { passive: true });

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      if (W === 0 || H === 0) { rafId = requestAnimationFrame(draw); return; }

      angle += 0.002;
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2;
      const cy = H / 2;

      for (const star of stars) {
        const spd = [0.4, 0.8, 1.2][star.layer] * star.speed;
        const cosA = Math.cos(angle * spd);
        const sinA = Math.sin(angle * spd);
        const rx = star.x * cosA - star.y * sinA;
        const ry = star.x * sinA + star.y * cosA;
        if (Math.sqrt(rx * rx + ry * ry) < 0.18) continue;

        const px = cx + rx * cx;
        const py = cy + ry * cy;
        const alpha = [0.35, 0.6, 0.85][star.layer];

        ctx.beginPath();
        ctx.arc(px, py, star.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${star.hue}, 90%, 85%, ${alpha})`;
        ctx.fill();

        if (star.r > 1.5) {
          ctx.beginPath();
          ctx.arc(px, py, star.r * 3, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${star.hue}, 90%, 85%, ${alpha * 0.12})`;
          ctx.fill();
        }
      }

      if (!reduced) {
        rafId = requestAnimationFrame(draw);
      }
    };

    if (reduced) {
      // Draw static frame
      draw();
    } else {
      // Start animation loop
      rafId = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', setSize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ width: '100%', height: '100%', mixBlendMode: 'screen' }}
    />
  );
};

// ═══════════════════════════════════════════════════════════════════════
// Frame Sequencer Canvas — progressive loading, mobile-adaptive
// ═══════════════════════════════════════════════════════════════════════

const FRAME_COUNT = 240;

const getFrameStep = () => {
  if (typeof window === 'undefined') return 1;
  if (window.innerWidth < 640) return 3;
  if (window.innerWidth < 1024) return 2;
  return 1;
};

const FrameSequencer = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const step = getFrameStep();
    const images = new Map<number, HTMLImageElement>();
    let currentFrame = 1;

    // Draw frame — with onload retry if the image isn't decoded yet
    const drawFrame = (frameIndex: number) => {
      const snapped = Math.round((frameIndex - 1) / step) * step + 1;
      const clamped = Math.max(1, Math.min(FRAME_COUNT, snapped));
      const img = images.get(clamped);
      if (!img) return;

      const doDraw = () => {
        if (canvas.width !== img.width || canvas.height !== img.height) {
          canvas.width = img.width || 800;
          canvas.height = img.height || 800;
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        // Cover watermark in bottom-right
        ctx.fillStyle = '#000';
        ctx.fillRect(canvas.width * 0.78, canvas.height * 0.88, canvas.width * 0.22, canvas.height * 0.12);
      };

      if (img.complete && img.naturalHeight > 0) {
        doDraw();
      } else {
        // Retry once image fully loads
        img.onload = doDraw;
      }
    };

    // Scroll handler
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const docH = Math.max(1, document.documentElement.scrollHeight - document.documentElement.clientHeight);
          const target = Math.floor((window.scrollY / docH) * (FRAME_COUNT - 1)) + 1;
          if (currentFrame !== target) { currentFrame = target; drawFrame(target); }
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    // Progressive loading
    const frameIndices: number[] = [];
    for (let i = 1; i <= FRAME_COUNT; i += step) frameIndices.push(i);

    const loadBatch = (indices: number[], onDone?: () => void) => {
      let remaining = indices.length;
      if (remaining === 0) { onDone?.(); return; }
      indices.forEach((i) => {
        if (images.has(i)) { if (--remaining === 0) onDone?.(); return; }
        const img = new window.Image();
        img.decoding = 'async';
        img.onload = img.onerror = () => { if (--remaining === 0) onDone?.(); };
        img.src = `/frames/ezgif-frame-${i.toString().padStart(3, '0')}.png`;
        images.set(i, img);
      });
    };

    // Phase 1: 30 frames → show first frame immediately (or just frame 240 if reduced)
    const initialBatch = reduced ? [240] : frameIndices.slice(0, 30);
    
    loadBatch(initialBatch, () => {
      // If reduced, draw 240 (which will snap to nearest loaded frame, 240 itself)
      drawFrame(reduced ? 240 : 1);
      
      if (!reduced) {
        // Phase 2: rest deferred
        const rest = frameIndices.slice(30);
        if ('requestIdleCallback' in window) {
          (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(() => loadBatch(rest));
        } else {
          setTimeout(() => loadBatch(rest), 400);
        }
      }
    });

    if (reduced) return;

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none mix-blend-screen"
      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
    />
  );
};

export default function LandingPage(): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Track continuous scroll position using the global window scroll
  const { scrollYProgress } = useScroll();

  // Typography parallax mapped to document scroll percentage
  const yBg = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);

  return (
    <div ref={containerRef} className="min-h-[100dvh] w-full bg-black text-foreground overflow-x-hidden font-sans">
      
      {/* ═══════════════════════════════════════════════════════════════════
          Navigation
          ═══════════════════════════════════════════════════════════════════ */}
      <nav className="fixed top-0 w-full z-50 glass-subtle border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Logo size="sm" />
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-4"
            >
              <Button asChild variant="ghost" className="text-muted-foreground hover:text-foreground px-6 min-h-[44px] min-w-[44px] focus-ring">
                <Link href="/sign-in">
                  <span className="font-medium">Log In</span>
                </Link>
              </Button>
              <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow-sm hover:shadow-glow transition-shadow px-6 min-h-[44px] min-w-[44px] focus-ring">
                <Link href="/sign-up">
                  <span className="hidden sm:inline font-bold">Launch App</span>
                  <Sparkles className="w-5 h-5 sm:hidden" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════════════════
          FIXED BACKGROUND LAYER (Stars + Mask)
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Background is pure black to seamlessly hide mask JPEG compression artifacts */}
        <div className="absolute inset-0 bg-black z-[1]" />
        
        {/* Orbiting Stars System */}
        <div className="absolute inset-0 z-[10] pointer-events-none">
          <OrbitingStars />
        </div>

        {/* Foreground Hero Asset Component */}
        <div className="absolute inset-0 flex items-center justify-center z-[5]">
          <div className="relative w-full h-full sm:w-[80%] sm:h-[120%] md:h-[150%] max-h-[80vh] flex items-center justify-center">
            
            {/* Soft glow removed to ensure pure black blending */}
            {/* <div className="absolute w-[60%] h-[70%] bg-primary/10 rounded-full blur-[60px] z-[0]" /> */}
            
            {/* The Frame Sequencer using the 240 user-provided frames */}
            <div className="absolute inset-0 z-[1] flex items-center justify-center">
              <FrameSequencer />
            </div>
            
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SCROLLING FOREGROUND LAYER
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="relative z-10">
        <section className="relative h-[100svh] w-full flex flex-col items-center justify-center overflow-hidden pt-16">
          
          {/* Massive Background Typography */}
          <motion.div 
            style={prefersReducedMotion ? {} : { y: yBg }}
            className="absolute inset-0 flex items-center justify-center z-[-1] pointer-events-none select-none opacity-40"
          >
            <div className="w-full flex flex-col items-center justify-center pt-20 sm:pt-0">
              {/* Mobile View: Stacked for Maximum Vertical Space */}
              <div className="flex sm:hidden flex-col items-center text-center leading-[0.85]">
                <h1 className="text-[20vw] font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-neutral-800 drop-shadow-2xl">
                  WHISPER
                </h1>
                <h1 className="text-[20vw] font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-primary to-neutral-700 drop-shadow-2xl -mt-2">
                  INTO
                </h1>
                <h1 className="text-[20vw] font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-primary to-neutral-900 drop-shadow-2xl -mt-2">
                  THE VOID
                </h1>
              </div>

              {/* Desktop View: Horizontal Streamline */}
              <div className="hidden sm:flex flex-col items-center whitespace-nowrap overflow-hidden">
                <h1 className="text-[12vw] leading-none font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-neutral-800 drop-shadow-2xl">
                  WHISPER
                </h1>
                <h1 className="text-[12vw] leading-none font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-primary to-neutral-800 drop-shadow-2xl -mt-8 md:-mt-12">
                  INTO THE VOID
                </h1>
              </div>
            </div>
          </motion.div>

          {/* Floating Text Snippets */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="absolute inset-0 z-0 pointer-events-none"
          >
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 6, ease: "easeInOut", repeat: Infinity }}
              className="absolute top-[15%] sm:top-1/4 left-1/2 sm:left-1/4 transform -translate-x-1/2 sm:-translate-x-1/2 -translate-y-1/2 w-max"
            >
              <span className="font-mono text-xs sm:text-sm text-primary/80 bg-primary/10 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-primary/30 backdrop-blur-md shadow-glow-sm">
                {"// SECURE ANONYMOUS"}
              </span>
            </motion.div>
            <motion.div 
              animate={{ y: [0, 15, 0] }}
              transition={{ duration: 7, delay: 1, ease: "easeInOut", repeat: Infinity }}
              className="absolute top-[80%] sm:top-auto sm:bottom-1/3 left-1/2 sm:left-auto sm:right-1/4 transform -translate-x-1/2 sm:translate-x-1/2 translate-y-1/2 w-max"
            >
              <span className="font-mono text-xs sm:text-sm text-primary/80 bg-primary/10 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-primary/30 backdrop-blur-md shadow-glow-sm">
                {"// DECENTRALIZED PROTOCOL"}
              </span>
            </motion.div>
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5, delay: 2, ease: "easeInOut", repeat: Infinity }}
              className="absolute top-[70%] sm:top-1/3 left-1/2 sm:left-auto sm:right-1/4 transform -translate-x-1/2 sm:translate-x-1/2 -translate-y-1/2 w-max hidden sm:block"
            >
              <span className="font-mono text-xs sm:text-sm text-muted-foreground bg-white/5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-white/20 backdrop-blur-md shadow-glow-sm">
                {"// NO LOGS"}
              </span>
            </motion.div>
          </motion.div>

          {/* Infinite Marquee Fixed at the Bottom of this specific Hero block */}
          <div className="absolute bottom-0 w-full bg-black/80 backdrop-blur-xl border-y border-white/5 py-4 z-10 overflow-hidden flex items-center">
            <motion.div
              initial={{ x: "0%" }}
              animate={{ x: "-50%" }}
              transition={{
                duration: 30,
                ease: "linear",
                repeat: Infinity,
              }}
              className="flex whitespace-nowrap w-max"
            >
              {[...marqueeItems, ...marqueeItems].map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-8 text-muted-foreground hover:text-primary transition-colors duration-300">
                  <item.icon className="w-5 h-5" />
                  <span className="font-mono text-sm tracking-widest font-bold uppercase">{item.text}</span>
                  <span className="text-white/10 mx-4">•</span>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            App Information / Features (Scroll Down Zone)
            ═══════════════════════════════════════════════════════════════════ */}
        <section className="relative min-h-[100svh] py-16 md:py-32 flex flex-col justify-center border-t border-white/5 bg-black/10 backdrop-blur-sm z-10 shadow-[0_-50px_50px_-20px_rgba(0,0,0,0.5)]">
          <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
            
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="text-center mb-20"
            >
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-6 drop-shadow-lg">
                The Engine of Connection
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                EchoinWhispr strips away the performative layers of traditional social media. You are entirely known by what you say, not by who you pretend to be.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-20 md:mb-32">
              {features.map((feature, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6, delay: idx * 0.1 }}
                  className="glass-card p-8 rounded-2xl border border-white/5 hover:border-primary/30 transition-colors group"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </motion.div>
              ))}
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl font-black tracking-tight drop-shadow-md">How the Protocol Works</h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              {howItWorks.map((item, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6, delay: idx * 0.1 }}
                  className="relative p-8 rounded-2xl bg-white/5 group border border-transparent hover:border-primary/30 transition-all backdrop-blur-md"
                >
                  <div className="text-4xl font-black text-white/5 absolute top-4 right-6 group-hover:text-white/10 transition-colors">{item.step}</div>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                    <item.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </motion.div>
              ))}
            </div>

          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            Technical Architecture (Deep Dive)
            ═══════════════════════════════════════════════════════════════════ */}
        <section className="relative min-h-[100svh] py-16 md:py-24 flex flex-col justify-center border-t border-white/5 bg-black/10 backdrop-blur-sm z-10">
          <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row gap-16 items-center">
              <motion.div 
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8 }}
                className="lg:w-1/3"
              >
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-6">Built on Cryptographic Trust.</h2>
                <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                  We don&apos;t ask you to trust us. We built a system where trust isn&apos;t functionally necessary. The protocol enforces anonymity at the code level.
                </p>
                <Button variant="outline" className="border-primary/20 hover:border-primary/50 text-foreground transition-colors px-6 h-12">
                  Read the Whitepaper
                </Button>
              </motion.div>
              
              <div className="lg:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
                {technicalDetails.map((detail, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6, delay: idx * 0.1 }}
                    className={`p-6 rounded-2xl border border-white/5 bg-background/30 hover:bg-background/50 transition-colors ${idx === 2 ? 'sm:col-span-2' : ''}`}
                  >
                    <detail.icon className="w-6 h-6 text-primary mb-4" />
                    <h3 className="text-lg font-bold mb-2">{detail.title}</h3>
                    <p className="text-sm text-muted-foreground">{detail.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            Why the Void? (Use Cases)
            ═══════════════════════════════════════════════════════════════════ */}
        <section className="relative min-h-[100svh] py-16 md:py-32 flex flex-col justify-center border-t border-white/5 bg-black/10 backdrop-blur-sm z-10">
          <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl font-black tracking-tight mb-4">Why Step into the Void?</h2>
              <p className="text-muted-foreground">What happens when your name disappears?</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              {useCases.map((useCase, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6, delay: idx * 0.1 }}
                  className="glass-card p-8 rounded-2xl flex flex-col items-center text-center hover:-translate-y-2 transition-transform duration-300"
                >
                  <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-6 shadow-glow-sm">
                    <useCase.icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{useCase.title}</h3>
                  <p className="text-muted-foreground">{useCase.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            FAQ Section
            ═══════════════════════════════════════════════════════════════════ */}
        <section className="relative min-h-[100svh] py-16 md:py-24 flex flex-col justify-center border-t border-white/5 bg-black/10 backdrop-blur-sm z-10">
          <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <HelpCircle className="w-12 h-12 text-primary/50 mx-auto mb-6" />
              <h2 className="text-3xl font-black tracking-tight">Answers from the Dark.</h2>
            </motion.div>

            <div className="space-y-6">
              {faqs.map((faq, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="p-6 rounded-2xl bg-white/[0.02] border border-white/5"
                >
                  <h3 className="text-lg font-bold mb-3 text-white/90">{faq.question}</h3>
                  <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            Minimalist Call to Action Zone
            ═══════════════════════════════════════════════════════════════════ */}
        <section className="relative min-h-[50svh] md:min-h-[80svh] flex flex-col items-center justify-center text-center px-4 py-16 border-t border-white/5 bg-black/10 backdrop-blur-sm z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl"
          >
            <div className="w-16 h-1 bg-primary mx-auto mb-8 rounded-full shadow-glow-sm" />
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-6 drop-shadow-lg">
              Enter the Network.
            </h2>
            <p className="text-white text-lg mb-10 mx-auto max-w-xl font-medium">
              A purely functional protocol for raw, unfiltered connection. No names, no faces, just your signal in the noise.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/sign-up">
                <Button size="xl" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow hover:shadow-glow-lg transition-all px-12 min-h-[56px] focus-ring">
                  Initiate Connection
                </Button>
              </Link>
            </div>
          </motion.div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            Footer
            ═══════════════════════════════════════════════════════════════════ */}
        <footer className="border-t border-white/5 py-8 bg-black z-10 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <Logo size="sm" asLink={false} />
              <div className="flex gap-8 text-sm text-muted-foreground">
                <Link href="/legal/privacy" className="hover:text-primary transition-colors duration-200">Privacy</Link>
                <Link href="/legal/terms" className="hover:text-primary transition-colors duration-200">Terms</Link>
              </div>
              <p className="text-sm text-muted-foreground/40 font-mono">
                {"// SYS.OP.ECH.2026"}
              </p>
            </div>
          </div>
        </footer>
        
      </div>
    </div>
  );
}