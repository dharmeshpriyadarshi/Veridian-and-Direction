"use client";

import Navbar from "@/components/Navbar";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Leaf, Wind, Info, MapPin, Zap } from "lucide-react";
import { useSearchParams } from "next/navigation";

// Dynamically import Map
const Map = dynamic(() => import("@/components/Map"), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-veridian-black animate-pulse rounded-3xl grid place-items-center text-veridian-primary">Loading Simulation...</div>
});

const TREE_EFFICIENCY = 5; // 1 unit reduces AQI by 5

import { Suspense } from "react";

function SimulateContent() {
    const [trees, setTrees] = useState<Array<[number, number]>>([]);
    const searchParams = useSearchParams();

    // Get AQI from URL or default to 180 (Unhealthy)
    const initialAQI = Number(searchParams.get("aqi")) || 180;

    // Calculate Target (Safe Level = 50)
    const safeLevel = 50;
    // safe calculation to avoid negative numbers if initial is low
    const treesNeeded = initialAQI > safeLevel ? Math.ceil((initialAQI - safeLevel) / TREE_EFFICIENCY) : 0;

    const addTree = (pos: [number, number]) => {
        setTrees([...trees, pos]);
    };

    // derived state
    const impact = trees.length * TREE_EFFICIENCY;
    const currentAQI = Math.max(0, initialAQI - impact);
    const color = currentAQI > 150 ? "#FF4C4C" : currentAQI > 100 ? "#FACC15" : "#00FF94";

    // Filter Opacity: 0 (Clear) to 0.5 (Heavy Smog)
    const smogOpacity = Math.min(0.5, currentAQI / 400);

    return (
        <>
            <div className="pt-24 px-4 flex-grow flex flex-col md:flex-row gap-6 max-w-[1920px] mx-auto w-full mb-8 relative z-10">

                {/* Sidebar Controls */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="w-full md:w-[450px] flex flex-col gap-6 shrink-0"
                >
                    <div>
                        <h1 className="text-4xl font-bold mb-2">Simulate Mitigation</h1>
                        <p className="text-white/60 text-sm">
                            Current Pollution: <span className="text-white font-bold">{initialAQI} AQI.</span> <br />
                            Goal: Reduce to &lt; 50 AQI.
                        </p>
                    </div>

                    {/* Recommendation Card */}
                    <div className="bg-veridian-dark p-6 rounded-3xl border border-veridian-primary/20 overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-8 opacity-10 blur-xl bg-veridian-primary w-32 h-32 rounded-full" />

                        <h3 className="text-foreground/60 uppercase tracking-widest text-xs font-bold mb-2">AI Recommendation</h3>
                        {trees.length >= treesNeeded ? (
                            <div className="text-veridian-primary font-bold text-2xl flex items-center gap-2">
                                Target Achieved! 🎉
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <span className="text-4xl font-bold text-foreground">{treesNeeded - trees.length}</span>
                                    <span className="text-foreground/60 ml-2">more units needed.</span>
                                </div>

                                <button
                                    onClick={() => {
                                        const needed = treesNeeded - trees.length;
                                        const newTrees: Array<[number, number]> = [];
                                        // Plant around New Delhi Center roughly
                                        for (let i = 0; i < needed; i++) {
                                            const lat = 28.6139 + (Math.random() - 0.5) * 0.1;
                                            const lng = 77.2090 + (Math.random() - 0.5) * 0.1;
                                            newTrees.push([lat, lng]);
                                        }
                                        setTrees([...trees, ...newTrees]);
                                    }}
                                    className="w-full py-3 bg-veridian-primary text-veridian-black font-bold rounded-xl hover:scale-105 transition-transform flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(207,187,153,0.3)]"
                                >
                                    <Zap size={18} /> Auto-Deploy Remaining
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Stats & Progress */}
                    <div className="glass-panel p-6 rounded-3xl space-y-6 border-l-4 transition-colors duration-500" style={{ borderLeftColor: color }}>
                        <div className="flex items-center justify-between border-b border-foreground/10 pb-4">
                            <div>
                                <span className="text-foreground/60 block text-xs uppercase tracking-widest">Projected AQI</span>
                                <span className="text-6xl font-bold transition-colors duration-500" style={{ color }}>{currentAQI}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-foreground/60 block text-xs uppercase tracking-widest">Impact</span>
                                <span className="text-2xl font-bold text-veridian-primary">-{impact}</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-foreground/50">
                                <span>Unsafe ({initialAQI})</span>
                                <span>Safe (50)</span>
                            </div>
                            <div className="w-full bg-foreground/10 h-3 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: "100%" }}
                                    animate={{ width: `${(currentAQI / initialAQI) * 100}%` }}
                                    className="h-full transition-all duration-500 relative"
                                    style={{ backgroundColor: color }}
                                >
                                    <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-foreground/50 shadow-[0_0_10px_white]" />
                                </motion.div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-veridian-primary/5 p-4 rounded-xl border border-veridian-primary/10">
                                <div className="flex items-center gap-2 mb-2 text-veridian-primary">
                                    <Wind size={18} />
                                    <span className="text-xs uppercase font-bold">CO₂ Removed</span>
                                </div>
                                <p className="text-2xl font-bold">{(trees.length * 200).toLocaleString()} <span className="text-xs font-normal text-foreground/50">kg</span></p>
                            </div>

                            <div className="bg-veridian-primary/5 p-4 rounded-xl border border-veridian-primary/10">
                                <div className="flex items-center gap-2 mb-2 text-veridian-primary">
                                    <Leaf size={18} />
                                    <span className="text-xs uppercase font-bold">Equivalent</span>
                                </div>
                                <p className="text-2xl font-bold">{trees.length * 50} <span className="text-xs font-normal text-foreground/50">Trees</span></p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Map Area */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex-grow rounded-3xl overflow-hidden border border-foreground/10 relative shadow-2xl"
                >
                    {/* Visual Filter Overlay: This makes the map look "smoggy" based on AQI */}
                    <div
                        className="absolute inset-0 z-[400] pointer-events-none transition-all duration-1000 mix-blend-hard-light"
                        style={{
                            backgroundColor: currentAQI > 100 ? '#FF4C4C' : '#CFBB99',
                            opacity: smogOpacity
                        }}
                    />
                    {/* Secondary Blur Filter for Haze */}
                    <div
                        className="absolute inset-0 z-[400] pointer-events-none transition-all duration-1000 backdrop-blur-[2px]"
                        style={{
                            opacity: Math.max(0, (currentAQI - 50) / 400)
                        }}
                    />

                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] bg-veridian-black/80 backdrop-blur-md px-6 py-2 rounded-full border border-foreground/20 flex items-center gap-2 pointer-events-none">
                        <MapPin size={16} className="text-veridian-primary" />
                        <span className="text-xs font-bold uppercase tracking-widest text-veridian-primary">Simulation Mode Active</span>
                    </div>

                    <Map trees={trees} onAddTree={addTree} />
                </motion.div>
            </div>
        </>
    );
}

export default function SimulatePage() {
    return (
        <main className="min-h-screen bg-veridian-black text-foreground relative flex flex-col">
            <Navbar />
            <Suspense fallback={
                <div className="h-screen w-full flex items-center justify-center text-veridian-primary animate-pulse">
                    Initializing Simulation Environment...
                </div>
            }>
                <SimulateContent />
            </Suspense>
        </main>
    );
}
