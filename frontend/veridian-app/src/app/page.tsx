"use client";

import Navbar from "@/components/Navbar";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Wind, Activity, TreePine, Skull, Zap, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

const MotionLink = motion(Link);

export default function Home() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef });

  // Parallax & Opacity transforms
  const opacityHero = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const scaleHero = useTransform(scrollYProgress, [0, 0.2], [1, 0.8]);

  const opacityProblem = useTransform(scrollYProgress, [0.2, 0.3, 0.5], [0, 1, 0]);
  const yProblem = useTransform(scrollYProgress, [0.2, 0.5], [50, -50]);

  const opacitySolution = useTransform(scrollYProgress, [0.5, 0.6, 0.8], [0, 1, 1]);

  return (
    <main ref={containerRef} className="bg-veridian-black text-foreground selection:bg-veridian-primary selection:text-veridian-dark">
      <Navbar />

      {/* --------------------
          SECTION 1: HERO
         -------------------- */}
      <section className="h-screen sticky top-0 flex flex-col justify-center items-center overflow-hidden z-10">
        <motion.div style={{ opacity: opacityHero, scale: scaleHero }} className="text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 2, filter: "blur(20px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 1.5, ease: "circOut" }}
          >
            <h1 className="text-[12vw] font-black leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-foreground to-veridian-accent">
              VERIDIAN
            </h1>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-veridian-primary text-xl md:text-2xl tracking-[0.5em] uppercase font-light mt-4"
          >
            The Breath of Tomorrow
          </motion.p>
        </motion.div>

        {/* Atmospheric Fog */}
        <div className="absolute inset-0 z-0 bg-gradient-to-t from-veridian-black via-transparent to-transparent" />
        <motion.div
          animate={{ opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 5, repeat: Infinity }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-veridian-primary blur-[200px] opacity-10 rounded-full pointer-events-none"
        />
      </section>

      {/* --------------------
          SECTION 2: THE PROBLEM (Story)
         -------------------- */}
      <section className="h-[150vh] relative z-20 bg-veridian-black">
        <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
          <motion.div style={{ opacity: opacityProblem, y: yProblem }} className="max-w-4xl px-6 relative">
            <div className="absolute -top-20 -left-20 text-[#FF4C4C] opacity-10">
              <Skull size={400} />
            </div>

            <h2 className="text-6xl md:text-8xl font-bold leading-tight mb-8 relative z-10">
              The Air You Breathe <br /> is <span className="text-[#FF4C4C] italic">Killing You.</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-xl text-foreground/70 leading-relaxed">
              <p>
                <span className="text-foreground font-bold">9 out of 10 people</span> breathe air containing high levels of pollutants.
                It&apos;s an invisible enemy that infiltrates your lungs, heart, and brain.
              </p>
              <p>
                Traditional trees are essential, but in concrete jungles, we don&apos;t have the space to plant the <span className="text-[#FF4C4C] font-bold">millions</span> needed to reverse the damage fast enough.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* --------------------
          SECTION 3: THE SOLUTION (Tech)
         -------------------- */}
      <section className="min-h-screen relative z-30 bg-veridian-black py-32">
        <motion.div style={{ opacity: opacitySolution }} className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-24">
            <span className="text-veridian-primary font-mono text-sm tracking-widest uppercase mb-4 block">System Online</span>
            <h2 className="text-5xl md:text-7xl font-bold mb-6">Enter <span className="text-veridian-primary">Liquid Trees.</span></h2>
            <p className="text-2xl text-foreground/50 max-w-2xl mx-auto">
              We combine <span className="text-foreground">Machine Learning prediction</span> with <span className="text-veridian-primary">Bioreactor efficiency</span>.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <Link href="/insights" className="group relative h-[500px] rounded-3xl overflow-hidden bg-veridian-dark border border-veridian-accent/20 hover:border-veridian-primary transition-colors duration-500">
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1534081333815-ae5019106622?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40 group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-veridian-black via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 p-8">
                <Wind className="text-veridian-primary mb-4" size={40} />
                <h3 className="text-4xl font-bold mb-2">Insights</h3>
                <p className="text-foreground/60 mb-6">Real-time local pollution monitoring.</p>
                <span className="inline-flex items-center gap-2 text-veridian-primary font-bold uppercase tracking-widest text-sm group-hover:translate-x-2 transition-transform">
                  Analyze Data <ArrowRight size={16} />
                </span>
              </div>
            </Link>

            {/* Card 2 */}
            <Link href="/little-ahead" className="group relative h-[500px] rounded-3xl overflow-hidden bg-veridian-dark border border-veridian-accent/20 hover:border-veridian-primary transition-colors duration-500">
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40 group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-veridian-black via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 p-8">
                <Activity className="text-veridian-primary mb-4" size={40} />
                <h3 className="text-4xl font-bold mb-2">Little Ahead</h3>
                <p className="text-foreground/60 mb-6">AI-Forecasting of toxicity spikes.</p>
                <span className="inline-flex items-center gap-2 text-veridian-primary font-bold uppercase tracking-widest text-sm group-hover:translate-x-2 transition-transform">
                  See Future <ArrowRight size={16} />
                </span>
              </div>
            </Link>

            {/* Card 3 */}
            <Link href="/simulate" className="group relative h-[500px] rounded-3xl overflow-hidden bg-veridian-dark border border-veridian-accent/20 hover:border-veridian-primary transition-colors duration-500">
              <div className="absolute inset-0 bg-[url('https://plus.unsplash.com/premium_photo-1663047249626-4d2ba4d78216?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40 group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-veridian-black via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 p-8">
                <Zap className="text-veridian-primary mb-4" size={40} />
                <h3 className="text-4xl font-bold mb-2">Simulate</h3>
                <p className="text-foreground/60 mb-6">Deploy Liquid Trees & offset Carbon.</p>
                <span className="inline-flex items-center gap-2 text-veridian-primary font-bold uppercase tracking-widest text-sm group-hover:translate-x-2 transition-transform">
                  Run Simulation <ArrowRight size={16} />
                </span>
              </div>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-12 text-center text-foreground/20 border-t border-white/5 relative z-30 bg-veridian-black">
        <p>VERIDIAN © 2026. Engineered for Earth.</p>
      </footer>
    </main>
  );
}
