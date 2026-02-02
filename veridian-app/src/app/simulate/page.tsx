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
    loading: () => <div className="h-full w-full bg-[#050A07] animate-pulse rounded-3xl grid place-items-center text-[#00FF94]">Loading Simulation...</div>
});

const TREE_EFFICIENCY = 5; // 1 unit reduces AQI by 5

export default function SimulatePage() {
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
        <main className="min-h-screen bg-black text-white relative flex flex-col">
            <Navbar />

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
                    <div className="bg-[#0A1F13] p-6 rounded-3xl border border-[#00FF94]/20 overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-8 opacity-10 blur-xl bg-[#00FF94] w-32 h-32 rounded-full" />

                        <h3 className="text-white/60 uppercase tracking-widest text-xs font-bold mb-2">AI Recommendation</h3>
                        {trees.length >= treesNeeded ? (
                            <div className="text-[#00FF94] font-bold text-2xl flex items-center gap-2">
                                Target Achieved! 🎉
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <span className="text-4xl font-bold text-white">{treesNeeded - trees.length}</span>
                                    <span className="text-white/60 ml-2">more units needed.</span>
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
                                    className="w-full py-3 bg-[#00FF94] text-[#050A07] font-bold rounded-xl hover:scale-105 transition-transform flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,255,148,0.3)]"
                                >
                                    <Zap size={18} /> Auto-Deploy Remaining
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Stats & Progress */}
                    <div className="glass-panel p-6 rounded-3xl space-y-6 border-l-4 transition-colors duration-500" style={{ borderLeftColor: color }}>
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <div>
                                <span className="text-white/60 block text-xs uppercase tracking-widest">Projected AQI</span>
                                <span className="text-6xl font-bold transition-colors duration-500" style={{ color }}>{currentAQI}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-white/60 block text-xs uppercase tracking-widest">Impact</span>
                                <span className="text-2xl font-bold text-[#00FF94]">-{impact}</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-white/50">
                                <span>Unsafe ({initialAQI})</span>
                                <span>Safe (50)</span>
                            </div>
                            <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: "100%" }}
                                    animate={{ width: `${(currentAQI / initialAQI) * 100}%` }}
                                    className="h-full transition-all duration-500 relative"
                                    style={{ backgroundColor: color }}
                                >
                                    <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-white/50 shadow-[0_0_10px_white]" />
                                </motion.div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[#00FF94]/5 p-4 rounded-xl border border-[#00FF94]/10">
                                <div className="flex items-center gap-2 mb-2 text-[#00FF94]">
                                    <Wind size={18} />
                                    <span className="text-xs uppercase font-bold">CO₂ Removed</span>
                                </div>
                                <p className="text-2xl font-bold">{(trees.length * 200).toLocaleString()} <span className="text-xs font-normal text-white/50">kg</span></p>
                            </div>

                            <div className="bg-[#00FF94]/5 p-4 rounded-xl border border-[#00FF94]/10">
                                <div className="flex items-center gap-2 mb-2 text-[#00FF94]">
                                    <Leaf size={18} />
                                    <span className="text-xs uppercase font-bold">Equivalent</span>
                                </div>
                                <p className="text-2xl font-bold">{trees.length * 50} <span className="text-xs font-normal text-white/50">Trees</span></p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Map Area */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex-grow rounded-3xl overflow-hidden border border-white/10 relative shadow-2xl"
                >
                    {/* Visual Filter Overlay: This makes the map look "smoggy" based on AQI */}
                    <div
                        className="absolute inset-0 z-[400] pointer-events-none transition-all duration-1000 mix-blend-hard-light"
                        style={{
                            backgroundColor: currentAQI > 100 ? '#FF4C4C' : '#00FF94',
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

                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] bg-black/80 backdrop-blur-md px-6 py-2 rounded-full border border-white/20 flex items-center gap-2 pointer-events-none">
                        <MapPin size={16} className="text-[#00FF94]" />
                        <span className="text-xs font-bold uppercase tracking-widest text-[#00FF94]">Simulation Mode Active</span>
                    </div>

                    <Map trees={trees} onAddTree={addTree} />
                </motion.div>
            </div>
        </main>
    );
}
