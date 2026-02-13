"use client";

import Navbar from "@/components/Navbar";
import { motion } from "framer-motion";
import { useState } from "react";
import { Lock, Unlock, Plus, Folder, Users, Globe } from "lucide-react";

export default function ResearchPage() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [passcode, setPasscode] = useState("");
    const [error, setError] = useState(false);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (passcode === "VERIDIAN" || passcode === "admin") {
            setIsLoggedIn(true);
            setError(false);
        } else {
            setError(true);
        }
    };

    if (!isLoggedIn) {
        return (
            <main className="min-h-screen bg-black text-white relative flex flex-col items-center justify-center">
                <Navbar />
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00FF94] opacity-[0.02] blur-[120px] rounded-full" />
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-panel p-12 rounded-3xl w-full max-w-md relative z-10 text-center"
                >
                    <div className="bg-[#00FF94]/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Lock className="text-[#00FF94]" size={32} />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">Researcher Access</h1>
                    <p className="text-white/50 mb-8">Restricted area for Veridian Global Collaborative Network.</p>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <input
                                type="password"
                                placeholder="Enter Access Code"
                                value={passcode}
                                onChange={(e) => setPasscode(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00FF94] transition-colors text-center tracking-widest"
                            />
                            {error && <p className="text-[#FF4C4C] text-xs mt-2">Invalid Access Code</p>}
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-[#00FF94] hover:bg-[#00FF94]/90 text-[#050A07] font-bold py-3 rounded-xl transition-all hover:scale-[1.02]"
                        >
                            Authenticate
                        </button>
                    </form>
                    <p className="text-xs text-white/30 mt-6 uppercase tracking-widest">Veridian Secure Protocol</p>
                </motion.div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-black text-white relative">
            <Navbar />

            <div className="pt-32 px-4 max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-12">
                    <div>
                        <h1 className="text-4xl font-bold mb-1 flex items-center gap-3">
                            Research Hub
                            <span className="text-xs bg-[#00FF94]/20 text-[#00FF94] px-2 py-1 rounded border border-[#00FF94]/30 uppercase tracking-widest">Restricted</span>
                        </h1>
                        <p className="text-white/60">Global collaborative environment for climate mitigation.</p>
                    </div>
                    <button className="bg-[#00FF94] text-[#050A07] px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-transform">
                        <Plus size={18} /> New Project
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        { title: "Project: Delhi Smog Tower V2", status: "Active", collaborators: 12, region: "New Delhi, IN" },
                        { title: "Liquid Tree Optimization (Algae #45)", status: "Review", collaborators: 8, region: "Belgrade, RS" },
                        { title: "Satellite Calibration Study", status: "Draft", collaborators: 3, region: "Global" },
                    ].map((project, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="glass-panel p-6 rounded-2xl group hover:bg-white/5 transition-colors cursor-pointer"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-[#00FF94]/10 p-2 rounded-lg text-[#00FF94]">
                                    <Folder size={20} />
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full border ${project.status === "Active" ? "border-[#00FF94]/30 text-[#00FF94]" : "border-white/20 text-white/50"
                                    }`}>
                                    {project.status}
                                </span>
                            </div>
                            <h3 className="text-xl font-bold mb-2 group-hover:text-[#00FF94] transition-colors">{project.title}</h3>
                            <div className="flex items-center gap-4 text-sm text-white/60 mt-4">
                                <span className="flex items-center gap-1"><Users size={14} /> {project.collaborators}</span>
                                <span className="flex items-center gap-1"><Globe size={14} /> {project.region}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </main>
    );
}
